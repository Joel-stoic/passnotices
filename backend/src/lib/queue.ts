import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { runBulkJob } from "../modules/notices/notices.service";

// ─────────────────────────────────────────────
// Redis connection
// ─────────────────────────────────────────────

export const redisConnection = new IORedis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
  tls: { rejectUnauthorized: false },
});

// ─────────────────────────────────────────────
// Queue
// ─────────────────────────────────────────────

export const bulkSendQueue = new Queue("bulk-send", {
  connection: redisConnection,
});

// ─────────────────────────────────────────────
// Worker — processes jobs from the queue
// ─────────────────────────────────────────────

export const bulkSendWorker = new Worker(
  "bulk-send",
  async (job: Job) => {
    const { jobId } = job.data;
    await runBulkJob(jobId);
  },
  {
    connection: redisConnection,
    concurrency: 1, // one job at a time per tenant
  }
);

bulkSendWorker.on("completed", (job) => {
  console.log(`[Queue] Job ${job.id} completed`);
});

bulkSendWorker.on("failed", (job, err) => {
  console.error(`[Queue] Job ${job?.id} failed:`, err.message);
});