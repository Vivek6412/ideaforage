"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ClarifyingQuestions } from "@/components/idea/ClarifyingQuestions";
import { apiClient } from "@/lib/api";
import type { StructuredIdea } from "@/types";

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
}

export default function IdeaResumePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [ideaData, setIdeaData] = useState<IdeaData | null>(null);
  const [round, setRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    apiClient
      .get<any>(`/api/v1/projects/${projectId}`)
      .then((data) => {
        setIsReadOnly(data.current_state !== "IDEA_DRAFT");
        const stage = data.stage_outputs?.find((s: any) => s.stage === "idea_capture" || s.stage === "IDEA_CAPTURE");
        if (stage && stage.output_json) {
          setIdeaData(stage.output_json);
          setRound(stage.round_number ?? 1);
        } else {
          setError("No idea data found for this project.");
        }
      })
      .catch((e) => setError(e?.message ?? "Failed to load idea data"))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleRefine(answers: Record<string, string>, corrections: Record<string, string>) {
    setError(null);
    setProcessing(true);
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
      setProcessing(false);
    }
  }

  async function handleConfirm() {
    setError(null);
    setProcessing(true);
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/idea/confirm`);
      router.push(`/projects/${projectId}/blueprint`);
    } catch (e: any) {
      setError(e?.message ?? "Confirmation failed.");
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !ideaData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => router.push(`/projects/${projectId}`)} className="text-xs text-zinc-500 hover:text-zinc-300">← Back</button>
        </div>
      </div>
    );
  }

  const structuredIdea: StructuredIdea = {
    core_idea: ideaData.core_idea ?? ideaData.description ?? "",
    target_users: ideaData.target_users ?? "",
    key_features: ideaData.key_features ?? ideaData.core_features ?? [],
    tech_preferences: ideaData.tech_preferences ?? [],
    constraints: ideaData.constraints ?? [],
    success_criteria: [],
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-4">
           <button onClick={() => router.push(`/projects/${projectId}`)} className="text-zinc-500 hover:text-zinc-300">←</button>
           <h2 className="text-2xl font-bold text-white">{isReadOnly ? "Idea Summary" : "Refine your idea"}</h2>
        </div>
        
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <ClarifyingQuestions
            idea={structuredIdea}
            questions={ideaData.questions ?? []}
            warnings={ideaData.warnings ?? []}
            round={round}
            onRefine={handleRefine}
            onConfirm={handleConfirm}
            loading={processing}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
