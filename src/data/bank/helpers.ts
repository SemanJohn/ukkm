import { hashString, mulberry32, shuffle } from '@/lib/engine';
import { contentHash, fingerprint } from '@/lib/text';
import type { BankSection, Difficulty, Figure, Question } from '@/lib/types';

/**
 * Format ringkas item: [topik, aras, soalan, [JAWAPAN BETUL, pengganggu, pengganggu, pengganggu], penjelasan, tambahan?]
 * Jawapan betul sentiasa ditulis dahulu; `build` merawakkan kedudukannya secara deterministik mengikut id.
 * Bagi item keperibadian, tiada jawapan betul dan penjelasan dibiarkan kosong.
 */
export type Raw = [
  topic: string,
  level: 'e' | 'm' | 'h' | 'a',
  question: string,
  options: [string, string, string, string],
  explanation: string,
  extra?: { calc?: string; figure?: Figure; subtopic?: string },
];

export const LEVEL: Record<Raw[1], Difficulty> = { e: 'easy', m: 'medium', h: 'hard', a: 'advanced' };

/** Bina item tulisan tangan. Setiap item ialah keluarga tersendiri (templat "manual"). */
export function build(section: BankSection, prefix: string, raws: Raw[]): Question[] {
  return raws.map((r, i) => {
    const id = `${prefix}${String(i + 1).padStart(3, '0')}`;
    const order = shuffle([0, 1, 2, 3], mulberry32(hashString(id)));
    const q: Question = {
      id,
      familyId: id,
      templateId: 'manual',
      contentHash: contentHash(r[2], r[3]),
      fingerprint: fingerprint(r[2]),
      section,
      topic: r[0],
      subtopic: r[5]?.subtopic ?? r[0],
      difficulty: LEVEL[r[1]],
      question: r[2],
      options: order.map((o) => r[3][o]),
      sourceType: 'original-practice',
      // auto_validated = pengiraan disahkan automatik; structure_only = belum ada semakan fakta/bahasa.
      validationStatus: r[5]?.calc ? 'auto_validated' : 'structure_only',
      verifiedByReviewer: false,
    };
    if (section !== 'keperibadian') {
      q.correctAnswer = order.indexOf(0);
      q.explanation = r[4];
    }
    if (r[5]?.calc) q.calc = r[5].calc;
    if (r[5]?.figure) q.figure = r[5].figure;
    return q;
  });
}
