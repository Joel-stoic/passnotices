"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = tenantMiddleware;
const prisma_1 = require("../lib/prisma");
/**
 * Must run AFTER authMiddleware — relies on req.auth.tenantId
 * being set. Attaches req.db, a Prisma client that auto-scopes
 * every query to the authenticated user's tenant.
 */
function tenantMiddleware(req, res, next) {
    if (!req.auth?.tenantId) {
        return res.status(401).json({ error: "Tenant context missing — authenticate first" });
    }
    req.db = (0, prisma_1.getTenantPrisma)(req.auth.tenantId);
    next();
}
