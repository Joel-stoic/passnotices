import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";

import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { templateUploadSchema } from "./templates.validation";
import { createTemplate } from "./templates.service";
import { prisma } from "../../lib/prisma";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/templates/");
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".docx") {
      return cb(new Error("Only .docx files are allowed"));
    }
    cb(null, true);
  },
});

// ─────────────────────────────────────────────
// GET /api/templates
// List all templates for the tenant
// ─────────────────────────────────────────────

router.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const templates = await prisma.noticeTemplate.findMany({
        where: { tenantId: req.auth!.tenantId },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ success: true, templates });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch templates" });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/templates
// Upload a new .docx template
// ─────────────────────────────────────────────

router.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Word template file is required" });
      }

      const parsed = templateUploadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const template = await createTemplate(
        req.auth!.tenantId,
        parsed.data.noticeType,
        req.file
      );

      return res.status(201).json({ success: true, template });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Template upload failed" });
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /api/templates/:id
// Delete a template (and its file from disk)
// ─────────────────────────────────────────────

router.delete(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const template = await prisma.noticeTemplate.findFirst({
        where: {
          id: String(req.params.id),
          tenantId: req.auth!.tenantId,
        },
      });

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Delete file from disk
      const rawUrl = template.fileUrl ?? "";
      const relativePath = rawUrl.startsWith("/") ? rawUrl.slice(1) : rawUrl;
      const filePath = path.resolve(process.cwd(), relativePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await prisma.noticeTemplate.delete({ where: { id: template.id } });

      return res.json({ success: true, message: "Template deleted" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete template" });
    }
  }
);

export default router;