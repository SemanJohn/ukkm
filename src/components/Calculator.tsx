'use client';

import { useState } from 'react';

type Op = '+' | '−' | '×' | '÷';

function apply(a: number, b: number, op: Op): number {
  if (op === '+') return a + b;
  if (op === '−') return a - b;
  if (op === '×') return a * b;
  return b === 0 ? NaN : a / b;
}

const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 1e10) / 1e10) : 'Ralat');

/** Kalkulator empat operasi. Hanya dipaparkan jika konfigurasi membenarkan kalkulator. */
export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  const digit = (d: string) => {
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d);
      setFresh(false);
    } else if (d === '.' && display.includes('.')) {
      return;
    } else if (display.length < 14) {
      setDisplay(display === '0' && d !== '.' ? d : display + d);
    }
  };
  const operator = (next: Op) => {
    const cur = Number(display);
    if (acc !== null && op && !fresh) {
      const r = apply(acc, cur, op);
      setAcc(r);
      setDisplay(fmt(r));
    } else {
      setAcc(cur);
    }
    setOp(next);
    setFresh(true);
  };
  const equals = () => {
    if (acc === null || !op) return;
    const r = apply(acc, Number(display), op);
    setDisplay(fmt(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };
  const clear = () => {
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const keys: (string | Op)[] = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'];
  return (
    <div className="w-56 rounded-xl border border-slate-300 bg-white p-3 shadow-lg" role="group" aria-label="Kalkulator">
      <output className="mb-2 block rounded bg-slate-900 px-3 py-2 text-right font-mono text-lg text-white" aria-live="polite" data-testid="calc-display">
        {display}
      </output>
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className="btn !min-h-[40px] !px-0"
            onClick={() => (k === '=' ? equals() : ['+', '−', '×', '÷'].includes(k) ? operator(k as Op) : digit(k))}
          >
            {k}
          </button>
        ))}
        <button type="button" className="btn col-span-4 !min-h-[36px]" onClick={clear}>
          Padam (C)
        </button>
      </div>
    </div>
  );
}
