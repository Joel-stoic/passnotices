import { Table2, FileText, Send } from "lucide-react";
import type { ReactNode } from "react";

interface Step {
  number: string;
  title: string;
  description: string;
  result: string;
  icon: ReactNode;
}

export function HowItWorks() {
  const steps: Step[] = [
    {
      number: "01",
      title: "Upload Excel",
      description: "Upload any debtor list, with any column structure.",
      result: "Excel uploaded in under 10 seconds",
      icon: <Table2 className="w-6 h-6 text-accent relative z-10" />,
    },
    {
      number: "02",
      title: "Auto-generate Notices",
      description: "Select the legal template and let us fill every detail.",
      result: "Notice generated, formatted, ready to review",
      icon: <FileText className="w-6 h-6 text-accent relative z-10" />,
    },
    {
      number: "03",
      title: "Send via Gmail + WhatsApp",
      description: "Send automatically and track delivery statuses.",
      result: "Delivered to inbox and WhatsApp simultaneously",
      icon: <Send className="w-6 h-6 text-accent relative z-10" />,
    },
  ];

  return (
    <section id="how-it-works" className="w-full bg-background py-24 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif text-3xl md:text-4xl text-foreground text-left mb-16">
          Three Steps to Send 500 Notices
        </h2>

        <div className="flex flex-col md:flex-row items-stretch justify-between gap-0 relative">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-1 items-stretch relative">
              {/* Step Card */}
              <div className="flex-1 bg-background border border-border border-t-2 border-t-accent p-8 relative overflow-hidden">
                {/* Watermark number */}
                <span
                  className="absolute bottom-4 right-4 font-serif font-bold text-foreground select-none pointer-events-none"
                  style={{ fontSize: "72px", lineHeight: 1, opacity: 0.08 }}
                  aria-hidden="true"
                >
                  {step.number}
                </span>

                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon */}
                  <div className="mb-6">{step.icon}</div>

                  <h3 className="font-semibold text-foreground text-[16px] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-secondary text-sm leading-[1.7] mb-4">
                    {step.description}
                  </p>
                  <p className="text-xs italic text-secondary/70 dark:text-secondary mt-auto">
                    {step.result}
                  </p>
                </div>
              </div>

              {/* Arrow connector on desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex items-center self-center relative z-10 -mx-px">
                  <div className="w-8 h-px bg-border" />
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    className="text-border"
                  >
                    <path d="M0 5H8M8 5L4 1M8 5L4 9" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
