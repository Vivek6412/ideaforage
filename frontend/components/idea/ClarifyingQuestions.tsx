"use client";

import { useState } from "react";
import { StructuredIdeaCard } from "./StructuredIdeaCard";
import type { StructuredIdea } from "@/types";

interface Question {
  id: string;
  question: string;
  field: string;
  options: string[];
}

interface Warning {
  type: string;
  message: string;
}

interface Props {
  idea: StructuredIdea;
  questions: Question[];
  warnings: Warning[];
  round: number;
  onRefine: (answers: Record<string, string>, corrections: Record<string, string>) => void;
  onConfirm: () => void;
  loading?: boolean;
}

const WARNING_LABELS: Record<string, string> = {
  too_broad: "Scope Warning",
  infeasible: "Feasibility Note",
  crowded_market: "Market Note",
  max_rounds: "Max Rounds Reached",
};

export function ClarifyingQuestions({
  idea,
  questions,
  warnings,
  round,
  onRefine,
  onConfirm,
  loading = false,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [idkOpen, setIdkOpen] = useState<Set<string>>(new Set());

  function setAnswer(id: string, val: string) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function handleIdk(id: string) {
    setAnswer(id, "idk");
    setIdkOpen((prev) => new Set([...prev, id]));
  }

  function pickOption(id: string, option: string) {
    setAnswer(id, option);
    setIdkOpen((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleRefine() {
    onRefine(answers, corrections);
  }

  const allAnswered = questions.length === 0 || questions.every((q) => answers[q.id]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — structured idea */}
      <div className="space-y-4">
        <StructuredIdeaCard
          idea={idea}
          onCorrection={(field, value) =>
            setCorrections((prev) => ({ ...prev, [field]: value }))
          }
        />
        {Object.keys(corrections).length > 0 && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3">
            <p className="text-xs font-mono text-zinc-500 mb-2">Pending corrections</p>
            {Object.entries(corrections).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 text-xs mb-1">
                <span className="text-zinc-600">{k}:</span>
                <span className="text-zinc-300 truncate">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right — questions + warnings */}
      <div className="space-y-4">
        {/* Warnings */}
        {warnings
          .filter((_, i) => !dismissed.has(i))
          .map((w, i) => (
            <div
              key={i}
              className="relative rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono text-amber-400 uppercase tracking-wide">
                    ⚠ {WARNING_LABELS[w.type] ?? w.type}
                  </span>
                  <p className="mt-1 text-sm text-amber-200/80">{w.message}</p>
                </div>
                <button
                  onClick={() => setDismissed((prev) => new Set([...prev, i]))}
                  className="text-amber-600 hover:text-amber-400 transition-colors shrink-0 mt-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

        {/* Questions */}
        {questions.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Round {round} — {questions.length} question{questions.length > 1 ? "s" : ""}
              </span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            {questions.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3"
              >
                <p className="text-sm text-zinc-200 leading-relaxed">{q.question}</p>

                {/* IDK option chips */}
                {idkOpen.has(q.id) && q.options?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <p className="w-full text-xs text-zinc-500 mb-1">Pick one:</p>
                    {q.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => pickOption(q.id, opt)}
                        className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs text-orange-300 hover:bg-orange-500/20 hover:text-orange-200 transition-colors text-left"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Text input */}
                {!idkOpen.has(q.id) && (
                  <textarea
                    rows={2}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Your answer…"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/60 resize-none transition-colors"
                  />
                )}

                {/* Show selected answer */}
                {answers[q.id] && answers[q.id] !== "idk" && !idkOpen.has(q.id) && (
                  <p className="text-xs text-emerald-400">✓ {answers[q.id]}</p>
                )}

                {/* IDK button */}
                {!idkOpen.has(q.id) && (
                  <button
                    onClick={() => handleIdk(q.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-md px-2.5 py-1 transition-colors"
                  >
                    I don't know
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={handleRefine}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-orange-400 rounded-full animate-spin" />
                  Refining…
                </span>
              ) : (
                "Submit Answers →"
              )}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <p className="text-sm text-emerald-300 font-medium">✓ Idea is clear and ready to proceed</p>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white gradient-forge hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-orange-200/50 border-t-white rounded-full animate-spin" />
              Confirming…
            </span>
          ) : (
            "Looks Good — Proceed to Blueprint →"
          )}
        </button>
      </div>
    </div>
  );
}