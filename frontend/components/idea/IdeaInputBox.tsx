"use client";

import { useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";
import { FileUploader } from "./FileUploader";
import { ImageUploader } from "./ImageUploader";

type Mode = "text" | "voice" | "file" | "image";

interface Props {
  projectId: string;
  onResult: (data: IdeaResponse) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
}

interface IdeaResponse {
  title?: string;
  description?: string;
  target_users?: string;
  core_features?: string[];
  tech_preferences?: string[];
  constraints?: string[];
  questions?: Array<{ id: string; question: string; field: string; options: string[] }>;
  warnings?: Array<{ type: string; message: string }>;
  ready_to_proceed?: boolean;
  core_idea?: string;
  key_features?: string[];
}

const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "text", label: "Text", icon: "✏️" },
  { id: "voice", label: "Voice", icon: "🎙️" },
  { id: "file", label: "File", icon: "📄" },
  { id: "image", label: "Image", icon: "🖼️" },
];

export function IdeaInputBox({ projectId, onResult, loading, setLoading, setError }: Props) {
  const [activeModes, setActiveModes] = useState<Set<Mode>>(new Set(["text"]));
  const [text, setText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);

  function toggleMode(mode: Mode) {
    setActiveModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode) && mode !== "text") {
        next.delete(mode);
      } else {
        next.add(mode);
      }
      return next;
    });
  }

  const hasInput =
    text.trim().length > 0 || audioBlob || file || image;

  async function handleSubmit() {
    if (!hasInput) {
      setError("Add at least one input before processing.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const form = new FormData();
      if (text.trim()) form.append("text", text.trim());
      if (audioBlob) form.append("voice", audioBlob, "recording.webm");
      if (file) form.append("file", file);
      if (image) form.append("image", image);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects/${projectId}/idea/process`,
        { method: "POST", credentials: "include", body: form }
      );

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.detail?.detail ?? data?.detail ?? "Processing failed.";
        setError(msg);
        return;
      }
      onResult(data);
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Mode toggle tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => toggleMode(m.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeModes.has(m.id)
                ? "bg-orange-500/20 border border-orange-500/40 text-orange-300"
                : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>{m.icon}</span>
            {m.label}
            {activeModes.has(m.id) && m.id !== "text" && (
              <span className="ml-1 opacity-60">✓</span>
            )}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-zinc-600">
          Combine multiple inputs
        </span>
      </div>

      {/* Text input (always shown, part of Text mode) */}
      {activeModes.has("text") && (
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe your idea… Be as vague or specific as you want. The AI will ask clarifying questions."
            rows={6}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/60 resize-none transition-colors font-sans leading-relaxed"
          />
          <span className="absolute bottom-3 right-3 text-xs text-zinc-600">
            {text.length} chars
          </span>
        </div>
      )}

      {/* Voice recorder */}
      {activeModes.has("voice") && (
        <div>
          <p className="text-xs font-mono text-zinc-600 mb-2 uppercase tracking-widest">Voice</p>
          <VoiceRecorder onAudioReady={setAudioBlob} />
        </div>
      )}

      {/* File upload */}
      {activeModes.has("file") && (
        <div>
          <p className="text-xs font-mono text-zinc-600 mb-2 uppercase tracking-widest">Document</p>
          <FileUploader onFileReady={setFile} />
        </div>
      )}

      {/* Image upload */}
      {activeModes.has("image") && (
        <div>
          <p className="text-xs font-mono text-zinc-600 mb-2 uppercase tracking-widest">Image / Sketch</p>
          <ImageUploader onImageReady={setImage} />
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !hasInput}
        className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-orange-200/40 border-t-white rounded-full animate-spin" />
            Processing idea…
          </span>
        ) : (
          "Process Idea →"
        )}
      </button>
    </div>
  );
}