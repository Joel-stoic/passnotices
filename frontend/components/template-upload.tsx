"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X, Loader2, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";

// Matches the valid notice types used across the backend
const NOTICE_TYPES = [
  { value: "SECTION_25", label: "Section 25 — Contract Act" },
  { value: "SECTION_138", label: "Section 138 — NI Act (Cheque Bounce)" },
  { value: "MONEY_RECOVERY", label: "Money Recovery Notice" },
  { value: "DEMAND_NOTICE", label: "General Demand Notice" },
  { value: "LEGAL_NOTICE", label: "General Legal Notice" },
] as const;

type NoticeTypeValue = typeof NOTICE_TYPES[number]["value"] | "";

interface TemplateResult {
  id: string;
  tenantId: string;
  noticeType: string;
  fileUrl: string;
  createdAt: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function TemplateUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [noticeType, setNoticeType] = useState<NoticeTypeValue>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<TemplateResult | null>(null);

  const reset = () => {
    setError("");
    setSuccess(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    reset();
  };

  const handleClearFile = () => {
    setFile(null);
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNoticeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNoticeType(e.target.value as NoticeTypeValue);
    reset();
  };

  const handleUpload = async () => {
    // Client-side validation
    if (!noticeType) {
      setError("Please select a notice type.");
      return;
    }
    if (!file) {
      setError("Please choose a .docx template file.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "docx") {
      setError("Only .docx files are accepted.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const token = localStorage.getItem("passnotice_token");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("noticeType", noticeType);

      const res = await fetch(`${BASE_URL}/api/templates`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // Do NOT set Content-Type — browser sets it automatically with boundary for multipart
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error?.formErrors?.[0] ??
              Object.values(data.error?.fieldErrors ?? {}).flat().join(". ") ??
              "Upload failed";
        throw new Error(msg);
      }

      setSuccess(data.template as TemplateResult);
      // Clear form on success
      setFile(null);
      setNoticeType("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };




  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-border bg-[#F8F8F6] dark:bg-[#111111] flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-[#EEF2F7] dark:bg-[#1A2535] rounded-sm">
          <FileText className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">Upload Notice Template</h2>
          <p className="text-xs text-secondary">.docx files only — one template per notice type</p>
        </div>
      </div>

      {/* Form body */}
      <div className="px-6 py-6 bg-background space-y-5">

        {/* Notice Type */}
        <div className="space-y-1.5">
          <label htmlFor="notice-type-select" className="block text-sm font-medium text-foreground">
            Notice Type
          </label>
          <div className="relative">
            <select
              id="notice-type-select"
              value={noticeType}
              onChange={handleNoticeTypeChange}
              className="w-full appearance-none px-4 py-2.5 pr-9 bg-background text-foreground border border-border rounded-sm outline-none text-sm transition-colors duration-150 focus:border-accent cursor-pointer"
            >
              <option value="" disabled>Select a notice type…</option>
              {NOTICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
          </div>
        </div>

        {/* File picker */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Template File (.docx)
          </label>

          <input
            ref={fileInputRef}
            id="template-file-input"
            type="file"
            accept=".docx"
            className="sr-only"
            onChange={handleFileChange}
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm font-medium border border-border px-4 py-2 rounded-sm text-secondary hover:border-accent hover:text-foreground transition-colors duration-150"
            >
              <UploadCloud className="w-4 h-4" />
              Choose .docx File
            </button>

            {/* Selected file display */}
            {file && (
              <div className="flex items-center gap-2 text-sm text-foreground border border-border rounded-sm px-3 py-2 min-w-0">
                <FileText className="w-4 h-4 text-accent shrink-0" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-secondary shrink-0">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="shrink-0 text-secondary hover:text-foreground transition-colors duration-150 ml-1"
                  aria-label="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading || !file || !noticeType}
            className="flex items-center gap-2 text-sm font-semibold bg-accent text-white px-6 py-2.5 rounded-sm hover:bg-accent/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Upload Template
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-6 mb-6 flex items-start gap-2 text-sm text-error border border-error/30 bg-error/5 px-4 py-3 rounded-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success state */}
      {success && (
        <div className="mx-6 mb-6 border border-success/30 bg-success/5 rounded-sm overflow-hidden">
          {/* Success header */}
          <div className="flex items-start gap-2 px-4 py-3 border-b border-success/20">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-success">
              Template uploaded successfully
            </p>
          </div>
          {/* Details */}
          <div className="px-4 py-3 space-y-1.5 text-xs text-secondary font-mono">
            <div className="flex gap-3">
              <span className="text-secondary/60 w-24 shrink-0">ID</span>
              <span className="text-foreground truncate">{success.id}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-secondary/60 w-24 shrink-0">Notice Type</span>
              <span className="text-foreground">{success.noticeType}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-secondary/60 w-24 shrink-0">Stored at</span>
              <span className="text-foreground truncate">{success.fileUrl}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
