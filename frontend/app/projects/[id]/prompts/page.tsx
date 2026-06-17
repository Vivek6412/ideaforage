"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { PromptCard } from "@/components/prompts/PromptCard";

interface PromptItem {
  id: string;
  name: string;
  type: string;
  content: string;
  depends_on?: string[];
}

interface PromptData {
  prompts: PromptItem[];
}

export default function PromptsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<Record<string, "pending_review" | "approved">>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadRef = useRef(false);

  const loadPrompts = useCallback(async () => {
    if (loadRef.current) return;
    loadRef.current = true;
    
    try {
      const project = await apiClient.get<{ current_state: string, stage_outputs: any[] }>(`/api/v1/projects/${projectId}`);

      if (project.current_state === "BLUEPRINT_CONFIRMED") {
        setGenerating(true);
        try {
          const data = await apiClient.post<PromptData>(`/api/v1/projects/${projectId}/prompts/generate`);
          setPromptData(data);
        } finally {
          setGenerating(false);
        }
      } else {
        // If PROMPTS_GENERATED or beyond, load from stage outputs
        const promptsStage = project.stage_outputs?.find(s => s.stage === "prompts");
        if (promptsStage) {
          // Normalize prompt items since the DB might store them differently than the generate response
          const pData = promptsStage.output_json;
          
          let prompts: PromptItem[] = [];
          if (pData.prompts) {
            prompts = pData.prompts;
          } else {
            if (pData.master_prompt) {
              prompts.push({ id: "master", name: "Master Context", type: "master", content: pData.master_prompt });
            }
            if (pData.task_prompts) prompts.push(...pData.task_prompts.map((p: any) => ({ ...p, type: "task" })));
            if (pData.integration_prompts) prompts.push(...pData.integration_prompts.map((p: any) => ({ ...p, type: "integration" })));
            if (pData.debug_prompts) prompts.push(...pData.debug_prompts.map((p: any, i: number) => ({ id: `D${i+1}`, name: "Debug Rule", type: "debug", content: p.content })));
          }
          
          setPromptData({ prompts });
        } else {
          // Fallback if somehow missing
          setGenerating(true);
          try {
            const data = await apiClient.post<PromptData>(`/api/v1/projects/${projectId}/prompts/generate`);
            setPromptData(data);
          } finally {
            setGenerating(false);
          }
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load prompts");
      loadRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  function toggleApprove(id: string) {
    setApprovalStatus((prev) => ({
      ...prev,
      [id]: prev[id] === "approved" ? "pending_review" : "approved",
    }));
  }

  function approveAll() {
    if (!promptData) return;
    const all: Record<string, "approved"> = {};
    promptData.prompts.forEach((p) => { all[p.id] = "approved"; });
    setApprovalStatus(all);
  }

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/prompts/confirm`);
      router.push(`/projects/${projectId}/execution`);
    } catch (e: any) {
      setError(e?.message ?? "Confirmation failed");
      setConfirming(false);
    }
  }

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">
            {generating ? "Generating execution prompts…" : "Loading…"}
          </p>
          {generating && (
            <p className="text-zinc-600 text-xs max-w-xs mx-auto">
              Drafting master prompt, dividing tasks, and creating integration guides...
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
            onClick={loadPrompts}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!promptData) return null;

  const totalPrompts = promptData.prompts.length;
  const approvedCount = Object.values(approvalStatus).filter((s) => s === "approved").length;
  const allApproved = approvedCount >= totalPrompts;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => router.back()}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ← Back
              </button>
              <span className="text-zinc-700">/</span>
              <span className="text-xs text-zinc-500">Prompts</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Review Prompts
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              Review the detailed instructions generated for the AI coding agent.
            </p>
          </div>
        </div>

        {/* Approval progress */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Prompts approved</span>
              <span className="text-xs font-mono text-zinc-400">
                {approvedCount} / {totalPrompts}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: `${totalPrompts > 0 ? (approvedCount / totalPrompts) * 100 : 0}%` }}
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

        <div className="space-y-4">
          {promptData.prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              status={approvalStatus[prompt.id] ?? "pending_review"}
              onApprove={toggleApprove}
            />
          ))}
        </div>

        {/* ── Confirm ── */}
        <div className="sticky bottom-6 pt-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-6 py-4 flex items-center gap-4 shadow-2xl">
            <div className="flex-1">
              {!allApproved && (
                <p className="text-xs text-zinc-500">
                  Approve all prompts or click "Approve All" above to proceed.
                </p>
              )}
              {allApproved && (
                <p className="text-xs text-emerald-400">
                  ✓ All prompts approved — ready to start execution.
                </p>
              )}
              {error && (
                <p className="text-xs text-red-400 mt-1">{error}</p>
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming || !allApproved}
              className="shrink-0 rounded-xl px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
            >
              {confirming ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-orange-200/40 border-t-white rounded-full animate-spin" />
                  Building Queue…
                </span>
              ) : (
                "Confirm Prompts →"
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
