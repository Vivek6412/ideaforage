"use client";

import { useState } from "react";
import { CodeViewer } from "./CodeViewer";
import { ErrorDisplay } from "./ErrorDisplay";
import type { ExecutionTask } from "@/hooks/useExecution";

interface Props {
  task: ExecutionTask;
  onApprove: (id: string) => void;
  onFix: (id: string, feedback: string) => void;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: "Pending", color: "text-zinc-500 border-zinc-700 bg-zinc-800" },
  running: { text: "Generating…", color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
  pending_review: { text: "Pending Review", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  approved: { text: "Approved", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  failed: { text: "Failed", color: "text-red-400 border-red-500/30 bg-red-500/10" },
  skipped: { text: "Skipped", color: "text-zinc-600 border-zinc-800 bg-zinc-900" },
};

export function TaskCard({ task, onApprove, onFix }: Props) {
  const [activeFile, setActiveFile] = useState(0);
  const [fixMode, setFixMode] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const files = task.generated_files ?? [];
  const badge = STATUS_LABEL[task.status] ?? STATUS_LABEL.pending;
  const canApprove = task.status === "pending_review";
  const canFix = task.status === "pending_review" || task.status === "failed";
  const isRunning = task.status === "running";

  async function handleFix() {
    if (!feedback.trim()) return;
    setSubmitting(true);
    try {
      await onFix(task.id, feedback.trim());
      setFeedback("");
      setFixMode(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {task.task_name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${badge.color}`}
            >
              {badge.text}
            </span>
            {task.retry_count > 0 && (
              <span className="text-xs text-amber-500/70 font-mono">
                retried {task.retry_count}×
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!fixMode && (
          <div className="flex items-center gap-2">
            {canFix && (
              <button
                onClick={() => setFixMode(true)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Request Fix
              </button>
            )}
            {canApprove && (
              <button
                onClick={() => onApprove(task.id)}
                className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
              >
                Approve & Continue →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Running state */}
      {isRunning && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-5 flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-orange-300/70">Claude Code is generating files…</p>
        </div>
      )}

      {/* Error */}
      {task.status === "failed" && task.error_log && (
        <ErrorDisplay error={task.error_log} retryCount={task.retry_count} />
      )}

      {/* Validation result */}
      {task.validation_result && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            task.validation_result.passed
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-amber-500/20 bg-amber-500/5"
          }`}
        >
          <p
            className={`text-xs font-mono mb-1 ${
              task.validation_result.passed ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {task.validation_result.passed
              ? "✅ Validation passed"
              : "⚠ Validation issues"}
          </p>
          {!task.validation_result.passed &&
            task.validation_result.issues.map((issue, i) => (
              <p key={i} className="text-xs text-amber-300/70 mt-0.5">
                — {issue}
              </p>
            ))}
        </div>
      )}

      {/* Fix input */}
      {fixMode && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-200">Describe the fix needed</p>
          <p className="text-xs text-zinc-500">
            Be specific — the AI will use your feedback to regenerate this task.
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="e.g. The authentication middleware is missing the refresh token logic. Also add rate limiting to the login endpoint."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/60 resize-none transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={handleFix}
              disabled={submitting || !feedback.trim()}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
            >
              {submitting ? "Submitting…" : "Submit Fix →"}
            </button>
            <button
              onClick={() => { setFixMode(false); setFeedback(""); }}
              className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Generated files */}
      {files.length > 0 && (
        <div className="space-y-3">
          {/* File tabs */}
          <div className="flex gap-1 flex-wrap">
            {files.map((f, i) => (
              <button
                key={f.path}
                onClick={() => setActiveFile(i)}
                className={`rounded-md px-3 py-1 text-xs font-mono transition-colors border ${
                  activeFile === i
                    ? "bg-zinc-800 border-zinc-600 text-zinc-200"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f.path.split("/").pop()}
              </button>
            ))}
          </div>

          {/* Active file viewer */}
          {files[activeFile] && (
            <div>
              <p className="text-xs font-mono text-zinc-600 mb-2">
                {files[activeFile].path}
              </p>
              <CodeViewer
                code={files[activeFile].content}
                filename={files[activeFile].path}
              />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && !isRunning && task.status !== "failed" && task.status !== "pending" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 py-10 flex items-center justify-center">
          <p className="text-zinc-600 text-sm">No files generated yet.</p>
        </div>
      )}
    </div>
  );
}