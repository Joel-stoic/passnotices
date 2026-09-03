import { Request, Response, NextFunction } from "express";
import { getTenantPrisma } from "../lib/prisma";

// Extend Express Request to carry a tenant-scoped Prisma client
declare global {
  namespace Express {
    interface Request {
      db?: ReturnType<typeof getTenantPrisma>;
    }
  }
}

/**
 * Must run AFTER authMiddleware — relies on req.auth.tenantId
 * being set. Attaches req.db, a Prisma client that auto-scopes
 * every query to the authenticated user's tenant.
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.tenantId) {
    return res.status(401).json({ error: "Tenant context missing — authenticate first" });
  }

  req.db = getTenantPrisma(req.auth.tenantId);
  next();
}