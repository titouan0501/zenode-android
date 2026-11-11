// Endpoints d'auth mobile. Aucun jeton n'est journalise.

import { request } from './client';
import type { AuthConfig, MobileSession, TokenResponse } from './types';

const DEFAULTS = {
  login_path: '/auth/mobile/start',
  token_path: '/api/mobile/auth/token',
  refresh_path: '/api/mobile/auth/refresh',
};

let cachedConfig: AuthConfig | null = null;

export async function fetchAuthConfig(): Promise<AuthConfig> {
  const cfg = await request<AuthConfig>('/api/mobile/auth/config', { auth: false });
  cachedConfig = cfg;
  return cfg;
}

export function loginPath(): string {
  return cachedConfig?.login_path || DEFAULTS.login_path;
}

export function exchangeCode(code: string, deviceName: string): Promise<TokenResponse> {
  return request<TokenResponse>(cachedConfig?.token_path || DEFAULTS.token_path, {
    method: 'POST',
    auth: false,
    body: { code, device_name: deviceName },
  });
}

export function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return request<TokenResponse>(cachedConfig?.refresh_path || DEFAULTS.refresh_path, {
    method: 'POST',
    auth: false,
    body: { refresh_token: refreshToken },
  });
}

/** Revoque cote serveur. Le refresh_token est toujours envoye. */
export function logoutRemote(accessToken: string | null, refreshToken: string | null) {
  return request('/api/mobile/auth/logout', {
    method: 'POST',
    auth: false,
    timeoutMs: 6000,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: { refresh_token: refreshToken },
  });
}

export async function fetchSessions(): Promise<MobileSession[]> {
  const res = await request<{ sessions?: MobileSession[] }>('/api/mobile/auth/sessions');
  return Array.isArray(res?.sessions) ? res.sessions : [];
}

export function revokeSession(sessionId: string) {
  return request(`/api/mobile/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
}
