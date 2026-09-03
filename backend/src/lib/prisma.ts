import { PrismaClient } from "@prisma/client";

// Singleton pattern — prevents multiple client instances during dev hot-reload
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Models that carry a tenantId column — every query against these
// gets tenantId auto-injected so a route can never accidentally
// read/write another tenant's data.
const TENANT_SCOPED_MODELS = new Set([
  "User",
  "NoticeTemplate",
  "Client",
  "Notice",
  "GmailAccount",
  "WhatsappAccount",
]);

/**
 * Returns a Prisma client scoped to a single tenant.
 * Every find/create/update/delete against a tenant-scoped model
 * automatically gets tenantId injected into its where/data clause.
 *
 * Usage: const db = getTenantPrisma(req.auth.tenantId);
 *        await db.client.findMany(); // tenantId filter applied automatically
 */
export function getTenantPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const readOps = ["findFirst", "findMany", "findUnique", "count", "aggregate", "groupBy"];
          const writeOps = ["create"];
          const updateOps = ["update", "updateMany", "delete", "deleteMany", "upsert"];

          const scopedArgs = args as any;

          if (readOps.includes(operation)) {
            scopedArgs.where = { ...(scopedArgs.where || {}), tenantId };
          } else if (writeOps.includes(operation)) {
            scopedArgs.data = { ...(scopedArgs.data || {}), tenantId };
          } else if (updateOps.includes(operation)) {
            scopedArgs.where = { ...(scopedArgs.where || {}), tenantId };
          }

          return query(scopedArgs);
        },
      },
    },
  });
}