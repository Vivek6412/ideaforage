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

interface TechInfo {
  tech?: string;
  version?: string;
  reasoning?: string;
}

function StackCard({
  category,
  value,
  projectId,
  onUpdated,
}: {
  category: string;
  value: any; // Can be string or TechInfo object
  projectId: string;
  onUpdated: (category: string, value: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  
  // Extract display string from potential object
  const getDisplayString = (val: any) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      if (val.tech) return `${val.tech}${val.version ? ` ${val.version}` : ""}`;
      return JSON.stringify(val);
    }
    return String(val);
  };

  const initialStringValue = getDisplayString(value);
  const [selected, setSelected] = useState(initialStringValue);
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
      // Reconstruct object if the original value was an object
      const newValue = typeof value === "object" && value !== null
        ? { ...value, tech: effectiveValue.trim() }
        : effectiveValue.trim();

      await apiClient.patch(`/api/v1/projects/${projectId}/blueprint/edit`, {
        section: "tech_stack",
        changes: { [category]: newValue },
      });
      onUpdated(category, newValue);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const renderValue = () => {
    if (!value) return <p className="text-sm font-medium text-zinc-200">—</p>;
    
    if (typeof value === "object") {
      if (value.tech) {
        return (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-zinc-200">
              {value.tech} {value.version && <span className="text-xs text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded ml-1">{value.version}</span>}
            </p>
            {value.reasoning && (
              <p className="text-xs text-zinc-500 italic mt-1 border-l-2 border-zinc-700 pl-2">
                {value.reasoning}
              </p>
            )}
          </div>
        );
      }
      // Handle deployment object { frontend: "...", backend: "..." }
      return (
        <div className="flex flex-col gap-1">
          {Object.entries(value).map(([k, v]) => (
            <p key={k} className="text-xs text-zinc-300">
              <span className="text-zinc-500 capitalize">{k}:</span> {String(v)}
            </p>
          ))}
        </div>
      );
    }
    return <p className="text-sm font-medium text-zinc-200">{value}</p>;
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 group flex flex-col justify-between">
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
              setSelected(initialStringValue);
              setCustomInput(options.includes(initialStringValue) ? "" : initialStringValue);
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
                    ⚠ Custom tech may not be optimally supported by the AI generator.
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
              {saving ? "Saving…" : "Save"}
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
        renderValue()
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