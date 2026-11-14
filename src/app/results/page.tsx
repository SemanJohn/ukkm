'use client';

import { u } from '@/lib/base';
import { useEffect, useMemo, useState } from 'react';
import Figure from '@/components/Figure';
import Shell from '@/components/Shell';
import type { BankBundle } from '@/data/bank';
import { getSession, loadBank } from '@/lib/db';
import { formatDuration, scoreSession } from '@/lib/engine';
import { exportReportPdf } from '@/lib/pdf';
import { DIFF_LABEL as DIFF, SUBJECT_LABEL, type Question, type ReviewItem, type Session } from '@/lib/types';

const LETTERS = ['A', 'B', 'C', 'D'];
const STATUS_LABEL: Record<ReviewItem['status'], string> = { correct: 'Betul', wrong: 'Salah', unanswered: 'Tidak dijawab', unscored: 'Tidak dimarkah' };
const STATUS_STYLE: Record<ReviewItem['status'], string> = {
  correct: 'bg-emerald-100 text-emerald-800',
  wrong: 'bg-red-100 text-red-800',
  unanswered: 'bg-slate-200 text-slate-700',
  unscored: 'bg-blue-100 text-blue-800',
};
type Filter = 'revise' | 'all' | ReviewItem['status'];

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-2.5 w-full min-w-[80px] rounded-full bg-slate-200" aria-hidden>
      <div className={`h-2.5 rounded-full ${percent >= 80 ? 'bg-emerald-600' : percent >= 60 ? 'bg-amber-500' : 'bg-red-600'}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function ResultsPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>('revise');
  const [bundle, setBundle] = useState<BankBundle | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    loadBank().then(setBundle);
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      setSession(null);
      return;
    }
    getSession(id).then((s) => setSession(s ?? null), () => setSession(null));
  }, []);

  const result = useMemo(() => (session && bundle && session.status === 'submitted' ? scoreSession(session, bundle.map) : null), [session, bundle]);
  const BANK_MAP: Map<string, Question> = bundle?.map ?? new Map();

  if (session === undefined || !bundle) {
    return (
      <Shell title="Keputusan">
        <p role="status">Memuatkan…</p>
      </Shell>
    );
  }
  if (!session) {
    return (
      <Shell title="Keputusan">
        <p className="card">Sesi tidak ditemui. Lihat <a className="underline" href={u('/history/')}>sejarah percubaan</a>.</p>
      </Shell>
    );
  }
  if (!result) {
    return (
      <Shell title="Keputusan">
        <p className="card">
          Sesi ini belum dihantar. Keputusan dan penjelasan hanya dipaparkan selepas penghantaran.{' '}
          <a className="font-semibold underline" href={u(`/exam/?mode=${session.mode}`)}>
            Sambung peperiksaan
          </a>
        </p>
      </Shell>
    );
  }

  const items = result.review.filter((r) => (filter === 'all' ? true : filter === 'revise' ? r.status === 'wrong' || r.status === 'unanswered' : r.status === filter));
  const sectionOf = new Map(session.sections.flatMap((sec) => sec.items.map((it) => [it.qid, it] as const)));

  const pdf = async () => {
    setPdfBusy(true);
    setPdfError('');
    try {
      await exportReportPdf(session, result, BANK_MAP);
    } catch (e) {
      setPdfError(`Gagal menjana PDF: ${(e as Error).message}`);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <Shell title="Keputusan latihan">
      <div className="space-y-6">
        <section className="card border-amber-300 bg-amber-50 text-sm text-amber-900">
          Markah ini ialah markah latihan bagi simulasi tidak rasmi. Ia <strong>bukan</strong> skor merit MARA dan tidak menunjukkan peluang diterima ke MRSM.
        </section>

        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-600">{session.candidateName}</p>
              <h2 className="text-lg font-bold">{session.title}</h2>
              <p className="text-xs text-slate-600">
                {session.presetLabel} · dihantar {session.submittedAt ? new Date(session.submittedAt).toLocaleString('ms-MY') : ''}
                {session.autoSubmitted ? ' · dihantar automatik (masa tamat)' : ''}
              </p>
            </div>
            <div className="no-print flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={pdf} disabled={pdfBusy} data-testid="export-pdf">
                {pdfBusy ? 'Menjana PDF…' : 'Eksport laporan PDF'}
              </button>
              <a className="btn" href={u('/practice/')}>
                Mod Latihan
              </a>
              <a className="btn" href={u('/history/')}>
                Sejarah percubaan
              </a>
              <a className="btn" href={u('/')}>
                Halaman utama
              </a>
            </div>
          </div>
          {pdfError && (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {pdfError}
            </p>
          )}
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Markah latihan', `${result.percent}%`, 'score-percent'],
              ['Betul', `${result.correct}/${result.total}`, 'score-correct'],
              ['Salah', String(result.wrong), 'score-wrong'],
              ['Tidak dijawab', String(result.unanswered), 'score-unanswered'],
              ['Masa digunakan', formatDuration(result.timeUsedSec), 'score-time'],
            ].map(([label, value, tid]) => (
              <div key={label} className="rounded-lg bg-slate-100 p-3">
                <dt className="text-xs text-slate-600">{label}</dt>
                <dd className="text-xl font-bold" data-testid={tid}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Markah setiap seksyen</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Seksyen', 'Betul', 'Salah', 'Tidak dijawab', 'Markah', '', 'Masa digunakan'].map((h, i) => (
                    <th key={i} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.sections.map((s) => (
                  <tr key={s.id}>
                    <td className="td font-medium">{s.title}</td>
                    <td className="td">{s.scored ? s.correct : '—'}</td>
                    <td className="td">{s.scored ? s.wrong : '—'}</td>
                    <td className="td">{s.unanswered}</td>
                    <td className="td">{s.scored ? `${s.correct}/${s.total} (${s.percent}%)` : `Tidak dimarkah (${s.total - s.unanswered}/${s.total} dijawab)`}</td>
                    <td className="td w-32">{s.scored && <Bar percent={s.percent} />}</td>
                    <td className="td">
                      {formatDuration(s.usedSec)}
                      {s.durationSec ? ` / ${Math.round(s.durationSec / 60)} min` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {result.bySubject.length > 0 && (
          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Markah mengikut subjek</h2>
            <table className="w-full border-collapse">
              <tbody>
                {result.bySubject.map((t) => (
                  <tr key={t.subject}>
                    <td className="td font-medium">{SUBJECT_LABEL[t.subject]}</td>
                    <td className="td">
                      {t.correct}/{t.total} ({t.percent}%)
                    </td>
                    <td className="td w-40">
                      <Bar percent={t.percent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm" data-testid="weak-topics">
              <strong>Topik lemah:</strong> {result.weakTopics.length ? result.weakTopics.join(', ') : 'tiada topik di bawah 60% (dengan sekurang-kurangnya 2 soalan).'}
            </p>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Prestasi mengikut aras kesukaran</h2>
            {result.byDifficulty.length === 0 ? (
              <p className="text-sm text-slate-600">Tiada soalan bermarkah.</p>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {result.byDifficulty.map((d) => (
                    <tr key={d.difficulty}>
                      <td className="td font-medium">{DIFF[d.difficulty]}</td>
                      <td className="td">
                        {d.correct}/{d.total} ({d.percent}%)
                      </td>
                      <td className="td w-40">
                        <Bar percent={d.percent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Cadangan latihan seterusnya</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm" data-testid="suggestions">
              {result.suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Prestasi mengikut topik</h2>
          {result.byTopic.length === 0 ? (
            <p className="text-sm text-slate-600">Tiada soalan bermarkah.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Seksyen', 'Topik', 'Betul', 'Markah', ''].map((h, i) => (
                      <th key={i} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.byTopic.map((t) => (
                    <tr key={t.group + t.topic}>
                      <td className="td">{t.group}</td>
                      <td className="td font-medium">{t.topic}</td>
                      <td className="td">
                        {t.correct}/{t.total}
                      </td>
                      <td className="td">{t.percent}%</td>
                      <td className="td w-40">
                        <Bar percent={t.percent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Semakan soalan dan penjelasan</h2>
            <label className="no-print flex items-center gap-2 text-sm">
              Tunjuk:
              <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} data-testid="review-filter">
                <option value="revise">Perlu diulang kaji (salah / tidak dijawab)</option>
                <option value="all">Semua soalan</option>
                <option value="correct">Betul</option>
                <option value="wrong">Salah</option>
                <option value="unanswered">Tidak dijawab</option>
                <option value="unscored">Keperibadian (tidak dimarkah)</option>
              </select>
            </label>
          </div>
          {items.length === 0 && <p className="text-sm text-slate-600">Tiada soalan dalam kategori ini.</p>}
          <ol className="space-y-4">
            {items.map((r) => {
              const q = BANK_MAP.get(r.qid);
              const order = sectionOf.get(r.qid)?.order ?? [0, 1, 2, 3];
              if (!q) return null;
              return (
                <li key={r.qid} className="rounded-lg border border-slate-200 p-4" data-testid="review-item">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className={`badge ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    <span>
                      {r.sectionTitle} · Soalan {r.number} · {q.topic}
                      {q.section !== 'keperibadian' ? ` · ${DIFF[q.difficulty]}` : ''} · {q.id}
                    </span>
                  </div>
                  <p className="whitespace-pre-line">{q.question}</p>
                  {q.figure && <Figure figure={q.figure} />}
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {order.map((orig, pos) => {
                      const isCorrect = q.correctAnswer === orig;
                      const isChosen = r.chosen === orig;
                      return (
                        <li
                          key={orig}
                          className={`rounded-md border px-3 py-1.5 ${
                            isCorrect ? 'border-emerald-500 bg-emerald-50' : isChosen && r.status === 'wrong' ? 'border-red-400 bg-red-50' : isChosen ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                          }`}
                        >
                          <strong>{LETTERS[pos]}.</strong> {q.options[orig]}
                          {isCorrect && <span className="ml-2 font-semibold text-emerald-700">✓ Jawapan betul</span>}
                          {isChosen && <span className="ml-2 font-semibold text-slate-700">← Pilihan anda</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {q.explanation && (
                    <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm">
                      <strong>Penjelasan:</strong> {q.explanation}
                    </p>
                  )}
                  {q.section === 'keperibadian' && <p className="mt-3 text-sm text-slate-600">Item keperibadian tiada jawapan betul atau salah dan tidak dimarkah.</p>}
                  {!q.verifiedByReviewer && q.section !== 'keperibadian' && (
                    <p className="mt-2 text-xs text-slate-500">{q.validationStatus === 'auto_validated' ? 'Pengiraan disahkan secara automatik; belum disemak guru.' : 'Belum disemak guru.'}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </Shell>
  );
}
