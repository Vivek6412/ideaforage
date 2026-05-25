"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  source: string;
}

export function MermaidDiagram({ source }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!source?.trim() || !containerRef.current) return;
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            background: "#18181b",
            primaryColor: "#f97316",
            primaryTextColor: "#f4f4f5",
            primaryBorderColor: "#3f3f46",
            lineColor: "#52525b",
            secondaryColor: "#27272a",
            tertiaryColor: "#1c1c1f",
            edgeLabelBackground: "#27272a",
            clusterBkg: "#27272a",
            titleColor: "#f4f4f5",
            nodeBorder: "#3f3f46",
            mainBkg: "#27272a",
          },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, source);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
          }
          setRendered(true);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Render failed");
          setRendered(false);
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [source]);

  function exportPng() {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "architecture-diagram.png";
      a.click();
    };
    img.src = url;
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Architecture Diagram
        </span>
        {rendered && (
          <button
            onClick={exportPng}
            className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs text-zinc-400 border border-zinc-700 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PNG
          </button>
        )}
      </div>

      <div className="p-4 min-h-[180px] flex items-center justify-center">
        {error ? (
          <div className="text-center space-y-1">
            <p className="text-xs text-red-400">Diagram render failed</p>
            <pre className="text-xs text-zinc-600 max-w-sm">{error}</pre>
          </div>
        ) : !rendered ? (
          <div className="flex items-center gap-2 text-zinc-600 text-sm">
            <span className="w-4 h-4 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
            Rendering…
          </div>
        ) : null}
        <div ref={containerRef} className="w-full" />
      </div>

      <details className="border-t border-zinc-800">
        <summary className="px-4 py-2 text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors font-mono select-none">
          View Mermaid source
        </summary>
        <pre className="px-4 pb-4 text-xs text-zinc-500 overflow-x-auto leading-relaxed">{source}</pre>
      </details>
    </div>
  );
}