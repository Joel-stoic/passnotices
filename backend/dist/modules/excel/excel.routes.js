"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const excel_service_1 = require("./excel.service");
const router = (0, express_1.Router)();
// Memory storage — Excel is parsed in memory, never saved to disk or R2
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
router.post("/upload", auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Excel file is required" });
        }
        const batchName = req.body.batchName?.trim() ||
            `${req.file.originalname} — ${new Date().toLocaleDateString("en-IN")}`;
        const result = await (0, excel_service_1.importExcelBuffer)(req.file.buffer, req.auth.tenantId, batchName);
        return res.json({ success: true, ...result });
    }
    catch (error) {
        console.error("Excel import error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to import Excel file",
        });
    }
});
exports.default = router;
