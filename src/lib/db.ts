import { openDB, type IDBPDatabase } from 'idb';
import { buildBank, DEFAULT_VARIANTS, type BankBundle } from '@/data/bank';
import { CANDIDATE_DEFAULT, DEFAULT_CONFIGS } from './config';
import { appendAdaptive, buildPractice, buildSession, candidateKey, scoreSession, type PracticeOpts, type Seen } from './engine';
import { ExamConfigSchema, QuestionSchema, type ExamConfig, type Exposure, type Mode, type Question, type Session, type SessionMode } from './types';

const DB_NAME = 'mrsm-sim-2027';
let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          d.createObjectStore('sessions', { keyPath: 'id' });
          d.createObjectStore('kv');
        }
        if (oldVersion < 2) {
          const ex = d.createObjectStore('exposures', { keyPath: ['candidate', 'qid'] });
          ex.createIndex('candidate', 'candidate');
          d.createObjectStore('questions', { keyPath: 'id' });
          d.createObjectStore('blueprints', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

const kvGet = async <T>(key: string): Promise<T | undefined> => (await db()).get('kv', key);
const kvPut = async (key: string, value: unknown) => {
  await (await db()).put('kv', value, key);
};

/* ---------- Sesi ---------- */

/** Sesi lama (sebelum v2) tidak mempunyai medan baharu — lengkapkan supaya serasi. */
function upgradeSession(s: Session): Session {
  return { ...s, updatedAt: s.updatedAt ?? s.submittedAt ?? s.startedAt, noRepeat: s.noRepeat ?? 'off', shortfall: s.shortfall ?? [] };
}

export async function saveSession(s: Session): Promise<void> {
  await (await db()).put('sessions', s);
}
export async function getSession(id: string): Promise<Session | undefined> {
  const s = (await (await db()).get('sessions', id)) as Session | undefined;
  return s && upgradeSession(s);
}
export async function listSessions(): Promise<Session[]> {
  const all = (await (await db()).getAll('sessions')) as Session[];
  return all.map(upgradeSession).sort((a, b) => b.startedAt - a.startedAt);
}
export async function deleteSession(id: string): Promise<void> {
  await (await db()).delete('sessions', id);
}
export async function getActiveSession(mode: SessionMode): Promise<Session | undefined> {
  return (await listSessions()).find((s) => s.mode === mode && s.status === 'active');
}

/* ---------- Sejarah pendedahan (enjin tanpa pengulangan) ---------- */

export async function listExposures(candidate: string): Promise<Exposure[]> {
  return (await db()).getAllFromIndex('exposures', 'candidate', candidateKey(candidate));
}
export async function getSeen(candidate: string): Promise<Seen> {
  const ex = await listExposures(candidate);
  return { ids: new Set(ex.map((e) => e.qid)), families: new Set(ex.map((e) => e.familyId)) };
}
/** Gabung pendedahan (cth. dari pelayan). Rekod sedia ada dikekalkan. */
export async function mergeExposures(list: Exposure[]): Promise<void> {
  const tx = (await db()).transaction('exposures', 'readwrite');
  for (const e of list) if (!(await tx.store.get([e.candidate, e.qid]))) await tx.store.put(e);
  await tx.done;
}
/** Padam sejarah soalan calon — hanya atas tindakan pengguna yang jelas di Admin. */
export async function clearExposures(candidate: string): Promise<number> {
  const key = candidateKey(candidate);
  const tx = (await db()).transaction('exposures', 'readwrite');
  let n = 0;
  for (const e of (await tx.store.index('candidate').getAll(key)) as Exposure[]) {
    await tx.store.delete([e.candidate, e.qid]);
    n++;
  }
  await tx.done;
  await kvPut(`exposureResetAt:${key}`, Date.now());
  return n;
}

export async function getExposureResetAt(candidate: string): Promise<number> {
  return (await kvGet<number>(`exposureResetAt:${candidateKey(candidate)}`)) ?? 0;
}
/** Guna pakai pemadaman sejarah yang dibuat pada peranti lain: buang pendedahan sebelum `at`. */
export async function applyExposureReset(candidate: string, at: number): Promise<void> {
  const key = candidateKey(candidate);
  if (at <= (await getExposureResetAt(candidate))) return;
  const tx = (await db()).transaction('exposures', 'readwrite');
  for (const e of (await tx.store.index('candidate').getAll(key)) as Exposure[]) if (e.at <= at) await tx.store.delete([e.candidate, e.qid]);
  await tx.done;
  await kvPut(`exposureResetAt:${key}`, at);
}

/**
 * Mulakan sesi secara TRANSAKSI: baca sejarah, pilih soalan, simpan sesi dan pendedahan dalam satu
 * transaksi IndexedDB. Dua permulaan serentak (cth. dua tab) tidak boleh memilih soalan yang sama
 * kerana transaksi baca-tulis ke atas stor yang sama dijalankan secara bersiri.
 */
export async function startSessionAtomic(candidate: string, bank: Question[], build: (seen: Seen) => Session): Promise<Session> {
  const key = candidateKey(candidate);
  const byId = new Map(bank.map((q) => [q.id, q]));
  const tx = (await db()).transaction(['sessions', 'exposures'], 'readwrite');
  const ex = (await tx.objectStore('exposures').index('candidate').getAll(key)) as Exposure[];
  const session = build({ ids: new Set(ex.map((e) => e.qid)), families: new Set(ex.map((e) => e.familyId)) });
  await tx.objectStore('sessions').put(session);
  for (const sec of session.sections) {
    for (const it of sec.items) {
      const q = byId.get(it.qid);
      if (q && !(await tx.objectStore('exposures').get([key, q.id]))) {
        await tx.objectStore('exposures').put({ candidate: key, qid: q.id, familyId: q.familyId, sessionId: session.id, at: session.startedAt } satisfies Exposure);
      }
    }
  }
  await tx.done;
  return session;
}

export async function startExam(cfg: ExamConfig, bundle: BankBundle, candidate: string, seed: number, now: number): Promise<Session> {
  const version = (await listBlueprintVersions(cfg.id))[0]?.version;
  return startSessionAtomic(candidate, bundle.bank, (seen) => buildSession(cfg, bundle.bank, candidate, seed, now, seen, version));
}

export async function startPractice(o: PracticeOpts, bundle: BankBundle, candidate: string, seed: number, now: number): Promise<Session> {
  const wrongIds = o.kind === 'revision' ? await getWrongIds(candidate, bundle.map) : undefined;
  return startSessionAtomic(candidate, bundle.bank, (seen) => buildPractice({ ...o, wrongIds }, bundle.bank, candidate, seed, now, seen));
}

/** Mod adaptif: tambah soalan seterusnya secara transaksi. Null = tiada lagi soalan baharu. */
export async function nextAdaptive(s: Session, bundle: BankBundle): Promise<Session | null> {
  const key = candidateKey(s.candidateName);
  const tx = (await db()).transaction(['sessions', 'exposures'], 'readwrite');
  const ex = (await tx.objectStore('exposures').index('candidate').getAll(key)) as Exposure[];
  const next = appendAdaptive(s, bundle.bank, bundle.map, { ids: new Set(ex.map((e) => e.qid)), families: new Set(ex.map((e) => e.familyId)) });
  if (next && next !== s) {
    const item = next.sections[next.sectionIndex].items.at(-1)!;
    const q = bundle.map.get(item.qid)!;
    await tx.objectStore('exposures').put({ candidate: key, qid: q.id, familyId: q.familyId, sessionId: s.id, at: Date.now() } satisfies Exposure);
    await tx.objectStore('sessions').put(next);
  }
  await tx.done;
  return next;
}

/** Soalan yang status terkininya salah atau tidak dijawab dalam sesi yang telah dihantar. */
export async function getWrongIds(candidate: string, map: Map<string, Question>): Promise<Set<string>> {
  const key = candidateKey(candidate);
  const latest = new Map<string, boolean>();
  const sessions = (await listSessions()).filter((s) => s.status === 'submitted' && candidateKey(s.candidateName) === key).sort((a, b) => a.startedAt - b.startedAt);
  for (const s of sessions) for (const r of scoreSession(s, map).review) if (r.status !== 'unscored') latest.set(r.qid, r.status !== 'correct');
  return new Set([...latest].filter(([, wrong]) => wrong).map(([id]) => id));
}

/* ---------- Blueprint: konfigurasi, versi dan log perubahan ---------- */

export interface BlueprintVersion {
  key: string;
  mode: Mode;
  version: number;
  savedAt: number;
  note: string;
  config: ExamConfig;
}

export async function loadConfig(mode: Mode): Promise<ExamConfig> {
  const parsed = ExamConfigSchema.safeParse(await kvGet(`config:${mode}`));
  return parsed.success ? parsed.data : DEFAULT_CONFIGS[mode];
}
export async function listBlueprintVersions(mode?: Mode): Promise<BlueprintVersion[]> {
  const all = (await (await db()).getAll('blueprints')) as BlueprintVersion[];
  return all.filter((b) => !mode || b.mode === mode).sort((a, b) => b.savedAt - a.savedAt);
}
export async function saveConfig(cfg: ExamConfig, note = 'Disimpan dari Admin'): Promise<BlueprintVersion> {
  const config = ExamConfigSchema.parse(cfg);
  const version = ((await listBlueprintVersions(config.id))[0]?.version ?? 0) + 1;
  const entry: BlueprintVersion = { key: `${config.id}:${String(version).padStart(5, '0')}`, mode: config.id, version, savedAt: Date.now(), note, config };
  const tx = (await db()).transaction(['kv', 'blueprints'], 'readwrite');
  await tx.objectStore('kv').put(config, `config:${config.id}`);
  await tx.objectStore('blueprints').put(entry);
  await tx.done;
  return entry;
}
export async function resetConfig(mode: Mode): Promise<void> {
  await saveConfig(DEFAULT_CONFIGS[mode], 'Set semula kepada preset lalai');
}
export async function mergeBlueprints(list: BlueprintVersion[]): Promise<void> {
  const tx = (await db()).transaction('blueprints', 'readwrite');
  for (const b of list) if (!(await tx.store.get(b.key))) await tx.store.put(b);
  await tx.done;
}

/* ---------- Bank: tetapan kilang dan item tambahan yang diluluskan ---------- */

export async function getVariants(): Promise<number> {
  return (await kvGet<number>('factory:variants')) ?? DEFAULT_VARIANTS;
}
export async function setVariants(v: number): Promise<void> {
  await kvPut('factory:variants', v);
}
export async function listExtraQuestions(): Promise<Question[]> {
  const raw = await (await db()).getAll('questions');
  return raw.flatMap((r) => {
    const p = QuestionSchema.safeParse(r);
    return p.success ? [p.data] : [];
  });
}
/** Gantikan cache item tambahan (item `human_approved` yang diselaraskan dari pelayan). */
export async function replaceExtraQuestions(list: Question[]): Promise<void> {
  const tx = (await db()).transaction('questions', 'readwrite');
  await tx.store.clear();
  for (const q of list) if (q.validationStatus === 'human_approved') await tx.store.put(q);
  await tx.done;
}
export async function loadBank(): Promise<BankBundle> {
  return buildBank(await getVariants(), await listExtraQuestions());
}

/* ---------- Calon & tetapan ---------- */

export async function getCandidateName(): Promise<string> {
  return (await kvGet<string>('candidate')) ?? CANDIDATE_DEFAULT;
}
export async function setCandidateName(name: string): Promise<void> {
  await kvPut('candidate', name);
}
export async function getSetting<T>(key: string): Promise<T | undefined> {
  return kvGet<T>(`setting:${key}`);
}
export async function setSetting(key: string, value: unknown): Promise<void> {
  await kvPut(`setting:${key}`, value);
}

/** Eksport semua data tempatan (sesi, sejarah soalan, blueprint) sebagai JSON. */
export async function exportAll(): Promise<Record<string, unknown>> {
  const d = await db();
  return {
    exportedAt: new Date().toISOString(),
    app: 'simulator-ukkm-mrsm-2027',
    sessions: await d.getAll('sessions'),
    exposures: await d.getAll('exposures'),
    blueprints: await d.getAll('blueprints'),
    approvedQuestions: await d.getAll('questions'),
    candidate: await getCandidateName(),
    variants: await getVariants(),
  };
}
