"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

export type TaskStatus =
  | "pending"
  | "running"
  | "pending_review"
  | "approved"
  | "failed"
  | "skipped";

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ValidationResult {
  passed: boolean;
  issues: string[];
}

export interface ExecutionTask {
  id: string;
  task_name: string;
  task_order: number;
  status: TaskStatus;
  retry_count: number;
  depends_on: string[];
  generated_files: GeneratedFile[] | null;
  validation_result?: ValidationResult | null;
  error_log: string | null;
}

interface WsEvent {
  event: string;
  task_id?: string;
  task_name?: string;
  files?: GeneratedFile[];
  error?: string;
  reason?: string;
  attempt?: number;
  fix_type?: string;
  platform?: string;
  message?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function useExecution(projectId: string) {
  const [tasks, setTasks] = useState<ExecutionTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [projectState, setProjectState] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // ── Task helpers ───────────────────────────────────────────────────────────

  function updateTask(taskId: string, patch: Partial<ExecutionTask>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    );
  }

  // ── Load tasks from REST on mount ──────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    try {
      const data = await apiClient.get<{
        tasks: ExecutionTask[];
        project_state: string;
      }>(`/api/v1/projects/${projectId}/execution/status`);
      setTasks(data.tasks ?? []);
      setProjectState(data.project_state ?? "");
      if (!selectedTaskId && data.tasks && data.tasks.length > 0) {
        setSelectedTaskId(data.tasks[0].id);
      }
    } catch {
      // ignore; WS will provide updates
    }
  }, [projectId, selectedTaskId]);

  // ── WebSocket ──────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const url = `${WS_BASE}/ws/projects/${projectId}/execution`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setWsConnected(true);
      setWsError(null);
      retriesRef.current = 0;
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setWsConnected(false);
      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, RETRY_DELAY_MS);
      } else {
        setWsError(`WebSocket disconnected after ${MAX_RETRIES} retries.`);
      }
    };

    ws.onerror = () => {
      setWsError("WebSocket connection error");
    };

    ws.onmessage = (msg) => {
      let ev: WsEvent;
      try {
        ev = JSON.parse(msg.data as string);
      } catch {
        return;
      }

      switch (ev.event) {
        case "task_started":
          if (ev.task_id) {
            updateTask(ev.task_id, { status: "running" });
            setSelectedTaskId(ev.task_id);
          }
          break;

        case "task_generating":
          if (ev.task_id) updateTask(ev.task_id, { status: "running" });
          break;

        case "task_pending_review":
          if (ev.task_id) {
            updateTask(ev.task_id, {
              status: "pending_review",
              generated_files: ev.files ?? null,
            });
            setSelectedTaskId(ev.task_id);
          }
          break;

        case "task_retrying":
          if (ev.task_id)
            updateTask(ev.task_id, {
              status: "running",
              retry_count: (ev.attempt ?? 1),
            });
          break;

        case "fix_injected":
          if (ev.task_id) updateTask(ev.task_id, { status: "running" });
          break;

        case "task_approved":
          if (ev.task_id) updateTask(ev.task_id, { status: "approved" });
          break;

        case "task_failed":
          if (ev.task_id)
            updateTask(ev.task_id, {
              status: "failed",
              error_log: ev.error ?? null,
            });
          break;

        case "task_paused":
          setProjectState("PAUSED");
          break;

        case "execution_complete":
          setProjectState("EXECUTION_COMPLETE");
          loadTasks();
          break;

        default:
          break;
      }
    };
  }, [projectId, loadTasks]);

  useEffect(() => {
    mountedRef.current = true;
    loadTasks();
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect, loadTasks]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const startExecution = useCallback(async () => {
    await apiClient.post(`/api/v1/projects/${projectId}/execution/start`);
    await loadTasks();
  }, [projectId, loadTasks]);

  const approve = useCallback(
    async (taskId: string) => {
      // Optimistic update
      updateTask(taskId, { status: "approved" });
      try {
        await apiClient.post(
          `/api/v1/projects/${projectId}/execution/tasks/${taskId}/approve`
        );
      } catch {
        // Revert on failure
        updateTask(taskId, { status: "pending_review" });
      }
    },
    [projectId]
  );

  const fix = useCallback(
    async (taskId: string, feedback: string) => {
      updateTask(taskId, { status: "running" });
      await apiClient.post(
        `/api/v1/projects/${projectId}/execution/tasks/${taskId}/fix`,
        { feedback }
      );
    },
    [projectId]
  );

  const pause = useCallback(async () => {
    await apiClient.post(`/api/v1/projects/${projectId}/execution/pause`);
    setProjectState("PAUSED");
  }, [projectId]);

  const resume = useCallback(async () => {
    await apiClient.post(`/api/v1/projects/${projectId}/execution/resume`);
    setProjectState("EXECUTION_RUNNING");
  }, [projectId]);

  const currentTask =
    tasks.find((t) => t.id === selectedTaskId) ?? null;

  const approvedCount = tasks.filter((t) => t.status === "approved").length;

  return {
    tasks,
    currentTask,
    selectedTaskId,
    setSelectedTaskId,
    wsConnected,
    wsError,
    projectState,
    approvedCount,
    startExecution,
    approve,
    fix,
    pause,
    resume,
    loadTasks,
  };
}