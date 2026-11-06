"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const gmail_service_1 = require("./gmail.service");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────────
// GET /api/gmail/status
// Check if Gmail is connected for this tenant
// ─────────────────────────────────────────────
router.get("/status", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const status = await (0, gmail_service_1.getGmailStatus)(req.auth.tenantId);
        return res.json({ success: true, ...status });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/gmail/connect
// Redirect advocate to Google OAuth consent screen
// ─────────────────────────────────────────────
router.get("/connect", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const url = (0, gmail_service_1.getAuthUrl)(req.auth.tenantId);
        return res.json({ success: true, url });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/gmail/callback
// Google redirects here after advocate approves
// ─────────────────────────────────────────────
router.get("/callback", async (req, res) => {
    try {
        const code = req.query.code;
        const tenantId = req.query.state; // passed via state param
        if (!code || !tenantId) {
            return res.status(400).send("Missing code or state");
        }
        await (0, gmail_service_1.handleOAuthCallback)(code, tenantId);
        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(`${frontendUrl}/dashboard?gmail=connected`);
    }
    catch (error) {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(`${frontendUrl}/dashboard?gmail=error&msg=${encodeURIComponent(error.message)}`);
    }
});
// ─────────────────────────────────────────────
// POST /api/gmail/send/:noticeId
// Send a generated notice via Gmail
// ─────────────────────────────────────────────
router.post("/send/:noticeId", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        const result = await (0, gmail_service_1.sendNoticeViaGmail)(req.auth.tenantId, String(req.params.noticeId));
        return res.json(result);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
});
// ─────────────────────────────────────────────
// DELETE /api/gmail/disconnect
// Disconnect Gmail account
// ─────────────────────────────────────────────
router.delete("/disconnect", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, async (req, res) => {
    try {
        await (0, gmail_service_1.disconnectGmail)(req.auth.tenantId);
        return res.json({ success: true, message: "Gmail disconnected" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
