"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  current_state: string;
  created_at: string;
  updated_at: string;
}

const STATE_META: Record<string, { label: string; color: string; step: number }> = {
  IDEA_CAPTURE:       { label: "Idea",         color: "text-zinc-400 border-zinc-700 bg-zinc-800",          step: 1 },
  IDEA_CONFIRMED:     { label: "Idea ✓",        color: "text-blue-400 border-blue-500/30 bg-blue-500/10",    step: 2 },
  BLUEPRINT_DRAFT:    { label: "Blueprint",      color: "text-purple-400 border-purple-500/30 bg-purple-500/10", step: 3 },
  BLUEPRINT_CONFIRMED:{ label: "Blueprint ✓",   color: "text-purple-400 border-purple-500/30 bg-purple-500/10", step: 4 },
  PROMPTS_GENERATED:  { label: "Prompts",        color: "text-amber-400 border-amber-500/30 bg-amber-500/10", step: 5 },
  PROMPTS_CONFIRMED:  { label: "Prompts ✓",      color: "text-amber-400 border-amber-500/30 bg-amber-500/10", step: 6 },
  EXECUTION_RUNNING:  { label: "Building…",      color: "text-orange-400 border-orange-500/30 bg-orange-500/10", step: 7 },
  EXECUTION_COMPLETE: { label: "Built ✓",        color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", step: 8 },
  GITHUB_PUSHED:      { label: "On GitHub",      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", step: 9 },
  DEPLOYED:           { label: "Deployed 🚀",    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", step: 10 },
  PAUSED:             { label: "Paused",         color: "text-amber-400 border-amber-500/30 bg-amber-500/10", step: 0 },
  FAILED:             { label: "Failed",         color: "text-red-400 border-red-500/30 bg-red-500/10",      step: 0 },
};

const TOTAL_STEPS = 10;

function stageHref(projectId: string, state: string): string {
  if (state.startsWith("IDEA")) return `/projects/${projectId}`;
  if (state.startsWith("BLUEPRINT")) return `/projects/${projectId}/blueprint`;
  if (state.startsWith("PROMPTS")) return `/projects/${projectId}/prompts`;
  if (state.startsWith("EXECUTION")) return `/projects/${projectId}/execution`;
  return `/projects/${projectId}`;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  const meta = STATE_META[project.current_state] ?? { label: project.current_state, color: "text-zinc-400 border-zinc-700 bg-zinc-800", step: 0 };
  const pct = meta.step > 0 ? Math.round((meta.step / TOTAL_STEPS) * 100) : 0;
  const href = stageHref(project.id, project.current_state);

  return (
    <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-zinc-700 transition-all flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-base truncate">{project.name}</h3>
          <p className="text-xs text-zinc-600 mt-0.5">{fmtDate(project.created_at)}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wide ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      {/* Progress bar */}
      {pct > 0 && (
        <div className="space-y-1">
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "linear-gradient(90deg,#22c55e,#16a34a)" : "linear-gradient(90deg,#f97316,#ef4444)",
              }}
            />
          </div>
          <p className="text-[10px] text-zinc-600 font-mono text-right">{pct}% complete</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Link
          href={href}
          className="flex-1 text-center rounded-lg border border-zinc-700 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          Continue →
        </Link>
        <Link
          href={`/projects/${project.id}`}
          className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
        >
          Overview
        </Link>
        <button
          onClick={() => onDelete(project.id)}
          className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-600 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
          title="Delete project"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-4xl mb-6">
        💡
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No projects yet</h2>
      <p className="text-zinc-500 text-sm max-w-xs mb-8">
        Turn your first idea into a fully built product. It takes about 5 minutes to go from idea to blueprint.
      </p>
      <Link
        href="/projects/new"
        className="rounded-xl px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        style={{ background: "linear-gradient(135deg,#f97316 0%,#ef4444 100%)" }}
      >
        + New Project
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<Project[]>("/api/v1/projects")
      .then(setProjects)
      .catch((e) => setError(e?.message ?? "Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await apiClient.delete(`/api/v1/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e?.message ?? "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {projects.length > 0 ? `${projects.length} project${projects.length > 1 ? "s" : ""}` : "Your projects"}
            </p>
          </div>
          <Link
            href="/projects/new"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#f97316 0%,#ef4444 100%)" }}
          >
            + New Project
          </Link>
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && projects.length === 0 && <EmptyState />}

        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className={deleting === p.id ? "opacity-40 pointer-events-none" : ""}>
                <ProjectCard project={p} onDelete={handleDelete} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}