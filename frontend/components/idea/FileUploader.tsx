"use client";

import { useRef, useState, useCallback } from "react";

const ALLOWED_TYPES = [".md", ".txt", ".pdf", ".docx"];
const ALLOWED_MIME = [
  "text/markdown",
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(filename: string): string {
  return "." + filename.split(".").pop()!.toLowerCase();
}

interface Props {
  onFileReady: (file: File) => void;
}

export function FileUploader({ onFileReady }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((f: File): boolean => {
    const ext = getExtension(f.name);
    if (!ALLOWED_TYPES.includes(ext)) {
      setError(`Unsupported file type "${ext}". Allowed: ${ALLOWED_TYPES.join(", ")}`);
      return false;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum 10 MB.");
      return false;
    }
    setError(null);
    return true;
  }, []);

  function accept(f: File) {
    if (!validate(f)) return;
    setFile(f);
    onFileReady(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) accept(f);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) accept(f);
  }

  function clear() {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const extIcon: Record<string, string> = {
    ".pdf": "📄",
    ".docx": "📝",
    ".md": "📋",
    ".txt": "📃",
  };

  return (
    <div>
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all ${
            dragging
              ? "border-orange-500 bg-orange-500/5"
              : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_TYPES.join(",")}
            onChange={onInputChange}
          />
          <svg
            className={`w-8 h-8 mb-3 transition-colors ${dragging ? "text-orange-400" : "text-zinc-600"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm text-zinc-400 mb-1">
            Drop file here or <span className="text-orange-400">browse</span>
          </p>
          <p className="text-xs text-zinc-600">
            {ALLOWED_TYPES.join("  ·  ")} — max 10 MB
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <span className="text-2xl">
            {extIcon[getExtension(file.name)] ?? "📄"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{file.name}</p>
            <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
          </div>
          <button
            onClick={clear}
            className="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded"
            aria-label="Remove file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}