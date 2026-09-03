import fs from "fs";
import path from "path";
import { prisma } from "../../lib/prisma";

export async function createTemplate(
  tenantId: string,
  noticeType: string,
  file: Express.Multer.File
) {
  const existing = await prisma.noticeTemplate.findUnique({
    where: {
      tenantId_noticeType: {
        tenantId,
        noticeType,
      },
    },
  });

  if (existing) {
    throw new Error(`Template already exists for ${noticeType}`);
  }

  const template = await prisma.noticeTemplate.create({
    data: {
      tenantId,
      noticeType,
      fileUrl: file.path,
      fields: [],
    },
  });

  return template;
}