import Link from "next/link";
import { Scale } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-background border-t border-border py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Three-column main row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 py-8">

          {/* Brand */}
          <div className="flex flex-col space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-accent" />
              <span className="font-serif text-lg font-semibold text-accent dark:text-foreground">
                PassNotice
              </span>
            </Link>
            <p className="text-sm text-secondary leading-[1.7]">
              Legal notice automation for Indian advocates.
            </p>
            <p className="text-sm text-secondary">Made in India 🇮🇳</p>
          </div>

          {/* Links */}
          <div className="flex flex-col space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-1">Quick Links</p>
            <Link href="#features" className="text-sm text-secondary hover:text-foreground transition-colors duration-150">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-secondary hover:text-foreground transition-colors duration-150">
              Pricing
            </Link>
            <Link href="/login" className="text-sm text-secondary hover:text-foreground transition-colors duration-150">
              Login
            </Link>
            <Link href="/privacy" className="text-sm text-secondary hover:text-foreground transition-colors duration-150">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-secondary hover:text-foreground transition-colors duration-150">
              Terms
            </Link>
          </div>

          {/* Contact */}
          <div className="flex flex-col space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-1">Contact</p>
            <a href="mailto:hello@passnotice.com" className="text-sm text-secondary hover:text-foreground transition-colors duration-150">
              hello@passnotice.com
            </a>
            <a href="https://wa.me/919999999999" className="text-sm text-secondary hover:text-foreground transition-colors duration-150">
              WhatsApp: +91 99999 99999
            </a>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-secondary">
            © 2026 PassNotice. All rights reserved.
          </p>
          <p className="text-xs text-secondary">
            Built for Indian Advocates
          </p>
        </div>

      </div>
    </footer>
  );
}
