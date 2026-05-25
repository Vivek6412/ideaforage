"use client";

interface Props {
  error: string;
  retryCount?: number;
}

export function ErrorDisplay({ error, retryCount = 0 }: Props) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/20">
        <span className="text-red-400">❌</span>
        <span className="text-xs font-mono text-red-400 uppercase tracking-wider">
          Task Failed
        </span>
        {retryCount > 0 && (
          <span className="ml-auto text-xs text-red-500/70 font-mono">
            after {retryCount} retr{retryCount === 1 ? "y" : "ies"}
          </span>
        )}
      </div>
      <pre className="px-4 py-3 text-xs text-red-300/80 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-48">
        {error}
      </pre>
    </div>
  );
}