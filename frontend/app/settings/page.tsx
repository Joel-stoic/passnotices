"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Unlink,
  ExternalLink,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  apiGetGmailStatus,
  apiGetGmailConnectUrl,
  apiDisconnectGmail,
} from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GmailStatus {
  connected: boolean;
  emailAddress?: string;
  expiresAt?: string;
}

// ─── Banner component ─────────────────────────────────────────────────────────

function Banner({
  kind,
  message,
  onDismiss,
}: {
  kind: "success" | "error";
  message: string;
  onDismiss: () => void;
}) {
  const isSuccess = kind === "success";
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 px-4 py-3 rounded-sm border mb-6 ${
        isSuccess
          ? "bg-success/5 border-success/30 text-success"
          : "bg-error/5 border-error/30 text-error"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      )}
      <p className="text-sm flex-1 font-medium">{message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity duration-150"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Gmail Integration Card ───────────────────────────────────────────────────

function GmailCard() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError("");
    try {
      const s = await apiGetGmailStatus();
      setStatus(s);
    } catch (e: unknown) {
      setStatusError(e instanceof Error ? e.message : "Failed to load Gmail status");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setActionError("");
    try {
      const url = await apiGetGmailConnectUrl();
      window.location.href = url;
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Could not initiate Gmail connection");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setActionError("");
    try {
      await apiDisconnectGmail();
      await fetchStatus();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to disconnect Gmail");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-border bg-[#F8F8F6] dark:bg-[#111111] flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-[#EEF2F7] dark:bg-[#1A2535] rounded-sm">
          <Mail className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">Gmail Integration</h2>
          <p className="text-xs text-secondary">
            Connect your Gmail account to send legal notices directly from your inbox
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="px-6 py-6 bg-background">
        {/* Loading skeleton */}
        {loadingStatus && (
          <div className="flex items-center gap-2 text-secondary text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking connection…
          </div>
        )}

        {/* Status fetch error */}
        {statusError && (
          <div className="flex items-start gap-2 text-sm text-error border border-error/30 bg-error/5 px-4 py-3 rounded-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {statusError}
          </div>
        )}

        {/* Status loaded */}
        {!loadingStatus && status && (
          <div className="space-y-5">
            {/* Status indicator row */}
            <div className="flex items-center gap-3 py-3 px-4 border border-border rounded-sm bg-[#F8F8F6] dark:bg-[#111111]">
              {status.connected ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Connected</p>
                    <p className="text-xs text-secondary truncate mt-0.5">
                      {status.emailAddress}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-border shrink-0" />
                  <p className="text-sm text-secondary flex-1">Not connected</p>
                </>
              )}
            </div>

            {/* Action error */}
            {actionError && (
              <div className="flex items-start gap-2 text-sm text-error border border-error/30 bg-error/5 px-4 py-3 rounded-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {actionError}
              </div>
            )}

            {/* Action button */}
            {status.connected ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-2 text-sm font-medium text-error border border-error/30 px-4 py-2 rounded-sm hover:bg-error/5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
                <p className="text-xs text-secondary">
                  Disconnecting will stop all email sending until you reconnect.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex items-center gap-2 text-sm font-semibold bg-accent text-white px-5 py-2.5 rounded-sm hover:bg-accent/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {connecting ? "Redirecting to Google…" : "Connect Gmail"}
                </button>
                <p className="text-xs text-secondary">
                  You&apos;ll be redirected to Google to authorize access.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [banner, setBanner] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  // Handle ?gmail=connected or ?gmail=error&msg=... query params
  useEffect(() => {
    const gmailParam = searchParams.get("gmail");
    const msgParam = searchParams.get("msg");

    if (gmailParam === "connected") {
      setBanner({ kind: "success", message: "Gmail connected successfully." });
      // Clean up the URL
      router.replace("/settings");
    } else if (gmailParam === "error") {
      const errorMsg = msgParam
        ? decodeURIComponent(msgParam)
        : "Gmail connection failed. Please try again.";
      setBanner({ kind: "error", message: errorMsg });
      router.replace("/settings");
    }
  }, [searchParams, router]);

  return (
    <DashboardLayout activeNav="settings">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-1">
          Settings
        </h1>
        <p className="text-sm text-secondary">
          Manage integrations and account preferences.
        </p>
      </div>

      {/* Query-param banner */}
      {banner && (
        <Banner
          kind={banner.kind}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Gmail Integration */}
      <GmailCard />
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-secondary text-sm">Loading…</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
