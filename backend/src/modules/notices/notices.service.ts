import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { prisma } from "../../lib/prisma";
import { uploadToR2, downloadFromR2 } from "../../lib/storage";
import { sendNoticeViaGmail } from "../gmail/gmail.service";
import { bulkSendQueue } from "../../lib/queue";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function normalizeKey(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function todayFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

// ─────────────────────────────────────────────
// Extract {{placeholders}} from docx buffer
// ─────────────────────────────────────────────

function extractPlaceholders(buffer: Buffer): string[] {
  const zip = new PizZip(buffer);
  const xml = zip.files["word/document.xml"]?.asText() || "";
  const stripped = xml.replace(/<[^>]+>/g, "");
  const matches = Array.from(stripped.matchAll(/\{\{([^{}]+)\}\}/g));
  return Array.from(new Set(matches.map((m) => m[1].trim()))).filter(Boolean);
}

// ─────────────────────────────────────────────
// Build data map from Excel data only
// Raw key and normalized key both stored so
// {{MOBILE NO}} and {{MOBILE_NO}} both work
// ─────────────────────────────────────────────

function buildDataMap(clientData: Record<string, unknown>): Record<string, string> {
  const data: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(clientData)) {
    const cleanKey = rawKey.trim();
    const normalizedKey = normalizeKey(cleanKey);
    const value = str(rawValue);
    data[cleanKey] = value;
    data[normalizedKey] = value;
  }

  // Only hardcode what can never come from Excel
  data["NOTICE_DATE"] = todayFormatted();
  data["NOTICE DATE"] = todayFormatted();

  return data;
}

// ─────────────────────────────────────────────
// Check which template placeholders have no
// matching data in the Excel
// ─────────────────────────────────────────────

function getMissingFields(
  placeholders: string[],
  data: Record<string, string>
): string[] {
  return placeholders.filter((ph) => {
    const normalized = normalizeKey(ph);
    const hasValue =
      (data[ph] !== undefined && data[ph] !== "") ||
      (data[normalized] !== undefined && data[normalized] !== "");
    return !hasValue;
  });
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
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } });
  if (!client) throw new Error("Client not found");

  // 2. Find template
  const template = await prisma.noticeTemplate.findFirst({ where: { tenantId, noticeType } });
  if (!template) {
    throw new Error(`Template not found for "${noticeType}". Upload a .docx template first.`);
  }

  // 3. Download template from R2
  let templateBuffer: Buffer;
  try {
    templateBuffer = await downloadFromR2(template.fileUrl);
  } catch {
    throw new Error("Template file missing in storage. Please re-upload the template.");
  }

  // 4. Extract placeholders from template
  const placeholders = extractPlaceholders(templateBuffer);

  // 5. Build data map from Excel data
  const clientData = client.data as Record<string, unknown>;
  const data = buildDataMap(clientData);

  // 6. Warn about missing fields — don't block, fill with empty string
  const missingFields = getMissingFields(placeholders, data);
  if (missingFields.length > 0) {
    console.warn(
      `[Notice] Client "${client.name}" missing data for: ${missingFields.join(", ")}`
    );
  }

  // 7. Render docx
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter() { return ""; },
  });

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

  // 8. Upload to R2
  const buffer = doc.getZip().generate({ type: "nodebuffer" });
  const key = `notices/${tenantId}/${clientId}-${Date.now()}.docx`;
  await uploadToR2(key, buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  // 9. Save to DB
  const notice = await prisma.notice.create({
    data: {
      tenantId,
      clientId,
      templateId: template.id,
      fileUrl: key,
      status: "GENERATED",
    },
  });

  return { ...notice, missingFields };
}

// ─────────────────────────────────────────────
// Validate template placeholders vs Excel data
// Call before bulk send to warn user upfront
// ─────────────────────────────────────────────

export async function validateTemplateVsExcel(
  tenantId: string,
  noticeType: string
) {
  const template = await prisma.noticeTemplate.findFirst({ where: { tenantId, noticeType } });
  if (!template) throw new Error(`Template not found for "${noticeType}"`);

  const templateBuffer = await downloadFromR2(template.fileUrl);
  const placeholders = extractPlaceholders(templateBuffer);

  const client = await prisma.client.findFirst({ where: { tenantId } });
  if (!client) throw new Error("No clients found. Upload an Excel file first.");

  const clientData = client.data as Record<string, unknown>;
  const data = buildDataMap(clientData);
  const missingFields = getMissingFields(placeholders, data);
  const availableFields = Object.keys(clientData);

  return {
    placeholders,
    availableFields,
    missingFields,
    isValid: missingFields.length === 0,
  };
}

// ─────────────────────────────────────────────
// Bulk generate (no send)
// ─────────────────────────────────────────────

export async function generateBulkNotices(tenantId: string, noticeType: string) {
  const clients = await prisma.client.findMany({ where: { tenantId } });
  if (clients.length === 0) throw new Error("No clients found. Upload an Excel file first.");

  const results: {
    clientId: string;
    name: string;
    status: "success" | "error";
    noticeId?: string;
    missingFields?: string[];
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
        missingFields: notice.missingFields,
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

// ─────────────────────────────────────────────
// Generate + Send all (fire and forget safe)
// ─────────────────────────────────────────────

export async function generateAndSendAll(
  tenantId: string,
  noticeType: string,
  batchId?: string
) {
  const clients = await prisma.client.findMany({
    where: { tenantId, ...(batchId ? { batchId } : {}) },
  });

  if (clients.length === 0) throw new Error("No clients found. Upload an Excel file first.");

  const template = await prisma.noticeTemplate.findFirst({ where: { tenantId, noticeType } });
  if (!template) throw new Error(`No template found for "${noticeType}". Upload a template first.`);

  const gmailAccount = await prisma.gmailAccount.findUnique({ where: { tenantId } });
  if (!gmailAccount) throw new Error("Gmail not connected. Go to Settings and connect your Gmail first.");

  const results: {
    clientId: string;
    name: string;
    email: string | null;
    status: "success" | "skipped" | "error";
    missingFields?: string[];
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await sendNoticeViaGmail(tenantId, notice.id);
      results.push({
        clientId: client.id,
        name: client.name,
        email: client.email,
        status: "success",
        noticeId: notice.id,
        missingFields: notice.missingFields,
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