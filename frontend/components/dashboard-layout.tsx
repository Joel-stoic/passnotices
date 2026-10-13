"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scale, LogOut, LayoutDashboard, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { clearSession, getStoredUser, type AuthUser } from "@/lib/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeNav?: "dashboard" | "settings";
}

export function DashboardLayout({ children, activeNav }: DashboardLayoutProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredUser();
    const token = localStorage.getItem("passnotice_token");
    if (!stored || !token) {
      router.replace("/login");
      return;
    }
    setUser(stored);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-secondary text-sm">Loading…</p>
      </div>
    );
  }

  const navLink = (
    href: string,
    key: string,
    icon: React.ReactNode,
    label: string,
    isMobile?: boolean
  ) => {
    const isActive = activeNav === key;
    return (
      <Link
        href={href}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 ${
          isMobile
            ? `py-3 border-b-2 -mb-[1px] ${
                isActive
                  ? "border-accent text-foreground font-semibold"
                  : "border-transparent text-secondary hover:text-foreground"
              }`
            : `py-5 -mb-[1px] border-b-2 ${
                isActive
                  ? "border-accent text-foreground"
                  : "border-transparent text-secondary hover:text-foreground"
              }`
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="w-full border-b border-border bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-4 sm:mr-8 shrink-0">
            <Scale className="w-[20px] h-[20px] text-accent shrink-0" />
            <span className="font-serif text-[18px] font-semibold text-accent dark:text-foreground">
              PassNotice
            </span>
          </Link>

          {/* Desktop Nav links */}
          <nav className="hidden sm:flex items-center gap-6 flex-1 self-end">
            {navLink("/dashboard", "dashboard", <LayoutDashboard className="w-4 h-4" />, "Dashboard")}
            {navLink("/settings", "settings", <Settings className="w-4 h-4" />, "Settings")}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-secondary hover:text-foreground transition-colors duration-150 p-1.5 rounded-md hover:bg-muted/40"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            <span className="text-xs sm:text-sm text-secondary truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-foreground transition-colors duration-150 p-1.5 sm:p-0 rounded-md hover:bg-muted/40 sm:hover:bg-transparent"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs (visible only on screens < sm) */}
        <div className="sm:hidden border-t border-border bg-white dark:bg-[#0A0A0A] px-4 flex items-center gap-6">
          {navLink("/dashboard", "dashboard", <LayoutDashboard className="w-4 h-4" />, "Dashboard", true)}
          {navLink("/settings", "settings", <Settings className="w-4 h-4" />, "Settings", true)}
        </div>
      </header>

      {/* Page content */}
      <main className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-9">
        {children}
      </main>
    </div>
  );
}
