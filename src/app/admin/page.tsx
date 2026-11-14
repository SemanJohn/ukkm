'use client';

import { u } from '@/lib/base';
import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import StatusBadge from '@/components/StatusBadge';
import { DEFAULT_VARIANTS, MAX_VARIANTS, type BankBundle } from '@/data/bank';
import { DEFAULT_CONFIGS, MODES, STATUS_LABEL } from '@/lib/config';
import {
  clearExposures,
  exportAll,
  getCandidateName,
  getSeen,
  getSetting,
  getVariants,
  listBlueprintVersions,
  listSessions,
  loadBank,
  loadConfig,
  resetConfig,
  saveConfig,
  setSetting,
  setVariants,
  type BlueprintVersion,
} from '@/lib/db';
import { capacity, eligible, scoreSession, type Seen } from '@/lib/engine';
import { findNearDuplicates, vetExternalItem } from '@/lib/factory';
import { authHeaders, serverHealth, syncNow, type ServerHealth } from '@/lib/sync';
import {
  DIFF_LABEL,
  DIFFICULTIES,
  ExamConfigSchema,
  SUBJECT_LABEL,
  VerificationStatusSchema,
  type BankSection,
  type Difficulty,
  type ExamConfig,
  type ExamSection,
  type Mode,
  type NoRepeat,
  type Question,
  type VerificationStatus,
} from '@/lib/types';

type Tab = 'blueprint' | 'bank' | 'review' | 'candidate' | 'data';
const TABS: [Tab, string][] = [
  ['blueprint', 'Blueprint'],
  ['bank', 'Bank soalan'],
  ['review', 'Semakan item'],
  ['candidate', 'Analisis calon'],
  ['data', 'Data & penyelarasan'],
];
const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
const poolSize = (s: ExamSection, bank: Question[], seen: Seen) => eligible(s, bank, seen, 'off').length;
type Msg = { kind: 'ok' | 'error'; text: string } | null;
type Pending = Question & { audit?: { aiAgrees?: boolean; issue?: string; model?: string }; reviewer?: string | null };

function download(name: string, text: string, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function Message({ m, id }: { m: Msg; id: string }) {
  if (!m) return null;
  return (
    <p className={`card text-sm ${m.kind === 'ok' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-red-300 bg-red-50 text-red-900'}`} role={m.kind === 'ok' ? 'status' : 'alert'} data-testid={id}>
      {m.text}
    </p>
  );
}

/* ---------------- Blueprint ---------------- */
function BlueprintTab({ bundle, seen }: { bundle: BankBundle; seen: Seen }) {
  const [mode, setMode] = useState<Mode>('ukkm');
  const [cfg, setCfg] = useState<ExamConfig | null>(null);
  const [versions, setVersions] = useState<BlueprintVersion[]>([]);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<Msg>(null);

  const reload = async (m: Mode) => {
    setCfg(await loadConfig(m));
    setVersions(await listBlueprintVersions(m));
  };
  useEffect(() => {
    setCfg(null);
    setMessage(null);
    reload(mode).catch(() => setCfg(DEFAULT_CONFIGS[mode]));
  }, [mode]);

  const edit = (next: ExamConfig) => {
    setCfg(next);
    setMessage(null);
  };
  const updateSection = (i: number, patch: Partial<ExamSection>) => cfg && edit({ ...cfg, sections: cfg.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const move = (i: number, dir: -1 | 1) => {
    if (!cfg) return;
    const j = i + dir;
    if (j < 0 || j >= cfg.sections.length) return;
    const sections = cfg.sections.slice();
    [sections[i], sections[j]] = [sections[j], sections[i]];
    edit({ ...cfg, sections });
  };

  const save = async () => {
    if (!cfg) return;
    const parsed = ExamConfigSchema.safeParse(cfg);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setMessage({ kind: 'error', text: `Konfigurasi tidak sah (${issue.path.join('.')}): ${issue.message}` });
      return;
    }
    if (!parsed.data.sections.some((s) => s.enabled)) return setMessage({ kind: 'error', text: 'Sekurang-kurangnya satu komponen mesti diaktifkan.' });
    for (const s of parsed.data.sections) {
      if (DIFFICULTIES.reduce((a, d) => a + s.difficulty[d], 0) <= 0) return setMessage({ kind: 'error', text: `“${s.title}”: jumlah pemberat aras mesti lebih daripada 0.` });
      if (s.enabled && (s.questionCount ?? 0) > poolSize(s, bundle.bank, seen)) return setMessage({ kind: 'error', text: `“${s.title}”: bank hanya ada ${poolSize(s, bundle.bank, seen)} soalan yang sepadan.` });
    }
    const official = parsed.data.formatStatus === 'OFFICIAL_2027_VERIFIED' || parsed.data.sections.some((s) => s.verificationStatus === 'OFFICIAL_2027_VERIFIED');
    if (official && note.trim().length < 10) return setMessage({ kind: 'error', text: 'Untuk menanda sesuatu sebagai OFFICIAL_2027_VERIFIED, nyatakan dokumen rasmi sumbernya dalam ruangan catatan (cth. “Surat panggilan UKKM bertarikh …”).' });
    const v = await saveConfig(parsed.data, note.trim() || 'Disimpan dari Admin');
    setNote('');
    await reload(mode);
    setMessage({ kind: 'ok', text: `Blueprint disimpan sebagai versi ${v.version}. Ia digunakan untuk sesi baharu sahaja.` });
  };
  const reset = async () => {
    if (!window.confirm('Set semula blueprint ini kepada preset latihan lalai? Versi baharu akan direkodkan.')) return;
    await resetConfig(mode);
    await reload(mode);
    setMessage({ kind: 'ok', text: 'Blueprint diset semula kepada lalai.' });
  };

  const cap = cfg ? capacity(cfg, bundle.bank, seen) : null;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Blueprint" className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={`btn ${mode === m ? 'btn-primary' : ''}`} onClick={() => setMode(m)} data-testid={`admin-tab-${m}`}>
            {DEFAULT_CONFIGS[m].name}
          </button>
        ))}
      </div>
      {!cfg ? (
        <p role="status">Memuatkan…</p>
      ) : (
        <>
          <section className="card grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Status format blueprint
              <select className="input mt-1" value={cfg.formatStatus} onChange={(e) => edit({ ...cfg, formatStatus: e.target.value as VerificationStatus })} data-testid="admin-format-status">
                {VerificationStatusSchema.options.map((s) => (
                  <option key={s} value={s}>
                    {s} — {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">Pilih OFFICIAL_2027_VERIFIED hanya jika nilai diambil daripada dokumen rasmi MARA 2027 bagi calon KPM.</span>
            </label>
            <label className="text-sm font-medium">
              Mod tanpa pengulangan
              <select className="input mt-1" value={cfg.noRepeat} onChange={(e) => edit({ ...cfg, noRepeat: e.target.value as NoRepeat })} data-testid="admin-norepeat">
                <option value="item">Tanpa ulang soalan (lalai)</option>
                <option value="family">Ketat — tanpa ulang keluarga soalan</option>
                <option value="off">Mati — soalan boleh berulang</option>
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500" data-testid="admin-capacity">
                Sesi baharu yang masih boleh dibina bagi calon semasa: {cap?.sessionsLeft ?? '…'}
              </span>
            </label>
          </section>

          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Komponen</h2>
            <ul className="space-y-4">
              {cfg.sections.map((s, i) => (
                <li key={s.id} className={`rounded-lg border p-4 ${s.enabled ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50'}`} data-testid={`admin-section-${i}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" className="h-5 w-5" checked={s.enabled} onChange={(e) => updateSection(i, { enabled: e.target.checked })} data-testid={`admin-enabled-${i}`} />
                      {i + 1}. {s.enabled ? 'Aktif' : 'Tidak aktif'}
                    </label>
                    <span className="text-xs text-slate-500">
                      {s.scored ? 'Dimarkah' : 'Tidak dimarkah'} · {poolSize(s, bundle.bank, seen)} soalan dalam bank · {cap?.sections.find((c) => c.title === s.title)?.unseen ?? '—'} belum digunakan
                    </span>
                    <div className="flex gap-1.5">
                      <button type="button" className="btn !min-h-[36px]" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Naikkan seksyen ${s.title}`}>
                        ↑ Naik
                      </button>
                      <button type="button" className="btn !min-h-[36px]" disabled={i === cfg.sections.length - 1} onClick={() => move(i, 1)} aria-label={`Turunkan seksyen ${s.title}`}>
                        ↓ Turun
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <label className="text-xs font-medium lg:col-span-2">
                      Tajuk
                      <input className="input mt-1" value={s.title} onChange={(e) => updateSection(i, { title: e.target.value })} />
                    </label>
                    <label className="text-xs font-medium">
                      Bilangan soalan
                      <input className="input mt-1" type="number" min={1} max={150} value={Number.isNaN(s.questionCount) ? '' : (s.questionCount ?? '')} onChange={(e) => updateSection(i, { questionCount: num(e.target.value) })} data-testid={`admin-count-${i}`} />
                    </label>
                    <label className="text-xs font-medium">
                      Tempoh (minit)
                      <input className="input mt-1" type="number" min={1} max={300} step="0.5" value={Number.isNaN(s.durationMinutes) ? '' : (s.durationMinutes ?? '')} onChange={(e) => updateSection(i, { durationMinutes: num(e.target.value) })} data-testid={`admin-duration-${i}`} />
                    </label>
                    <label className="text-xs font-medium lg:col-span-2">
                      Status pengesahan
                      <select className="input mt-1" value={s.verificationStatus} onChange={(e) => updateSection(i, { verificationStatus: e.target.value as VerificationStatus })}>
                        {VerificationStatusSchema.options.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset className="sm:col-span-2 lg:col-span-6">
                      <legend className="text-xs font-medium">Pemberat aras (mudah / sederhana / sukar / KBAT lanjutan)</legend>
                      <div className="mt-1 flex max-w-md gap-1.5">
                        {DIFFICULTIES.map((d) => (
                          <input key={d} className="input" type="number" min={0} max={100} aria-label={`Pemberat ${DIFF_LABEL[d]} bagi ${s.title}`} value={Number.isNaN(s.difficulty[d]) ? '' : s.difficulty[d]} onChange={(e) => updateSection(i, { difficulty: { ...s.difficulty, [d]: num(e.target.value) } })} />
                        ))}
                      </div>
                    </fieldset>
                  </div>
                  {s.note && <p className="mt-2 text-xs text-slate-500">{s.note}</p>}
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Peraturan (preset latihan — peraturan rasmi tidak diterbitkan)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['allowBackNavigation', 'Benarkan kembali ke soalan sebelumnya dalam komponen'],
                  ['allowCalculator', 'Sediakan kalkulator pada skrin'],
                  ['shuffleQuestions', 'Rawakkan susunan soalan'],
                  ['shuffleOptions', 'Rawakkan susunan pilihan jawapan'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="h-5 w-5" checked={Boolean(cfg[key])} onChange={() => edit({ ...cfg, [key]: !cfg[key] })} data-testid={`admin-${key}`} />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="card">
            <label className="block text-sm font-medium">
              Catatan perubahan (direkodkan dalam log versi)
              <input className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="cth. Tempoh dikemas kini mengikut surat panggilan" maxLength={200} data-testid="admin-note" />
            </label>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={save} data-testid="admin-save">
                Simpan blueprint
              </button>
              <button type="button" className="btn" onClick={reset}>
                Set semula kepada lalai
              </button>
            </div>
          </section>
          <Message m={message} id="admin-message" />

          <section className="card overflow-x-auto">
            <h2 className="mb-3 text-lg font-bold">Versi blueprint dan log perubahan</h2>
            {versions.length === 0 ? (
              <p className="text-sm text-slate-600">Tiada perubahan direkodkan — preset lalai sedang digunakan.</p>
            ) : (
              <table className="w-full border-collapse" data-testid="admin-versions">
                <thead>
                  <tr>
                    {['Versi', 'Disimpan', 'Status', 'Komponen aktif', 'Catatan'].map((h) => (
                      <th key={h} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.key}>
                      <td className="td">v{v.version}</td>
                      <td className="td whitespace-nowrap">{new Date(v.savedAt).toLocaleString('ms-MY')}</td>
                      <td className="td">
                        <StatusBadge status={v.config.formatStatus} />
                      </td>
                      <td className="td">{v.config.sections.filter((s) => s.enabled).map((s) => `${s.title} ${s.questionCount}/${s.durationMinutes}min`).join(' · ')}</td>
                      <td className="td">{v.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ---------------- Bank soalan & kilang ---------------- */
const SUBJECTS: BankSection[] = ['matematik', 'sains', 'stem', 'igcse', 'teknikal', 'keperibadian', 'bm'];
const TARGET: Record<BankSection, number> = { matematik: 1500, sains: 1500, stem: 1500, keperibadian: 500, bm: 0, igcse: 0, teknikal: 0 };

function BankTab({ bundle, seen, health, onChanged }: { bundle: BankBundle; seen: Seen; health: ServerHealth | null; onChanged: () => Promise<void> }) {
  const [variants, setV] = useState(bundle.variants);
  const [msg, setMsg] = useState<Msg>(null);
  const [ai, setAi] = useState({ subject: 'sains' as BankSection, topic: 'Tenaga & Elektrik', difficulty: 'medium' as Difficulty, count: 5 });
  const [aiBusy, setAiBusy] = useState(false);
  const [showDup, setShowDup] = useState(false);
  const r = bundle.report;
  const dups = useMemo(() => (showDup ? findNearDuplicates(bundle.bank) : []), [showDup, bundle]);
  const topics = useMemo(() => [...new Set(bundle.bank.filter((q) => q.section === ai.subject).map((q) => q.topic))].sort(), [bundle, ai.subject]);

  const stat = (sec: BankSection) => {
    const all = bundle.bank.filter((q) => q.section === sec);
    return {
      total: all.length,
      manual: all.filter((q) => q.sourceType === 'original-practice').length,
      generated: all.filter((q) => q.sourceType === 'template-generated').length,
      approved: all.filter((q) => q.validationStatus === 'human_approved').length,
      auto: all.filter((q) => q.validationStatus === 'auto_validated').length,
      families: new Set(all.map((q) => q.familyId)).size,
      unseen: all.filter((q) => !seen.ids.has(q.id)).length,
    };
  };

  const applyVariants = async () => {
    await setVariants(variants);
    await onChanged();
    setMsg({ kind: 'ok', text: `Kilang templat dijalankan semula dengan ${variants} varian setiap templat.` });
  };

  const generateAi = async () => {
    setAiBusy(true);
    setMsg(null);
    try {
      const avoid = bundle.bank.filter((q) => q.section === ai.subject && q.topic === ai.topic).map((q) => q.question);
      const res = await fetch('/api/factory/generate', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ ...ai, avoid }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Ralat ${res.status}`);
      // CHECK ANSWER → DETECT DUPLICATES → VALIDATE (klien) → kuarantin di pelayan.
      const accepted: { question: Question; audit: object }[] = [];
      const rejected: string[] = [];
      const pool = bundle.bank.slice();
      for (const [i, raw] of (body.items as { item: Record<string, unknown>; aiCheck: { agrees: boolean; issue: string }; model: string }[]).entries()) {
        const id = `AI-${Date.now().toString(36)}-${i}`;
        if (!raw.aiCheck?.agrees) {
          rejected.push(`penyelesai bebas tidak bersetuju${raw.aiCheck?.issue ? `: ${raw.aiCheck.issue}` : ''}`);
          continue;
        }
        const v = vetExternalItem({ ...raw.item, id, familyId: id, templateId: 'ai' }, pool);
        if (!v.ok) rejected.push(v.reason);
        else {
          accepted.push({ question: v.question, audit: { aiAgrees: true, model: raw.model, generatedAt: Date.now() } });
          pool.push(v.question);
        }
      }
      let stored = 0;
      if (accepted.length) {
        const save = await fetch('/api/questions', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ items: accepted }) });
        stored = (await save.json()).stored ?? 0;
      }
      setMsg({ kind: 'ok', text: `AI menjana ${body.items.length} draf: ${stored} lulus semakan automatik dan DIKUARANTIN untuk semakan manusia; ${rejected.length} ditolak${rejected.length ? ` (${[...new Set(rejected)].join('; ')})` : ''}. Item hanya digunakan selepas diluluskan di tab “Semakan item”.` });
    } catch (e) {
      setMsg({ kind: 'error', text: `Penjanaan AI gagal: ${(e as Error).message}` });
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="card border-amber-300 bg-amber-50 text-sm text-amber-900">
        Sasaran bank latihan ialah 5,000 item (1,500 Matematik, 1,500 Sains, 1,500 STEM, 500 Keperibadian). <strong>Bank semasa belum mencapai sasaran itu</strong> — angka sebenar di bawah. Sasaran ini bilangan bank latihan, bukan bilangan soalan UKKM rasmi.
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 text-lg font-bold">Kandungan bank (sebenar)</h2>
        <table className="w-full border-collapse" data-testid="bank-stats">
          <thead>
            <tr>
              {['Subjek', 'Jumlah', 'Sasaran', 'Tulisan tangan', 'Dijana templat', 'Pengiraan disahkan auto', 'Diluluskan manusia', 'Keluarga unik', 'Belum digunakan (calon semasa)'].map((h) => (
                <th key={h} className="th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUBJECTS.map((s) => {
              const t = stat(s);
              return (
                <tr key={s}>
                  <td className="td font-medium">{SUBJECT_LABEL[s]}</td>
                  <td className="td font-semibold">{t.total}</td>
                  <td className="td">{TARGET[s] || '—'}</td>
                  <td className="td">{t.manual}</td>
                  <td className="td">{t.generated}</td>
                  <td className="td">{t.auto}</td>
                  <td className="td">{t.approved}</td>
                  <td className="td">{t.families}</td>
                  <td className="td">{t.unseen}</td>
                </tr>
              );
            })}
            <tr>
              <td className="td font-bold">Jumlah</td>
              <td className="td font-bold" data-testid="bank-total">
                {bundle.bank.length}
              </td>
              <td className="td">5000</td>
              <td className="td" colSpan={6}>
                {bundle.bank.filter((q) => q.verifiedByReviewer).length} item disemak manusia · {new Set(bundle.bank.map((q) => q.familyId)).size} keluarga unik
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Kilang templat deterministik</h2>
        <p className="text-sm text-slate-600">GENERATE → CHECK ANSWER → CHECK DISTRACTORS → DETECT DUPLICATES → VALIDATE → PUBLISH. Jawapan setiap item disahkan dengan pengiraan bebas; ini bukan semakan manusia.</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" data-testid="factory-report">
          {[
            ['Templat (keluarga)', r.templates],
            ['Cubaan jana', r.attempted],
            ['Lulus & diterbitkan', r.published],
            ['Gagal semakan jawapan', r.failedAnswer],
            ['Gagal pengganggu', r.failedDistractors],
            ['Gagal skema', r.failedSchema],
            ['Pendua dibuang', r.duplicates],
            ['Parameter ditolak templat', r.rejectedByTemplate],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-100 p-2">
              <dt className="text-xs text-slate-600">{k}</dt>
              <dd className="text-lg font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <label className="mt-4 block text-sm font-medium">
          Varian setiap templat (0–{MAX_VARIANTS}; lalai {DEFAULT_VARIANTS})
          <input className="input mt-1 !w-32" type="number" min={0} max={MAX_VARIANTS} value={Number.isNaN(variants) ? '' : variants} onChange={(e) => setV(num(e.target.value))} data-testid="factory-variants" />
        </label>
        <p className="mt-1 text-xs text-slate-500">Menaikkan nilai ini menambah item baharu tanpa mengubah id item sedia ada, jadi sejarah tanpa pengulangan kekal sah. Varian daripada templat yang sama ialah satu keluarga (nombor berbeza, struktur sama).</p>
        <button type="button" className="btn btn-primary mt-3" disabled={!Number.isInteger(variants) || variants < 0 || variants > MAX_VARIANTS} onClick={applyVariants} data-testid="factory-run">
          Jana semula bank templat
        </button>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Penjanaan AI (pilihan)</h2>
        {!health ? (
          <p className="text-sm text-slate-600">Pelayan penyelarasan tidak ditemui. Jalankan <code>npm start</code> untuk menggunakan penjanaan AI.</p>
        ) : !health.ai ? (
          <p className="text-sm text-slate-600" data-testid="ai-unavailable">
            Tidak dikonfigurasi. Tetapkan <code>ANTHROPIC_API_KEY</code> pada pelayan dan mulakan semula. Peperiksaan dan kilang templat berfungsi tanpa API ini.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">Draf AI disemak (penyelesai bebas, pengiraan, pendua) dan kemudian dikuarantin. Tiada item AI digunakan dalam sesi sehingga diluluskan oleh penyemak manusia.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <label className="text-xs font-medium">
                Subjek
                <select className="input mt-1" value={ai.subject} onChange={(e) => setAi({ ...ai, subject: e.target.value as BankSection, topic: '' })}>
                  {(['matematik', 'sains', 'stem'] as BankSection[]).map((s) => (
                    <option key={s} value={s}>
                      {SUBJECT_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium">
                Topik
                <select className="input mt-1" value={ai.topic} onChange={(e) => setAi({ ...ai, topic: e.target.value })}>
                  <option value="">— pilih —</option>
                  {topics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium">
                Aras
                <select className="input mt-1" value={ai.difficulty} onChange={(e) => setAi({ ...ai, difficulty: e.target.value as Difficulty })}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {DIFF_LABEL[d]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium">
                Bilangan (1–10 setiap batch)
                <input className="input mt-1" type="number" min={1} max={10} value={ai.count} onChange={(e) => setAi({ ...ai, count: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
              </label>
            </div>
            <button type="button" className="btn btn-primary mt-3" disabled={aiBusy || !ai.topic} onClick={generateAi}>
              {aiBusy ? 'Menjana…' : 'Jana batch dengan AI'}
            </button>
          </>
        )}
      </section>
      <Message m={msg} id="bank-message" />

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Pengesanan pendua</h2>
        <p className="text-sm text-slate-600">Pendua teks tepat dan pertindihan cap jari semantik dibuang semasa penjanaan ({r.duplicates} dibuang). Imbasan di bawah mencari pasangan hampir serupa merentas keluarga berlainan.</p>
        <button type="button" className="btn mt-3" onClick={() => setShowDup(true)} data-testid="scan-duplicates">
          Imbas hampir-pendua
        </button>
        {showDup && (
          <p className="mt-3 text-sm" data-testid="duplicate-result">
            {dups.length === 0 ? 'Tiada pasangan hampir-pendua ditemui merentas keluarga.' : `${dups.length} pasangan untuk disemak: ${dups.slice(0, 20).map((d) => `${d.a} ≈ ${d.b} (${d.similarity})`).join('; ')}`}
          </p>
        )}
      </section>
    </div>
  );
}

/* ---------------- Semakan item (kuarantin) ---------------- */
function ReviewTab({ health, onChanged }: { health: ServerHealth | null; onChanged: () => Promise<void> }) {
  const [items, setItems] = useState<Pending[] | null>(null);
  const [reviewer, setReviewer] = useState('');
  const [msg, setMsg] = useState<Msg>(null);

  const load = async () => {
    const res = await fetch('/api/questions?status=pending_review', { headers: await authHeaders() });
    if (!res.ok) throw new Error(`Ralat ${res.status}`);
    setItems((await res.json()).questions);
  };
  useEffect(() => {
    if (health) load().catch((e) => setMsg({ kind: 'error', text: String(e.message) }));
    getSetting<string>('reviewer').then((r) => setReviewer(r ?? ''));
  }, [health]);

  const decide = async (q: Pending, decision: 'approve' | 'reject') => {
    if (reviewer.trim().length < 2) return setMsg({ kind: 'error', text: 'Masukkan nama penyemak dahulu.' });
    await setSetting('reviewer', reviewer.trim());
    const res = await fetch(`/api/questions/${encodeURIComponent(q.id)}/review`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ decision, reviewer: reviewer.trim() }) });
    if (!res.ok) return setMsg({ kind: 'error', text: `Gagal: ${(await res.json()).error ?? res.status}` });
    await load();
    await syncNow();
    await onChanged();
    setMsg({ kind: 'ok', text: decision === 'approve' ? `Item ${q.id} diluluskan oleh ${reviewer.trim()} dan kini boleh digunakan dalam sesi.` : `Item ${q.id} ditolak.` });
  };

  if (!health) return <p className="card text-sm text-slate-600">Semakan item memerlukan pelayan (<code>npm start</code>). Item tulisan tangan dan item templat tidak melalui baris gilir ini; ia ditanda “belum disemak guru”.</p>;
  return (
    <div className="space-y-5">
      <section className="card text-sm">
        <p>
          Item di sini <strong>dikuarantin</strong> dan tidak muncul dalam mana-mana sesi. Meluluskan item merekodkan nama anda sebagai penyemak manusia — luluskan hanya selepas anda sendiri menyemak fakta, bahasa dan jawapan.
        </p>
        <label className="mt-3 block text-sm font-medium">
          Nama penyemak
          <input className="input mt-1 max-w-sm" value={reviewer} onChange={(e) => setReviewer(e.target.value)} maxLength={80} data-testid="reviewer-name" />
        </label>
      </section>
      <Message m={msg} id="review-message" />
      {items === null ? (
        <p role="status">Memuatkan…</p>
      ) : items.length === 0 ? (
        <p className="card text-sm" data-testid="review-empty">
          Tiada item menunggu semakan.
        </p>
      ) : (
        <ol className="space-y-4">
          {items.map((q) => (
            <li key={q.id} className="card" data-testid="review-pending">
              <p className="text-xs text-slate-500">
                {q.id} · {SUBJECT_LABEL[q.section]} · {q.topic} · {DIFF_LABEL[q.difficulty]} · {q.sourceType}
                {q.audit?.model ? ` · ${q.audit.model}` : ''}
              </p>
              <p className="mt-2 whitespace-pre-line">{q.question}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {q.options.map((o, i) => (
                  <li key={i} className={i === q.correctAnswer ? 'font-semibold text-emerald-800' : ''}>
                    {['A', 'B', 'C', 'D'][i]}. {o} {i === q.correctAnswer && '✓ (skema)'}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm">
                <strong>Penjelasan:</strong> {q.explanation}
              </p>
              <p className="mt-1 text-xs text-slate-500">Semakan automatik: {q.calc ? 'pengiraan bebas sepadan; ' : ''}penyelesai AI bebas bersetuju; tiada pendua dikesan. Fakta dan bahasa belum disemak manusia.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn btn-primary" onClick={() => decide(q, 'approve')} data-testid="review-approve">
                  Luluskan
                </button>
                <button type="button" className="btn" onClick={() => decide(q, 'reject')} data-testid="review-reject">
                  Tolak
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ---------------- Analisis calon ---------------- */
function CandidateTab({ bundle, seen, candidate, onChanged }: { bundle: BankBundle; seen: Seen; candidate: string; onChanged: () => Promise<void> }) {
  const [rows, setRows] = useState<{ topic: string; subject: BankSection; correct: number; total: number }[]>([]);
  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    (async () => {
      const done = (await listSessions()).filter((s) => s.status === 'submitted');
      setCount(done.length);
      const agg = new Map<string, { topic: string; subject: BankSection; correct: number; total: number }>();
      for (const s of done) {
        for (const r of scoreSession(s, bundle.map).review) {
          const q = bundle.map.get(r.qid);
          if (!q || r.status === 'unscored') continue;
          const key = `${q.section}|${q.topic}`;
          const a = agg.get(key) ?? { topic: q.topic, subject: q.section, correct: 0, total: 0 };
          a.total++;
          if (r.status === 'correct') a.correct++;
          agg.set(key, a);
        }
      }
      setRows([...agg.values()].sort((a, b) => a.correct / a.total - b.correct / b.total));
    })();
  }, [bundle]);

  const clear = async () => {
    if (!window.confirm(`Padam sejarah soalan bagi “${candidate}”? Selepas ini, soalan yang pernah dipaparkan BOLEH muncul semula. Tindakan ini diselaraskan ke semua peranti.`)) return;
    const n = await clearExposures(candidate);
    await syncNow();
    await onChanged();
    setMsg({ kind: 'ok', text: `${n} rekod sejarah soalan dipadam.` });
  };

  return (
    <div className="space-y-5">
      <section className="card">
        <h2 className="text-lg font-bold">{candidate}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ['Sesi selesai', count],
            ['Soalan pernah dipaparkan', seen.ids.size],
            ['Keluarga soalan digunakan', seen.families.size],
            ['Baki soalan belum digunakan', bundle.bank.filter((q) => !seen.ids.has(q.id)).length],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-100 p-3">
              <dt className="text-xs text-slate-600">{k}</dt>
              <dd className="text-xl font-bold" data-testid={k === 'Soalan pernah dipaparkan' ? 'seen-count' : undefined}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn" href={u('/history/')}>
            Sejarah & graf perkembangan
          </a>
          <button type="button" className="btn btn-danger" onClick={clear} disabled={seen.ids.size === 0} data-testid="clear-exposures">
            Padam sejarah soalan calon ini
          </button>
        </div>
      </section>
      <Message m={msg} id="candidate-message" />
      <section className="card overflow-x-auto">
        <h2 className="mb-3 text-lg font-bold">Prestasi terkumpul mengikut topik (terlemah dahulu)</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">Belum ada sesi yang dihantar.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Subjek', 'Topik', 'Betul', 'Jumlah', '%'].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.subject + r.topic}>
                  <td className="td">{SUBJECT_LABEL[r.subject]}</td>
                  <td className="td font-medium">{r.topic}</td>
                  <td className="td">{r.correct}</td>
                  <td className="td">{r.total}</td>
                  <td className="td">{Math.round((r.correct / r.total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/* ---------------- Data & penyelarasan ---------------- */
function DataTab({ bundle, health, onChanged }: { bundle: BankBundle; health: ServerHealth | null; onChanged: () => Promise<void> }) {
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => {
    getSetting<string>('syncToken').then((t) => setToken(t ?? ''));
  }, []);

  const doSync = async () => {
    await setSetting('syncToken', token.trim());
    const r = await syncNow();
    await onChanged();
    setMsg(r.ok ? { kind: 'ok', text: `Diselaraskan: ${r.exposuresTotal} rekod sejarah soalan, ${r.sessionsPulled} sesi ditarik, ${r.approvedQuestions} item diluluskan.` } : { kind: 'error', text: r.message });
  };
  const csv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['question_id', 'question_family_id', 'template_id', 'content_hash', 'semantic_fingerprint', 'subject', 'topic', 'subtopic', 'difficulty', 'question_text', 'options', 'correct_answer', 'explanation', 'validation_status', 'verified_by_reviewer', 'source_type'];
    const lines = bundle.bank.map((q) => [q.id, q.familyId, q.templateId, q.contentHash, q.fingerprint, q.section, q.topic, q.subtopic, q.difficulty, q.question, q.options.join(' | '), q.correctAnswer === undefined ? '' : q.options[q.correctAnswer], q.explanation ?? '', q.validationStatus, q.verifiedByReviewer, q.sourceType].map(esc).join(','));
    download('bank-soalan.csv', '﻿' + [head.join(','), ...lines].join('\n'), 'text/csv');
  };

  return (
    <div className="space-y-5">
      <section className="card text-sm">
        <h2 className="mb-2 text-lg font-bold">Pelayan penyelarasan</h2>
        <p data-testid="server-status">
          {health ? `Disambungkan — pangkalan data: ${health.db === 'postgres' ? 'PostgreSQL' : 'PGlite (Postgres terbenam)'}; AI: ${health.ai ? 'aktif' : 'tidak dikonfigurasi'}; token: ${health.tokenRequired ? 'diperlukan' : 'tidak diperlukan'}.` : 'Tidak ditemui. Aplikasi berjalan dalam mod tempatan (IndexedDB); sejarah soalan tidak dikongsi merentas peranti sehingga pelayan boleh dicapai.'}
        </p>
        <label className="mt-3 block text-sm font-medium">
          Token penyelarasan (jika pelayan menetapkan SYNC_TOKEN)
          <input className="input mt-1 max-w-sm" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
        </label>
        <button type="button" className="btn btn-primary mt-3" onClick={doSync} data-testid="sync-now">
          Selaraskan sekarang
        </button>
      </section>
      <Message m={msg} id="data-message" />
      <section className="card text-sm">
        <h2 className="mb-2 text-lg font-bold">Eksport</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={async () => download('data-simulator-ukkm.json', JSON.stringify(await exportAll(), null, 2))} data-testid="export-json">
            Eksport data calon (JSON)
          </button>
          <button type="button" className="btn" onClick={csv} data-testid="export-csv">
            Eksport bank soalan (CSV)
          </button>
          {health && (
            <a className="btn" href="/api/export" target="_blank" rel="noreferrer">
              Eksport pangkalan data pelayan
            </a>
          )}
        </div>
        <p className="mt-2 text-slate-600">Laporan PDF bagi setiap sesi tersedia di halaman keputusan sesi itu.</p>
      </section>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('blueprint');
  const [bundle, setBundle] = useState<BankBundle | null>(null);
  const [seen, setSeen] = useState<Seen | null>(null);
  const [candidate, setCandidate] = useState('');
  const [health, setHealth] = useState<ServerHealth | null>(null);

  const refresh = async () => {
    const name = await getCandidateName();
    setCandidate(name);
    setSeen(await getSeen(name));
    await getVariants();
    setBundle(await loadBank());
  };
  useEffect(() => {
    refresh().catch(() => {});
    serverHealth().then(setHealth);
    syncNow().then((r) => {
      if (r.ok) refresh().catch(() => {});
    });
  }, []);

  return (
    <Shell title="Admin">
      <div className="space-y-5">
        <div role="tablist" aria-label="Bahagian Admin" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {TABS.map(([t, label]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={`btn ${tab === t ? 'btn-primary' : ''}`} onClick={() => setTab(t)} data-testid={`tab-${t}`}>
              {label}
            </button>
          ))}
        </div>
        {!bundle || !seen ? (
          <p role="status">Memuatkan…</p>
        ) : tab === 'blueprint' ? (
          <BlueprintTab bundle={bundle} seen={seen} />
        ) : tab === 'bank' ? (
          <BankTab bundle={bundle} seen={seen} health={health} onChanged={refresh} />
        ) : tab === 'review' ? (
          <ReviewTab health={health} onChanged={refresh} />
        ) : tab === 'candidate' ? (
          <CandidateTab bundle={bundle} seen={seen} candidate={candidate} onChanged={refresh} />
        ) : (
          <DataTab bundle={bundle} health={health} onChanged={refresh} />
        )}
      </div>
    </Shell>
  );
}
