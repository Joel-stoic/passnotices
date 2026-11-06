"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const notices_validation_1 = require("./notices.validation");
const notices_service_1 = require("./notices.service");
const prisma_1 = require("../../lib/prisma");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────────
// POST /api/notices/generate
// Generate a notice for one client
// ─────────────────────────────────────────────
router.post("/generate", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const parsed = notices_validation_1.generateNoticeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const notice = await (0, notices_service_1.generateNotice)(req.auth.tenantId, parsed.data.clientId, parsed.data.noticeType);
        return res.status(201).json({ success: true, notice });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || "Notice generation failed" });
    }
});
// ─────────────────────────────────────────────
// POST /api/notices/generate-bulk
// Generate notices for ALL clients (no send)
// ─────────────────────────────────────────────
router.post("/generate-bulk", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const parsed = notices_validation_1.generateBulkSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const result = await (0, notices_service_1.generateBulkNotices)(req.auth.tenantId, parsed.data.noticeType);
        return res.status(201).json({ success: true, ...result });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || "Bulk generation failed" });
    }
});
// ─────────────────────────────────────────────
// POST /api/notices/generate-and-send-all
// ONE CLICK — Generate + Send ALL via Gmail
// Body: { noticeType: "SECTION_25" }
// ─────────────────────────────────────────────
router.post("/generate-and-send-all", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const parsed = notices_validation_1.generateBulkSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const result = await (0, notices_service_1.generateAndSendAll)(req.auth.tenantId, parsed.data.noticeType, parsed.data.batchId);
        return res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || "Bulk generate and send failed" });
    }
});
// ─────────────────────────────────────────────
// GET /api/notices
// List all notices for the tenant
// ─────────────────────────────────────────────
router.get("/", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const notices = await prisma_1.prisma.notice.findMany({
            where: { tenantId: req.auth.tenantId },
            include: {
                client: { select: { id: true, name: true, mobile: true } },
                template: { select: { id: true, noticeType: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ success: true, notices });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to fetch notices" });
    }
});
// ─────────────────────────────────────────────
// GET /api/notices/download/:noticeId
// Download the generated .docx file
// ─────────────────────────────────────────────
router.get("/download/:noticeId", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const notice = await prisma_1.prisma.notice.findFirst({
            where: {
                id: String(req.params.noticeId),
                tenantId: req.auth.tenantId,
            },
            include: {
                client: { select: { name: true } },
            },
        });
        if (!notice) {
            return res.status(404).json({ error: "Notice not found" });
        }
        const rawUrl = notice.fileUrl ?? "";
        const relativePath = rawUrl.startsWith("/") ? rawUrl.slice(1) : rawUrl;
        const filePath = path_1.default.resolve(process.cwd(), relativePath);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: "Notice file missing on disk" });
        }
        const clientName = notice.client?.name?.replace(/[^a-zA-Z0-9]/g, "_") ?? "notice";
        const downloadName = `${clientName}-notice.docx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
        fs_1.default.createReadStream(filePath).pipe(res);
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to download notice" });
    }
});
exports.default = router;
