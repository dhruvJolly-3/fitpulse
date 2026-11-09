import { API_URL } from '../config';
import { tokenStore } from './storage';

// Minimal fetch wrapper for the FitPulse REST API.
// Every error becomes an ApiError with the server's `message`, so screens can
// show it directly. Requests time out (Render's free tier can take ~a minute
// to wake up, so the default is generous).

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Options = { body?: unknown; timeoutMs?: number; params?: Record<string, string | number | undefined> };

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

const request = async <T>(method: string, path: string, { body, timeoutMs = 45000, params }: Options = {}): Promise<T> => {
  const token = await tokenStore.get();
  const qs = params
    ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
    : '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${qs}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = (err as Error)?.name === 'AbortError';
    throw new ApiError(aborted ? 'The server is taking too long. It may be waking up; try again in a minute.' : 'Network error. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError((data as { message?: string } | null)?.message || `Request failed (${res.status})`, res.status);
  }
  return data as T;
};

const safeJson = (text: string): unknown => {
  try { return JSON.parse(text); } catch { return null; }
};

export const api = {
  get: <T>(path: string, opts?: Options) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: Options) => request<T>('POST', path, { ...opts, body: body ?? {} }),
  put: <T>(path: string, body?: unknown, opts?: Options) => request<T>('PUT', path, { ...opts, body: body ?? {} }),
  del: <T>(path: string, body?: unknown, opts?: Options) => request<T>('DELETE', path, { ...opts, body }),
};

export const errorMessage = (err: unknown, fallback = 'Something went wrong') =>
  err instanceof Error && err.message ? err.message : fallback;
