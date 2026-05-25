"use client";

import { useEffect, useState } from "react";

interface Props {
  code: string;
  filename: string;
}

function extToLang(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    py: "python",
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    env: "bash",
    txt: "text",
  };
  return map[ext] ?? "text";
}

export function CodeViewer({ code, filename }: Props) {
  const [SyntaxHighlighter, setSyntaxHighlighter] = useState<any>(null);
  const [style, setStyle] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ Light: SHL }, { default: atomDark }] = await Promise.all([
        import("react-syntax-highlighter"),
        import("react-syntax-highlighter/dist/esm/styles/prism/atom-dark"),
      ]);
      if (!cancelled) {
        setSyntaxHighlighter(() => SHL);
        setStyle(atomDark);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const language = extToLang(filename);
  const lines = code.split("\n").length;
  const PREVIEW_LINES = 30;
  const isLong = lines > PREVIEW_LINES;
  const displayCode =
    isLong && !expanded
      ? code.split("\n").slice(0, PREVIEW_LINES).join("\n") + "\n…"
      : code;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* File header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500/60" />
          <code className="text-xs text-zinc-300 font-mono">{filename}</code>
          <span className="text-xs text-zinc-600 font-mono">{lines} lines</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">
            {language}
          </span>
          <button
            onClick={copy}
            className="rounded px-2 py-0.5 text-xs text-zinc-500 border border-zinc-700 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="text-xs overflow-x-auto max-h-[480px] overflow-y-auto">
        {SyntaxHighlighter && style ? (
          <SyntaxHighlighter
            language={language}
            style={style}
            showLineNumbers
            wrapLongLines={false}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.72rem",
              lineHeight: "1.6",
            }}
            lineNumberStyle={{ color: "#3f3f46", fontSize: "0.65rem" }}
          >
            {displayCode}
          </SyntaxHighlighter>
        ) : (
          <pre className="p-4 text-xs text-zinc-400 font-mono leading-relaxed whitespace-pre overflow-x-auto">
            {displayCode}
          </pre>
        )}
      </div>

      {/* Expand */}
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 border-t border-zinc-800 bg-zinc-900/40 transition-colors font-mono"
        >
          {expanded ? "Show less ↑" : `Show all ${lines} lines ↓`}
        </button>
      )}
    </div>
  );
}