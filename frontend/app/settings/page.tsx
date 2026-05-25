"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiKeyStatus { provider: string; has_key: boolean; created_at?: string }
interface Integration  { provider: string; connected: boolean; username: string | null }
interface UserProfile  { id: string; email: string; full_name: string | null; tier: string }

type Tab = "keys" | "integrations" | "profile";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROVIDERS: { id: string; label: string; placeholder: string }[] = [
  { id: "anthropic", label: "Anthropic",  placeholder: "sk-ant-…" },
  { id: "openai",    label: "OpenAI",     placeholder: "sk-…" },
  { id: "gemini",    label: "Google Gemini", placeholder: "AIza…" },
];

const INTEGRATIONS: { id: string; label: string; icon: string }[] = [
  { id: "github",  label: "GitHub",  icon: "🐙" },
  { id: "vercel",  label: "Vercel",  icon: "▲" },
  { id: "railway", label: "Railway", icon: "🚂" },
];

// ── API Keys Tab ──────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const [keys, setKeys]     = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Record<string, { ok: boolean; msg: string } | null>>({});

  useEffect(() => {
    apiClient.get<ApiKeyStatus[]>("/api/v1/keys")
      .then((data) => {
        const map: Record<string, boolean> = {};
        data.forEach((k) => { map[k.provider] = k.has_key; });
        setKeys(map);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveKey(provider: string) {
    const key = inputs[provider]?.trim();
    if (!key) return;
    setAdding((p) => ({ ...p, [provider]: true }));
    try {
      await apiClient.post("/api/v1/keys", { provider, api_key: key });
      setKeys((p) => ({ ...p, [provider]: true }));
      setInputs((p) => ({ ...p, [provider]: "" }));
      setStatus((p) => ({ ...p, [provider]: { ok: true, msg: "Key saved." } }));
    } catch (e: any) {
      setStatus((p) => ({ ...p, [provider]: { ok: false, msg: e?.message ?? "Save failed" } }));
    } finally {
      setAdding((p) => ({ ...p, [provider]: false }));
    }
  }

  async function removeKey(provider: string) {
    if (!confirm(`Remove ${provider} API key?`)) return;
    try {
      await apiClient.delete(`/api/v1/keys/${provider}`);
      setKeys((p) => ({ ...p, [provider]: false }));
      setStatus((p) => ({ ...p, [provider]: null }));
    } catch (e: any) {
      setStatus((p) => ({ ...p, [provider]: { ok: false, msg: e?.message ?? "Remove failed" } }));
    }
  }

  async function verifyKey(provider: string) {
    setStatus((p) => ({ ...p, [provider]: null }));
    try {
      const res = await apiClient.post<{ valid: boolean; error?: string }>("/api/v1/keys/verify", { provider });
      setStatus((p) => ({
        ...p,
        [provider]: res.valid
          ? { ok: true, msg: "✓ Key is valid" }
          : { ok: false, msg: res.error ?? "Key verification failed" },
      }));
    } catch (e: any) {
      setStatus((p) => ({ ...p, [provider]: { ok: false, msg: e?.message ?? "Verify failed" } }));
    }
  }

  if (loading) return <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 mb-6">
        Your API keys are encrypted with AES-128 and never returned in API responses.
      </p>
      {PROVIDERS.map((p) => {
        const has = !!keys[p.id];
        const st  = status[p.id];
        const isSaving = !!adding[p.id];
        return (
          <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${has ? "bg-emerald-400" : "bg-zinc-600"}`} />
                <span className="font-medium text-zinc-200 text-sm">{p.label}</span>
                {has && <span className="text-[10px] font-mono text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5">Connected</span>}
              </div>
              {has && (
                <div className="flex gap-2">
                  <button
                    onClick={() => verifyKey(p.id)}
                    className="text-xs rounded-md border border-zinc-700 px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => removeKey(p.id)}
                    className="text-xs rounded-md border border-red-500/30 px-2.5 py-1 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {!has && (
              <div className="flex gap-2">
                <input
                  type="password"
                  value={inputs[p.id] ?? ""}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder={p.placeholder}
                  autoComplete="off"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/60 transition-colors font-mono"
                />
                <button
                  onClick={() => saveKey(p.id)}
                  disabled={isSaving || !inputs[p.id]?.trim()}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#f97316 0%,#ef4444 100%)" }}
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            )}

            {st && (
              <p className={`mt-2 text-xs ${st.ok ? "text-emerald-400" : "text-red-400"}`}>
                {st.msg}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Integrations Tab ──────────────────────────────────────────────────────────

function IntegrationsTab() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Record<string, Integration>>({});
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Record<string, { ok: boolean; msg: string } | null>>({});

  const load = useCallback(async () => {
    const data = await apiClient.get<Integration[]>("/api/v1/integrations");
    const map: Record<string, Integration> = {};
    data.forEach((i) => { map[i.provider] = i; });
    setIntegrations(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Handle GitHub OAuth callback (?tab=integrations&code=…)
  useEffect(() => {
    const code = searchParams.get("code");
    const tab  = searchParams.get("tab");
    if (code && tab === "integrations") {
      apiClient.post<{ username: string; message: string }>("/api/v1/integrations/github/callback", { code })
        .then((res) => {
          setStatus((p) => ({ ...p, github: { ok: true, msg: `Connected as @${res.username}` } }));
          load();
          // Clean URL
          window.history.replaceState({}, "", "/settings?tab=integrations");
        })
        .catch((e: any) => {
          setStatus((p) => ({ ...p, github: { ok: false, msg: e?.message ?? "GitHub auth failed" } }));
        });
    }
  }, [searchParams, load]);

  async function connectGitHub() {
    const data = await apiClient.get<{ url: string }>("/api/v1/integrations/github/oauth-url");
    window.location.href = data.url;
  }

  async function connectToken(provider: string) {
    const token = tokens[provider]?.trim();
    if (!token) return;
    setSaving((p) => ({ ...p, [provider]: true }));
    try {
      // Vercel / Railway — store via callback endpoint pattern with token directly
      await apiClient.post(`/api/v1/integrations/${provider}/callback`, { token });
      setStatus((p) => ({ ...p, [provider]: { ok: true, msg: `${provider} connected.` } }));
      setTokens((p) => ({ ...p, [provider]: "" }));
      load();
    } catch (e: any) {
      setStatus((p) => ({ ...p, [provider]: { ok: false, msg: e?.message ?? "Connect failed" } }));
    } finally {
      setSaving((p) => ({ ...p, [provider]: false }));
    }
  }

  async function disconnect(provider: string) {
    if (!confirm(`Disconnect ${provider}?`)) return;
    try {
      await apiClient.delete(`/api/v1/integrations/${provider}`);
      setStatus((p) => ({ ...p, [provider]: null }));
      load();
    } catch (e: any) {
      setStatus((p) => ({ ...p, [provider]: { ok: false, msg: e?.message ?? "Disconnect failed" } }));
    }
  }

  if (loading) return <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {INTEGRATIONS.map(({ id, label, icon }) => {
        const info = integrations[id];
        const connected = info?.connected ?? false;
        const st = status[id];
        const isSaving = !!saving[id];

        return (
          <div key={id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="font-medium text-zinc-200 text-sm">{label}</p>
                  {connected && info?.username && (
                    <p className="text-xs text-zinc-500">@{info.username}</p>
                  )}
                </div>
                {connected && (
                  <span className="text-[10px] font-mono text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5">
                    Connected
                  </span>
                )}
              </div>
              {connected && (
                <button
                  onClick={() => disconnect(id)}
                  className="text-xs rounded-md border border-red-500/30 px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>

            {!connected && id === "github" && (
              <button
                onClick={connectGitHub}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                🐙 Connect GitHub via OAuth
              </button>
            )}

            {!connected && id !== "github" && (
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tokens[id] ?? ""}
                  onChange={(e) => setTokens((p) => ({ ...p, [id]: e.target.value }))}
                  placeholder={`${label} API token`}
                  autoComplete="off"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/60 transition-colors font-mono"
                />
                <button
                  onClick={() => connectToken(id)}
                  disabled={isSaving || !tokens[id]?.trim()}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#f97316 0%,#ef4444 100%)" }}
                >
                  {isSaving ? "Connecting…" : "Connect"}
                </button>
              </div>
            )}

            {st && (
              <p className={`mt-2 text-xs ${st.ok ? "text-emerald-400" : "text-red-400"}`}>
                {st.msg}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<UserProfile>("/api/v1/auth/me")
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (!user) return <p className="text-sm text-zinc-500">Could not load profile.</p>;

  const tierColors: Record<string, string> = {
    free:    "text-zinc-400 border-zinc-700 bg-zinc-800",
    pro:     "text-blue-400 border-blue-500/30 bg-blue-500/10",
    team:    "text-purple-400 border-purple-500/30 bg-purple-500/10",
    enterprise: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  };

  return (
    <div className="space-y-5 max-w-md">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
            style={{ background: "linear-gradient(135deg,#f97316 0%,#ef4444 100%)" }}>
            {(user.full_name ?? user.email)[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white text-base">
              {user.full_name ?? "—"}
            </p>
            <span className={`text-[10px] font-mono uppercase tracking-wide border rounded-full px-2 py-0.5 ${tierColors[user.tier] ?? tierColors.free}`}>
              {user.tier} plan
            </span>
          </div>
        </div>

        <div className="h-px bg-zinc-800" />

        {/* Fields */}
        {[
          { label: "Full name", value: user.full_name ?? "—" },
          { label: "Email",     value: user.email },
        ].map(({ label, value }) => (
          <div key={label} className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">{label}</label>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-300 font-mono">
              {value}
            </div>
          </div>
        ))}

        <p className="text-xs text-zinc-600">
          Contact support to change your name or email.
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "keys",         label: "API Keys" },
  { id: "integrations", label: "Integrations" },
  { id: "profile",      label: "Profile" },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) ?? "keys";
  const [tab, setTab] = useState<Tab>(
    TABS.find((t) => t.id === initialTab) ? initialTab : "keys"
  );

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Settings</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Manage your API keys, integrations, and profile.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "keys"         && <ApiKeysTab />}
        {tab === "integrations" && <IntegrationsTab />}
        {tab === "profile"      && <ProfileTab />}
      </div>
    </div>
  );
}