import { z } from 'zod';

/** Hanya OFFICIAL_2027_VERIFIED boleh dilabel sebagai format rasmi 2027. */
export const VerificationStatusSchema = z.enum(['OFFICIAL_2027_VERIFIED', 'PREVIOUS_YEAR_REFERENCE', 'UNVERIFIED_PRACTICE']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const DifficultySchema = z.enum(['easy', 'medium', 'hard', 'advanced']);
export type Difficulty = z.infer<typeof DifficultySchema>;
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'advanced'];

export const BankSectionSchema = z.enum(['matematik', 'sains', 'bm', 'stem', 'keperibadian']);
export type BankSection = z.infer<typeof BankSectionSchema>;

/**
 * auto_validated  — jawapan disahkan oleh pengiraan bebas automatik (bukan semakan manusia)
 * structure_only  — hanya semakan struktur/pendua automatik; fakta & bahasa belum disemak
 * pending_review  — dikuarantin; tidak digunakan dalam sesi
 * human_approved  — diluluskan oleh penyemak manusia melalui halaman Admin
 * rejected        — ditolak
 */
export const ValidationStatusSchema = z.enum(['auto_validated', 'structure_only', 'pending_review', 'human_approved', 'rejected']);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;
export const USABLE_STATUSES: ValidationStatus[] = ['auto_validated', 'structure_only', 'human_approved'];

export const FigureSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('table'), caption: z.string().optional(), headers: z.array(z.string()).min(1), rows: z.array(z.array(z.string())).min(1) }),
  z.object({ type: z.literal('bar'), caption: z.string().optional(), labels: z.array(z.string()).min(2), values: z.array(z.number()).min(2), yLabel: z.string().optional() }),
  z.object({ type: z.literal('line'), caption: z.string().optional(), labels: z.array(z.string()).min(2), values: z.array(z.number()).min(2), yLabel: z.string().optional() }),
  z.object({ type: z.literal('pie'), caption: z.string().optional(), labels: z.array(z.string()).min(2), values: z.array(z.number()).min(2) }),
]);
export type Figure = z.infer<typeof FigureSchema>;

export const QuestionSchema = z
  .object({
    id: z.string().min(3),
    /** Keluarga masalah: item daripada templat yang sama (nombor berbeza) berkongsi keluarga. */
    familyId: z.string().min(1),
    templateId: z.string().min(1),
    contentHash: z.string().min(8),
    /** Cap jari semantik: teks dinormalkan dengan nombor dibuang — sama bagi soalan yang hanya berbeza nombor. */
    fingerprint: z.string().min(8),
    section: BankSectionSchema,
    topic: z.string().min(2),
    subtopic: z.string().min(2),
    difficulty: DifficultySchema,
    question: z.string().min(10),
    options: z.array(z.string().min(1)).length(4),
    /** Indeks (0–3) pilihan yang betul. Tiada bagi item keperibadian. */
    correctAnswer: z.number().int().min(0).max(3).optional(),
    explanation: z.string().optional(),
    /** Ungkapan aritmetik bebas untuk mengesahkan jawapan berangka. */
    calc: z.string().optional(),
    figure: FigureSchema.optional(),
    sourceType: z.enum(['original-practice', 'template-generated', 'ai-generated']),
    validationStatus: ValidationStatusSchema,
    verifiedByReviewer: z.boolean(),
  })
  .superRefine((q, ctx) => {
    if (q.section === 'keperibadian') {
      if (q.correctAnswer !== undefined) ctx.addIssue({ code: 'custom', message: 'Item keperibadian tidak boleh ada jawapan betul' });
    } else {
      if (q.correctAnswer === undefined) ctx.addIssue({ code: 'custom', message: 'Item akademik perlu correctAnswer' });
      if (!q.explanation || q.explanation.length < 5) ctx.addIssue({ code: 'custom', message: 'Item akademik perlu penjelasan' });
    }
    if (q.verifiedByReviewer !== (q.validationStatus === 'human_approved')) {
      ctx.addIssue({ code: 'custom', message: 'verifiedByReviewer hanya benar bagi item human_approved' });
    }
  });
export type Question = z.infer<typeof QuestionSchema>;

export const DifficultyMixSchema = z.object({
  easy: z.number().min(0).max(100),
  medium: z.number().min(0).max(100),
  hard: z.number().min(0).max(100),
  advanced: z.number().min(0).max(100),
});
export type DifficultyMix = z.infer<typeof DifficultyMixSchema>;

export const ExamSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  enabled: z.boolean(),
  bank: z.array(BankSectionSchema).min(1),
  topics: z.array(z.string()).optional(),
  questionCount: z.number().int().min(1).max(150).nullable(),
  durationMinutes: z.number().min(1).max(300).nullable(),
  difficulty: DifficultyMixSchema,
  scored: z.boolean(),
  verificationStatus: VerificationStatusSchema,
  sourceUrl: z.string().optional(),
  note: z.string().optional(),
});
export type ExamSection = z.infer<typeof ExamSectionSchema>;

export const ModeSchema = z.enum(['ukkm', 'stem', 'full']);
export type Mode = z.infer<typeof ModeSchema>;

/** off = pengulangan dibenarkan; item = tiada soalan yang pernah dipaparkan; family = tiada keluarga masalah yang pernah digunakan. */
export const NoRepeatSchema = z.enum(['off', 'item', 'family']);
export type NoRepeat = z.infer<typeof NoRepeatSchema>;

export const ExamConfigSchema = z.object({
  id: ModeSchema,
  name: z.string(),
  year: z.literal(2027),
  programme: z.literal('Premier STEM-Excellence'),
  candidateCategory: z.literal('KPM_SELEPAS_PKSK'),
  formatStatus: VerificationStatusSchema,
  description: z.string(),
  sections: z.array(ExamSectionSchema).min(1),
  allowBackNavigation: z.boolean().nullable(),
  allowCalculator: z.boolean().nullable(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  noRepeat: NoRepeatSchema,
});
export type ExamConfig = z.infer<typeof ExamConfigSchema>;

export type PracticeKind = 'subject' | 'kbat' | 'speed' | 'revision' | 'unlimited' | 'adaptive';
export type SessionMode = Mode | PracticeKind;

export interface SessionItem {
  qid: string;
  /** order[kedudukanPaparan] = indeks pilihan asal */
  order: number[];
}

export interface SessionSection {
  id: string;
  title: string;
  durationSec: number | null;
  scored: boolean;
  items: SessionItem[];
  usedSec: number | null;
}

export interface Shortfall {
  title: string;
  wanted: number;
  got: number;
}

export interface Session {
  id: string;
  mode: SessionMode;
  title: string;
  presetLabel: string;
  candidateName: string;
  seed: number;
  status: 'active' | 'submitted';
  sections: SessionSection[];
  sectionIndex: number;
  questionIndex: number;
  sectionStartedAt: number;
  startedAt: number;
  submittedAt: number | null;
  updatedAt: number;
  autoSubmitted: boolean;
  /** qid → indeks pilihan asal */
  answers: Record<string, number>;
  flags: Record<string, boolean>;
  allowBack: boolean;
  allowCalculator: boolean;
  noRepeat: NoRepeat;
  shortfall: Shortfall[];
  blueprintVersion?: number;
  /** Mod adaptif: soalan ditambah satu demi satu mengikut prestasi. */
  adaptive?: { target: number; level: number; bank: BankSection[] };
}

export interface Exposure {
  candidate: string;
  qid: string;
  familyId: string;
  sessionId: string;
  at: number;
}

export interface Tally {
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  percent: number;
}

export interface SectionResult extends Tally {
  id: string;
  title: string;
  scored: boolean;
  usedSec: number;
  durationSec: number | null;
}

export interface ReviewItem {
  qid: string;
  sectionTitle: string;
  number: number;
  status: 'correct' | 'wrong' | 'unanswered' | 'unscored';
  chosen: number | null;
}

export interface ExamResult extends Tally {
  timeUsedSec: number;
  sections: SectionResult[];
  bySubject: (Tally & { subject: BankSection })[];
  byTopic: (Tally & { group: string; topic: string })[];
  byDifficulty: (Tally & { difficulty: Difficulty })[];
  review: ReviewItem[];
  weakTopics: string[];
  suggestions: string[];
}

export const DIFF_LABEL: Record<Difficulty, string> = { easy: 'Mudah', medium: 'Sederhana', hard: 'Sukar', advanced: 'KBAT lanjutan' };
export const SUBJECT_LABEL: Record<BankSection, string> = { matematik: 'Matematik', sains: 'Sains', bm: 'Bahasa Melayu', stem: 'STEM-Excellence', keperibadian: 'Keperibadian' };
