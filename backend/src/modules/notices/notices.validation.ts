import { z } from "zod";

export const generateNoticeSchema = z.object({
  clientId: z.string().min(1),
  noticeType: z.string().min(1),
});

export const generateBulkSchema = z.object({
  noticeType: z.string().min(1),
  batchId: z.string().optional(),
});