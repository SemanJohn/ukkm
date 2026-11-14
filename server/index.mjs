// Pelayan Simulator UKKM MRSM 2027: fail statik (out/) + API penyelarasan (PostgreSQL melalui Drizzle).
//   DATABASE_URL  — sambungan PostgreSQL. Jika tiada, PGlite (enjin Postgres terbenam) digunakan di DATA_DIR.
//   DATA_DIR      — folder data PGlite (lalai %LOCALAPPDATA%/simulator-ukkm-mrsm/pglite; "memory" = dalam ingatan).
//   SYNC_TOKEN    — jika ditetapkan, semua panggilan /api (kecuali /api/health) memerlukan pengepala x-sync-token.
//   ANTHROPIC_API_KEY — pilihan; mengaktifkan penjanaan soalan AI.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, lte } from 'drizzle-orm';
import { aiConfigured, describeAiError, generateItems } from './ai.mjs';
import { blueprints, candidates, DDL, exposures, questions, sessions } from './schema.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', 'out');
const port = Number(process.argv[2] || process.env.PORT || 3000);
const TOKEN = process.env.SYNC_TOKEN || '';

async function openDb() {
  if (process.env.DATABASE_URL) {
    const pg = (await import('pg')).default;
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(DDL);
    return { db: drizzle(pool), kind: 'postgres' };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  // Lalai di luar folder projek: folder yang disegerakkan (Google Drive/OneDrive) menambah desktop.ini
  // dan mengunci fail, yang merosakkan folder data Postgres.
  const dir = process.env.DATA_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), 'simulator-ukkm-mrsm', 'pglite');
  if (dir === 'memory') {
    const client = new PGlite();
    await client.exec(DDL);
    return { db: drizzle(client), kind: 'pglite' };
  }
  const open = async () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.rmSync(path.join(dir, 'postmaster.pid'), { force: true }); // tinggalan penutupan tidak bersih
    const client = new PGlite(dir);
    await client.exec(DDL);
    return client;
  };
  let client;
  try {
    client = await open();
  } catch (e) {
    // Folder data rosak: simpan salinannya dan mula baharu. Peranti menghantar semula sejarah mereka semasa penyelarasan.
    const aside = `${dir}.rosak-${Date.now()}`;
    fs.renameSync(dir, aside);
    console.error(`AMARAN: pangkalan data tidak dapat dibuka (${e.message}). Folder lama dipindahkan ke ${aside}; pangkalan data baharu dicipta.`);
    client = await open();
  }
  return { db: drizzle(client), kind: 'pglite' };
}

const { db, kind } = await openDb();

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 25 * 1024 * 1024) {
        reject(new Error('Badan permintaan terlalu besar'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('JSON tidak sah'));
      }
    });
    req.on('error', reject);
  });
}

const str = (v, max = 200) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null);

/** Penyelarasan: gabung data klien ke pelayan, kemudian pulangkan keadaan lengkap calon. */
async function sync(body) {
  const cid = str(body?.candidate?.key);
  const name = str(body?.candidate?.name);
  if (!cid || !name) throw Object.assign(new Error('Calon tidak sah'), { status: 400 });
  const now = Date.now();

  await db.transaction(async (tx) => {
    const [cand] = await tx.select().from(candidates).where(eq(candidates.id, cid));
    const resetAt = Math.max(cand?.exposureResetAt ?? 0, Number(body.exposureResetAt) || 0);
    await tx.insert(candidates).values({ id: cid, name, exposureResetAt: resetAt, updatedAt: now }).onConflictDoUpdate({ target: candidates.id, set: { name, exposureResetAt: resetAt, updatedAt: now } });
    // Sejarah yang dipadam secara sengaja pada mana-mana peranti dipadam di pelayan juga.
    if (resetAt > 0) await tx.delete(exposures).where(and(eq(exposures.candidateId, cid), lte(exposures.shownAt, resetAt)));

    for (const s of Array.isArray(body.sessions) ? body.sessions : []) {
      const id = str(s?.id);
      if (!id || (s.status !== 'active' && s.status !== 'submitted')) continue;
      const updatedAt = Number(s.updatedAt) || 0;
      const [cur] = await tx.select().from(sessions).where(eq(sessions.id, id));
      // Sesi yang telah dihantar tidak boleh ditimpa oleh salinan aktif; selain itu, yang terkini menang.
      const wins = !cur || (cur.status !== 'submitted' && (s.status === 'submitted' || updatedAt > cur.updatedAt));
      if (wins) await tx.insert(sessions).values({ id, candidateId: cid, status: s.status, updatedAt, data: s }).onConflictDoUpdate({ target: sessions.id, set: { status: s.status, updatedAt, data: s } });
    }
    for (const e of Array.isArray(body.exposures) ? body.exposures : []) {
      const qid = str(e?.qid);
      const at = Number(e?.at) || 0;
      if (!qid || at <= resetAt) continue;
      await tx.insert(exposures).values({ candidateId: cid, questionId: qid, familyId: str(e.familyId) ?? qid, sessionId: str(e.sessionId) ?? '', shownAt: at }).onConflictDoNothing();
    }
    for (const b of Array.isArray(body.blueprints) ? body.blueprints : []) {
      const key = str(b?.key);
      if (key) await tx.insert(blueprints).values({ key, mode: str(b.mode) ?? '', savedAt: Number(b.savedAt) || 0, data: b }).onConflictDoNothing();
    }
  });

  const [cand] = await db.select().from(candidates).where(eq(candidates.id, cid));
  return {
    serverTime: now,
    exposureResetAt: cand.exposureResetAt,
    sessions: (await db.select().from(sessions).where(eq(sessions.candidateId, cid))).map((r) => r.data),
    exposures: (await db.select().from(exposures).where(eq(exposures.candidateId, cid))).map((r) => ({ candidate: cid, qid: r.questionId, familyId: r.familyId, sessionId: r.sessionId, at: r.shownAt })),
    blueprints: (await db.select().from(blueprints)).map((r) => r.data),
    questions: (await db.select().from(questions).where(eq(questions.status, 'human_approved'))).map((r) => r.data),
  };
}

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  if (route === 'GET /api/health') return json(res, 200, { ok: true, db: kind, ai: aiConfigured(), tokenRequired: Boolean(TOKEN) });
  if (TOKEN && req.headers['x-sync-token'] !== TOKEN) return json(res, 401, { error: 'Token penyelarasan tidak sah.' });

  if (route === 'POST /api/sync') return json(res, 200, await sync(await readBody(req)));

  if (route === 'GET /api/questions') {
    const status = url.searchParams.get('status');
    const rows = status ? await db.select().from(questions).where(eq(questions.status, status)) : await db.select().from(questions);
    return json(res, 200, { questions: rows.map((r) => ({ ...r.data, audit: r.audit, reviewer: r.reviewer, reviewedAt: r.reviewedAt })) });
  }

  // Item baharu sentiasa masuk kuarantin, tidak kira status yang dihantar oleh klien.
  if (route === 'POST /api/questions') {
    const body = await readBody(req);
    let stored = 0;
    let duplicates = 0;
    for (const entry of Array.isArray(body.items) ? body.items : []) {
      const q = entry?.question;
      if (!str(q?.id) || !str(q?.contentHash) || !str(q?.fingerprint) || typeof q.question !== 'string') continue;
      const data = { ...q, sourceType: 'ai-generated', validationStatus: 'pending_review', verifiedByReviewer: false };
      const r = await db.insert(questions).values({ id: q.id, status: 'pending_review', contentHash: q.contentHash, fingerprint: q.fingerprint, data, audit: entry.audit ?? {}, createdAt: Date.now() }).onConflictDoNothing().returning({ id: questions.id });
      if (r.length) stored++;
      else duplicates++;
    }
    return json(res, 200, { stored, duplicates });
  }

  const review = url.pathname.match(/^\/api\/questions\/([^/]+)\/review$/);
  if (req.method === 'POST' && review) {
    const body = await readBody(req);
    const reviewer = str(body.reviewer, 80);
    if (!reviewer || !['approve', 'reject'].includes(body.decision)) return json(res, 400, { error: 'Nama penyemak dan keputusan diperlukan.' });
    const id = decodeURIComponent(review[1]);
    const [row] = await db.select().from(questions).where(eq(questions.id, id));
    if (!row) return json(res, 404, { error: 'Item tidak ditemui.' });
    const approved = body.decision === 'approve';
    const status = approved ? 'human_approved' : 'rejected';
    // verifiedByReviewer hanya menjadi benar di sini — selepas keputusan penyemak manusia.
    const data = { ...row.data, validationStatus: status, verifiedByReviewer: approved };
    await db.update(questions).set({ status, data, reviewer, reviewedAt: Date.now() }).where(eq(questions.id, id));
    return json(res, 200, { id, status });
  }

  if (route === 'POST /api/factory/generate') {
    if (!aiConfigured()) return json(res, 503, { error: 'Penjanaan AI tidak dikonfigurasi. Tetapkan ANTHROPIC_API_KEY pada pelayan.' });
    const body = await readBody(req);
    const count = Math.max(1, Math.min(10, Number(body.count) || 5));
    try {
      const items = await generateItems({ subject: body.subject, topic: str(body.topic, 80) ?? 'Umum', difficulty: str(body.difficulty, 20) ?? 'medium', count, avoid: Array.isArray(body.avoid) ? body.avoid.filter((x) => typeof x === 'string') : [] });
      return json(res, 200, { items });
    } catch (e) {
      return json(res, 502, { error: describeAiError(e) });
    }
  }

  if (route === 'GET /api/export') {
    return json(res, 200, {
      exportedAt: new Date().toISOString(),
      candidates: await db.select().from(candidates),
      sessions: await db.select().from(sessions),
      exposures: await db.select().from(exposures),
      questions: await db.select().from(questions),
      blueprints: await db.select().from(blueprints),
    });
  }
  return json(res, 404, { error: 'Laluan API tidak ditemui.' });
}

function serveStatic(req, res, url) {
  if (!fs.existsSync(root)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Folder out/ tiada. Jalankan `npm run build` dahulu.');
    return;
  }
  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  let status = 200;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file)) {
    file = path.join(root, '404.html');
    status = 404;
  }
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' };
  if (path.basename(file) === 'sw.js') headers['Cache-Control'] = 'no-cache';
  res.writeHead(status, headers);
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      api(req, res, url).catch((e) => json(res, e.status || 500, { error: String(e.message ?? e) }));
    } else serveStatic(req, res, url);
  })
  .listen(port, () => console.log(`Simulator UKKM MRSM 2027: http://localhost:${port}  (pangkalan data: ${kind}${aiConfigured() ? ', AI aktif' : ''})`));
