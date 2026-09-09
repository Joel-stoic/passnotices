"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiSignup, saveSession } from "@/lib/api";

export function SignupForm() {
  const router = useRouter();

  const [tenantName, setTenantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!tenantName.trim()) errs.tenantName = "Practice name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const { token, user } = await apiSignup(tenantName.trim(), email.trim(), password);
      saveSession(token, user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-2.5 bg-background text-foreground border rounded-sm outline-none text-sm transition-colors duration-150 focus:border-accent ${
      fieldErrors[field] ? "border-error" : "border-border"
    }`;

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="font-serif text-[28px] text-foreground mb-2">
        Create your account
      </h2>
      <p className="text-secondary text-sm mb-8 leading-[1.7]">
        Start your 14-day free trial. No credit card required.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Practice / Firm Name */}
        <div className="space-y-1.5">
          <label htmlFor="signup-tenant" className="block text-sm font-medium text-foreground">
            Practice / Firm Name
          </label>
          <input
            id="signup-tenant"
            type="text"
            autoComplete="organization"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            className={inputClass("tenantName")}
            placeholder="e.g. Krishnamurthy & Associates"
          />
          {fieldErrors.tenantName && (
            <p className="text-error text-xs mt-1">{fieldErrors.tenantName}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass("email")}
            placeholder="you@lawfirm.com"
          />
          {fieldErrors.email && (
            <p className="text-error text-xs mt-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass("password")} pr-10`}
              placeholder="Min. 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground transition-colors duration-150"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-error text-xs mt-1">{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label htmlFor="signup-confirm" className="block text-sm font-medium text-foreground">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="signup-confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClass("confirmPassword")} pr-10`}
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground transition-colors duration-150"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-error text-xs mt-1">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {/* Global API error */}
        {error && (
          <p className="text-error text-sm font-medium" role="alert">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-white py-2.5 rounded-sm text-sm font-semibold hover:bg-accent/90 transition-colors duration-150 disabled:opacity-60 mt-2"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <p className="text-[11px] text-secondary text-center leading-relaxed">
          By signing up you agree to our{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors duration-150">Terms</Link>{" "}
          and{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors duration-150">Privacy Policy</Link>.
        </p>
      </form>

      <div className="mt-8 pt-6 border-t border-border text-center">
        <p className="text-sm text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-accent dark:text-foreground font-medium underline underline-offset-2 hover:opacity-80 transition-opacity duration-150">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
