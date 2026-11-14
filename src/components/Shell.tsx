import { u } from '@/lib/base';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/', label: 'Utama' },
  { href: '/practice/', label: 'Mod Latihan' },
  { href: '/history/', label: 'Sejarah' },
  { href: '/format/', label: 'Format & Bukti' },
  { href: '/admin/', label: 'Admin' },
];

export default function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-200 bg-blue-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <a href={u('/')} className="text-base font-bold">
            Simulator UKKM MRSM 2027 <span className="font-normal text-blue-200">· latihan tidak rasmi</span>
          </a>
          <nav aria-label="Navigasi utama" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map((n) => (
              <a key={n.href} href={u(n.href)} className="rounded px-1 py-1 text-blue-100 underline-offset-4 hover:text-white hover:underline">
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">{title}</h1>
        {children}
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-slate-500">
        Bukan sistem rasmi MARA atau KPM. Markah simulasi bukan skor merit kemasukan.
      </footer>
    </div>
  );
}
