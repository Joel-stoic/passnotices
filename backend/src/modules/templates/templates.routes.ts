import path from "path";
import { Router } from "express";
import multer from "multer";
import PizZip from "pizzip";

import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { templateUploadSchema } from "./templates.validation";
import { createTemplate, deleteTemplate } from "./templates.service";
import { prisma } from "../../lib/prisma";
import { downloadFromR2 } from "../../lib/storage";

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
// GET /api/templates/:id/preview
// View content and placeholders of the template
// ─────────────────────────────────────────────

router.get("/:id/preview", authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const template = await prisma.noticeTemplate.findFirst({
      where: { id: String(req.params.id), tenantId: req.auth!.tenantId },
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const buffer = await downloadFromR2(template.fileUrl);
    const zip = new PizZip(buffer);
    const documentXml = zip.files["word/document.xml"]?.asText() || "";

    // Extract readable paragraphs from docx XML
    const text = documentXml
      .replace(/<w:p[^>]*>/g, "")
      .replace(/<\/w:p>/g, "\n\n")
      .replace(/<w:br[^>]*>/g, "\n")
      .replace(/<w:tab[^>]*>/g, "\t")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();

    // Extract dynamic placeholders {{...}}
    const matches = Array.from(text.matchAll(/\{\{([^{}]+)\}\}/g)).map((m) => m[1].trim());
    const placeholders = Array.from(new Set(matches)).filter(Boolean);

    return res.json({
      success: true,
      id: template.id,
      noticeType: template.noticeType,
      fileUrl: template.fileUrl,
      createdAt: template.createdAt,
      text: text || "No text content found in document.",
      placeholders,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to preview template" });
  }
});

// ─────────────────────────────────────────────
// GET /api/templates/:id/download
// Download the raw .docx template
// ─────────────────────────────────────────────

router.get("/:id/download", authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const template = await prisma.noticeTemplate.findFirst({
      where: { id: String(req.params.id), tenantId: req.auth!.tenantId },
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const buffer = await downloadFromR2(template.fileUrl);
    const filename = `${template.noticeType.toLowerCase().replace(/_/g, "-")}-template.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to download template" });
  }
});

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
