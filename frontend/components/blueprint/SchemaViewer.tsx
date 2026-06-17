"use client";

import { useState } from "react";

interface Field {
  name: string;
  type: string;
  constraints?: string[];
}

interface Table {
  name: string;
  fields: Field[];
  relationships?: string[];
  indexes?: string[];
}

interface SchemaData {
  tables?: Table[];
}

interface Props {
  schema: SchemaData | string;
}

type SchemaMode = "standard" | "detailed";

function parseLegacySql(sql: string): Table[] {
  const tables: Table[] = [];
  const createRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([^;]+)\)/gi;
  let match;

  while ((match = createRegex.exec(sql)) !== null) {
    const name = match[1];
    const body = match[2];

    const fields = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("--") && !l.startsWith("CONSTRAINT") && !l.startsWith("PRIMARY") && !l.startsWith("FOREIGN") && !l.startsWith("UNIQUE") && !l.startsWith("CHECK"))
      .map((l) => {
        const parts = l.replace(/,$/, "").trim().split(/\s+/);
        return { name: parts[0] || "", type: parts[1] || "", constraints: parts.slice(2) };
      })
      .filter((f) => f.name);

    tables.push({ name, fields, relationships: [], indexes: [] });
  }

  return tables;
}

function generateRawSql(table: Table): string {
  let sql = `CREATE TABLE ${table.name} (\n`;
  const fieldLines = table.fields.map(f => {
    let line = `  ${f.name} ${f.type}`;
    if (f.constraints && f.constraints.length > 0) {
      line += ` ${f.constraints.join(" ")}`;
    }
    return line;
  });
  sql += fieldLines.join(",\n");
  sql += "\n);";
  return sql;
}

function colorSql(sql: string): React.ReactNode {
  const keywords = /\b(CREATE|TABLE|PRIMARY|KEY|REFERENCES|DEFAULT|NOT|NULL|CHECK|UNIQUE|IN|ON|DELETE|CASCADE|TIMESTAMPTZ|UUID|TEXT|VARCHAR|INTEGER|BOOLEAN|JSONB|SERIAL)\b/g;
  const parts = sql.split(keywords);

  return parts.map((part, i) => {
    if (keywords.test(part)) {
      return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
    }
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
  
  let tables: Table[] = [];
  if (typeof schema === "string") {
    tables = parseLegacySql(schema);
  } else if (schema && schema.tables) {
    tables = schema.tables;
  }

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
                    {t.fields?.length || 0} fields
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {t.fields?.map((f, i) => (
                    <li key={i} className="text-xs text-zinc-400 font-mono flex gap-2">
                      <span className="text-zinc-600">—</span>
                      {f.name} <span className="text-zinc-500">{f.type}</span>
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
                  {colorSql(generateRawSql(t))}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}