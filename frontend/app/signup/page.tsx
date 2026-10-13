import { SignupForm } from "@/components/signup-form";
import { Scale, Check } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account — PassNotice",
  description: "Sign up for PassNotice and start automating legal notice delivery.",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">

      {/* Left Panel — identical navy brand panel */}
      <div className="w-full lg:w-[45%] bg-[#1C3557] text-white p-6 sm:p-8 lg:p-16 flex flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-8 sm:mb-12 lg:mb-16 w-fit">
            <Scale className="w-7 h-7 sm:w-8 sm:h-8 text-white shrink-0" />
            <span className="font-serif text-xl sm:text-2xl font-bold">
              PassNotice
            </span>
          </Link>

          <p className="font-serif text-2xl sm:text-3xl lg:text-5xl leading-tight mb-6 sm:mb-10 lg:mb-12">
            &quot;Legal precision, automated.&quot;
          </p>

          <ul className="space-y-3 sm:space-y-4 opacity-90 text-sm lg:text-base">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5 text-blue-200" />
              <span>Your own Gmail — no shared inboxes</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5 text-blue-200" />
              <span>WhatsApp delivery with per-notice tracking</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5 text-blue-200" />
              <span>14-day free trial — no credit card needed</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5 text-blue-200" />
              <span>Your data is fully isolated to your account</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 sm:mt-12 lg:mt-0 opacity-80 text-xs sm:text-sm">
          Trusted by advocates across Tamil Nadu
        </div>
      </div>

      {/* Right Panel — signup form */}
      <div className="w-full lg:w-[55%] bg-background flex items-center justify-center p-6 sm:p-8 lg:p-16 min-h-0 sm:min-h-[600px]">
        <SignupForm />
      </div>

    </div>
  );
}
