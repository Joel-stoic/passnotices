"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  XCircle,
  SkipForward,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const NOTICE_TYPES = [
  { value: "SECTION_25", label: "Section 25 - Contract Act" },
  { value: "SECTION_138", label: "Section 138 - NI Act (Cheque Bounce)" },
  { value: "MONEY_RECOVERY", label: "Money Recovery Notice" },
  { value: "DEMAND_NOTICE", label: "General Demand Notice" },
  { value: "LEGAL_NOTICE", label: "General Legal Notice" },
] as const;

type NoticeTypeValue = typeof NOTICE_TYPES[number]["value"];

interface Batch {
  id: string;
  name: string;
  createdAt: string;
  _count: { clients: number };
}

interface SendResult {
  clientId: string;
  name: string;
  email: string | null;
  status: "success" | "skipped" | "error";
  reason?: string;
  noticeId?: string;
}

interface BulkSendResponse {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: SendResult[];
}

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("passnotice_token")
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BulkSendAll() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState("");

  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [noticeType, setNoticeType] = useState<NoticeTypeValue>("SECTION_25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BulkSendResponse | null>(null);

  // Track sent batch IDs in localStorage
  const getSentBatches = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem("passnotice_sent_batches") || "[]");
    } catch {
      return [];
    }
  };

  const markBatchSent = (batchId: string) => {
    const sent = getSentBatches();
    if (!sent.includes(batchId)) {
      localStorage.setItem(
        "passnotice_sent_batches",
        JSON.stringify([...sent, batchId])
      );
    }
  };

  const fetchBatches = async () => {
    setBatchesLoading(true);
    setBatchesError("");
    try {
      const res = await fetch(`${BASE_URL}/api/clients/batches`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load batches");
      setBatches(data.batches);
      // Auto-select first batch
      if (data.batches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(data.batches[0].id);
      }
    } catch (err: unknown) {
      setBatchesError(err instanceof Error ? err.message : "Failed to load batches");
    } finally {
      setBatchesLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const sentBatches = getSentBatches();
  const isSent = selectedBatchId ? sentBatches.includes(selectedBatchId) : false;

  const handleSendAll = async () => {
    if (!selectedBatchId) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${BASE_URL}/api/notices/generate-and-send-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ noticeType, batchId: selectedBatchId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk send failed");

      setResult(data as BulkSendResponse);
      markBatchSent(selectedBatchId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-[#F8F8F6] dark:bg-[#111111] flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-[#EEF2F7] dark:bg-[#1A2535] rounded-sm">
          <Send className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">
            Generate & Send All Notices
          </h2>
          <p className="text-xs text-secondary">
            Select a batch (Excel upload) and send notices to all clients in it
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 bg-background space-y-5">
        {/* Batch selector */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Batch (Excel Upload)
          </label>

          {batchesLoading && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading batches…
            </div>
          )}

          {batchesError && (
            <div className="flex items-start gap-2 text-sm text-error border border-error/30 bg-error/5 px-3 py-2 rounded-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {batchesError}
            </div>
          )}

          {!batchesLoading && batches.length === 0 && (
            <p className="text-sm text-secondary">
              No batches found. Upload an Excel file first.
            </p>
          )}

          {!batchesLoading && batches.length > 0 && (
            <div className="relative max-w-sm">
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setResult(null);
                  setError("");
                }}
                disabled={loading}
                className="w-full appearance-none px-4 py-2.5 pr-9 bg-background text-foreground border border-border rounded-sm outline-none text-sm transition-colors duration-150 focus:border-accent cursor-pointer disabled:opacity-50"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b._count.clients} client{b._count.clients !== 1 ? "s" : ""} · {formatDate(b.createdAt)}
                    {sentBatches.includes(b.id) ? " ✓ Sent" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            </div>
          )}

          {/* Sent badge */}
          {isSent && (
            <div className="flex items-center gap-1.5 text-xs text-success font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Notices already sent for this batch. Sending again will generate new notices.
            </div>
          )}
        </div>

        {/* Notice type */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Notice Type
          </label>
          <div className="relative max-w-sm">
            <select
              value={noticeType}
              onChange={(e) => setNoticeType(e.target.value as NoticeTypeValue)}
              disabled={loading}
              className="w-full appearance-none px-4 py-2.5 pr-9 bg-background text-foreground border border-border rounded-sm outline-none text-sm transition-colors duration-150 focus:border-accent cursor-pointer disabled:opacity-50"
            >
              {NOTICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
          </div>
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSendAll}
          disabled={loading || !selectedBatchId}
          className="flex items-center gap-2 text-sm font-semibold bg-accent text-white px-6 py-2.5 rounded-sm hover:bg-accent/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating & Sending… (do not close this tab)
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {isSent ? "Re-send All via Gmail" : "Generate & Send All via Gmail"}
            </>
          )}
        </button>

        {loading && (
          <p className="text-xs text-secondary">
            Sending one email every 0.5 seconds to avoid Gmail limits.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-6 flex items-start gap-2 text-sm text-error border border-error/30 bg-error/5 px-4 py-3 rounded-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="border-t border-border">
          <div className="px-6 py-4 bg-[#F8F8F6] dark:bg-[#111111] border-b border-border">
            <div className="flex flex-wrap gap-6 text-sm">
              <span className="text-secondary">
                Total: <span className="font-semibold text-foreground">{result.total}</span>
              </span>
              <span className="text-success font-medium">✓ Sent: {result.succeeded}</span>
              {result.skipped > 0 && (
                <span className="text-secondary font-medium">↷ Skipped: {result.skipped}</span>
              )}
              {result.failed > 0 && (
                <span className="text-error font-medium">✗ Failed: {result.failed}</span>
              )}
            </div>
          </div>

          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {result.results.map((r) => (
              <div key={r.clientId} className="px-6 py-3 flex items-center gap-3">
                {r.status === "success" && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                {r.status === "skipped" && <SkipForward className="w-4 h-4 text-secondary shrink-0" />}
                {r.status === "error" && <XCircle className="w-4 h-4 text-error shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  <p className="text-xs text-secondary truncate">
                    {r.email ?? "No email"}
                    {r.reason && ` — ${r.reason}`}
                  </p>
                </div>
                <span className={`text-xs font-medium shrink-0 ${
                  r.status === "success" ? "text-success"
                  : r.status === "skipped" ? "text-secondary"
                  : "text-error"
                }`}>
                  {r.status === "success" ? "Sent" : r.status === "skipped" ? "Skipped" : "Failed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}