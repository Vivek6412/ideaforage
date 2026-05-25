const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isForm = false
): Promise<T> {
  const headers: Record<string, string> = {};
  if (!isForm && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",          // httpOnly cookie forwarded automatically
    headers,
    body: isForm
      ? (body as FormData)
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code = "UNKNOWN_ERROR";
    try {
      const err = await res.json();
      const detail = err?.detail;
      if (typeof detail === "object" && detail !== null) {
        message = detail.detail ?? message;
        code = detail.code ?? code;
      } else if (typeof detail === "string") {
        message = detail;
      }
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, code, res.status);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  postForm: <T>(path: string, form: FormData) =>
    request<T>("POST", path, form, true),
};