import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import { formatMio, formatUptime, greeting } from '../src/lib/format.ts';
import {
  canUsePower,
  describeStatus,
  effectiveServerStatus,
  parseBotRuntime,
} from '../src/lib/status.ts';

// --- describeStatus (table 3.5)
assert.deepEqual(describeStatus('running'), { label: 'En ligne', tone: 'success' });
assert.deepEqual(describeStatus('tier_suspended'), { label: 'Palier perdu', tone: 'warn' });
assert.equal(describeStatus('automod_blocked').label, 'Bloqué (auto-modération)');
assert.equal(describeStatus('zzz').label, 'Inconnu');
assert.equal(describeStatus(undefined).label, 'Inconnu');

// --- effectiveServerStatus : ordre de priorite
assert.equal(effectiveServerStatus({ review_blocked: true, automod_blocked: true }), 'review_blocked');
assert.equal(effectiveServerStatus({ abuse_state: 'isolated' }), 'automod_blocked');
assert.equal(effectiveServerStatus({ tier_compliance: { state: 'suspended' } }), 'tier_suspended');
assert.equal(effectiveServerStatus({ runtime_status: 'running', status: 'x' }), 'running');
assert.equal(effectiveServerStatus({}), 'unknown');

// --- canUsePower
assert.equal(canUsePower({ pelican_server_id: 1, runtime_status: 'running' }), true);
assert.equal(canUsePower({ pelican_server_id: 1, status: 'installing' }), false);
assert.equal(canUsePower({ pelican_server_id: null, status: 'running' }), false);
assert.equal(canUsePower({ pelican_server_id: 1, status: 'running', automod_blocked: true }), false);

// --- parseBotRuntime
const a = parseBotRuntime({ status: 'online', vm_host: 'vm1' });
assert.equal(a.online, true);
assert.equal(a.vm_host, 'vm1');
const b = parseBotRuntime({
  status: { status: 'running', memory: 52_428_800, uptime: 7_440_000, guilds: 3, vm_host: 'vm2' },
  vm_host: 'vm1',
});
assert.equal(b.online, true);
assert.equal(b.memoryMb, 50); // octets -> Mio
assert.equal(b.uptimeSec, 7440); // ms -> s
assert.equal(b.vm_host, 'vm2');
const c = parseBotRuntime({ status: { online: false } });
assert.equal(c.status, 'offline');
assert.equal(c.online, false);
assert.equal(parseBotRuntime({ status: { memory: 300 } }).memoryMb, 300); // deja en Mio
assert.equal(parseBotRuntime({}).status, 'offline');

// --- format
assert.equal(formatUptime(7440), '2 h 04');
assert.equal(formatUptime(59), '59 s');
assert.equal(formatMio(1536), '1,5 Gio');
assert.equal(formatMio(512), '512 Mio');
assert.equal(greeting(new Date(2026, 0, 1, 9)), 'Bonjour');
assert.equal(greeting(new Date(2026, 0, 1, 14)), 'Bon après-midi');
assert.equal(greeting(new Date(2026, 0, 1, 20)), 'Bonsoir');

// --- state base64url (copie de session.tsx)
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
for (let i = 0; i < 200; i++) {
  const raw = randomBytes(32);
  const s = base64url(raw);
  assert.equal(s, raw.toString('base64url'));
  assert.match(s, /^[A-Za-z0-9._~-]{1,128}$/);
}

console.log('logique OK');
