import { describe, expect, it } from 'vitest';
import { BANK, BANK_MAP, buildBank, DEFAULT_VARIANTS, MANUAL_BANK } from '@/data/bank';
import { TEMPLATES } from '@/data/templates';
import { DEFAULT_CONFIGS, MODES } from '@/lib/config';
import { eligible, NO_SEEN, repeatable } from '@/lib/engine';
import { findNearDuplicates, vetExternalItem } from '@/lib/factory';
import { closeTo, contentHash, evalCalc, fingerprint, jaccard, parseNumeric } from '@/lib/text';
import { QuestionSchema, type Question } from '@/lib/types';

const manual = (section: Question['section']) => MANUAL_BANK.filter((q) => q.section === section);
const generated = BANK.filter((q) => q.sourceType === 'template-generated');
const { report } = buildBank();

describe('bank tulisan tangan — struktur', () => {
  it('500 item mengikut pecahan asal', () => {
    expect(MANUAL_BANK).toHaveLength(500);
    expect(manual('matematik')).toHaveLength(120);
    expect(manual('sains')).toHaveLength(120);
    expect(manual('bm')).toHaveLength(80);
    expect(manual('stem')).toHaveLength(150);
    expect(manual('keperibadian')).toHaveLength(30);
  });

  it('kedudukan jawapan betul tersebar antara A–D', () => {
    for (const section of ['matematik', 'sains', 'bm', 'stem'] as const) {
      const counts = [0, 0, 0, 0];
      for (const q of manual(section)) counts[q.correctAnswer!]++;
      for (const c of counts) {
        expect(c / manual(section).length, `${section}: ${counts.join(',')}`).toBeGreaterThan(0.1);
        expect(c / manual(section).length, `${section}: ${counts.join(',')}`).toBeLessThan(0.45);
      }
    }
  });
});

describe('bank penuh — validasi setiap item', () => {
  it('setiap item sah mengikut skema dan mempunyai metadata tanpa-pengulangan', () => {
    for (const q of BANK) {
      const r = QuestionSchema.safeParse(q);
      expect(r.success, `${q.id}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true);
      expect(q.contentHash, q.id).toBe(contentHash(q.question, q.options));
      expect(q.fingerprint, q.id).toBe(fingerprint(q.question));
      expect(q.familyId.length, q.id).toBeGreaterThan(0);
    }
  });

  it('id dan cincang kandungan unik (tiada pendua teks)', () => {
    expect(BANK_MAP.size).toBe(BANK.length);
    expect(new Set(BANK.map((q) => q.contentHash)).size).toBe(BANK.length);
  });

  it('empat pilihan berbeza; satu jawapan betul bagi item akademik; tiada skema bagi keperibadian', () => {
    for (const q of BANK) {
      expect(new Set(q.options.map((o) => o.trim().toLowerCase())).size, q.id).toBe(4);
      if (q.section === 'keperibadian') {
        expect(q.correctAnswer, q.id).toBeUndefined();
        expect(q.calc, q.id).toBeUndefined();
      } else {
        expect(q.options[q.correctAnswer!], q.id).toBeTruthy();
        expect((q.explanation ?? '').length, q.id).toBeGreaterThan(10);
      }
    }
  });

  it('TIADA item ditanda disemak manusia; status validasi jujur', () => {
    for (const q of BANK) {
      expect(q.verifiedByReviewer, q.id).toBe(false);
      expect(q.validationStatus, q.id).not.toBe('human_approved');
      expect(q.validationStatus === 'auto_validated', q.id).toBe(Boolean(q.calc));
    }
  });

  it('tiada pasangan hampir-pendua merentas keluarga berlainan', () => {
    expect(findNearDuplicates(BANK)).toEqual([]);
  });
});

describe('pengesahan pengiraan bebas', () => {
  const withCalc = BANK.filter((q) => q.calc);

  it('sekurang-kurangnya 100 daripada 120 item Matematik tulisan tangan disahkan', () => {
    expect(manual('matematik').filter((q) => q.calc).length).toBeGreaterThanOrEqual(100);
  });

  it('setiap item ber-calc: jawapan sepadan dan tiada pengganggu sama nilai', () => {
    expect(withCalc.length).toBeGreaterThan(1000);
    for (const q of withCalc) {
      // Item templat mesti lulus penilai selamat (aritmetik sahaja); item tulisan tangan dipercayai.
      const expected = evalCalc(q.calc!, q.sourceType === 'original-practice');
      const got = parseNumeric(q.options[q.correctAnswer!]);
      expect(got !== null && closeTo(got, expected), `${q.id}: skema=${got} pengiraan=${expected} | ${q.question}`).toBe(true);
      q.options.forEach((opt, i) => {
        if (i === q.correctAnswer) return;
        const v = parseNumeric(opt);
        if (v !== null) expect(closeTo(v, expected), `${q.id}: pengganggu "${opt}" sama nilai dengan jawapan`).toBe(false);
      });
    }
  });
});

describe('kilang soalan (templat deterministik)', () => {
  it('laporan jujur: tiada draf gagal semakan jawapan, dan angka sepadan dengan bank', () => {
    expect(report.templates).toBe(TEMPLATES.length);
    expect(report.failedAnswer).toBe(0);
    expect(report.failedSchema).toBe(0);
    expect(report.published).toBe(generated.length);
    expect(report.attempted).toBe(report.published + report.failedAnswer + report.failedDistractors + report.failedSchema + report.duplicates + report.rejectedByTemplate);
    // Lima templat ialah varian nombor bagi soalan tulisan tangan dan menyertai keluarga soalan itu.
    const adopted = new Set(generated.filter((q) => q.familyId !== q.templateId).map((q) => q.templateId));
    expect(adopted.size).toBeLessThanOrEqual(8);
    expect(report.families).toBe(new Set(generated.filter((q) => q.familyId === q.templateId).map((q) => q.familyId)).size);
    for (const q of generated.filter((x) => x.familyId !== x.templateId)) expect(MANUAL_BANK.some((m) => m.id === q.familyId && m.fingerprint === q.fingerprint), q.id).toBe(true);
  });

  it('setiap templat menghasilkan sekurang-kurangnya 8 varian unik', () => {
    for (const t of TEMPLATES) {
      const n = generated.filter((q) => q.templateId === t.id).length;
      expect(n, t.id).toBeGreaterThanOrEqual(8);
    }
  });

  it('id templat unik dan item mewarisi subjek/topik/aras', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const q of generated) {
      const t = TEMPLATES.find((x) => x.id === q.templateId)!;
      expect([q.section, q.topic, q.difficulty]).toEqual([t.section, t.topic, t.difficulty]);
      expect(q.validationStatus).toBe('auto_validated');
    }
  });

  it('deterministik, dan menambah varian tidak mengubah item sedia ada', () => {
    const a = buildBank(DEFAULT_VARIANTS).bank;
    const b = buildBank(DEFAULT_VARIANTS).bank;
    expect(a.map((q) => q.contentHash)).toEqual(b.map((q) => q.contentHash));
    const bigger = buildBank(DEFAULT_VARIANTS + 10);
    expect(bigger.bank.length).toBeGreaterThan(a.length);
    for (const q of a) expect(bigger.map.get(q.id)?.contentHash, q.id).toBe(q.contentHash);
  });

  it('aras ADVANCED_KBAT diwakili', () => {
    expect(BANK.filter((q) => q.difficulty === 'advanced').length).toBeGreaterThan(50);
  });
});

describe('semakan item luaran / AI (kuarantin)', () => {
  const base = { id: 'AI-test-1', familyId: 'AI-test-1', templateId: 'ai', section: 'matematik', topic: 'Peratus', subtopic: 'Peratus', difficulty: 'medium', question: 'Seorang pengembara menyimpan 37 peratus daripada 900 keping duit syiling purba. Berapa keping yang disimpannya?', options: ['333', '330', '337', '567'], correctAnswer: 0, explanation: '37% × 900 = 333 keping.', calc: '37/100*900' };

  it('item sah diterima tetapi SENTIASA dikuarantin dan tidak ditanda disemak manusia', () => {
    const r = vetExternalItem({ ...base, validationStatus: 'human_approved', verifiedByReviewer: true }, BANK);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.question.validationStatus).toBe('pending_review');
      expect(r.question.verifiedByReviewer).toBe(false);
      expect(r.question.sourceType).toBe('ai-generated');
      expect(eligible({ bank: ['matematik'] }, [r.question], NO_SEEN, 'item')).toHaveLength(0);
    }
  });

  it('skema jawapan yang salah ditolak oleh pengiraan bebas', () => {
    const r = vetExternalItem({ ...base, correctAnswer: 1 }, BANK);
    expect(r.ok).toBe(false);
  });

  it('pengganggu yang sama nilai dengan jawapan ditolak', () => {
    expect(vetExternalItem({ ...base, options: ['333', '333.0', '337', '567'] }, BANK).ok).toBe(false);
  });

  it('ungkapan calc yang bukan aritmetik ditolak (tiada kod dilaksanakan)', () => {
    const r = vetExternalItem({ ...base, calc: 'globalThis.process.exit(1)' }, BANK);
    expect(r.ok).toBe(false);
    expect(() => evalCalc('fetch("x")')).toThrow();
  });

  it('pendua teks dan pertindihan semantik dengan bank ditolak', () => {
    const existing = MANUAL_BANK[2];
    expect(vetExternalItem({ ...base, question: existing.question, options: existing.options, calc: undefined }, BANK).ok).toBe(false);
    const para = MANUAL_BANK.find((q) => q.id === 'MT004')!;
    expect(vetExternalItem({ ...base, question: para.question.replace('12480', '9600').replace('5 hari', '7 hari'), calc: undefined }, BANK).ok).toBe(false);
  });

  it('struktur tidak sah ditolak', () => {
    expect(vetExternalItem({ question: 'x' }, BANK).ok).toBe(false);
    expect(vetExternalItem({ ...base, options: ['1', '2', '3'] }, BANK).ok).toBe(false);
  });

  it('utiliti teks', () => {
    expect(fingerprint('Ali ada 5 epal dan 7 oren.')).toBe(fingerprint('Ali ada 12 epal dan 30 oren.'));
    expect(jaccard('Kucing itu makan ikan segar', 'Kucing itu makan ikan segar')).toBe(1);
    expect(jaccard('Kucing makan ikan', 'Bumi mengelilingi Matahari')).toBe(0);
    expect(parseNumeric('RM5.60')).toBe(5.6);
    expect(parseNumeric('1 3/8')).toBe(1.375);
    expect(parseNumeric('Hari ke-8')).toBe(8);
  });
});

describe('padanan bank dengan blueprint', () => {
  it('setiap komponen aktif mempunyai soalan mencukupi untuk sekurang-kurangnya 5 sesi baharu', () => {
    for (const mode of MODES) {
      for (const s of DEFAULT_CONFIGS[mode].sections.filter((x) => x.enabled && !repeatable(x))) {
        const pool = eligible(s, BANK, NO_SEEN, 'item');
        expect(pool.length, `${mode}/${s.id}`).toBeGreaterThanOrEqual(5 * (s.questionCount ?? 0));
      }
    }
  });

  it('semua topik seksyen STEM wujud dalam bank dan setiap topik STEM digunakan', () => {
    const topics = new Set(BANK.filter((q) => q.section === 'stem').map((q) => q.topic));
    for (const s of DEFAULT_CONFIGS.stem.sections) for (const t of s.topics ?? []) expect(topics.has(t), t).toBe(true);
    const covered = new Set(DEFAULT_CONFIGS.stem.sections.flatMap((s) => s.topics ?? []));
    for (const t of topics) expect(covered.has(t), `topik STEM "${t}" tidak digunakan`).toBe(true);
  });
});
