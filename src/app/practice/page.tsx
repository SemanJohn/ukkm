'use client';

import { u } from '@/lib/base';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import type { BankBundle } from '@/data/bank';
import { getActiveSession, getCandidateName, getSeen, getWrongIds, loadBank, startPractice } from '@/lib/db';
import { eligible, PRACTICE_INFO, type Seen } from '@/lib/engine';
import { syncNow } from '@/lib/sync';
import { SUBJECT_LABEL, type BankSection, type PracticeKind } from '@/lib/types';

const KINDS: PracticeKind[] = ['subject', 'unlimited', 'kbat', 'speed', 'adaptive', 'revision'];
const SUBJECTS: BankSection[] = ['matematik', 'sains', 'stem', 'igcse', 'teknikal'];

export default function PracticePage() {
  const [bundle, setBundle] = useState<BankBundle | null>(null);
  const [candidate, setCandidate] = useState('');
  const [seen, setSeen] = useState<Seen | null>(null);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Partial<Record<PracticeKind, boolean>>>({});
  const [kind, setKind] = useState<PracticeKind>('subject');
  const [subjects, setSubjects] = useState<BankSection[]>(['matematik']);
  const [count, setCount] = useState(20);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.race([syncNow(), new Promise((r) => setTimeout(r, 4000))]);
      const b = await loadBank();
      const name = await getCandidateName();
      setCandidate(name);
      setSeen(await getSeen(name));
      setWrong(await getWrongIds(name, b.map));
      const act: Partial<Record<PracticeKind, boolean>> = {};
      for (const k of KINDS) act[k] = Boolean(await getActiveSession(k));
      setActive(act);
      setBundle(b);
    })().catch((e) => setError(String(e?.message ?? e)));
  }, []);

  if (!bundle || !seen) {
    return (
      <Shell title="Mod Latihan">
        {error ? (
          <p className="card text-red-800" role="alert">
            {error}
          </p>
        ) : (
          <p role="status">Memuatkan…</p>
        )}
      </Shell>
    );
  }

  const pool = (() => {
    let p = eligible({ bank: subjects }, bundle.bank, seen, kind === 'revision' ? 'off' : 'item');
    if (kind === 'kbat') p = p.filter((q) => q.difficulty === 'hard' || q.difficulty === 'advanced');
    if (kind === 'speed') p = p.filter((q) => q.difficulty === 'easy' || q.difficulty === 'medium');
    if (kind === 'revision') p = p.filter((q) => wrong.has(q.id));
    return p;
  })();
  const families = new Set(pool.map((q) => q.familyId)).size;
  const available = kind === 'revision' ? pool.length : families;

  const toggle = (s: BankSection) => setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const seed = (crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()) >>> 0;
      await startPractice({ kind, subjects, count }, bundle, candidate, seed, Date.now());
      window.location.href = u(`/exam/?mode=${kind}`);
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setBusy(false);
    }
  };

  return (
    <Shell title="Mod Latihan">
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Jenis latihan">
          {KINDS.map((k) => (
            <label key={k} className={`card cursor-pointer !p-4 ${kind === k ? 'border-blue-700 ring-2 ring-blue-700' : ''}`} data-testid={`kind-${k}`}>
              <input type="radio" name="kind" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
              <span className="block text-base font-bold">{PRACTICE_INFO[k].title}</span>
              <span className="mt-1 block text-sm text-slate-600">{PRACTICE_INFO[k].desc}</span>
              {active[k] && <span className="badge mt-2 bg-blue-100 text-blue-800">Sesi sedang berjalan</span>}
            </label>
          ))}
        </section>

        <section className="card">
          <h2 className="mb-3 text-lg font-bold">{PRACTICE_INFO[kind].title}</h2>
          {active[kind] ? (
            <p className="text-sm">
              Sesi {PRACTICE_INFO[kind].title} masih berjalan.{' '}
              <a className="btn btn-primary ml-2" href={u(`/exam/?mode=${kind}`)}>
                Sambung
              </a>
            </p>
          ) : (
            <>
              <fieldset>
                <legend className="text-sm font-medium">Subjek</legend>
                <div className="mt-2 flex flex-wrap gap-4">
                  {SUBJECTS.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-5 w-5" checked={subjects.includes(s)} onChange={() => toggle(s)} data-testid={`subject-${s}`} />
                      {SUBJECT_LABEL[s]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="mt-4 block text-sm font-medium">
                Bilangan soalan
                <select className="input mt-1 !w-32" value={count} onChange={(e) => setCount(Number(e.target.value))} data-testid="practice-count">
                  {[5, 10, 15, 20, 30, 40].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-3 text-sm" data-testid="practice-available">
                {kind === 'revision' ? (
                  <>
                    Soalan untuk diulang kaji: <strong>{available}</strong>
                  </>
                ) : (
                  <>
                    Soalan baharu tersedia: <strong>{families}</strong>
                  </>
                )}
              </p>
              {available < count && available > 0 && (
                <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">
                  Hanya {available} soalan tersedia; sesi akan mengandungi {available} soalan.
                </p>
              )}
              {available === 0 && (
                <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
                  {kind === 'revision' ? 'Tiada soalan salah untuk diulang kaji bagi subjek ini.' : 'Tiada soalan baharu untuk pilihan ini.'}
                </p>
              )}
              {error && (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}
              <button type="button" className="btn btn-primary mt-4" disabled={busy || subjects.length === 0 || available === 0} onClick={start} data-testid="start-practice">
                Mula latihan
              </button>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}
