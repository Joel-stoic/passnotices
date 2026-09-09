import { Upload, FileSignature, Variable, Mail, MessageSquare, CheckSquare } from "lucide-react";
import type { ReactNode } from "react";

interface Feature {
  title: string;
  description: string;
  micro: string;
  icon: ReactNode;
}

export function Features() {
  const features: Feature[] = [
    {
      title: "Excel Import",
      description: "Upload any debtor list, any column structure. Map columns intuitively.",
      micro: "Supports .xlsx and .xls",
      icon: <Upload className="w-5 h-5 text-accent" />,
    },
    {
      title: "5 Notice Templates",
      description: "Section 25, 138 NI Act, and more — auto-selected by Notice Type.",
      micro: "Section 25 · Section 138 NI Act · and more",
      icon: <FileSignature className="w-5 h-5 text-accent" />,
    },
    {
      title: "Placeholder Replacement",
      description: "{{NAME}}, {{AMOUNT}}, {{DATE}} filled automatically, formatting preserved.",
      micro: "Original Word formatting is preserved",
      icon: <Variable className="w-5 h-5 text-accent" />,
    },
    {
      title: "Gmail Integration",
      description: "Send notices from your own Gmail. We only request send permission and never read your mailbox.",
      micro: "OAuth 2.0 — no password stored",
      icon: <Mail className="w-5 h-5 text-accent" />,
    },
    {
      title: "WhatsApp Business",
      description: "Send via Meta Cloud API from your own number with templates.",
      micro: "Meta Cloud API — your number, your account",
      icon: <MessageSquare className="w-5 h-5 text-accent" />,
    },
    {
      title: "Send Tracking",
      description: "Per-notice status: Sent, Delivered, Failed — per channel.",
      micro: "Track Gmail and WhatsApp separately",
      icon: <CheckSquare className="w-5 h-5 text-accent" />,
    },
  ];

  return (
    <section id="features" className="w-full bg-[#F8F8F6] dark:bg-[#111111] py-24 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header with bottom border */}
        <div className="border-b border-border pb-8 mb-12">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground text-left">
            Everything an Advocate Needs
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-background dark:bg-[#0A0A0A] border border-border p-8 rounded-sm hover:border-accent/30 dark:hover:border-accent/40 transition-colors duration-150"
            >
              {/* Icon container */}
              <div className="w-12 h-12 flex items-center justify-center bg-[#EEF2F7] dark:bg-[#1A2535] rounded-sm mb-5">
                {feature.icon}
              </div>

              <h3 className="font-semibold text-foreground text-[16px] mb-2">
                {feature.title}
              </h3>
              <p className="text-secondary text-sm leading-[1.7] mb-3">
                {feature.description}
              </p>
              <p className="text-xs text-secondary/60 dark:text-secondary/70">
                {feature.micro}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
