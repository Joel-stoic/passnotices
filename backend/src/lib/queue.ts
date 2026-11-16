import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { runBulkJob } from "../modules/notices/notices.service";

const redisUrl = process.env.UPSTASH_REDIS_URL;
if (!redisUrl) throw new Error("UPSTASH_REDIS_URL is not set");

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: { rejectUnauthorized: false },
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 500, 5000),
});

redisConnection.on("connect", () => console.log("[Redis] Connected"));
redisConnection.on("ready", () => console.log("[Redis] Ready"));
redisConnection.on("error", (err) => console.error("[Redis] Error:", err.message));
redisConnection.on("close", () => console.log("[Redis] Connection closed"));
redisConnection.on("reconnecting", () => console.log("[Redis] Reconnecting..."));

export const bulkSendQueue = new Queue("bulk-send", {
  connection: redisConnection,
});

export const bulkSendWorker = new Worker(
  "bulk-send",
  async (job: Job) => {
    console.log(`[Worker] Processing job ${job.id}, data:`, job.data);
    const { jobId } = job.data;
    await runBulkJob(jobId);
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

bulkSendWorker.on("ready", () => console.log("[Worker] Ready and listening"));
bulkSendWorker.on("active", (job) => console.log(`[Worker] Job ${job.id} started`));
bulkSendWorker.on("completed", (job) => console.log(`[Worker] Job ${job.id} completed`));
bulkSendWorker.on("failed", (job, err) => console.error(`[Worker] Job ${job?.id} failed:`, err.message));
bulkSendWorker.on("error", (err) => console.error("[Worker] Error:", err.message));