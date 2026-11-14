# Simulator UKKM MRSM 2027 — latihan tidak rasmi

Simulasi UKKM dan Ujian Khas Premier STEM-Excellence bagi kemasukan MRSM Tingkatan 1 2027, khusus untuk **murid sekolah KPM yang sudah menduduki PKSK**.

> **Bukan sistem rasmi MARA atau KPM.** Tiada soalan rasmi. MARA tidak menerbitkan komponen, bilangan soalan atau tempoh UKKM bagi calon KPM selepas PKSK, mahupun format Ujian Khas STEM-Excellence. Semua blueprint berstatus `UNVERIFIED_PRACTICE`. Markah simulasi bukan skor merit dan tidak meramalkan tawaran. Butiran: [docs/FORMAT-UKKM-2027.md](docs/FORMAT-UKKM-2027.md).

## Cara menjalankan

Perlu Node.js 20 atau lebih baharu.

```bash
npm install
```

```bash
npm run build
```

```bash
npm start
```

Buka http://localhost:3000. `npm start` menghidangkan aplikasi **dan** pelayan penyelarasan. Port lain: `node server/index.mjs 8080`.

### Pangkalan data

| Tetapan | Kesan |
|---|---|
| (tiada) | PGlite — enjin PostgreSQL terbenam; data dalam `%LOCALAPPDATA%\simulator-ukkm-mrsm\pglite` (di luar Google Drive; tukar dengan `DATA_DIR`). Tiada pemasangan diperlukan. |
| `DATABASE_URL=postgres://…` | PostgreSQL sebenar melalui Drizzle ORM. Jadual dicipta secara automatik. |
| `SYNC_TOKEN=…` | Semua panggilan `/api` memerlukan token ini (masukkan di Admin → Data & penyelarasan). Tetapkan jika pelayan boleh dicapai dari luar rumah. |
| `ANTHROPIC_API_KEY=…` | Mengaktifkan penjanaan soalan AI (pilihan). `ANTHROPIC_MODEL` menukar model (lalai `claude-opus-5-5`). |

Laluan PostgreSQL sebenar (`DATABASE_URL`) dan panggilan AI langsung **tidak diuji** pada komputer ini (tiada PostgreSQL atau kunci API dipasang). Ujian pelayan berjalan pada PGlite, yang menggunakan enjin dan SQL yang sama.

### Telefon dan tablet

1. Jalankan `npm start` pada komputer; buka `http://<alamat-IP-komputer>:3000` pada peranti dalam rangkaian yang sama. Sejarah soalan dikongsi melalui pelayan, jadi soalan tidak berulang walaupun bertukar peranti.
2. Pemasangan PWA dan penggunaan luar talian memerlukan `localhost` atau HTTPS. Untuk peranti lain, hoskan di belakang HTTPS (cth. proksi songsang) atau gunakan komputer itu sendiri.
3. Luar talian: sesi dan sejarah disimpan pada peranti dan diselaraskan apabila pelayan boleh dicapai semula.

### GitHub Pages

`.github/workflows/pages.yml` membina dan menerbitkan laman setiap kali `main` ditolak (Settings → Pages → Source: **GitHub Actions**). Alamat: `https://<pengguna>.github.io/<repo>/`.

- Versi ini statik sahaja: **tiada pelayan penyelarasan**, jadi sejarah soalan kekal pada setiap peranti secara berasingan, dan penjanaan AI serta semakan item tidak tersedia.
- HTTPS membolehkan pemasangan PWA dan penggunaan luar talian pada telefon.
- Tiada nama calon dalam kod. Isi nama pada skrin permulaan ujian; untuk binaan tempatan, `NEXT_PUBLIC_CANDIDATE_NAME` dalam `.env.local` (tidak dimuat naik) menetapkan nama lalai.
- Bina secara manual untuk laluan asas lain: `NEXT_PUBLIC_BASE_PATH=/ukkm npm run build`.

## Mod

| Mod | Kandungan lalai |
|---|---|
| UKKM | Matematik 30 soalan/45 min · Sains 30/40 min. Keperibadian dan Bahasa Melayu **tidak aktif** (aktifkan di Admin jika disahkan diperlukan) |
| Ujian Khas STEM-Excellence | Tiga seksyen × 15 soalan (25/20/20 min) |
| Simulasi Penuh | Matematik, Sains, Keperibadian (30 item/15 min, tidak dimarkah) + STEM-Excellence: 135 soalan, 165 min. PKSK tidak dimasukkan |
| Latihan Subjek | Matematik, Sains atau STEM |
| Cabaran KBAT | Aras sukar dan KBAT lanjutan sahaja |
| Ujian Pantas | 30 saat setiap soalan |
| Latihan Adaptif | Aras naik selepas betul, turun selepas salah |
| Mod Ulang Kaji | Soalan yang pernah salah — satu-satunya mod yang sengaja mengulang |
| Latihan Baharu Tanpa Had | Sesi baharu selagi bank soalan baharu mencukupi |

## Tanpa pengulangan

Setiap soalan yang dipaparkan direkod bagi setiap calon. Sesi baharu hanya memilih soalan yang belum pernah dipaparkan; mod "ketat" juga mengelak keluarga soalan (templat sama, nombor berbeza) yang pernah digunakan. Jika soalan baharu tidak mencukupi, sesi dipendekkan dan kekurangan dipaparkan — soalan tidak diulang secara senyap. Sejarah hanya dipadam melalui Admin → Analisis calon. Pengecualian: item Keperibadian (tiada jawapan betul/salah, tidak dimarkah) boleh berulang, kerana bank hanya ada 30 item.

## Bank soalan — angka sebenar

Sasaran bank ialah 5,000 item. **Bank semasa: 1,854 item** (pada 20 varian setiap templat):

| Subjek | Jumlah | Sasaran | Tulisan tangan | Dijana templat | Keluarga unik |
|---|---|---|---|---|---|
| Matematik | 729 | 1,500 | 120 | 609 | 150 |
| Sains | 260 | 1,500 | 120 | 140 | 127 |
| STEM-Excellence | 755 | 1,500 | 150 | 605 | 178 |
| Keperibadian | 30 | 500 | 30 | 0 | 30 |
| Bahasa Melayu (tidak aktif) | 80 | — | 80 | 0 | 80 |

- **0 item disemak oleh manusia.** 1,537 item berangka disahkan dengan pengiraan bebas automatik; selebihnya hanya melalui semakan struktur dan pendua. Fakta Sains dan bahasa belum disemak guru.
- Item templat ialah varian nombor/konteks bagi 70 struktur masalah. Ia latihan yang sah tetapi bukan 1,354 masalah yang berlainan.
- Sesi penuh tanpa ulangan yang boleh dibina sekarang: **UKKM 5, STEM-Excellence 6, Simulasi Penuh 5**. Sains ialah had (hanya 7 templat berangka; soalan konsep tidak boleh dijana secara deterministik).
- Menaikkan "varian setiap templat" (Admin → Bank soalan, hingga 60) menambah item Matematik dan STEM, tetapi tidak menambah soalan konsep Sains atau item Keperibadian.
- Untuk menambah Sains/Keperibadian: tulis item dalam `src/data/bank/`, atau gunakan penjanaan AI dan luluskan setiap item di Admin → Semakan item.

## Kilang soalan

`GENERATE → CHECK ANSWER → CHECK DISTRACTORS → DETECT DUPLICATES → VALIDATE → PUBLISH`

- **Templat deterministik** berfungsi tanpa Internet dan tanpa API.
- **AI (pilihan)**: draf dijana, diselesaikan semula oleh panggilan bebas, disemak pengiraan dan pendua, kemudian **dikuarantin**. Item hanya digunakan selepas seorang penyemak manusia meluluskannya; nama penyemak direkod.

## Admin

Blueprint (aktif/nyahaktif komponen, bilangan soalan, tempoh, aras, status format, versi dan log perubahan) · Bank soalan (statistik sebenar, kilang, AI, pendua) · Semakan item · Analisis calon (topik lemah terkumpul, baki soalan, padam sejarah) · Data & penyelarasan (eksport JSON/CSV).

Jika surat panggilan menyatakan komponen atau tempoh sebenar, kemas kini blueprint dan tandakan `OFFICIAL_2027_VERIFIED` dengan catatan sumber.

## Ujian

```bash
npm test
```

77 ujian Vitest: validasi setiap item, pengiraan bebas, kilang dan pendua, tanpa pengulangan (item dan keluarga), kekurangan bank, mod latihan dan adaptif, pemasa/auto-hantar, pemarkahan, transaksi dan sesi serentak (IndexedDB), versi blueprint, dan pelayan penyelarasan melalui HTTP (gabungan dua peranti, konflik sesi, kuarantin item, token).

```bash
npm run test:e2e
```

10 ujian Playwright pada binaan sebenar (jalankan `npm run build` dahulu; `npx playwright install chromium` sekali): aliran penuh hingga PDF, tiga sesi berturut-turut tanpa soalan sama, pemasa dan auto-hantar, Admin, mod latihan, penyelarasan dua peranti, luar talian kemudian selaras, paparan telefon/tablet/laptop.

## Struktur

```
docs/                 FORMAT-UKKM-2027.md (bukti), SPEC.md (seni bina)
server/               index.mjs (statik + API), schema.mjs (Drizzle), ai.mjs (Claude)
src/lib/              types, config (blueprint + bukti), engine, factory, db (IndexedDB), sync, text, pdf
src/data/             bank/ (500 item tulisan tangan), templates.ts (70 templat)
src/app/              utama, exam, practice, results, history, admin, format
tests/unit, tests/e2e
```

## Batasan yang diketahui

- Format sebenar ujian MARA mungkin berbeza dalam setiap aspek yang berstatus `UNVERIFIED_PRACTICE`.
- Semua soalan berbentuk objektif empat pilihan dalam Bahasa Melayu.
- Pelayan tiada akaun pengguna; `SYNC_TOKEN` ialah satu-satunya kawalan capaian. Jangan dedahkan ke Internet tanpanya.
- Calon dikenal pasti melalui nama; dua peranti mesti menggunakan nama calon yang sama untuk berkongsi sejarah.
- Folder projek berada dalam Google Drive; `node_modules`, `.next` dan `out` turut disegerakkan melainkan dikecualikan. Pangkalan data pelayan sengaja disimpan di luar Google Drive, jadi ia tidak berpindah ke komputer lain bersama folder projek.
