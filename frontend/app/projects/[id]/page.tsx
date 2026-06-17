"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  current_state: string;
  created_at: string;
  updated_at: string;
}

interface StageOutput {
  stage: string;
  status: string;
  created_at: string;
}

interface GithubPush {
  repo_url: string;
  commit_sha: string;
  pushed_at: string;
}

interface Deployment {
  platform: string;
  service_type: string;
  deploy_url: string | null;
  build_status: string;
}

interface ProjectDetail extends Project {
  stage_outputs: StageOutput[];
  execution_tasks?: Array<{ id: string; status: string }>;
  github_push?: GithubPush;
  deployments?: Deployment[];
}

// ── Stage definitions ─────────────────────────────────────────────────────────

interface StageDef {
  key: string;
  label: string;
  description: string;
  href: (id: string) => string;
  doneStates: string[];
  activeStates: string[];
}

const STAGES: StageDef[] = [
  {
    key: "idea",
    label: "Idea Capture",
    description: "Structured idea, clarifying questions, confirmation",
    href: (id) => `/projects/${id}/idea`,
    doneStates: ["IDEA_CONFIRMED", "BLUEPRINT_DRAFT", "BLUEPRINT_CONFIRMED", "PROMPTS_GENERATED", "PROMPTS_CONFIRMED", "EXECUTION_RUNNING", "EXECUTION_COMPLETE", "GITHUB_PUSHED", "DEPLOYED"],
    activeStates: ["IDEA_CAPTURE"],
  },
  {
    key: "blueprint",
    label: "Blueprint",
    description: "Architecture, tech stack, schema, API spec",
    href: (id) => `/projects/${id}/blueprint`,
    doneStates: ["BLUEPRINT_CONFIRMED", "PROMPTS_GENERATED", "PROMPTS_CONFIRMED", "EXECUTION_RUNNING", "EXECUTION_COMPLETE", "GITHUB_PUSHED", "DEPLOYED"],
    activeStates: ["BLUEPRINT_DRAFT"],
  },
  {
    key: "prompts",
    label: "Prompts",
    description: "AI-generated implementation prompts per task",
    href: (id) => `/projects/${id}/prompts`,
    doneStates: ["PROMPTS_CONFIRMED", "EXECUTION_RUNNING", "EXECUTION_COMPLETE", "GITHUB_PUSHED", "DEPLOYED"],
    activeStates: ["PROMPTS_GENERATED"],
  },
  {
    key: "execution",
    label: "Execution",
    description: "Claude Code generates files task-by-task",
    href: (id) => `/projects/${id}/execution`,
    doneStates: ["EXECUTION_COMPLETE", "GITHUB_PUSHED", "DEPLOYED"],
    activeStates: ["EXECUTION_RUNNING", "PAUSED"],
  },
  {
    key: "github",
    label: "GitHub Push",
    description: "Single commit pushed to private repository",
    href: (id) => `/projects/${id}`,
    doneStates: ["GITHUB_PUSHED", "DEPLOYED"],
    activeStates: [],
  },
  {
    key: "deploy",
    label: "Deploy",
    description: "Vercel (frontend) + Railway (backend)",
    href: (id) => `/projects/${id}`,
    doneStates: ["DEPLOYED"],
    activeStates: [],
  },
];

// ── Status badge ──────────────────────────────────────────────────────────────

const STATE_BADGE: Record<string, string> = {
  IDEA_CAPTURE:        "text-zinc-400 border-zinc-700 bg-zinc-800",
  IDEA_CONFIRMED:      "text-blue-400 border-blue-500/30 bg-blue-500/10",
  BLUEPRINT_DRAFT:     "text-purple-400 border-purple-500/30 bg-purple-500/10",
  BLUEPRINT_CONFIRMED: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  PROMPTS_GENERATED:   "text-amber-400 border-amber-500/30 bg-amber-500/10",
  PROMPTS_CONFIRMED:   "text-amber-400 border-amber-500/30 bg-amber-500/10",
  EXECUTION_RUNNING:   "text-orange-400 border-orange-500/30 bg-orange-500/10",
  EXECUTION_COMPLETE:  "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  GITHUB_PUSHED:       "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  DEPLOYED:            "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  PAUSED:              "text-amber-400 border-amber-500/30 bg-amber-500/10",
  FAILED:              "text-red-400 border-red-500/30 bg-red-500/10",
};

function stageStatus(stage: StageDef, state: string): "done" | "active" | "pending" {
  if (stage.doneStates.includes(state)) return "done";
  if (stage.activeStates.includes(state)) return "active";
  return "pending";
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

// ── Stage row ─────────────────────────────────────────────────────────────────

function StageRow({ stage, status, projectId }: { stage: StageDef; status: "done" | "active" | "pending"; projectId: string }) {
  const iconMap = {
    done:    <span className="text-emerald-400 text-base">✅</span>,
    active:  <span className="text-orange-400 text-base animate-pulse">⚡</span>,
    pending: <span className="text-zinc-600 text-base">○</span>,
  };

  return (
    <div className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all ${
      status === "active"
        ? "border-orange-500/30 bg-orange-500/5"
        : status === "done"
        ? "border-emerald-500/10 bg-emerald-500/5"
        : "border-zinc-800 bg-zinc-900/40"
    }`}>
      {iconMap[status]}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${status === "pending" ? "text-zinc-500" : "text-zinc-200"}`}>
          {stage.label}
        </p>
        <p className="text-xs text-zinc-600 truncate">{stage.description}</p>
      </div>
      {(status === "active" || status === "done") && (
        <Link
          href={stage.href(projectId)}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            status === "active"
              ? "border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
              : "border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          {status === "active" ? "Continue →" : "View"}
        </Link>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectOverviewPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = params.id as string;

  const [data, setData]       = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiClient
      .get<ProjectDetail>(`/api/v1/projects/${projectId}`)
      .then(setData)
      .catch((e) => setError(e?.message ?? "Failed to load project"))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleDelete() {
    if (!confirm("Delete this project permanently?")) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/projects/${projectId}`);
      router.push("/dashboard");
    } catch (e: any) {
      alert(e?.message ?? "Delete failed");
      setDeleting(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm">{error ?? "Project not found"}</p>
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Dashboard</Link>
        </div>
      </div>
    );
  }

  const { stage_outputs = [], github_push, deployments = [] } = data;
  const project   = data;
  const state     = project.current_state;
  const badgeCls  = STATE_BADGE[state] ?? STATE_BADGE.IDEA_CAPTURE;
  const doneCount = STAGES.filter((s) => stageStatus(s, state) === "done").length;
  const pct       = Math.round((doneCount / STAGES.length) * 100);

  const frontendDeploy = deployments.find((d) => d.service_type === "frontend");
  const backendDeploy  = deployments.find((d) => d.service_type === "backend");

  // ── Approved execution tasks count ───────────────────────────────────────

  const tasks         = data.execution_tasks ?? [];
  const approvedTasks = tasks.filter((t) => t.status === "approved").length;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-zinc-400 truncate max-w-[200px]">{project.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-white tracking-tight truncate">
              {project.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wide ${badgeCls}`}>
                {state.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-zinc-600">Created {fmtDate(project.created_at)}</span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="shrink-0 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-600 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 disabled:opacity-40 transition-colors"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>

        {/* Overall progress */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-mono uppercase tracking-widest">Overall Progress</span>
            <span className="font-mono tabular-nums">{doneCount}/{STAGES.length} stages</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: pct === 100
                  ? "linear-gradient(90deg,#22c55e,#16a34a)"
                  : "linear-gradient(90deg,#f97316,#ef4444)",
              }}
            />
          </div>
          {tasks.length > 0 && (
            <p className="text-xs text-zinc-600 font-mono">
              Execution: {approvedTasks}/{tasks.length} tasks approved
            </p>
          )}
        </div>

        {/* Stage checklist */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Stage Pipeline</p>
          {STAGES.map((stage) => (
            <StageRow
              key={stage.key}
              stage={stage}
              status={stageStatus(stage, state)}
              projectId={projectId}
            />
          ))}
        </div>

        {/* GitHub info */}
        {github_push && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">GitHub</p>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <a
                  href={github_push.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors break-all"
                >
                  {github_push.repo_url}
                </a>
                <p className="text-xs text-zinc-600 mt-0.5 font-mono">
                  {github_push.commit_sha.slice(0, 8)} · {fmtDate(github_push.pushed_at)}
                </p>
              </div>
              <a
                href={github_push.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Open →
              </a>
            </div>
          </div>
        )}

        {/* Deploy URLs */}
        {(frontendDeploy || backendDeploy) && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Deployments</p>
            {[frontendDeploy, backendDeploy].filter(Boolean).map((d) => (
              <div key={d!.service_type} className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400 capitalize">{d!.service_type}</span>
                    <span className="text-[10px] text-zinc-600">({d!.platform})</span>
                    <span className={`text-[10px] font-mono border rounded-full px-1.5 py-0.5 uppercase ${
                      d!.build_status === "success"
                        ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        : d!.build_status === "failed"
                        ? "text-red-400 border-red-500/30 bg-red-500/10"
                        : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                    }`}>
                      {d!.build_status}
                    </span>
                  </div>
                  {d!.deploy_url && (
                    <a
                      href={d!.deploy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-orange-400 hover:text-orange-300 transition-colors break-all mt-0.5 block"
                    >
                      {d!.deploy_url}
                    </a>
                  )}
                </div>
                {d!.deploy_url && (
                  <a
                    href={d!.deploy_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    Open →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stage output history */}
        {stage_outputs.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Stage History</p>
            <div className="space-y-2">
              {stage_outputs.map((so, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 capitalize">{so.stage.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono ${so.status === "approved" ? "text-emerald-400" : "text-zinc-500"}`}>
                      {so.status}
                    </span>
                    <span className="text-zinc-600">{fmtDate(so.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}