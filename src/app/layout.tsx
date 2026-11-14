import { u } from '@/lib/base';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import SWRegister from '@/components/SWRegister';

export const metadata: Metadata = {
  title: 'Simulator UKKM MRSM 2027 — Latihan Tidak Rasmi',
  description: 'Simulasi latihan tidak rasmi bagi UKKM dan Ujian Khas Premier STEM-Excellence MRSM Tingkatan 1 2027. Bukan sistem rasmi MARA.',
  manifest: u('/manifest.webmanifest'),
  icons: { icon: u('/icon-192.png'), apple: u('/icon-192.png') },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3a8a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body>
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
