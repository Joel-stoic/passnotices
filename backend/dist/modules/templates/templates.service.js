"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplate = createTemplate;
exports.deleteTemplate = deleteTemplate;
const prisma_1 = require("../../lib/prisma");
const storage_1 = require("../../lib/storage");
async function createTemplate(tenantId, noticeType, file) {
    // With memoryStorage, file.buffer contains the file — no disk read needed
    const buffer = file.buffer;
    if (!buffer || buffer.length === 0) {
        throw new Error("File buffer is empty. Upload failed.");
    }
    // Upload to R2
    const key = `templates/${tenantId}/${noticeType}-${Date.now()}.docx`;
    await (0, storage_1.uploadToR2)(key, buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    // If template already exists for this notice type — replace it
    const existing = await prisma_1.prisma.noticeTemplate.findUnique({
        where: { tenantId_noticeType: { tenantId, noticeType } },
    });
    if (existing) {
        // Try to delete old file from R2 (ignore error if it was a local path)
        try {
            await (0, storage_1.deleteFromR2)(existing.fileUrl);
        }
        catch { }
        const updated = await prisma_1.prisma.noticeTemplate.update({
            where: { id: existing.id },
            data: { fileUrl: key },
        });
        return updated;
    }
    const template = await prisma_1.prisma.noticeTemplate.create({
        data: {
            tenantId,
            noticeType,
            fileUrl: key,
            fields: [],
        },
    });
    return template;
}
async function deleteTemplate(tenantId, templateId) {
    const template = await prisma_1.prisma.noticeTemplate.findFirst({
        where: { id: templateId, tenantId },
    });
    if (!template)
        throw new Error("Template not found");
    // Try to delete from R2 — ignore error if file was on local disk (old data)
    try {
        await (0, storage_1.deleteFromR2)(template.fileUrl);
    }
    catch { }
    await prisma_1.prisma.noticeTemplate.delete({ where: { id: template.id } });
}
