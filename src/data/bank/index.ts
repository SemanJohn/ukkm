import { runFactory, type FactoryReport } from '@/lib/factory';
import type { Question } from '@/lib/types';
import { TEMPLATES } from '../templates';
import { bmBank } from './bm';
import { build } from './helpers';
import { mathBank } from './math';
import { personalityBank } from './personality';
import { scienceBank } from './science';
import { stemRaws1 } from './stem1';
import { stemRaws2 } from './stem2';

export const stemBank = build('stem', 'ST', [...stemRaws1, ...stemRaws2]);

/** 500 item tulisan tangan: 120 Matematik + 120 Sains + 80 BM + 150 STEM + 30 Keperibadian. */
export const MANUAL_BANK: Question[] = [...mathBank, ...scienceBank, ...bmBank, ...stemBank, ...personalityBank];

export const DEFAULT_VARIANTS = 20;
export const MAX_VARIANTS = 60;

export interface BankBundle {
  bank: Question[];
  map: Map<string, Question>;
  report: FactoryReport;
  variants: number;
}

const cache = new Map<number, { questions: Question[]; report: FactoryReport }>();

/**
 * Bank penuh = item tulisan tangan + item templat (dijana secara deterministik, id stabil merentas peranti)
 * + item tambahan (cth. item AI yang telah diluluskan penyemak manusia dan diselaraskan dari pelayan).
 */
export function buildBank(variants = DEFAULT_VARIANTS, extra: Question[] = []): BankBundle {
  const v = Math.max(0, Math.min(MAX_VARIANTS, Math.floor(variants)));
  if (!cache.has(v)) cache.set(v, runFactory(TEMPLATES, v, MANUAL_BANK));
  const gen = cache.get(v)!;
  const bank = [...MANUAL_BANK, ...gen.questions];
  const map = new Map(bank.map((q) => [q.id, q]));
  const hashes = new Set(bank.map((q) => q.contentHash));
  for (const q of extra) {
    if (map.has(q.id) || hashes.has(q.contentHash)) continue;
    bank.push(q);
    map.set(q.id, q);
    hashes.add(q.contentHash);
  }
  return { bank, map, report: gen.report, variants: v };
}

const def = buildBank();
export const BANK: Question[] = def.bank;
export const BANK_MAP: Map<string, Question> = def.map;
