// Relais local de l'émulateur web.
// Sans jeton, les appels /api sont exécutés par l'onglet zenode.fr déjà connecté.
// Aucun cookie, jeton ou corps n'est journalisé. Écoute uniquement sur 127.0.0.1.
import http from 'node:http';
import https from 'node:https';
import { randomUUID } from 'node:crypto';

const PORT = 8787;
const TARGET = 'https://zenode.fr';

const jobs = [];
const waiters = [];
const results = new Map();

function cors(req) {
  return {
    'access-control-allow-origin': req.headers.origin || '*',
    vary: 'Origin',
  };
}

function takeJob() {
  if (jobs.length) return jobs.shift();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const i = waiters.findIndex((w) => w.resolve === resolve);
      if (i >= 0) waiters.splice(i, 1);
      resolve(null);
    }, 20000);
    waiters.push({
      resolve: (job) => {
        clearTimeout(timer);
        resolve(job);
      },
    });
  });
}

function enqueue(job) {
  const waiter = waiters.shift();
  if (waiter) waiter.resolve(job);
  else jobs.push(job);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function bridgeable(pathname) {
  return pathname.startsWith('/api/') || pathname.startsWith('/auth/');
}

const server = http.createServer(async (req, res) => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') {
    send(res, 204, {
      ...headers,
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers':
        req.headers['access-control-request-headers'] || 'Authorization, Content-Type, Accept',
      'access-control-max-age': '600',
    }, '');
    return;
  }

  const url = new URL(req.url || '/', 'http://127.0.0.1');

  if (url.pathname === '/__bridge/pull') {
    const job = await takeJob();
    send(res, 200, { ...headers, 'content-type': 'application/json' }, JSON.stringify(job ?? {}));
    return;
  }

  if (url.pathname === '/__bridge/result' && req.method === 'POST') {
    const raw = await readBody(req);
    let payload = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }
    const pending = results.get(payload.id);
    if (pending) {
      results.delete(payload.id);
      pending.resolve(payload);
    }
    send(res, 204, headers, '');
    return;
  }

  const hasBearer = typeof req.headers.authorization === 'string' && req.headers.authorization.length > 0;
  if (!hasBearer && bridgeable(url.pathname)) {
    const id = randomUUID();
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
    const done = new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 8000);
      results.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
      });
    });
    enqueue({ id, method: req.method, path: `${url.pathname}${url.search}`, body: body || undefined });
    const outcome = await done;
    if (!outcome) {
      send(
        res,
        503,
        { ...headers, 'content-type': 'application/json' },
        JSON.stringify({ error: 'Session navigateur indisponible.' }),
      );
      return;
    }
    send(
      res,
      Number(outcome.status) || 502,
      { ...headers, 'content-type': 'application/json' },
      typeof outcome.body === 'string' ? outcome.body : '',
    );
    return;
  }

  const target = new URL(req.url || '/', TARGET);
  const upstreamHeaders = { ...req.headers, host: target.host };
  delete upstreamHeaders.origin;
  delete upstreamHeaders.referer;
  const proxyReq = https.request(target, { method: req.method, headers: upstreamHeaders }, (proxyRes) => {
    const out = { ...proxyRes.headers, ...headers };
    delete out['cross-origin-resource-policy'];
    delete out['cross-origin-opener-policy'];
    res.writeHead(proxyRes.statusCode || 502, out);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    if (res.headersSent) return;
    send(res, 502, { ...headers, 'content-type': 'application/json' }, JSON.stringify({ error: 'Proxy indisponible' }));
  });
  req.pipe(proxyReq);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Proxy Zenode sur http://127.0.0.1:${PORT}`);
});
