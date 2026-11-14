import { presetLabel } from './config';
import {
  DIFFICULTIES,
  USABLE_STATUSES,
  type BankSection,
  type Difficulty,
  type DifficultyMix,
  type ExamConfig,
  type ExamResult,
  type ExamSection,
  type NoRepeat,
  type PracticeKind,
  type Question,
  type ReviewItem,
  type SectionResult,
  type Session,
  type SessionSection,
  type Shortfall,
  type Tally,
} from './types';

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<T>(arr: readonly T[], rnd: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sejarah pendedahan calon: id soalan dan keluarga yang pernah dipaparkan. */
export interface Seen {
  ids: Set<string>;
  families: Set<string>;
}
export const NO_SEEN: Seen = { ids: new Set(), families: new Set() };

export const usable = (q: Question) => USABLE_STATUSES.includes(q.validationStatus);

/** Soalan yang layak bagi satu seksyen selepas menapis sejarah mengikut mod tanpa pengulangan. */
export function eligible(sec: Pick<ExamSection, 'bank' | 'topics'>, bank: Question[], seen: Seen, noRepeat: NoRepeat): Question[] {
  return bank.filter(
    (q) =>
      usable(q) &&
      sec.bank.includes(q.section) &&
      (!sec.topics || sec.topics.length === 0 || sec.topics.includes(q.topic)) &&
      (noRepeat === 'off' || !seen.ids.has(q.id)) &&
      (noRepeat !== 'family' || !seen.families.has(q.familyId)),
  );
}

function roundRobinByTopic(items: Question[]): Question[] {
  const queues = new Map<string, Question[]>();
  for (const q of items) {
    if (!queues.has(q.topic)) queues.set(q.topic, []);
    queues.get(q.topic)!.push(q);
  }
  const out: Question[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const queue of queues.values()) {
      const q = queue.shift();
      if (q) {
        out.push(q);
        added = true;
      }
    }
  }
  return out;
}

/**
 * Pilih `count` soalan mengikut pemberat aras. Dalam satu sesi, tidak lebih daripada satu soalan
 * diambil daripada keluarga yang sama (`usedFamilies` dikongsi merentas seksyen).
 */
export function pickQuestions(pool: Question[], count: number, mix: DifficultyMix, rnd: Rng, shuffleOrder: boolean, usedFamilies: Set<string> = new Set()): Question[] {
  const total = DIFFICULTIES.reduce((a, d) => a + mix[d], 0) || 1;
  const targets = {} as Record<Difficulty, number>;
  let assigned = 0;
  for (const d of ['easy', 'hard', 'advanced'] as Difficulty[]) {
    targets[d] = Math.round((count * mix[d]) / total);
    assigned += targets[d];
  }
  targets.medium = Math.max(0, count - assigned);
  const picked: Question[] = [];
  const take = (q: Question) => {
    if (usedFamilies.has(q.familyId)) return false;
    usedFamilies.add(q.familyId);
    picked.push(q);
    return true;
  };
  const leftovers: Question[] = [];
  for (const d of DIFFICULTIES) {
    let got = 0;
    for (const q of roundRobinByTopic(shuffle(pool.filter((x) => x.difficulty === d), rnd))) {
      if (got < targets[d] && picked.length < count) {
        if (take(q)) got++;
      } else leftovers.push(q);
    }
  }
  for (const q of shuffle(leftovers, rnd)) {
    if (picked.length >= count) break;
    take(q);
  }
  return shuffleOrder ? shuffle(picked, rnd) : picked.sort((a, b) => a.id.localeCompare(b.id));
}

const optionOrder = (shuffleOptions: boolean, rnd: Rng) => (shuffleOptions ? shuffle([0, 1, 2, 3], rnd) : [0, 1, 2, 3]);

interface SectionPlan {
  id: string;
  title: string;
  bank: BankSection[];
  topics?: string[];
  count: number;
  minutes: number | null;
  mix: DifficultyMix;
  scored: boolean;
  /** Jika diberi, hanya aras ini dibenarkan. */
  only?: Difficulty[];
  /** Jika diberi, pilih daripada senarai id ini (mod ulang kaji). */
  fromIds?: Set<string>;
}

interface AssembleOpts {
  mode: Session['mode'];
  title: string;
  label: string;
  candidateName: string;
  seed: number;
  now: number;
  noRepeat: NoRepeat;
  allowBack: boolean;
  allowCalculator: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  blueprintVersion?: number;
}

function assemble(plans: SectionPlan[], bank: Question[], seen: Seen, o: AssembleOpts): Session {
  const rnd = mulberry32(o.seed);
  const usedFamilies = new Set<string>();
  const sections: SessionSection[] = [];
  const shortfall: Shortfall[] = [];
  for (const p of plans) {
    let pool = eligible(p, bank, seen, p.fromIds ? 'off' : o.noRepeat);
    if (p.only) pool = pool.filter((q) => p.only!.includes(q.difficulty));
    if (p.fromIds) pool = pool.filter((q) => p.fromIds!.has(q.id));
    const chosen = pickQuestions(pool, p.count, p.mix, rnd, o.shuffleQuestions, usedFamilies);
    // Tidak cukup soalan unik: laporkan kekurangan — JANGAN ulang soalan secara senyap.
    if (chosen.length < p.count) shortfall.push({ title: p.title, wanted: p.count, got: chosen.length });
    if (chosen.length === 0) continue;
    const ratio = chosen.length / p.count;
    sections.push({
      id: p.id,
      title: p.title,
      durationSec: p.minutes == null ? null : Math.max(60, Math.round(p.minutes * 60 * ratio)),
      scored: p.scored,
      usedSec: null,
      items: chosen.map((q) => ({ qid: q.id, order: optionOrder(o.shuffleOptions, rnd) })),
    });
  }
  if (sections.length === 0) throw new Error('Tiada soalan baharu yang tersedia untuk konfigurasi ini. Jana soalan baharu di Admin atau gunakan Mod Ulang Kaji.');
  return {
    id: `${o.mode}-${o.now.toString(36)}-${(o.seed >>> 0).toString(36)}`,
    mode: o.mode,
    title: o.title,
    presetLabel: o.label,
    candidateName: o.candidateName,
    seed: o.seed,
    status: 'active',
    sections,
    sectionIndex: 0,
    questionIndex: 0,
    sectionStartedAt: o.now,
    startedAt: o.now,
    submittedAt: null,
    updatedAt: o.now,
    autoSubmitted: false,
    answers: {},
    flags: {},
    allowBack: o.allowBack,
    allowCalculator: o.allowCalculator,
    noRepeat: o.noRepeat,
    shortfall,
    blueprintVersion: o.blueprintVersion,
  };
}

/** Simulasi peperiksaan penuh mengikut blueprint (hanya seksyen yang diaktifkan). */
export function buildSession(cfg: ExamConfig, bank: Question[], candidateName: string, seed: number, now: number, seen: Seen = NO_SEEN, blueprintVersion?: number): Session {
  const plans: SectionPlan[] = cfg.sections
    .filter((s) => s.enabled && s.questionCount)
    .map((s) => ({ id: s.id, title: s.title, bank: s.bank, topics: s.topics, count: s.questionCount!, minutes: s.durationMinutes, mix: s.difficulty, scored: s.scored }));
  return assemble(plans, bank, seen, {
    mode: cfg.id, title: cfg.name, label: presetLabel(cfg.formatStatus), candidateName, seed, now, noRepeat: cfg.noRepeat,
    allowBack: cfg.allowBackNavigation ?? true, allowCalculator: cfg.allowCalculator ?? false, shuffleQuestions: cfg.shuffleQuestions, shuffleOptions: cfg.shuffleOptions, blueprintVersion,
  });
}

export interface PracticeOpts {
  kind: PracticeKind;
  subjects: BankSection[];
  count: number;
  /** Id soalan yang pernah dijawab salah / tidak dijawab (mod ulang kaji). */
  wrongIds?: Set<string>;
}

const EVEN: DifficultyMix = { easy: 20, medium: 40, hard: 25, advanced: 15 };
export const PRACTICE_INFO: Record<PracticeKind, { title: string; desc: string }> = {
  subject: { title: 'Latihan Subjek', desc: 'Pilih Matematik, Sains atau STEM. Soalan baharu sahaja.' },
  kbat: { title: 'Cabaran KBAT', desc: 'Soalan aras sukar dan KBAT lanjutan sahaja.' },
  speed: { title: 'Ujian Pantas', desc: 'Aras mudah dan sederhana dengan masa yang ketat (30 saat setiap soalan).' },
  revision: { title: 'Mod Ulang Kaji', desc: 'Ulang soalan yang pernah dijawab salah atau tidak dijawab. Satu-satunya mod yang sengaja mengulang soalan.' },
  unlimited: { title: 'Latihan Baharu Tanpa Had', desc: 'Sesi baharu daripada soalan yang belum pernah dipaparkan, selagi bank mencukupi.' },
  adaptive: { title: 'Latihan Adaptif', desc: 'Aras soalan naik apabila jawapan betul dan turun apabila salah.' },
};

export function buildPractice(o: PracticeOpts, bank: Question[], candidateName: string, seed: number, now: number, seen: Seen): Session {
  const info = PRACTICE_INFO[o.kind];
  const plan: SectionPlan = { id: o.kind, title: info.title, bank: o.subjects, count: o.count, minutes: Math.ceil(o.count * 1.5), mix: EVEN, scored: true };
  if (o.kind === 'kbat') {
    plan.only = ['hard', 'advanced'];
    plan.mix = { easy: 0, medium: 0, hard: 50, advanced: 50 };
    plan.minutes = o.count * 2;
  } else if (o.kind === 'speed') {
    plan.only = ['easy', 'medium'];
    plan.mix = { easy: 50, medium: 50, hard: 0, advanced: 0 };
    plan.minutes = o.count * 0.5;
  } else if (o.kind === 'revision') {
    plan.fromIds = o.wrongIds ?? new Set();
  }
  const base = { mode: o.kind, title: info.title, label: 'MOD LATIHAN', candidateName, seed, now, allowCalculator: false, shuffleQuestions: true, shuffleOptions: true } as const;
  if (o.kind === 'adaptive') {
    // Mula dengan satu soalan aras sederhana; selebihnya ditambah oleh appendAdaptive.
    const s = assemble([{ ...plan, count: 1, minutes: null, only: ['medium'] }], bank, seen, { ...base, noRepeat: 'item', allowBack: false });
    s.sections[0].durationSec = Math.ceil(o.count * 1.5) * 60;
    s.shortfall = [];
    s.adaptive = { target: o.count, level: 1, bank: o.subjects };
    return s;
  }
  return assemble([plan], bank, seen, { ...base, noRepeat: o.kind === 'revision' ? 'off' : 'item', allowBack: true });
}

/** Mod adaptif: tambah soalan seterusnya — aras naik jika soalan terakhir betul, turun jika salah. Null jika tiada lagi soalan baharu. */
export function appendAdaptive(s: Session, bank: Question[], byId: Map<string, Question>, seen: Seen): Session | null {
  if (s.status !== 'active' || !s.adaptive) return s;
  const sec = s.sections[s.sectionIndex];
  if (sec.items.length >= s.adaptive.target) return s;
  const last = sec.items[sec.items.length - 1];
  const lastQ = byId.get(last.qid);
  const correct = lastQ?.correctAnswer !== undefined && s.answers[last.qid] === lastQ.correctAnswer;
  const level = Math.max(0, Math.min(3, s.adaptive.level + (correct ? 1 : -1)));
  const inSession = new Set(sec.items.map((i) => i.qid));
  const families = new Set(sec.items.map((i) => byId.get(i.qid)?.familyId));
  const pool = eligible({ bank: s.adaptive.bank }, bank, seen, 'item').filter((q) => !inSession.has(q.id) && !families.has(q.familyId));
  if (pool.length === 0) return null;
  const rnd = mulberry32((s.seed + sec.items.length * 2654435761) >>> 0);
  // Cari aras terdekat yang masih ada soalan.
  let pick: Question | undefined;
  for (const delta of [0, -1, 1, -2, 2, -3, 3]) {
    const d = DIFFICULTIES[level + delta];
    const at = d ? pool.filter((q) => q.difficulty === d) : [];
    if (at.length) {
      pick = at[Math.floor(rnd() * at.length)];
      break;
    }
  }
  if (!pick) return null;
  const items = [...sec.items, { qid: pick.id, order: shuffle([0, 1, 2, 3], rnd) }];
  return {
    ...s,
    adaptive: { ...s.adaptive, level },
    sections: s.sections.map((x, i) => (i === s.sectionIndex ? { ...x, items } : x)),
    questionIndex: items.length - 1,
  };
}

export interface Capacity {
  title: string;
  need: number;
  unseen: number;
  unseenFamilies: number;
  sessionsLeft: number;
}

/** Baki soalan unik dan bilangan sesi baharu yang masih boleh dibina bagi satu blueprint. */
export function capacity(cfg: ExamConfig, bank: Question[], seen: Seen): { sections: Capacity[]; sessionsLeft: number } {
  const sections = cfg.sections
    .filter((s) => s.enabled && s.questionCount)
    .map((s) => {
      const pool = eligible(s, bank, seen, cfg.noRepeat === 'off' ? 'off' : cfg.noRepeat);
      const counts = new Map<string, number>();
      for (const q of pool) counts.set(q.familyId, (counts.get(q.familyId) ?? 0) + 1);
      const fams = counts.size;
      const per = s.questionCount!;
      // Satu sesi mengambil paling banyak SATU soalan daripada setiap keluarga. Maka k sesi penuh boleh dibina
      // hanya jika Σ min(saiz keluarga, k) ≥ k × bilangan soalan — bukan sekadar jumlah soalan ÷ bilangan soalan.
      let sessionsLeft = 0;
      if (cfg.noRepeat === 'family') sessionsLeft = Math.floor(fams / per);
      else {
        const sizes = [...counts.values()];
        for (let k = 1; k <= Math.floor(pool.length / per); k++) {
          if (sizes.reduce((a, c) => a + Math.min(c, k), 0) >= k * per) sessionsLeft = k;
          else break;
        }
      }
      return { title: s.title, need: per, unseen: pool.length, unseenFamilies: fams, sessionsLeft };
    });
  return { sections, sessionsLeft: sections.length ? Math.min(...sections.map((s) => s.sessionsLeft)) : 0 };
}

const touch = (s: Session, at: number): Session => ({ ...s, updatedAt: Math.max(at, s.updatedAt) });

function endSection(s: Session, at: number, auto: boolean): Session {
  if (s.status !== 'active') return s;
  const sec = s.sections[s.sectionIndex];
  let used = Math.max(0, Math.round((at - s.sectionStartedAt) / 1000));
  if (sec.durationSec != null) used = Math.min(used, sec.durationSec);
  const sections = s.sections.map((x, i) => (i === s.sectionIndex ? { ...x, usedSec: used } : x));
  if (s.sectionIndex >= s.sections.length - 1) {
    return touch({ ...s, sections, status: 'submitted', submittedAt: at, autoSubmitted: auto }, at);
  }
  return touch({ ...s, sections, sectionIndex: s.sectionIndex + 1, questionIndex: 0, sectionStartedAt: at }, at);
}

/** Majukan sesi mengikut masa sebenar: tamatkan seksyen yang masanya habis; hantar automatik pada seksyen terakhir. */
export function tick(s: Session, now: number): Session {
  let cur = s;
  while (cur.status === 'active') {
    const sec = cur.sections[cur.sectionIndex];
    if (sec.durationSec == null) break;
    const deadline = cur.sectionStartedAt + sec.durationSec * 1000;
    if (now < deadline) break;
    cur = endSection(cur, deadline, true);
  }
  return cur;
}

export function remainingMs(s: Session, now: number): number | null {
  if (s.status !== 'active') return 0;
  const sec = s.sections[s.sectionIndex];
  if (sec.durationSec == null) return null;
  return Math.max(0, s.sectionStartedAt + sec.durationSec * 1000 - now);
}

function inCurrentSection(s: Session, qid: string): boolean {
  return s.sections[s.sectionIndex].items.some((i) => i.qid === qid);
}

export function setAnswer(s: Session, qid: string, originalIndex: number, now = Date.now()): Session {
  if (s.status !== 'active' || !inCurrentSection(s, qid) || originalIndex < 0 || originalIndex > 3) return s;
  return touch({ ...s, answers: { ...s.answers, [qid]: originalIndex } }, now);
}

export function toggleFlag(s: Session, qid: string, now = Date.now()): Session {
  if (s.status !== 'active' || !inCurrentSection(s, qid)) return s;
  const flags = { ...s.flags };
  if (flags[qid]) delete flags[qid];
  else flags[qid] = true;
  return touch({ ...s, flags }, now);
}

export function goTo(s: Session, index: number): Session {
  if (s.status !== 'active') return s;
  const max = s.sections[s.sectionIndex].items.length - 1;
  if (index < 0 || index > max) return s;
  if (!s.allowBack && index < s.questionIndex) return s;
  return { ...s, questionIndex: index };
}

/** Tamatkan seksyen semasa secara manual (seksyen terakhir = hantar). Idempoten selepas dihantar. */
export function finishSection(s: Session, now: number): Session {
  return endSection(tick(s, now), now, false);
}

export function sectionProgress(s: Session, sectionIndex = s.sectionIndex) {
  const items = s.sections[sectionIndex].items;
  const answered = items.filter((i) => s.answers[i.qid] !== undefined).length;
  const flagged = items.filter((i) => s.flags[i.qid]).length;
  const total = s.adaptive ? Math.max(items.length, s.adaptive.target) : items.length;
  return { total, answered, unanswered: total - answered, flagged };
}

const emptyTally = (): Tally => ({ total: 0, correct: 0, wrong: 0, unanswered: 0, percent: 0 });
const finish = <T extends Tally>(t: T): T => ({ ...t, percent: t.total ? Math.round((t.correct / t.total) * 1000) / 10 : 0 });
function add(t: Tally, status: ReviewItem['status']) {
  t.total++;
  if (status === 'correct') t.correct++;
  else if (status === 'wrong') t.wrong++;
  else t.unanswered++;
}

export function scoreSession(s: Session, bank: Map<string, Question>): ExamResult {
  const overall = emptyTally();
  const sections: SectionResult[] = [];
  const topics = new Map<string, Tally & { group: string; topic: string }>();
  const subjects = new Map<BankSection, Tally>();
  const diffs = Object.fromEntries(DIFFICULTIES.map((d) => [d, emptyTally()])) as Record<Difficulty, Tally>;
  const review: ReviewItem[] = [];
  let timeUsed = 0;

  for (const sec of s.sections) {
    const t = emptyTally();
    sec.items.forEach((item, idx) => {
      const q = bank.get(item.qid);
      const chosen = s.answers[item.qid] ?? null;
      if (!q) return;
      if (!sec.scored || q.correctAnswer === undefined) {
        t.total++;
        if (chosen === null) t.unanswered++;
        review.push({ qid: item.qid, sectionTitle: sec.title, number: idx + 1, status: 'unscored', chosen });
        return;
      }
      const status: ReviewItem['status'] = chosen === null ? 'unanswered' : chosen === q.correctAnswer ? 'correct' : 'wrong';
      add(t, status);
      add(overall, status);
      add(diffs[q.difficulty], status);
      if (!subjects.has(q.section)) subjects.set(q.section, emptyTally());
      add(subjects.get(q.section)!, status);
      const key = `${q.section}|${q.topic}`;
      if (!topics.has(key)) topics.set(key, { ...emptyTally(), group: sec.title, topic: q.topic });
      add(topics.get(key)!, status);
      review.push({ qid: item.qid, sectionTitle: sec.title, number: idx + 1, status, chosen });
    });
    const used = sec.usedSec ?? 0;
    timeUsed += used;
    sections.push({ ...finish(t), id: sec.id, title: sec.title, scored: sec.scored, usedSec: used, durationSec: sec.durationSec });
  }

  const byTopic = [...topics.values()].map(finish).sort((a, b) => a.percent - b.percent || b.total - a.total);
  const byDifficulty = DIFFICULTIES.map((d) => ({ ...finish(diffs[d]), difficulty: d })).filter((d) => d.total > 0);
  const bySubject = [...subjects.entries()].map(([subject, t]) => ({ ...finish(t), subject }));
  const result = finish(overall);
  const weak = byTopic.filter((t) => t.total >= 2 && t.percent < 60);

  const suggestions: string[] = [];
  for (const t of weak.slice(0, 5)) suggestions.push(`Ulang kaji topik “${t.topic}” (${t.group}): ${t.correct}/${t.total} betul. Cuba Latihan Subjek untuk topik ini.`);
  if (result.wrong + result.unanswered > 0) suggestions.push('Gunakan Mod Ulang Kaji untuk mencuba semula soalan yang salah selepas membaca penjelasannya.');
  if (result.unanswered > 0) suggestions.push(`${result.unanswered} soalan tidak dijawab. Latih pengurusan masa dengan Ujian Pantas.`);
  const easy = byDifficulty.find((d) => d.difficulty === 'easy');
  if (easy && easy.percent < 80) suggestions.push('Ketepatan soalan aras mudah di bawah 80% — semak kecuaian dan baca soalan dengan teliti.');
  const high = byDifficulty.filter((d) => d.difficulty === 'hard' || d.difficulty === 'advanced');
  const hTotal = high.reduce((a, d) => a + d.total, 0);
  const hCorrect = high.reduce((a, d) => a + d.correct, 0);
  if (hTotal >= 3 && hCorrect / hTotal < 0.5) suggestions.push('Soalan aras tinggi masih lemah — cuba Cabaran KBAT dan baca penjelasan setiap soalan yang salah.');
  if (result.total > 0 && result.percent >= 80 && weak.length === 0) suggestions.push('Prestasi kukuh. Tingkatkan cabaran dengan Cabaran KBAT atau naikkan pemberat aras sukar di Admin.');

  return { ...result, timeUsedSec: timeUsed, sections, bySubject, byTopic, byDifficulty, review, weakTopics: weak.map((t) => t.topic), suggestions };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

export const candidateKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
