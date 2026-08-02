// Admin API entry point. Backed by either the in-memory mock adapter (default,
// runs fully standalone) or the real HTTP adapter against janshram-backend's
// guarded /admin/* routes. Flip with VITE_USE_MOCK=false (+ VITE_API_URL).

import { mockAdapter, type AdminApi } from './mock/adapter';
import { httpAdapter } from './http/adapter';
import {
  getToken as httpGetToken, setToken as httpSetToken, clearToken as httpClearToken,
} from './http/client';

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

export const adminApi: AdminApi = USE_MOCK ? mockAdapter : httpAdapter;
export const isMock = USE_MOCK;

// Token helpers. In mock mode there is no real token, but we still persist a
// sentinel so the session survives reloads; the HTTP client owns the real key.
const TOKEN_KEY = 'janshram_admin_token';
export const getToken = () => (USE_MOCK ? localStorage.getItem(TOKEN_KEY) : httpGetToken());
export const setToken = (t: string) => (USE_MOCK ? localStorage.setItem(TOKEN_KEY, t) : httpSetToken(t));
export const clearToken = () => (USE_MOCK ? localStorage.removeItem(TOKEN_KEY) : httpClearToken());

export * from './types';
export { formatINR, formatINRPrecise, formatINRCompact, paiseToRupees, rupeesToPaise } from './money';
