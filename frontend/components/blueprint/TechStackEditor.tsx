"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";

interface TechStack {
  frontend?: string;
  backend?: string;
  database?: string;
  auth?: string;
  hosting?: string;
  [key: string]: string | undefined;
}

interface Props {
  projectId: string;
  stack: TechStack;
  onUpdated: (newStack: TechStack) => void;
}

const CURATED: Record<string, string[]> = {
  frontend: ["Next.js 14 (App Router)", "React 18 + Vite", "Remix", "SvelteKit", "Nuxt 3", "Custom…"],
  backend: ["FastAPI", "Express.js", "NestJS", "Django", "Rails", "Go Fiber", "Custom…"],
  database: ["PostgreSQL (Supabase)", "MySQL", "MongoDB", "PlanetScale", "SQLite", "Custom…"],
  auth: ["Supabase Auth", "Auth0", "Clerk", "NextAuth.js", "Firebase Auth", "Custom…"],
  hosting: ["Vercel + Railway", "Vercel only", "Netlify + Fly.io", "AWS", "GCP", "Custom…"],
};

const CATEGORY_ICONS: Record<string, string> = {
  frontend: "🖥",
  backend: "⚙️",
  database: "🗄",
  auth: "🔐",
  hosting: "☁️",
};

function StackCard({
  category,
  value,
  projectId,
  onUpdated,
}: {
  category: string;
  value: string;
  projectId: string;
  onUpdated: (category: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(value);
  const [customInput, setCustomInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = CURATED[category] ?? ["Custom…"];
  const isCustom = selected === "Custom…" || !options.includes(selected);
  const effectiveValue = isCustom ? customInput : selected;
  const isNonStandard = isCustom && customInput.trim();

  async function save() {
    if (!effectiveValue.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/api/v1/projects/${projectId}/blueprint/edit`, {
        section: "tech_stack",
        changes: { [category]: effectiveValue.trim() },
      });
      onUpdated(category, effectiveValue.trim());
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{CATEGORY_ICONS[category] ?? "📦"}</span>
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest capitalize">
            {category}
          </span>
        </div>
        {!editing && (
          <button
            onClick={() => {
              setSelected(value);
              setCustomInput(options.includes(value) ? "" : value);
              setEditing(true);
            }}
            className="hidden group-hover:block text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-2 py-0.5 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 mt-2">
          <select
            value={options.includes(selected) ? selected : "Custom…"}
            onChange={(e) => {
              setSelected(e.target.value);
              if (e.target.value !== "Custom…") setCustomInput("");
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500/60 transition-colors"
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          {(selected === "Custom…" || isCustom) && (
            <div>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder={`Custom ${category}…`}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500/60 transition-colors"
                autoFocus
              />
              {isNonStandard && (
                <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2">
                  <p className="text-xs text-amber-300">
                    ⚠ Custom tech may not be optimally supported by the AI generator. Blueprint will attempt to adapt.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !effectiveValue.trim()}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-400 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save & Regenerate"}
            </button>
            <button
              onClick={() => { setEditing(false); setError(null); }}
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium text-zinc-200">{value || "—"}</p>
      )}
    </div>
  );
}

export function TechStackEditor({ projectId, stack, onUpdated }: Props) {
  const [current, setCurrent] = useState<TechStack>(stack);

  function handleUpdated(category: string, value: string) {
    const updated = { ...current, [category]: value };
    setCurrent(updated);
    onUpdated(updated);
  }

  const categories = Object.keys(CURATED).filter((c) => c in current);
  const extras = Object.keys(current).filter((k) => !Object.keys(CURATED).includes(k));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Tech Stack
        </span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...categories, ...extras].map((cat) => (
          <StackCard
            key={cat}
            category={cat}
            value={current[cat] ?? ""}
            projectId={projectId}
            onUpdated={handleUpdated}
          />
        ))}
      </div>
    </div>
  );
}