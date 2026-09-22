import { Router } from "express";
import multer from "multer";

import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { importExcelBuffer } from "./excel.service";

const router = Router();

// Memory storage — Excel is parsed in memory, never saved to disk or R2
const upload = multer({
  storage: multer.memoryStorage(),
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

      const batchName =
        (req.body.batchName as string)?.trim() ||
        `${req.file.originalname} — ${new Date().toLocaleDateString("en-IN")}`;

      const result = await importExcelBuffer(
        req.file.buffer,
        req.auth!.tenantId,
        batchName
      );

      return res.json({ success: true, ...result });
    } catch (error) {
      console.error("Excel import error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to import Excel file",
      });
    }
  }
);

export default router;