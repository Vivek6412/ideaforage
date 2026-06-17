"use client";

import { useState } from "react";

interface PromptItem {
  id: string;
  name: string;
  type: string;
  content: string;
  depends_on?: string[];
}

interface Props {
  prompt: PromptItem;
  status: "pending_review" | "approved";
  onApprove: (id: string) => void;
}

export function PromptCard({ prompt, status, onApprove }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">{prompt.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {prompt.type}
              </span>
            </div>
            <span className="text-xs text-zinc-500 font-mono mt-0.5">ID: {prompt.id}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? "Hide Details" : "View Prompt"}
          </button>
          
          <button
            onClick={() => onApprove(prompt.id)}
            className={`rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wide transition-colors ${
              status === "approved"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-zinc-700 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400"
            }`}
          >
            {status === "approved" ? "Approved ✓" : "Approve"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-5 bg-zinc-950">
          <div className="mb-4">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Dependencies</span>
            {prompt.depends_on && prompt.depends_on.length > 0 ? (
              <div className="flex gap-2 mt-1">
                {prompt.depends_on.map(dep => (
                  <span key={dep} className="text-xs font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                    {dep}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 mt-1">None</p>
            )}
          </div>
          <div>
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Prompt Content</span>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-300 font-mono bg-zinc-900 p-4 rounded-lg border border-zinc-800 overflow-x-auto">
              {prompt.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
