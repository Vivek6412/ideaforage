"use client";

import { useState } from "react";
import type { StructuredIdea } from "@/types";

interface Props {
  idea: StructuredIdea;
  onCorrection?: (field: string, value: string) => void;
}

interface FieldProps {
  label: string;
  field: string;
  value: string | string[];
  onCorrection?: (field: string, value: string) => void;
}

function IdeaField({ label, field, value, onCorrection }: FieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    Array.isArray(value) ? value.join(", ") : value
  );

  function save() {
    onCorrection?.(field, draft);
    setEditing(false);
  }

  const displayValue = Array.isArray(value) ? value : [value];

  return (
    <div className="group relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          {label}
        </span>
        {onCorrection && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="hidden rounded px-2 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 group-hover:block transition-colors"
          >
            edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-lg border border-orange-500/40 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500 resize-none"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="rounded-md bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-400 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <span
              key={i}
              className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300"
            >
              {v}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-zinc-300">{value}</p>
      )}
    </div>
  );
}

export function StructuredIdeaCard({ idea, onCorrection }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          What I understood
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <IdeaField
        label="Core Idea"
        field="core_idea"
        value={idea.core_idea}
        onCorrection={onCorrection}
      />
      <IdeaField
        label="Target Users"
        field="target_users"
        value={idea.target_users}
        onCorrection={onCorrection}
      />
      {idea.key_features?.length > 0 && (
        <IdeaField
          label="Key Features"
          field="key_features"
          value={idea.key_features}
          onCorrection={onCorrection}
        />
      )}
      {idea.tech_preferences?.length > 0 && (
        <IdeaField
          label="Tech Preferences"
          field="tech_preferences"
          value={idea.tech_preferences}
          onCorrection={onCorrection}
        />
      )}
      {idea.constraints?.length > 0 && (
        <IdeaField
          label="Constraints"
          field="constraints"
          value={idea.constraints}
          onCorrection={onCorrection}
        />
      )}
    </div>
  );
}