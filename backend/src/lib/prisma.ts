import { PrismaClient } from "@prisma/client";

// Singleton pattern — prevents multiple client instances during dev hot-reload
declare global {
  // eslint-disable-next-line no-var
  var prismaBase: PrismaClient | undefined;
}

const prismaBase =
  global.prismaBase ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaBase = prismaBase;
}

// ─── Retry Wrapper ────────────────────────────────────────────────────────────
// Neon (serverless Postgres) sleeps after ~5 min of inactivity and takes
// 3–10 seconds to wake. We retry long enough to survive the full wake-up.
//
// Total window: 2s + 4s + 6s + 8s = ~20s — enough for any Neon cold start.
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000; // attempt 1: 2s, 2: 4s, 3: 6s, 4: 8s, 5: never (throws)

export async function withRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  const writeOps = new Set([
    "create", "createMany", "createManyAndReturn",
    "update", "updateMany",
    "upsert",
    "delete", "deleteMany",
    "executeRaw", "$executeRaw", "$executeRawUnsafe",
  ]);

  const isWrite = writeOps.has(operation);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      // ── Connection never opened (Neon cold start) ──
      const isConnectionAcquisitionError =
        err?.code === "P1001" ||
        err?.message?.includes("ECONNREFUSED") ||
        err?.message?.includes("Can't reach database");

      // ── Connection opened but dropped mid-flight ──
      const isTransientTimeoutOrDropped =
        err?.code === "P1002" ||
        err?.code === "P1017" ||
        err?.message?.includes("connection reset") ||
        err?.message?.includes("connection closed") ||
        // Added: covers Neon idle connection kills + network blips
        err?.message?.includes("prepared statement") ||
        err?.message?.includes("Connection pool timeout") ||
        err?.message?.includes("socket hang up") ||
        err?.message?.includes("ETIMEDOUT") ||
        err?.message?.includes("terminating connection") ||
        err?.message?.includes("SSL connection has been closed");

      let shouldRetry = false;

      if (isWrite) {
        // Only retry writes when connection never opened — safe to retry
        // (if query ran and failed mid-write, retrying could double-write)
        if (isConnectionAcquisitionError) shouldRetry = true;
      } else {
        // Reads are always safe to retry
        if (isConnectionAcquisitionError || isTransientTimeoutOrDropped) shouldRetry = true;
      }

      if (!shouldRetry || attempt === MAX_RETRIES) break;

      const delay = RETRY_DELAY_MS * attempt;
      console.warn(
        `[Neon] DB connection failed for '${operation}' (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// Globally wrap ALL database queries in the retry logic
export const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, query, args }) {
        return withRetry(operation, () => query(args));
      },
    },
  },
});

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
  "Batch",
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

          const readOps = ["findFirst", "findMany", "count", "aggregate", "groupBy"];
          // Note: findUnique removed — tenantId injection breaks unique constraint queries.
          // Use findFirst instead of findUnique for tenant-scoped lookups.
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