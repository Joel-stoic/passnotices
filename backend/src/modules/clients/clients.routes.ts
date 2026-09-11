import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";

const router = Router();

// ─────────────────────────────────────────────
// GET /api/clients/batches
// List all batches for the tenant
// ─────────────────────────────────────────────

router.get(
  "/batches",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const batches = await prisma.batch.findMany({
        where: { tenantId: req.auth!.tenantId },
        include: {
          _count: { select: { clients: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ success: true, batches });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch batches" });
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /api/clients/batches/:batchId
// Delete a batch and all its clients
// ─────────────────────────────────────────────

router.delete(
  "/batches/:batchId",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const batch = await prisma.batch.findFirst({
        where: {
          id: String(req.params.batchId),
          tenantId: req.auth!.tenantId,
        },
      });

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Delete all clients in batch first
      await prisma.client.deleteMany({
        where: { batchId: batch.id },
      });

      await prisma.batch.delete({ where: { id: batch.id } });

      return res.json({ success: true, message: "Batch deleted" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete batch" });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/clients
// Get clients — optionally filtered by batchId
// ?batchId=xxx
// ─────────────────────────────────────────────

router.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const batchId = req.query.batchId as string | undefined;

      const clients = await prisma.client.findMany({
        where: {
          tenantId: req.auth!.tenantId,
          ...(batchId ? { batchId } : {}),
        },
        include: {
          batch: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      return res.json({ success: true, clients });
    } catch (error) {
      console.error("Get clients error:", error);
      return res.status(500).json({ error: "Failed to fetch clients" });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/clients/:id
// ─────────────────────────────────────────────

router.get(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const client = await prisma.client.findFirst({
        where: {
          id: String(req.params.id),
          tenantId: req.auth!.tenantId,
        },
        include: {
          batch: { select: { id: true, name: true } },
        },
      });

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      return res.json({ success: true, client });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch client" });
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /api/clients/:id
// ─────────────────────────────────────────────

router.delete(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const client = await prisma.client.findFirst({
        where: {
          id: String(req.params.id),
          tenantId: req.auth!.tenantId,
        },
      });

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Delete related records first (cascade manually)
      const notices = await prisma.notice.findMany({
        where: { clientId: client.id },
        select: { id: true },
      });

      const noticeIds = notices.map((n) => n.id);

      // Delete send logs first
      if (noticeIds.length > 0) {
        await prisma.sendLog.deleteMany({
          where: { noticeId: { in: noticeIds } },
        });
      }

      // Delete notices
      await prisma.notice.deleteMany({
        where: { clientId: client.id },
      });

      // Now delete client
      await prisma.client.delete({ where: { id: client.id } });

      return res.json({ success: true, message: "Client deleted successfully" });
    } catch (error) {
      console.error("Delete client error:", error);
      return res.status(500).json({ error: "Failed to delete client" });
    }
  }
);

export default router;