import { Router } from "express";
import multer from "multer";
import fs from "fs";

import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { importExcelFile } from "./excel.service";

const router = Router();

const upload = multer({
  dest: "uploads/excel/",
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  "/upload",
  authMiddleware,
  tenantMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Excel file is required" });
      }

      // batchName from form field — fallback to filename + date
      const batchName =
        (req.body.batchName as string)?.trim() ||
        `${req.file.originalname} — ${new Date().toLocaleDateString("en-IN")}`;

      const result = await importExcelFile(
        req.file.path,
        req.auth!.tenantId,
        batchName
      );

      fs.unlinkSync(req.file.path);

      return res.json({ success: true, ...result });
    } catch (error) {
      console.error("Excel import error:", error);
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to import Excel file",
      });
    }
  }
);

export default router;