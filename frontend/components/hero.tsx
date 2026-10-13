import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Download } from "lucide-react";

export function Hero() {
  return (
    <section className="relative w-full bg-white dark:bg-background pt-24 sm:pt-28 md:pt-32 pb-14 sm:pb-20 md:pb-24 overflow-hidden">
      {/* Faint depth element — NOT a gradient, just a very low opacity circle shape */}
      <div
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[300px] sm:w-[450px] md:w-[600px] h-[300px] sm:h-[450px] md:h-[600px] rounded-full"
        style={{ background: "rgba(28,53,87,0.03)" }}
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
                className="w-full sm:w-auto text-center bg-accent text-white px-6 py-3 rounded-sm font-medium hover:bg-accent/90 transition-colors duration-150"
              >
                Start Free Trial
              </Link>
              <Link
                href="#how-it-works"
                className="w-full sm:w-auto text-center text-accent dark:text-foreground px-6 py-3 rounded-sm font-medium border border-border hover:border-accent dark:hover:border-foreground transition-colors duration-150"
              >
                See How It Works
              </Link>
            </div>
          </div>

          {/* Right Content — Enhanced Static Dashboard Mockup */}
          <div
            className="bg-surface dark:bg-[#111111] border border-border rounded-sm overflow-hidden"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
          >
            {/* Card top bar */}
            <div className="flex justify-between items-center px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border bg-background dark:bg-[#0A0A0A]">
              <div>
                <span className="font-semibold text-sm text-foreground">Batch #482</span>
                <span className="text-secondary text-xs ml-2">24 Aug 2026</span>
              </div>
              <button className="text-xs font-medium text-accent dark:text-foreground border border-border px-3 py-1.5 rounded-sm hover:border-accent dark:hover:border-foreground transition-colors duration-150 flex items-center gap-1.5">
                <Download className="w-3 h-3" />
                Download All
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-4 sm:px-5 py-3 border-b border-border bg-background dark:bg-[#0A0A0A]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-secondary">18 of 24 sent</span>
                <span className="text-xs text-secondary">75%</span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: "75%" }} />
              </div>
            </div>

            {/* Notice rows */}
            <div className="divide-y divide-border">
              {/* Row 1 */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-foreground text-sm truncate">Rahul Sharma</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide text-accent dark:text-[#7CA2D0] bg-[#EEF2F7] dark:bg-[#1A2535] px-2 py-0.5 rounded-sm">
                      Sec 138
                    </span>
                    <span className="text-xs text-secondary">₹4,50,000</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-success text-white px-2.5 py-1 rounded-full shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Sent
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-foreground text-sm truncate">Priya Patel</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide text-accent dark:text-[#7CA2D0] bg-[#EEF2F7] dark:bg-[#1A2535] px-2 py-0.5 rounded-sm">
                      Sec 25
                    </span>
                    <span className="text-xs text-secondary">₹1,20,000</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#888888] text-white px-2.5 py-1 rounded-full shrink-0">
                  <Clock className="w-3 h-3" /> Pending
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-foreground text-sm truncate">Vikram Singh</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide text-accent dark:text-[#7CA2D0] bg-[#EEF2F7] dark:bg-[#1A2535] px-2 py-0.5 rounded-sm">
                      Sec 138
                    </span>
                    <span className="text-xs text-secondary">₹8,90,000</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-error text-white px-2.5 py-1 rounded-full shrink-0">
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
