import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { prisma } from "../../lib/prisma";
import { sendNoticeViaGmail } from "../gmail/gmail.service";

// ─────────────────────────────────────────────
// Normalize field names
// "MOBILE NO" → "MOBILE_NO"
// ─────────────────────────────────────────────

function normalizeKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// ─────────────────────────────────────────────
// Convert Excel serial date number → DD/MM/YYYY
// Also handles strings like "21/10/2025" as-is
// ─────────────────────────────────────────────

function formatExcelDate(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "string") return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  return String(value);
}

// ─────────────────────────────────────────────
// Today as DD/MM/YYYY — used for NOTICE_DATE
// ─────────────────────────────────────────────

function todayFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

// ─────────────────────────────────────────────
// Format money: 6257.440000000002 → "6257.44"
// ─────────────────────────────────────────────

function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toFixed(2);
}

// ─────────────────────────────────────────────
// Safe string conversion
// ─────────────────────────────────────────────

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

// ─────────────────────────────────────────────
// Generate a single notice
// ─────────────────────────────────────────────

export async function generateNotice(
  tenantId: string,
  clientId: string,
  noticeType: string
) {
  // 1. Find client
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
  });
  if (!client) throw new Error("Client not found");

  // 2. Find template
  const template = await prisma.noticeTemplate.findFirst({
    where: { tenantId, noticeType },
  });
  if (!template) {
    throw new Error(
      `Template not found for notice type "${noticeType}". Upload a .docx template first.`
    );
  }

  // 3. Check template file on disk
  const templatePath = path.resolve(template.fileUrl);
  if (!fs.existsSync(templatePath)) {
    throw new Error("Template file missing on disk. Please re-upload the template.");
  }

  // 4. Load DOCX into docxtemplater
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter() { return ""; },
  });

  // 5. Build data map
  const clientData = client.data as Record<string, unknown>;
  const data: Record<string, string> = {};

  // Pass every Excel column in both raw and normalized form
  // e.g. "MOBILE NO" → also available as "MOBILE_NO"
  for (const [rawKey, rawValue] of Object.entries(clientData)) {
    const cleanKey = rawKey.trim();
    const normalizedKey = normalizeKey(cleanKey);

    const dateFields = ["BOUNCE DATE", "NOTICE DATE", "LIEN"];
    const moneyFields = [
      "BOUNCE AMOUNT",
      "MAD AMOUNT",
      "SYSBAL",
      "Balance is less than Bounce amt",
    ];

    let value: string;
    if (dateFields.includes(cleanKey)) {
      value = formatExcelDate(rawValue);
    } else if (moneyFields.includes(cleanKey)) {
      value = formatMoney(rawValue);
    } else {
      value = str(rawValue);
    }

    data[cleanKey] = value;
    data[normalizedKey] = value;
  }

  // 6. Standard client-level fields
  data.NAME = client.name ?? "";
  data.MOBILE_NO = client.mobile ?? "";
  data.EMAIL = client.email ?? "";
  data.ADDRESS = client.address ?? "";

  // 7. Explicit mappings for every placeholder in the Word template
  //    (covers both {{SNAKE_CASE}} and {{SPACED}} variants)

  // REF NO — "Sr.NO" column in Excel, e.g. "Hdfc/Nov/Sec25/1"
  // Template uses {{REF_NO}}
  const refNo =
    str(clientData["Sr.NO"]) ||
    str(clientData["SR.NO"]) ||
    str(clientData["SRNO"]) ||
    str(clientData["S.NO"]);
  data["REF_NO"] = refNo;
  data["REF NO"] = refNo;

  // NOTICE DATE — not in Excel; inject today
  // Template uses {{NOTICE_DATE}}
  const noticeDate = todayFormatted();
  data["NOTICE_DATE"] = noticeDate;
  data["NOTICE DATE"] = noticeDate;

  // MOBILE NO
  data["MOBILE NO"] = str(clientData["MOBILE NO"]);
  data["MOBILE_NO"] = str(clientData["MOBILE NO"]);

  // MAIL ADDRESS 1 / 2 / 3
  data["MAIL ADDRESS1"] = str(clientData["MAIL ADDRESS1"]);
  data["MAIL_ADDRESS1"] = str(clientData["MAIL ADDRESS1"]);
  data["MAIL_ADDRESS_1"] = str(clientData["MAIL ADDRESS1"]);

  data["MAIL ADDRESS2"] = str(clientData["MAIL ADDRESS2"]);
  data["MAIL_ADDRESS2"] = str(clientData["MAIL ADDRESS2"]);
  data["MAIL_ADDRESS_2"] = str(clientData["MAIL ADDRESS2"]);

  data["MAIL ADDRESS3"] = str(clientData["MAIL ADDRESS3"]);
  data["MAIL_ADDRESS3"] = str(clientData["MAIL ADDRESS3"]);
  data["MAIL_ADDRESS_3"] = str(clientData["MAIL ADDRESS3"]);

  // CITY / PINCODE
  data["CITY"] = str(clientData["CITY"]);
  data["PINCODE"] = str(clientData["PINCODE"]);

  // MASKED CARD — Excel column: "MASKED CARD #"
  // Template uses {{MASKED_CARD}}
  data["MASKED CARD #"] = str(clientData["MASKED CARD #"]);
  data["MASKED_CARD"] = str(clientData["MASKED CARD #"]);

  // AAN — Template uses {{AAN_NO}}
  data["AAN"] = str(clientData["AAN"]);
  data["AAN_NO"] = str(clientData["AAN"]);

  // ACCOUNT NO
  data["ACCOUNT NO"] = str(clientData["ACCOUNT NO"]);
  data["ACCOUNT_NO"] = str(clientData["ACCOUNT NO"]);

  // BOUNCE DATE
  data["BOUNCE DATE"] = formatExcelDate(clientData["BOUNCE DATE"]);
  data["BOUNCE_DATE"] = formatExcelDate(clientData["BOUNCE DATE"]);

  // BOUNCE REASON
  data["BOUNCE REASON"] = str(clientData["BOUNCE REASON"]);
  data["BOUNCE_REASON"] = str(clientData["BOUNCE REASON"]);

  // BOUNCE AMOUNT
  data["BOUNCE AMOUNT"] = formatMoney(clientData["BOUNCE AMOUNT"]);
  data["BOUNCE_AMOUNT"] = formatMoney(clientData["BOUNCE AMOUNT"]);

  // LEGAL OFFICE NAME — not in Excel; blank unless tenant provides it
  // Template uses {{LEGAL_OFFICE_NAME}}
  data["LEGAL_OFFICE_NAME"] = str(clientData["LEGAL OFFICE NAME"]);
  data["LEGAL OFFICE NAME"] = str(clientData["LEGAL OFFICE NAME"]);

  // REFERENCE
  data["REFERENCE"] = str(clientData["REFERENCE "]) || str(clientData["REFERENCE"]);

  // 8. Render
  try {
    doc.render(data);
  } catch (error: any) {
    console.error("DOCX GENERATION ERROR:", error);
    let message = "Template rendering failed.";
    if (error?.properties?.errors) {
      message = `Template errors:\n${error.properties.errors
        .map((e: any) => {
          const tag = e?.properties?.xtag ? ` [tag: ${e.properties.xtag}]` : "";
          return `${e?.properties?.explanation || e?.message || "Unknown"}${tag}`;
        })
        .join("\n")}`;
    } else if (error?.properties?.explanation) {
      message = error.properties.explanation;
    } else if (error?.message) {
      message = error.message;
    }
    throw new Error(message);
  }

  // 9. Write output file
  const outputDir = path.resolve("uploads/notices");
  fs.mkdirSync(outputDir, { recursive: true });

  const filename = `${clientId}-${Date.now()}.docx`;
  const outputPath = path.join(outputDir, filename);

  const buffer = doc.getZip().generate({ type: "nodebuffer" });
  fs.writeFileSync(outputPath, buffer);

  // 10. Save to DB
  const fileUrl = `/uploads/notices/${filename}`;
  const notice = await prisma.notice.create({
    data: {
      tenantId,
      clientId,
      templateId: template.id,
      fileUrl,
      status: "GENERATED",
    },
  });

  return notice;
}

// ─────────────────────────────────────────────
// Generate notices for ALL clients in a tenant
// for a given noticeType
// ─────────────────────────────────────────────

export async function generateBulkNotices(
  tenantId: string,
  noticeType: string
) {
  const clients = await prisma.client.findMany({
    where: { tenantId },
  });

  if (clients.length === 0) {
    throw new Error("No clients found. Upload an Excel file first.");
  }

  const results: {
    clientId: string;
    name: string;
    status: "success" | "error";
    noticeId?: string;
    error?: string;
  }[] = [];

  for (const client of clients) {
    try {
      const notice = await generateNotice(tenantId, client.id, noticeType);
      results.push({
        clientId: client.id,
        name: client.name,
        status: "success",
        noticeId: notice.id,
      });
    } catch (err: any) {
      results.push({
        clientId: client.id,
        name: client.name,
        status: "error",
        error: err.message,
      });
    }
  }

  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;

  return { total: clients.length, succeeded, failed, results };
}


export async function generateAndSendAll(
  tenantId: string,
  noticeType: string
) {
  const clients = await prisma.client.findMany({ where: { tenantId } });

  if (clients.length === 0) {
    throw new Error("No clients found. Upload an Excel file first.");
  }

  const template = await prisma.noticeTemplate.findFirst({
    where: { tenantId, noticeType },
  });
  if (!template) {
    throw new Error(`No template found for "${noticeType}". Upload a template first.`);
  }

  const gmailAccount = await prisma.gmailAccount.findUnique({
    where: { tenantId },
  });
  if (!gmailAccount) {
    throw new Error("Gmail not connected. Go to Settings and connect your Gmail first.");
  }

  const results: {
    clientId: string;
    name: string;
    email: string | null;
    status: "success" | "skipped" | "error";
    reason?: string;
    noticeId?: string;
  }[] = [];

  for (const client of clients) {
    if (!client.email) {
      results.push({
        clientId: client.id,
        name: client.name,
        email: null,
        status: "skipped",
        reason: "No email address",
      });
      continue;
    }

    try {
      const notice = await generateNotice(tenantId, client.id, noticeType);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sendNoticeViaGmail(tenantId, notice.id);
      results.push({
        clientId: client.id,
        name: client.name,
        email: client.email,
        status: "success",
        noticeId: notice.id,
      });
    } catch (err: any) {
      results.push({
        clientId: client.id,
        name: client.name,
        email: client.email,
        status: "error",
        reason: err.message,
      });
    }
  }

  const succeeded = results.filter((r) => r.status === "success").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "error").length;

  return { total: clients.length, succeeded, skipped, failed, results };
}