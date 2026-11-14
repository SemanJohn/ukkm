import {
  applyExposureReset,
  getCandidateName,
  getExposureResetAt,
  getSession,
  getSetting,
  listBlueprintVersions,
  listExposures,
  listSessions,
  mergeBlueprints,
  mergeExposures,
  replaceExtraQuestions,
  saveSession,
  setSetting,
  type BlueprintVersion,
} from './db';
import { candidateKey } from './engine';
import { QuestionSchema, type Exposure, type Question, type Session } from './types';

export interface ServerHealth {
  ok: boolean;
  db: string;
  ai: boolean;
  tokenRequired: boolean;
}

export type SyncResult =
  | { ok: true; at: number; sessionsPulled: number; exposuresTotal: number; approvedQuestions: number }
  | { ok: false; reason: 'offline' | 'no-server' | 'unauthorized' | 'error'; message: string };

export async function authHeaders(): Promise<Record<string, string>> {
  const token = (await getSetting<string>('syncToken')) ?? '';
  return { 'Content-Type': 'application/json', ...(token ? { 'x-sync-token': token } : {}) };
}

export async function serverHealth(): Promise<ServerHealth | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    return (await res.json()) as ServerHealth;
  } catch {
    return null;
  }
}

/** Peraturan gabungan sesi (sama seperti pelayan): sesi dihantar tidak ditimpa; selain itu yang terkini menang. */
export function sessionWins(incoming: Session, current: Session | undefined): boolean {
  if (!current) return true;
  if (current.status === 'submitted') return false;
  return incoming.status === 'submitted' || (incoming.updatedAt ?? 0) > (current.updatedAt ?? 0);
}

/**
 * Penyelarasan dua hala dengan pelayan (PostgreSQL). Selamat dipanggil bila-bila masa: tanpa pelayan atau
 * tanpa Internet ia tidak mengubah apa-apa, dan data tempatan kekal sebagai sumber sementara.
 */
export async function syncNow(): Promise<SyncResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline', message: 'Tiada sambungan Internet.' };
  if (!(await serverHealth())) return { ok: false, reason: 'no-server', message: 'Pelayan penyelarasan tidak ditemui (mod tempatan sahaja).' };
  try {
    const name = await getCandidateName();
    const key = candidateKey(name);
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        candidate: { key, name },
        exposureResetAt: await getExposureResetAt(name),
        sessions: (await listSessions()).filter((s) => candidateKey(s.candidateName) === key),
        exposures: await listExposures(name),
        blueprints: await listBlueprintVersions(),
      }),
    });
    if (res.status === 401) return { ok: false, reason: 'unauthorized', message: 'Token penyelarasan tidak sah. Tetapkan di Admin.' };
    if (!res.ok) return { ok: false, reason: 'error', message: `Pelayan memulangkan ${res.status}.` };
    const data = (await res.json()) as { serverTime: number; exposureResetAt: number; sessions: Session[]; exposures: Exposure[]; blueprints: BlueprintVersion[]; questions: unknown[] };

    let pulled = 0;
    for (const s of data.sessions) {
      if (sessionWins(s, await getSession(s.id))) {
        await saveSession(s);
        pulled++;
      }
    }
    await applyExposureReset(name, data.exposureResetAt);
    await mergeExposures(data.exposures);
    await mergeBlueprints(data.blueprints);
    const approved = data.questions.flatMap((q) => {
      const p = QuestionSchema.safeParse(q);
      return p.success && p.data.validationStatus === 'human_approved' ? [p.data as Question] : [];
    });
    await replaceExtraQuestions(approved);
    await setSetting('lastSyncAt', data.serverTime);
    return { ok: true, at: data.serverTime, sessionsPulled: pulled, exposuresTotal: data.exposures.length, approvedQuestions: approved.length };
  } catch (e) {
    return { ok: false, reason: 'error', message: String((e as Error).message ?? e) };
  }
}
