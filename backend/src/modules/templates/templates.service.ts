import { prisma } from "../../lib/prisma";
import { uploadToR2, deleteFromR2 } from "../../lib/storage";

export async function createTemplate(
  tenantId: string,
  noticeType: string,
  file: Express.Multer.File
) {
  // With memoryStorage, file.buffer contains the file — no disk read needed
  const buffer = file.buffer;
  if (!buffer || buffer.length === 0) {
    throw new Error("File buffer is empty. Upload failed.");
  }

  // Upload to R2
  const key = `templates/${tenantId}/${noticeType}-${Date.now()}.docx`;
  await uploadToR2(
    key,
    buffer,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  // If template already exists for this notice type — replace it
  const existing = await prisma.noticeTemplate.findUnique({
    where: { tenantId_noticeType: { tenantId, noticeType } },
  });

  if (existing) {
    // Try to delete old file from R2 (ignore error if it was a local path)
    try { await deleteFromR2(existing.fileUrl); } catch {}

    const updated = await prisma.noticeTemplate.update({
      where: { id: existing.id },
      data: { fileUrl: key },
    });
    return updated;
  }

  const template = await prisma.noticeTemplate.create({
    data: {
      tenantId,
      noticeType,
      fileUrl: key,
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

  // Try to delete from R2 — ignore error if file was on local disk (old data)
  try { await deleteFromR2(template.fileUrl); } catch {}

  await prisma.noticeTemplate.delete({ where: { id: template.id } });
}