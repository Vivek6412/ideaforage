"use client";

import { useParams, useRouter } from "next/navigation";
import { useExecution } from "@/hooks/useExecution";
import { ExecutionQueue } from "@/components/execution/ExecutionQueue";
import { TaskCard } from "@/components/execution/TaskCard";
import { ProgressBar } from "@/components/execution/ProgressBar";

export default function ExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const {
    tasks,
    currentTask,
    selectedTaskId,
    setSelectedTaskId,
    wsConnected,
    wsError,
    projectState,
    approvedCount,
    startExecution,
    approve,
    fix,
    pause,
    resume,
  } = useExecution(projectId);

  const isRunning = projectState === "EXECUTION_RUNNING";
  const isPaused = projectState === "PAUSED";
  const isComplete = projectState === "EXECUTION_COMPLETE";
  const notStarted = !isRunning && !isPaused && !isComplete && tasks.length === 0;

  async function handleStart() {
    try {
      await startExecution();
    } catch (e: any) {
      console.error("Start failed", e?.message);
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-zinc-950 flex flex-col">

      {/* Top bar */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          ← Back
        </button>
        <span className="text-zinc-700">/</span>
        <h1 className="text-sm font-semibold text-zinc-200">Execution</h1>

        <div className="ml-auto flex items-center gap-3">
          {/* WS status dot */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                wsConnected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span className="text-[10px] font-mono text-zinc-600">
              {wsConnected ? "Live" : "Offline"}
            </span>
          </div>

          {/* Controls */}
          {notStarted && (
            <button
              onClick={handleStart}
              className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
            >
              ▶ Start Execution
            </button>
          )}
          {isRunning && (
            <button
              onClick={pause}
              className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              ⏸ Pause
            </button>
          )}
          {isPaused && (
            <button
              onClick={resume}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              ▶ Resume
            </button>
          )}
          {isComplete && (
            <button
              onClick={() => router.push(`/projects/${projectId}/github`)}
              className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
            >
              Push to GitHub →
            </button>
          )}
        </div>
      </div>

      {/* WS error banner */}
      {wsError && (
        <div className="shrink-0 bg-red-500/10 border-b border-red-500/20 px-6 py-2">
          <p className="text-xs text-red-400">{wsError}</p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar: queue ── */}
        <div className="w-72 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 space-y-3">
            <ProgressBar approved={approvedCount} total={tasks.length} />
            {(isRunning || isPaused) && (
              <div
                className={`text-[10px] font-mono uppercase tracking-widest ${
                  isPaused ? "text-amber-400" : "text-orange-400"
                }`}
              >
                {isPaused ? "⏸ Paused" : "⚡ Running"}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <ExecutionQueue
              tasks={tasks}
              selectedId={selectedTaskId}
              onSelect={setSelectedTaskId}
            />
          </div>
        </div>

        {/* ── Right panel: task detail ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {notStarted ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-3xl">
                ⚡
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">
                  Ready to execute
                </h2>
                <p className="text-zinc-500 text-sm max-w-xs">
                  Claude Code will generate files task-by-task. You review and approve each one.
                </p>
              </div>
              <button
                onClick={handleStart}
                className="rounded-xl px-8 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
              >
                ▶ Start Execution
              </button>
            </div>
          ) : currentTask ? (
            <TaskCard
              task={currentTask}
              onApprove={approve}
              onFix={fix}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
              <p className="text-zinc-600 text-sm">Select a task from the queue</p>
            </div>
          )}

          {/* Complete state overlay */}
          {isComplete && (
            <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-8 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Execution Complete
                </h3>
                <p className="text-zinc-400 text-sm">
                  All {tasks.length} tasks approved. Ready to push to GitHub.
                </p>
              </div>
              <button
                onClick={() => router.push(`/projects/${projectId}/github`)}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
              >
                Push to GitHub →
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}