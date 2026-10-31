import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Download } from "lucide-react";

export function Hero() {
  return (
    <section className="relative w-full bg-background pt-24 sm:pt-28 md:pt-32 pb-14 sm:pb-20 md:pb-24 overflow-hidden">
      {/* Faint depth element — soft ambient legal navy aura */}
      <div
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[300px] sm:w-[450px] md:w-[600px] h-[300px] sm:h-[450px] md:h-[600px] rounded-full blur-3xl opacity-70"
        style={{ background: "radial-gradient(circle, rgba(26,54,93,0.06) 0%, rgba(26,54,93,0) 70%)" }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left Content */}
          <div className="flex flex-col items-start space-y-6 sm:space-y-7">
            <span className="text-accent text-[11px] sm:text-xs font-bold uppercase tracking-widest">
              Legal Notice Automation for Indian Advocates
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[64px] leading-[1.08] text-foreground">
              From Excel to Legal Notice — In Minutes.
            </h1>

            <p className="text-base md:text-lg text-secondary max-w-lg leading-[1.7]">
              Upload your debtor list. PassNotice selects the right legal template, fills every detail, and sends via your own Gmail and WhatsApp — automatically.
            </p>

            {/* Stat row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-4 text-xs font-semibold uppercase tracking-widest text-secondary">
              <span>500+ Notices Sent</span>
              <span className="text-border select-none">|</span>
              <span>5 Notice Types</span>
              <span className="text-border select-none">|</span>
              <span>Gmail + WhatsApp</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                href="/login"
                className="w-full sm:w-auto text-center bg-accent text-white px-6 py-3 rounded-sm font-medium hover:bg-accent/90 shadow-sm transition-all duration-150"
              >
                Start Free Trial
              </Link>
              <Link
                href="#how-it-works"
                className="w-full sm:w-auto text-center text-accent dark:text-foreground px-6 py-3 rounded-sm font-medium border border-border hover:border-accent hover:bg-surface/60 dark:hover:border-foreground transition-all duration-150"
              >
                See How It Works
              </Link>
            </div>
          </div>

          {/* Right Content — Enhanced Static Dashboard Mockup */}
          <div
            className="bg-card border border-border rounded-lg overflow-hidden shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-shadow"
          >
            {/* Card top bar */}
            <div className="flex justify-between items-center px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border bg-surface/60">
              <div>
                <span className="font-semibold text-sm text-foreground">Batch #482</span>
                <span className="text-secondary text-xs ml-2">24 Aug 2026</span>
              </div>
              <button className="text-xs font-medium text-accent dark:text-foreground border border-border bg-card px-3 py-1.5 rounded-sm hover:border-accent hover:bg-surface dark:hover:border-foreground transition-colors duration-150 flex items-center gap-1.5">
                <Download className="w-3 h-3" />
                Download All
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-4 sm:px-5 py-3 border-b border-border bg-card">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-secondary">18 of 24 sent</span>
                <span className="text-xs font-semibold text-foreground">75%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: "75%" }} />
              </div>
            </div>

            {/* Notice rows */}
            <div className="divide-y divide-border bg-card">
              {/* Row 1 */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-surface/50 transition-colors">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-foreground text-sm truncate">Rahul Sharma</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide text-accent dark:text-[#7CA2D0] bg-accent/10 dark:bg-[#1A2535] px-2 py-0.5 rounded-sm">
                      Sec 138
                    </span>
                    <span className="text-xs text-secondary font-medium">₹4,50,000</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:bg-success dark:text-white border border-emerald-500/20 dark:border-transparent px-2.5 py-1 rounded-full shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Sent
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-surface/50 transition-colors">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-foreground text-sm truncate">Priya Patel</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide text-accent dark:text-[#7CA2D0] bg-accent/10 dark:bg-[#1A2535] px-2 py-0.5 rounded-sm">
                      Sec 25
                    </span>
                    <span className="text-xs text-secondary font-medium">₹1,20,000</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:bg-[#888888] dark:text-white border border-amber-500/20 dark:border-transparent px-2.5 py-1 rounded-full shrink-0">
                  <Clock className="w-3 h-3" /> Pending
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-surface/50 transition-colors">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-foreground text-sm truncate">Vikram Singh</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide text-accent dark:text-[#7CA2D0] bg-accent/10 dark:bg-[#1A2535] px-2 py-0.5 rounded-sm">
                      Sec 138
                    </span>
                    <span className="text-xs text-secondary font-medium">₹8,90,000</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-500/10 text-red-700 dark:bg-error dark:text-white border border-red-500/20 dark:border-transparent px-2.5 py-1 rounded-full shrink-0">
                  <XCircle className="w-3 h-3" /> Failed
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
