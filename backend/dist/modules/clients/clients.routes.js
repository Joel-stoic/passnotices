"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────────
// GET /api/clients/batches
// List all batches for the tenant
// ─────────────────────────────────────────────
router.get("/batches", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const batches = await prisma_1.prisma.batch.findMany({
            where: { tenantId: req.auth.tenantId },
            include: {
                _count: { select: { clients: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ success: true, batches });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to fetch batches" });
    }
});
// ─────────────────────────────────────────────
// DELETE /api/clients/batches/:batchId
// Delete a batch and all its clients
// ─────────────────────────────────────────────
router.delete("/batches/:batchId", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const batch = await prisma_1.prisma.batch.findFirst({
            where: {
                id: String(req.params.batchId),
                tenantId: req.auth.tenantId,
            },
        });
        if (!batch) {
            return res.status(404).json({ error: "Batch not found" });
        }
        const clients = await prisma_1.prisma.client.findMany({
            where: { batchId: batch.id },
            select: { id: true },
        });
        const clientIds = clients.map((c) => c.id);
        if (clientIds.length > 0) {
            const notices = await prisma_1.prisma.notice.findMany({
                where: { clientId: { in: clientIds } },
                select: { id: true },
            });
            const noticeIds = notices.map((n) => n.id);
            if (noticeIds.length > 0) {
                await prisma_1.prisma.sendLog.deleteMany({ where: { noticeId: { in: noticeIds } } });
            }
            await prisma_1.prisma.notice.deleteMany({ where: { clientId: { in: clientIds } } });
            await prisma_1.prisma.client.deleteMany({ where: { batchId: batch.id } });
        }
        await prisma_1.prisma.batch.delete({ where: { id: batch.id } });
        return res.json({ success: true, message: "Batch deleted" });
    }
    catch (error) {
        console.error("Delete batch error:", error);
        return res.status(500).json({ error: "Failed to delete batch" });
    }
});
// ─────────────────────────────────────────────
// GET /api/clients
// Get clients — optionally filtered by batchId
// ?batchId=xxx
// ─────────────────────────────────────────────
router.get("/", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const batchId = req.query.batchId;
        const clients = await prisma_1.prisma.client.findMany({
            where: {
                tenantId: req.auth.tenantId,
                ...(batchId ? { batchId } : {}),
            },
            include: {
                batch: { select: { id: true, name: true } },
                // ✅ FIX: include notices so the dashboard modal can show notice counts
                // and send statuses per client
                notices: {
                    select: {
                        id: true,
                        status: true,
                        emailStatus: true,
                        whatsappStatus: true,
                        createdAt: true,
                        template: { select: { noticeType: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
            orderBy: { createdAt: "asc" },
        });
        return res.json({ success: true, clients });
    }
    catch (error) {
        console.error("Get clients error:", error);
        return res.status(500).json({ error: "Failed to fetch clients" });
    }
});
// ─────────────────────────────────────────────
// GET /api/clients/:id
// ─────────────────────────────────────────────
router.get("/:id", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const client = await prisma_1.prisma.client.findFirst({
            where: {
                id: String(req.params.id),
                tenantId: req.auth.tenantId,
            },
            include: {
                batch: { select: { id: true, name: true } },
                notices: {
                    select: {
                        id: true,
                        status: true,
                        emailStatus: true,
                        whatsappStatus: true,
                        createdAt: true,
                        template: { select: { noticeType: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!client) {
            return res.status(404).json({ error: "Client not found" });
        }
        return res.json({ success: true, client });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to fetch client" });
    }
});
// ─────────────────────────────────────────────
// DELETE /api/clients/:id
// ─────────────────────────────────────────────
router.delete("/:id", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const client = await prisma_1.prisma.client.findFirst({
            where: {
                id: String(req.params.id),
                tenantId: req.auth.tenantId,
            },
        });
        if (!client) {
            return res.status(404).json({ error: "Client not found" });
        }
        const notices = await prisma_1.prisma.notice.findMany({
            where: { clientId: client.id },
            select: { id: true },
        });
        const noticeIds = notices.map((n) => n.id);
        if (noticeIds.length > 0) {
            await prisma_1.prisma.sendLog.deleteMany({ where: { noticeId: { in: noticeIds } } });
        }
        await prisma_1.prisma.notice.deleteMany({ where: { clientId: client.id } });
        await prisma_1.prisma.client.delete({ where: { id: client.id } });
        return res.json({ success: true, message: "Client deleted successfully" });
    }
    catch (error) {
        console.error("Delete client error:", error);
        return res.status(500).json({ error: "Failed to delete client" });
    }
});
exports.default = router;
