// Port de website/frontend/shared/lib/status.js
// (describeStatus, effectiveServerStatus, canUsePower, parseBotRuntime).
// Regles ecrites dans le cahier : a comparer avec status.js si il evolue.

import type { ToneName } from '@/theme/tokens';

export interface StatusInfo {
  label: string;
  tone: ToneName;
}

const STATUS_TABLE: Record<string, StatusInfo> = {
  online: { label: 'En ligne', tone: 'success' },
  running: { label: 'En ligne', tone: 'success' },
  active: { label: 'En ligne', tone: 'success' },
  started: { label: 'En ligne', tone: 'success' },
  starting: { label: 'Démarrage', tone: 'info' },
  stopping: { label: 'Arrêt', tone: 'info' },
  installing: { label: 'Installation', tone: 'info' },
  pending: { label: 'En attente', tone: 'warn' },
  offline: { label: 'Hors ligne', tone: 'neutral' },
  stopped: { label: 'Hors ligne', tone: 'neutral' },
  exited: { label: 'Hors ligne', tone: 'neutral' },
  error: { label: 'Erreur', tone: 'danger' },
  failed: { label: 'En échec', tone: 'danger' },
  install_failed: { label: 'En échec', tone: 'danger' },
  suspended: { label: 'Suspendu', tone: 'danger' },
  tier_suspended: { label: 'Palier perdu', tone: 'warn' },
  automod_blocked: { label: 'Bloqué (auto-modération)', tone: 'danger' },
  review_blocked: { label: 'Compte en vérification', tone: 'warn' },
};

const UNKNOWN: StatusInfo = { label: 'Inconnu', tone: 'neutral' };

export function describeStatus(status: unknown): StatusInfo {
  if (typeof status !== 'string') return UNKNOWN;
  return STATUS_TABLE[status.trim().toLowerCase()] ?? UNKNOWN;
}

const ONLINE_STATUSES = new Set(['online', 'running', 'active', 'started']);

export function isOnlineStatus(status: unknown): boolean {
  return typeof status === 'string' && ONLINE_STATUSES.has(status.trim().toLowerCase());
}

// ---------------------------------------------------------------- serveurs

export interface HostServerLike {
  status?: string | null;
  runtime_status?: string | null;
  pelican_server_id?: unknown;
  review_blocked?: boolean | null;
  automod_blocked?: boolean | null;
  abuse_state?: string | null;
  tier_compliance?: { state?: string | null } | null;
}

export function effectiveServerStatus(server: HostServerLike): string {
  if (server.review_blocked) return 'review_blocked';
  if (server.automod_blocked || server.abuse_state === 'isolated') return 'automod_blocked';
  if (server.tier_compliance?.state === 'suspended') return 'tier_suspended';
  return server.runtime_status || server.status || 'unknown';
}

const NO_POWER_STATUSES = new Set([
  'pending',
  'installing',
  'install_failed',
  'failed',
  'deleted',
  'suspended',
  'tier_suspended',
]);

export function canUsePower(server: HostServerLike): boolean {
  if (!server.pelican_server_id) return false;
  if (server.review_blocked || server.automod_blocked) return false;
  if (server.tier_compliance?.state === 'suspended') return false;
  return !NO_POWER_STATUSES.has(effectiveServerStatus(server));
}

// -------------------------------------------------------------------- bots

export interface BotRuntime {
  status: string;
  online: boolean;
  vm_host: string | null;
  /** Mio */
  memoryMb: number | null;
  /** Mio */
  maxMemoryMb: number | null;
  cpu: number | null;
  /** secondes */
  uptimeSec: number | null;
  guilds: number | null;
  users: number | null;
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** > 4096 : octets -> Mio. Sinon deja en Mio. */
function toMio(v: unknown): number | null {
  const n = num(v);
  if (n === null) return null;
  return n > 4096 ? n / 1024 / 1024 : n;
}

/** >= 1000 : millisecondes -> secondes. */
function toSeconds(v: unknown): number | null {
  const n = num(v);
  if (n === null) return null;
  return n >= 1000 ? n / 1000 : n;
}

export function parseBotRuntime(bot: Record<string, any> | null | undefined): BotRuntime {
  const raw = bot?.status;
  const nested: Record<string, any> | null =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;

  const statusString: string = nested
    ? nested.status || (nested.online ? 'online' : 'offline')
    : typeof raw === 'string' && raw
      ? raw
      : 'offline';

  const online =
    statusString === 'online' || statusString === 'running' || Boolean(nested?.online);

  return {
    status: statusString,
    online,
    vm_host: nested?.vm_host || bot?.vm_host || null,
    memoryMb: toMio(nested?.memory),
    maxMemoryMb: toMio(nested?.max_memory),
    cpu: num(nested?.cpu),
    uptimeSec: toSeconds(nested?.uptime),
    guilds: num(nested?.guilds),
    users: num(nested?.users),
  };
}
