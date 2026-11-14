import { DIFF_LABEL as DIFF, SUBJECT_LABEL, type ExamResult, type Question, type Session } from './types';
import { formatDuration } from './engine';


/** Tukar aksara di luar set fon PDF piawai. */
const clean = (s: string) =>
  s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/→/g, '->')
    .replace(/−/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...');

export async function exportReportPdf(session: Session, result: ExamResult, bank: Map<string, Question>): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 40;
  let y = 48;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const heading = (text: string) => {
    if (y > 740) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold').setFontSize(12).text(clean(text), left, y);
    y += 8;
  };
  const table = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, {
      startY: y,
      head: [head.map(clean)],
      body: body.map((r) => r.map((c) => clean(String(c)))),
      margin: { left, right: left },
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    y = lastY() + 22;
  };

  doc.setFont('helvetica', 'bold').setFontSize(16).text('Laporan Latihan - Simulator UKKM MRSM 2027', left, y);
  y += 18;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(120, 53, 15);
  doc.text('Simulasi latihan tidak rasmi. Bukan keputusan MARA, bukan skor merit, dan bukan ramalan tawaran.', left, y);
  doc.setTextColor(0, 0, 0);
  y += 20;

  doc.setFontSize(10);
  const submitted = session.submittedAt ? new Date(session.submittedAt).toLocaleString('ms-MY') : '-';
  const info = [
    `Calon: ${session.candidateName}`,
    `Mod: ${session.title} (${session.presetLabel})`,
    `Dihantar: ${submitted}${session.autoSubmitted ? ' (automatik - masa tamat)' : ''}`,
    `Markah latihan: ${result.correct}/${result.total} (${result.percent}%)`,
    `Betul: ${result.correct}   Salah: ${result.wrong}   Tidak dijawab: ${result.unanswered}`,
    `Masa digunakan: ${formatDuration(result.timeUsedSec)}`,
  ];
  for (const line of info) {
    doc.text(clean(line), left, y);
    y += 14;
  }
  y += 10;

  heading('Prestasi mengikut seksyen');
  table(
    ['Seksyen', 'Betul', 'Salah', 'Tidak dijawab', 'Jumlah', '%', 'Masa'],
    result.sections.map((s) =>
      s.scored
        ? [s.title, s.correct, s.wrong, s.unanswered, s.total, `${s.percent}%`, formatDuration(s.usedSec)]
        : [s.title, '-', '-', s.unanswered, s.total, 'Tidak dimarkah', formatDuration(s.usedSec)],
    ),
  );

  if (result.bySubject.length) {
    heading('Markah mengikut subjek');
    table(
      ['Subjek', 'Betul', 'Salah', 'Tidak dijawab', 'Jumlah', '%'],
      result.bySubject.map((t) => [SUBJECT_LABEL[t.subject], t.correct, t.wrong, t.unanswered, t.total, `${t.percent}%`]),
    );
  }

  if (result.byDifficulty.length) {
    heading('Prestasi mengikut aras kesukaran');
    table(
      ['Aras', 'Betul', 'Jumlah', '%'],
      result.byDifficulty.map((d) => [DIFF[d.difficulty], d.correct, d.total, `${d.percent}%`]),
    );
  }

  if (result.byTopic.length) {
    heading('Prestasi mengikut topik (terlemah dahulu)');
    table(
      ['Seksyen', 'Topik', 'Betul', 'Jumlah', '%'],
      result.byTopic.map((t) => [t.group, t.topic, t.correct, t.total, `${t.percent}%`]),
    );
  }

  heading('Topik lemah dan cadangan latihan susulan');
  doc.setFont('helvetica', 'normal').setFontSize(10);
  y += 8;
  for (const sug of [`Topik lemah: ${result.weakTopics.length ? result.weakTopics.join(', ') : 'tiada'}`, ...result.suggestions]) {
    const lines = doc.splitTextToSize(clean(`- ${sug}`), 515) as string[];
    if (y + lines.length * 13 > 790) {
      doc.addPage();
      y = 48;
    }
    doc.text(lines, left, y);
    y += lines.length * 13 + 3;
  }
  y += 14;

  const revise = result.review.filter((r) => r.status === 'wrong' || r.status === 'unanswered');
  if (revise.length) {
    heading('Soalan yang perlu diulang kaji');
    table(
      ['Seksyen', 'No.', 'ID item', 'Topik', 'Aras', 'Status'],
      revise.map((r) => {
        const q = bank.get(r.qid);
        return [r.sectionTitle, r.number, r.qid, q?.topic ?? '', q ? DIFF[q.difficulty] : '', r.status === 'wrong' ? 'Salah' : 'Tidak dijawab'];
      }),
    );
  }

  doc.save(`laporan-mrsm-${session.mode}-${new Date(session.submittedAt ?? Date.now()).toISOString().slice(0, 10)}.pdf`);
}
