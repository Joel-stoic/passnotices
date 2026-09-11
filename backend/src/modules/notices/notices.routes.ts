import path from "path";
import fs from "fs";
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { generateNoticeSchema, generateBulkSchema } from "./notices.validation";
import { generateNotice, generateBulkNotices, generateAndSendAll } from "./notices.service";
import { prisma } from "../../lib/prisma";

const router = Router();

// ─────────────────────────────────────────────
// POST /api/notices/generate
// Generate a notice for one client
// ─────────────────────────────────────────────

router.post(
  "/generate",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const parsed = generateNoticeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const notice = await generateNotice(
        req.auth!.tenantId,
        parsed.data.clientId,
        parsed.data.noticeType
      );
      return res.status(201).json({ success: true, notice });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Notice generation failed" });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/notices/generate-bulk
// Generate notices for ALL clients (no send)
// ─────────────────────────────────────────────

router.post(
  "/generate-bulk",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const parsed = generateBulkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const result = await generateBulkNotices(
        req.auth!.tenantId,
        parsed.data.noticeType
      );
      return res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Bulk generation failed" });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/notices/generate-and-send-all
// ONE CLICK — Generate + Send ALL via Gmail
// Body: { noticeType: "SECTION_25" }
// ─────────────────────────────────────────────

router.post(
  "/generate-and-send-all",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const parsed = generateBulkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const result = await generateAndSendAll(
        req.auth!.tenantId,
        parsed.data.noticeType,
        parsed.data.batchId
      );
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Bulk generate and send failed" });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/notices
// List all notices for the tenant
// ─────────────────────────────────────────────

router.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const notices = await prisma.notice.findMany({
        where: { tenantId: req.auth!.tenantId },
        include: {
          client: { select: { id: true, name: true, mobile: true } },
          template: { select: { id: true, noticeType: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return res.json({ success: true, notices });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch notices" });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/notices/download/:noticeId
// Download the generated .docx file
// ─────────────────────────────────────────────

router.get(
  "/download/:noticeId",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const notice = await prisma.notice.findFirst({
        where: {
          id: String(req.params.noticeId),
          tenantId: req.auth!.tenantId,
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
      const filePath = path.resolve(process.cwd(), relativePath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Notice file missing on disk" });
      }

      const clientName = (notice as any).client?.name?.replace(/[^a-zA-Z0-9]/g, "_") ?? "notice";
      const downloadName = `${clientName}-notice.docx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);

      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      return res.status(500).json({ error: "Failed to download notice" });
    }
  }
);

export default router;