import Shell from '@/components/Shell';
import StatusBadge from '@/components/StatusBadge';
import { EVIDENCE, REVIEW_DATE, SRC } from '@/lib/config';

export default function FormatPage() {
  return (
    <Shell title="Format & Bukti">
      <div className="space-y-6">
        <section className="card text-sm leading-relaxed">
          <p>
            Tiada dokumen rasmi MARA menyatakan format UKKM bagi calon sekolah KPM selepas PKSK atau format Ujian Khas STEM-Excellence, jadi semua tetapan ujian di sini ialah latihan sahaja. Disemak {REVIEW_DATE}.
          </p>
        </section>

        <section className="card overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Maklumat format', 'Dapatan', 'Sumber', 'Tahun dokumen', 'Kategori calon diliputi', 'Status'].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVIDENCE.map((e) => (
                <tr key={e.item}>
                  <td className="td align-top font-medium">{e.item}</td>
                  <td className="td align-top">{e.finding}</td>
                  <td className="td align-top">
                    {e.sourceUrl ? (
                      <a className="underline" href={e.sourceUrl} target="_blank" rel="noreferrer">
                        {e.source}
                      </a>
                    ) : (
                      e.source
                    )}
                  </td>
                  <td className="td align-top">{e.docYear}</td>
                  <td className="td align-top">{e.covers}</td>
                  <td className="td align-top">
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card text-sm">
          <h2 className="mb-2 text-lg font-bold">Sumber rasmi yang disemak</h2>
          <ul className="list-disc space-y-1 pl-5">
            {Object.entries(SRC).map(([k, url]) => (
              <li key={k}>
                <a className="break-all underline" href={url} target="_blank" rel="noreferrer">
                  {decodeURI(url)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
