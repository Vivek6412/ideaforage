"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Props {
  onAudioReady: (blob: Blob) => void;
}

type RecordState = "idle" | "recording" | "done";

export function VoiceRecorder({ onAudioReady }: Props) {
  const [state, setState] = useState<RecordState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [bars, setBars] = useState<number[]>(Array(20).fill(4));

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Animate bars from analyser data
  const animateBars = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const sliceSize = Math.floor(data.length / 20);
    const newBars = Array.from({ length: 20 }, (_, i) => {
      const slice = data.slice(i * sliceSize, (i + 1) * sliceSize);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      return Math.max(4, Math.min(40, (avg / 255) * 40));
    });
    setBars(newBars);
    animRef.current = requestAnimationFrame(animateBars);
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for waveform
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onAudioReady(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (animRef.current) cancelAnimationFrame(animRef.current);
        setBars(Array(20).fill(4));
      };

      mr.start(100);
      setState("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      animRef.current = requestAnimationFrame(animateBars);
    } catch {
      setError("Microphone access denied. Please allow mic permissions.");
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setState("done");
  }

  function reset() {
    setState("idle");
    setSeconds(0);
    setBars(Array(20).fill(4));
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-2 h-2 rounded-full ${
            state === "recording"
              ? "bg-red-400 animate-pulse"
              : "bg-zinc-600"
          }`}
        />
        <span className="text-sm font-mono text-zinc-400">
          {state === "idle" && "Ready to record"}
          {state === "recording" && `Recording — ${fmt(seconds)}`}
          {state === "done" && "Recording complete ✓"}
        </span>
      </div>

      {/* Waveform bars */}
      <div className="flex items-center justify-center gap-0.5 h-12 mb-5">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              state === "recording" ? "bg-orange-500/80" : "bg-zinc-700"
            }`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {state === "idle" && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Start Recording
          </button>
        )}
        {state === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <span className="w-2 h-2 rounded bg-zinc-300" />
            Stop
          </button>
        )}
        {state === "done" && (
          <>
            <span className="flex items-center gap-2 text-sm text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Audio attached ({fmt(seconds)})
            </span>
            <button
              onClick={reset}
              className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Re-record
            </button>
          </>
        )}
      </div>
    </div>
  );
}