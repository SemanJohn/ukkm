// Skema Drizzle (PostgreSQL). Digunakan dengan PostgreSQL sebenar (DATABASE_URL) atau PGlite terbenam.
import { bigint, jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

export const candidates = pgTable('candidates', {
  id: text('id').primaryKey(), // nama dinormalkan
  name: text('name').notNull(),
  exposureResetAt: bigint('exposure_reset_at', { mode: 'number' }).notNull().default(0),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull(),
  status: text('status').notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  data: jsonb('data').notNull(),
});

/** Sejarah soalan yang pernah dipaparkan — teras enjin tanpa pengulangan merentas peranti. */
export const exposures = pgTable(
  'exposures',
  {
    candidateId: text('candidate_id').notNull(),
    questionId: text('question_id').notNull(),
    familyId: text('family_id').notNull(),
    sessionId: text('session_id').notNull(),
    shownAt: bigint('shown_at', { mode: 'number' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.candidateId, t.questionId] })],
);

/** Item yang dijana AI / diimport. `pending_review` = kuarantin; hanya `human_approved` dihantar ke klien. */
export const questions = pgTable('questions', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  contentHash: text('content_hash').notNull(),
  fingerprint: text('fingerprint').notNull(),
  data: jsonb('data').notNull(),
  audit: jsonb('audit').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  reviewedAt: bigint('reviewed_at', { mode: 'number' }),
  reviewer: text('reviewer'),
});

/** Versi blueprint dan log perubahan. */
export const blueprints = pgTable('blueprints', {
  key: text('key').primaryKey(),
  mode: text('mode').notNull(),
  savedAt: bigint('saved_at', { mode: 'number' }).notNull(),
  data: jsonb('data').notNull(),
});

export const DDL = `
CREATE TABLE IF NOT EXISTS candidates (id text PRIMARY KEY, name text NOT NULL, exposure_reset_at bigint NOT NULL DEFAULT 0, updated_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY, candidate_id text NOT NULL, status text NOT NULL, updated_at bigint NOT NULL, data jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_candidate ON sessions (candidate_id);
CREATE TABLE IF NOT EXISTS exposures (candidate_id text NOT NULL, question_id text NOT NULL, family_id text NOT NULL, session_id text NOT NULL, shown_at bigint NOT NULL, PRIMARY KEY (candidate_id, question_id));
CREATE TABLE IF NOT EXISTS questions (id text PRIMARY KEY, status text NOT NULL, content_hash text NOT NULL, fingerprint text NOT NULL, data jsonb NOT NULL, audit jsonb NOT NULL, created_at bigint NOT NULL, reviewed_at bigint, reviewer text);
CREATE UNIQUE INDEX IF NOT EXISTS questions_hash ON questions (content_hash);
CREATE TABLE IF NOT EXISTS blueprints (key text PRIMARY KEY, mode text NOT NULL, saved_at bigint NOT NULL, data jsonb NOT NULL);
`;
