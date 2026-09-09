const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

// ─── Auth API calls ───────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg =
      typeof data.error === "string"
        ? data.error
        : data.error?.formErrors?.[0] ?? "Login failed";
    throw new Error(errMsg);
  }

  return data as LoginResponse;
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

  const data = await res.json();

  if (!res.ok) {
    const errMsg =
      typeof data.error === "string"
        ? data.error
        : data.error?.formErrors?.[0] ??
          Object.values(data.error?.fieldErrors ?? {}).flat().join(". ") ??
          "Signup failed";
    throw new Error(errMsg);
  }

  return data as SignupResponse;
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
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("passnotice_token")
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGetClients(): Promise<Client[]> {
  const res = await fetch(`${BASE_URL}/api/clients`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch clients");
  return data.clients as Client[];
}

export async function apiGetClient(id: string): Promise<Client> {
  const res = await fetch(`${BASE_URL}/api/clients/${id}`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch client");
  return data.client as Client;
}

export async function apiDeleteClient(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/clients/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to delete client");
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

  const data = await res.json();

  if (!res.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : data.error?.formErrors?.[0] ??
          Object.values(data.error?.fieldErrors ?? {}).flat().join(". ") ??
          "Notice generation failed";
    throw new Error(msg);
  }

  return data.notice as GeneratedNotice;
}


// ─── Gmail API ────────────────────────────────────────────────────────────────

export async function apiGetGmailStatus(): Promise<{ connected: boolean; emailAddress?: string }> {
  const res = await fetch(`${BASE_URL}/api/gmail/status`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to get Gmail status");
  return data;
}

export async function apiGetGmailConnectUrl(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/gmail/connect`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to get connect URL");
  return data.url;
}

export async function apiSendNoticeViaGmail(noticeId: string): Promise<{ success: boolean; sentTo: string }> {
  const res = await fetch(`${BASE_URL}/api/gmail/send/${noticeId}`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to send email");
  return data;
}

export async function apiDisconnectGmail(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/gmail/disconnect`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to disconnect Gmail");
}