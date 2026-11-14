import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Ujian integrasi pelayan penyelarasan (Drizzle + PGlite dalam ingatan) melalui HTTP sebenar.
const PORT = 3217;
const URL_ = `http://localhost:${PORT}`;
const TOKEN = 'rahsia-ujian';
let proc: ChildProcess;

const call = async (pathname: string, body?: unknown, token: string | null = TOKEN) => {
  const res = await fetch(URL_ + pathname, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-sync-token': token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: (await res.json()) as Record<string, any> };
};
const cand = { key: 'calon a', name: 'Calon A' };
const ex = (qid: string, at: number) => ({ candidate: 'calon a', qid, familyId: `F-${qid}`, sessionId: 's1', at });
const sess = (id: string, status: string, updatedAt: number, extra = {}) => ({ id, status, updatedAt, candidateName: 'Calon A', ...extra });

beforeAll(async () => {
  proc = spawn(process.execPath, [path.resolve('server/index.mjs'), String(PORT)], { env: { ...process.env, DATA_DIR: 'memory', SYNC_TOKEN: TOKEN, DATABASE_URL: '', ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '' }, stdio: 'pipe' });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${URL_}/api/health`)).ok) return;
    } catch {
      /* belum sedia */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Pelayan tidak bermula');
}, 40_000);
afterAll(() => {
  proc?.kill();
});

describe('pelayan penyelarasan (PostgreSQL melalui Drizzle)', () => {
  it('health terbuka; laluan lain memerlukan token', async () => {
    const h = await call('/api/health', undefined, null);
    expect(h.data).toMatchObject({ ok: true, db: 'pglite', ai: false, tokenRequired: true });
    expect((await call('/api/sync', { candidate: cand }, null)).status).toBe(401);
    expect((await call('/api/sync', { candidate: cand }, 'salah')).status).toBe(401);
    expect((await call('/api/sync', {})).status).toBe(400);
  });

  it('sejarah soalan dari dua peranti digabungkan (kesatuan), tanpa pendua', async () => {
    const a = await call('/api/sync', { candidate: cand, exposures: [ex('MT001', 100), ex('MT002', 100)], sessions: [sess('s1', 'active', 100)] });
    expect(a.data.exposures).toHaveLength(2);
    const b = await call('/api/sync', { candidate: cand, exposures: [ex('MT002', 150), ex('SN009', 150)] });
    expect(b.data.exposures.map((e: any) => e.qid).sort()).toEqual(['MT001', 'MT002', 'SN009']);
    expect(b.data.sessions).toHaveLength(1);
    // Peranti baharu tanpa data menerima semua sejarah.
    const fresh = await call('/api/sync', { candidate: cand });
    expect(fresh.data.exposures).toHaveLength(3);
    expect(fresh.data.exposures[0]).toMatchObject({ candidate: 'calon a', familyId: expect.stringMatching(/^F-/) });
  });

  it('calon berlainan diasingkan', async () => {
    const other = await call('/api/sync', { candidate: { key: 'calon b', name: 'Calon B' } });
    expect(other.data.exposures).toEqual([]);
    expect(other.data.sessions).toEqual([]);
  });

  it('sesi: yang terkini menang, tetapi sesi yang dihantar tidak boleh ditimpa', async () => {
    let r = await call('/api/sync', { candidate: cand, sessions: [sess('s1', 'active', 50, { tag: 'lama' })] });
    expect(r.data.sessions[0].updatedAt).toBe(100);
    r = await call('/api/sync', { candidate: cand, sessions: [sess('s1', 'active', 200, { tag: 'baharu' })] });
    expect(r.data.sessions[0].tag).toBe('baharu');
    r = await call('/api/sync', { candidate: cand, sessions: [sess('s1', 'submitted', 210, { tag: 'hantar' })] });
    expect(r.data.sessions[0].status).toBe('submitted');
    r = await call('/api/sync', { candidate: cand, sessions: [sess('s1', 'active', 999, { tag: 'cubaan timpa' })] });
    expect(r.data.sessions[0]).toMatchObject({ status: 'submitted', tag: 'hantar' });
  });

  it('pemadaman sejarah disebarkan ke semua peranti', async () => {
    const r = await call('/api/sync', { candidate: cand, exposureResetAt: 120, exposures: [ex('MT001', 100)] });
    expect(r.data.exposureResetAt).toBe(120);
    expect(r.data.exposures.map((e: any) => e.qid).sort()).toEqual(['MT002', 'SN009'].filter((q) => q !== 'MT002').concat([]).sort());
    const again = await call('/api/sync', { candidate: cand, exposures: [ex('MT001', 100), ex('ST050', 500)] });
    expect(again.data.exposures.map((e: any) => e.qid).sort()).toEqual(['SN009', 'ST050']);
  });

  it('versi blueprint disimpan dan dikongsi', async () => {
    const r = await call('/api/sync', { candidate: cand, blueprints: [{ key: 'ukkm:00001', mode: 'ukkm', version: 1, savedAt: 5, note: 'ujian', config: {} }] });
    expect(r.data.blueprints).toHaveLength(1);
    expect((await call('/api/sync', { candidate: { key: 'calon b', name: 'Calon B' } })).data.blueprints[0].note).toBe('ujian');
  });

  it('item baharu SENTIASA dikuarantin; hanya kelulusan manusia menerbitkannya', async () => {
    const q = { id: 'AI-1', contentHash: 'aaaaaaaaaaaaaaaa', fingerprint: 'bbbbbbbbbbbbbbbb', question: 'Soalan contoh untuk ujian kuarantin?', options: ['1', '2', '3', '4'], correctAnswer: 0, validationStatus: 'human_approved', verifiedByReviewer: true };
    const stored = await call('/api/questions', { items: [{ question: q, audit: { aiAgrees: true } }, { question: { ...q, id: 'AI-2' } }] });
    expect(stored.data).toEqual({ stored: 1, duplicates: 1 });
    const pending = await call('/api/questions?status=pending_review');
    expect(pending.data.questions).toHaveLength(1);
    expect(pending.data.questions[0]).toMatchObject({ validationStatus: 'pending_review', verifiedByReviewer: false });
    expect((await call('/api/sync', { candidate: cand })).data.questions).toEqual([]);

    expect((await call('/api/questions/AI-1/review', { decision: 'approve' })).status).toBe(400);
    expect((await call('/api/questions/tiada/review', { decision: 'approve', reviewer: 'Cikgu' })).status).toBe(404);
    const ok = await call('/api/questions/AI-1/review', { decision: 'approve', reviewer: 'Cikgu Ujian' });
    expect(ok.data).toEqual({ id: 'AI-1', status: 'human_approved' });
    const published = (await call('/api/sync', { candidate: cand })).data.questions;
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ id: 'AI-1', validationStatus: 'human_approved', verifiedByReviewer: true });
  });

  it('penjanaan AI ditolak dengan jelas apabila tidak dikonfigurasi', async () => {
    const r = await call('/api/factory/generate', { subject: 'sains', topic: 'Tenaga', count: 2 });
    expect(r.status).toBe(503);
    expect(r.data.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it('eksport pangkalan data', async () => {
    const r = await call('/api/export');
    expect(r.data.candidates.length).toBe(2);
    expect(r.data.exposures.length).toBe(2);
  });
});
