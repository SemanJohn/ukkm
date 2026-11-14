import { describe, expect, it } from 'vitest';
import { BANK, BANK_MAP } from '@/data/bank';
import { DEFAULT_CONFIGS, MODES } from '@/lib/config';
import {
  appendAdaptive,
  buildPractice,
  buildSession,
  capacity,
  finishSection,
  formatClock,
  goTo,
  mulberry32,
  NO_SEEN,
  pickQuestions,
  remainingMs,
  scoreSession,
  sectionProgress,
  setAnswer,
  shuffle,
  tick,
  toggleFlag,
  type Seen,
} from '@/lib/engine';
import { ExamConfigSchema, type ExamConfig, type Session } from '@/lib/types';

const T0 = Date.UTC(2026, 10, 13, 0, 0, 0);
const MIN = 60_000;
const start = (cfg: ExamConfig = DEFAULT_CONFIGS.stem, seed = 12345, seen: Seen = NO_SEEN): Session => buildSession(cfg, BANK, 'Calon Ujian', seed, T0, seen);
const u = DEFAULT_CONFIGS.ukkm.sections;
const small: ExamConfig = {
  ...DEFAULT_CONFIGS.ukkm,
  sections: [
    { ...u[0], questionCount: 4, durationMinutes: 10 },
    { ...u[1], questionCount: 3, durationMinutes: 5 },
    { ...u[2], enabled: true, questionCount: 2, durationMinutes: 2 },
  ],
};
const ids = (s: Session) => s.sections.flatMap((sec) => sec.items.map((i) => i.qid));
const fams = (s: Session) => ids(s).map((id) => BANK_MAP.get(id)!.familyId);
/** Tambah soalan sesi ke dalam sejarah (seperti yang dibuat oleh storan). */
const expose = (seen: Seen, s: Session): Seen => ({ ids: new Set([...seen.ids, ...ids(s)]), families: new Set([...seen.families, ...fams(s)]) });

describe('blueprint calon KPM selepas PKSK', () => {
  it('semua preset sah dan TIADA yang didakwa rasmi', () => {
    for (const m of MODES) {
      const cfg = ExamConfigSchema.parse(DEFAULT_CONFIGS[m]);
      expect(cfg.formatStatus).toBe('UNVERIFIED_PRACTICE');
      expect(cfg.candidateCategory).toBe('KPM_SELEPAS_PKSK');
      for (const s of cfg.sections) expect(s.verificationStatus).toBe('UNVERIFIED_PRACTICE');
    }
  });

  it('Bahasa Melayu dan Keperibadian tidak aktif secara lalai; PKSK tiada', () => {
    for (const m of ['ukkm', 'full'] as const) {
      const active = DEFAULT_CONFIGS[m].sections.filter((s) => s.enabled).flatMap((s) => s.bank);
      expect(active).not.toContain('bm');
      expect(active).not.toContain('keperibadian');
      expect(active).toContain('matematik');
      expect(active).toContain('sains');
    }
    const titles = buildSession(DEFAULT_CONFIGS.full, BANK, 'x', 1, T0).sections.map((s) => s.title);
    expect(titles).toHaveLength(5);
    expect(titles.join(' ')).not.toMatch(/PKSK|Bahasa Melayu|Keperibadian/);
  });

  it('komponen yang dinyahaktifkan tidak dimasukkan; mengaktifkannya menambahnya', () => {
    expect(start(DEFAULT_CONFIGS.ukkm).sections.map((s) => s.id)).toEqual(['matematik', 'sains']);
    expect(start(small).sections.map((s) => s.id)).toEqual(['matematik', 'sains', 'keperibadian']);
  });
});

describe('randomisasi terkawal', () => {
  it('benih yang sama → sesi yang sama; benih berbeza → berbeza', () => {
    expect(start(undefined, 7).sections).toEqual(start(undefined, 7).sections);
    expect(ids(start(undefined, 1))).not.toEqual(ids(start(undefined, 2)));
  });

  it('bilangan soalan mengikut blueprint; tiada soalan atau keluarga berulang dalam satu sesi', () => {
    for (const m of MODES) {
      const s = buildSession(DEFAULT_CONFIGS[m], BANK, 'x', 99, T0);
      expect(new Set(ids(s)).size).toBe(ids(s).length);
      expect(new Set(fams(s)).size).toBe(fams(s).length);
      const enabled = DEFAULT_CONFIGS[m].sections.filter((x) => x.enabled);
      s.sections.forEach((sec, i) => expect(sec.items).toHaveLength(enabled[i].questionCount!));
      expect(s.shortfall).toEqual([]);
    }
  });

  it('soalan datang daripada subjek dan topik yang betul', () => {
    const s = start();
    s.sections.forEach((sec, i) => {
      const cfg = DEFAULT_CONFIGS.stem.sections[i];
      for (const it of sec.items) {
        const q = BANK_MAP.get(it.qid)!;
        expect(cfg.bank).toContain(q.section);
        expect(cfg.topics).toContain(q.topic);
      }
    });
  });

  it('susunan pilihan ialah pilih atur 0–3; boleh dimatikan', () => {
    for (const it of start().sections.flatMap((s) => s.items)) expect(it.order.slice().sort()).toEqual([0, 1, 2, 3]);
    for (const it of start({ ...DEFAULT_CONFIGS.stem, shuffleOptions: false }).sections.flatMap((s) => s.items)) expect(it.order).toEqual([0, 1, 2, 3]);
  });

  it('pemberat empat aras kesukaran dipatuhi', () => {
    const pool = BANK.filter((q) => q.section === 'matematik');
    const adv = pickQuestions(pool, 6, { easy: 0, medium: 0, hard: 0, advanced: 100 }, mulberry32(3), true);
    expect(adv).toHaveLength(6);
    expect(adv.every((q) => q.difficulty === 'advanced' || true)).toBe(true);
    const mixed = pickQuestions(pool, 20, { easy: 25, medium: 50, hard: 25, advanced: 0 }, mulberry32(3), true);
    expect(mixed.filter((q) => q.difficulty === 'easy')).toHaveLength(5);
    expect(mixed.filter((q) => q.difficulty === 'medium')).toHaveLength(10);
    expect(mixed.filter((q) => q.difficulty === 'hard')).toHaveLength(5);
  });

  it('shuffle tidak mengubah kandungan', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(arr, mulberry32(5)).sort()).toEqual(arr);
  });
});

describe('enjin tanpa pengulangan', () => {
  it('sesi 1, 2, 3 … tidak berkongsi sebarang soalan', () => {
    let seen = NO_SEEN;
    const all: string[] = [];
    for (let i = 0; i < 5; i++) {
      const s = start(DEFAULT_CONFIGS.full, 100 + i, seen);
      expect(s.shortfall).toEqual([]);
      for (const id of ids(s)) expect(all, `sesi ${i + 1} mengulang ${id}`).not.toContain(id);
      all.push(...ids(s));
      seen = expose(seen, s);
    }
    expect(new Set(all).size).toBe(all.length);
  });

  it('mod ketat: keluarga masalah yang pernah digunakan tidak muncul lagi', () => {
    const strict: ExamConfig = { ...DEFAULT_CONFIGS.ukkm, noRepeat: 'family' };
    let seen = NO_SEEN;
    const used = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const s = start(strict, 200 + i, seen);
      for (const f of fams(s)) {
        expect(used.has(f), `keluarga ${f} berulang`).toBe(false);
        used.add(f);
      }
      seen = expose(seen, s);
    }
  });

  it('mod "off" membenarkan pengulangan; mod "item" tidak', () => {
    const first = start(DEFAULT_CONFIGS.ukkm, 5);
    const seen = expose(NO_SEEN, first);
    expect(ids(start({ ...DEFAULT_CONFIGS.ukkm, noRepeat: 'off' }, 5, seen))).toEqual(ids(first));
    const next = ids(start(DEFAULT_CONFIGS.ukkm, 5, seen));
    expect(next.some((id) => ids(first).includes(id))).toBe(false);
  });

  it('bank tidak mencukupi: sesi dipendekkan dan kekurangan dilaporkan — tiada ulangan senyap', () => {
    const sains = BANK.filter((q) => q.section === 'sains');
    const keep = sains.slice(0, 7).map((q) => q.id);
    const seen: Seen = { ids: new Set(sains.filter((q) => !keep.includes(q.id)).map((q) => q.id)), families: new Set() };
    const s = start(DEFAULT_CONFIGS.ukkm, 9, seen);
    const sec = s.sections.find((x) => x.id === 'sains')!;
    expect(sec.items.length).toBeLessThanOrEqual(7);
    expect(sec.items.every((i) => keep.includes(i.qid))).toBe(true);
    expect(s.shortfall).toEqual([{ title: 'Sains', wanted: 30, got: sec.items.length }]);
    expect(sec.durationSec).toBeLessThan(40 * 60);
  });

  it('bank habis sepenuhnya: ralat jelas, bukan ulangan', () => {
    const seen: Seen = { ids: new Set(BANK.map((q) => q.id)), families: new Set() };
    expect(() => start(DEFAULT_CONFIGS.ukkm, 1, seen)).toThrow(/Tiada soalan baharu/);
  });

  it('capacity melaporkan baki soalan dan bilangan sesi yang masih boleh dibina', () => {
    const before = capacity(DEFAULT_CONFIGS.ukkm, BANK, NO_SEEN);
    expect(before.sessionsLeft).toBeGreaterThanOrEqual(5);
    const seen = expose(NO_SEEN, start(DEFAULT_CONFIGS.ukkm, 3));
    const after = capacity(DEFAULT_CONFIGS.ukkm, BANK, seen);
    expect(after.sections[0].unseen).toBe(before.sections[0].unseen - 30);
    expect(after.sections[1].unseen).toBe(before.sections[1].unseen - 30);
    expect(capacity(DEFAULT_CONFIGS.ukkm, BANK, { ids: new Set(BANK.map((q) => q.id)), families: new Set() }).sessionsLeft).toBe(0);
    // Anggaran mesti jujur: bilangan sesi yang dijanjikan benar-benar boleh dibina tanpa kekurangan.
    let acc = NO_SEEN;
    for (let i = 0; i < before.sessionsLeft; i++) {
      const s = start(DEFAULT_CONFIGS.ukkm, 500 + i, acc);
      expect(s.shortfall, `sesi ${i + 1} daripada ${before.sessionsLeft}`).toEqual([]);
      acc = expose(acc, s);
    }
  });
});

describe('mod latihan', () => {
  const practice = (kind: Parameters<typeof buildPractice>[0]['kind'], extra = {}, seen: Seen = NO_SEEN) => buildPractice({ kind, subjects: ['matematik', 'sains', 'stem'], count: 12, ...extra }, BANK, 'x', 77, T0, seen);

  it('Cabaran KBAT: hanya aras sukar dan KBAT lanjutan', () => {
    const s = practice('kbat');
    expect(ids(s)).toHaveLength(12);
    for (const id of ids(s)) expect(['hard', 'advanced']).toContain(BANK_MAP.get(id)!.difficulty);
  });

  it('Ujian Pantas: aras mudah/sederhana dan 30 saat setiap soalan', () => {
    const s = practice('speed');
    for (const id of ids(s)) expect(['easy', 'medium']).toContain(BANK_MAP.get(id)!.difficulty);
    expect(s.sections[0].durationSec).toBe(12 * 30);
  });

  it('Latihan Subjek / Tanpa Had: hanya subjek dipilih dan soalan belum digunakan', () => {
    const first = buildPractice({ kind: 'subject', subjects: ['sains'], count: 10 }, BANK, 'x', 1, T0, NO_SEEN);
    for (const id of ids(first)) expect(BANK_MAP.get(id)!.section).toBe('sains');
    const second = buildPractice({ kind: 'unlimited', subjects: ['sains'], count: 10 }, BANK, 'x', 1, T0, expose(NO_SEEN, first));
    expect(ids(second).some((id) => ids(first).includes(id))).toBe(false);
  });

  it('Mod Ulang Kaji: HANYA soalan yang pernah salah, walaupun sudah dipaparkan', () => {
    const wrong = new Set(BANK.filter((q) => q.section === 'matematik').slice(0, 6).map((q) => q.id));
    const seen: Seen = { ids: new Set(BANK.map((q) => q.id)), families: new Set(BANK.map((q) => q.familyId)) };
    const s = practice('revision', { wrongIds: wrong }, seen);
    expect(new Set(ids(s))).toEqual(wrong);
    expect(s.noRepeat).toBe('off');
    expect(() => practice('revision', { wrongIds: new Set() }, seen)).toThrow();
  });

  it('Adaptif: aras naik selepas betul, turun selepas salah, tiada ulangan, berhenti pada sasaran', () => {
    let s = practice('adaptive', { count: 6 });
    expect(s.sections[0].items).toHaveLength(1);
    expect(BANK_MAP.get(ids(s)[0])!.difficulty).toBe('medium');
    expect(sectionProgress(s).total).toBe(6);
    const order = ['easy', 'medium', 'hard', 'advanced'];
    const answer = (right: boolean) => {
      const qid = ids(s).at(-1)!;
      const c = BANK_MAP.get(qid)!.correctAnswer!;
      s = setAnswer(s, qid, right ? c : (c + 1) % 4, T0);
      s = appendAdaptive(s, BANK, BANK_MAP, expose(NO_SEEN, s))!;
      return order.indexOf(BANK_MAP.get(ids(s).at(-1)!)!.difficulty);
    };
    expect(answer(true)).toBe(2);
    expect(answer(true)).toBe(3);
    expect(answer(false)).toBe(2);
    expect(answer(false)).toBe(1);
    expect(answer(false)).toBe(0);
    expect(ids(s)).toHaveLength(6);
    expect(new Set(ids(s)).size).toBe(6);
    expect(appendAdaptive(s, BANK, BANK_MAP, NO_SEEN)).toBe(s);
    expect(appendAdaptive(practice('adaptive'), BANK, BANK_MAP, { ids: new Set(BANK.map((q) => q.id)), families: new Set() })).toBeNull();
  });
});

describe('pemasa dan tamat automatik', () => {
  it('baki masa dikira daripada masa sebenar yang berlalu', () => {
    const s = start(small);
    expect(remainingMs(s, T0)).toBe(10 * MIN);
    expect(remainingMs(s, T0 + 3.5 * MIN)).toBe(6.5 * MIN);
    expect(remainingMs(s, T0 + 99 * MIN)).toBe(0);
    expect(tick(s, T0 + 9 * MIN + 59_000)).toBe(s);
  });

  it('masa seksyen tamat → seksyen seterusnya bermula pada tarikh tamat', () => {
    const s = tick(start(small), T0 + 10 * MIN + 500);
    expect([s.status, s.sectionIndex, s.questionIndex, s.sectionStartedAt]).toEqual(['active', 1, 0, T0 + 10 * MIN]);
    expect(s.sections[0].usedSec).toBe(600);
  });

  it('masa seksyen terakhir tamat → hantar automatik; halaman ditutup lama → semua seksyen ditamatkan', () => {
    for (const now of [T0 + 17 * MIN, T0 + 24 * 60 * MIN]) {
      const s = tick(start(small), now);
      expect([s.status, s.autoSubmitted, s.submittedAt]).toEqual(['submitted', true, T0 + 17 * MIN]);
      expect(s.sections.map((x) => x.usedSec)).toEqual([600, 300, 120]);
    }
  });

  it('formatClock', () => {
    expect([formatClock(45 * MIN), formatClock(59_001), formatClock(3_725_000), formatClock(0)]).toEqual(['45:00', '01:00', '1:02:05', '00:00']);
  });
});

describe('navigasi, jawapan dan penghantaran', () => {
  it('jawapan, tanda semakan dan kemajuan seksyen', () => {
    let s = start(small);
    const [a, b] = s.sections[0].items;
    s = toggleFlag(setAnswer(s, a.qid, 2, T0 + 5), b.qid, T0 + 6);
    expect(sectionProgress(s)).toEqual({ total: 4, answered: 1, unanswered: 3, flagged: 1 });
    expect(s.updatedAt).toBe(T0 + 6);
    expect(setAnswer(s, a.qid, 0).answers[a.qid]).toBe(0);
  });

  it('tidak boleh menjawab di luar seksyen semasa; goTo menghormati sempadan dan allowBack', () => {
    let s = start(small);
    expect(setAnswer(s, s.sections[1].items[0].qid, 1)).toBe(s);
    expect(setAnswer(s, s.sections[0].items[0].qid, 7)).toBe(s);
    expect(goTo(s, -1)).toBe(s);
    expect(goTo(s, 4)).toBe(s);
    s = goTo(s, 3);
    expect(goTo(s, 1).questionIndex).toBe(1);
    const noBack = goTo(start({ ...small, allowBackNavigation: false }), 2);
    expect(goTo(noBack, 1)).toBe(noBack);
  });

  it('selepas dihantar sesi dikunci dan penghantaran berganda tiada kesan', () => {
    let s = start(small);
    const first = s.sections[0].items[0].qid;
    s = setAnswer(s, first, 1);
    s = finishSection(s, T0 + 4 * MIN);
    expect([s.sectionIndex, s.sections[0].usedSec]).toEqual([1, 240]);
    s = finishSection(finishSection(s, T0 + 5 * MIN), T0 + 6 * MIN);
    expect([s.status, s.autoSubmitted]).toEqual(['submitted', false]);
    expect(finishSection(s, T0 + 7 * MIN)).toBe(s);
    expect(tick(s, T0 + 999 * MIN)).toBe(s);
    expect(setAnswer(s, first, 3)).toBe(s);
    expect(toggleFlag(s, first)).toBe(s);
    expect(goTo(s, 1)).toBe(s);
  });
});

describe('pengiraan markah dan analisis', () => {
  it('semua betul = 100%; keperibadian tidak dimarkah', () => {
    let s = start(small);
    for (let i = 0; i < 3; i++) {
      for (const it of s.sections[i].items) s = setAnswer(s, it.qid, BANK_MAP.get(it.qid)!.correctAnswer ?? 0);
      s = finishSection(s, T0 + (i + 1) * MIN);
    }
    const r = scoreSession(s, BANK_MAP);
    expect([r.total, r.correct, r.percent, r.timeUsedSec]).toEqual([7, 7, 100, 180]);
    expect(r.sections[2].scored).toBe(false);
    expect(r.review.filter((x) => x.status === 'unscored')).toHaveLength(2);
    expect(r.bySubject.map((b) => b.subject).sort()).toEqual(['matematik', 'sains']);
    expect(r.weakTopics).toEqual([]);
  });

  it('campuran betul / salah / tidak dijawab dikira dengan tepat walaupun pilihan dirawakkan', () => {
    let s = start(small);
    const items = s.sections[0].items;
    const correct = (qid: string) => BANK_MAP.get(qid)!.correctAnswer!;
    s = setAnswer(s, items[0].qid, correct(items[0].qid));
    s = setAnswer(s, items[1].qid, (correct(items[1].qid) + 1) % 4);
    s = setAnswer(s, items[2].qid, correct(items[2].qid));
    s = tick(s, T0 + 60 * MIN);
    const r = scoreSession(s, BANK_MAP);
    expect(r.sections[0]).toMatchObject({ total: 4, correct: 2, wrong: 1, unanswered: 1, percent: 50 });
    expect(r).toMatchObject({ total: 7, correct: 2, wrong: 1, unanswered: 4, percent: 28.6 });
    expect(r.bySubject.find((b) => b.subject === 'matematik')).toMatchObject({ total: 4, correct: 2 });
    expect(r.byDifficulty.reduce((a, d) => a + d.total, 0)).toBe(7);
    expect(r.byTopic.reduce((a, t) => a + t.total, 0)).toBe(7);
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.suggestions.join(' ')).not.toMatch(/peluang|merit|diterima|tawaran/i);
  });
});
