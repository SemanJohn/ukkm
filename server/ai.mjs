// Penjanaan soalan dengan Claude (pilihan). Hanya aktif jika kelayakan Anthropic dikonfigurasi pada pelayan.
// Hasilnya ialah DRAF MENTAH: klien menjalankan semakan jawapan/pendua, dan setiap item dikuarantin
// (`pending_review`) sehingga diluluskan oleh penyemak manusia.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const SUBJECT = { matematik: 'Matematik KSSR Tahun 4–6', sains: 'Sains KSSR Tahun 4–6', stem: 'penaakulan STEM (logik, analisis data, pemikiran saintifik, pemikiran komputasional) aras Tahun 6' };

async function ask(client, system, user) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    // Jika permintaan ditolak oleh pengelas keselamatan, API mencuba semula pada model sandaran.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: user }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('Model enggan menjawab permintaan ini.');
  if (message.stop_reason === 'max_tokens') throw new Error('Respons model terpotong (max_tokens). Kurangkan bilangan item.');
  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('Respons model tidak mengandungi tatasusunan JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * GENERATE → CHECK FACTS (penyelesai bebas).
 * Pulangkan [{ item, aiCheck: { chosen, agrees } }]. `avoid` ialah senarai soalan sedia ada dalam topik itu.
 */
export async function generateItems({ subject, topic, difficulty, count, avoid = [] }) {
  if (!SUBJECT[subject]) throw new Error('Subjek tidak disokong untuk penjanaan AI.');
  const client = new Anthropic();
  const system =
    'Anda menulis soalan latihan asli dalam Bahasa Melayu baku untuk murid Tahun 6 di Malaysia. ' +
    'Soalan mestilah asli (bukan soalan peperiksaan sebenar), tepat dari segi fakta, selaras dengan kurikulum KSSR, dan mempunyai SATU jawapan betul sahaja. ' +
    'Balas dengan tatasusunan JSON sahaja, tanpa teks lain.';
  const user = `Tulis ${count} soalan objektif empat pilihan bagi ${SUBJECT[subject]}, topik "${topic}", aras kesukaran "${difficulty}" (easy | medium | hard | advanced; advanced = KBAT berbilang langkah).

Setiap elemen tatasusunan ialah objek dengan medan TEPAT berikut:
- "question": teks soalan (lengkap dan boleh difahami tanpa rajah)
- "options": tatasusunan 4 rentetan berbeza; pengganggu mewakili kesilapan lazim yang munasabah
- "correctAnswer": indeks 0–3 bagi pilihan yang betul (pelbagaikan kedudukan)
- "explanation": penjelasan ringkas jalan kerja atau sebab
- "subtopic": subtopik ringkas
- "calc": HANYA jika jawapan ialah satu nombor — ungkapan aritmetik yang menghasilkan jawapan itu, menggunakan digit dan + - * / ( ) sahaja; jika tidak, tinggalkan medan ini

Jangan gunakan pilihan seperti "Semua di atas". Jangan ulangi atau ubah suai sedikit mana-mana soalan sedia ada berikut:
${avoid.slice(0, 60).map((q) => `- ${q}`).join('\n') || '(tiada)'}`;

  const drafts = await ask(client, system, user);
  if (!Array.isArray(drafts)) throw new Error('Format draf tidak sah.');
  const usableDrafts = drafts.filter((d) => d && typeof d.question === 'string' && Array.isArray(d.options) && d.options.length === 4).slice(0, count);

  // CHECK FACTS: panggilan berasingan menyelesaikan setiap soalan TANPA melihat skema jawapan.
  const solved = await ask(
    client,
    'Anda penyemak soalan yang teliti. Selesaikan setiap soalan secara bebas. Jika soalan cacat (tiada jawapan betul, lebih daripada satu jawapan betul, atau fakta salah), gunakan -1. Balas dengan tatasusunan JSON sahaja.',
    `Bagi setiap soalan, pulangkan objek {"i": nombor soalan, "answer": indeks 0–3 pilihan yang betul atau -1, "issue": sebab ringkas jika -1 atau rentetan kosong}.\n\n${usableDrafts
      .map((d, i) => `Soalan ${i}: ${d.question}\n${d.options.map((o, k) => `  ${k}. ${o}`).join('\n')}`)
      .join('\n\n')}`,
  );
  const byIndex = new Map((Array.isArray(solved) ? solved : []).map((s) => [s.i, s]));
  return usableDrafts.map((d, i) => {
    const s = byIndex.get(i);
    return {
      item: { question: d.question, options: d.options, correctAnswer: d.correctAnswer, explanation: d.explanation, subtopic: d.subtopic || topic, calc: typeof d.calc === 'string' ? d.calc : undefined, section: subject, topic, difficulty },
      aiCheck: { chosen: s?.answer ?? null, agrees: s?.answer === d.correctAnswer, issue: s?.issue || '' },
      model: MODEL,
    };
  });
}

/** Tukar ralat SDK kepada mesej yang boleh dipaparkan. */
export function describeAiError(error) {
  if (error instanceof Anthropic.AuthenticationError) return 'Kelayakan Anthropic tidak sah.';
  if (error instanceof Anthropic.RateLimitError) return 'Had kadar API dicapai. Cuba sebentar lagi.';
  if (error instanceof Anthropic.BadRequestError) return `Permintaan ditolak oleh API: ${error.message}`;
  if (error instanceof Anthropic.APIConnectionError) return 'Tidak dapat menghubungi API Anthropic.';
  if (error instanceof Anthropic.APIError) return `Ralat API ${error.status}: ${error.message}`;
  return String(error?.message ?? error);
}
