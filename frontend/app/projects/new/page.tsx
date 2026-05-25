"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IdeaInputBox } from "@/components/idea/IdeaInputBox";
import { ClarifyingQuestions } from "@/components/idea/ClarifyingQuestions";
import { apiClient } from "@/lib/api";
import type { StructuredIdea } from "@/types";

type Step = "setup" | "input" | "clarify" | "done";

interface IdeaData {
  title?: string;
  description?: string;
  core_idea?: string;
  target_users?: string;
  core_features?: string[];
  key_features?: string[];
  tech_preferences?: string[];
  constraints?: string[];
  questions?: Array<{ id: string; question: string; field: string; options: string[] }>;
  warnings?: Array<{ type: string; message: string }>;
  ready_to_proceed?: boolean;
}

const STEPS = [
  { id: "setup", label: "Project" },
  { id: "input", label: "Idea" },
  { id: "clarify", label: "Refine" },
  { id: "done", label: "Done" },
] as const;

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all ${
              i < idx
                ? "bg-orange-500 border-orange-500 text-white"
                : i === idx
                ? "border-orange-500 text-orange-400 bg-orange-500/10"
                : "border-zinc-700 text-zinc-600"
            }`}
          >
            {i < idx ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          <span
            className={`ml-2 text-xs font-medium ${
              i === idx ? "text-zinc-200" : i < idx ? "text-zinc-400" : "text-zinc-600"
            }`}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-3 h-px w-8 transition-colors ${i < idx ? "bg-orange-500/40" : "bg-zinc-800"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("setup");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [ideaData, setIdeaData] = useState<IdeaData | null>(null);
  const [round, setRound] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — create project
  async function handleCreateProject() {
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await apiClient.post<{ id: string }>("/api/v1/projects", {
        name: projectName.trim(),
      });
      setProjectId(data.id);
      setStep("input");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create project.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — idea processed
  function handleIdeaResult(data: IdeaData) {
    setIdeaData(data);
    setRound(1);
    setStep("clarify");
  }

  // Refine (answer questions / idk)
  async function handleRefine(
    answers: Record<string, string>,
    corrections: Record<string, string>
  ) {
    if (!projectId) return;
    setError(null);
    setLoading(true);
    try {
      const newRound = round + 1;
      const data = await apiClient.post<IdeaData>(
        `/api/v1/projects/${projectId}/idea/refine`,
        { round: newRound, answers, corrections }
      );
      setIdeaData(data);
      setRound(newRound);
    } catch (e: any) {
      setError(e?.message ?? "Refinement failed.");
    } finally {
      setLoading(false);
    }
  }

  // Confirm idea
  async function handleConfirm() {
    if (!projectId) return;
    setError(null);
    setLoading(true);
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/idea/confirm`);
      setStep("done");
      setTimeout(() => {
        router.push(`/projects/${projectId}/blueprint`);
      }, 1200);
    } catch (e: any) {
      setError(e?.message ?? "Confirmation failed.");
    } finally {
      setLoading(false);
    }
  }

  // Build StructuredIdea for display
  const structuredIdea: StructuredIdea | null = ideaData
    ? {
        core_idea: ideaData.core_idea ?? ideaData.description ?? "",
        target_users: ideaData.target_users ?? "",
        key_features: ideaData.key_features ?? ideaData.core_features ?? [],
        tech_preferences: ideaData.tech_preferences ?? [],
        constraints: ideaData.constraints ?? [],
        success_criteria: [],
      }
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            New Project
          </h1>
          <p className="text-zinc-500 text-sm">
            Describe your idea — we'll structure, clarify, and build it.
          </p>
        </div>

        <StepIndicator current={step} />

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Step: Setup ── */}
        {step === "setup" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 max-w-lg">
            <h2 className="text-lg font-bold text-white mb-1">Name your project</h2>
            <p className="text-sm text-zinc-500 mb-6">
              This is just a label — you can change it later.
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                placeholder="e.g. Fitness Tracker Pro"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/60 transition-colors"
                autoFocus
              />
              <button
                onClick={handleCreateProject}
                disabled={loading || !projectName.trim()}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-orange-200/40 border-t-white rounded-full animate-spin" />
                    Creating…
                  </span>
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Input ── */}
        {step === "input" && projectId && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
            <h2 className="text-lg font-bold text-white mb-1">Describe your idea</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Use text, voice, file, or image — or all four.
            </p>
            <IdeaInputBox
              projectId={projectId}
              onResult={handleIdeaResult}
              loading={loading}
              setLoading={setLoading}
              setError={setError}
            />
          </div>
        )}

        {/* ── Step: Clarify ── */}
        {step === "clarify" && structuredIdea && ideaData && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
            <h2 className="text-lg font-bold text-white mb-1">Refine your idea</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Answer any questions or click "Looks Good" to proceed.
            </p>
            <ClarifyingQuestions
              idea={structuredIdea}
              questions={ideaData.questions ?? []}
              warnings={ideaData.warnings ?? []}
              round={round}
              onRefine={handleRefine}
              onConfirm={handleConfirm}
              loading={loading}
            />
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Idea confirmed!</h2>
            <p className="text-zinc-500 text-sm">Generating blueprint…</p>
            <div className="mt-6 flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}