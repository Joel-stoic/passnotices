"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const token = header.split(" ")[1];
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET not configured");
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Attach decoded auth context (includes tenantId) to the request
        req.auth = {
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            role: decoded.role,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
