'use client';

import { u } from '@/lib/base';
import { useEffect } from 'react';

/** Daftar service worker (hanya wujud dalam binaan produksi: out/sw.js). */
export default function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(u('/sw.js')).catch(() => {
      /* luar talian tidak tersedia; aplikasi masih berfungsi dalam talian */
    });
  }, []);
  return null;
}
