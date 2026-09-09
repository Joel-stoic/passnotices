"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Trash2,
  Eye,
  X,
  Loader2,
  AlertCircle,
  Users,
  RefreshCw,
  ChevronRight,
  FileDown,
  CheckCircle2,
  Mail,
  ChevronLeft,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { BulkSendAll } from "@/components/bulk-send-all";
import {
  apiGetClients,
  apiGetClient,
  apiDeleteClient,
  apiGenerateNotice,
  apiSendNoticeViaGmail,
  apiGetGmailStatus,
  type Client,
  type GeneratedNotice,
} from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PAGE_SIZE = 10;

const NOTICE_TYPES = [
  { value: "SECTION_25", label: "Section 25 — Contract Act" },
  { value: "SECTION_138", label: "Section 138 — NI Act (Cheque Bounce)" },
  { value: "MONEY_RECOVERY", label: "Money Recovery Notice" },
  { value: "DEMAND_NOTICE", label: "General Demand Notice" },
  { value: "LEGAL_NOTICE", label: "General Legal Notice" },
] as const;

type NoticeTypeValue = typeof NOTICE_TYPES[number]["value"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function ClientDrawer({
  clientId,
  onClose,
  onDeleted,
}: {
  clientId: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [noticeType, setNoticeType] = useState<NoticeTypeValue>("SECTION_25");
  const [generating, setGenerating] = useState(false);
  const [noticeError, setNoticeError] = useState("");
  const [generatedNotice, setGeneratedNotice] = useState<GeneratedNotice | null>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  const [gmailEmail, setGmailEmail] = useState<string | null>(null);

  useEffect(() => {
    apiGetGmailStatus()
      .then((res) => {
        if (res.connected && res.emailAddress) {
          setGmailEmail(res.emailAddress);
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerateNotice = async () => {
    if (!client) return;
    setGenerating(true);
    setNoticeError("");
    setGeneratedNotice(null);
    setSendError("");
    setSendSuccess("");
    try {
      const notice = await apiGenerateNotice(client.id, noticeType);
      setGeneratedNotice(notice);
    } catch (e: unknown) {
      setNoticeError(e instanceof Error ? e.message : "Notice generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendViaGmail = async () => {
    if (!generatedNotice) return;
    setSending(true);
    setSendError("");
    setSendSuccess("");
    try {
      await apiSendNoticeViaGmail(generatedNotice.id);
      setSendSuccess("Sent successfully via Gmail");
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    apiGetClient(clientId)
      .then(setClient)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await apiDeleteClient(clientId);
      onDeleted(clientId);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />

      <aside className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-background border-l border-border flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-xl text-foreground">Client Details</h2>
          <button onClick={onClose} className="text-secondary hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-error bg-error/5 border border-error/30 p-4 rounded-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : client ? (
            <>
              {/* Info section */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Name</p>
                  <p className="text-foreground">{client.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Email</p>
                  <p className="text-foreground">{client.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Mobile</p>
                  <p className="text-foreground">{client.mobile || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Address</p>
                  <p className="text-foreground">{client.address || "—"}</p>
                </div>
              </div>

              {/* Generate Notice */}
              <div className="pt-6 border-t border-border">
                <h3 className="font-semibold text-foreground text-sm mb-4">Generate Notice</h3>
                <div className="space-y-3">
                  <select
                    value={noticeType}
                    onChange={(e) => setNoticeType(e.target.value as NoticeTypeValue)}
                    className="w-full bg-background border border-border text-foreground text-sm rounded-sm px-3 py-2 outline-none focus:border-accent transition-colors"
                  >
                    {NOTICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleGenerateNotice}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 bg-accent text-white px-4 py-2 rounded-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    {generating ? "Generating..." : "Generate Notice"}
                  </button>

                  {noticeError && (
                    <div className="text-error bg-error/5 border border-error/30 p-3 rounded-sm flex items-start gap-2 text-sm mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{noticeError}</p>
                    </div>
                  )}

                  {generatedNotice && (
                    <div className="mt-4 p-4 border border-success/30 bg-success/5 rounded-sm space-y-4">
                      <div className="flex items-start gap-2 text-success">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Notice generated successfully</p>
                          <a
                            href={`${BASE_URL}${generatedNotice.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline hover:text-success/80 mt-1 inline-block"
                          >
                            Download Notice
                          </a>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-success/20">
                        <p className="text-xs font-medium text-foreground mb-2">
                          Send via Gmail {gmailEmail && <span className="text-secondary font-normal">(from {gmailEmail})</span>}
                        </p>
                        <button
                          onClick={handleSendViaGmail}
                          disabled={sending || !gmailEmail}
                          className="w-full flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2 rounded-sm font-medium hover:bg-[#F8F8F6] dark:hover:bg-[#111111] transition-colors disabled:opacity-50"
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                          {sending ? "Sending..." : "Send via Gmail"}
                        </button>
                        {!gmailEmail && (
                          <p className="text-xs text-error mt-2">Gmail not connected. Please connect in Settings.</p>
                        )}
                        {sendError && (
                          <p className="text-xs text-error mt-2">{sendError}</p>
                        )}
                        {sendSuccess && (
                          <p className="text-xs text-success mt-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {sendSuccess}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {client && (
          <div className="px-6 py-4 border-t border-border bg-background">
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-sm text-error font-medium">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 text-sm font-semibold bg-error text-white px-4 py-2 rounded-sm hover:bg-error/90 transition-colors duration-150 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-sm font-medium text-secondary border border-border px-4 py-2 rounded-sm hover:text-foreground transition-colors duration-150"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 text-sm font-medium text-error border border-error/30 px-4 py-2 rounded-sm hover:bg-error/5 transition-colors duration-150"
              >
                <Trash2 className="w-4 h-4" />
                Delete Client
              </button>
            )}
          </div>
        )}
      </aside>       
    </>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchClients = () => {
    setLoading(true);
    setError("");
    apiGetClients()
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.mobile?.includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDeleted = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <DashboardLayout activeNav="clients">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-1">Clients</h1>
          <p className="text-sm text-secondary">
            {loading ? "Loading…" : `${clients.length} client${clients.length !== 1 ? "s" : ""} in your account`}
          </p>
        </div>
        <button
          onClick={fetchClients}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 text-sm font-medium text-secondary border border-border px-4 py-2 rounded-sm hover:text-foreground hover:border-accent/40 transition-colors duration-150 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mb-6"><BulkSendAll /></div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, email, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-background text-foreground border border-border rounded-sm text-sm outline-none focus:border-accent transition-colors duration-150 placeholder:text-secondary/60"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-error border border-error/30 bg-error/5 px-4 py-3 rounded-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="border border-border rounded-sm overflow-hidden">
        {loading && (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-sm bg-border/40 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-border/40 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-border/30 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 flex items-center justify-center bg-[#EEF2F7] dark:bg-[#1A2535] rounded-sm mb-4">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <p className="font-semibold text-foreground text-sm mb-1">
              {search ? "No clients match your search" : "No clients yet"}
            </p>
            <p className="text-xs text-secondary">
              {search ? "Try a different name, email or mobile number" : "Upload an Excel file to import clients"}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F8F8F6] dark:bg-[#111111] border-b border-border">
                  {["Name", "Mobile", "Email", "Address", "Created", ""].map((col) => (
                    <th key={col} className="px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((client, i) => (
                  <tr
                    key={client.id}
                    className={`group ${i % 2 === 0 ? "bg-white dark:bg-[#0A0A0A]" : "bg-[#FAFAFA] dark:bg-[#111111]"} hover:bg-[#F8F8F6] dark:hover:bg-[#111111] transition-colors duration-100`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-sm bg-[#EEF2F7] dark:bg-[#1A2535] flex items-center justify-center text-[11px] font-semibold text-accent shrink-0 select-none">
                          {initials(client.name)}
                        </div>
                        <span className="font-medium text-foreground whitespace-nowrap">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-secondary whitespace-nowrap font-mono text-xs">
                      {client.mobile ?? <span className="italic text-secondary/50">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-secondary max-w-[180px] truncate">
                      {client.email ?? <span className="italic text-secondary/50">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-secondary max-w-[160px] truncate">
                      {client.address ?? <span className="italic text-secondary/50">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-secondary whitespace-nowrap text-xs">
                      {formatDate(client.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => setSelectedId(client.id)}
                          className="flex items-center gap-1 text-xs font-medium text-accent dark:text-foreground border border-border px-2.5 py-1.5 rounded-sm hover:border-accent/40 transition-colors duration-150"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => setSelectedId(client.id)}
                          className="flex items-center gap-1 text-xs font-medium text-secondary border border-border px-2 py-1.5 rounded-sm hover:text-error hover:border-error/30 transition-colors duration-150"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button onClick={() => setSelectedId(client.id)} className="sm:hidden text-secondary">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-[#F8F8F6] dark:bg-[#111111] flex items-center justify-between gap-4">
            <p className="text-xs text-secondary">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} client{filtered.length !== 1 ? "s" : ""}
              {search && ` matching "${search}"`}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center w-7 h-7 rounded-sm border border-border text-secondary hover:text-foreground hover:border-accent/40 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex items-center justify-center w-7 h-7 rounded-sm border text-xs font-medium transition-colors duration-150 ${
                      p === page
                        ? "border-accent bg-accent text-white"
                        : "border-border text-secondary hover:text-foreground hover:border-accent/40"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center justify-center w-7 h-7 rounded-sm border border-border text-secondary hover:text-foreground hover:border-accent/40 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedId && (
        <ClientDrawer
          clientId={selectedId}
          onClose={() => setSelectedId(null)}
          onDeleted={handleDeleted}
        />
      )}
    </DashboardLayout>
  );
}