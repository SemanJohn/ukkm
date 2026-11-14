/** Utiliti teks untuk pengesanan pendua: cincang kandungan, cap jari semantik dan persamaan Jaccard. */

function fnv(s: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const hex = (s: string) => fnv(s, 2166136261).toString(16).padStart(8, '0') + fnv(s, 0x9e3779b1).toString(16).padStart(8, '0');

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Cincang kandungan tepat: teks soalan + pilihan (tertib pilihan tidak penting). */
export function contentHash(question: string, options: string[]): string {
  return hex(`${norm(question)}|${options.map(norm).sort().join('|')}`);
}

const STOP = new Set(['yang', 'dan', 'di', 'ke', 'itu', 'ini', 'dengan', 'untuk', 'pada', 'ialah', 'adalah', 'dalam', 'dari', 'daripada', 'akan', 'oleh', 'sebuah', 'seorang', 'apakah', 'berapakah', 'manakah', 'jika', 'setiap', 'ada', 'the', 'a']);

/** Token bermakna: huruf sahaja, nombor dibuang, kata tugas dibuang. */
export function tokens(text: string): string[] {
  return norm(text)
    .replace(/[0-9]+([.,][0-9]+)?/g, ' ')
    .replace(/[^a-zÀ-ɏ ]/g, ' ')
    .split(' ')
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Cap jari semantik: set token tersusun — sama bagi dua soalan yang hanya berbeza nombor. */
export function fingerprint(question: string): string {
  return hex([...new Set(tokens(question))].sort().join(' '));
}

export function jaccard(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Ungkapan `calc` hanya boleh mengandungi aritmetik asas — selamat untuk dinilai walaupun datang daripada AI. */
export const SAFE_CALC = /^[0-9+\-*/().,%\s]+$/;

export function evalCalc(expr: string, trusted = false): number {
  if (!trusted && !SAFE_CALC.test(expr)) throw new Error('Ungkapan calc mengandungi aksara tidak dibenarkan');
  return Number(new Function(`"use strict"; return (${expr});`)());
}

/** Nilai berangka pertama dalam teks pilihan: "RM5.60" → 5.6, "1 3/8" → 1.375, "3/4" → 0.75. */
export function parseNumeric(text: string): number | null {
  const m = text.replace(/RM\s*/g, '').match(/(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+)|\/(\d+))?/);
  if (!m) return null;
  const a = Number(m[1]);
  if (m[2]) return a + Number(m[2]) / Number(m[3]);
  if (m[4]) return a / Number(m[4]);
  return a;
}

export const closeTo = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
