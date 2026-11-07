import "dotenv/config";
import express from "express";
import cors from "cors";

import authRouter from "./modules/auth/auth.routes";
import clientsRouter from "./modules/clients/clients.routes";
import excelRouter from "./modules/excel/excel.routes";
import templateRouter from "./modules/templates/templates.routes";
import noticeRouter from "./modules/notices/notices.routes";
import gmailRouter from "./modules/gmail/gmail.routes";
import { prisma } from "./lib/prisma";
import "./lib/queue"; // starts the worker

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());

// API routes
app.use("/api/auth", authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/excel", excelRouter);
app.use("/api/templates", templateRouter);
app.use("/api/notices", noticeRouter);
app.use("/api/gmail", gmailRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "2.1.0",
    templatesApi: true,
  });
});

// 404 Catch-all
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, "0.0.0.0", async () => {
  // Recover stuck jobs on startup
  await prisma.bulkJob.updateMany({
    where: { status: "RUNNING" },
    data: { status: "FAILED", error: "Server restarted while job was running" },
  });
  console.log(`Server running on port ${PORT}`);
  console.log("Queue worker started");
});