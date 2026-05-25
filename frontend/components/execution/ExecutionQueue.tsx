"use client";

import type { ExecutionTask, TaskStatus } from "@/hooks/useExecution";

interface Props {
  tasks: ExecutionTask[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_META: Record<
  TaskStatus,
  { icon: string; label: string; color: string; ring: string }
> = {
  pending: {
    icon: "⏳",
    label: "Pending",
    color: "text-zinc-500",
    ring: "border-zinc-700",
  },
  running: {
    icon: "⚡",
    label: "Running",
    color: "text-orange-400",
    ring: "border-orange-500/40",
  },
  pending_review: {
    icon: "👁",
    label: "Review",
    color: "text-amber-400",
    ring: "border-amber-500/40",
  },
  approved: {
    icon: "✅",
    label: "Approved",
    color: "text-emerald-400",
    ring: "border-emerald-500/30",
  },
  failed: {
    icon: "❌",
    label: "Failed",
    color: "text-red-400",
    ring: "border-red-500/40",
  },
  skipped: {
    icon: "⏭",
    label: "Skipped",
    color: "text-zinc-600",
    ring: "border-zinc-800",
  },
};

export function ExecutionQueue({ tasks, selectedId, onSelect }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-zinc-600 text-sm">No tasks yet.</p>
        <p className="text-zinc-700 text-xs mt-1">Start execution to begin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task, idx) => {
        const meta = STATUS_META[task.status] ?? STATUS_META.pending;
        const isSelected = task.id === selectedId;
        const isRunning = task.status === "running";

        return (
          <button
            key={task.id}
            onClick={() => onSelect(task.id)}
            className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
              isSelected
                ? "bg-zinc-800 border-orange-500/30"
                : `bg-zinc-900/40 ${meta.ring} hover:bg-zinc-800/60`
            }`}
          >
            <div className="flex items-center gap-2.5">
              {/* Order number */}
              <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-mono text-zinc-500">
                {idx + 1}
              </span>

              {/* Status icon */}
              <span
                className={`shrink-0 text-base ${isRunning ? "animate-pulse" : ""}`}
              >
                {meta.icon}
              </span>

              {/* Name */}
              <span
                className={`flex-1 text-xs font-medium truncate ${
                  isSelected ? "text-white" : "text-zinc-300"
                }`}
              >
                {task.task_name}
              </span>

              {/* Retry badge */}
              {task.retry_count > 0 && (
                <span className="shrink-0 rounded-full bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-mono text-amber-400">
                  ×{task.retry_count}
                </span>
              )}
            </div>

            {/* Running pulse bar */}
            {isRunning && (
              <div className="mt-2 h-0.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-orange-500 animate-[slide_1.5s_ease-in-out_infinite]" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}