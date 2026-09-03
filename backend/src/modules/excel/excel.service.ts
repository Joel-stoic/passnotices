import XLSX from "xlsx";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export async function importExcelFile(
  filePath: string,
  tenantId: string,
  batchName: string
) {
  const workbook = XLSX.readFile(filePath);

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  if (rows.length === 0) {
    throw new Error("Excel file contains no data");
  }

  // Create a new batch for this upload
  const batch = await prisma.batch.create({
    data: {
      tenantId,
      name: batchName,
    },
  });

  const clients = [];

  for (const row of rows) {
    const name = String(row["NAME"] || "").trim();
    if (!name) continue;

    const mobile = row["MOBILE NO"] ? String(row["MOBILE NO"]).trim() : null;
    const email = row["EMAIL ID"] ? String(row["EMAIL ID"]).trim() : null;

    const addressParts = [
      row["MAIL ADDRESS1"],
      row["MAIL ADDRESS2"],
      row["MAIL ADDRESS3"],
    ]
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
      .map((v) => String(v).trim());

    const address = addressParts.length > 0 ? addressParts.join(", ") : null;

    // Always create new client under this batch — no dedup across batches
    const client = await prisma.client.create({
      data: {
        tenantId,
        batchId: batch.id,
        name,
        mobile,
        email,
        address,
        data: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
      },
    });

    clients.push(client);
  }

  return {
    batchId: batch.id,
    batchName: batch.name,
    sheetName,
    totalRows: rows.length,
    importedClients: clients.length,
    clients,
  };
}