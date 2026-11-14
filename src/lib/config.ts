import type { DifficultyMix, ExamConfig, ExamSection, Mode, VerificationStatus } from './types';

/** Nama lalai calon. Tiada nama sebenar dalam kod; tetapkan NEXT_PUBLIC_CANDIDATE_NAME dalam .env.local (tidak dimuat naik) atau isi nama pada peranti. */
export const CANDIDATE_DEFAULT = process.env.NEXT_PUBLIC_CANDIDATE_NAME || 'Calon';
export const TEST_DATE_ISO = '2026-11-18';
export const REVIEW_DATE = '14 November 2026';

/** Profil calon seperti dimaklumkan oleh keluarga daripada surat panggilan (surat itu sendiri tidak dilihat oleh pembangun). */
export const CANDIDATE_PROFILE = {
  category: 'Murid sekolah KPM — sudah menduduki PKSK',
  programme: 'Premier STEM-Excellence',
  choices: 'MRSM Muar · MRSM Batu Pahat',
  centre: 'MRSM Muar',
  date: '18 November 2026',
  slot: '10.30 pagi – 12.30 tengah hari (UKKM), dengan ujian tambahan STEM-Excellence',
} as const;

export const SRC = {
  portal: 'https://mrsm.mara.gov.my/mymrsm/',
  syarat: 'https://mrsm.mara.gov.my/mymrsm/Syarat%20dan%20Pilihan%20Program%20MRSM.pdf',
  panduan: 'https://mrsm.mara.gov.my/mymrsm/Buku%20Panduan%20Permohonan%20MRSM.pdf',
  faq: 'https://mrsm.mara.gov.my/mymrsm/FAQ%20MYMRSM2026.pdf',
  semakan: 'https://mrsm.mara.gov.my/semakanukkmf1/',
} as const;

export const STEM_TOPICS = {
  matematik: ['Penaakulan Matematik', 'Masalah Bukan Rutin'],
  sains: ['Aplikasi Sains', 'Pemikiran Saintifik', 'Situasi STEM'],
  logik: ['Analisis Data', 'Penaakulan Logik', 'Pemikiran Komputasional'],
} as const;

const P: VerificationStatus = 'UNVERIFIED_PRACTICE';
const MIX: DifficultyMix = { easy: 15, medium: 40, hard: 30, advanced: 15 };
const MIX_STEM: DifficultyMix = { easy: 5, medium: 35, hard: 35, advanced: 25 };
const NOTE =
  'Bilangan soalan dan tempoh ialah preset latihan. MARA tidak menerbitkan spesifikasi komponen ini bagi calon sekolah KPM selepas PKSK (sesi 2027).';

const ukkmSections: ExamSection[] = [
  { id: 'matematik', title: 'Matematik', enabled: true, bank: ['matematik'], questionCount: 30, durationMinutes: 45, difficulty: MIX, scored: true, verificationStatus: P, note: NOTE },
  { id: 'sains', title: 'Sains', enabled: true, bank: ['sains'], questionCount: 30, durationMinutes: 40, difficulty: MIX, scored: true, verificationStatus: P, note: NOTE },
  {
    id: 'keperibadian', title: 'Keupayaan / Keperibadian', enabled: false, bank: ['keperibadian'], questionCount: 30, durationMinutes: 15,
    difficulty: { easy: 0, medium: 100, hard: 0, advanced: 0 }, scored: false, verificationStatus: P,
    note: 'Modul pilihan — dinyahaktifkan secara lalai. Tidak disahkan sebagai komponen UKKM bagi calon KPM selepas PKSK. Tiada skor psikometrik dikeluarkan.',
  },
  {
    id: 'bm', title: 'Bahasa Melayu', enabled: false, bank: ['bm'], questionCount: 20, durationMinutes: 25, difficulty: MIX, scored: true, verificationStatus: P,
    note: 'Dinyahaktifkan secara lalai. Dokumen rasmi menyenaraikan Bahasa Melayu sebagai subjek UKKM di bawah tajuk calon sekolah swasta tidak berdaftar KPM; tidak disahkan bagi calon KPM selepas PKSK.',
  },
];

const STEM_NOTE = 'Blueprint rasmi Ujian Khas Premier STEM-Excellence tidak diterbitkan. Bidang, bilangan soalan dan tempoh ialah cadangan latihan.';
const stemSections: ExamSection[] = [
  { id: 'stem-matematik', title: 'STEM: Penaakulan Matematik & Masalah Bukan Rutin', enabled: true, bank: ['stem'], topics: [...STEM_TOPICS.matematik], questionCount: 15, durationMinutes: 25, difficulty: MIX_STEM, scored: true, verificationStatus: P, note: STEM_NOTE },
  { id: 'stem-sains', title: 'STEM: Sains & Pemikiran Saintifik', enabled: true, bank: ['stem'], topics: [...STEM_TOPICS.sains], questionCount: 15, durationMinutes: 20, difficulty: MIX_STEM, scored: true, verificationStatus: P, note: STEM_NOTE },
  { id: 'stem-logik', title: 'STEM: Data, Logik & Pemikiran Komputasional', enabled: true, bank: ['stem'], topics: [...STEM_TOPICS.logik], questionCount: 15, durationMinutes: 20, difficulty: MIX_STEM, scored: true, verificationStatus: P, note: STEM_NOTE },
];

const base = { year: 2027, programme: 'Premier STEM-Excellence', candidateCategory: 'KPM_SELEPAS_PKSK', formatStatus: P, allowBackNavigation: true, allowCalculator: false, shuffleQuestions: true, shuffleOptions: true, noRepeat: 'item' } as const;

export const DEFAULT_CONFIGS: Record<Mode, ExamConfig> = {
  ukkm: { ...base, id: 'ukkm', name: 'UKKM — Matematik & Sains', description: 'Latihan Matematik dan Sains Tahun 4–6. Keperibadian dan Bahasa Melayu boleh diaktifkan di Admin jika disahkan diperlukan.', sections: ukkmSections },
  stem: { ...base, id: 'stem', name: 'Ujian Khas Premier STEM-Excellence', description: 'Latihan penaakulan matematik, pemikiran saintifik, analisis data, logik dan pemikiran komputasional.', sections: stemSections },
  full: {
    ...base, id: 'full', name: 'Simulasi Penuh — UKKM + STEM-Excellence',
    description: 'Komponen UKKM yang diaktifkan diikuti seksyen STEM-Excellence dalam satu sesi. PKSK tidak dimasukkan.',
    sections: [...ukkmSections.map((s) => ({ ...s, id: 'full-' + s.id })), ...stemSections.map((s) => ({ ...s, id: 'full-' + s.id }))],
  },
};

export const MODES: Mode[] = ['ukkm', 'stem', 'full'];

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  OFFICIAL_2027_VERIFIED: 'Rasmi 2027 (disahkan)',
  PREVIOUS_YEAR_REFERENCE: 'Rujukan tahun terdahulu',
  UNVERIFIED_PRACTICE: 'Latihan (belum disahkan)',
};

export const presetLabel = (s: VerificationStatus): string =>
  s === 'OFFICIAL_2027_VERIFIED' ? 'FORMAT RASMI 2027 (DISAHKAN)' : s === 'PREVIOUS_YEAR_REFERENCE' ? 'RUJUKAN TAHUN TERDAHULU' : 'PRESET LATIHAN — BELUM DISAHKAN';

export interface EvidenceRow {
  item: string;
  finding: string;
  source: string;
  sourceUrl?: string;
  docYear: string;
  covers: string;
  status: VerificationStatus;
}

const O: VerificationStatus = 'OFFICIAL_2027_VERIFIED';
/** Ringkasan; versi penuh di docs/FORMAT-UKKM-2027.md. Tarikh semakan: 14 November 2026. */
export const EVIDENCE: EvidenceRow[] = [
  { item: 'Calon sekolah KPM wajib menduduki PKSK', finding: 'PKSK ialah pentaksiran KPM; berasingan daripada ujian MARA.', source: 'Syarat dan Pilihan Program MRSM hlm 13; FAQ Soalan 3', sourceUrl: SRC.syarat, docYear: '2027', covers: 'Calon sekolah berdaftar KPM', status: O },
  { item: 'Calon KPM lulus PKSK + Program Khas pilihan pertama → Ujian Khas MARA', finding: 'Premier STEM-Excellence tersenarai sebagai Program Khas yang mempunyai Ujian Khas.', source: 'FAQ Soalan 3, 9, 10; Syarat hlm 15', sourceUrl: SRC.faq, docYear: '2027', covers: 'Calon KPM selepas PKSK', status: O },
  { item: 'Calon KPM lulus PKSK + Program Premier pilihan pertama → UKKM', finding: '“Calon yang melepasi PKSK dan memilih Program Premier sebagai pilihan pertama WAJIB menduduki UKKM.”', source: 'FAQ Soalan 3', sourceUrl: SRC.faq, docYear: '2027', covers: 'Calon KPM selepas PKSK (Program Premier)', status: O },
  { item: 'Subjek UKKM: Bahasa Melayu, Matematik, Sains, Keperibadian', finding: 'Disenaraikan di bawah tajuk “UKKM (calon dari sekolah swasta yang tidak berdaftar KPM)”. Tidak dinyatakan bagi calon KPM selepas PKSK.', source: 'Syarat dan Pilihan Program MRSM hlm 15', sourceUrl: SRC.syarat, docYear: '2027', covers: 'Calon sekolah swasta tidak berdaftar KPM SAHAJA', status: O },
  { item: 'Komponen UKKM bagi calon KPM selepas PKSK', finding: 'Tidak diterbitkan. Sama ada Matematik/Sains diuji semula atau Keperibadian diperlukan tidak dapat disahkan.', source: '—', docYear: '—', covers: 'Calon KPM selepas PKSK', status: P },
  { item: 'Slot ujian calon: 10.30 pagi – 12.30 tengah hari, MRSM Muar, 18 Nov 2026, dengan ujian tambahan STEM-Excellence', finding: 'Dimaklumkan oleh keluarga daripada surat panggilan. Surat tidak dilihat oleh pembangun; pembahagian masa antara komponen tidak diketahui.', source: 'Surat panggilan UKKM 2027 (laporan keluarga)', sourceUrl: SRC.semakan, docYear: '2027', covers: 'Calon ini', status: P },
  { item: 'Bilangan soalan & masa setiap komponen', finding: 'Tidak diterbitkan dalam mana-mana dokumen rasmi yang dicapai.', source: '—', docYear: '—', covers: 'Semua kategori', status: P },
  { item: 'Format Ujian Khas Premier STEM-Excellence (skop, bilangan soalan, masa)', finding: 'Tidak diterbitkan. Hanya nama ujian disenaraikan.', source: 'Syarat hlm 15', sourceUrl: SRC.syarat, docYear: '2027', covers: 'Semua kategori', status: P },
  { item: 'Jenis soalan (objektif/subjektif), antaramuka, arahan calon', finding: 'Tiada contoh antaramuka atau arahan calon diterbitkan. Halaman semakan hanya mengandungi borang log masuk.', source: 'Halaman Semakan UKKM T1 2027', sourceUrl: SRC.semakan, docYear: '2027', covers: 'Semua kategori', status: P },
  { item: 'Dakwaan: 40 soalan Matematik/40 minit; 30 soalan Sains; 80 item Keperibadian; 35 minit STEM-Excellence; 20 soalan/30 minit; ujian 2 jam 4 subjek', finding: 'Daripada laman pihak ketiga dan maklumat terdahulu; saling bercanggah; tiada dokumen rasmi; kategori calon tidak jelas. TIDAK digunakan sebagai format rasmi.', source: 'Laman bukan rasmi (cikguonline, infosini, ecentral dll.)', docYear: 'Kitaran terdahulu / tidak dinyatakan', covers: 'Tidak jelas', status: 'PREVIOUS_YEAR_REFERENCE' },
];
