import { LoginForm } from "@/components/login-form";
import { Scale, Check } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — PassNotice",
  description: "Sign in to your PassNotice account to manage legal notices.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">

      {/* Left Panel */}
      <div className="w-full lg:w-[45%] bg-[#1C3557] text-white p-8 lg:p-16 flex flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-16 w-fit">
            <Scale className="w-8 h-8 text-white" />
            <span className="font-serif text-2xl font-bold">
              PassNotice
            </span>
          </Link>

          <p className="font-serif text-4xl lg:text-5xl leading-tight mb-12">
            &quot;Legal precision, automated.&quot;
          </p>

          <ul className="space-y-4 opacity-90 text-sm lg:text-base">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5" />
              <span>Send notices via your own Gmail</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5" />
              <span>WhatsApp delivery with tracking</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5" />
              <span>Your data, your templates, your account</span>
            </li>
          </ul>
        </div>

        <div className="mt-16 lg:mt-0 opacity-80 text-sm">
          Trusted by advocates across Tamil Nadu
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-[55%] bg-background flex items-center justify-center p-8 lg:p-16">
        <LoginForm />
      </div>

    </div>
  );
}
