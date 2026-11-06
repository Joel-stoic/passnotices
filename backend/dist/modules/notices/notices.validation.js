"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBulkSchema = exports.generateNoticeSchema = void 0;
const zod_1 = require("zod");
exports.generateNoticeSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1),
    noticeType: zod_1.z.string().min(1),
});
exports.generateBulkSchema = zod_1.z.object({
    noticeType: zod_1.z.string().min(1),
    batchId: zod_1.z.string().optional(),
});
