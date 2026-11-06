"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  apiGetTemplates, apiDeleteTemplate, apiGetGmailStatus,
  apiGetGmailConnectUrl, apiDisconnectGmail, apiGetTemplatePreview,
  apiDownloadTemplate, type Template, type TemplatePreview,
} from "@/lib/api";
import {
  Loader2, Trash2, CheckCircle2, AlertCircle,
  FileText, Mail, ShieldCheck, UploadCloud,
  Eye, Download, X,
} from "lucide-react";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

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
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────
// Template Preview Modal
// ─────────────────────────────────────────────

function TemplatePreviewModal({
  template,
  preview,
  loading,
  downloading,
  onClose,
  onDownload,
}: {
  template: Template;
  preview: TemplatePreview | null;
  loading: boolean;
  downloading?: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  const label = NOTICE_TYPES.find((n) => n.value === template.noticeType)?.label ?? template.noticeType;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">{label}</h2>
              <p className="text-[11px] text-secondary">
                Uploaded on {formatDate(template.createdAt)} · Word Document (.docx)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/90 transition-colors shadow-2xs disabled:opacity-60"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Download .docx
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted text-secondary hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-secondary">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <p className="text-xs">Reading document content & placeholders...</p>
            </div>
          ) : preview ? (
            <>
              {/* Placeholders section */}
              <div className="bg-surface border border-border rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                    Detected Dynamic Placeholders ({preview.placeholders.length})
                  </span>
                  <span className="text-[10px] text-secondary">Filled from your Excel sheet</span>
                </div>
                {preview.placeholders.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preview.placeholders.map((ph) => (
                      <span
                        key={ph}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-accent/10 text-accent border border-accent/15"
                      >
                        {`{{${ph}}}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-secondary italic">
                    No dynamic &#123;&#123;PLACEHOLDERS&#125;&#125; detected in this document.
                  </p>
                )}
              </div>

              {/* Document Text View */}
              <div>
                <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide mb-2">
                  Document Content
                </p>
                <div className="bg-card border border-border rounded-lg p-5 sm:p-6 shadow-2xs font-sans text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
                  {preview.text}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-secondary text-xs space-y-2">
              <p className="font-medium text-foreground">Could not render in-app document preview.</p>
              <p className="text-secondary text-[11px]">
                You can still download the original .docx file using the &quot;Download .docx&quot; button above.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface flex items-center justify-between text-xs text-secondary">
          <span>Editable in Microsoft Word, Google Docs, or LibreOffice.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors font-medium text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Settings Page
// ─────────────────────────────────────────────

export default function SettingsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [noticeType, setNoticeType] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<TemplatePreview | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: gmailData, isLoading: gmailLoading } = useQuery({
    queryKey: queryKeys.gmail,
    queryFn: () => apiGetGmailStatus().catch(() => null),
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: queryKeys.templates,
    queryFn: () => apiGetTemplates().catch(() => []),
  });

  const gmailConnected = !!(gmailData?.connected && gmailData?.emailAddress);
  const gmailAddress = gmailData?.emailAddress ?? "";

  const connectGmailMutation = useMutation({
    mutationFn: apiGetGmailConnectUrl,
    onSuccess: (url) => { window.location.href = url; },
    onError: () => toast.error("Could not start Gmail connection"),
  });

  const disconnectGmailMutation = useMutation({
    mutationFn: apiDisconnectGmail,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gmail });
      toast.success("Gmail disconnected");
    },
    onError: () => toast.error("Failed to disconnect Gmail"),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !noticeType) throw new Error("Select a file and notice type");
      const existing = (templates as Template[]).find((t) => t.noticeType === noticeType);
      if (existing && !confirm("A template for this type already exists. Replace it?")) throw new Error("Cancelled");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noticeType", noticeType);
      const res = await fetch(`${BASE_URL}/api/templates`, { method: "POST", headers: authHeaders(), body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.templates });
      toast.success("Template uploaded");
      setFile(null); setNoticeType(""); setUploadError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (msg !== "Cancelled") setUploadError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.templates });
      toast.success("Template deleted");
      if (selectedTemplate) setSelectedTemplate(null);
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const handleOpenPreview = async (template: Template) => {
    setSelectedTemplate(template);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const data = await apiGetTemplatePreview(template.id);
      setPreviewData(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load document preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (template: Template, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const label = NOTICE_TYPES.find((n) => n.value === template.noticeType)?.label ?? template.noticeType;
    const filename = `${template.noticeType.toLowerCase().replace(/_/g, "-")}-template.docx`;
    setDownloadingId(template.id);
    try {
      await apiDownloadTemplate(template.id, filename);
      toast.success(`Downloaded ${label} template`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to download document");
    } finally {
      setDownloadingId(null);
    }
  };

  if (gmailLoading || templatesLoading) {
    return (
      <DashboardLayout activeNav="settings">
        <div className="space-y-4 max-w-2xl">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse shadow-xs" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeNav="settings">
      <div className="max-w-2xl space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-xl sm:text-[22px] font-serif font-semibold text-foreground tracking-tight">Settings</h1>
          <p className="text-xs text-secondary mt-1">Manage your Gmail connection and notice templates.</p>
        </div>

        {/* Gmail */}
        <section>
          <h2 className="text-[13px] font-semibold text-foreground mb-3">Gmail connection</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5">
              {gmailConnected ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">Connected</p>
                      <p className="text-xs text-secondary truncate max-w-[200px] sm:max-w-xs">{gmailAddress}</p>
                    </div>
                  </div>
                  <button onClick={() => { if (confirm("Disconnect Gmail?")) disconnectGmailMutation.mutate(); }}
                    disabled={disconnectGmailMutation.isPending}
                    className="text-xs text-secondary hover:text-red-500 transition-colors disabled:opacity-50 self-start sm:self-auto py-1">
                    {disconnectGmailMutation.isPending ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">No account connected</p>
                      <p className="text-xs text-secondary">Connect Gmail to send notices from your address.</p>
                    </div>
                  </div>
                  <button onClick={() => connectGmailMutation.mutate()} disabled={connectGmailMutation.isPending}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors shrink-0 w-full sm:w-auto shadow-xs">
                    {connectGmailMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</> : "Connect Gmail"}
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2.5 px-4 sm:px-5 py-3 bg-surface border-t border-border">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
              <p className="text-[11px] text-secondary leading-relaxed">
                Google will show a security warning — click <strong className="text-foreground">Advanced</strong> → <strong className="text-foreground">Go to PassNotice</strong> to continue.
              </p>
            </div>
          </div>
        </section>

        {/* Templates */}
        <section>
          <h2 className="text-[13px] font-semibold text-foreground mb-3">Notice templates</h2>
          <div className="space-y-3">

            {/* Upload */}
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
              <p className="text-xs font-medium text-foreground mb-3">Upload a template</p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <select value={noticeType} onChange={(e) => setNoticeType(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-2.5 text-xs bg-card text-foreground border border-border rounded-lg focus:outline-none focus:border-accent transition-all shadow-2xs">
                  <option value="" disabled>Select notice type…</option>
                  {NOTICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button onClick={() => fileInputRef.current?.click()}
                  className={`w-full sm:flex-1 px-3 py-2.5 text-xs border rounded-lg text-left truncate transition-all ${file ? "border-accent/40 text-foreground bg-accent/5" : "border-border text-secondary hover:border-accent/40 bg-card"}`}>
                  <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadError(""); }} className="hidden" />
                  {file ? file.name : "Choose .docx file"}
                </button>
                <button onClick={() => uploadMutation.mutate()} disabled={!file || !noticeType || uploadMutation.isPending}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors w-full sm:w-auto shrink-0 shadow-xs">
                  {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UploadCloud className="w-3.5 h-3.5" /> Upload</>}
                </button>
              </div>
              {uploadError && (
                <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-500/5 border border-red-500/20 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{uploadError}
                </div>
              )}
            </div>

            {/* List */}
            {(templates as Template[]).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 border border-dashed border-border rounded-xl text-center bg-card">
                <FileText className="w-7 h-7 text-secondary/30" />
                <p className="text-sm font-semibold text-foreground">No templates yet</p>
                <p className="text-xs text-secondary">Upload a .docx template for each notice type.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr className="bg-surface border-b border-border">
                        <th className="px-4 sm:px-5 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase tracking-widest">Notice type</th>
                        <th className="px-4 sm:px-5 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase tracking-widest">Uploaded</th>
                        <th className="px-4 sm:px-5 py-2.5 text-right text-[10px] font-semibold text-secondary uppercase tracking-widest w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(templates as Template[]).map((t) => {
                        const label = NOTICE_TYPES.find((n) => n.value === t.noticeType)?.label ?? t.noticeType;
                        return (
                          <tr key={t.id} className="hover:bg-surface/70 transition-colors group">
                            <td className="px-4 sm:px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                                <span className="text-[13px] font-medium text-foreground">{label}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-5 py-3.5 text-xs text-secondary">{formatDate(t.createdAt)}</td>
                            <td className="px-4 sm:px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenPreview(t)}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
                                  title="View document"
                                  aria-label={`View ${label} document`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDownload(t, e)}
                                  disabled={downloadingId === t.id}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                                  title="Download .docx"
                                  aria-label={`Download ${label} document`}
                                >
                                  {downloadingId === t.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => { if (confirm(`Delete "${label}"?`)) deleteMutation.mutate(t.id); }}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                  title="Delete template"
                                  aria-label={`Delete ${label} template`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(templates as Template[]).length > 0 && (templates as Template[]).length < NOTICE_TYPES.length && (
              <p className="text-xs text-secondary px-1">
                {NOTICE_TYPES.length - (templates as Template[]).length} of {NOTICE_TYPES.length} notice types still need a template.
              </p>
            )}
            {(templates as Template[]).length === NOTICE_TYPES.length && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 px-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All notice types have a template.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Template Viewer Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          preview={previewData}
          loading={previewLoading}
          downloading={downloadingId === selectedTemplate.id}
          onClose={() => {
            setSelectedTemplate(null);
            setPreviewData(null);
          }}
          onDownload={() => handleDownload(selectedTemplate)}
        />
      )}
    </DashboardLayout>
  );
}
