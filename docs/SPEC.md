# Spesifikasi teknikal — Simulator UKKM MRSM 2027 (v2)

Bukti format: [FORMAT-UKKM-2027.md](FORMAT-UKKM-2027.md).

## Seni bina

```
Pelayar (PWA, luar talian)                      Pelayan (pilihan, `npm start`)
┌───────────────────────────────┐              ┌──────────────────────────────┐
│ Next.js statik + React        │  /api/sync   │ server/index.mjs (Node http)  │
│ IndexedDB: sesi, pendedahan,  │ ───────────▶ │ Drizzle ORM                   │
│ blueprint, item diluluskan    │ ◀─────────── │ PostgreSQL (DATABASE_URL)     │
│ Enjin: pemilihan, pemasa,     │              │ atau PGlite terbenam          │
│ pemarkahan, kilang templat    │              │ /api/factory/generate (AI)    │
└───────────────────────────────┘              └──────────────────────────────┘
```

- Peperiksaan berjalan sepenuhnya di klien; pelayan hanya untuk penyelarasan merentas peranti, kuarantin/semakan item AI dan penjanaan AI.
- Tanpa pelayan atau Internet, semua fungsi peperiksaan berfungsi; penyelarasan berlaku apabila pelayan boleh dicapai (halaman utama, permulaan sesi, penghantaran, peristiwa `online`, butang Admin).

## Model item

`id` (question_id), `familyId`, `templateId`, `contentHash`, `fingerprint` (semantic_fingerprint), `section` (subject), `topic`, `subtopic`, `difficulty` (easy | medium | hard | advanced), `question`, `options`, `correctAnswer`, `explanation`, `validationStatus`, `verifiedByReviewer`, `sourceType`.

| validationStatus | Maksud | Digunakan dalam sesi |
|---|---|---|
| `auto_validated` | Jawapan disahkan oleh pengiraan bebas automatik | Ya |
| `structure_only` | Semakan struktur/pendua sahaja | Ya |
| `human_approved` | Diluluskan penyemak manusia di Admin | Ya |
| `pending_review` | Dikuarantin | Tidak |
| `rejected` | Ditolak | Tidak |

`verifiedByReviewer` hanya benar bagi `human_approved` (dikuatkuasakan oleh skema).

## Enjin tanpa pengulangan

1. `startSessionAtomic` membuka satu transaksi IndexedDB baca-tulis ke atas `sessions` + `exposures`.
2. Membaca sejarah calon → menapis soalan (dan, dalam mod ketat, keluarga) yang pernah dipaparkan.
3. Memilih mengikut blueprint; paling banyak satu soalan setiap keluarga dalam satu sesi.
4. Menulis sesi dan rekod pendedahan dalam transaksi yang sama.
5. Jika soalan unik tidak mencukupi: sesi dipendekkan, `shortfall` direkod dan dipaparkan. Tiada ulangan senyap.
6. Sejarah diselaraskan ke pelayan (kesatuan set); peranti lain menariknya sebelum memilih.

Pengulangan hanya berlaku dalam Mod Ulang Kaji, atau jika blueprint ditetapkan `noRepeat: off`, atau selepas sejarah dipadam secara sengaja di Admin.

Kapasiti ("sesi yang masih boleh dibina") dikira sebagai k terbesar dengan Σ min(saiz keluarga, k) ≥ k × bilangan soalan bagi setiap komponen.

## Kilang soalan

`GENERATE → CHECK ANSWER → CHECK DISTRACTORS → DETECT DUPLICATES → VALIDATE → PUBLISH`

- **Templat deterministik** (`src/data/templates.ts`): 70 templat; id item stabil (`G-<templat>-<varian>`), jadi sejarah sah merentas peranti. `calc` dihadkan kepada aritmetik dan dinilai sebagai semakan bebas.
- **AI (pilihan)**: pelayan memanggil Claude untuk menjana draf dan satu panggilan berasingan untuk menyelesaikannya tanpa skema (CHECK FACTS). Klien menjalankan `vetExternalItem` (skema, pengiraan, pendua teks/semantik). Item yang lulus disimpan sebagai `pending_review`; hanya kelulusan manusia menerbitkannya.

## Pelayan

| Laluan | Fungsi |
|---|---|
| `GET /api/health` | status, jenis pangkalan data, AI dikonfigurasi |
| `POST /api/sync` | gabung sesi/pendedahan/blueprint; pulangkan keadaan calon + item diluluskan |
| `GET /api/questions?status=` | senarai item |
| `POST /api/questions` | simpan item (sentiasa dikuarantin) |
| `POST /api/questions/:id/review` | luluskan/tolak (nama penyemak wajib) |
| `POST /api/factory/generate` | penjanaan AI (503 jika tidak dikonfigurasi) |
| `GET /api/export` | eksport pangkalan data |

Peraturan gabungan sesi: sesi `submitted` tidak boleh ditimpa; selain itu `updatedAt` terkini menang. Pemadaman sejarah disebarkan melalui `exposureResetAt`.
