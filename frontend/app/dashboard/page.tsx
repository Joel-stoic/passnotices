"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, AlertCircle, Trash2, ChevronRight,
  Upload, Users, FolderOpen,
  FileSpreadsheet, AlertTriangle, Clock, FileText,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { apiGetBatches, apiDeleteBatch, type Batch } from "@/lib/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const REQUIRED_COLUMNS = ["NAME", "BOUNCE AMOUNT", "BOUNCE DATE", "EMAIL ID", "MOBILE NO"];

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("passnotice_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
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

function DeleteConfirmDialog({
  name, onConfirm, onCancel, loading,
}: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-[#141418] border border-[#222228] rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Delete batch?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">&ldquo;{name}&rdquo;</span> and all its clients and notices will be permanently deleted.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-70"
          >
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchesError, setBatchesError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setLoadingBatches(true);
      setBatchesError("");
      const data = await apiGetBatches();
      setBatches(data);
    } catch (err: unknown) {
      setBatchesError(err instanceof Error ? err.message : "Failed to load batches");
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  useEffect(() => {
    const zone = dropZoneRef.current;
    if (!zone) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e: DragEvent) => {
      if (!zone.contains(e.relatedTarget as Node)) setIsDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
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
  }, []);

  const selectFile = (selected: File) => {
    setFile(selected);
    setValidationError(null);
    const base = selected.name.replace(/\.(xlsx|xls)$/i, "");
    const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    setBatchName(`${base} — ${date}`);
  };

  const clearFile = () => {
    setFile(null);
    setBatchName("");
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setValidationError(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets[wb.SheetNames[0]], { defval: "" }
      );
      if (rows.length === 0) { setValidationError("File has no data rows."); return; }
      const missing = REQUIRED_COLUMNS.filter((c) => !Object.keys(rows[0]).includes(c));
      if (missing.length > 0) { setValidationError(`Missing columns: ${missing.join(", ")}`); return; }
    } catch {
      setValidationError("Could not read file. Make sure it's a valid .xlsx or .xls.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (batchName.trim()) formData.append("batchName", batchName.trim());
      const res = await fetch(`${BASE_URL}/api/excel/upload`, {
        method: "POST", headers: authHeaders(), body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
      toast.success(`Imported ${data.importedClients} clients`);
      router.push(`/batch/${data.batchId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiDeleteBatch(deleteTarget.id);
      setBatches((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast.success("Batch deleted");
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const totalClients = batches.reduce((s, b) => s + b._count.clients, 0);

  if (loadingBatches) {
    return (
      <DashboardLayout activeNav="dashboard">
        <div className="grid grid-cols-3 gap-3 mb-7">
          {[1,2,3].map(i => <div key={i} className="h-[88px] rounded-xl bg-muted/20 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-[1fr_380px] gap-5">
          <div className="h-[300px] rounded-xl bg-muted/20 animate-pulse" />
          <div className="h-[220px] rounded-xl bg-muted/20 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeNav="dashboard">

      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-[22px] font-serif font-semibold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-1">Manage your client batches and notice delivery.</p>
      </div>

      {/* Stats */}
      {batches.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-7">
          <div className="bg-[#141418] border border-[#222228] rounded-xl px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">Batches</span>
            </div>
            <p className="text-[26px] font-semibold text-foreground leading-none tracking-tight">{batches.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">Total imports</p>
          </div>
          <div className="bg-[#141418] border border-[#222228] rounded-xl px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">Total clients</span>
            </div>
            <p className="text-[26px] font-semibold text-foreground leading-none tracking-tight">{totalClients}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">Across all batches</p>
          </div>
          <div className="bg-[#141418] border border-[#222228] rounded-xl px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">Last import</span>
            </div>
            <p className="text-[18px] font-semibold text-foreground leading-none tracking-tight mt-1">{formatRelative(batches[0].createdAt)}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{formatDate(batches[0].createdAt)}</p>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_360px] gap-5 items-start">

        {/* Left: batch list */}
        <div className="bg-[#141418] border border-[#222228] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a20]">
            <span className="text-[13px] font-semibold text-foreground">Recent uploads</span>
            <span className="text-[11px] text-muted-foreground bg-[#222228] px-2.5 py-0.5 rounded-full">
              {batches.length} {batches.length === 1 ? "batch" : "batches"}
            </span>
          </div>

          {batchesError ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400">{batchesError}</p>
              <button onClick={fetchBatches} className="text-xs font-medium text-primary hover:underline">Retry</button>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
              <FolderOpen className="w-8 h-8 text-muted-foreground/20 mb-1" />
              <p className="text-sm font-semibold text-foreground">No batches yet</p>
              <p className="text-xs text-muted-foreground">Import a spreadsheet to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.02] border-b border-[#1a1a20]">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Batch</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Clients</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Uploaded</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a20]">
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    onClick={() => router.push(`/batch/${batch.id}`)}
                    className="hover:bg-blue-500/[0.04] transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-foreground truncate max-w-[260px]">{batch.name}</p>
                          <p className="text-[11px] text-muted-foreground">{formatRelative(batch.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400">
                        {batch._count.clients}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[12px] text-muted-foreground">{formatDate(batch.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(batch); }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/batch/${batch.id}`); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                        >
                          Open <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: upload + guide */}
        <div className="flex flex-col gap-3">

          {/* Upload zone */}
          <div
            ref={dropZoneRef}
            onClick={() => !file && fileInputRef.current?.click()}
            className={[
              "rounded-xl border-[1.5px] border-dashed transition-all duration-200 bg-[#141418]",
              isDragging ? "border-blue-400 bg-blue-500/5" : file ? "border-[#222228] cursor-default" : "border-[#222228] hover:border-blue-400/50 hover:bg-blue-500/[0.02] cursor-pointer",
            ].join(" ")}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />

            {!file ? (
              <div className="flex flex-col items-center py-8 px-5 text-center">
                <div className="w-11 h-11 rounded-xl bg-[#1a1a20] border border-[#222228] flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-[13px] font-semibold text-foreground mb-1.5">
                  {isDragging ? "Drop to import" : "Import a spreadsheet"}
                </p>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Drop an .xlsx or .xls file here, or{" "}
                  <span className="text-blue-400 underline underline-offset-2">browse</span>
                  {" "}· max 10 MB
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 mb-1.5">
                  {REQUIRED_COLUMNS.map((col) => (
                    <span key={col} className="px-2 py-0.5 rounded-md bg-[#1a1a20] border border-[#222228] text-[10px] font-mono text-muted-foreground">
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/40">Required columns</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground mb-3">{(file.size / 1024).toFixed(0)} KB</p>
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="Batch name…"
                      className="w-full text-[12px] px-3 py-2 rounded-lg border border-[#222228] bg-[#0c0c0f] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400/40 transition-all"
                    />
                    {validationError && (
                      <div className="flex items-start gap-1.5 mt-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p className="text-[11px]">{validationError}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1a20]">
                  <button onClick={(e) => { e.stopPropagation(); clearFile(); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                    Remove
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-semibold rounded-lg disabled:opacity-60 transition-colors"
                  >
                    {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</> : <><Upload className="w-3.5 h-3.5" /> Import</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-[#141418] border border-[#222228] rounded-xl p-4">
            <p className="text-[12px] font-semibold text-foreground mb-3">How it works</p>
            <div className="flex flex-col gap-3">
              {[
                ["Import", "your client list from Excel"],
                ["Generate", "notices from your templates"],
                ["Send", "via Gmail or WhatsApp with one click"],
              ].map(([bold, rest], i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/25 text-[10px] font-bold text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">{bold}</span> {rest}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmDialog
          name={deleteTarget.name}
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

    </DashboardLayout>
  );
}