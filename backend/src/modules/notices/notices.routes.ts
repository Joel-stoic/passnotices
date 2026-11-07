import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { generateNoticeSchema, generateBulkSchema } from "./notices.validation";
import { generateNotice, generateBulkNotices, generateAndSendAll } from "./notices.service";
import { prisma } from "../../lib/prisma";
import { downloadFromR2 } from "../../lib/storage";
import { bulkSendQueue } from "../../lib/queue";

const router = Router();

// POST /api/notices/generate
router.post("/generate", authMiddleware, tenantMiddleware, async (req, res) => {
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
});

// POST /api/notices/generate-bulk
router.post("/generate-bulk", authMiddleware, tenantMiddleware, async (req, res) => {
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
});

// POST /api/notices/generate-and-send-all — fire and forget
router.post("/generate-and-send-all", authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const parsed = generateBulkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const tenantId = req.auth!.tenantId;
    const { noticeType, batchId } = parsed.data;

    // Respond immediately
    res.status(200).json({
      success: true,
      message: "Bulk send started. Emails will be sent in the background.",
    });

    // Process in background
    generateAndSendAll(tenantId, noticeType, batchId).catch((err) => {
      console.error(`[BulkSend] Failed for tenant ${tenantId}:`, err.message);
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Bulk generate and send failed" });
  }
});

// GET /api/notices
router.get("/", authMiddleware, tenantMiddleware, async (req, res) => {
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
});

// GET /api/notices/download/:noticeId
router.get("/download/:noticeId", authMiddleware, tenantMiddleware, async (req, res) => {
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

    if (!notice.fileUrl) {
      return res.status(404).json({ error: "Notice file not generated yet" });
    }

    let buffer: Buffer;
    try {
      buffer = await downloadFromR2(notice.fileUrl);
    } catch {
      return res.status(404).json({ error: "Notice file missing in storage. Please regenerate." });
    }

    const clientName = (notice as any).client?.name?.replace(/[^a-zA-Z0-9]/g, "_") ?? "notice";
    const downloadName = `${clientName}-notice.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: "Failed to download notice" });
  }
});

router.post("/generate-and-send-all", authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const parsed = generateBulkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const tenantId = req.auth!.tenantId;
    const { noticeType, batchId } = parsed.data;

    // Concurrency guard — one job at a time per tenant
    const activeJob = await prisma.bulkJob.findFirst({
      where: { tenantId, status: { in: ["PENDING", "RUNNING"] } },
    });
    if (activeJob) {
      return res.status(400).json({
        error: "A bulk send is already in progress.",
        jobId: activeJob.id,
      });
    }

    // Count clients
    const total = await prisma.client.count({
      where: { tenantId, ...(batchId ? { batchId } : {}) },
    });
    if (total === 0) {
      return res.status(400).json({ error: "No clients found. Upload an Excel file first." });
    }

    // Create DB job record
    const job = await prisma.bulkJob.create({
      data: { tenantId, noticeType, batchId: batchId ?? null, total },
    });

    // Add to Redis queue
    await bulkSendQueue.add("send", { jobId: job.id }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });

    return res.status(200).json({
      success: true,
      jobId: job.id,
      message: `Bulk send queued for ${total} clients.`,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Bulk send failed" });
  }
});

export default router;