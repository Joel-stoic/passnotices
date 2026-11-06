"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateUploadSchema = void 0;
const zod_1 = require("zod");
exports.templateUploadSchema = zod_1.z.object({
    noticeType: zod_1.z.string().min(1, "Notice type is required"),
});
