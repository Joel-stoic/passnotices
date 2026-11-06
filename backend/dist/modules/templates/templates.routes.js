"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const pizzip_1 = __importDefault(require("pizzip"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const templates_validation_1 = require("./templates.validation");
const templates_service_1 = require("./templates.service");
const prisma_1 = require("../../lib/prisma");
const storage_1 = require("../../lib/storage");
const router = (0, express_1.Router)();
// Helper to fetch buffer from R2 with local disk fallback
async function getFileBuffer(fileUrl) {
    try {
        return await (0, storage_1.downloadFromR2)(fileUrl);
    }
    catch (r2Err) {
        console.warn(`[Storage] downloadFromR2 failed for key '${fileUrl}':`, r2Err?.message);
        const cleanPath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
        const localPath = path_1.default.resolve(process.cwd(), cleanPath);
        if (fs_1.default.existsSync(localPath)) {
            return fs_1.default.readFileSync(localPath);
        }
        throw new Error(`File not accessible in storage: ${r2Err?.message || "Storage error"}`);
    }
}
// Use memory storage — no disk needed since we upload directly to R2
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (path_1.default.extname(file.originalname).toLowerCase() !== ".docx") {
            return cb(new Error("Only .docx files are allowed"));
        }
        cb(null, true);
    },
});
// ─────────────────────────────────────────────
// GET /api/templates
// ─────────────────────────────────────────────
router.get("/", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const templates = await prisma_1.prisma.noticeTemplate.findMany({
            where: { tenantId: req.auth.tenantId },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ success: true, templates });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch templates" });
    }
});
// ─────────────────────────────────────────────
// POST /api/templates
// ─────────────────────────────────────────────
router.post("/", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Word template file is required" });
        }
        const parsed = templates_validation_1.templateUploadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const template = await (0, templates_service_1.createTemplate)(req.auth.tenantId, parsed.data.noticeType, req.file);
        return res.status(201).json({ success: true, template });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || "Template upload failed" });
    }
});
// ─────────────────────────────────────────────
// Handler: Template Preview
// Supports /:id/preview, /preview/:id, and /preview?id=
// ─────────────────────────────────────────────
async function handlePreview(req, res) {
    try {
        const paramId = String(req.params.id || req.query.id || "");
        if (!paramId) {
            return res.status(400).json({ error: "Template ID is required" });
        }
        const template = await prisma_1.prisma.noticeTemplate.findFirst({
            where: {
                tenantId: req.auth.tenantId,
                OR: [
                    { id: paramId },
                    { noticeType: paramId },
                ],
            },
        });
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        let buffer;
        try {
            buffer = await getFileBuffer(template.fileUrl);
        }
        catch (storageErr) {
            return res.status(404).json({
                error: `Template file not accessible in Cloudflare R2: ${storageErr?.message || "Storage error"}. Please re-upload.`,
            });
        }
        let text = "";
        let placeholders = [];
        try {
            const zip = new pizzip_1.default(buffer);
            const documentXml = zip.files["word/document.xml"]?.asText() || "";
            // Extract readable paragraphs from docx XML
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
            // Extract dynamic placeholders {{...}}
            const matches = Array.from(text.matchAll(/\{\{([^{}]+)\}\}/g)).map((m) => m[1].trim());
            placeholders = Array.from(new Set(matches)).filter(Boolean);
        }
        catch (parseErr) {
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to preview template" });
    }
}
router.get("/:id/preview", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, handlePreview);
router.get("/preview/:id", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, handlePreview);
router.get("/preview", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, handlePreview);
// ─────────────────────────────────────────────
// Handler: Template Download
// Supports /:id/download, /download/:id, and /download?id=
// ─────────────────────────────────────────────
async function handleDownload(req, res) {
    try {
        const paramId = String(req.params.id || req.query.id || "");
        if (!paramId) {
            return res.status(400).json({ error: "Template ID is required" });
        }
        const template = await prisma_1.prisma.noticeTemplate.findFirst({
            where: {
                tenantId: req.auth.tenantId,
                OR: [
                    { id: paramId },
                    { noticeType: paramId },
                ],
            },
        });
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        let buffer;
        try {
            buffer = await getFileBuffer(template.fileUrl);
        }
        catch (storageErr) {
            return res.status(404).json({
                error: `Template file not accessible in Cloudflare R2: ${storageErr?.message || "Storage error"}. Please re-upload.`,
            });
        }
        const filename = `${template.noticeType.toLowerCase().replace(/_/g, "-")}-template.docx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", buffer.length);
        return res.send(buffer);
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to download template" });
    }
}
router.get("/:id/download", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, handleDownload);
router.get("/download/:id", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, handleDownload);
router.get("/download", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, handleDownload);
// ─────────────────────────────────────────────
// DELETE /api/templates/:id
// ─────────────────────────────────────────────
router.delete("/:id", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        await (0, templates_service_1.deleteTemplate)(req.auth.tenantId, String(req.params.id));
        return res.json({ success: true, message: "Template deleted" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to delete template" });
    }
});
exports.default = router;
