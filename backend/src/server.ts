import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRouter from "./modules/auth/auth.routes";
import clientsRouter from "./modules/clients/clients.routes";
import excelRouter from "./modules/excel/excel.routes";
import templateRouter from "./modules/templates/templates.routes";
import noticeRouter from "./modules/notices/notices.routes";
import gmailRouter from "./modules/gmail/gmail.routes"; 

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve generated notice files for download
// (download route also handles auth — this is just static fallback)
app.use("/uploads", express.static("uploads"));

// API routes
app.use("/api/auth", authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/excel", excelRouter);
app.use("/api/templates", templateRouter);
app.use("/api/notices", noticeRouter);
app.use("/api/gmail", gmailRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});