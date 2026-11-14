import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildBank } from '@/data/bank';
import { CANDIDATE_DEFAULT, DEFAULT_CONFIGS } from '@/lib/config';
import {
  applyExposureReset,
  clearExposures,
  deleteSession,
  exportAll,
  getActiveSession,
  getCandidateName,
  getSeen,
  getSession,
  getWrongIds,
  listBlueprintVersions,
  listExposures,
  listSessions,
  loadBank,
  loadConfig,
  mergeExposures,
  nextAdaptive,
  resetConfig,
  saveConfig,
  saveSession,
  setCandidateName,
  setVariants,
  startExam,
  startPractice,
} from '@/lib/db';
import { finishSection, setAnswer, tick } from '@/lib/engine';
import { sessionWins } from '@/lib/sync';
import type { Session } from '@/lib/types';

const T0 = Date.UTC(2026, 10, 13);
const bundle = buildBank();
const ids = (s: Session) => s.sections.flatMap((sec) => sec.items.map((i) => i.qid));
const C = 'Calon A';

describe('autosave, resume dan sejarah kekal (IndexedDB)', () => {
  let first: Session;

  it('memulakan sesi menyimpan sesi DAN sejarah pendedahan dalam satu transaksi', async () => {
    first = await startExam(DEFAULT_CONFIGS.stem, bundle, C, 42, T0);
    expect(await getSession(first.id)).toEqual(first);
    const ex = await listExposures(C);
    expect(new Set(ex.map((e) => e.qid))).toEqual(new Set(ids(first)));
    expect(ex.every((e) => e.sessionId === first.id && e.familyId)).toBe(true);
    expect((await getActiveSession('stem'))?.id).toBe(first.id);
  });

  it('jawapan dipulihkan dan pemasa diteruskan daripada masa sebenar', async () => {
    let s = setAnswer(first, first.sections[0].items[0].qid, 3, T0 + 1000);
    await saveSession(s);
    s = (await getSession(first.id))!;
    expect(s.answers[first.sections[0].items[0].qid]).toBe(3);
    const later = tick(s, T0 + 26 * 60_000);
    expect(later.sectionIndex).toBe(1);
  });

  it('sesi baharu selepas "menutup aplikasi" tidak mengulang soalan sesi terdahulu', async () => {
    let s = (await getSession(first.id))!;
    for (let i = 0; i < 3; i++) s = finishSection(s, T0 + (i + 1) * 60_000);
    await saveSession(s);
    expect(await getActiveSession('stem')).toBeUndefined();
    const second = await startExam(DEFAULT_CONFIGS.stem, bundle, C, 42, T0 + 10);
    const third = await startExam({ ...DEFAULT_CONFIGS.stem, id: 'full' }, bundle, C, 42, T0 + 20);
    const all = [...ids(first), ...ids(second), ...ids(third)];
    expect(new Set(all).size).toBe(all.length);
    expect((await getSeen(C)).ids.size).toBe(all.length);
  });

  it('sejarah adalah bagi setiap calon', async () => {
    const other = await startExam(DEFAULT_CONFIGS.stem, bundle, 'Calon B', 42, T0);
    expect(ids(other)).toEqual(ids(first));
    expect((await getSeen('calon  b')).ids.size).toBe(ids(other).length);
  });

  it('pelbagai sesi dimulakan SERENTAK tidak memilih soalan yang sama', async () => {
    const started = await Promise.all([1, 2, 3, 4].map((k) => startPractice({ kind: 'unlimited', subjects: ['matematik'], count: 25 }, bundle, 'Calon Serentak', 7, T0 + k)));
    const all = started.flatMap(ids);
    expect(all).toHaveLength(100);
    expect(new Set(all).size).toBe(100);
    expect((await listExposures('Calon Serentak')).length).toBe(100);
  });

  it('membuang sesi tidak memadam sejarah soalan', async () => {
    const before = (await getSeen('Calon Serentak')).ids.size;
    for (const s of (await listSessions()).filter((x) => x.candidateName === 'Calon Serentak')) await deleteSession(s.id);
    expect((await getSeen('Calon Serentak')).ids.size).toBe(before);
  });

  it('mod adaptif menambah soalan secara transaksi dan merekod pendedahan', async () => {
    let s = await startPractice({ kind: 'adaptive', subjects: ['sains'], count: 3 }, bundle, 'Calon Adaptif', 5, T0);
    const q = bundle.map.get(ids(s)[0])!;
    s = setAnswer(s, q.id, q.correctAnswer!, T0);
    s = (await nextAdaptive(s, bundle))!;
    expect(ids(s)).toHaveLength(2);
    expect((await listExposures('Calon Adaptif')).map((e) => e.qid).sort()).toEqual(ids(s).slice().sort());
    expect((await getSession(s.id))!.sections[0].items).toHaveLength(2);
  });

  it('mod ulang kaji mengambil soalan yang status terkininya salah', async () => {
    const name = 'Calon Ulang';
    let s = await startPractice({ kind: 'subject', subjects: ['matematik'], count: 5 }, bundle, name, 3, T0);
    const [a, b] = ids(s);
    s = setAnswer(s, a, bundle.map.get(a)!.correctAnswer!, T0);
    s = setAnswer(s, b, (bundle.map.get(b)!.correctAnswer! + 1) % 4, T0);
    await saveSession(finishSection(s, T0 + 1000));
    const wrong = await getWrongIds(name, bundle.map);
    expect(wrong.has(a)).toBe(false);
    expect(wrong.size).toBe(4);
    const rev = await startPractice({ kind: 'revision', subjects: ['matematik'], count: 10 }, bundle, name, 4, T0 + 5000);
    expect(new Set(ids(rev))).toEqual(wrong);
    expect((await getSeen(name)).ids.size).toBe(5);
  });

  it('memadam sejarah hanya atas arahan; pemadaman dari peranti lain turut digunakan', async () => {
    expect(await clearExposures(C)).toBeGreaterThan(0);
    expect((await getSeen(C)).ids.size).toBe(0);
    await mergeExposures([{ candidate: 'calon z', qid: 'MT001', familyId: 'MT001', sessionId: 's', at: 100 }, { candidate: 'calon z', qid: 'MT002', familyId: 'MT002', sessionId: 's', at: 300 }]);
    await applyExposureReset('Calon Z', 200);
    expect((await listExposures('Calon Z')).map((e) => e.qid)).toEqual(['MT002']);
  });
});

describe('blueprint: versi dan log perubahan', () => {
  it('lalai digunakan jika tiada penggantian', async () => {
    expect(await loadConfig('ukkm')).toEqual(DEFAULT_CONFIGS.ukkm);
    expect(await listBlueprintVersions('ukkm')).toEqual([]);
  });

  it('setiap simpanan merekod versi baharu dengan catatan', async () => {
    const custom = { ...DEFAULT_CONFIGS.ukkm, allowCalculator: true, sections: DEFAULT_CONFIGS.ukkm.sections.map((s, i) => (i === 0 ? { ...s, questionCount: 5, durationMinutes: 7.5 } : i === 2 ? { ...s, enabled: true } : s)) };
    expect((await saveConfig(custom, 'Aktifkan Keperibadian')).version).toBe(1);
    const loaded = await loadConfig('ukkm');
    expect(loaded.sections[0]).toMatchObject({ questionCount: 5, durationMinutes: 7.5 });
    expect(loaded.sections[2].enabled).toBe(true);
    await resetConfig('ukkm');
    const versions = await listBlueprintVersions('ukkm');
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
    expect(versions[1].note).toBe('Aktifkan Keperibadian');
    expect(await loadConfig('ukkm')).toEqual(DEFAULT_CONFIGS.ukkm);
    const s = await startExam(DEFAULT_CONFIGS.ukkm, bundle, 'Calon V', 1, T0);
    expect(s.blueprintVersion).toBe(2);
  });

  it('konfigurasi tidak sah ditolak', async () => {
    await expect(saveConfig({ ...DEFAULT_CONFIGS.stem, sections: [{ ...DEFAULT_CONFIGS.stem.sections[0], questionCount: 0 }] })).rejects.toThrow();
    expect(await loadConfig('stem')).toEqual(DEFAULT_CONFIGS.stem);
  });
});

describe('tetapan, bank dan eksport', () => {
  it('nama calon lalai dan boleh diubah', async () => {
    expect(await getCandidateName()).toBe(CANDIDATE_DEFAULT);
    await setCandidateName('Ujian');
    expect(await getCandidateName()).toBe('Ujian');
  });

  it('menaikkan varian kilang membesarkan bank yang dimuatkan', async () => {
    const before = (await loadBank()).bank.length;
    await setVariants(30);
    expect((await loadBank()).bank.length).toBeGreaterThan(before);
  });

  it('eksport mengandungi sesi, sejarah dan blueprint', async () => {
    const data = (await exportAll()) as { sessions: unknown[]; exposures: unknown[]; blueprints: unknown[] };
    expect(data.sessions.length).toBeGreaterThan(0);
    expect(data.exposures.length).toBeGreaterThan(0);
    expect(data.blueprints.length).toBe(2);
  });
});

describe('peraturan gabungan penyelarasan', () => {
  const base = { id: 'x', status: 'active', updatedAt: 10 } as Session;
  it('sesi dihantar tidak ditimpa; selain itu yang terkini menang', () => {
    expect(sessionWins(base, undefined)).toBe(true);
    expect(sessionWins({ ...base, updatedAt: 11 }, base)).toBe(true);
    expect(sessionWins({ ...base, updatedAt: 9 }, base)).toBe(false);
    expect(sessionWins({ ...base, status: 'submitted', updatedAt: 1 }, base)).toBe(true);
    expect(sessionWins({ ...base, updatedAt: 99 }, { ...base, status: 'submitted' })).toBe(false);
  });
});
