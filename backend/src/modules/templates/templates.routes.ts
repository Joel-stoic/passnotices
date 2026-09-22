import path from "path";
import { Router } from "express";
import multer from "multer";

import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { templateUploadSchema } from "./templates.validation";
import { createTemplate, deleteTemplate } from "./templates.service";
import { prisma } from "../../lib/prisma";

const router = Router();

// Use memory storage — no disk needed since we upload directly to R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".docx") {
      return cb(new Error("Only .docx files are allowed"));
    }
    cb(null, true);
  },
});

// ─────────────────────────────────────────────
// GET /api/templates
// ─────────────────────────────────────────────

router.get("/", authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const templates = await prisma.noticeTemplate.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, templates });
  } catch {
    return res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// ─────────────────────────────────────────────
// POST /api/templates
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
// ─────────────────────────────────────────────

router.delete("/:id", authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    await deleteTemplate(req.auth!.tenantId, String(req.params.id));
    return res.json({ success: true, message: "Template deleted" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete template" });
  }
});

export default router;