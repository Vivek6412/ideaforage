"use client";

import { useState } from "react";

type SectionStatus = "pending_review" | "approved";

interface Props {
  title: string;
  section: string;
  content: string | string[] | Record<string, unknown>;
  status: SectionStatus;
  projectId: string;
  view: "plain" | "technical" | "both";
  onApprove?: (section: string) => void;
  onEdit?: (section: string, content: string) => Promise<void>;
  readOnly?: boolean;
}

function renderContent(
  content: string | string[] | Record<string, unknown>,
  view: "plain" | "technical" | "both",
  section?: string
): React.ReactNode {
  // Fix for folder_structure coming in as a space-separated string
  if (section === "folder_structure" && typeof content === "string") {
    if (!content.includes("\n") && content.includes(" ")) {
      content = content.split(" ").filter(Boolean);
    }
  }

  if (Array.isArray(content)) {
    return (
      <ul className="space-y-1.5">
        {content.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
            <span className="text-orange-500 mt-0.5 shrink-0">—</span>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof content === "object" && content !== null) {
    if (view === "plain") {
      return (
        <ul className="space-y-1.5">
          {Object.entries(content).map(([k, v]) => (
            <li key={k} className="text-sm text-zinc-300">
              <span className="text-zinc-500 font-mono text-xs">{k}:</span>{" "}
              {String(v)}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <pre className="text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed bg-zinc-950 rounded-lg p-3 border border-zinc-800">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  }

  return <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{String(content)}</p>;
}

export function BlueprintCard({
  title,
  section,
  content,
  status,
  projectId,
  view,
  onApprove,
  onEdit,
  readOnly = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    typeof content === "string" ? content : JSON.stringify(content, null, 2)
  );
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const approved = status === "approved";

  async function handleSave() {
    setSaving(true);
    setEditError(null);
    try {
      if (onEdit) await onEdit(section, draft);
      setEditing(false);
    } catch (e: any) {
      setEditError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-xl border transition-all ${
        approved
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
              approved
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}
          >
            {approved ? "Approved" : "Pending Review"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && !approved && !editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onApprove?.(section)}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                Approve
              </button>
            </>
          )}
          {!readOnly && approved && (
            <button
              onClick={() => onApprove?.(section)} // toggle off
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Undo
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-orange-500/60 resize-y transition-colors"
            />
            {editError && (
              <p className="text-xs text-red-400">{editError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-400 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditError(null); }}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          renderContent(content, view, section)
        )}
      </div>
    </div>
  );
}