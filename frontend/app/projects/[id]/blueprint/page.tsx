"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { BlueprintCard } from "@/components/blueprint/BlueprintCard";
import { MermaidDiagram } from "@/components/blueprint/MermaidDiagram";
import { TechStackEditor } from "@/components/blueprint/TechStackEditor";
import { SchemaViewer } from "@/components/blueprint/SchemaViewer";
import { ApiSpecViewer } from "@/components/blueprint/ApiSpecViewer";
import { apiClient } from "@/lib/api";

type ViewMode = "plain" | "technical" | "both";
type SectionStatus = "pending_review" | "approved";

interface BlueprintData {
  product_summary?: string;
  problem_statement?: string;
  target_users?: string;
  key_features?: string[];
  tech_stack?: Record<string, string>;
  architecture_diagram?: string;
  mermaid_source?: string;
  database_schema?: string;
  api_spec?: Array<{
    method: string;
    path: string;
    description?: string;
    request_body?: Record<string, unknown>;
    response?: Record<string, unknown>;
    action?: string;
  }>;
  folder_structure?: string;
  key_flows?: string[];
  warnings?: Array<{ type: string; message: string }>;
}

interface SectionState {
  [key: string]: SectionStatus;
}

const SECTION_META: Record<string, { title: string; showIn: ViewMode[] }> = {
  product_summary: { title: "Product Summary", showIn: ["plain", "both"] },
  problem_statement: { title: "Problem Statement", showIn: ["plain", "both"] },
  target_users: { title: "Target Users", showIn: ["plain", "both"] },
  key_features: { title: "Key Features", showIn: ["plain", "both"] },
  folder_structure: { title: "Folder Structure", showIn: ["technical", "both"] },
  key_flows: { title: "Key Flows", showIn: ["plain", "technical", "both"] },
};

export default function BlueprintPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);
  const [sectionStatus, setSectionStatus] = useState<SectionState>({});
  const [view, setView] = useState<ViewMode>("both");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBlueprint = useCallback(async () => {
    try {
      const project = await apiClient.get<{ current_state: string }>(`/api/v1/projects/${projectId}`);

      if (project.current_state === "BLUEPRINT_DRAFT" || project.current_state === "IDEA_CONFIRMED") {
        // Auto-generate if not yet generated
        setGenerating(true);
        try {
          const data = await apiClient.post<{ blueprint: BlueprintData }>(
            `/api/v1/projects/${projectId}/blueprint/generate`
          );
          setBlueprint(data.blueprint ?? data as any);
        } finally {
          setGenerating(false);
        }
      } else if (project.current_state === "BLUEPRINT_CONFIRMED") {
        // Load existing from stage_outputs
        const data = await apiClient.get<{ blueprint: BlueprintData }>(
          `/api/v1/projects/${projectId}/blueprint/generate`
        );
        setBlueprint(data.blueprint ?? data as any);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load blueprint");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadBlueprint();
  }, [loadBlueprint]);

  function toggleApprove(section: string) {
    setSectionStatus((prev) => ({
      ...prev,
      [section]: prev[section] === "approved" ? "pending_review" : "approved",
    }));
  }

  async function handleEdit(section: string, content: string) {
    const data = await apiClient.patch<{ blueprint: BlueprintData }>(
      `/api/v1/projects/${projectId}/blueprint/edit`,
      { section, changes: { [section]: content } }
    );
    if (data.blueprint) {
      setBlueprint((prev) => ({ ...prev, ...data.blueprint }));
    }
  }

  async function handleStackUpdated(newStack: Record<string, string>) {
    setBlueprint((prev) => prev ? { ...prev, tech_stack: newStack } : prev);
  }

  function approveAll() {
    const allSections = [
      ...Object.keys(SECTION_META),
      "tech_stack",
      "architecture",
      "database_schema",
      "api_spec",
    ];
    const all: SectionState = {};
    allSections.forEach((s) => { all[s] = "approved"; });
    setSectionStatus(all);
  }

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/blueprint/confirm`);
      router.push(`/projects/${projectId}/prompts`);
    } catch (e: any) {
      setError(e?.message ?? "Confirmation failed");
      setConfirming(false);
    }
  }

  const approvedCount = Object.values(sectionStatus).filter((s) => s === "approved").length;
  const totalSections = Object.keys(SECTION_META).length + 4; // +tech, arch, schema, api
  const allApproved = approvedCount >= totalSections;

  // ── Loading states ───────────────────────────────────────────────────────

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">
            {generating ? "Generating blueprint…" : "Loading…"}
          </p>
          {generating && (
            <p className="text-zinc-600 text-xs max-w-xs mx-auto">
              Fetching latest package versions, designing architecture, generating schema…
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={loadBlueprint}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!blueprint) return null;

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => router.back()}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ← Back
              </button>
              <span className="text-zinc-700">/</span>
              <span className="text-xs text-zinc-500">Blueprint</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Blueprint Review
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              Review and approve each section before generating prompts.
            </p>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden text-xs shrink-0">
            {(["plain", "technical", "both"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 capitalize transition-colors ${
                  view === v ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {v === "plain" ? "Plain English" : v === "technical" ? "Technical" : "Both"}
              </button>
            ))}
          </div>
        </div>

        {/* Approval progress */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Sections approved</span>
              <span className="text-xs font-mono text-zinc-400">
                {approvedCount} / {totalSections}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: `${(approvedCount / totalSections) * 100}%` }}
              />
            </div>
          </div>
          <button
            onClick={approveAll}
            className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Approve All
          </button>
        </div>

        {/* Warnings */}
        {blueprint.warnings?.map((w, i) => (
          <div key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
            <p className="text-xs font-mono text-amber-400 uppercase tracking-wide mb-0.5">
              ⚠ {w.type}
            </p>
            <p className="text-sm text-amber-200/80">{w.message}</p>
          </div>
        ))}

        {/* ── Plain English sections ── */}
        {(view === "plain" || view === "both") && (
          <div className="space-y-4">
            {view === "both" && (
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Plain English</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
            )}
            {(["product_summary", "problem_statement", "target_users", "key_features", "key_flows"] as const).map((sec) => {
              const val = blueprint[sec as keyof BlueprintData];
              if (!val) return null;
              const meta = SECTION_META[sec];
              return (
                <BlueprintCard
                  key={sec}
                  title={meta?.title ?? sec}
                  section={sec}
                  content={val as string | string[]}
                  status={sectionStatus[sec] ?? "pending_review"}
                  projectId={projectId}
                  view={view}
                  onApprove={toggleApprove}
                  onEdit={handleEdit}
                />
              );
            })}
          </div>
        )}

        {/* ── Technical sections ── */}
        {(view === "technical" || view === "both") && (
          <div className="space-y-6">
            {view === "both" && (
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Technical</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
            )}

            {/* Tech Stack */}
            {blueprint.tech_stack && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Tech Stack</span>
                  <button
                    onClick={() => toggleApprove("tech_stack")}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${
                      sectionStatus["tech_stack"] === "approved"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400"
                    }`}
                  >
                    {sectionStatus["tech_stack"] === "approved" ? "Approved ✓" : "Approve"}
                  </button>
                </div>
                <TechStackEditor
                  projectId={projectId}
                  stack={blueprint.tech_stack}
                  onUpdated={handleStackUpdated}
                />
              </div>
            )}

            {/* Architecture diagram */}
            {(blueprint.mermaid_source || blueprint.architecture_diagram) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Architecture</span>
                  <button
                    onClick={() => toggleApprove("architecture")}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${
                      sectionStatus["architecture"] === "approved"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400"
                    }`}
                  >
                    {sectionStatus["architecture"] === "approved" ? "Approved ✓" : "Approve"}
                  </button>
                </div>
                <MermaidDiagram source={blueprint.mermaid_source ?? blueprint.architecture_diagram ?? ""} />
              </div>
            )}

            {/* Database schema */}
            {blueprint.database_schema && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Database Schema</span>
                  <button
                    onClick={() => toggleApprove("database_schema")}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${
                      sectionStatus["database_schema"] === "approved"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400"
                    }`}
                  >
                    {sectionStatus["database_schema"] === "approved" ? "Approved ✓" : "Approve"}
                  </button>
                </div>
                <SchemaViewer schema={blueprint.database_schema} />
              </div>
            )}

            {/* API spec */}
            {blueprint.api_spec && blueprint.api_spec.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">API Specification</span>
                  <button
                    onClick={() => toggleApprove("api_spec")}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${
                      sectionStatus["api_spec"] === "approved"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400"
                    }`}
                  >
                    {sectionStatus["api_spec"] === "approved" ? "Approved ✓" : "Approve"}
                  </button>
                </div>
                <ApiSpecViewer endpoints={blueprint.api_spec} />
              </div>
            )}

            {/* Folder structure */}
            {blueprint.folder_structure && (
              <BlueprintCard
                title="Folder Structure"
                section="folder_structure"
                content={blueprint.folder_structure}
                status={sectionStatus["folder_structure"] ?? "pending_review"}
                projectId={projectId}
                view={view}
                onApprove={toggleApprove}
                onEdit={handleEdit}
              />
            )}
          </div>
        )}

        {/* ── Confirm ── */}
        <div className="sticky bottom-6 pt-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-6 py-4 flex items-center gap-4 shadow-2xl">
            <div className="flex-1">
              {!allApproved && (
                <p className="text-xs text-zinc-500">
                  Approve all sections or click "Approve All" above to proceed.
                </p>
              )}
              {allApproved && (
                <p className="text-xs text-emerald-400">
                  ✓ All sections approved — ready to generate prompts.
                </p>
              )}
              {error && (
                <p className="text-xs text-red-400 mt-1">{error}</p>
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="shrink-0 rounded-xl px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
            >
              {confirming ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-orange-200/40 border-t-white rounded-full animate-spin" />
                  Confirming…
                </span>
              ) : (
                "Confirm Blueprint →"
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}