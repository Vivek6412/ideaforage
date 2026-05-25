"use client";

import { useRef, useState } from "react";

const ALLOWED_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

interface Props {
  onImageReady: (file: File) => void;
}

export function ImageUploader({ onImageReady }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function accept(f: File) {
    if (!ALLOWED_MIME.includes(f.type)) {
      setError(`Unsupported type. Allowed: ${ALLOWED_EXT.join(", ")}`);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Image too large. Maximum 5 MB.");
      return;
    }
    setError(null);
    setFile(f);
    onImageReady(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) accept(f);
  }

  function clear() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {!preview ? (
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
            accept={ALLOWED_EXT.join(",")}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) accept(f); }}
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-zinc-400 mb-1">
            Drop image here or <span className="text-orange-400">browse</span>
          </p>
          <p className="text-xs text-zinc-600">PNG · JPG · WebP — max 5 MB</p>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-zinc-700 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Uploaded preview"
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={clear}
              className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              Remove
            </button>
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="rounded-md bg-zinc-900/90 px-2 py-0.5 text-xs text-zinc-400 truncate max-w-[70%]">
              {file?.name}
            </span>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400">
              Ready
            </span>
          </div>
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