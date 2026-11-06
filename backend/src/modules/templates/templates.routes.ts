import "dotenv/config";
import path from "path";
import fs from "fs";
import { Router, Request, Response } from "express";
import multer from "multer";
import PizZip from "pizzip";

import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { templateUploadSchema } from "./templates.validation";
import { createTemplate, deleteTemplate } from "./templates.service";
import { prisma } from "../../lib/prisma";
import { downloadFromR2 } from "../../lib/storage";

const router = Router();

async function getFileBuffer(fileUrl: string): Promise<Buffer> {
  try {
    return await downloadFromR2(fileUrl);
  } catch (r2Err: any) {
    console.warn(`[Storage] downloadFromR2 failed for key '${fileUrl}':`, r2Err?.message);
    const cleanPath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
    const localPath = path.resolve(process.cwd(), cleanPath);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
    throw new Error(`File not accessible in storage: ${r2Err?.message || "Storage error"}`);
  }
}

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

// GET /api/templates
router.get("/", authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const templates = await prisma.noticeTemplate.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, templates });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch templates" });
  }
});

// POST /api/templates
router.post("/", authMiddleware, tenantMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Word template file is required" });
    }
    const parsed = templateUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const template = await createTemplate(req.auth!.tenantId, parsed.data.noticeType, req.file);
    return res.status(201).json({ success: true, template });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Template upload failed" });
  }
});

// DEBUG /api/templates/debug/:id
router.get("/debug/:id", authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const template = await prisma.noticeTemplate.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!template) return res.json({ found: false });

    let r2Result = "unknown";
    try {
      const buf = await downloadFromR2(template.fileUrl);
      r2Result = `OK — ${buf.length} bytes`;
    } catch (e: any) {
      r2Result = `FAILED — ${e.message}`;
    }

    return res.json({ template, r2Result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PREVIEW handler
async function handlePreview(req: Request, res: Response) {
  try {
    const paramId = req.params.id || (req.query.id as string) || "";
    if (!paramId) {
      return res.status(400).json({ error: "Template ID is required" });
    }

    const template = await prisma.noticeTemplate.findFirst({
      where: { id: paramId, tenantId: req.auth!.tenantId },
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    let buffer: Buffer;
    try {
      buffer = await getFileBuffer(template.fileUrl);
    } catch (storageErr: any) {
      return res.status(404).json({
        error: `Template file not accessible in Cloudflare R2: ${storageErr?.message || "Storage error"}. Please re-upload.`,
      });
    }

    let text = "";
    let placeholders: string[] = [];

    try {
      const zip = new PizZip(buffer);
      const documentXml = zip.files["word/document.xml"]?.asText() || "";

      text = documentXml
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

      const matches = Array.from(text.matchAll(/\{\{([^{}]+)\}\}/g)).map((m) => m[1].trim());
      placeholders = Array.from(new Set(matches)).filter(Boolean);
    } catch (parseErr) {
      console.warn("Failed to parse docx XML:", parseErr);
      text = "Document uploaded successfully. Content preview is unavailable for this formatting.";
    }

    return res.json({
      success: true,
      id: template.id,
      noticeType: template.noticeType,
      fileUrl: template.fileUrl,
      createdAt: template.createdAt,
      text: text || "Document is empty or contains non-text elements.",
      placeholders,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to preview template" });
  }
}

router.get("/:id/preview", authMiddleware, tenantMiddleware, handlePreview);
router.get("/preview/:id", authMiddleware, tenantMiddleware, handlePreview);
router.get("/preview", authMiddleware, tenantMiddleware, handlePreview);

// DOWNLOAD handler
async function handleDownload(req: Request, res: Response) {
  try {
    const paramId = req.params.id || (req.query.id as string) || "";
    if (!paramId) {
      return res.status(400).json({ error: "Template ID is required" });
    }

    const template = await prisma.noticeTemplate.findFirst({
      where: { id: paramId, tenantId: req.auth!.tenantId },
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    let buffer: Buffer;
    try {
      buffer = await getFileBuffer(template.fileUrl);
    } catch (storageErr: any) {
      return res.status(404).json({
        error: `Template file not accessible in Cloudflare R2: ${storageErr?.message || "Storage error"}. Please re-upload.`,
      });
    }

    const filename = `${template.noticeType.toLowerCase().replace(/_/g, "-")}-template.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to download template" });
  }
}

router.get("/:id/download", authMiddleware, tenantMiddleware, handleDownload);
router.get("/download/:id", authMiddleware, tenantMiddleware, handleDownload);
router.get("/download", authMiddleware, tenantMiddleware, handleDownload);

// DELETE /api/templates/:id
router.delete("/:id", authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    await deleteTemplate(req.auth!.tenantId, String(req.params.id));
    return res.json({ success: true, message: "Template deleted" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete template" });
  }
});

export default router;