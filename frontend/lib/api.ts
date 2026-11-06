const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
}

export interface AuthTenant {
  id: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface SignupResponse {
  token: string;
  user: AuthUser;
  tenant: AuthTenant;
}

export interface ApiError {
  error: string | { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem("passnotice_token", token);
  localStorage.setItem("passnotice_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("passnotice_token");
  localStorage.removeItem("passnotice_user");
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("passnotice_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("passnotice_token")
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ApiErrorPayload {
  error?: string | {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
  };
}

/**
 * Safely parse JSON responses without throwing "Unexpected token '<'..."
 * if an HTML error page (e.g. 404, 502) is returned.
 */
async function parseApiResponse<T>(res: Response, fallbackError: string): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  let data: unknown = null;

  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    let errMsg = fallbackError;
    const errObj = data as ApiErrorPayload | null;
    if (typeof errObj?.error === "string") {
      errMsg = errObj.error;
    } else if (typeof errObj?.error === "object" && errObj.error !== null) {
      if (errObj.error.formErrors?.[0]) {
        errMsg = errObj.error.formErrors[0];
      } else if (errObj.error.fieldErrors) {
        errMsg = Object.values(errObj.error.fieldErrors).flat().join(". ");
      }
    } else {
      let urlPath = "";
      try {
        urlPath = new URL(res.url).pathname;
      } catch {
        urlPath = res.url;
      }
      errMsg = `${fallbackError} (${res.status} from ${urlPath})`;
    }
    throw new Error(errMsg);
  }

  return (data !== null ? data : {}) as T;
}

// ─── Auth API calls ───────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseApiResponse<LoginResponse>(res, "Login failed");
}

export async function apiSignup(
  tenantName: string,
  email: string,
  password: string
): Promise<SignupResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantName, email, password }),
  });
  return parseApiResponse<SignupResponse>(res, "Signup failed");
}

// ─── Clients API ──────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  batch?: {
    id: string;
    name: string;
  };
  notices?: GeneratedNotice[];
}

export interface Batch {
  id: string;
  name: string;
  createdAt: string;
  _count: { clients: number };
}

export async function apiGetClients(batchId?: string): Promise<Client[]> {
  const url = batchId
    ? `${BASE_URL}/api/clients?batchId=${encodeURIComponent(batchId)}`
    : `${BASE_URL}/api/clients`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await parseApiResponse<{ clients: Client[] }>(res, "Failed to fetch clients");
  return data.clients ?? [];
}

export async function apiGetBatches(): Promise<Batch[]> {
  const res = await fetch(`${BASE_URL}/api/clients/batches`, {
    headers: authHeaders(),
  });
  const data = await parseApiResponse<{ batches: Batch[] }>(res, "Failed to fetch batches");
  return data.batches ?? [];
}

export async function apiDeleteBatch(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/clients/batches/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await parseApiResponse(res, "Failed to delete batch");
}

export async function apiGetClient(id: string): Promise<Client> {
  const res = await fetch(`${BASE_URL}/api/clients/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  });
  const data = await parseApiResponse<{ client: Client }>(res, "Failed to fetch client");
  return data.client;
}

export async function apiDeleteClient(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/clients/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  await parseApiResponse(res, "Failed to delete client");
}

// ─── Notices API ──────────────────────────────────────────────────────────────

export interface GeneratedNotice {
  id: string;
  tenantId: string;
  clientId: string;
  templateId: string;
  fileUrl: string;
  status: string;
  emailStatus: string;
  whatsappStatus: string;
  createdAt: string;
  template?: {
    noticeType: string;
  };
}

export async function apiGenerateNotice(
  clientId: string,
  noticeType: string
): Promise<GeneratedNotice> {
  const res = await fetch(`${BASE_URL}/api/notices/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ clientId, noticeType }),
  });
  const data = await parseApiResponse<{ notice: GeneratedNotice }>(res, "Notice generation failed");
  return data.notice;
}

export async function apiGenerateAndSendAll(
  noticeType: string,
  batchId: string
): Promise<{
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: { name: string; email: string | null; status: string; reason?: string }[];
}> {
  const res = await fetch(`${BASE_URL}/api/notices/generate-and-send-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ noticeType, batchId }),
  });
  return parseApiResponse(res, "Bulk send failed");
}

// ─── Gmail API ────────────────────────────────────────────────────────────────

export async function apiGetGmailStatus(): Promise<{ connected: boolean; emailAddress?: string }> {
  const res = await fetch(`${BASE_URL}/api/gmail/status`, {
    headers: { ...authHeaders() },
  });
  return parseApiResponse(res, "Failed to get Gmail status");
}

export async function apiGetGmailConnectUrl(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/gmail/connect`, {
    headers: { ...authHeaders() },
  });
  const data = await parseApiResponse<{ url: string }>(res, "Failed to get connect URL");
  return data.url;
}

export async function apiSendNoticeViaGmail(noticeId: string): Promise<{ success: boolean; sentTo: string }> {
  const res = await fetch(`${BASE_URL}/api/gmail/send/${encodeURIComponent(noticeId)}`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return parseApiResponse(res, "Failed to send email");
}

export async function apiDisconnectGmail(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/gmail/disconnect`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  await parseApiResponse(res, "Failed to disconnect Gmail");
}

// ─── Templates API ────────────────────────────────────────────────────────────

export interface Template {
  id: string;
  tenantId: string;
  noticeType: string;
  fileUrl: string;
  createdAt: string;
}

export interface TemplatePreview {
  id: string;
  noticeType: string;
  fileUrl: string;
  createdAt: string;
  text: string;
  placeholders: string[];
}

export async function apiGetTemplates(): Promise<Template[]> {
  const res = await fetch(`${BASE_URL}/api/templates`, {
    headers: { ...authHeaders() },
  });
  const data = await parseApiResponse<{ templates: Template[] }>(res, "Failed to fetch templates");
  return data.templates ?? [];
}

export async function apiGetTemplatePreview(id: string): Promise<TemplatePreview> {
  const encId = encodeURIComponent(id);
  let res = await fetch(`${BASE_URL}/api/templates/${encId}/preview`, {
    headers: { ...authHeaders() },
  });

  if (res.status === 404) {
    const altRes = await fetch(`${BASE_URL}/api/templates/preview/${encId}`, {
      headers: { ...authHeaders() },
    });
    if (altRes.ok) {
      res = altRes;
    }
  }

  return parseApiResponse<TemplatePreview>(res, "Failed to load template preview");
}

export async function apiDownloadTemplate(id: string, filename: string): Promise<void> {
  const encId = encodeURIComponent(id);
  let res = await fetch(`${BASE_URL}/api/templates/${encId}/download`, {
    headers: { ...authHeaders() },
  });

  if (res.status === 404) {
    const altRes = await fetch(`${BASE_URL}/api/templates/download/${encId}`, {
      headers: { ...authHeaders() },
    });
    if (altRes.ok) {
      res = altRes;
    }
  }

  if (!res.ok) {
    await parseApiResponse(res, "Failed to download template");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function apiDeleteTemplate(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  await parseApiResponse(res, "Failed to delete template");
}
