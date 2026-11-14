'use client';

import { u } from '@/lib/base';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { CANDIDATE_DEFAULT, CANDIDATE_PROFILE, DEFAULT_CONFIGS, MODES, presetLabel, SRC, TEST_DATE_ISO } from '@/lib/config';
import { deleteSession, getCandidateName, getSeen, listSessions, loadBank, loadConfig } from '@/lib/db';
import { capacity } from '@/lib/engine';
import { syncNow, type SyncResult } from '@/lib/sync';
import type { ExamConfig, Mode, Session } from '@/lib/types';

const MODE_BUTTON: Record<Mode, string> = { ukkm: 'Buka UKKM', stem: 'Buka STEM-Excellence', full: 'Buka Simulasi Penuh' };

export default function HomePage() {
  const [configs, setConfigs] = useState<Record<Mode, ExamConfig>>(DEFAULT_CONFIGS);
  const [active, setActive] = useState<Session[]>([]);
  const [candidate, setCandidate] = useState(CANDIDATE_DEFAULT);
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
    setCandidate(name);
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
    <Shell title="Simulasi UKKM & Ujian Khas STEM-Excellence — MRSM Tingkatan 1 2027">
      <div className="space-y-6">
        <section className="card border-amber-300 bg-amber-50 text-sm text-amber-900">
          <p>
            <strong>Latihan tidak rasmi untuk calon sekolah KPM selepas PKSK.</strong> MARA tidak menerbitkan komponen, bilangan soalan atau tempoh UKKM bagi kategori ini, mahupun format Ujian Khas Premier STEM-Excellence. Semua blueprint di sini berstatus{' '}
            <strong>UNVERIFIED_PRACTICE</strong> dan boleh diubah di <a className="font-semibold underline" href={u('/admin/')}>Admin</a>. Markah simulasi bukan skor merit MARA dan tidak meramalkan tawaran.
          </p>
        </section>

        <section className="card grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm text-slate-600">Calon</p>
            <p className="text-lg font-bold">{candidate}</p>
            <dl className="mt-2 grid gap-x-4 gap-y-0.5 text-sm text-slate-700 sm:grid-cols-[auto_1fr]">
              <dt className="font-medium">Kategori</dt>
              <dd>{CANDIDATE_PROFILE.category}</dd>
              <dt className="font-medium">Program</dt>
              <dd>
                {CANDIDATE_PROFILE.programme} — {CANDIDATE_PROFILE.choices}
              </dd>
              <dt className="font-medium">Pusat ujian</dt>
              <dd>{CANDIDATE_PROFILE.centre}</dd>
              <dt className="font-medium">Slot</dt>
              <dd>
                {CANDIDATE_PROFILE.date}, {CANDIDATE_PROFILE.slot}
              </dd>
            </dl>
            <p className="mt-1 text-xs text-slate-500">Butiran slot seperti dimaklumkan daripada surat panggilan; sahkan dengan surat asal.</p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-slate-600">Tarikh ujian</p>
            <p className="text-2xl font-bold text-blue-900" data-testid="countdown">
              {daysLeft === null ? '' : daysLeft > 0 ? `${daysLeft} hari lagi` : daysLeft === 0 ? 'Hari ini' : 'Telah berlalu'}
            </p>
          </div>
        </section>

        {active.length > 0 && (
          <section className="card border-blue-300 bg-blue-50">
            <h2 className="mb-2 text-lg font-bold">Sesi sedang berjalan</h2>
            <p className="mb-3 text-sm text-slate-700">Pemasa sesi ini masih berjalan mengikut masa sebenar.</p>
            <ul className="space-y-2">
              {active.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {s.title} — bermula {new Date(s.startedAt).toLocaleString('ms-MY')}
                  </span>
                  <span className="flex gap-2">
                    <a className="btn btn-primary" href={u(`/exam/?mode=${s.mode}`)}>
                      Sambung
                    </a>
                    <button type="button" className="btn" onClick={() => discard(s)}>
                      Buang sesi
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="modes-h">
          <h2 id="modes-h" className="mb-3 text-lg font-bold">
            Simulasi peperiksaan (blueprint tetap)
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {MODES.map((m) => {
              const cfg = configs[m];
              const secs = cfg.sections.filter((s) => s.enabled && s.questionCount);
              const q = secs.reduce((a, s) => a + (s.questionCount ?? 0), 0);
              const min = secs.reduce((a, s) => a + (s.durationMinutes ?? 0), 0);
              return (
                <article key={m} className="card flex flex-col">
                  <h3 className="text-base font-bold">{cfg.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-amber-700">{presetLabel(cfg.formatStatus)}</p>
                  <p className="mt-2 flex-1 text-sm text-slate-600">{cfg.description}</p>
                  <ul className="mt-3 space-y-0.5 text-xs text-slate-600">
                    {secs.map((s) => (
                      <li key={s.id}>
                        {s.title}: {s.questionCount} soalan · {s.durationMinutes ?? '—'} min
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm font-semibold">
                    {q} soalan · {min} minit
                  </p>
                  <p className="text-xs text-slate-600" data-testid={`left-${m}`}>
                    {left[m] === undefined ? 'Mengira baki soalan…' : `Sesi baharu tanpa ulangan yang masih boleh dibina: ${left[m]}`}
                  </p>
                  <a href={u(`/exam/?mode=${m}`)} className="btn btn-primary mt-3" data-testid={`mode-${m}`}>
                    {MODE_BUTTON[m]}
                  </a>
                </article>
              );
            })}
          </div>
          <p className="mt-3 text-sm">
            Latihan lain — subjek, Cabaran KBAT, Ujian Pantas, adaptif, ulang kaji dan latihan baharu tanpa had:{' '}
            <a className="btn ml-1" href={u('/practice/')} data-testid="open-practice">
              Buka Mod Latihan
            </a>
          </p>
        </section>

        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Laluan calon sekolah KPM (berdasarkan dokumen rasmi MARA 2027)</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              <strong>PKSK</strong> (Kementerian Pendidikan) — sudah diduduki; <em>tidak</em> disimulasikan dan tidak digunakan sebagai pengganti UKKM.
            </li>
            <li>
              <strong>Ujian MARA</strong> — calon yang melepasi merit minimum PKSK dan memilih Program Khas (termasuk Premier STEM-Excellence) sebagai pilihan pertama dipanggil menduduki Ujian Khas. Calon ini dipanggil untuk slot UKKM dengan ujian tambahan STEM-Excellence.
            </li>
          </ol>
          <p className="mt-3 text-sm text-slate-600">
            Subjek UKKM (Bahasa Melayu, Matematik, Sains, Keperibadian) hanya disenaraikan secara rasmi bagi calon sekolah swasta tidak berdaftar KPM, jadi ia tidak dianggap format calon KPM. Sumber:{' '}
            <a className="underline" href={SRC.syarat} target="_blank" rel="noreferrer">
              Syarat dan Pilihan Program MRSM
            </a>
            ,{' '}
            <a className="underline" href={SRC.faq} target="_blank" rel="noreferrer">
              FAQ 2027
            </a>
            . Butiran: <a className="underline" href={u('/format/')}>Format &amp; Bukti</a>.
          </p>
        </section>

        <section className="card text-sm text-slate-700">
          <h2 className="mb-2 text-lg font-bold text-slate-900">Status sistem</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Bank soalan: {bankSize ?? '…'} item (tulisan tangan + dijana daripada templat). Tiada item yang telah disemak oleh guru melainkan diluluskan di Admin.</li>
            <li data-testid="sync-status">
              {sync === null
                ? 'Menyemak pelayan penyelarasan…'
                : sync.ok
                  ? `Diselaraskan dengan pelayan (${new Date(sync.at).toLocaleTimeString('ms-MY')}): sejarah ${sync.exposuresTotal} soalan dikongsi merentas peranti.`
                  : `Tidak diselaraskan: ${sync.message} Sejarah soalan disimpan pada peranti ini dan akan diselaraskan apabila pelayan boleh dicapai.`}
            </li>
            <li data-testid="offline-status">
              {offlineReady ? 'Sedia digunakan tanpa Internet pada peranti ini.' : 'Sokongan luar talian aktif selepas aplikasi dibina (npm run build) dan dibuka sekali dalam talian.'}
            </li>
            <li>Untuk memasang: menu pelayar → “Pasang aplikasi” / “Tambah ke Skrin Utama”.</li>
          </ul>
        </section>
      </div>
    </Shell>
  );
}
