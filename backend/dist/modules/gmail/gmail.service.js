"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOAuthClient = createOAuthClient;
exports.getAuthUrl = getAuthUrl;
exports.handleOAuthCallback = handleOAuthCallback;
exports.sendNoticeViaGmail = sendNoticeViaGmail;
exports.getGmailStatus = getGmailStatus;
exports.disconnectGmail = disconnectGmail;
const googleapis_1 = require("googleapis");
const prisma_1 = require("../../lib/prisma");
const encryption_1 = require("../../lib/encryption");
const storage_1 = require("../../lib/storage");
// ─────────────────────────────────────────────
// OAuth2 client factory
// ─────────────────────────────────────────────
function createOAuthClient() {
    return new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}
// ─────────────────────────────────────────────
// Step 1: Generate Google OAuth URL
// ─────────────────────────────────────────────
function getAuthUrl(tenantId) {
    const oauth2Client = createOAuthClient();
    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email",
        ],
        state: tenantId,
    });
}
// ─────────────────────────────────────────────
// Step 2: Handle OAuth callback
// ─────────────────────────────────────────────
async function handleOAuthCallback(code, tenantId) {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error("Failed to get tokens from Google");
    }
    // Ensure gmail.send scope was actually granted by the user
    if (tokens.scope && !tokens.scope.includes("gmail.send")) {
        throw new Error("Permission missing: You must check the box to allow PassNotice to 'Send email on your behalf' during Google sign-in.");
    }
    oauth2Client.setCredentials(tokens);
    const oauth2 = googleapis_1.google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const emailAddress = userInfo.data.email;
    const encryptedAccess = (0, encryption_1.encrypt)(tokens.access_token);
    const encryptedRefresh = (0, encryption_1.encrypt)(tokens.refresh_token);
    const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000);
    const existing = await prisma_1.prisma.gmailAccount.findUnique({ where: { tenantId } });
    if (existing) {
        await prisma_1.prisma.gmailAccount.update({
            where: { tenantId },
            data: { emailAddress, accessToken: encryptedAccess, refreshToken: encryptedRefresh, expiresAt },
        });
    }
    else {
        await prisma_1.prisma.gmailAccount.create({
            data: { tenantId, emailAddress, accessToken: encryptedAccess, refreshToken: encryptedRefresh, expiresAt },
        });
    }
    return { emailAddress };
}
// ─────────────────────────────────────────────
// Get a ready-to-use OAuth2 client for a tenant
// Auto-refreshes token if expired
// ─────────────────────────────────────────────
async function getAuthClientForTenant(tenantId) {
    const account = await prisma_1.prisma.gmailAccount.findUnique({ where: { tenantId } });
    if (!account)
        throw new Error("Gmail not connected. Please connect your Gmail account first.");
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({
        access_token: (0, encryption_1.decrypt)(account.accessToken),
        refresh_token: (0, encryption_1.decrypt)(account.refreshToken),
        expiry_date: account.expiresAt.getTime(),
    });
    if (account.expiresAt <= new Date()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await prisma_1.prisma.gmailAccount.update({
            where: { tenantId },
            data: {
                accessToken: (0, encryption_1.encrypt)(credentials.access_token),
                expiresAt: credentials.expiry_date
                    ? new Date(credentials.expiry_date)
                    : new Date(Date.now() + 3600 * 1000),
            },
        });
        oauth2Client.setCredentials(credentials);
    }
    return { oauth2Client, account };
}
// ─────────────────────────────────────────────
// Build RFC 2822 email with .docx attachment
// Uses buffer — no local file system
// ─────────────────────────────────────────────
function buildEmailFromBuffer({ from, to, subject, body, attachmentBuffer, attachmentName, }) {
    const base64File = attachmentBuffer.toString("base64");
    const boundary = `boundary_${Date.now()}`;
    const email = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        body,
        ``,
        `--${boundary}`,
        `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${attachmentName}"`,
        ``,
        base64File,
        ``,
        `--${boundary}--`,
    ].join("\n");
    return Buffer.from(email).toString("base64url");
}
// ─────────────────────────────────────────────
// Send notice via Gmail
// Downloads notice file from R2 into memory
// ─────────────────────────────────────────────
async function sendNoticeViaGmail(tenantId, noticeId) {
    // 1. Load notice with client and template
    const notice = await prisma_1.prisma.notice.findFirst({
        where: { id: noticeId, tenantId },
        include: { client: true, template: true },
    });
    if (!notice)
        throw new Error("Notice not found");
    if (!notice.client.email)
        throw new Error("Client has no email address");
    if (!notice.fileUrl)
        throw new Error("Notice file not generated yet");
    // 2. Get auth client for tenant
    const { oauth2Client, account } = await getAuthClientForTenant(tenantId);
    // 3. Download notice file from R2 into memory (no disk access)
    let fileBuffer;
    try {
        fileBuffer = await (0, storage_1.downloadFromR2)(notice.fileUrl);
    }
    catch {
        throw new Error("Notice file missing in storage. Please regenerate the notice.");
    }
    const attachmentName = `${notice.client.name.replace(/[^a-zA-Z0-9]/g, "_")}-notice.docx`;
    // 4. Build email with buffer attachment
    const subject = `Legal Notice - ${notice.template.noticeType}`;
    const body = `Dear ${notice.client.name},\n\nPlease find attached the legal notice issued to you.\n\nThis notice requires your immediate attention.\n\nRegards,\n${account.emailAddress}`;
    const rawEmail = buildEmailFromBuffer({
        from: account.emailAddress,
        // to: process.env.TEST_EMAIL || notice.client.email, for testing purpose
        to: notice.client.email,
        subject,
        body,
        attachmentBuffer: fileBuffer,
        attachmentName,
    });
    // 5. Send via Gmail API
    const gmail = googleapis_1.google.gmail({ version: "v1", auth: oauth2Client });
    try {
        await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw: rawEmail },
        });
        await prisma_1.prisma.notice.update({ where: { id: noticeId }, data: { emailStatus: "SENT" } });
        await prisma_1.prisma.sendLog.create({ data: { noticeId, channel: "EMAIL", status: "SENT" } });
        return { success: true, sentTo: notice.client.email };
    }
    catch (error) {
        await prisma_1.prisma.sendLog.create({
            data: { noticeId, channel: "EMAIL", status: "FAILED", errorMsg: error.message },
        });
        await prisma_1.prisma.notice.update({ where: { id: noticeId }, data: { emailStatus: "FAILED" } });
        throw new Error(`Failed to send email: ${error.message}`);
    }
}
// ─────────────────────────────────────────────
// Get Gmail connection status for a tenant
// ─────────────────────────────────────────────
async function getGmailStatus(tenantId) {
    const account = await prisma_1.prisma.gmailAccount.findUnique({ where: { tenantId } });
    if (!account)
        return { connected: false };
    return { connected: true, emailAddress: account.emailAddress, expiresAt: account.expiresAt };
}
// ─────────────────────────────────────────────
// Disconnect Gmail
// ─────────────────────────────────────────────
async function disconnectGmail(tenantId) {
    await prisma_1.prisma.gmailAccount.deleteMany({ where: { tenantId } });
}
