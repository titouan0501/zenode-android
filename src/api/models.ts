// Normalisation defensive des payloads (les champs peuvent manquer).

import { parseBotRuntime, type BotRuntime } from '@/lib/status';
import type { HostServer } from './types';

export interface BotItem {
  id: string;
  name: string;
  clientId: string | null;
  avatarUrl: string | null;
  accessRole: string | null;
  runtime: BotRuntime;
  modules: string[];
  color: string | null;
  activityDue: boolean;
  isOwner: boolean;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function normalizeBot(raw: any): BotItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = str(raw.bot_id) ?? (raw.id != null ? String(raw.id) : null);
  if (!id) return null;

  const clientId = str(raw.client_id);
  const avatar = str(raw.avatar);
  let avatarUrl = str(raw.avatar_url);
  if (!avatarUrl && avatar && /^https?:\/\//i.test(avatar)) avatarUrl = avatar;
  if (!avatarUrl && clientId && avatar) {
    avatarUrl = `https://cdn.discordapp.com/avatars/${clientId}/${avatar}.png`;
  }

  const color = str(raw.color);
  return {
    id,
    name: str(raw.name) ?? str(raw.bot_name) ?? id,
    clientId,
    avatarUrl,
    accessRole: str(raw.access_role),
    runtime: parseBotRuntime(raw),
    modules: Array.isArray(raw.modules) ? raw.modules.filter((m: unknown) => typeof m === 'string') : [],
    color: color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : null,
    activityDue: activityDue(raw.activity_confirmation),
    isOwner: raw.is_owner !== false,
  };
}

export function normalizeBotList(raw: any): BotItem[] {
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.bots) ? raw.bots : [];
  return arr.map(normalizeBot).filter((b: BotItem | null): b is BotItem => b !== null);
}

/** GET /api/bots/:id : objet direct ou { bot }. */
export function normalizeBotDetail(raw: any): BotItem | null {
  return normalizeBot(raw?.bot && typeof raw.bot === 'object' ? raw.bot : raw);
}

// ----------------------------------------------------------------- serveurs

export function serverId(s: HostServer): string {
  return String(s.server_id ?? s.id ?? '');
}

export function serverAddress(s: HostServer): string | null {
  const a = s.allocation as any;
  if (!a) return null;
  if (typeof a === 'string') return a;
  const host = str(a.alias) ?? str(a.ip) ?? str(a.ip_alias);
  const port = a.port ?? null;
  if (host && port != null) return `${host}:${port}`;
  return host ?? (port != null ? String(port) : null);
}

/** Confirmation d'activité due. La forme exacte n'est pas figée par l'API. */
export function activityDue(value: unknown): boolean {
  if (!value) return false;
  if (value === true) return true;
  if (typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  if (c.required === true || c.due === true || c.pending === true || c.needs_confirmation === true) {
    return true;
  }
  const st = typeof c.status === 'string' ? c.status.toLowerCase() : '';
  const state = typeof c.state === 'string' ? c.state.toLowerCase() : '';
  return ['due', 'pending', 'required', 'overdue'].includes(st || state);
}

/** Confirmation d'activité due (serveur gratuit). */
export function activityConfirmationDue(s: HostServer): boolean {
  if (!s.is_free) return false;
  return activityDue(s.activity_confirmation);
}

export interface ResourceBar {
  key: 'ram' | 'disk' | 'cpu';
  label: string;
  /** 0..1 */
  ratio: number;
  detail: string;
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

export function parseServerResources(raw: any, server: HostServer): ResourceBar[] {
  const r =
    raw?.resources ?? raw?.attributes?.resources ?? raw?.data?.resources ?? raw?.stats ?? raw?.data ?? raw;
  if (!r || typeof r !== 'object') return [];

  const plan = server.plan_summary ?? {};
  const bars: ResourceBar[] = [];
  const clamp = (n: number) => Math.max(0, Math.min(1, n));

  const memBytes = num(r.memory_bytes ?? r.memoryBytes);
  const memMb = memBytes !== null ? memBytes / 1024 / 1024 : num(r.memory_mb);
  const memLimit = num(plan.memory_mb);
  if (memMb !== null && memLimit && memLimit > 0) {
    bars.push({
      key: 'ram',
      label: 'Mémoire',
      ratio: clamp(memMb / memLimit),
      detail: `${Math.round(memMb)} / ${Math.round(memLimit)} Mio`,
    });
  }

  const diskBytes = num(r.disk_bytes ?? r.diskBytes);
  const diskMb = diskBytes !== null ? diskBytes / 1024 / 1024 : num(r.disk_mb);
  const diskLimit = num(plan.disk_mb);
  if (diskMb !== null && diskLimit && diskLimit > 0) {
    bars.push({
      key: 'disk',
      label: 'Disque',
      ratio: clamp(diskMb / diskLimit),
      detail: `${Math.round(diskMb)} / ${Math.round(diskLimit)} Mio`,
    });
  }

  const cpu = num(r.cpu_absolute ?? r.cpu_percent ?? r.cpu);
  const cpuLimit = num(plan.cpu_percent);
  if (cpu !== null && cpuLimit && cpuLimit > 0) {
    bars.push({
      key: 'cpu',
      label: 'Processeur',
      ratio: clamp(cpu / cpuLimit),
      detail: `${cpu.toFixed(0)} / ${Math.round(cpuLimit)} %`,
    });
  }

  return bars;
}

/** Texte des journaux, quelle que soit la forme renvoyee. */
export function logsToText(raw: any): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  const pick = raw.logs ?? raw.output ?? raw.data ?? raw.lines ?? raw.content;
  if (typeof pick === 'string') return pick;
  const lines = Array.isArray(pick) ? pick : Array.isArray(raw) ? raw : null;
  if (lines) {
    return lines
      .map((l: any) => (typeof l === 'string' ? l : (l?.message ?? l?.line ?? l?.text ?? '')))
      .join('\n');
  }
  if (typeof raw.out === 'string' || typeof raw.err === 'string') {
    return [raw.out, raw.err].filter(Boolean).join('\n');
  }
  return '';
}

export type PublicStatusTone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

export interface PublicService {
  name: string;
  label: string;
  tone: PublicStatusTone;
}

const PUBLIC_STATUS: Record<string, { label: string; tone: PublicStatusTone }> = {
  operational: { label: 'Opérationnel', tone: 'success' },
  degraded: { label: 'Dégradé', tone: 'warn' },
  down: { label: 'Hors service', tone: 'danger' },
  maintenance: { label: 'Maintenance', tone: 'info' },
};

/** GET /api/public/status : liste de services { name, status }. Renvoie [] si forme inconnue. */
export function normalizePublicStatus(raw: any): PublicService[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.services)
      ? raw.services
      : Array.isArray(raw?.components)
        ? raw.components
        : [];
  const out: PublicService[] = [];
  for (const s of arr) {
    const name = str(s?.name) ?? str(s?.label);
    const status = str(s?.status)?.toLowerCase();
    if (!name || !status) continue;
    const info = PUBLIC_STATUS[status] ?? { label: 'Inconnu', tone: 'neutral' as const };
    out.push({ name, ...info });
  }
  return out;
}
