export const queryKeys = {
  batches: ["batches"] as const,
  clients: (batchId: string) => ["clients", batchId] as const,
  templates: ["templates"] as const,
  gmail: ["gmail"] as const,
};