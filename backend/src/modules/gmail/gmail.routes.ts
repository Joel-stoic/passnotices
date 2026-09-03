import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import {
  getAuthUrl,
  handleOAuthCallback,
  sendNoticeViaGmail,
  getGmailStatus,
  disconnectGmail,
} from "./gmail.service";

const router = Router();

// ─────────────────────────────────────────────
// GET /api/gmail/status
// Check if Gmail is connected for this tenant
// ─────────────────────────────────────────────

router.get(
  "/status",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const status = await getGmailStatus(req.auth!.tenantId);
      return res.json({ success: true, ...status });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/gmail/connect
// Redirect advocate to Google OAuth consent screen
// ─────────────────────────────────────────────

router.get(
  "/connect",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const url = getAuthUrl(req.auth!.tenantId);
      return res.json({ success: true, url });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/gmail/callback
// Google redirects here after advocate approves
// ─────────────────────────────────────────────

router.get(
  "/callback",
  async (req, res) => {
    try {
      const code = req.query.code as string;
      const tenantId = req.query.state as string; // passed via state param

      if (!code || !tenantId) {
        return res.status(400).send("Missing code or state");
      }

      await handleOAuthCallback(code, tenantId);

      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      return res.redirect(`${frontendUrl}/dashboard?gmail=connected`);
    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      return res.redirect(`${frontendUrl}/dashboard?gmail=error&msg=${encodeURIComponent(error.message)}`);
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/gmail/send/:noticeId
// Send a generated notice via Gmail
// ─────────────────────────────────────────────

router.post(
  "/send/:noticeId",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const result = await sendNoticeViaGmail(
        req.auth!.tenantId,
        String(req.params.noticeId)
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /api/gmail/disconnect
// Disconnect Gmail account
// ─────────────────────────────────────────────

router.delete(
  "/disconnect",
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      await disconnectGmail(req.auth!.tenantId);
      return res.json({ success: true, message: "Gmail disconnected" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

export default router;