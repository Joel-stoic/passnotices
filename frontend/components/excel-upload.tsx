"use client";

import { useRef, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

interface ExcelRow {
  [key: string]: unknown;
}

interface Client {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  data: ExcelRow;
}

interface UploadResult {
  sheetName: string;
  totalRows: number;
  importedClients: number;
  clients: Client[];
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function ExcelUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = e.target.files?.[0] ?? null;

    setFile(selected);
    setError("");
    setResult(null);
  };

  const handleClear = () => {
    setFile(null);
    setError("");
    setResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an Excel file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const token = localStorage.getItem("passnotice_token");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${BASE_URL}/api/excel/upload`, {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Upload failed"
        );
      }

      setResult(data as UploadResult);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  // Get Excel columns from the complete Excel row
  const columns =
    result?.clients.length
      ? Object.keys(result.clients[0].data)
      : [];

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-border bg-[#F8F8F6] dark:bg-[#111111] flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-[#EEF2F7] dark:bg-[#1A2535] rounded-sm">
          <FileSpreadsheet className="w-4 h-4 text-accent" />
        </div>

        <div>
          <h2 className="font-semibold text-foreground text-sm">
            Upload Excel
          </h2>

          <p className="text-xs text-secondary">
            Import client data — .xlsx / .xls, max 10 MB
          </p>
        </div>
      </div>

      {/* Upload controls */}
      <div className="px-6 py-5 bg-background flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Hidden input */}
        <input
          ref={fileInputRef}
          id="excel-file-input"
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={handleFileChange}
        />

        {/* Choose file */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-sm font-medium border border-border px-4 py-2 rounded-sm text-secondary hover:border-accent hover:text-foreground transition-colors duration-150"
        >
          <UploadCloud className="w-4 h-4" />
          Choose Excel File
        </button>

        {/* Selected file */}
        {file && (
          <div className="flex items-center gap-2 text-sm text-foreground border border-border rounded-sm px-3 py-2 min-w-0">
            <FileSpreadsheet className="w-4 h-4 text-accent shrink-0" />

            <span className="truncate max-w-[180px]">
              {file.name}
            </span>

            <span className="text-xs text-secondary shrink-0">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>

            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 text-secondary hover:text-foreground transition-colors duration-150 ml-1"
              aria-label="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Upload */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={loading || !file}
          className="flex items-center gap-2 text-sm font-semibold bg-accent text-white px-5 py-2 rounded-sm hover:bg-accent/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              Upload &amp; Import
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-5 flex items-start gap-2 text-sm text-error border border-error/30 bg-error/5 px-4 py-3 rounded-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />

          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="border-t border-border">
          {/* Summary */}
          <div className="px-6 py-3 bg-[#F8F8F6] dark:bg-[#111111] flex flex-wrap items-center gap-4 text-xs text-secondary border-b border-border">
            <span>
              Sheet:{" "}
              <span className="font-semibold text-foreground font-mono">
                {result.sheetName}
              </span>
            </span>

            <span>
              Imported clients:{" "}
              <span className="font-semibold text-foreground">
                {result.importedClients}
              </span>
            </span>

            <span>
              Columns:{" "}
              <span className="font-semibold text-foreground">
                {columns.length}
              </span>
            </span>

            <span className="ml-auto inline-flex items-center gap-1.5 text-success font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Imported successfully
            </span>
          </div>

          {/* Table */}
          {columns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#F8F8F6] dark:bg-[#111111] border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider w-10 border-r border-border">
                      #
                    </th>

                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap border-r border-border last:border-r-0"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {result.clients.map((client, i) => (
                    <tr
                      key={client.id}
                      className={
                        i % 2 === 0
                          ? "bg-white dark:bg-[#0A0A0A]"
                          : "bg-[#FAFAFA] dark:bg-[#111111]"
                      }
                    >
                      <td className="px-4 py-2.5 text-xs text-secondary font-mono border-r border-border">
                        {i + 1}
                      </td>

                      {columns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap border-r border-border last:border-r-0"
                        >
                          {String(client.data[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-6 text-sm text-secondary">
              No clients found in this sheet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}