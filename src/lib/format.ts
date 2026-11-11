const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** 512 Mio, 1,5 Gio */
export function formatMio(mio: number | null | undefined): string {
  if (mio === null || mio === undefined || !Number.isFinite(mio)) return '—';
  if (mio >= 1024) {
    const gio = mio / 1024;
    return `${gio.toFixed(gio >= 10 ? 0 : 1).replace('.', ',')} Gio`;
  }
  return `${Math.round(mio)} Mio`;
}

/** Uptime : « 2 h 04 », « 12 min », « 3 j 04 h ». */
export function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }
  const s = Math.floor(seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days} j ${pad2(hours)} h`;
  if (hours > 0) return `${hours} h ${pad2(minutes)}`;
  if (minutes > 0) return `${minutes} min`;
  return `${s} s`;
}

export function formatMoney(cents: number | null | undefined, currency = 'EUR'): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(t);
}

export function formatBytes(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n < 1024) return `${Math.round(n)} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n >= 10 * 1024 ? 0 : 1).replace('.', ',')} Ko`;
  return `${(n / 1024 / 1024).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1).replace('.', ',')} Mo`;
}

/** « il y a 3 h » */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const diff = Math.max(0, Math.floor((now - t) / 1000));
  if (diff < 60) return "à l'instant";
  const min = Math.floor(diff / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  const date = new Date(t);
  return `le ${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
