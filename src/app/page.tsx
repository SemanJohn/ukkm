'use client';

import { u } from '@/lib/base';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { DEFAULT_CONFIGS, MODES, TEST_DATE_ISO } from '@/lib/config';
import { deleteSession, getCandidateName, getSeen, listSessions, loadBank, loadConfig } from '@/lib/db';
import { capacity } from '@/lib/engine';
import { syncNow, type SyncResult } from '@/lib/sync';
import type { ExamConfig, Mode, Session } from '@/lib/types';

const MODE_TITLE: Record<Mode, string> = { ukkm: 'UKKM', stem: 'STEM-Excellence', full: 'Simulasi Penuh' };

export default function HomePage() {
  const [configs, setConfigs] = useState<Record<Mode, ExamConfig>>(DEFAULT_CONFIGS);
  const [active, setActive] = useState<Session[]>([]);

  const [left, setLeft] = useState<Partial<Record<Mode, number>>>({});
  const [bankSize, setBankSize] = useState<number | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [sync, setSync] = useState<SyncResult | null>(null);

  const refresh = async () => {
    const entries = await Promise.all(MODES.map(async (m) => [m, await loadConfig(m)] as const));
    const cfgs = Object.fromEntries(entries) as Record<Mode, ExamConfig>;
    setConfigs(cfgs);
    setActive((await listSessions()).filter((s) => s.status === 'active'));
    const name = await getCandidateName();

    const bundle = await loadBank();
    setBankSize(bundle.bank.length);
    const seen = await getSeen(name);
    setLeft(Object.fromEntries(MODES.map((m) => [m, capacity(cfgs[m], bundle.bank, seen).sessionsLeft])));
  };

  useEffect(() => {
    refresh().catch(() => {});
    syncNow().then((r) => {
      setSync(r);
      if (r.ok) refresh().catch(() => {});
    });
    const today = new Date();
    const test = new Date(`${TEST_DATE_ISO}T00:00:00`);
    setDaysLeft(Math.ceil((test.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000));
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((r) => {
        if (r?.active) setOfflineReady(true);
        else navigator.serviceWorker.ready.then(() => setOfflineReady(true)).catch(() => {});
      });
    }
    const onOnline = () => syncNow().then(setSync);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const discard = async (s: Session) => {
    if (!window.confirm(`Buang sesi “${s.title}” yang sedang berjalan? Jawapan sesi ini akan dipadam. Soalan yang telah dipaparkan kekal dalam sejarah dan tidak akan diulang.`)) return;
    await deleteSession(s.id);
    await refresh();
  };

  return (
    <Shell title="Simulator UKKM MRSM 2027">
      <div className="space-y-5">
        <p className="text-lg font-bold text-blue-900" data-testid="countdown">
          {daysLeft === null ? '' : daysLeft > 0 ? `${daysLeft} hari lagi` : daysLeft === 0 ? 'Ujian hari ini' : ''}
        </p>

        {active.length > 0 && (
          <section className="card border-blue-300 bg-blue-50">
            <h2 className="mb-2 text-base font-bold">Sesi sedang berjalan</h2>
            <ul className="space-y-2">
              {active.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{s.title}</span>
                  <span className="flex gap-2">
                    <a className="btn btn-primary" href={u(`/exam/?mode=${s.mode}`)}>
                      Sambung
                    </a>
                    <button type="button" className="btn" onClick={() => discard(s)}>
                      Buang
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Simulasi peperiksaan" className="grid gap-4 md:grid-cols-3">
          {MODES.map((m) => {
            const cfg = configs[m];
            const secs = cfg.sections.filter((s) => s.enabled && s.questionCount);
            const q = secs.reduce((a, s) => a + (s.questionCount ?? 0), 0);
            const min = secs.reduce((a, s) => a + (s.durationMinutes ?? 0), 0);
            return (
              <article key={m} className="card flex flex-col">
                <h2 className="text-base font-bold">{MODE_TITLE[m]}</h2>
                <p className="mt-1 flex-1 text-sm text-slate-600">
                  {q} soalan · {min} minit
                </p>
                <p className="mt-1 text-xs text-slate-500" data-testid={`left-${m}`}>
                  {left[m] === undefined ? '' : `Baki sesi baharu: ${left[m]}`}
                </p>
                <a href={u(`/exam/?mode=${m}`)} className="btn btn-primary mt-3" data-testid={`mode-${m}`}>
                  Mula
                </a>
              </article>
            );
          })}
        </section>

        <a className="btn" href={u('/practice/')} data-testid="open-practice">
          Mod Latihan
        </a>

        <p className="text-xs text-slate-500">
          Latihan tidak rasmi; bukan format atau soalan rasmi MARA.{' '}
          <a className="underline" href={u('/format/')}>
            Butiran
          </a>
          {' · '}
          <span data-testid="sync-status">{sync === null ? '' : sync.ok ? 'Diselaraskan dengan pelayan' : 'Tidak diselaraskan (peranti ini sahaja)'}</span>
          {offlineReady && (
            <>
              {' · '}
              <span data-testid="offline-status">Sedia digunakan tanpa Internet</span>
            </>
          )}
        </p>
      </div>
    </Shell>
  );
}
