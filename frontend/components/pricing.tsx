"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X, Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "Can I use my own Gmail account?",
    answer:
      "Yes. We use Google OAuth 2.0 to send from your Gmail account. PassNotice never stores your password or has permanent access — only a limited-scope token for sending.",
  },
  {
    question: "What notice types are supported?",
    answer:
      "Currently we support Section 25 (Contract Act), Section 138 NI Act (cheque bounce), money recovery notices, and demand letters. More templates are being added regularly.",
  },
  {
    question: "Is my client data secure?",
    answer:
      "Each advocate's data is fully isolated. We never share or cross-reference data between accounts. Your debtor lists, generated notices, and delivery logs are accessible only to you.",
  },
];

export function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const rows = [
    { feature: "Advocates",         starter: "1 Advocate",        firm: "Up to 5 Advocates",  starterCheck: null, firmCheck: null },
    { feature: "Notices / month",   starter: "Up to 500",         firm: "Unlimited",           starterCheck: null, firmCheck: null },
    { feature: "Notice Templates",  starter: null,                firm: null,                  starterCheck: true, firmCheck: true },
    { feature: "Gmail Sending",     starter: null,                firm: null,                  starterCheck: true, firmCheck: true },
    { feature: "WhatsApp Sending",  starter: null,                firm: null,                  starterCheck: true, firmCheck: true },
    { feature: "Send Tracking",     starter: null,                firm: null,                  starterCheck: true, firmCheck: true },
    { feature: "Multiple Users",    starter: null,                firm: null,                  starterCheck: false, firmCheck: true },
    { feature: "Support",           starter: "Email",             firm: "Priority",            starterCheck: null, firmCheck: null },
  ];

  return (
    <section id="pricing" className="w-full bg-background py-24 border-t border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Eyebrow */}
        <p className="text-xs font-bold uppercase tracking-widest text-accent mb-4 text-left">
          Pricing
        </p>

        <h2 className="font-serif text-3xl md:text-4xl text-foreground text-left mb-14">
          Simple Pricing for Every Practice
        </h2>

        {/* Table */}
        <div className="border border-border rounded-sm overflow-hidden mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F8F6] dark:bg-[#111111] border-b border-border">
                <th className="p-6 font-semibold text-foreground text-sm w-2/5"></th>

                {/* Starter column */}
                <th className="p-6 border-l border-border w-[30%]">
                  <div className="font-serif text-2xl text-foreground mb-1">Starter</div>
                  <div className="text-sm text-secondary">₹999 / month</div>
                </th>

                {/* Firm column — highlighted */}
                <th className="p-6 border-l-2 border-r-2 border-t-2 border-accent w-[30%] relative">
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-b-sm">
                    Most Popular
                  </span>
                  <div className="font-serif text-2xl text-foreground mb-1 mt-2">Firm</div>
                  <div className="text-sm text-secondary">₹2,999 / month</div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm text-secondary">
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-t border-border ${i % 2 === 0 ? "bg-white dark:bg-[#0A0A0A]" : "bg-[#FAFAFA] dark:bg-[#111111]"}`}
                >
                  <td className="p-5 font-medium text-foreground">{row.feature}</td>

                  {/* Starter cell */}
                  <td className="p-5 border-l border-border">
                    {row.starterCheck === true && (
                      <Check className="w-4 h-4 text-success" />
                    )}
                    {row.starterCheck === false && (
                      <X className="w-4 h-4 text-error/60" />
                    )}
                    {row.starterCheck === null && row.starter}
                  </td>

                  {/* Firm cell */}
                  <td className="p-5 border-l-2 border-r-2 border-accent">
                    {row.firmCheck === true && (
                      <Check className="w-4 h-4 text-success" />
                    )}
                    {row.firmCheck === false && (
                      <X className="w-4 h-4 text-error/60" />
                    )}
                    {row.firmCheck === null && row.firm}
                  </td>
                </tr>
              ))}

              {/* CTA row */}
              <tr className="border-t border-border bg-[#F8F8F6] dark:bg-[#111111]">
                <td className="p-5" />
                <td className="p-5 border-l border-border">
                  <Link
                    href="/login"
                    className="block w-full text-center py-2 px-4 border border-accent text-accent dark:border-foreground dark:text-foreground font-medium rounded-sm hover:bg-accent hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors duration-150"
                  >
                    Get Started
                  </Link>
                </td>
                <td className="p-5 border-l-2 border-r-2 border-b-2 border-accent">
                  <Link
                    href="/login"
                    className="block w-full text-center py-2 px-4 bg-accent text-white font-medium rounded-sm hover:bg-accent/90 transition-colors duration-150"
                  >
                    Get Started
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Trust line */}
        <div className="border-t border-border pt-6 mb-14 text-center">
          <p className="text-sm text-secondary">
            All plans include a <span className="font-semibold text-foreground">14-day free trial</span>. No credit card required.
          </p>
        </div>

        {/* FAQ */}
        <div className="space-y-0 border border-border rounded-sm overflow-hidden">
          {faqs.map((faq, i) => (
            <div key={i} className={`border-border ${i > 0 ? "border-t" : ""}`}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left bg-background dark:bg-[#0A0A0A] hover:bg-[#F8F8F6] dark:hover:bg-[#111111] transition-colors duration-150"
              >
                <span className="font-semibold text-foreground text-sm pr-4">{faq.question}</span>
                {openFaq === i ? (
                  <Minus className="w-4 h-4 shrink-0 text-accent" />
                ) : (
                  <Plus className="w-4 h-4 shrink-0 text-secondary" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 bg-background dark:bg-[#0A0A0A]">
                  <p className="text-sm text-secondary leading-[1.7]">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-secondary mt-10">
          Trusted by advocates across Tamil Nadu
        </p>
      </div>
    </section>
  );
}
