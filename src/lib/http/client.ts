// Thin fetch wrapper for the JanShram backend admin API. Injects the admin JWT,
// parses JSON, throws a typed ApiError on non-2xx, and clears the session on 401.

// VITE_API_URL overrides this — `.env` points at localhost for local work — but
// the default is PRODUCTION so a build made without the variable set reaches a
// real backend instead of a machine-local one that only exists on a developer's
// laptop.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://janshram-backend.onrender.com/api/v1';
const TOKEN_KEY = 'janshram_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Query } = {},
): Promise<T> {
  const { method = 'GET', body, query } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    if (res.status === 401 && token) {
      clearToken();
      onUnauthorized?.();
    }
    const message = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data?.details);
  }
  return data as T;
}

// Fetches a raw text body (e.g. CSV) with auth. Used for downloads.
async function requestText(path: string): Promise<string> {
  const token = getToken();
  const res = await fetch(buildUrl(path), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    if (res.status === 401 && token) { clearToken(); onUnauthorized?.(); }
    throw new ApiError(res.status, `Request failed (${res.status})`);
  }
  return res.text();
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  getText: requestText,
};
