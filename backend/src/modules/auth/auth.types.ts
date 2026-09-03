export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: "ADVOCATE" | "STAFF";
}