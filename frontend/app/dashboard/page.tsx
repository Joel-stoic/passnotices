"use client";

import React, { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, AlertCircle, Trash2, ChevronRight,
  Upload, Users, FolderOpen,
  FileSpreadsheet, AlertTriangle, Clock, FileText,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { apiGetBatches, apiDeleteBatch, type Batch } from "@/lib/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const REQUIRED_COLUMNS = ["NAME", "BOUNCE AMOUNT", "BOUNCE DATE", "EMAIL ID", "MOBILE NO"];

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("passnotice_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function DeleteConfirmDialog({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Delete batch?</p>
            <p className="text-xs text-secondary leading-relaxed">
              <span className="text-foreground font-medium">&ldquo;{name}&rdquo;</span> and all its clients and notices will be permanently deleted.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 text-xs font-medium text-secondary hover:text-foreground bg-muted/60 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 border border-border/50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-70">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);

  const { data: batches = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.batches,
    queryFn: apiGetBatches,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteBatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.batches });
      toast.success("Batch deleted");
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    },
  });

  const selectFile = useCallback((selected: File) => {
    setFile(selected);
    setValidationError(null);
    const base = selected.name.replace(/\.(xlsx|xls)$/i, "");
    const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    setBatchName(`${base} — ${date}`);
  }, []);

  const clearFile = () => {
    setFile(null); setBatchName(""); setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  React.useEffect(() => {
    const zone = dropZoneRef.current;
    if (!zone) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e: DragEvent) => { if (!zone.contains(e.relatedTarget as Node)) setIsDragging(false); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault(); setIsDragging(false);
      const dropped = e.dataTransfer?.files[0];
      if (dropped && /\.(xlsx|xls)$/i.test(dropped.name)) selectFile(dropped);
      else if (dropped) toast.error("Only .xlsx or .xls files accepted.");
    };
    zone.addEventListener("dragover", onDragOver);
    zone.addEventListener("dragleave", onDragLeave);
    zone.addEventListener("drop", onDrop);
    return () => {
      zone.removeEventListener("dragover", onDragOver);
      zone.removeEventListener("dragleave", onDragLeave);
      zone.removeEventListener("drop", onDrop);
    };
  }, [selectFile]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      if (rows.length === 0) throw new Error("File has no data rows.");
      const missing = REQUIRED_COLUMNS.filter((c) => !Object.keys(rows[0]).includes(c));
      if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(", ")}`);
      const formData = new FormData();
      formData.append("file", file);
      if (batchName.trim()) formData.append("batchName", batchName.trim());
      const res = await fetch(`${BASE_URL}/api/excel/upload`, { method: "POST", headers: authHeaders(), body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.batches });
      toast.success(`Imported ${data.importedClients} clients`);
      router.push(`/batch/${data.batchId}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (msg.includes("Missing") || msg.includes("no data")) setValidationError(msg);
      else toast.error(msg);
    },
  });

  const totalClients = batches.reduce((s: number, b: Batch) => s + b._count.clients, 0);

  if (isLoading) {
    return (
      <DashboardLayout activeNav="dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
          {[1,2,3].map(i => <div key={i} className="h-[88px] rounded-xl bg-card border border-border animate-pulse shadow-sm" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          <div className="h-[300px] rounded-xl bg-card border border-border animate-pulse shadow-sm" />
          <div className="h-[220px] rounded-xl bg-card border border-border animate-pulse shadow-sm" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeNav="dashboard">
      <div className="mb-6 sm:mb-7">
        <h1 className="text-xl sm:text-[22px] font-serif font-semibold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-xs text-secondary mt-1">Manage your client batches and notice delivery.</p>
      </div>

      {batches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 sm:mb-7">
          {[
            { icon: <FolderOpen className="w-3.5 h-3.5 text-secondary" />, label: "Batches", value: batches.length, sub: "Total imports" },
            { icon: <Users className="w-3.5 h-3.5 text-secondary" />, label: "Total clients", value: totalClients, sub: "Across all batches" },
            { icon: <Clock className="w-3.5 h-3.5 text-secondary" />, label: "Last import", value: formatRelative(batches[0].createdAt), sub: formatDate(batches[0].createdAt), small: true },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl px-4 sm:px-5 py-3.5 sm:py-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2 sm:mb-2.5">{s.icon}<span className="text-[11px] text-secondary font-medium">{s.label}</span></div>
              <p className={`font-semibold text-foreground leading-none tracking-tight ${s.small ? "text-[16px] sm:text-[18px] mt-1" : "text-[22px] sm:text-[26px]"}`}>{s.value}</p>
              <p className="text-[10px] sm:text-[11px] text-secondary mt-1.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px] gap-5 items-start">
        {/* Batch list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border bg-surface/50 dark:bg-card">
            <span className="text-[13px] font-semibold text-foreground">Recent uploads</span>
            <span className="text-[11px] text-secondary bg-muted px-2.5 py-0.5 rounded-full border border-border/60">
              {batches.length} {batches.length === 1 ? "batch" : "batches"}
            </span>
          </div>

          {isError ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-500">Failed to load batches</p>
              <button onClick={() => refetch()} className="text-xs font-medium text-accent dark:text-blue-400 hover:underline">Retry</button>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
              <FolderOpen className="w-8 h-8 text-secondary/40 mb-1" />
              <p className="text-sm font-semibold text-foreground">No batches yet</p>
              <p className="text-xs text-secondary">Import a spreadsheet to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-surface/50 dark:bg-white/[0.02] border-b border-border">
                    <th className="px-4 sm:px-5 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase tracking-widest">Batch</th>
                    <th className="px-4 sm:px-5 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase tracking-widest">Clients</th>
                    <th className="px-4 sm:px-5 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase tracking-widest">Uploaded</th>
                    <th className="px-4 sm:px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {batches.map((batch: Batch) => (
                    <tr key={batch.id} onClick={() => router.push(`/batch/${batch.id}`)}
                      className="hover:bg-muted/50 transition-colors group cursor-pointer">
                      <td className="px-4 sm:px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate max-w-[150px] sm:max-w-[260px]">{batch.name}</p>
                            <p className="text-[11px] text-secondary">{formatRelative(batch.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/10 text-accent">
                          {batch._count.clients}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5">
                        <p className="text-[12px] text-secondary">{formatDate(batch.createdAt)}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(batch); }}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            aria-label="Delete batch">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/batch/${batch.id}`); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-accent bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors">
                            Open <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: upload + guide */}
        <div className="flex flex-col gap-3">
          <div ref={dropZoneRef}
            onClick={() => !file && fileInputRef.current?.click()}
            className={[
              "rounded-xl border-[1.5px] border-dashed transition-all duration-200 bg-card shadow-sm",
              isDragging ? "border-accent bg-accent/5" : file ? "border-border cursor-default" : "border-border hover:border-accent/50 cursor-pointer",
            ].join(" ")}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }} className="hidden" />
            {!file ? (
              <div className="flex flex-col items-center py-8 px-5 text-center">
                <div className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center mb-4 text-secondary">
                  <FileText className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-[13px] font-semibold text-foreground mb-1.5">{isDragging ? "Drop to import" : "Import a spreadsheet"}</p>
                <p className="text-[11px] text-secondary mb-4">
                  Drop an .xlsx file here, or <span className="text-accent underline underline-offset-2 font-medium">browse</span> · max 10 MB
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 mb-1.5">
                  {REQUIRED_COLUMNS.map((col) => (
                    <span key={col} className="px-2 py-0.5 rounded-md bg-surface border border-border text-[10px] font-mono text-secondary">{col}</span>
                  ))}
                </div>
                <p className="text-[10px] text-secondary/60">Required columns</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-[11px] text-secondary mb-3">{(file.size / 1024).toFixed(0)} KB</p>
                    <input type="text" value={batchName} onChange={(e) => setBatchName(e.target.value)}
                      placeholder="Batch name…"
                      className="w-full text-[12px] px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent transition-all" />
                    {validationError && (
                      <div className="flex items-start gap-1.5 mt-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-red-500 dark:text-red-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p className="text-[11px]">{validationError}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <button onClick={(e) => { e.stopPropagation(); clearFile(); }} className="text-[11px] text-secondary hover:text-foreground transition-colors">Remove</button>
                  <button onClick={(e) => { e.stopPropagation(); uploadMutation.mutate(); }}
                    disabled={uploadMutation.isPending}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent/90 text-white text-[12px] font-semibold rounded-lg disabled:opacity-60 transition-colors">
                    {uploadMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</> : <><Upload className="w-3.5 h-3.5" /> Import</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-[12px] font-semibold text-foreground mb-3">How it works</p>
            <div className="flex flex-col gap-3">
              {[["Import", "your client list from Excel"], ["Generate", "notices from your templates"], ["Send", "via Gmail or WhatsApp with one click"]].map(([bold, rest], i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                  <p className="text-[12px] text-secondary"><span className="text-foreground font-medium">{bold}</span> {rest}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmDialog
          name={deleteTarget.name}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}