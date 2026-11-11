// Ouvre le retour OAuth (zenode://auth/callback?...) dans l'émulateur web.
// Le code n'est pas journalisé.
import { spawn } from 'node:child_process';

const raw = (process.argv[2] ?? '').replace(/^"|"$/g, '').trim();
const query = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
const target = `http://127.0.0.1:8081/auth/callback${query}`;

const child = spawn(
  'powershell.exe',
  ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', `Start-Process '${target.replace(/'/g, "''")}'`],
  { detached: true, stdio: 'ignore', windowsHide: true },
);
child.unref();
