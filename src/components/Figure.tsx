import type { Figure as Fig } from '@/lib/types';

const COLORS = ['#1d4ed8', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];

function niceMax(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function Axes({ max, yLabel }: { max: number; yLabel?: string }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g>
      {ticks.map((t) => {
        const y = 190 - t * 160;
        return (
          <g key={t}>
            <line x1={50} x2={410} y1={y} y2={y} stroke="#e2e8f0" />
            <text x={44} y={y + 4} textAnchor="end" fontSize={11} fill="#475569">
              {Math.round(max * t * 100) / 100}
            </text>
          </g>
        );
      })}
      <line x1={50} x2={50} y1={30} y2={190} stroke="#64748b" />
      <line x1={50} x2={410} y1={190} y2={190} stroke="#64748b" />
      {yLabel && (
        <text x={14} y={110} fontSize={11} fill="#475569" textAnchor="middle" transform="rotate(-90 14 110)">
          {yLabel}
        </text>
      )}
    </g>
  );
}

export default function Figure({ figure }: { figure: Fig }) {
  if (figure.type === 'table') {
    return (
      <figure className="my-4 overflow-x-auto">
        {figure.caption && <figcaption className="mb-1 text-sm font-semibold text-slate-700">{figure.caption}</figcaption>}
        <table className="min-w-[260px] border-collapse border border-slate-300 text-sm">
          <thead>
            <tr>
              {figure.headers.map((h) => (
                <th key={h} scope="col" className="border border-slate-300 bg-slate-100 px-3 py-1.5 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {figure.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="border border-slate-300 px-3 py-1.5">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    );
  }

  const desc = figure.labels.map((l, i) => `${l}: ${figure.values[i]}`).join('; ');

  if (figure.type === 'pie') {
    const total = figure.values.reduce((a, b) => a + b, 0);
    let angle = -Math.PI / 2;
    const slices = figure.values.map((v, i) => {
      const a0 = angle;
      const a1 = angle + (v / total) * Math.PI * 2;
      angle = a1;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number) => `${100 + 80 * Math.cos(a)},${100 + 80 * Math.sin(a)}`;
      return <path key={i} d={`M100,100 L${p(a0)} A80,80 0 ${large} 1 ${p(a1)} Z`} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />;
    });
    return (
      <figure className="my-4">
        {figure.caption && <figcaption className="mb-1 text-sm font-semibold text-slate-700">{figure.caption}</figcaption>}
        <div className="flex flex-wrap items-center gap-4">
          <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0" role="img" aria-label={`Carta pai. ${desc}`}>
            {slices}
          </svg>
          <ul className="space-y-1 text-sm">
            {figure.labels.map((l, i) => (
              <li key={l} className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
                {l}: <strong>{figure.values[i]}</strong>
              </li>
            ))}
          </ul>
        </div>
      </figure>
    );
  }

  const max = niceMax(Math.max(...figure.values));
  const n = figure.values.length;
  const step = 360 / n;
  const y = (v: number) => 190 - (v / max) * 160;
  return (
    <figure className="my-4">
      {figure.caption && <figcaption className="mb-1 text-sm font-semibold text-slate-700">{figure.caption}</figcaption>}
      <svg viewBox="0 0 420 225" className="w-full max-w-lg" role="img" aria-label={`${figure.type === 'bar' ? 'Carta palang' : 'Graf garis'}. ${desc}`}>
        <Axes max={max} yLabel={figure.yLabel} />
        {figure.type === 'bar' &&
          figure.values.map((v, i) => (
            <g key={i}>
              <rect x={50 + i * step + step * 0.2} y={y(v)} width={step * 0.6} height={190 - y(v)} fill="#1d4ed8" />
              <text x={50 + i * step + step / 2} y={y(v) - 4} textAnchor="middle" fontSize={11} fill="#0f172a">
                {v}
              </text>
            </g>
          ))}
        {figure.type === 'line' && (
          <g>
            <polyline fill="none" stroke="#1d4ed8" strokeWidth={2} points={figure.values.map((v, i) => `${50 + i * step + step / 2},${y(v)}`).join(' ')} />
            {figure.values.map((v, i) => (
              <g key={i}>
                <circle cx={50 + i * step + step / 2} cy={y(v)} r={4} fill="#1d4ed8" />
                <text x={50 + i * step + step / 2} y={y(v) - 8} textAnchor="middle" fontSize={11} fill="#0f172a">
                  {v}
                </text>
              </g>
            ))}
          </g>
        )}
        {figure.labels.map((l, i) => (
          <text key={l} x={50 + i * step + step / 2} y={206} textAnchor="middle" fontSize={11} fill="#334155">
            {l}
          </text>
        ))}
      </svg>
    </figure>
  );
}
