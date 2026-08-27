import type { ApiResponse } from "@fashion-platform/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
  }
}

let accessToken: string | null = null;

/** In-memory access token — deliberately NOT localStorage (XSS-readable). */
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && !skipAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    credentials: "include", // sends the httpOnly refresh cookie
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiClientError(json.error.message, json.error.code, res.status);
  }

  return json.data;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
};
