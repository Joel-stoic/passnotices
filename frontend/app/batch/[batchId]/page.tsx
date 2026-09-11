"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Search,
  Trash2,
  ChevronRight,
  FileDown,
  Mail,
  Phone,
  MapPin,
  FileText,
  X,
  XCircle,
  Clock
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  apiGetClients,
  apiGetBatches,
  apiDeleteClient,
  apiGenerateNotice,
  apiSendNoticeViaGmail,
  apiGetGmailStatus,
  apiGetGmailConnectUrl,
  apiDisconnectGmail,
  apiGenerateAndSendAll,
  type Client,
  type Batch,
  type GeneratedNotice,
} from "@/lib/api";
import { toast } from "sonner";

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

// ─── Status helpers ───────────────────────────────────────────────────────────

function NoticeStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    GENERATED: "bg-blue-500/10 text-blue-500",
    REVIEWED: "bg-green-500/10 text-green-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${map[status] || map.DRAFT}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function SendStatusIcon({ status }: { status: string }) {
  if (status === "SENT" || status === "DELIVERED")
    return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
  if (status === "FAILED")
    return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  if (status === "PENDING")
    return <Clock className="w-3.5 h-3.5 text-amber-500" />;
  return <span className="w-3.5 h-3.5 rounded-full border border-border inline-block" />;
}

// ─── Client Modal ──────────────────────────────────────────────────────────────

function ClientModal({
  client,
  gmailConnected,
  onClose,
  onNoticeGenerated,
}: {
  client: Client;
  gmailConnected: boolean;
  onClose: () => void;
  onNoticeGenerated: (clientId: string, notice: GeneratedNotice) => void;
}) {
  const [noticeType, setNoticeType] = useState<NoticeTypeValue>("SECTION_25");
  const [generating, setGenerating] = useState(false);
  const [noticeError, setNoticeError] = useState("");
  const [newNotice, setNewNotice] = useState<GeneratedNotice | null>(null);
  
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendSuccessId, setSendSuccessId] = useState<string | null>(null);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleGenerate = async () => {
    setGenerating(true);
    setNoticeError("");
    setSendSuccessId(null);
    setNewNotice(null);
    try {
      const notice = await apiGenerateNotice(client.id, noticeType);
      setNewNotice(notice);
      onNoticeGenerated(client.id, notice);
      toast.success("Notice generated successfully");
    } catch (e: unknown) {
      setNoticeError(e instanceof Error ? e.message : "Notice generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (noticeId: string) => {
    setSendingId(noticeId);
    setSendError("");
    try {
      await apiSendNoticeViaGmail(noticeId);
      setSendSuccessId(noticeId);
      toast.success("Notice queued for sending via Gmail");
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSendingId(null);
    }
  };

  const rawData = Object.entries(client.data || {}).filter(
    ([k]) => !["NAME", "EMAIL ID", "MOBILE NO", "address"].includes(k)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{client.name}</h2>
            <p className="text-xs text-muted-foreground">Client details & actions</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6 flex flex-col lg:flex-row gap-6">
          {/* Left Column: Details */}
          <div className="flex-1 space-y-6 min-w-0">
            {/* Contact info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {client.email && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Email</p>
                    <p className="text-xs font-medium text-foreground truncate">{client.email}</p>
                  </div>
                </div>
              )}
              {client.mobile && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Mobile</p>
                    <p className="text-xs font-medium text-foreground">{client.mobile}</p>
                  </div>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border sm:col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Address</p>
                    <p className="text-xs font-medium text-foreground">{client.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Raw Excel data */}
            {rawData.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Case data</p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-border">
                      {rawData.map(([key, val]) => (
                        <tr key={key} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 text-muted-foreground w-1/2 font-medium">{key}</td>
                          <td className="px-3 py-2 text-foreground">{String(val ?? "—")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notices List */}
            <div>
              <p className="text-xs font-medium text-foreground mb-2">
                Generated Notices
                <span className="ml-1.5 text-muted-foreground font-normal">({client.notices?.length || 0})</span>
              </p>

              {(!client.notices || client.notices.length === 0) ? (
                <div className="flex items-center gap-2.5 p-4 rounded-lg border border-dashed border-border text-muted-foreground">
                  <FileText className="w-4 h-4 shrink-0" />
                  <p className="text-xs">No notices generated for this client yet.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Type</th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Status</th>
                          <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">
                            <Mail className="w-3 h-3 inline" />
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Date</th>
                          <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {client.notices.map((notice) => (
                          <tr key={notice.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2.5 font-medium text-foreground">
                              {(notice.template?.noticeType || "").replace(/_/g, " ")}
                            </td>
                            <td className="px-3 py-2.5">
                              <NoticeStatusBadge status={notice.status} />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex justify-center">
                                <SendStatusIcon status={notice.emailStatus} />
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {formatDate(notice.createdAt)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <a
                                  href={`${BASE_URL}${notice.fileUrl}`}
                                  download
                                  title="Download DOCX"
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => handleSend(notice.id)}
                                  disabled={sendingId === notice.id || sendSuccessId === notice.id || !gmailConnected}
                                  className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                                    sendSuccessId === notice.id
                                      ? "bg-green-500/10 text-green-600"
                                      : "bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                                  }`}
                                >
                                  {sendingId === notice.id ? "Sending..." : sendSuccessId === notice.id ? "Sent" : "Send"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sendError && (
                    <div className="p-2 text-xs text-destructive bg-destructive/5 border-t border-destructive/10">
                      {sendError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Generation Actions */}
          <div className="w-full lg:w-72 shrink-0 space-y-4 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
            <h3 className="text-xs font-semibold text-foreground border-b border-border pb-2">Generate Notice</h3>
            
            <div className="space-y-3">
              <div className="relative">
                <select
                  value={noticeType}
                  onChange={(e) => setNoticeType(e.target.value as NoticeTypeValue)}
                  className="w-full appearance-none px-3 py-2.5 pr-8 bg-background text-foreground border border-border rounded-lg outline-none text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                >
                  {NOTICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full px-4 py-2.5 text-sm font-medium border border-border bg-background rounded-lg hover:border-primary hover:text-foreground transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : newNotice ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-500" /> Generated</>
                ) : "Generate Notice"}
              </button>

              {noticeError && (
                <p className="text-xs text-destructive mt-1">{noticeError}</p>
              )}

              {newNotice && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <a
                    href={`${BASE_URL}${newNotice.fileUrl}`}
                    download
                    className="w-full px-4 py-2.5 text-sm font-medium text-primary border border-primary/30 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileDown className="w-4 h-4" /> Download DOCX
                  </a>
                  <button
                    onClick={() => handleSend(newNotice.id)}
                    disabled={sendingId === newNotice.id || sendSuccessId === newNotice.id || !gmailConnected}
                    className={`w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      sendSuccessId === newNotice.id 
                        ? "bg-green-500 text-white" 
                        : gmailConnected 
                          ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm" 
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {sendingId === newNotice.id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : sendSuccessId === newNotice.id ? (
                      <><CheckCircle2 className="w-4 h-4" /> Sent</>
                    ) : (
                      <><Mail className="w-4 h-4" /> Send via Gmail</>
                    )}
                  </button>
                  {!gmailConnected && !sendSuccessId && (
                    <p className="text-xs text-muted-foreground text-center">Connect Gmail in Settings</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Batch Page ───────────────────────────────────────────────────────────────

export default function BatchPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.batchId as string;

  // Global Data
  const [batch, setBatch] = useState<Batch | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Pagination & Search
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Gmail Status
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailAddress, setGmailAddress] = useState("");
  const [gmailConnecting, setGmailConnecting] = useState(false);

  // Bulk Send
  const [bulkNoticeType, setBulkNoticeType] = useState<NoticeTypeValue>("SECTION_25");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<{
    succeeded: number;
    skipped: number;
    failed: number;
    errors: { name: string; reason: string }[];
  } | null>(null);

  // Fetching
  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [cData, bData, gData] = await Promise.all([
        apiGetClients(batchId),
        apiGetBatches(),
        apiGetGmailStatus().catch(() => null),
      ]);
      setClients(cData);
      
      const foundBatch = (bData || []).find((b: Batch) => b.id === batchId);
      if (foundBatch) setBatch(foundBatch);
      
      if (gData?.connected && gData?.emailAddress) {
        setGmailConnected(true);
        setGmailAddress(gData.emailAddress);
      } else {
        setGmailConnected(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  // Gmail Handlers
  const handleConnectGmail = async () => {
    setGmailConnecting(true);
    try {
      const url = await apiGetGmailConnectUrl();
      window.location.href = url;
    } catch {
      toast.error("Failed to connect Gmail");
      setGmailConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await apiDisconnectGmail();
      setGmailConnected(false);
      setGmailAddress("");
      toast.success("Gmail disconnected");
    } catch {
      toast.error("Failed to disconnect Gmail");
    }
  };

  // Bulk Send Handler (Fake progress loop for API blocking call)
  const handleBulkSendAll = async () => {
    if (!batchId || !gmailConnected) return;
    setBulkSending(true);
    setBulkResults(null);
    setBulkProgress({ current: 0, total: clients.length });

    // Simulate progress increment while the API call is processing
    const progressInterval = setInterval(() => {
      setBulkProgress((prev) => {
        // Increment slowly up to 95%
        const maxFake = Math.floor(prev.total * 0.95);
        if (prev.current < maxFake) {
          return { ...prev, current: prev.current + 1 };
        }
        return prev;
      });
    }, 1500);

    try {
      const res = await apiGenerateAndSendAll(bulkNoticeType, batchId);
      
      clearInterval(progressInterval);
      setBulkProgress({ current: clients.length, total: clients.length });
      
      const errors = res.results
        .filter((r: { name: string; email: string | null; status: string; reason?: string }) => r.status === "error")
        .map((r: { name: string; email: string | null; status: string; reason?: string }) => ({ name: r.name, reason: r.reason || "Failed" }));

      setBulkResults({
        succeeded: res.succeeded,
        skipped: res.skipped,
        failed: res.failed,
        errors,
      });

      // Refresh clients to show newly generated notices
      const updatedClients = await apiGetClients(batchId);
      setClients(updatedClients);
      toast.success("Bulk send complete");

    } catch (err: unknown) {
      clearInterval(progressInterval);
      toast.error(err instanceof Error ? err.message : "Bulk send failed");
    } finally {
      setBulkSending(false);
    }
  };

  // Row Handlers
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const lower = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        (c.mobile && c.mobile.includes(lower)) ||
        (c.email && c.email.toLowerCase().includes(lower))
    );
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const currentPageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDeleteClient = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this client?")) return;
    try {
      await apiDeleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      if (batch) {
        setBatch({ ...batch, _count: { clients: batch._count.clients - 1 } });
      }
      toast.success("Client deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleNoticeGenerated = (clientId: string, newNotice: GeneratedNotice) => {
    setClients((prev) => 
      prev.map(c => 
        c.id === clientId 
          ? { ...c, notices: [...(c.notices || []), newNotice] } 
          : c
      )
    );
    // Update selected client as well if it's open
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, notices: [...(prev.notices || []), newNotice] } : null);
    }
  };

  if (loadingData) {
    return (
      <DashboardLayout activeNav="dashboard">
        <div className="space-y-12 max-w-6xl animate-pulse">
          <div className="h-[200px] rounded-lg bg-muted" />
          <div className="space-y-3">
            <div className="h-4 w-32 bg-muted rounded" />
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded-md" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!batch) {
    return (
      <DashboardLayout activeNav="dashboard">
        <div className="py-20 text-center text-muted-foreground">Batch not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeNav="dashboard">
      <div className="space-y-10 max-w-6xl">
        {/* ============================================================== */}
        {/* TOP HEADER */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-lg text-foreground">
                {batch.name}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">{batch._count.clients} clients</span>
                <span className="mx-2">·</span>
                <span>Uploaded {formatDate(batch.createdAt)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* GMAIL STATUS & BULK SEND */}
        {/* ============================================================== */}
        <section className="bg-muted/30 border border-border rounded-xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Bulk Send Notices</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Generate and send a notice to every client in this batch automatically using your connected Gmail account.
              </p>
            </div>
            {gmailConnected ? (
              <div className="flex items-center gap-3 px-3 py-1.5 bg-background border border-border rounded-lg shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-xs font-medium text-foreground">{gmailAddress}</span>
                <button onClick={handleDisconnectGmail} className="text-xs font-medium text-muted-foreground hover:text-destructive underline-offset-2 transition-colors border-l border-border pl-3 ml-1">
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnectGmail} 
                disabled={gmailConnecting}
                className="text-xs font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {gmailConnecting ? "Connecting..." : "Connect Gmail to send"}
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-end gap-4 border-t border-border pt-6">
            <div className="w-full md:w-[320px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notice Type</label>
              <div className="relative">
                <select
                  value={bulkNoticeType}
                  onChange={(e) => setBulkNoticeType(e.target.value as NoticeTypeValue)}
                  className="w-full appearance-none px-3 py-2.5 pr-8 bg-background text-foreground border border-border rounded-lg outline-none text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                >
                  {NOTICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="w-full md:w-auto">
              <button
                onClick={handleBulkSendAll}
                disabled={bulkSending || !gmailConnected}
                className="w-full md:w-auto px-6 py-2.5 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                Generate & Send All →
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          {bulkSending && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
                <span>Sending {bulkProgress.current} of {bulkProgress.total} notices...</span>
                <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Results Summary */}
          {bulkResults && !bulkSending && (
            <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
              <div className="px-4 py-3 bg-muted/50 border-b border-border text-sm font-medium text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {bulkResults.succeeded} sent · {bulkResults.skipped} skipped (no email) · {bulkResults.failed} failed
              </div>
              {bulkResults.errors.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Failed clients:</p>
                  <ul className="space-y-1">
                    {bulkResults.errors.map((e, idx) => (
                      <li key={idx} className="text-xs text-destructive font-medium">
                        {e.name} — <span className="font-normal">{e.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* CLIENT LIST TABLE */}
        {/* ============================================================== */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Client List</h2>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl bg-background overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Client Name</th>
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Mobile</th>
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Email</th>
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Notices</th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium text-muted-foreground w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentPageData.map((client) => {
                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="hover:bg-muted/40 transition-colors group cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-primary">{initials(client.name)}</span>
                            </div>
                            <span className="font-medium text-foreground">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{client.mobile || "—"}</td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs truncate max-w-[150px]">{client.email || "—"}</td>
                        <td className="px-5 py-3.5">
                          {client.notices && client.notices.length > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                              {client.notices.length}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleDeleteClient(client.id, e)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-6 h-6 opacity-30 mb-1" />
                          <p>No clients found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredClients.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filteredClients.length)} of {filteredClients.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors rounded hover:bg-muted"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors rounded hover:bg-muted"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal */}
      {selectedClient && (
        <ClientModal
          client={selectedClient}
          gmailConnected={gmailConnected}
          onClose={() => setSelectedClient(null)}
          onNoticeGenerated={handleNoticeGenerated}
        />
      )}
    </DashboardLayout>
  );
}
