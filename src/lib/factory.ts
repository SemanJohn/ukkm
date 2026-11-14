import { hashString, mulberry32, shuffle, type Rng } from './engine';
import { closeTo, contentHash, evalCalc, fingerprint, jaccard, parseNumeric } from './text';
import { QuestionSchema, type BankSection, type Difficulty, type Figure, type Question } from './types';

/**
 * KILANG SOALAN — saluran: GENERATE → CHECK ANSWER → CHECK DISTRACTORS → DETECT DUPLICATES → VALIDATE → PUBLISH
 * Templat deterministik menghasilkan item berangka; jawapan disahkan dengan ungkapan `calc` bebas.
 * Item yang lulus berstatus `auto_validated` — BUKAN semakan manusia.
 */

export interface R {
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  rnd: Rng;
}

export interface Draft {
  q: string;
  ans: number;
  /** Calon pengganggu (kesilapan lazim). Kilang menapis yang tidak sah dan mengambil tiga. */
  wrong: number[];
  /** Pemformat nilai → teks pilihan. */
  f: (v: number) => string;
  expl: string;
  /** Ungkapan aritmetik bebas (digit dan + - * / % ( ) sahaja). */
  calc: string;
  figure?: Figure;
}

export interface Template {
  id: string;
  section: BankSection;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  make(r: R): Draft | null;
}

export interface FactoryReport {
  templates: number;
  attempted: number;
  published: number;
  failedAnswer: number;
  failedDistractors: number;
  failedSchema: number;
  duplicates: number;
  rejectedByTemplate: number;
  families: number;
  bySection: Record<string, number>;
}

const makeR = (seed: number): R => {
  const rnd = mulberry32(seed);
  return { rnd, int: (a, b) => a + Math.floor(rnd() * (b - a + 1)), pick: (arr) => arr[Math.floor(rnd() * arr.length)] };
};

const tidy = (v: number) => Math.round(v * 1000) / 1000;

export type CheckResult = { ok: true; question: Question } | { ok: false; reason: 'answer' | 'distractors' | 'schema' | 'duplicate' | 'template'; detail?: string };

/** Semak satu draf dan tukar kepada item bank. `seenHashes`/`seenPrints` dikemas kini apabila lulus. */
/** `adoptable`: keluarga sedia ada (item tulisan tangan) yang boleh disertai oleh varian templat yang strukturnya sama. */
export function checkDraft(tpl: Template, id: string, d: Draft | null, seenHashes: Set<string>, seenPrints: Map<string, string>, adoptable: Set<string> = new Set()): CheckResult {
  if (!d) return { ok: false, reason: 'template' };
  // CHECK ANSWER — pengiraan bebas mesti sepadan, dan jawapan mesti "kemas".
  let independent: number;
  try {
    independent = evalCalc(d.calc);
  } catch (e) {
    return { ok: false, reason: 'answer', detail: String(e) };
  }
  if (!Number.isFinite(d.ans) || d.ans < 0 || !closeTo(independent, d.ans) || !closeTo(tidy(d.ans), d.ans)) {
    return { ok: false, reason: 'answer', detail: `ans=${d.ans} calc=${independent}` };
  }
  const answerText = d.f(d.ans);
  const shown = parseNumeric(answerText);
  if (shown === null || !closeTo(shown, d.ans)) return { ok: false, reason: 'answer', detail: `paparan "${answerText}" ≠ ${d.ans}` };

  // CHECK DISTRACTORS — tiga pengganggu sah, berbeza nilai dan teks; tiada jawapan berganda.
  const texts = [answerText];
  const values = [d.ans];
  const step = Number.isInteger(d.ans) ? Math.max(1, Math.round(d.ans / 10)) : 0.1;
  for (const w of [...d.wrong, d.ans + step, d.ans + 2 * step, Math.max(0, d.ans - step), d.ans * 2, d.ans + 3 * step]) {
    if (texts.length === 4) break;
    const v = tidy(w);
    if (!Number.isFinite(v) || v < 0 || values.some((x) => closeTo(x, v))) continue;
    const t = d.f(v);
    if (texts.includes(t)) continue;
    texts.push(t);
    values.push(v);
  }
  if (texts.length < 4) return { ok: false, reason: 'distractors' };

  // DETECT DUPLICATES — teks tepat, dan pertindihan semantik dengan keluarga LAIN.
  const hash = contentHash(d.q, texts);
  const print = fingerprint(d.q);
  if (seenHashes.has(hash)) return { ok: false, reason: 'duplicate', detail: 'teks sama' };
  const owner = seenPrints.get(print);
  // Struktur sama dengan soalan tulisan tangan (hanya nombor berbeza): item ini menyertai KELUARGA soalan itu,
  // supaya mod tanpa pengulangan ketat menganggapnya masalah yang sama. Bertindih dengan templat lain: ditolak.
  let familyId = tpl.id;
  if (owner && owner !== tpl.id) {
    if (!adoptable.has(owner)) return { ok: false, reason: 'duplicate', detail: `cap jari sama dengan keluarga ${owner}` };
    familyId = owner;
  }

  const order = shuffle([0, 1, 2, 3], mulberry32(hashString(id)));
  const question: Question = {
    id,
    familyId,
    templateId: tpl.id,
    contentHash: hash,
    fingerprint: print,
    section: tpl.section,
    topic: tpl.topic,
    subtopic: tpl.subtopic,
    difficulty: tpl.difficulty,
    question: d.q,
    options: order.map((o) => texts[o]),
    correctAnswer: order.indexOf(0),
    explanation: d.expl,
    calc: d.calc,
    sourceType: 'template-generated',
    validationStatus: 'auto_validated',
    verifiedByReviewer: false,
  };
  if (d.figure) question.figure = d.figure;
  // VALIDATE
  const parsed = QuestionSchema.safeParse(question);
  if (!parsed.success) return { ok: false, reason: 'schema', detail: parsed.error.issues[0]?.message };
  seenHashes.add(hash);
  if (!owner) seenPrints.set(print, tpl.id);
  return { ok: true, question };
}

/** Jana `variants` item bagi setiap templat secara deterministik (id stabil merentas peranti). */
export function runFactory(templates: Template[], variants: number, existing: Question[]): { questions: Question[]; report: FactoryReport } {
  const seenHashes = new Set(existing.map((q) => q.contentHash));
  const seenPrints = new Map(existing.map((q) => [q.fingerprint, q.familyId] as const));
  const report: FactoryReport = { templates: templates.length, attempted: 0, published: 0, failedAnswer: 0, failedDistractors: 0, failedSchema: 0, duplicates: 0, rejectedByTemplate: 0, families: 0, bySection: {} };
  const questions: Question[] = [];
  const adoptable = new Set(existing.map((q) => q.familyId));
  const newFamilies = new Set<string>();
  for (const tpl of templates) {
    let made = 0;
    const base = hashString(tpl.id);
    for (let i = 0; i < variants; i++) {
      // Sehingga 6 cubaan bagi setiap varian supaya pendua/parameter tidak sah diganti, bukan diulang.
      for (let attempt = 0; attempt < 6; attempt++) {
        report.attempted++;
        const res = checkDraft(tpl, `G-${tpl.id}-${String(i).padStart(3, '0')}`, tpl.make(makeR((base + i * 7919 + attempt * 104729) >>> 0)), seenHashes, seenPrints, adoptable);
        if (res.ok) {
          if (!adoptable.has(res.question.familyId)) newFamilies.add(res.question.familyId);
          questions.push(res.question);
          report.published++;
          report.bySection[tpl.section] = (report.bySection[tpl.section] ?? 0) + 1;
          made++;
          break;
        }
        if (res.reason === 'answer') report.failedAnswer++;
        else if (res.reason === 'distractors') report.failedDistractors++;
        else if (res.reason === 'schema') report.failedSchema++;
        else if (res.reason === 'duplicate') report.duplicates++;
        else report.rejectedByTemplate++;
      }
    }
    void made;
  }
  report.families = newFamilies.size;
  return { questions, report };
}

export interface DuplicatePair {
  a: string;
  b: string;
  similarity: number;
}

/** Cari pasangan hampir-pendua merentas keluarga berlainan (Jaccard token ≥ ambang). */
export function findNearDuplicates(bank: Question[], threshold = 0.8): DuplicatePair[] {
  const reps = new Map<string, Question>();
  for (const q of bank) if (!reps.has(q.familyId)) reps.set(q.familyId, q);
  const list = [...reps.values()];
  const out: DuplicatePair[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (list[i].section !== list[j].section) continue;
      const s = jaccard(list[i].question, list[j].question);
      if (s < threshold) continue;
      // Soalan dianggap hampir-pendua jika set pilihannya sama, atau teksnya hampir sama DAN nombornya sama
      // serta berkongsi sekurang-kurangnya dua pilihan. (Batang soalan generik seperti “Pilih ayat yang betul.”
      // dengan pilihan berbeza bukan pendua.)
      const oa = new Set(list[i].options.map((o) => o.trim().toLowerCase()));
      const shared = list[j].options.filter((o) => oa.has(o.trim().toLowerCase())).length;
      const nums = (t: string) => (t.match(/\d+(\.\d+)?/g) ?? []).join(',');
      if (shared === 4 || (s >= 0.95 && shared >= 2 && nums(list[i].question) === nums(list[j].question))) out.push({ a: list[i].id, b: list[j].id, similarity: Math.round(s * 100) / 100 });
    }
  }
  return out;
}

/**
 * Semak item yang dijana AI (atau diimport). Sentiasa dikuarantin (`pending_review`) —
 * hanya penyemak manusia di halaman Admin boleh meluluskannya.
 */
export const AiItemSchema = QuestionSchema;
export function vetExternalItem(raw: unknown, bank: Question[]): { ok: true; question: Question } | { ok: false; reason: string } {
  const r = raw as Partial<Question> & { options?: string[]; question?: string };
  if (!r || typeof r.question !== 'string' || !Array.isArray(r.options)) return { ok: false, reason: 'struktur tidak sah' };
  const candidate = {
    ...r,
    contentHash: contentHash(r.question, r.options),
    fingerprint: fingerprint(r.question),
    sourceType: 'ai-generated',
    validationStatus: 'pending_review',
    verifiedByReviewer: false,
  };
  const parsed = QuestionSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, reason: `skema: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}` };
  const q = parsed.data;
  if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) return { ok: false, reason: 'pilihan tidak unik' };
  if (q.calc) {
    let v: number;
    try {
      v = evalCalc(q.calc);
    } catch {
      return { ok: false, reason: 'calc tidak selamat atau tidak sah' };
    }
    const shown = parseNumeric(q.options[q.correctAnswer ?? 0]);
    if (shown === null || !closeTo(shown, v)) return { ok: false, reason: `jawapan (${shown}) tidak sepadan dengan pengiraan bebas (${v})` };
    for (let i = 0; i < 4; i++) {
      const other = parseNumeric(q.options[i]);
      if (i !== q.correctAnswer && other !== null && closeTo(other, v)) return { ok: false, reason: 'pengganggu sama nilai dengan jawapan' };
    }
  }
  for (const b of bank) {
    if (b.contentHash === q.contentHash) return { ok: false, reason: `pendua teks dengan ${b.id}` };
    if (b.section === q.section && jaccard(b.question, q.question) >= 0.8) return { ok: false, reason: `pertindihan semantik dengan ${b.id}` };
  }
  return { ok: true, question: q };
}
