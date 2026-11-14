'use client';

import { u } from '@/lib/base';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { deleteSession, listSessions, loadBank } from '@/lib/db';
import { syncNow } from '@/lib/sync';
import { formatDuration, scoreSession } from '@/lib/engine';
import type { ExamResult, Session } from '@/lib/types';

type Row = { session: Session; result: ExamResult | null };

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = async () => {
    const all = await listSessions();
    const { map } = await loadBank();
    setRows(all.map((session) => ({ session, result: session.status === 'submitted' ? scoreSession(session, map) : null })));
  };
  useEffect(() => {
    load().catch(() => setRows([]));
    // Tarik sesi dari peranti lain (jika pelayan tersedia), kemudian muat semula.
    syncNow().then((r) => {
      if (r.ok) load().catch(() => {});
    });
  }, []);

  const remove = async (s: Session) => {
    if (!window.confirm('Padam rekod percubaan ini pada peranti ini? Soalan yang telah dipaparkan kekal dalam sejarah tanpa pengulangan.')) return;
    await deleteSession(s.id);
    await load();
  };

  const done = (rows ?? []).filter((r) => r.result);
  const trend = done.slice().reverse().slice(-12);

  return (
    <Shell title="Sejarah percubaan">
      {rows === null ? (
        <p role="status">Memuatkan…</p>
      ) : rows.length === 0 ? (
        <p className="card">Belum ada percubaan. Mulakan satu mod dari <a className="underline" href={u('/')}>halaman utama</a>.</p>
      ) : (
        <div className="space-y-6">
          {trend.length > 1 && (
            <section className="card">
              <h2 className="mb-3 text-lg font-bold">Graf perkembangan markah latihan (percubaan terkini di kanan)</h2>
              <div className="flex h-40 items-end gap-2" role="img" aria-label={`Trend markah: ${trend.map((t) => `${t.result!.percent}%`).join(', ')}`}>
                {trend.map((t) => (
                  <div key={t.session.id} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-xs font-semibold">{t.result!.percent}%</span>
                    <div className="w-full max-w-[48px] rounded-t bg-blue-700" style={{ height: `${Math.max(2, t.result!.percent)}%` }} />
                    <span className="text-[10px] uppercase text-slate-500">{t.session.mode}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="card overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Tarikh', 'Mod', 'Calon', 'Markah latihan', 'Betul / Salah / Kosong', 'Masa', ''].map((h, i) => (
                    <th key={i} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ session: s, result: r }) => (
                  <tr key={s.id} data-testid="history-row">
                    <td className="td whitespace-nowrap">{new Date(s.startedAt).toLocaleString('ms-MY')}</td>
                    <td className="td">{s.title}</td>
                    <td className="td">{s.candidateName}</td>
                    <td className="td font-semibold">{r ? `${r.percent}% (${r.correct}/${r.total})` : 'Sedang berjalan'}</td>
                    <td className="td">{r ? `${r.correct} / ${r.wrong} / ${r.unanswered}` : '—'}</td>
                    <td className="td">{r ? formatDuration(r.timeUsedSec) : '—'}</td>
                    <td className="td">
                      <span className="flex gap-2">
                        <a className="btn !min-h-[36px]" href={r ? `/results/?id=${encodeURIComponent(s.id)}` : `/exam/?mode=${s.mode}`}>
                          {r ? 'Lihat' : 'Sambung'}
                        </a>
                        <button type="button" className="btn !min-h-[36px]" onClick={() => remove(s)}>
                          Padam
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </Shell>
  );
}
