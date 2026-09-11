"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  apiGetTemplates,
  apiDeleteTemplate,
  apiGetGmailStatus,
  apiGetGmailConnectUrl,
  apiDisconnectGmail,
  type Template,
} from "@/lib/api";
import {
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const NOTICE_TYPES = [
  { value: "SECTION_25", label: "Section 25 — Contract Act" },
  { value: "SECTION_138", label: "Section 138 — NI Act (Cheque Bounce)" },
  { value: "MONEY_RECOVERY", label: "Money Recovery Notice" },
  { value: "DEMAND_NOTICE", label: "General Demand Notice" },
  { value: "LEGAL_NOTICE", label: "General Legal Notice" },
] as const;

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("passnotice_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SettingsPage() {
  // Gmail state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailAddress, setGmailAddress] = useState("");
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [noticeType, setNoticeType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setGmailLoading(true);
      setTemplatesLoading(true);

      const [gData, tData] = await Promise.all([
        apiGetGmailStatus().catch(() => null),
        apiGetTemplates().catch(() => []),
      ]);

      if (gData?.connected && gData?.emailAddress) {
        setGmailConnected(true);
        setGmailAddress(gData.emailAddress);
      } else {
        setGmailConnected(false);
        setGmailAddress("");
      }

      setTemplates(tData);
    } finally {
      setGmailLoading(false);
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnectGmail = async () => {
    setGmailConnecting(true);
    try {
      const url = await apiGetGmailConnectUrl();
      window.location.href = url;
    } catch {
      toast.error("Could not start Gmail connection. Try again.");
      setGmailConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm("Disconnect Gmail? You won't be able to send notices by email until you reconnect.")) return;
    setDisconnecting(true);
    try {
      await apiDisconnectGmail();
      setGmailConnected(false);
      setGmailAddress("");
      toast.success("Gmail disconnected");
    } catch {
      toast.error("Failed to disconnect Gmail");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setUploadError("");
  };

  const handleUploadTemplate = async () => {
    if (!file || !noticeType) return;

    // Check if this notice type already has a template
    const existing = templates.find((t) => t.noticeType === noticeType);
    if (existing) {
      if (!confirm(`A template for this notice type already exists. Replace it?`)) return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noticeType", noticeType);

      const res = await fetch(`${BASE_URL}/api/templates`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      toast.success("Template uploaded");
      setFile(null);
      setNoticeType("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      const tData = await apiGetTemplates();
      setTemplates(tData);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async (id: string, label: string) => {
    if (!confirm(`Delete the "${label}" template?`)) return;
    try {
      await apiDeleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const isLoading = gmailLoading || templatesLoading;

  if (isLoading) {
    return (
      <DashboardLayout activeNav="settings">
        <div className="space-y-10 max-w-3xl">
          <div className="h-28 rounded-lg bg-muted animate-pulse" />
          <div className="h-40 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeNav="settings">
      <div className="space-y-10 max-w-3xl">

        {/* ── Gmail Connection ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Gmail connection</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send notices directly from your own email address.
            </p>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-5">
              {gmailConnected ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Connected</p>
                      <p className="text-xs text-muted-foreground">{gmailAddress}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnectGmail}
                    disabled={disconnecting}
                    className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors disabled:opacity-50"
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No account connected</p>
                      <p className="text-xs text-muted-foreground">
                        Connect Gmail to send notices from your address.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleConnectGmail}
                    disabled={gmailConnecting}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                  >
                    {gmailConnecting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                    ) : (
                      "Connect Gmail"
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2.5 px-5 py-3 bg-muted/40 border-t border-border">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Google will show a security warning — click <strong>Advanced</strong> → <strong>Go to PassNotice</strong> to continue.
                This is normal for apps pending Google verification.
              </p>
            </div>
          </div>
        </section>

        {/* ── Notice Templates ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Notice templates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a .docx template for each notice type you use. Placeholders in the file are filled per client.
            </p>
          </div>

          <div className="space-y-4">
            {/* Upload form */}
            <div className="border border-border rounded-lg p-5">
              <p className="text-xs font-medium text-foreground mb-3">Add a template</p>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Notice type select */}
                <select
                  value={noticeType}
                  onChange={(e) => setNoticeType(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                >
                  <option value="" disabled>Select notice type...</option>
                  {NOTICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>

                {/* File picker */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={[
                      "w-full px-3 py-2 text-sm border rounded-md text-left truncate transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-primary/30",
                      file
                        ? "border-primary/50 text-foreground bg-primary/5"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    ].join(" ")}
                  >
                    {file ? file.name : "Choose .docx file"}
                  </button>
                </div>

                {/* Upload button */}
                <button
                  onClick={handleUploadTemplate}
                  disabled={!file || !noticeType || uploading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><UploadCloud className="w-4 h-4" /> Upload</>
                  )}
                </button>
              </div>

              {uploadError && (
                <div className="mt-3 flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 px-3 py-2 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Template list */}
            {templates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 border border-dashed border-border rounded-lg text-center">
                <FileText className="w-7 h-7 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground">
                  Upload a .docx template for each notice type you use.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Notice type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Uploaded</th>
                      <th className="px-4 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {templates.map((t) => {
                      const typeLabel = NOTICE_TYPES.find((n) => n.value === t.noticeType)?.label ?? t.noticeType;
                      return (
                        <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <span className="font-medium text-foreground">{typeLabel}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {formatDate(t.createdAt)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleDeleteTemplate(t.id, typeLabel)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Slots remaining indicator */}
            {templates.length > 0 && templates.length < NOTICE_TYPES.length && (
              <p className="text-xs text-muted-foreground px-1">
                {NOTICE_TYPES.length - templates.length} of {NOTICE_TYPES.length} notice types still need a template.
              </p>
            )}
            {templates.length === NOTICE_TYPES.length && (
              <div className="flex items-center gap-2 text-xs text-green-600 px-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All notice types have a template.
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}