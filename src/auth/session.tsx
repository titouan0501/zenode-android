// Session mobile : jetons dans SecureStore, mutex de refresh, flow OAuth.
// Regles : jamais AsyncStorage, jamais de log de jeton / d'URL de callback.

import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import {
  exchangeCode,
  loginPath,
  logoutRemote,
  refreshTokens,
  revokeSession as revokeSessionRemote,
} from '@/api/auth';
import { isApiError, registerAuthBridge, request, type RefreshOutcome } from '@/api/client';
import { API_BASE, REDIRECT_URI, WEB_EMULATOR } from '@/api/config';
import { queryClient } from '@/api/queryClient';
import type { Provider, TokenResponse } from '@/api/types';
import { hasAccountIdentity } from '@/lib/account';

// ------------------------------------------------------------------ store

export interface SessionState {
  status: 'loading' | 'authenticated' | 'anonymous';
  /** Message a afficher sur le login (erreur de flow, session expiree...). */
  notice: string | null;
  /** Provider dont le navigateur est en cours d'ouverture / d'echange. */
  busyProvider: Provider | null;
  /** Message serveur si 403 ACCOUNT_BLOCKED. */
  blocked: string | null;
  signingOut: boolean;
}

let state: SessionState = {
  status: 'loading',
  notice: null,
  busyProvider: null,
  blocked: null,
  signingOut: false,
};
const subscribers = new Set<() => void>();

function isAuthenticated() {
  return state.status === 'authenticated';
}

function setState(patch: Partial<SessionState>) {
  state = { ...state, ...patch };
  subscribers.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

// ----------------------------------------------------------------- jetons

const KEY_ACCESS = 'zenode.access_token';
const KEY_REFRESH = 'zenode.refresh_token';
const KEY_EXPIRES = 'zenode.access_expires_at';

interface Tokens {
  access: string;
  refresh: string;
  accessExpiresAt: number;
}

let tokens: Tokens | null = null;

async function persistTokens(t: Tokens) {
  try {
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, t.access),
      SecureStore.setItemAsync(KEY_REFRESH, t.refresh),
      SecureStore.setItemAsync(KEY_EXPIRES, String(t.accessExpiresAt)),
    ]);
  } catch {
    // La session reste valide en memoire ; elle sera redemandee au prochain lancement.
  }
}

async function wipeStore() {
  await Promise.all(
    [KEY_ACCESS, KEY_REFRESH, KEY_EXPIRES].map((k) => SecureStore.deleteItemAsync(k).catch(() => {})),
  );
}

async function applyTokens(res: TokenResponse) {
  const t: Tokens = {
    access: res.access_token,
    refresh: res.refresh_token,
    accessExpiresAt: Date.now() + (Number(res.expires_in) || 900) * 1000,
  };
  tokens = t;
  await persistTokens(t);
}

async function endSession(notice: string | null) {
  tokens = null;
  pendingState = null;
  await queryClient.cancelQueries();
  queryClient.clear();
  await wipeStore();
  setState({
    status: 'anonymous',
    notice,
    busyProvider: null,
    blocked: null,
    signingOut: false,
  });
}

export async function enterWebSession() {
  const ok = await confirmAccount();
  if (ok === 'ready') {
    setState({ status: 'authenticated', notice: null, busyProvider: null });
    return;
  }
  setState({
    status: 'anonymous',
    busyProvider: null,
    notice: 'Session navigateur indisponible. Garde zenode.fr ouvert dans ce navigateur.',
  });
}

export async function bootstrapSession() {
  if (WEB_EMULATOR) {
    await enterWebSession();
    return;
  }
  try {
    const [access, refresh, expires] = await Promise.all([
      SecureStore.getItemAsync(KEY_ACCESS),
      SecureStore.getItemAsync(KEY_REFRESH),
      SecureStore.getItemAsync(KEY_EXPIRES),
    ]);
    if (access && refresh) {
      tokens = { access, refresh, accessExpiresAt: Number(expires) || 0 };
      const ok = await confirmAccount();
      if (ok === 'ready') {
        setState({ status: 'authenticated' });
        return;
      }
      if (ok === 'offline') {
        // Jetons conservés : l'écran de session proposera un nouvel essai.
        setState({ status: 'authenticated' });
        return;
      }
      await endSession(ok === 'empty' ? 'Aucun compte associé à cette session.' : null);
      return;
    }
  } catch {
    // SecureStore illisible : on repart du login.
  }
  setState({ status: 'anonymous' });
}

// ---------------------------------------------------------------- refresh

let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function doRefresh(): Promise<RefreshOutcome> {
  const current = tokens;
  if (!current) return 'invalid';
  try {
    const res = await refreshTokens(current.refresh);
    await applyTokens(res); // rotation : les deux jetons sont remplaces
    return 'ok';
  } catch (e) {
    if (isApiError(e)) {
      if (e.status === 0) return 'network';
      if (
        e.code === 'MOBILE_REFRESH_INVALID' ||
        e.code === 'MOBILE_REFRESH_REUSED' ||
        e.status === 401
      ) {
        await endSession(
          e.code === 'MOBILE_REFRESH_REUSED' ? 'Session invalide. Nouvelle connexion requise.' : null,
        );
        return 'invalid';
      }
    }
    return 'error';
  }
}

async function refreshSession(usedToken: string): Promise<RefreshOutcome> {
  if (!tokens) return 'invalid';
  // Un autre appel a deja fait tourner les jetons : on rejoue simplement.
  if (tokens.access !== usedToken) return 'ok';
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

registerAuthBridge({
  getAccessToken: () => tokens?.access ?? null,
  refresh: refreshSession,
  onAccountBlocked: (message) => setState({ blocked: message }),
});

// ------------------------------------------------------------------ login

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64URL[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64URL[n & 63];
  }
  return out;
}

/** 32 octets aleatoires, base64url (43 caracteres). */
function generateState(): string {
  return base64url(Crypto.getRandomBytes(32));
}

function deviceName(): string {
  const raw = Device.modelName || Device.deviceName || 'App Zenode';
  // eslint-disable-next-line no-control-regex
  const clean = raw.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, 80);
  return clean || 'App Zenode';
}

const CALLBACK_ERRORS: Record<string, string> = {
  provider_disabled: 'Connexion indisponible pour ce fournisseur.',
  no_email: 'Aucune adresse e-mail sur ce compte.',
  server: 'Connexion impossible.',
};

const MSG_EXPIRED = 'Lien de connexion expiré.';
const MSG_LOGIN_FAILED = 'Connexion impossible.';
const MSG_NO_WINDOW = 'La page de connexion ne s’est pas affichée.';
const MSG_NO_ACCOUNT = 'Aucun compte n’a été ouvert.';

type AccountCheck = 'ready' | 'empty' | 'offline' | 'rejected';

/** N'ouvre l'app que si /api/user renvoie une identité. */
async function confirmAccount(): Promise<AccountCheck> {
  try {
    const me = await request('/api/user');
    return hasAccountIdentity(me) ? 'ready' : 'empty';
  } catch (e) {
    if (isApiError(e) && e.status === 0) return 'offline';
    if (isApiError(e) && e.status === 403 && e.code === 'ACCOUNT_BLOCKED') return 'ready';
    return 'rejected';
  }
}

/** `state` du flow en cours. Sur le web, recopié dans localStorage : la page quitte l'origine. */
const OAUTH_STATE_KEY = 'zenode.oauth_state';
let pendingState: string | null = null;

function rememberPending(value: string) {
  pendingState = value;
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(OAUTH_STATE_KEY, value);
  } catch {
    // stockage indisponible : le retour web ne pourra pas être vérifié
  }
}

function recallPending() {
  if (pendingState || Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    pendingState = localStorage.getItem(OAUTH_STATE_KEY);
  } catch {
    pendingState = null;
  }
}

function forgetPending() {
  pendingState = null;
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(OAUTH_STATE_KEY);
  } catch {
    // ignore
  }
}
let exchanging = false;
const handledUrls = new Set<string>();

function isAuthCallback(url: string): boolean {
  return /^zenode:\/\/auth\/callback(?:[/?#]|$)/i.test(url);
}

function parseQuery(url: string): Record<string, string> {
  const q = url.split('#')[0].split('?')[1] ?? '';
  const out: Record<string, string> = {};
  for (const part of q.split('&')) {
    if (!part) continue;
    const idx = part.indexOf('=');
    const k = idx === -1 ? part : part.slice(0, idx);
    const v = idx === -1 ? '' : part.slice(idx + 1);
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      // parametre mal encode : ignore
    }
  }
  return out;
}

export async function handleCallbackUrl(url: string | null | undefined): Promise<void> {
  if (!url || !isAuthCallback(url)) return;
  if (handledUrls.has(url)) return; // cold start + event : un seul traitement
  handledUrls.add(url);
  if (handledUrls.size > 20) handledUrls.delete(handledUrls.values().next().value as string);

  const q = parseQuery(url);
  recallPending();

  // 4. Le state retourne doit etre celui qu'on a envoye. Sinon : abandon, aucun jeton.
  if (!pendingState || !q.state || q.state !== pendingState) {
    if (state.status !== 'authenticated') {
      setState({ busyProvider: null, notice: q.code ? MSG_LOGIN_FAILED : MSG_NO_WINDOW });
    }
    return;
  }
  forgetPending();

  if (q.error) {
    setState({ busyProvider: null, notice: CALLBACK_ERRORS[q.error] ?? MSG_LOGIN_FAILED });
    return;
  }
  if (!q.code) {
    setState({ busyProvider: null, notice: MSG_NO_WINDOW });
    return;
  }

  // 5. Echange immediat (code valable 2 minutes, usage unique).
  exchanging = true;
  try {
    const res = await exchangeCode(q.code, deviceName());
    if (!res?.access_token || !res?.refresh_token) {
      setState({ busyProvider: null, notice: MSG_NO_ACCOUNT });
      return;
    }
    await applyTokens(res);
    const check = await confirmAccount();
    if (check === 'empty') {
      await endSession(MSG_NO_ACCOUNT);
      return;
    }
    if (check === 'rejected') {
      await endSession(MSG_LOGIN_FAILED);
      return;
    }
    setState({ status: 'authenticated', busyProvider: null, notice: null });
  } catch (e) {
    let notice = MSG_LOGIN_FAILED;
    if (isApiError(e)) {
      notice = e.code === 'MOBILE_CODE_INVALID' ? MSG_EXPIRED : e.message || MSG_LOGIN_FAILED;
    }
    await endSession(notice);
  } finally {
    exchanging = false;
  }
}

export async function signIn(provider: Provider): Promise<void> {
  if (state.busyProvider || state.status === 'authenticated') return;

  const st = generateState();
  rememberPending(st);
  setState({ busyProvider: provider, notice: null });

  // Sur le web, l'ouverture d'une popup perd le geste utilisateur et le navigateur la bloque.
  // La navigation se fait dans le même onglet, directement vers zenode.fr (cookie de session).
  const startOrigin = Platform.OS === 'web' ? 'https://zenode.fr' : API_BASE;
  const url =
    `${startOrigin}${loginPath()}` +
    `?provider=${encodeURIComponent(provider)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${encodeURIComponent(st)}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return;
  }

  try {
    // Navigateur systeme (Custom Tab), pas une WebView.
    const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URI);
    if (result.type === 'success' && result.url) {
      await handleCallbackUrl(result.url);
      if (!isAuthenticated() && !state.notice && !exchanging) {
        setState({ busyProvider: null, notice: MSG_NO_WINDOW });
      }
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      if (!exchanging) setState({ busyProvider: null });
    } else if (!exchanging) {
      setState({ busyProvider: null, notice: MSG_NO_WINDOW });
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : '';
    const blocked = /blocked|popup/i.test(detail);
    setState({
      busyProvider: null,
      notice: blocked ? 'Le navigateur a bloqué la fenêtre de connexion.' : MSG_LOGIN_FAILED,
    });
  }
}

export function clearNotice() {
  if (state.notice) setState({ notice: null });
}

// ----------------------------------------------------------- deconnexion

export async function signOut(): Promise<void> {
  if (state.signingOut) return;
  setState({ signingOut: true });
  const t = tokens;
  try {
    // Le refresh_token part toujours, meme si l'access a expire.
    if (t) await logoutRemote(t.access, t.refresh);
  } catch {
    // quelle que soit la reponse reseau, on efface localement
  }
  await endSession(null);
}

/** Revoque une session ; si c'est l'appareil courant, deconnexion locale. */
export async function revokeSession(sessionId: string, isCurrent: boolean): Promise<void> {
  await revokeSessionRemote(sessionId);
  if (isCurrent) await endSession(null);
}

// --------------------------------------------------------------- provider

/** Retour web : le protocole zenode:// est renvoyé vers /auth/callback par le handler local. */
async function consumeWebCallback() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (!/\/auth\/callback\/?$/.test(window.location.pathname)) return;
  const search = window.location.search;
  window.history.replaceState({}, '', '/login');
  await handleCallbackUrl(`zenode://auth/callback${search}`);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await bootstrapSession();
      if (cancelled) return;
      await consumeWebCallback();
      // Cold start (app tuee) : le lien qui a lance l'app.
      const initial = await Linking.getInitialURL().catch(() => null);
      if (!cancelled) await handleCallbackUrl(initial);
    })();
    // App deja lancee : retour au premier plan par le deep link.
    const sub = Linking.addEventListener('url', (e) => {
      handleCallbackUrl(e.url);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return <>{children}</>;
}
