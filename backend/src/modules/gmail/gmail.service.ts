import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { prisma } from "../../lib/prisma";
import { encrypt, decrypt } from "../../lib/encryption";

// ─────────────────────────────────────────────
// OAuth2 client factory
// ─────────────────────────────────────────────

export function createOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

// ─────────────────────────────────────────────
// Step 1: Generate Google OAuth URL
// Advocate clicks this URL to connect their Gmail
// ─────────────────────────────────────────────

export function getAuthUrl(tenantId: string): string {
    const oauth2Client = createOAuthClient();

    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent", // force refresh token every time
        scope: [
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email",
        ],
        state: tenantId, // pass tenantId through OAuth flow
    });
}

// ─────────────────────────────────────────────
// Step 2: Handle OAuth callback
// Exchange code for tokens and save to DB
// ─────────────────────────────────────────────

export async function handleOAuthCallback(code: string, tenantId: string) {
    const oauth2Client = createOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error("Failed to get tokens from Google");
    }

    // Get advocate's Gmail address
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const emailAddress = userInfo.data.email!;

    // Encrypt tokens before saving
    const encryptedAccess = encrypt(tokens.access_token);
    const encryptedRefresh = encrypt(tokens.refresh_token);
    const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

    // Upsert — re-connecting replaces old tokens
    const existing = await prisma.gmailAccount.findUnique({
        where: { tenantId },
    });

    if (existing) {
        await prisma.gmailAccount.update({
            where: { tenantId },
            data: {
                emailAddress,
                accessToken: encryptedAccess,
                refreshToken: encryptedRefresh,
                expiresAt,
            },
        });
    } else {
        await prisma.gmailAccount.create({
            data: {
                tenantId,
                emailAddress,
                accessToken: encryptedAccess,
                refreshToken: encryptedRefresh,
                expiresAt,
            },
        });
    }

    return { emailAddress };
}

// ─────────────────────────────────────────────
// Get a ready-to-use OAuth2 client for a tenant
// Auto-refreshes token if expired
// ─────────────────────────────────────────────

async function getAuthClientForTenant(tenantId: string) {
    const account = await prisma.gmailAccount.findUnique({
        where: { tenantId },
    });

    if (!account) {
        throw new Error("Gmail not connected. Please connect your Gmail account first.");
    }

    const oauth2Client = createOAuthClient();

    oauth2Client.setCredentials({
        access_token: decrypt(account.accessToken),
        refresh_token: decrypt(account.refreshToken),
        expiry_date: account.expiresAt.getTime(),
    });

    // Auto-refresh if expired
    if (account.expiresAt <= new Date()) {
        const { credentials } = await oauth2Client.refreshAccessToken();

        await prisma.gmailAccount.update({
            where: { tenantId },
            data: {
                accessToken: encrypt(credentials.access_token!),
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
// ─────────────────────────────────────────────

function buildEmail({
    from,
    to,
    subject,
    body,
    attachmentPath,
    attachmentName,
}: {
    from: string;
    to: string;
    subject: string;
    body: string;
    attachmentPath: string;
    attachmentName: string;
}): string {
    const fileContent = fs.readFileSync(attachmentPath);
    const base64File = fileContent.toString("base64");

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
// ─────────────────────────────────────────────

export async function sendNoticeViaGmail(
    tenantId: string,
    noticeId: string
) {
    // 1. Load notice with client and template
    const notice = await prisma.notice.findFirst({
        where: { id: noticeId, tenantId },
        include: {
            client: true,
            template: true,
        },
    });

    if (!notice) throw new Error("Notice not found");
    if (!notice.client.email) throw new Error("Client has no email address");
    if (!notice.fileUrl) throw new Error("Notice file not generated yet");

    // 2. Get auth client for tenant
    const { oauth2Client, account } = await getAuthClientForTenant(tenantId);

    // 3. Resolve file path
    const rawUrl = notice.fileUrl ?? "";
    const relativePath = rawUrl.startsWith("/") ? rawUrl.slice(1) : rawUrl;
    const filePath = path.resolve(process.cwd(), relativePath);

    if (!fs.existsSync(filePath)) {
        throw new Error("Notice file missing on disk");
    }

    const attachmentName = `${notice.client.name.replace(/[^a-zA-Z0-9]/g, "_")}-notice.docx`;

    // 4. Build email
    const subject = `Legal Notice - ${notice.template.noticeType}`;
    const body = `Dear ${notice.client.name},\n\nPlease find attached the legal notice issued to you.\n\nThis notice requires your immediate attention.\n\nRegards,\n${account.emailAddress}`;

    const rawEmail = buildEmail({
        from: account.emailAddress,
        to: process.env.TEST_EMAIL || notice.client.email,
        subject,
        body,
        attachmentPath: filePath,
        attachmentName,
    });

    // 5. Send via Gmail API
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    try {
        await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw: rawEmail },
        });

        // 6. Update notice emailStatus
        await prisma.notice.update({
            where: { id: noticeId },
            data: { emailStatus: "SENT" },
        });

        // 7. Log success
        await prisma.sendLog.create({
            data: {
                noticeId,
                channel: "EMAIL",
                status: "SENT",
            },
        });

        return { success: true, sentTo: notice.client.email };
    } catch (error: any) {
        // Log failure
        await prisma.sendLog.create({
            data: {
                noticeId,
                channel: "EMAIL",
                status: "FAILED",
                errorMsg: error.message,
            },
        });

        await prisma.notice.update({
            where: { id: noticeId },
            data: { emailStatus: "FAILED" },
        });

        throw new Error(`Failed to send email: ${error.message}`);
    }
}

// ─────────────────────────────────────────────
// Get Gmail connection status for a tenant
// ─────────────────────────────────────────────

export async function getGmailStatus(tenantId: string) {
    const account = await prisma.gmailAccount.findUnique({
        where: { tenantId },
    });

    if (!account) return { connected: false };

    return {
        connected: true,
        emailAddress: account.emailAddress,
        expiresAt: account.expiresAt,
    };
}

// ─────────────────────────────────────────────
// Disconnect Gmail
// ─────────────────────────────────────────────

export async function disconnectGmail(tenantId: string) {
    await prisma.gmailAccount.deleteMany({
        where: { tenantId },
    });
}