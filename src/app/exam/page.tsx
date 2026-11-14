'use client';

import { u } from '@/lib/base';
import { useEffect, useState } from 'react';
import ExamRunner from '@/components/ExamRunner';
import Shell from '@/components/Shell';
import type { BankBundle } from '@/data/bank';
import { getActiveSession, getCandidateName, getSeen, loadBank, loadConfig, saveSession, setCandidateName, startExam } from '@/lib/db';
import { capacity, tick, type Capacity } from '@/lib/engine';
import { syncNow } from '@/lib/sync';
import { ModeSchema, type ExamConfig, type Session, type SessionMode } from '@/lib/types';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'intro'; cfg: ExamConfig; bundle: BankBundle }
  | { kind: 'running'; session: Session; bundle: BankBundle };

const PRACTICE = ['subject', 'kbat', 'speed', 'revision', 'unlimited', 'adaptive'];

export default function ExamPage() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [name, setName] = useState('');
  const [cap, setCap] = useState<{ sections: Capacity[]; sessionsLeft: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = new URLSearchParams(window.location.search).get('mode') ?? '';
      const parsed = ModeSchema.safeParse(raw);
      if (!parsed.success && !PRACTICE.includes(raw)) {
        setPhase({ kind: 'error', message: 'Mod tidak sah. Sila pilih mod dari halaman utama.' });
        return;
      }
      const active = await getActiveSession(raw as SessionMode);
      if (active) {
        // Sambung semula: masa terus berjalan semasa halaman ditutup.
        const cur = tick(active, Date.now());
        if (cur !== active) await saveSession(cur);
        if (cur.status === 'submitted') {
          window.location.replace(u(`/results/?id=${encodeURIComponent(cur.id)}`));
          return;
        }
        setPhase({ kind: 'running', session: cur, bundle: await loadBank() });
        return;
      }
      if (!parsed.success) {
        window.location.replace(u('/practice/'));
        return;
      }
      // Tarik sejarah soalan dari pelayan dahulu (jika ada) supaya soalan tidak berulang merentas peranti.
      await Promise.race([syncNow(), new Promise((r) => setTimeout(r, 4000))]);
      const candidate = await getCandidateName();
      setName(candidate);
      setPhase({ kind: 'intro', cfg: await loadConfig(parsed.data), bundle: await loadBank() });
    })().catch((e) => setPhase({ kind: 'error', message: String(e?.message ?? e) }));
  }, []);

  // Baki soalan unik bergantung pada calon — kira semula apabila nama berubah.
  useEffect(() => {
    if (phase.kind !== 'intro') return;
    let cancelled = false;
    getSeen(name || ' ').then((seen) => {
      if (!cancelled) setCap(capacity(phase.cfg, phase.bundle.bank, seen));
    });
    return () => {
      cancelled = true;
    };
  }, [phase, name]);

  if (phase.kind === 'running') return <ExamRunner initial={phase.session} bundle={phase.bundle} />;

  if (phase.kind === 'loading') {
    return (
      <Shell title="Memuatkan…">
        <p role="status">Sila tunggu.</p>
      </Shell>
    );
  }
  if (phase.kind === 'error') {
    return (
      <Shell title="Tidak dapat memulakan sesi">
        <p className="card text-red-800" role="alert">
          {phase.message}
        </p>
        <a href={u('/')} className="btn mt-4">
          Kembali ke halaman utama
        </a>
      </Shell>
    );
  }

  const { cfg, bundle } = phase;
  const runnable = cfg.sections.filter((s) => s.enabled && s.questionCount);
  const totalQ = runnable.reduce((a, s) => a + (s.questionCount ?? 0), 0);
  const totalMin = runnable.reduce((a, s) => a + (s.durationMinutes ?? 0), 0);
  const short = cap?.sections.filter((c) => c.unseenFamilies < c.need) ?? [];
  const empty = cap !== null && cap.sections.every((c) => c.unseen === 0);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const candidate = name.trim();
      await setCandidateName(candidate);
      // Nama calon mungkin baru ditukar: tarik sejarah soalan calon itu dari pelayan sebelum memilih soalan.
      await Promise.race([syncNow(), new Promise((r) => setTimeout(r, 4000))]);
      const seed = (crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()) >>> 0;
      const session = await startExam(cfg, bundle, candidate, seed, Date.now());
      if (fullscreen) await document.documentElement.requestFullscreen?.().catch(() => {});
      setPhase({ kind: 'running', session, bundle });
    } catch (e) {
      setPhase({ kind: 'error', message: String((e as Error)?.message ?? e) });
    }
  };

  return (
    <Shell title={cfg.name}>
      <div className="space-y-5">
        <section className="card">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Komponen', 'Soalan', 'Minit'].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runnable.map((s) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.title}</td>
                  <td className="td">{s.questionCount}</td>
                  <td className="td">{s.durationMinutes ?? '—'}</td>
                </tr>
              ))}
              <tr>
                <td className="td font-bold">Jumlah</td>
                <td className="td font-bold">{totalQ}</td>
                <td className="td font-bold">{totalMin}</td>
              </tr>
            </tbody>
          </table>
          {short.length > 0 && !empty && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
              Soalan baharu tidak mencukupi bagi: {short.map((c) => `${c.title} (${c.unseenFamilies} daripada ${c.need})`).join('; ')}. Sesi akan dipendekkan; soalan tidak diulang.
            </p>
          )}
          {empty && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
              Semua soalan untuk ujian ini telah digunakan. Gunakan Mod Ulang Kaji.
            </p>
          )}
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Pemasa setiap komponen berjalan terus dan tidak berhenti. Apabila masa tamat, komponen seterusnya bermula sendiri.</li>
            <li>{cfg.allowBackNavigation === false ? 'Tidak boleh kembali ke soalan sebelumnya.' : 'Boleh berpindah antara soalan dalam komponen yang sama sahaja.'}</li>
            <li>{cfg.allowCalculator ? 'Kalkulator pada skrin disediakan.' : 'Tiada kalkulator; sediakan kertas dan pensel.'}</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Latihan tidak rasmi; bukan format rasmi MARA.{' '}
            <a href={u('/format/')} className="underline">
              Butiran
            </a>
          </p>
        </section>

        <section className="card">
          <label className="block text-sm font-medium" htmlFor="cand-name">
            Nama calon
          </label>
          <input id="cand-name" className="input mt-1 max-w-md" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" />
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} data-testid="confirm-candidate" />
            <span>Nama betul dan saya sedia bermula.</span>
          </label>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={fullscreen} onChange={(e) => setFullscreen(e.target.checked)} />
            <span>Skrin penuh</span>
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" disabled={!confirmed || !name.trim() || starting || totalQ === 0 || empty || cap === null} onClick={start} data-testid="start-exam">
              Mula
            </button>
            <a href={u('/')} className="btn">
              Batal
            </a>
          </div>
        </section>
      </div>
    </Shell>
  );
}
