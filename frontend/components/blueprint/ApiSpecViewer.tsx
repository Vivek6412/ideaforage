"use client";

import { useState } from "react";

interface ApiEndpoint {
  method: string;
  path: string;
  description?: string;
  request_body?: Record<string, unknown>;
  response?: Record<string, unknown>;
  action?: string;
}

interface Props {
  endpoints: ApiEndpoint[];
}

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  POST: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  PATCH: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  PUT: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-300 border-red-500/30",
};

function domainFromPath(path: string): string {
  const parts = path.replace("/api/v1/", "").split("/");
  return parts[0] ?? "other";
}

function groupEndpoints(endpoints: ApiEndpoint[]): Record<string, ApiEndpoint[]> {
  const groups: Record<string, ApiEndpoint[]> = {};
  for (const ep of endpoints) {
    const domain = domainFromPath(ep.path);
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(ep);
  }
  return groups;
}

function EndpointRow({ ep }: { ep: ApiEndpoint }) {
  const [open, setOpen] = useState(false);
  const style = METHOD_STYLES[ep.method.toUpperCase()] ?? "bg-zinc-700 text-zinc-300 border-zinc-600";

  const hasBody = ep.request_body && Object.keys(ep.request_body).length > 0;
  const hasResponse = ep.response && Object.keys(ep.response).length > 0;

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors text-left"
      >
        <span
          className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold font-mono uppercase ${style}`}
        >
          {ep.method}
        </span>
        <code className="flex-1 text-xs text-zinc-300 truncate">{ep.path}</code>
        {ep.description && (
          <span className="hidden sm:inline text-xs text-zinc-600 truncate max-w-[200px]">
            {ep.description}
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-zinc-600 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-zinc-800 bg-zinc-950/50 px-4 py-4 space-y-3">
          {ep.description && (
            <p className="text-sm text-zinc-400">{ep.description}</p>
          )}
          {ep.action && (
            <p className="text-xs text-zinc-500 italic">{ep.action}</p>
          )}
          {hasBody && (
            <div>
              <p className="text-xs font-mono text-zinc-600 mb-1.5 uppercase tracking-wider">Request body</p>
              <pre className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 overflow-x-auto">
                {JSON.stringify(ep.request_body, null, 2)}
              </pre>
            </div>
          )}
          {hasResponse && (
            <div>
              <p className="text-xs font-mono text-zinc-600 mb-1.5 uppercase tracking-wider">Response</p>
              <pre className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 overflow-x-auto">
                {JSON.stringify(ep.response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ApiSpecViewer({ endpoints }: Props) {
  const groups = groupEndpoints(endpoints ?? []);

  if (!endpoints?.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
        <p className="text-sm text-zinc-500">No API spec available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          API Specification
        </span>
        <span className="text-xs text-zinc-600">{endpoints.length} endpoints</span>
      </div>

      <div className="p-4 space-y-6">
        {Object.entries(groups).map(([domain, eps]) => (
          <div key={domain}>
            <p className="text-xs font-mono text-orange-400/70 uppercase tracking-widest mb-2 capitalize">
              {domain}
            </p>
            <div className="space-y-2">
              {eps.map((ep, i) => (
                <EndpointRow key={`${ep.method}-${ep.path}-${i}`} ep={ep} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}