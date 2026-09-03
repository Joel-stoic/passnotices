import { z } from "zod";

export const templateUploadSchema = z.object({
  noticeType: z.string().min(1, "Notice type is required"),
});