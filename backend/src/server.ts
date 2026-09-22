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

// API routes
app.use("/api/auth", authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/excel", excelRouter);
app.use("/api/templates", templateRouter);
app.use("/api/notices", noticeRouter);
app.use("/api/gmail", gmailRouter);

// Global error handler — never expose internals to client
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});