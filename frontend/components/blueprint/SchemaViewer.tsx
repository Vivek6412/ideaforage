"use client";

import { useState } from "react";

interface Props {
  schema: string; // raw SQL DDL from blueprint
}

type SchemaMode = "standard" | "detailed";

interface ParsedTable {
  name: string;
  fields: string[];
  rawSql: string;
}

function parseTables(sql: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const createRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([^;]+)\)/gi;
  let match;

  while ((match = createRegex.exec(sql)) !== null) {
    const name = match[1];
    const body = match[2];
    const rawSql = match[0] + ";";

    const fields = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("--") && !l.startsWith("CONSTRAINT") && !l.startsWith("PRIMARY") && !l.startsWith("FOREIGN") && !l.startsWith("UNIQUE") && !l.startsWith("CHECK"))
      .map((l) => {
        const parts = l.replace(/,$/, "").trim().split(/\s+/);
        return parts.slice(0, 2).join(" "); // name + type
      })
      .filter(Boolean);

    tables.push({ name, fields, rawSql });
  }

  return tables;
}

function colorSql(sql: string): React.ReactNode {
  const keywords = /\b(CREATE|TABLE|PRIMARY|KEY|REFERENCES|DEFAULT|NOT|NULL|CHECK|UNIQUE|IN|ON|DELETE|CASCADE|TIMESTAMPTZ|UUID|TEXT|VARCHAR|INTEGER|BOOLEAN|JSONB|SERIAL)\b/g;
  const parts = sql.split(keywords);

  return parts.map((part, i) => {
    if (keywords.test(part)) {
      return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
    }
    // String literals
    const strParts = part.split(/('.*?')/g);
    return strParts.map((s, j) =>
      s.startsWith("'") ? (
        <span key={`${i}-${j}`} className="text-emerald-400">{s}</span>
      ) : (
        <span key={`${i}-${j}`}>{s}</span>
      )
    );
  });
}

export function SchemaViewer({ schema }: Props) {
  const [mode, setMode] = useState<SchemaMode>("standard");
  const tables = parseTables(schema || "");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Database Schema
        </span>
        <div className="flex rounded-lg border border-zinc-700 overflow-hidden text-xs">
          {(["standard", "detailed"] as SchemaMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                mode === m
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {m === "standard" ? "Standard" : "Full SQL"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tables.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-6">No schema available</p>
        ) : mode === "standard" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tables.map((t) => (
              <div
                key={t.name}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-orange-400">
                    {t.name}
                  </span>
                  <span className="ml-auto text-xs text-zinc-600">
                    {t.fields.length} fields
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {t.fields.map((f, i) => (
                    <li key={i} className="text-xs text-zinc-400 font-mono flex gap-2">
                      <span className="text-zinc-600">—</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {tables.map((t) => (
              <div key={t.name}>
                <p className="text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                  {t.name}
                </p>
                <pre className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 text-xs font-mono overflow-x-auto leading-relaxed text-zinc-300">
                  {colorSql(t.rawSql)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}