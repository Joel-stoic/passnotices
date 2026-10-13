"use client";

import Link from "next/link";
import { Scale, Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <nav className="w-full fixed top-0 left-0 z-50 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-border transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Scale className="w-[20px] h-[20px] text-accent shrink-0" />
            <span className="font-serif text-[18px] font-semibold text-accent dark:text-foreground">
              PassNotice
            </span>
          </Link>

          {/* Desktop Links & Actions */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium text-secondary hover:text-foreground transition-colors duration-150"
            >
              Features
            </Link>
            <Link
              href="#whatsapp"
              className="text-sm font-medium text-secondary hover:text-foreground transition-colors duration-150"
            >
              WhatsApp
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-secondary hover:text-foreground transition-colors duration-150"
            >
              Pricing
            </Link>

            <div className="flex items-center gap-4 border-l border-border pl-6 ml-2">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="text-secondary hover:text-foreground transition-colors duration-150 p-1"
                  aria-label="Toggle Dark Mode"
                >
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}

              <Link
                href="/login"
                className="text-sm font-medium text-accent dark:text-foreground border border-accent dark:border-foreground px-4 py-2 rounded-sm hover:bg-accent hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors duration-150"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Mobile Right Bar (Theme toggle + Hamburger) */}
          <div className="flex md:hidden items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-secondary hover:text-foreground transition-colors duration-150 p-2"
                aria-label="Toggle Dark Mode"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-secondary hover:text-foreground p-2 rounded-md hover:bg-muted/40 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-white dark:bg-[#0A0A0A] px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-1">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-secondary hover:text-foreground hover:bg-muted/30 px-3 py-2.5 rounded-md transition-colors"
            >
              Features
            </Link>
            <Link
              href="#whatsapp"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-secondary hover:text-foreground hover:bg-muted/30 px-3 py-2.5 rounded-md transition-colors"
            >
              WhatsApp
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-secondary hover:text-foreground hover:bg-muted/30 px-3 py-2.5 rounded-md transition-colors"
            >
              Pricing
            </Link>
          </div>

          <div className="pt-3 border-t border-border">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center text-sm font-semibold text-accent dark:text-foreground border border-accent dark:border-foreground px-4 py-2.5 rounded-sm hover:bg-accent hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
