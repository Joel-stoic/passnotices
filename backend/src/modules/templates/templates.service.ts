import fs from "fs";
import { prisma } from "../../lib/prisma";
import { uploadToR2, deleteFromR2 } from "../../lib/storage";

export async function createTemplate(
  tenantId: string,
  noticeType: string,
  file: Express.Multer.File
) {
  const existing = await prisma.noticeTemplate.findUnique({
    where: { tenantId_noticeType: { tenantId, noticeType } },
  });

  if (existing) {
    throw new Error(`Template already exists for ${noticeType}. Delete it first to replace.`);
  }

  // Read file buffer from disk (multer saved it temporarily)
  const buffer = fs.readFileSync(file.path);

  // Upload to R2
  const key = `templates/${tenantId}/${noticeType}-${Date.now()}.docx`;
  await uploadToR2(key, buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  // Clean up temp file
  fs.unlinkSync(file.path);

  // Save R2 key as fileUrl in DB
  const template = await prisma.noticeTemplate.create({
    data: {
      tenantId,
      noticeType,
      fileUrl: key, // R2 key, not a local path
      fields: [],
    },
  });

  return template;
}

export async function deleteTemplate(tenantId: string, templateId: string) {
  const template = await prisma.noticeTemplate.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!template) throw new Error("Template not found");

  // Delete from R2
  await deleteFromR2(template.fileUrl);

  // Delete from DB
  await prisma.noticeTemplate.delete({ where: { id: template.id } });
}