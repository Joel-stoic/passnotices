"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importExcelBuffer = importExcelBuffer;
const xlsx_1 = __importDefault(require("xlsx"));
const prisma_1 = require("../../lib/prisma");
const excel_validation_1 = require("./excel.validation");
async function importExcelBuffer(buffer, tenantId, batchName) {
    // Parse Excel from buffer — no disk read needed
    const workbook = xlsx_1.default.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx_1.default.utils.sheet_to_json(worksheet, {
        defval: "",
    });
    if (rows.length === 0) {
        throw new Error("Excel file contains no data");
    }
    // Validate required columns
    const columns = Object.keys(rows[0]);
    const { valid, missing } = (0, excel_validation_1.validateExcelColumns)(columns);
    if (!valid) {
        throw new Error(`Missing required columns: ${missing.join(", ")}. ` +
            `Make sure your Excel file has these columns: ${excel_validation_1.REQUIRED_COLUMNS.join(", ")}`);
    }
    // Create batch
    const batch = await prisma_1.prisma.batch.create({
        data: { tenantId, name: batchName },
    });
    const clients = [];
    for (const row of rows) {
        const name = String(row["NAME"] || "").trim();
        if (!name)
            continue;
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
        const client = await prisma_1.prisma.client.create({
            data: {
                tenantId,
                batchId: batch.id,
                name,
                mobile,
                email,
                address,
                data: JSON.parse(JSON.stringify(row)),
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
