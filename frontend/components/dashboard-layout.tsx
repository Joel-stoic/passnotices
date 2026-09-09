"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scale, LogOut, LayoutDashboard, Users, Settings } from "lucide-react";
import { clearSession, getStoredUser, type AuthUser } from "@/lib/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeNav?: "dashboard" | "clients" | "settings";
}

export function DashboardLayout({ children, activeNav }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
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
    label: string
  ) => {
    const isActive = activeNav === key;
    return (
      <Link
        href={href}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 ${
          isActive
            ? "text-accent dark:text-foreground"
            : "text-secondary hover:text-foreground"
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
          <Link href="/" className="flex items-center gap-2 mr-8">
            <Scale className="w-[20px] h-[20px] text-accent" />
            <span className="font-serif text-[18px] font-semibold text-accent dark:text-foreground">
              PassNotice
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-6 flex-1">
            {navLink("/dashboard", "dashboard", <LayoutDashboard className="w-4 h-4" />, "Dashboard")}
            {navLink("/clients", "clients", <Users className="w-4 h-4" />, "Clients")}
            {navLink("/settings", "settings", <Settings className="w-4 h-4" />, "Settings")}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm text-secondary hidden sm:inline">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-secondary hover:text-foreground transition-colors duration-150"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
    </div>
  );
}
