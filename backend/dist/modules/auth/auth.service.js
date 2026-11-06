"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../lib/prisma");
const SALT_ROUNDS = 10;
function signToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error("JWT_SECRET not configured");
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: "7d" });
}
async function signup(input) {
    const existing = await prisma_1.prisma.user.findFirst({ where: { email: input.email } });
    if (existing) {
        throw new Error("Email already registered");
    }
    const passwordHash = await bcrypt_1.default.hash(input.password, SALT_ROUNDS);
    const result = await prisma_1.prismaBase.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
            data: { name: input.tenantName },
        });
        const user = await tx.user.create({
            data: {
                tenantId: tenant.id,
                email: input.email,
                passwordHash,
                role: "ADVOCATE",
            },
        });
        return { tenant, user };
    });
    const token = signToken({
        userId: result.user.id,
        tenantId: result.tenant.id,
        role: result.user.role,
    });
    return { token, user: result.user, tenant: result.tenant };
}
async function login(input) {
    const user = await prisma_1.prisma.user.findFirst({ where: { email: input.email } });
    if (!user) {
        throw new Error("Invalid email or password");
    }
    const valid = await bcrypt_1.default.compare(input.password, user.passwordHash);
    if (!valid) {
        throw new Error("Invalid email or password");
    }
    const token = signToken({
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
    });
    return { token, user };
}
