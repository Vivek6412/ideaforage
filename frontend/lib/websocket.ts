const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

type EventHandler = (data: Record<string, unknown>) => void;

export interface ProjectWS {
  onEvent: (type: string, handler: EventHandler) => void;
  offEvent: (type: string, handler: EventHandler) => void;
  disconnect: () => void;
}

export function createProjectWS(projectId: string): ProjectWS {
  const url = `${WS_BASE}/ws/projects/${projectId}/execution`;
  const ws = new WebSocket(url);

  const listeners = new Map<string, Set<EventHandler>>();

  ws.addEventListener("message", (msg) => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(msg.data as string);
    } catch {
      return;
    }
    const type = parsed.event as string | undefined;
    if (!type) return;

    listeners.get(type)?.forEach((h) => h(parsed));
    listeners.get("*")?.forEach((h) => h(parsed));  // wildcard
  });

  ws.addEventListener("error", (e) => {
    console.error("[WS] error", e);
  });

  function onEvent(type: string, handler: EventHandler): void {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(handler);
  }

  function offEvent(type: string, handler: EventHandler): void {
    listeners.get(type)?.delete(handler);
  }

  function disconnect(): void {
    ws.close();
    listeners.clear();
  }

  return { onEvent, offEvent, disconnect };
}