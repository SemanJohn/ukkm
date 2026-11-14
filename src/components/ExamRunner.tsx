'use client';

import { u } from '@/lib/base';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BankBundle } from '@/data/bank';
import { nextAdaptive, saveSession } from '@/lib/db';
import { syncNow } from '@/lib/sync';
import { finishSection, formatClock, goTo, remainingMs, sectionProgress, setAnswer, tick, toggleFlag } from '@/lib/engine';
import type { Session } from '@/lib/types';
import Calculator from './Calculator';
import Figure from './Figure';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function ExamRunner({ initial, bundle }: { initial: Session; bundle: BankBundle }) {
  const [s, setS] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [dialogFor, setDialogFor] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    initial.shortfall.length && initial.questionIndex === 0 && initial.sectionIndex === 0
      ? `Soalan baharu tidak mencukupi: ${initial.shortfall.map((x) => `${x.title} ${x.got}/${x.wanted}`).join('; ')}. Sesi ini dipendekkan — tiada soalan diulang.`
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const ref = useRef(s);
  const dialogRef = useRef<HTMLDivElement>(null);

  const commit = useCallback((next: Session) => {
    if (next === ref.current) return;
    ref.current = next;
    setS(next);
    setSaveState('saving');
    saveSession(next).then(
      () => setSaveState('saved'),
      () => setSaveState('error'),
    );
  }, []);

  // Pemasa: sentiasa dikira daripada masa sebenar (Date.now()), bukan bilangan detik.
  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const before = ref.current;
      const after = tick(before, n);
      if (after !== before) {
        if (after.status === 'active') {
          setNotice(`Masa bagi seksyen “${before.sections[before.sectionIndex].title}” telah tamat. Seksyen seterusnya telah bermula.`);
          setDialogFor(null);
        }
        commit(after);
      }
    }, 250);
    return () => clearInterval(id);
  }, [commit]);

  // Selepas dihantar: simpan, kemudian ke halaman keputusan.
  useEffect(() => {
    if (s.status !== 'submitted') return;
    let cancelled = false;
    Promise.race([saveSession(s).then(() => syncNow()), new Promise((r) => setTimeout(r, 4000))]).finally(() => {
      if (!cancelled) window.location.replace(u(`/results/?id=${encodeURIComponent(s.id)}`));
    });
    return () => {
      cancelled = true;
    };
  }, [s]);

  useEffect(() => {
    const onFs = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (dialogFor !== null) dialogRef.current?.focus();
  }, [dialogFor]);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (s.status === 'submitted') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold" role="status">
          {s.autoSubmitted ? 'Masa tamat. Jawapan dihantar secara automatik…' : 'Jawapan dihantar. Memuatkan keputusan…'}
        </p>
      </div>
    );
  }

  const sec = s.sections[s.sectionIndex];
  const item = sec.items[s.questionIndex];
  const q = bundle.map.get(item.qid)!;
  const chosen = s.answers[item.qid];
  const remaining = remainingMs(s, now);
  const lowTime = remaining !== null && remaining <= 5 * 60 * 1000;
  const prog = sectionProgress(s);
  const isLastSection = s.sectionIndex === s.sections.length - 1;
  const isLastQuestion = s.questionIndex === sec.items.length - 1;
  const canGrow = Boolean(s.adaptive) && isLastQuestion && sec.items.length < (s.adaptive?.target ?? 0);
  const totalQuestions = s.adaptive ? s.adaptive.target : sec.items.length;

  const growAdaptive = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await nextAdaptive(ref.current, bundle);
      if (!next) setNotice('Tiada lagi soalan baharu untuk latihan adaptif ini. Hantar sesi untuk melihat keputusan.');
      else if (next !== ref.current) {
        ref.current = next;
        setS(next);
      }
    } finally {
      setBusy(false);
    }
  };
  const finishLabel = isLastSection ? 'Hantar peperiksaan' : 'Tamatkan seksyen';

  const confirmFinish = () => {
    // Perlindungan penghantaran berganda: hanya sah jika seksyen masih sama seperti semasa dialog dibuka.
    if (dialogFor === null || ref.current.status !== 'active' || ref.current.sectionIndex !== dialogFor) {
      setDialogFor(null);
      return;
    }
    setDialogFor(null);
    setNotice(null);
    commit(finishSection(ref.current, Date.now()));
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-300 bg-blue-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" data-testid="candidate-name">
              {s.candidateName}
            </p>
            <p className="truncate text-xs text-blue-200">
              {s.title} · {s.presetLabel}
            </p>
          </div>
          <p className="text-sm" data-testid="section-label">
            Seksyen {s.sectionIndex + 1}/{s.sections.length}: <strong>{sec.title}</strong>
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-blue-200" role="status" data-testid="save-state">
              {saveState === 'saved' ? 'Disimpan' : saveState === 'saving' ? 'Menyimpan…' : 'Gagal simpan!'}
            </span>
            <div
              className={`rounded-lg px-3 py-1 font-mono text-xl font-bold tabular-nums ${lowTime ? 'bg-red-600' : 'bg-blue-950'}`}
              role="timer"
              aria-label="Baki masa seksyen"
              data-testid="timer"
            >
              {remaining === null ? '—' : formatClock(remaining)}
            </div>
          </div>
        </div>
      </header>

      {notice && (
        <div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900" role="alert">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <span>{notice}</span>
            <button type="button" className="font-semibold underline" onClick={() => setNotice(null)}>
              Tutup
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="card" aria-labelledby="q-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h1 id="q-heading" className="text-sm font-bold uppercase tracking-wide text-slate-600" data-testid="question-number">
              Soalan {s.questionIndex + 1} daripada {totalQuestions}
            </h1>
            {s.flags[item.qid] && <span className="badge bg-amber-100 text-amber-800">Ditanda untuk semakan</span>}
          </div>
          <p className="whitespace-pre-line text-lg leading-relaxed" data-testid="question-text">
            {q.question}
          </p>
          {q.figure && <Figure figure={q.figure} />}
          <fieldset className="mt-5">
            <legend className="sr-only">Pilihan jawapan</legend>
            <div className="space-y-2.5">
              {item.order.map((orig, pos) => {
                const selected = chosen === orig;
                return (
                  <label
                    key={orig}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 text-base transition ${
                      selected ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                    data-testid={`option-${LETTERS[pos]}`}
                  >
                    <input
                      type="radio"
                      name={`q-${item.qid}`}
                      className="sr-only"
                      checked={selected}
                      onChange={() => commit(setAnswer(ref.current, item.qid, orig))}
                    />
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                        selected ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-400 text-slate-700'
                      }`}
                      aria-hidden
                    >
                      {LETTERS[pos]}
                    </span>
                    <span>
                      <span className="sr-only">{LETTERS[pos]}. </span>
                      {q.options[orig]}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {!sec.scored && <p className="mt-4 text-sm text-slate-600">Seksyen ini tiada jawapan betul atau salah. Pilih respons yang paling menggambarkan diri anda.</p>}
        </main>

        <aside className="card h-fit" aria-label="Navigasi soalan">
          <h2 className="mb-2 text-sm font-bold text-slate-700">Navigasi soalan</h2>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
            {sec.items.map((it, idx) => {
              const answered = s.answers[it.qid] !== undefined;
              const flagged = Boolean(s.flags[it.qid]);
              const current = idx === s.questionIndex;
              const blocked = !s.allowBack && idx < s.questionIndex;
              return (
                <button
                  key={it.qid}
                  type="button"
                  disabled={blocked}
                  onClick={() => commit(goTo(ref.current, idx))}
                  aria-current={current ? 'true' : undefined}
                  aria-label={`Soalan ${idx + 1}: ${answered ? 'dijawab' : 'belum dijawab'}${flagged ? ', ditanda untuk semakan' : ''}`}
                  data-testid={`nav-${idx + 1}`}
                  data-state={flagged ? 'flagged' : answered ? 'answered' : 'unanswered'}
                  className={`relative flex h-10 items-center justify-center rounded-md border-2 text-sm font-semibold disabled:opacity-40 ${
                    answered ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700'
                  } ${current ? 'ring-2 ring-blue-700 ring-offset-2' : ''}`}
                >
                  {idx + 1}
                  {flagged && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-white bg-amber-500" aria-hidden />}
                </button>
              );
            })}
          </div>
          <ul className="mt-4 space-y-1 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-emerald-600" aria-hidden /> Dijawab: <strong data-testid="count-answered">{prog.answered}</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm border-2 border-slate-300 bg-white" aria-hidden /> Belum dijawab: <strong data-testid="count-unanswered">{prog.unanswered}</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-amber-500" aria-hidden /> Ditanda untuk semakan: <strong data-testid="count-flagged">{prog.flagged}</strong>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn !min-h-[36px] text-xs" onClick={toggleFull}>
              {isFull ? 'Keluar skrin penuh' : 'Skrin penuh'}
            </button>
            {s.allowCalculator && (
              <button type="button" className="btn !min-h-[36px] text-xs" onClick={() => setShowCalc((v) => !v)} aria-expanded={showCalc}>
                Kalkulator
              </button>
            )}
          </div>
          {s.allowCalculator && showCalc && (
            <div className="mt-3">
              <Calculator />
            </div>
          )}
        </aside>
      </div>

      <footer className="sticky bottom-0 z-10 border-t border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <div className="flex gap-2">
            <button type="button" className="btn" disabled={s.questionIndex === 0 || !s.allowBack} onClick={() => commit(goTo(ref.current, ref.current.questionIndex - 1))}>
              ← Sebelumnya
            </button>
            <button
              type="button"
              className="btn"
              disabled={canGrow ? chosen === undefined || busy : isLastQuestion}
              onClick={() => (canGrow ? growAdaptive() : commit(goTo(ref.current, ref.current.questionIndex + 1)))}
              data-testid="next-button"
            >
              Seterusnya →
            </button>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn" aria-pressed={Boolean(s.flags[item.qid])} onClick={() => commit(toggleFlag(ref.current, item.qid))}>
              {s.flags[item.qid] ? 'Buang tanda' : 'Tandakan untuk semakan'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setDialogFor(s.sectionIndex)} data-testid="finish-button">
              {finishLabel}
            </button>
          </div>
        </div>
      </footer>

      {dialogFor !== null && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 p-4">
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-title"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onKeyDown={(e) => e.key === 'Escape' && setDialogFor(null)}
          >
            <h2 id="finish-title" className="text-lg font-bold">
              {isLastSection ? 'Hantar peperiksaan?' : `Tamatkan seksyen “${sec.title}”?`}
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <dt>Dijawab</dt>
              <dd className="text-right font-semibold">{prog.answered}</dd>
              <dt>Belum dijawab</dt>
              <dd className={`text-right font-semibold ${prog.unanswered ? 'text-red-700' : ''}`} data-testid="dialog-unanswered">
                {prog.unanswered}
              </dd>
              <dt>Ditanda untuk semakan</dt>
              <dd className="text-right font-semibold">{prog.flagged}</dd>
            </dl>
            {prog.unanswered > 0 && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
                Masih ada {prog.unanswered} soalan yang belum dijawab dalam seksyen ini.
              </p>
            )}
            <p className="mt-3 text-sm text-slate-600">
              {isLastSection
                ? 'Selepas dihantar, jawapan dikunci dan tidak boleh diubah.'
                : 'Selepas seksyen ditamatkan, anda tidak boleh kembali ke seksyen ini. Baki masa seksyen ini tidak dibawa ke seksyen seterusnya.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setDialogFor(null)}>
                Kembali menyemak
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmFinish} data-testid="confirm-finish">
                {isLastSection ? 'Ya, hantar' : 'Ya, tamatkan seksyen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
