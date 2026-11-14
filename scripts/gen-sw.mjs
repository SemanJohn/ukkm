// Jana out/sw.js dengan senarai pracache semua fail binaan (untuk kegunaan luar talian).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name !== 'sw.js' && e.name !== 'desktop.ini') files.push('/' + path.relative(out, full).split(path.sep).join('/'));
  }
})(out);
files.sort();
const hash = crypto.createHash('sha1');
hash.update(BASE);
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(out, f)));
const version = hash.digest('hex').slice(0, 12);

const sw = `// Dijana oleh scripts/gen-sw.mjs — jangan sunting.
const CACHE = 'mrsm-sim-${version}';
const FILES = ${JSON.stringify(files.map((f) => BASE + encodeURI(f)))};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (let i = 0; i < FILES.length; i += 20) {
      await Promise.all(FILES.slice(i, i + 20).map(async (url) => {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Pracache gagal: ' + url);
        const clean = res.redirected ? new Response(await res.blob(), { status: 200, headers: res.headers }) : res;
        await cache.put(url, clean);
      }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE && key.startsWith('mrsm-sim-')) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const p = url.pathname;
    const candidates = [p, p.endsWith('/') ? p + 'index.html' : p + '/index.html', p + '.html'];
    for (const c of candidates) {
      const hit = await cache.match(c);
      if (hit) return hit;
    }
    try {
      return await fetch(req);
    } catch (err) {
      if (req.mode === 'navigate') {
        const home = await cache.match('${BASE}/index.html');
        if (home) return home;
      }
      throw err;
    }
  })());
});
`;
fs.writeFileSync(path.join(out, 'sw.js'), sw);
console.log(`sw.js dijana: ${files.length} fail, versi ${version}`);
