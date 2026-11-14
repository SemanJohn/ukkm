import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Pelayan ujian berkongsi satu pangkalan data dalam ingatan, jadi setiap ujian menggunakan nama calon tersendiri.
async function startExam(page: Page, mode: 'ukkm' | 'stem' | 'full', candidate: string) {
  await page.goto(`/exam/?mode=${mode}`);
  await page.locator('#cand-name').fill(candidate);
  await page.getByTestId('confirm-candidate').check();
  await expect(page.getByTestId('start-exam')).toBeEnabled();
  await page.getByTestId('start-exam').click();
  await expect(page.getByTestId('timer')).toBeVisible();
}

/** Guna Admin untuk memendekkan blueprint STEM kepada 2 soalan setiap seksyen. */
async function shortenStem(page: Page) {
  await page.goto('/admin/');
  await page.getByTestId('admin-tab-stem').click();
  for (const i of [0, 1, 2]) await page.getByTestId(`admin-count-${i}`).fill('2');
  await page.getByTestId('admin-save').click();
  await expect(page.getByTestId('admin-message')).toContainText('disimpan');
}

const doubleClick = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((el) => {
    (el as HTMLButtonElement).click();
    (el as HTMLButtonElement).click();
  });

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);

/** Tamatkan semua seksyen tanpa menjawab. */
async function submitAll(page: Page) {
  for (;;) {
    const last = (await page.getByTestId('finish-button').innerText()) === 'Hantar peperiksaan';
    await page.getByTestId('finish-button').click();
    await page.getByTestId('confirm-finish').click();
    if (last) break;
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.waitForURL(/\/results\/\?id=/);
}

type Stored = { sessions: { id: string; status: string; candidate: string; qids: string[] }[]; exposures: { candidate: string; qid: string }[] };
const readDb = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Stored>((resolve, reject) => {
        const req = indexedDB.open('mrsm-sim-2027');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction(['sessions', 'exposures']);
          const s = tx.objectStore('sessions').getAll();
          const e = tx.objectStore('exposures').getAll();
          tx.oncomplete = () =>
            resolve({
              sessions: s.result.map((x: any) => ({ id: x.id, status: x.status, candidate: x.candidateName, qids: x.sections.flatMap((sec: any) => sec.items.map((i: any) => i.qid)) })),
              exposures: e.result,
            });
        };
      }),
  );

test('aliran penuh: navigasi, autosave, resume, penghantaran, keputusan, PDF, sejarah, tanpa pengulangan', async ({ page }) => {
  const NAME = 'Calon Aliran';
  await shortenStem(page);
  await startExam(page, 'stem', NAME);

  await expect(page.getByTestId('candidate-name')).toHaveText(NAME);
  await expect(page.getByTestId('section-label')).toContainText('Seksyen 1/3');
  await expect(page.getByTestId('question-number')).toHaveText('Soalan 1 daripada 2');
  await expect(page.getByRole('button', { name: '← Sebelumnya' })).toBeDisabled();

  const q1 = await page.getByTestId('question-text').innerText();
  await page.getByTestId('option-B').click();
  await expect(page.getByTestId('nav-1')).toHaveAttribute('data-state', 'answered');
  await expect(page.getByTestId('save-state')).toHaveText('Disimpan');

  // Tiada jawapan atau petunjuk semasa peperiksaan.
  await expect(page.locator('body')).not.toContainText('Penjelasan');
  await expect(page.locator('body')).not.toContainText('Jawapan betul');

  await page.getByRole('button', { name: 'Seterusnya →' }).click();
  await expect(page.getByTestId('question-number')).toHaveText('Soalan 2 daripada 2');
  await page.getByRole('button', { name: 'Tandakan untuk semakan' }).click();
  await expect(page.getByTestId('nav-2')).toHaveAttribute('data-state', 'flagged');
  await expect(page.getByTestId('count-unanswered')).toHaveText('1');
  await expect(page.getByTestId('save-state')).toHaveText('Disimpan');

  // Muat semula → sambung di tempat yang sama dengan jawapan terpelihara.
  await page.reload();
  await expect(page.getByTestId('question-number')).toHaveText('Soalan 2 daripada 2');
  await expect(page.getByTestId('nav-1')).toHaveAttribute('data-state', 'answered');
  await expect(page.getByTestId('nav-2')).toHaveAttribute('data-state', 'flagged');
  await page.getByTestId('nav-1').click();
  await expect(page.getByTestId('question-text')).toHaveText(q1);
  await expect(page.getByTestId('option-B').locator('input')).toBeChecked();

  // Pengesanan jawapan belum lengkap + pengesahan sebelum tamat.
  await page.getByTestId('finish-button').click();
  await expect(page.getByTestId('dialog-unanswered')).toHaveText('1');
  await expect(page.getByRole('alert').filter({ hasText: 'belum dijawab' })).toBeVisible();
  await page.getByRole('button', { name: 'Kembali menyemak' }).click();
  await expect(page.getByTestId('section-label')).toContainText('Seksyen 1/3');

  // Klik berganda pada pengesahan hanya menamatkan SATU seksyen.
  await page.getByTestId('finish-button').click();
  await doubleClick(page, 'confirm-finish');
  await expect(page.getByTestId('section-label')).toContainText('Seksyen 2/3');

  await page.getByTestId('option-A').click();
  await page.getByRole('button', { name: 'Seterusnya →' }).click();
  await page.getByTestId('option-A').click();
  await page.getByTestId('finish-button').click();
  await page.getByTestId('confirm-finish').click();
  await expect(page.getByTestId('section-label')).toContainText('Seksyen 3/3');
  await page.getByTestId('finish-button').click();
  await doubleClick(page, 'confirm-finish');
  await page.waitForURL(/\/results\/\?id=/);

  // Keputusan dan analisis.
  await expect(page.getByTestId('score-correct')).toHaveText(/^[0-3]\/6$/);
  await expect(page.getByTestId('score-unanswered')).toHaveText('3');
  await expect(page.getByText('Markah mengikut subjek')).toBeVisible();
  await expect(page.getByTestId('weak-topics')).toBeVisible();
  await expect(page.getByTestId('suggestions').locator('li').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/peluang anda|skor merit anda/i);
  await expect(page.getByText('Penjelasan:').first()).toBeVisible();
  await page.getByTestId('review-filter').selectOption('all');
  await expect(page.getByTestId('review-item')).toHaveCount(6);
  const correctText = await page.getByTestId('score-correct').innerText();

  // Laporan PDF.
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-pdf').click()]);
  expect(download.suggestedFilename()).toMatch(/^laporan-mrsm-stem-\d{4}-\d{2}-\d{2}\.pdf$/);
  const file = await download.path();
  expect(fs.statSync(file).size).toBeGreaterThan(3000);
  expect(fs.readFileSync(file).subarray(0, 5).toString()).toBe('%PDF-');

  // Sesi kedua dan ketiga: tiada soalan yang sama dengan sesi terdahulu.
  for (let i = 0; i < 2; i++) {
    await startExam(page, 'stem', NAME);
    await submitAll(page);
  }
  const db = await readDb(page);
  const mine = db.sessions.filter((s) => s.candidate === NAME);
  expect(mine).toHaveLength(3);
  const all = mine.flatMap((s) => s.qids);
  expect(all).toHaveLength(18);
  expect(new Set(all).size).toBe(18);
  expect(new Set(db.exposures.filter((e) => e.candidate === 'calon aliran').map((e) => e.qid))).toEqual(new Set(all));

  // Sejarah + jawapan terkunci selepas dihantar.
  await page.goto('/history/');
  await expect(page.getByTestId('history-row')).toHaveCount(3);
  await expect(page.getByText('Graf perkembangan')).toBeVisible();
  await expect(page.getByTestId('history-row').last()).toContainText(correctText);
});

test('pemasa masa sebenar, resume selepas keluar, dan hantar automatik apabila masa tamat', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T08:00:00') });
  await startExam(page, 'stem', 'Calon Pemasa');
  await expect(page.getByTestId('timer')).toHaveText(/^(25:00|24:5\d)$/);

  await page.clock.fastForward('10:00');
  await expect(page.getByTestId('timer')).toHaveText(/^(15:00|14:5\d)$/);
  await page.getByTestId('option-C').click();
  await expect(page.getByTestId('save-state')).toHaveText('Disimpan');

  // Keluar dari halaman peperiksaan; masa terus berjalan.
  await page.goto('/');
  await expect(page.getByText('Sesi sedang berjalan')).toBeVisible();
  await page.clock.fastForward('16:00');
  await page.getByRole('link', { name: 'Sambung' }).click();
  await expect(page.getByTestId('section-label')).toContainText('Seksyen 2/3');
  await expect(page.getByTestId('timer')).toHaveText(/^(19:00|18:5\d)$/);

  await page.clock.fastForward('19:30');
  await expect(page.getByTestId('section-label')).toContainText('Seksyen 3/3');
  await expect(page.getByRole('alert').filter({ hasText: 'telah tamat' })).toBeVisible();

  await page.clock.fastForward('21:00');
  await page.waitForURL(/\/results\/\?id=/);
  await expect(page.getByText('dihantar automatik')).toBeVisible();
  await expect(page.getByTestId('score-unanswered')).toHaveText(/^(44|45)$/);
  await expect(page.getByTestId('score-time')).toHaveText('65 min 0 s');
});

test('Admin blueprint: aktifkan komponen, susunan, status, versi, tiada navigasi ke belakang, kalkulator', async ({ page }) => {
  await page.goto('/admin/');
  await expect(page.getByTestId('admin-section-0')).toBeVisible();
  await expect(page.getByTestId('admin-enabled-2')).not.toBeChecked(); // Keperibadian — tidak aktif secara lalai
  await expect(page.getByTestId('admin-enabled-3')).not.toBeChecked(); // Bahasa Melayu — tidak aktif secara lalai
  await page.getByTestId('admin-enabled-2').check();
  await page.getByRole('button', { name: 'Turunkan seksyen Matematik' }).click();
  await page.getByTestId('admin-count-0').fill('3');
  await page.getByTestId('admin-duration-0').fill('4');
  await page.getByTestId('admin-allowBackNavigation').uncheck();
  await page.getByTestId('admin-allowCalculator').check();
  await page.getByTestId('admin-note').fill('Ujian automatik');
  await page.getByTestId('admin-save').click();
  await expect(page.getByTestId('admin-message')).toContainText('versi 1');
  await expect(page.getByTestId('admin-versions')).toContainText('Ujian automatik');

  // Nilai tidak sah ditolak; status rasmi memerlukan sumber dokumen.
  await page.getByTestId('admin-count-1').fill('999');
  await page.getByTestId('admin-save').click();
  await expect(page.getByTestId('admin-message')).toContainText('tidak sah');
  await page.getByTestId('admin-count-1').fill('30');
  await page.getByTestId('admin-format-status').selectOption('OFFICIAL_2027_VERIFIED');
  await page.getByTestId('admin-save').click();
  await expect(page.getByTestId('admin-message')).toContainText('nyatakan dokumen rasmi');
  await page.reload();
  await expect(page.getByTestId('admin-count-0')).toHaveValue('3');
  await expect(page.getByTestId('admin-format-status')).toHaveValue('UNVERIFIED_PRACTICE');

  await startExam(page, 'ukkm', 'Calon Admin');
  await expect(page.getByTestId('section-label')).toContainText('Seksyen 1/3');
  await expect(page.getByTestId('section-label')).toContainText('Sains');
  await expect(page.getByTestId('question-number')).toHaveText('Soalan 1 daripada 3');
  await expect(page.getByTestId('timer')).toHaveText(/^(04:00|03:5\d)$/);
  await page.getByRole('button', { name: 'Seterusnya →' }).click();
  await expect(page.getByRole('button', { name: '← Sebelumnya' })).toBeDisabled();
  await expect(page.getByTestId('nav-1')).toBeDisabled();

  await page.getByRole('button', { name: 'Kalkulator' }).click();
  for (const key of ['7', '×', '6', '=']) await page.getByRole('button', { name: key, exact: true }).click();
  await expect(page.getByTestId('calc-display')).toHaveText('42');
});

test('Admin: bank soalan, kilang, pendua, semakan, data dan eksport', async ({ page }) => {
  await page.goto('/admin/');
  await page.getByTestId('tab-bank').click();
  const total = Number(await page.getByTestId('bank-total').innerText());
  expect(total).toBeGreaterThan(1500);
  expect(total).toBeLessThan(5000); // sasaran 5,000 belum dicapai — dan tidak didakwa
  await expect(page.getByText('Bank semasa belum mencapai sasaran itu')).toBeVisible();
  await expect(page.getByTestId('factory-report')).toContainText('Gagal semakan jawapan');
  await expect(page.getByTestId('ai-unavailable')).toBeVisible();

  await page.getByTestId('factory-variants').fill('30');
  await page.getByTestId('factory-run').click();
  await expect(page.getByTestId('bank-message')).toContainText('30 varian');
  expect(Number(await page.getByTestId('bank-total').innerText())).toBeGreaterThan(total);

  await page.getByTestId('scan-duplicates').click();
  await expect(page.getByTestId('duplicate-result')).toContainText('Tiada pasangan hampir-pendua');

  await page.getByTestId('tab-review').click();
  await expect(page.getByTestId('review-empty')).toBeVisible();

  await page.getByTestId('tab-data').click();
  await expect(page.getByTestId('server-status')).toContainText('PGlite');
  await page.getByTestId('sync-now').click();
  await expect(page.getByTestId('data-message')).toContainText('Diselaraskan');
  const [json] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-json').click()]);
  expect(json.suggestedFilename()).toBe('data-simulator-ukkm.json');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-csv').click()]);
  const text = fs.readFileSync(await csv.path(), 'utf8');
  expect(text).toContain('question_family_id');
  expect(text.split('\n').length).toBeGreaterThan(1500);

  await page.getByTestId('tab-candidate').click();
  await expect(page.getByTestId('seen-count')).toBeVisible();
});

test('mod latihan: KBAT, ulang kaji dan adaptif', async ({ page }) => {
  await page.goto('/practice/');
  await page.getByTestId('kind-kbat').click();
  await page.getByTestId('practice-count').selectOption('5');
  await expect(page.getByTestId('practice-available')).toContainText('Soalan baharu tersedia');
  await page.getByTestId('start-practice').click();
  await expect(page.getByTestId('section-label')).toContainText('Cabaran KBAT');
  await expect(page.getByTestId('question-number')).toHaveText('Soalan 1 daripada 5');
  await page.getByTestId('option-A').click();
  await submitAll(page);
  await expect(page.getByTestId('score-correct')).toHaveText(/^[01]\/5$/);

  // Ulang kaji: hanya soalan yang salah / tidak dijawab daripada sesi tadi.
  await page.goto('/practice/');
  await page.getByTestId('kind-revision').click();
  await expect(page.getByTestId('practice-available')).toContainText(/Soalan untuk diulang kaji: [45]/);
  await page.getByTestId('start-practice').click();
  await expect(page.getByTestId('section-label')).toContainText('Mod Ulang Kaji');
  await submitAll(page);

  // Adaptif: soalan seterusnya hanya selepas menjawab.
  await page.goto('/practice/');
  await page.getByTestId('kind-adaptive').click();
  await page.getByTestId('practice-count').selectOption('5');
  await page.getByTestId('start-practice').click();
  await expect(page.getByTestId('question-number')).toHaveText('Soalan 1 daripada 5');
  await expect(page.getByTestId('next-button')).toBeDisabled();
  await page.getByTestId('option-B').click();
  await page.getByTestId('next-button').click();
  await expect(page.getByTestId('question-number')).toHaveText('Soalan 2 daripada 5');
  await expect(page.getByRole('button', { name: '← Sebelumnya' })).toBeDisabled();

  const db = await readDb(page);
  const kbat = db.sessions.find((s) => s.id.startsWith('kbat-'))!;
  const rev = db.sessions.find((s) => s.id.startsWith('revision-'))!;
  const ada = db.sessions.find((s) => s.id.startsWith('adaptive-'))!;
  expect(rev.qids.every((q) => kbat.qids.includes(q))).toBe(true);
  expect(ada.qids).toHaveLength(2);
  expect(ada.qids.some((q) => kbat.qids.includes(q))).toBe(false);
});

test('penyelarasan merentas peranti: sejarah soalan dan sesi dikongsi, tiada ulangan pada peranti kedua', async ({ page, browser }) => {
  const NAME = 'Calon Dua Peranti';
  await startExam(page, 'stem', NAME);
  await submitAll(page);
  const deviceA = (await readDb(page)).sessions.find((s) => s.candidate === NAME)!;
  expect(deviceA.qids).toHaveLength(45);

  // Peranti kedua: konteks pelayar baharu dengan storan kosong.
  const ctx = await browser.newContext();
  const b = await ctx.newPage();
  await startExam(b, 'stem', NAME);
  const dbB = await readDb(b);
  const sessionB = dbB.sessions.find((s) => s.status === 'active')!;
  expect(sessionB.qids).toHaveLength(45);
  expect(sessionB.qids.some((q) => deviceA.qids.includes(q))).toBe(false);
  expect(dbB.exposures.filter((e) => e.candidate === 'calon dua peranti')).toHaveLength(90);
  // Sesi yang dihantar pada peranti A muncul dalam sejarah peranti B.
  await b.goto('/history/');
  await expect(b.getByTestId('history-row').filter({ hasText: NAME })).toHaveCount(2);
  await b.goto('/');
  await expect(b.getByTestId('sync-status')).toContainText('Diselaraskan dengan pelayan');
  await ctx.close();
});

test('berfungsi tanpa Internet selepas dimuatkan sekali; diselaraskan apabila sambungan kembali', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByTestId('offline-status')).toContainText('Sedia digunakan tanpa Internet', { timeout: 30_000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  await context.setOffline(true);
  for (const [path, heading] of [['/format/', 'Format & Bukti'], ['/practice/', 'Mod Latihan'], ['/admin/', 'Admin']] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await page.goto('/');
  await expect(page.getByTestId('sync-status')).toContainText('Tidak diselaraskan');

  await startExam(page, 'ukkm', 'Calon Luar Talian');
  await page.getByTestId('option-D').click();
  await expect(page.getByTestId('save-state')).toHaveText('Disimpan');
  await page.reload();
  await expect(page.getByTestId('nav-1')).toHaveAttribute('data-state', 'answered');
  await expect(page.getByTestId('option-D').locator('input')).toBeChecked();
  await page.goto('/history/');
  await expect(page.getByTestId('history-row').filter({ hasText: 'Calon Luar Talian' })).toContainText('Sedang berjalan');

  // Sambungan kembali → sejarah yang dibina luar talian sampai ke pelayan.
  await context.setOffline(false);
  await page.goto('/admin/');
  await page.getByTestId('tab-data').click();
  await page.getByTestId('sync-now').click();
  await expect(page.getByTestId('data-message')).toContainText('60 rekod sejarah soalan');
});

for (const vp of [
  { name: 'telefon', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'laptop', width: 1366, height: 768 },
]) {
  test(`paparan ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    for (const m of ['ukkm', 'stem', 'full']) await expect(page.getByTestId(`mode-${m}`)).toBeVisible();
    expect(await noOverflow(page)).toBe(true);

    for (const path of ['/admin/', '/format/', '/history/', '/practice/', '/exam/?mode=full']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: 'Memuatkan' })).toHaveCount(0);
      expect(await noOverflow(page), `limpahan mengufuk di ${path}`).toBe(true);
    }
    await page.goto('/admin/');
    await page.getByTestId('tab-bank').click();
    await expect(page.getByTestId('bank-total')).toBeVisible();
    expect(await noOverflow(page), 'limpahan di Admin → Bank').toBe(true);

    await startExam(page, 'ukkm', `Calon ${vp.name}`);
    expect(await noOverflow(page)).toBe(true);
    for (const id of ['timer', 'question-text', 'option-A', 'option-D', 'nav-1', 'finish-button']) await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.getByTestId('timer')).toBeInViewport();
    await expect(page.getByTestId('finish-button')).toBeInViewport();
    await expect(page.getByTestId('next-button')).toBeInViewport();
    await page.getByTestId('finish-button').click();
    await expect(page.getByTestId('confirm-finish')).toBeInViewport();
  });
}
