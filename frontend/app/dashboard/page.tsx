"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, AlertCircle, Trash2, ChevronRight,
  Upload, Users, Calendar, FolderOpen,
  FileSpreadsheet, TrendingUp, AlertTriangle,
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

// ─── Delete confirm dialog ───────────────────────────────────────────────────

function DeleteConfirmDialog({
  name,
  onConfirm,
  onCancel,
  loading,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-[#111] border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Delete batch?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">&ldquo;{name}&rdquo;</span> and all its clients and notices will be permanently deleted. This cannot be undone.
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

// ─── Main dashboard page ──────────────────────────────────────────────────────

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

  // Delete flow
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

  // Drag-and-drop
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
    const date = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
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

    // Validate client-side
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets[wb.SheetNames[0]], { defval: "" }
      );
      if (rows.length === 0) {
        setValidationError("File has no data rows.");
        return;
      }
      const missing = REQUIRED_COLUMNS.filter((c) => !Object.keys(rows[0]).includes(c));
      if (missing.length > 0) {
        setValidationError(`Missing columns: ${missing.join(", ")}`);
        return;
      }
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

  // Derived stats
  const totalClients = batches.reduce((s, b) => s + b._count.clients, 0);

  if (loadingBatches) {
    return (
      <DashboardLayout activeNav="dashboard">
        <div className="space-y-8 max-w-4xl">
          <div className="h-[180px] rounded-xl bg-muted/30 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-[60px] bg-muted/20 rounded-lg animate-pulse" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeNav="dashboard">
      <div className="space-y-10 max-w-4xl">

        {/* ── Summary stats ─────────────────────────────── */}
        {batches.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-muted/10 px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-medium">Batches</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">{batches.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-medium">Clients</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">{totalClients}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-medium">Latest</span>
              </div>
              <p className="text-sm font-medium text-foreground truncate">
                {formatRelative(batches[0].createdAt)}
              </p>
            </div>
          </div>
        )}

        {/* ── Upload zone ───────────────────────────────── */}
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">Import clients</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a spreadsheet — one row per client.
            </p>
          </div>

          <div
            ref={dropZoneRef}
            onClick={() => !file && fileInputRef.current?.click()}
            className={[
              "rounded-xl border-2 border-dashed transition-all duration-200",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.005]"
                : file
                  ? "border-border bg-muted/10 cursor-default"
                  : "border-border/60 bg-muted/10 hover:border-border hover:bg-muted/20 cursor-pointer",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {!file ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mb-5">
                  <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {isDragging ? "Drop to import" : "Drop your spreadsheet here"}
                </p>
                <p className="text-xs text-muted-foreground mb-5">
                  or <span className="text-primary underline underline-offset-2">browse files</span> · .xlsx or .xls · max 10 MB
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {REQUIRED_COLUMNS.map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 rounded-md bg-muted/50 border border-border/60 text-[10px] font-mono text-muted-foreground"
                    >
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-2">Required columns</p>
              </div>
            ) : (
              /* File selected state */
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                        Batch name
                      </label>
                      <input
                        type="text"
                        value={batchName}
                        onChange={(e) => setBatchName(e.target.value)}
                        placeholder="Name this import…"
                        className="w-full max-w-sm text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>

                    {validationError && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p className="text-xs">{validationError}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {uploading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                        : <><Upload className="w-4 h-4" /> Import</>}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Remove file
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Batch list ────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent uploads</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {batches.length === 0
                  ? "No batches yet"
                  : `${batches.length} ${batches.length === 1 ? "batch" : "batches"}`}
              </p>
            </div>
          </div>

          {batchesError ? (
            <div className="flex flex-col items-center gap-3 py-12 rounded-xl border border-border">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400">{batchesError}</p>
              <button
                onClick={fetchBatches}
                className="text-xs font-medium text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 py-16 border border-dashed border-border/60 rounded-xl text-center">
              <FolderOpen className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-foreground">No batches yet</p>
              <p className="text-xs text-muted-foreground">Import a spreadsheet above to get started.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Batch</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3 h-3" /> Clients
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Uploaded
                      </span>
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {batches.map((batch) => (
                    <tr
                      key={batch.id}
                      onClick={() => router.push(`/batch/${batch.id}`)}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[240px]" title={batch.name}>
                            {batch.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          <Users className="w-3 h-3" />
                          {batch._count.clients}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-xs text-foreground">{formatDate(batch.createdAt)}</p>
                          <p className="text-[10px] text-muted-foreground">{formatRelative(batch.createdAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(batch);
                            }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Delete batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/batch/${batch.id}`);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* ── Delete confirm dialog ──────────────────────── */}
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