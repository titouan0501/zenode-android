// Unique module HTTP de l'app. JSON uniquement, pas de cookie.
// Ne JAMAIS journaliser les en-tetes, les corps ni les URL de callback.

import { API_BASE, MSG, REQUEST_TIMEOUT_MS } from './config';

export type ApiError = {
  message: string;
  status: number;
  code: string | null;
};

export class ApiException extends Error implements ApiError {
  status: number;
  code: string | null;

  constructor(e: ApiError) {
    super(e.message);
    this.name = 'ApiException';
    this.message = e.message;
    this.status = e.status;
    this.code = e.code;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

export function isApiError(e: unknown): e is ApiException {
  return e instanceof ApiException;
}

export function errorMessage(e: unknown): string {
  if (isApiError(e)) return e.message;
  return MSG.generic;
}

export type RefreshOutcome = 'ok' | 'invalid' | 'network' | 'error';

/** Pont vers la session (evite une dependance circulaire client <-> session). */
export interface AuthBridge {
  /** Jeton d'acces courant (memoire). */
  getAccessToken(): string | null;
  /**
   * Un seul refresh a la fois (mutex cote session).
   * `usedToken` : le jeton qui vient d'etre refuse ; s'il a deja change,
   * la session renvoie 'ok' sans refaire de refresh.
   */
  refresh(usedToken: string): Promise<RefreshOutcome>;
  onAccountBlocked(message: string): void;
}

let bridge: AuthBridge | null = null;

export function registerAuthBridge(b: AuthBridge) {
  bridge = b;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  body?: unknown;
  /** true par defaut : ajoute le Bearer et gere le refresh sur 401. */
  auth?: boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

function parseJson(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function networkError(): ApiException {
  return new ApiException({ message: MSG.network, status: 0, code: 'NETWORK' });
}

export async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  return perform<T>(path, opts, true);
}

async function perform<T>(path: string, opts: RequestOptions, allowRefresh: boolean): Promise<T> {
  const auth = opts.auth ?? true;
  const token = auth ? (bridge?.getAccessToken() ?? null) : null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? REQUEST_TIMEOUT_MS);

  let status: number;
  let ok: boolean;
  let text: string;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
    status = res.status;
    ok = res.ok;
    text = await res.text();
  } catch {
    // coupure reseau, DNS, timeout (abort)
    throw networkError();
  } finally {
    clearTimeout(timer);
  }

  const payload = parseJson(text);

  if (ok) return payload as T;

  const code: string | null = typeof payload?.code === 'string' ? payload.code : null;
  let message: string =
    (typeof payload?.error === 'string' && payload.error) ||
    (typeof payload?.message === 'string' && payload.message) ||
    `Erreur ${status}`;
  if (status >= 500) message = MSG.server;

  const error = new ApiException({ message, status, code });

  if (status === 401 && auth && token && allowRefresh && bridge) {
    const outcome = await bridge.refresh(token);
    if (outcome === 'ok') return perform<T>(path, opts, false); // rejeu unique
    if (outcome === 'network') throw networkError();
    if (outcome === 'error') {
      throw new ApiException({ message: MSG.server, status: 503, code: null });
    }
    throw error; // session perdue : la navigation vers le login est geree par la session
  }

  if (status === 403 && code === 'ACCOUNT_BLOCKED') {
    bridge?.onAccountBlocked(message);
  }

  throw error;
}
