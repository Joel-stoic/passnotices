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

export const bulkSendQueue = new Queue("bulk-send", {
  connection: redisConnection,
});

export const bulkSendWorker = new Worker(
  "bulk-send",
  async (job: Job) => {
    const { jobId } = job.data;
    await runBulkJob(jobId);
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

bulkSendWorker.on("completed", (job) => {
  console.log(`[Queue] Job ${job.id} completed`);
});

bulkSendWorker.on("failed", (job, err) => {
  console.error(`[Queue] Job ${job?.id} failed:`, err.message);
});