import { Platform } from 'react-native';

const raw = process.env.EXPO_PUBLIC_API_BASE;
const PROD = 'https://zenode.fr';

function defaultBase(): string {
  if (raw && raw.trim()) return raw.trim();
  // Navigateur : zenode.fr refuse les appels cross-origin. Le proxy local relaie.
  if (Platform.OS === 'web' && __DEV__ && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8787`;
  }
  return PROD;
}

/** Prod : https://zenode.fr. Surchargeable en dev via EXPO_PUBLIC_API_BASE. */
export const API_BASE = defaultBase().replace(/\/+$/, '');

export const REDIRECT_SCHEME = 'zenode';
export const REDIRECT_URI = 'zenode://auth/callback';

export const REQUEST_TIMEOUT_MS = 20_000;

/** Session du site, uniquement dans l'émulateur web de développement. Jamais dans l'APK. */
export const WEB_EMULATOR = Platform.OS === 'web' && __DEV__;

export const MSG = {
  network: 'Réseau indisponible.',
  server: 'Le service ne répond pas.',
  generic: 'Une erreur est survenue.',
} as const;
