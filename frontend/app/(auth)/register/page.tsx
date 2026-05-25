"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api";

interface RegisterResponse {
  user: { id: string; email: string; full_name: string | null };
  message: string;
}

interface FieldErrors {
  full_name?: string;
  email?: string;
  password?: string;
}

function validate(fullName: string, email: string, password: string): FieldErrors {
  const errs: FieldErrors = {};
  if (!fullName.trim()) errs.full_name = "Full name is required.";
  if (!email.trim()) {
    errs.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errs.email = "Enter a valid email address.";
  }
  if (!password) {
    errs.password = "Password is required.";
  } else if (password.length < 8) {
    errs.password = "Password must be at least 8 characters.";
  }
  return errs;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-400 mt-1">{msg}</p>;
}

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(fullName, email, password);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setApiError(null);
    setLoading(true);

    try {
      await apiClient.post<RegisterResponse>("/api/v1/auth/register", {
        email,
        password,
        full_name: fullName,
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl mx-auto">
            ✅
          </div>
          <h2 className="text-xl font-bold text-white">Account created!</h2>
          <p className="text-zinc-500 text-sm">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-zinc-950 flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}>
              IF
            </span>
            <span className="font-bold text-lg tracking-tight text-white">IdeaForge</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create an account</h1>
          <p className="text-zinc-500 text-sm mt-1">Start building your ideas today</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* API-level error */}
            {apiError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {apiError}
              </div>
            )}

            {/* Full name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400" htmlFor="full_name">
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className={`w-full rounded-xl border bg-zinc-950 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:ring-1 ${
                  fieldErrors.full_name
                    ? "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20"
                    : "border-zinc-700 focus:border-orange-500/60 focus:ring-orange-500/20"
                }`}
              />
              <FieldError msg={fieldErrors.full_name} />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full rounded-xl border bg-zinc-950 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:ring-1 ${
                  fieldErrors.email
                    ? "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20"
                    : "border-zinc-700 focus:border-orange-500/60 focus:ring-orange-500/20"
                }`}
              />
              <FieldError msg={fieldErrors.email} />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={`w-full rounded-xl border bg-zinc-950 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:ring-1 ${
                  fieldErrors.password
                    ? "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20"
                    : "border-zinc-700 focus:border-orange-500/60 focus:ring-orange-500/20"
                }`}
              />
              <FieldError msg={fieldErrors.password} />
              {/* Strength hint */}
              {password && !fieldErrors.password && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map((lvl) => (
                    <div
                      key={lvl}
                      className={`h-0.5 flex-1 rounded-full transition-colors ${
                        password.length >= lvl * 4
                          ? lvl === 1 ? "bg-red-500" : lvl === 2 ? "bg-amber-500" : "bg-emerald-500"
                          : "bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-1"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-orange-200/40 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        {/* Toggle */}
        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}