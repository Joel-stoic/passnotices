"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  apiGetTemplates, apiDeleteTemplate, apiGetGmailStatus,
  apiGetGmailConnectUrl, apiDisconnectGmail, type Template,
} from "@/lib/api";
import {
  Loader2, Trash2, CheckCircle2, AlertCircle,
  FileText, Mail, ShieldCheck, UploadCloud,
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

export default function SettingsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [noticeType, setNoticeType] = useState("");
  const [uploadError, setUploadError] = useState("");

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
    },
    onError: () => toast.error("Failed to delete template"),
  });

  if (gmailLoading || templatesLoading) {
    return (
      <DashboardLayout activeNav="settings">
        <div className="space-y-4 max-w-2xl">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-[#141418] animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeNav="settings">
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-[22px] font-serif font-semibold text-foreground tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage your Gmail connection and notice templates.</p>
        </div>

        {/* Gmail */}
        <section>
          <h2 className="text-[13px] font-semibold text-foreground mb-3">Gmail connection</h2>
          <div className="bg-[#141418] border border-[#222228] rounded-xl overflow-hidden">
            <div className="p-5">
              {gmailConnected ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Connected</p>
                      <p className="text-xs text-muted-foreground">{gmailAddress}</p>
                    </div>
                  </div>
                  <button onClick={() => { if (confirm("Disconnect Gmail?")) disconnectGmailMutation.mutate(); }}
                    disabled={disconnectGmailMutation.isPending}
                    className="text-xs text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50">
                    {disconnectGmailMutation.isPending ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1a1a20] flex items-center justify-center">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">No account connected</p>
                      <p className="text-xs text-muted-foreground">Connect Gmail to send notices from your address.</p>
                    </div>
                  </div>
                  <button onClick={() => connectGmailMutation.mutate()} disabled={connectGmailMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors shrink-0">
                    {connectGmailMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</> : "Connect Gmail"}
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2.5 px-5 py-3 bg-[#0c0c0f] border-t border-[#1a1a20]">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
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
            <div className="bg-[#141418] border border-[#222228] rounded-xl p-5">
              <p className="text-xs font-medium text-foreground mb-3">Upload a template</p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <select value={noticeType} onChange={(e) => setNoticeType(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-xs bg-[#0c0c0f] text-foreground border border-[#222228] rounded-lg focus:outline-none focus:border-blue-400/50 transition-all">
                  <option value="" disabled>Select notice type…</option>
                  {NOTICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 px-3 py-2.5 text-xs border rounded-lg text-left truncate transition-all ${file ? "border-blue-500/30 text-foreground bg-blue-500/5" : "border-[#222228] text-muted-foreground hover:border-blue-400/30"}`}>
                  <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadError(""); }} className="hidden" />
                  {file ? file.name : "Choose .docx file"}
                </button>
                <button onClick={() => uploadMutation.mutate()} disabled={!file || !noticeType || uploadMutation.isPending}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors shrink-0">
                  {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UploadCloud className="w-3.5 h-3.5" /> Upload</>}
                </button>
              </div>
              {uploadError && (
                <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/20 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{uploadError}
                </div>
              )}
            </div>

            {/* List */}
            {(templates as Template[]).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 border border-dashed border-[#222228] rounded-xl text-center">
                <FileText className="w-7 h-7 text-muted-foreground/20" />
                <p className="text-sm font-semibold text-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground">Upload a .docx template for each notice type.</p>
              </div>
            ) : (
              <div className="bg-[#141418] border border-[#222228] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-[#1a1a20]">
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Notice type</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Uploaded</th>
                      <th className="px-5 py-2.5 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a20]">
                    {(templates as Template[]).map((t) => {
                      const label = NOTICE_TYPES.find((n) => n.value === t.noticeType)?.label ?? t.noticeType;
                      return (
                        <tr key={t.id} className="hover:bg-blue-500/[0.04] transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="text-[13px] font-medium text-foreground">{label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatDate(t.createdAt)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => { if (confirm(`Delete "${label}"?`)) deleteMutation.mutate(t.id); }}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all ml-auto">
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

            {(templates as Template[]).length > 0 && (templates as Template[]).length < NOTICE_TYPES.length && (
              <p className="text-xs text-muted-foreground px-1">
                {NOTICE_TYPES.length - (templates as Template[]).length} of {NOTICE_TYPES.length} notice types still need a template.
              </p>
            )}
            {(templates as Template[]).length === NOTICE_TYPES.length && (
              <div className="flex items-center gap-2 text-xs text-green-400 px-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All notice types have a template.
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}