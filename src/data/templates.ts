import type { Draft, R, Template } from '@/lib/factory';
import type { BankSection, Difficulty } from '@/lib/types';

/**
 * Templat deterministik. Setiap templat = satu KELUARGA masalah; varian berbeza nombor/konteks.
 * `ans` dikira dalam kod; `calc` ialah ungkapan aritmetik yang ditulis berasingan dan dinilai oleh kilang
 * sebagai semakan bebas. Pengganggu mewakili kesilapan lazim.
 */

const NAMES = ['Aiman', 'Balqis', 'Chong', 'Devi', 'Farah', 'Gopal', 'Hana', 'Irfan', 'Jia Hui', 'Kamal', 'Lina', 'Mei Ling', 'Nabil', 'Priya', 'Qistina', 'Ravi', 'Siti', 'Tan', 'Umar', 'Wani'];
const n = (v: number) => String(Math.round(v * 1000) / 1000);
const rm = (v: number) => `RM${v.toFixed(2)}`;
const u = (unit: string) => (v: number) => `${n(v)} ${unit}`;
const pct = (v: number) => `${n(v)}%`;

const T = (id: string, section: BankSection, topic: string, subtopic: string, difficulty: Difficulty, make: (r: R) => Draft | null): Template => ({ id, section, topic, subtopic, difficulty, make });
const M = (id: string, topic: string, subtopic: string, d: Difficulty, make: (r: R) => Draft | null) => T(id, 'matematik', topic, subtopic, d, make);
const S = (id: string, topic: string, subtopic: string, d: Difficulty, make: (r: R) => Draft | null) => T(id, 'stem', topic, subtopic, d, make);
const C = (id: string, topic: string, subtopic: string, d: Difficulty, make: (r: R) => Draft | null) => T(id, 'sains', topic, subtopic, d, make);

const N = 'Nombor & Operasi', P = 'Pecahan', D = 'Perpuluhan', PR = 'Peratus', W = 'Wang', MS = 'Masa', U = 'Ukuran & Sukatan', RU = 'Ruang', NK = 'Nisbah & Kadaran', K = 'Koordinat', PD = 'Pengurusan Data', KB = 'Kebolehjadian';
const PM = 'Penaakulan Matematik', BR = 'Masalah Bukan Rutin', AD = 'Analisis Data', AS = 'Aplikasi Sains', PS = 'Pemikiran Saintifik', SS = 'Situasi STEM', LG = 'Penaakulan Logik', PK = 'Pemikiran Komputasional';

const math: Template[] = [
  M('m-tertib-operasi', N, 'Tertib operasi', 'medium', (r) => {
    const a = r.int(12, 48), b = r.int(13, 29), d = r.int(4, 12), c = d * r.int(11, 35);
    return { q: `Hitung nilai bagi ${a} × ${b} − ${c} ÷ ${d}.`, ans: a * b - c / d, wrong: [(a * b - c) / d, a * b + c / d, a * (b - c / d)], f: n, expl: `Darab dan bahagi dahulu: ${a} × ${b} = ${a * b}; ${c} ÷ ${d} = ${c / d}. Kemudian tolak: ${a * b - c / d}.`, calc: `${a}*${b}-${c}/${d}` };
  }),
  M('m-kilang-kotak', N, 'Bahagi dan darab berbilang langkah', 'medium', (r) => {
    const pack = r.pick([12, 18, 24, 36]), boxes = r.int(120, 480), days = r.int(3, 9), item = r.pick(['botol jus', 'bungkus biskut', 'tin susu', 'batang pensel']);
    return { q: `Sebuah kilang menghasilkan ${pack * boxes} ${item} setiap hari dan membungkusnya ${pack} sekotak. Berapakah jumlah kotak yang dihasilkan dalam masa ${days} hari?`, ans: boxes * days, wrong: [boxes, boxes * pack, boxes * (days - 1)], f: n, expl: `${pack * boxes} ÷ ${pack} = ${boxes} kotak sehari. ${boxes} × ${days} = ${boxes * days} kotak.`, calc: `${pack * boxes}/${pack}*${days}` };
  }),
  M('m-berturutan', N, 'Nombor berturutan', 'hard', (r) => {
    const mid = r.int(21, 180);
    return { q: `Hasil tambah tiga nombor bulat yang berturutan ialah ${3 * mid}. Apakah nombor yang paling besar antara tiga nombor itu?`, ans: mid + 1, wrong: [mid, mid - 1, mid + 2], f: n, expl: `Nombor tengah = ${3 * mid} ÷ 3 = ${mid}. Tiga nombor itu ialah ${mid - 1}, ${mid} dan ${mid + 1}.`, calc: `${3 * mid}/3+1` };
  }),
  M('m-pecahan-daripada', P, 'Pecahan daripada kuantiti', 'easy', (r) => {
    const den = r.pick([3, 4, 5, 6, 8]), num = r.int(1, den - 1), k = r.int(12, 60), who = r.pick(NAMES), thing = r.pick(['guli', 'setem', 'kad', 'pelekat']);
    return { q: `${who} mempunyai ${den * k} keping ${thing}. Dia memberikan ${num}/${den} daripadanya kepada adiknya. Berapakah bilangan ${thing} yang diberikan?`, ans: num * k, wrong: [k, den * k - num * k, (den * k) / num], f: n, expl: `${den * k} ÷ ${den} = ${k}. ${k} × ${num} = ${num * k}.`, calc: `${num}/${den}*${den * k}` };
  }),
  M('m-pecahan-baki-wang', P, 'Pecahan daripada baki', 'hard', (r) => {
    const [a, b] = r.pick([[1, 3], [1, 4], [2, 5], [1, 5], [3, 8]] as const), [c, d] = r.pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5]] as const);
    const total = b * d * r.int(2, 9) * 5, left = total * (1 - a / b) * (1 - c / d), who = r.pick(NAMES);
    return { q: `${who} membelanjakan ${a}/${b} daripada wangnya untuk membeli buku. Kemudian dia membelanjakan ${c}/${d} daripada baki wangnya untuk makanan. Dia masih mempunyai RM${n(left)}. Berapakah wang asal ${who}?`, ans: total, wrong: [left / (1 - a / b - c / d), left * b, left * d, left + total / 2], f: (v) => `RM${n(v)}`, expl: `Baki selepas buku = ${b - a}/${b}. Baki selepas makanan = ${b - a}/${b} × ${d - c}/${d} daripada wang asal = RM${n(left)}. Wang asal = RM${total}.`, calc: `${n(left)}/((1-${a}/${b})*(1-${c}/${d}))` };
  }),
  M('m-tangki-pecahan', P, 'Beza pecahan dan keseluruhan', 'hard', (r) => {
    const [a, b, c, d] = r.pick([[2, 3, 1, 2], [3, 4, 1, 2], [3, 4, 1, 3], [4, 5, 1, 2], [5, 6, 2, 3], [7, 8, 1, 2], [3, 5, 1, 4]] as const);
    const lcm = (b * d) / (function g(x: number, y: number): number { return y ? g(y, x % y) : x; })(b, d), cap = lcm * r.int(3, 20), used = cap * (a / b - c / d);
    return { q: `Sebuah tangki berisi air sebanyak ${a}/${b} daripada kapasitinya. Selepas ${n(used)} liter air digunakan, air yang tinggal ialah ${c}/${d} daripada kapasiti tangki. Berapa literkah kapasiti tangki itu?`, ans: cap, wrong: [used * b, used * d, used / (a / b)], f: u('liter'), expl: `${a}/${b} − ${c}/${d} daripada kapasiti = ${n(used)} liter. Maka kapasiti = ${cap} liter.`, calc: `${n(used)}/(${a}/${b}-${c}/${d})` };
  }),
  M('m-harga-timbang-baki', D, 'Darab perpuluhan dan baki wang', 'hard', (r) => {
    const price = r.int(9, 28) + r.pick([0, 0.5]), kg = r.pick([1.2, 1.4, 1.6, 1.8, 2.2, 2.4, 2.6]), pay = r.pick([50, 100]), cost = Math.round(price * kg * 100) / 100, food = r.pick(['udang', 'daging', 'sotong', 'ikan tenggiri']);
    if (cost >= pay) return null;
    return { q: `Harga ${food} ialah ${rm(price)} sekilogram. Puan ${r.pick(NAMES)} membeli ${kg} kg ${food} dan membayar dengan wang RM${pay}. Berapakah baki wang yang diterimanya?`, ans: pay - cost, wrong: [cost, pay - price, pay - cost + 1], f: rm, expl: `Harga = ${rm(price)} × ${kg} = ${rm(cost)}. Baki = RM${pay} − ${rm(cost)} = ${rm(pay - cost)}.`, calc: `${pay}-${price}*${kg}` };
  }),
  M('m-purata-cari-nilai', D, 'Purata dan nilai yang tidak diketahui', 'hard', (r) => {
    const vals = [r.int(20, 60) / 10, r.int(20, 60) / 10, r.int(20, 60) / 10], x = r.int(20, 60) / 10, mean = (vals[0] + vals[1] + vals[2] + x) / 4;
    if (Math.abs(mean * 100 - Math.round(mean * 100)) > 1e-9) return null;
    return { q: `Purata bagi empat nombor ${vals.join(', ')} dan y ialah ${n(mean)}. Apakah nilai y?`, ans: x, wrong: [mean, mean * 4, mean * 3 - vals[0] - vals[1]], f: n, expl: `Jumlah empat nombor = ${n(mean)} × 4 = ${n(mean * 4)}. y = ${n(mean * 4)} − ${n(vals[0] + vals[1] + vals[2])} = ${x}.`, calc: `${n(mean)}*4-${vals[0]}-${vals[1]}-${vals[2]}` };
  }),
  M('m-diskaun-harga-jual', PR, 'Diskaun', 'medium', (r) => {
    const price = r.int(4, 40) * 10, d = r.pick([10, 15, 20, 25, 30, 35, 40]), item = r.pick(['jaket', 'beg sekolah', 'jam tangan', 'kasut sukan', 'fon kepala']);
    return { q: `Harga asal sebuah ${item} ialah RM${price}. Kedai itu menawarkan diskaun ${d}%. Berapakah harga yang perlu dibayar?`, ans: price * (1 - d / 100), wrong: [(price * d) / 100, price - d, price * (1 + d / 100)], f: rm, expl: `Diskaun = ${d}% × RM${price} = ${rm((price * d) / 100)}. Harga dibayar = ${rm(price * (1 - d / 100))}.`, calc: `${price}*(100-${d})/100` };
  }),
  M('m-harga-asal', PR, 'Mencari harga asal', 'hard', (r) => {
    const d = r.pick([10, 20, 25, 30, 40, 50]), orig = r.int(4, 40) * 20, sale = orig * (1 - d / 100), item = r.pick(['basikal', 'meja belajar', 'kipas', 'pencetak']);
    return { q: `Selepas diskaun ${d}% diberikan, harga sebuah ${item} menjadi RM${n(sale)}. Berapakah harga asal ${item} itu?`, ans: orig, wrong: [sale * (1 + d / 100), sale + d, sale * (d / 100)], f: (v) => `RM${n(v)}`, expl: `RM${n(sale)} mewakili ${100 - d}% daripada harga asal. Harga asal = ${n(sale)} ÷ ${100 - d} × 100 = RM${orig}.`, calc: `${n(sale)}*100/(100-${d})` };
  }),
  M('m-naik-turun-peratus', PR, 'Perubahan peratus berturutan', 'advanced', (r) => {
    const p = r.pick([10, 20, 25, 50]), q = r.pick([10, 20, 25, 50]), base = r.int(2, 20) * 100;
    return { q: `Harga sebuah telefon ialah RM${base}. Harga itu dinaikkan ${p}%, kemudian harga baharu itu diturunkan ${q}%. Berapakah harga akhir telefon itu?`, ans: base * (1 + p / 100) * (1 - q / 100), wrong: [base * (1 + (p - q) / 100), base, base * (1 + p / 100)], f: (v) => `RM${n(v)}`, expl: `Selepas naik: RM${n(base * (1 + p / 100))}. Penurunan ${q}% dikira atas harga baharu: RM${n(base * (1 + p / 100) * (1 - q / 100))}.`, calc: `${base}*(100+${p})/100*(100-${q})/100` };
  }),
  M('m-untung-kos', PR, 'Untung dan harga kos', 'hard', (r) => {
    const p = r.pick([10, 20, 25, 40, 50, 60]), cost = r.int(2, 30) * 20, sell = cost * (1 + p / 100), item = r.pick(['pembesar suara', 'lampu meja', 'beg galas', 'ketuhar']);
    return { q: `Seorang peniaga menjual sebuah ${item} dengan harga RM${n(sell)} dan memperoleh untung ${p}% daripada harga kos. Berapakah harga kos ${item} itu?`, ans: cost, wrong: [sell * (1 - p / 100), sell - p, sell * (1 + p / 100)], f: (v) => `RM${n(v)}`, expl: `Harga jual = ${100 + p}% daripada kos. Kos = ${n(sell)} ÷ ${100 + p} × 100 = RM${cost}.`, calc: `${n(sell)}*100/(100+${p})` };
  }),
  M('m-beli-baki', W, 'Pembelian berbilang barang', 'medium', (r) => {
    const a = r.int(2, 5), pa = r.int(20, 90) / 10 + 0.05 * r.int(0, 1), b = r.int(2, 4), pb = r.int(15, 60) / 10, pay = r.pick([50, 100]), total = Math.round((a * pa + b * pb) * 100) / 100;
    if (total >= pay) return null;
    return { q: `${r.pick(NAMES)} membeli ${a} buah buku nota berharga ${rm(pa)} sebuah dan ${b} batang pen berharga ${rm(pb)} sebatang. Dia membayar dengan wang RM${pay}. Berapakah baki wangnya?`, ans: pay - total, wrong: [total, pay - pa - pb, pay - total + 1], f: rm, expl: `Buku: ${a} × ${rm(pa)} = ${rm(a * pa)}. Pen: ${b} × ${rm(pb)} = ${rm(b * pb)}. Jumlah = ${rm(total)}. Baki = ${rm(pay - total)}.`, calc: `${pay}-${a}*${pa}-${b}*${pb}` };
  }),
  M('m-ansuran', W, 'Ansuran dan harga tunai', 'hard', (r) => {
    const months = r.pick([10, 12, 18, 24]), inst = r.int(6, 20) * 10, dep = r.int(2, 6) * 100, extra = r.int(5, 30) * 10, cash = dep + months * inst - extra, item = r.pick(['mesin basuh', 'televisyen', 'komputer riba', 'peti sejuk']);
    return { q: `Harga tunai sebuah ${item} ialah RM${cash}. Jika dibeli secara ansuran, pembeli perlu membayar wang pendahuluan RM${dep} dan ${months} ansuran bulanan sebanyak RM${inst} setiap satu. Berapakah beza antara harga ansuran dengan harga tunai?`, ans: extra, wrong: [months * inst, dep + months * inst, cash - months * inst], f: (v) => `RM${n(v)}`, expl: `Harga ansuran = RM${dep} + ${months} × RM${inst} = RM${dep + months * inst}. Beza = RM${dep + months * inst} − RM${cash} = RM${extra}.`, calc: `${dep}+${months}*${inst}-${cash}` };
  }),
  M('m-bil-berperingkat', W, 'Kadar berperingkat', 'hard', (r) => {
    const first = r.pick([100, 200, 300]), r1 = r.pick([20, 22, 25]), r2 = r.pick([30, 33, 35, 40]), use = first + r.int(2, 20) * 10;
    return { q: `Sebuah syarikat (rekaan) mengenakan caj elektrik ${r1} sen seunit bagi ${first} unit yang pertama dan ${r2} sen seunit bagi setiap unit yang seterusnya. Berapakah bil bagi penggunaan ${use} unit?`, ans: (first * r1 + (use - first) * r2) / 100, wrong: [(use * r1) / 100, (use * r2) / 100, ((use - first) * r2) / 100], f: rm, expl: `${first} × ${r1} sen = ${rm((first * r1) / 100)}. Baki ${use - first} unit × ${r2} sen = ${rm(((use - first) * r2) / 100)}. Jumlah = ${rm((first * r1 + (use - first) * r2) / 100)}.`, calc: `(${first}*${r1}+(${use}-${first})*${r2})/100` };
  }),
  M('m-tempoh-minit', MS, 'Tempoh masa', 'medium', (r) => {
    const h1 = r.int(7, 11), m1 = r.pick([5, 10, 15, 25, 35, 40, 45, 50]), dur = r.int(95, 400), end = h1 * 60 + m1 + dur, h2 = Math.floor(end / 60), m2 = end % 60;
    if (h2 < 13 || h2 > 23) return null;
    const pad = (x: number) => String(x).padStart(2, '0');
    return { q: `Sebuah bas ekspres bertolak pada pukul ${h1}:${pad(m1)} a.m. dan tiba di destinasi pada pukul ${h2 - 12 === 0 ? 12 : h2 - 12}:${pad(m2)} p.m. pada hari yang sama. Berapa minitkah tempoh perjalanan itu?`, ans: dur, wrong: [dur - 60, dur + 60, Math.abs((h2 - 12) * 60 + m2 - h1 * 60 - m1)], f: u('minit'), expl: `Dari ${h1}:${pad(m1)} a.m. hingga ${h2}:${pad(m2)} (sistem 24 jam) ialah ${Math.floor(dur / 60)} jam ${dur % 60} minit = ${dur} minit.`, calc: `(${h2}*60+${m2})-(${h1}*60+${m1})` };
  }),
  M('m-dua-paip', MS, 'Kadar kerja bersama', 'advanced', (r) => {
    const [a, b, t] = r.pick([[6, 3, 2], [12, 4, 3], [10, 15, 6], [12, 6, 4], [20, 5, 4], [30, 6, 5], [15, 30, 10], [18, 9, 6], [24, 8, 6]] as const);
    return { q: `Paip P boleh memenuhkan sebuah kolam dalam masa ${a} jam. Paip Q boleh memenuhkan kolam yang sama dalam masa ${b} jam. Jika kedua-dua paip dibuka serentak, berapa jamkah masa yang diperlukan untuk memenuhkan kolam itu?`, ans: t, wrong: [(a + b) / 2, a + b, Math.abs(a - b)], f: u('jam'), expl: `Dalam 1 jam, P mengisi 1/${a} dan Q mengisi 1/${b} kolam. Jumlah sejam = 1/${t} kolam, maka kolam penuh dalam ${t} jam.`, calc: `1/(1/${a}+1/${b})` };
  }),
  M('m-potong-reben', U, 'Penukaran unit dan pembahagian', 'medium', (r) => {
    const m = r.int(4, 15), piece = r.pick([35, 45, 55, 65, 75, 85]), cnt = Math.floor((m * 100) / piece);
    return { q: `Seutas dawai sepanjang ${m} m dipotong kepada beberapa bahagian yang setiap satunya ${piece} cm panjang. Berapakah bilangan bahagian lengkap yang paling banyak boleh diperoleh?`, ans: cnt, wrong: [cnt + 1, Math.floor(m / piece * 10), cnt - 1], f: n, expl: `${m} m = ${m * 100} cm. ${m * 100} ÷ ${piece} = ${cnt} baki ${(m * 100) % piece} cm. Maka ${cnt} bahagian lengkap.`, calc: `(${m * 100}-${m * 100}%${piece})/${piece}` };
  }),
  M('m-botol-minimum', U, 'Pembundaran ke atas dalam konteks', 'hard', (r) => {
    const cups = r.int(18, 60), ml = r.pick([150, 180, 200, 220, 250]), bottle = r.pick([1, 1.5, 2]), need = cups * ml, cnt = Math.ceil(need / (bottle * 1000));
    if (need % (bottle * 1000) === 0) return null;
    return { q: `Minuman dijual dalam botol ${bottle} liter. Untuk satu majlis, ${cups} biji gelas perlu diisi dengan ${ml} ml minuman setiap satu. Berapakah bilangan botol paling sedikit yang perlu dibeli?`, ans: cnt, wrong: [cnt - 1, cnt + 1, Math.round(need / 1000)], f: u('botol'), expl: `Minuman diperlukan = ${cups} × ${ml} = ${need} ml. ${need} ÷ ${bottle * 1000} = ${n(need / (bottle * 1000))}, maka ${cnt} botol diperlukan.`, calc: `(${need}+(${bottle * 1000}-${need}%${bottle * 1000}))/${bottle * 1000}` };
  }),
  M('m-kadar-petrol', U, 'Kadar penggunaan', 'medium', (r) => {
    const per = r.pick([5.5, 6, 6.5, 7, 7.5, 8]), km = r.int(12, 60) * 10;
    return { q: `Sebuah kereta menggunakan ${per} liter petrol bagi setiap 100 km perjalanan. Berapa literkah petrol yang diperlukan untuk perjalanan sejauh ${km} km?`, ans: (per * km) / 100, wrong: [km / per, per * km, (per * km) / 1000], f: u('liter'), expl: `${km} ÷ 100 = ${km / 100}. ${km / 100} × ${per} = ${n((per * km) / 100)} liter.`, calc: `${km}/100*${per}` };
  }),
  M('m-laju-dua-bahagian', U, 'Jarak, laju dan masa', 'hard', (r) => {
    const v1 = r.pick([60, 72, 90, 120]), t1 = r.pick([20, 30, 40, 45, 50]), v2 = r.pick([48, 60, 80, 96]), t2 = r.pick([30, 45, 75, 90]), d = (v1 * t1) / 60 + (v2 * t2) / 60;
    if (!Number.isInteger(d)) return null;
    return { q: `Sebuah van bergerak dengan laju ${v1} km/j selama ${t1} minit, kemudian dengan laju ${v2} km/j selama ${t2} minit. Berapakah jumlah jarak yang dilalui?`, ans: d, wrong: [v1 + v2, ((v1 + v2) / 2) * ((t1 + t2) / 60), (v1 * t1 + v2 * t2) / 100], f: u('km'), expl: `Jarak pertama = ${v1} × ${t1}/60 = ${n((v1 * t1) / 60)} km. Jarak kedua = ${v2} × ${t2}/60 = ${n((v2 * t2) / 60)} km. Jumlah = ${d} km.`, calc: `${v1}*${t1}/60+${v2}*${t2}/60` };
  }),
  M('m-laluan-keliling', RU, 'Luas kawasan berlorek', 'hard', (r) => {
    const L = r.int(12, 40), Wd = r.int(8, L - 2), w = r.pick([1, 2]);
    return { q: `Sebuah kolam renang berbentuk segi empat tepat berukuran ${L} m panjang dan ${Wd} m lebar. Satu laluan jubin selebar ${w} m dibina mengelilingi bahagian luar kolam itu. Berapakah luas laluan jubin itu?`, ans: (L + 2 * w) * (Wd + 2 * w) - L * Wd, wrong: [(L + w) * (Wd + w) - L * Wd, 2 * (L + Wd) * w, (L + 2 * w) * (Wd + 2 * w)], f: u('m²'), expl: `Ukuran luar = ${L + 2 * w} m × ${Wd + 2 * w} m = ${(L + 2 * w) * (Wd + 2 * w)} m². Tolak luas kolam ${L * Wd} m²: ${(L + 2 * w) * (Wd + 2 * w) - L * Wd} m².`, calc: `(${L}+2*${w})*(${Wd}+2*${w})-${L}*${Wd}` };
  }),
  M('m-akuarium-liter', RU, 'Isi padu kuboid dan pecahan', 'medium', (r) => {
    const l = r.pick([40, 50, 60, 80]), w = r.pick([20, 25, 30, 40]), h = r.pick([20, 30, 40, 50]), [a, b] = r.pick([[1, 2], [3, 4], [2, 5], [3, 5], [4, 5]] as const), v = (l * w * h * a) / b / 1000;
    return { q: `Sebuah bekas kaca berbentuk kuboid berukuran ${l} cm panjang, ${w} cm lebar dan ${h} cm tinggi. Bekas itu diisi air sehingga ${a}/${b} penuh. Berapa literkah isi padu air di dalam bekas itu? (1 liter = 1000 cm³)`, ans: v, wrong: [(l * w * h) / 1000, (l * w * h * (b - a)) / b / 1000, v * 10], f: u('liter'), expl: `Isi padu bekas = ${l} × ${w} × ${h} = ${l * w * h} cm³ = ${(l * w * h) / 1000} liter. ${a}/${b} daripadanya = ${n(v)} liter.`, calc: `${l}*${w}*${h}*${a}/${b}/1000` };
  }),
  M('m-kubus-permukaan', RU, 'Kubus: isi padu dan luas permukaan', 'hard', (r) => {
    const s = r.int(2, 12);
    return { q: `Isi padu sebuah kubus ialah ${s ** 3} cm³. Berapakah jumlah luas permukaan kubus itu?`, ans: 6 * s * s, wrong: [s * s, 4 * s * s, 12 * s], f: u('cm²'), expl: `${s} × ${s} × ${s} = ${s ** 3}, maka sisi kubus ${s} cm. Luas satu muka = ${s * s} cm². Enam muka = ${6 * s * s} cm².`, calc: `6*${s}*${s}` };
  }),
  M('m-nisbah-bahagi', NK, 'Membahagi mengikut nisbah', 'medium', (r) => {
    const a = r.int(2, 7), b = r.int(2, 9), k = r.int(3, 15);
    if (a === b) return null;
    return { q: `Nisbah bilangan ahli lelaki kepada ahli perempuan dalam sebuah kelab ialah ${a} : ${b}. Kelab itu mempunyai ${(a + b) * k} orang ahli kesemuanya. Berapakah bilangan ahli perempuan?`, ans: b * k, wrong: [a * k, k, ((a + b) * k) / b], f: n, expl: `Jumlah bahagian = ${a + b}. Satu bahagian = ${(a + b) * k} ÷ ${a + b} = ${k}. Perempuan = ${b} × ${k} = ${b * k}.`, calc: `${(a + b) * k}/(${a}+${b})*${b}` };
  }),
  M('m-pekerja-songsang', NK, 'Kadaran songsang', 'hard', (r) => {
    const [w1, d1, w2] = r.pick([[4, 12, 6], [6, 10, 4], [8, 15, 12], [5, 12, 3], [9, 8, 6], [10, 6, 4], [12, 5, 10], [3, 20, 5], [6, 14, 7]] as const);
    return { q: `${w1} orang pekerja dapat mengecat sebuah dewan dalam masa ${d1} hari. Jika setiap pekerja bekerja pada kadar yang sama, berapa harikah yang diperlukan oleh ${w2} orang pekerja untuk mengecat dewan yang sama?`, ans: (w1 * d1) / w2, wrong: [(d1 * w2) / w1, d1 + (w2 - w1), d1], f: u('hari'), expl: `Jumlah kerja = ${w1} × ${d1} = ${w1 * d1} hari-pekerja. ${w1 * d1} ÷ ${w2} = ${(w1 * d1) / w2} hari.`, calc: `${w1}*${d1}/${w2}` };
  }),
  M('m-resipi-kadaran', NK, 'Kadaran terus', 'medium', (r) => {
    const base = r.pick([12, 16, 20, 24]), g = r.pick([150, 200, 250, 300, 360]), want = base * r.pick([1.5, 2.5, 3.5, 4.5]), food = r.pick(['kek cawan', 'biskut', 'donat', 'roti manis']);
    return { q: `Satu resipi memerlukan ${g} g tepung untuk menghasilkan ${base} biji ${food}. Berapa gramkah tepung yang diperlukan untuk menghasilkan ${want} biji ${food}?`, ans: (g / base) * want, wrong: [g + (want - base), g * want, (g * base) / want], f: u('g'), expl: `Tepung bagi sebiji = ${g} ÷ ${base} = ${n(g / base)} g. ${want} × ${n(g / base)} = ${n((g / base) * want)} g.`, calc: `${g}/${base}*${want}` };
  }),
  M('m-skala-peta', NK, 'Skala', 'medium', (r) => {
    const km = r.pick([2, 4, 5, 8, 10, 20]), cm = r.int(23, 96) / 10;
    return { q: `Pada sebuah peta, 1 cm mewakili ${km} km. Jarak antara dua pekan pada peta itu ialah ${cm} cm. Berapakah jarak sebenar antara dua pekan itu?`, ans: cm * km, wrong: [cm / km, cm + km, cm * km * 10], f: u('km'), expl: `${cm} × ${km} = ${n(cm * km)} km.`, calc: `${cm}*${km}` };
  }),
  M('m-markah-perlu', PD, 'Purata sasaran', 'hard', (r) => {
    const k = r.int(3, 5), avg = r.int(62, 80), target = avg + r.int(2, 4), need = target * (k + 1) - avg * k;
    if (need > 100) return null;
    return { q: `Purata markah ${r.pick(NAMES)} dalam ${k} ujian ialah ${avg}. Berapakah markah yang perlu diperolehnya dalam ujian seterusnya supaya purata markah bagi ${k + 1} ujian menjadi ${target}?`, ans: need, wrong: [target, target + (target - avg), need - k], f: n, expl: `Jumlah diperlukan = ${target} × ${k + 1} = ${target * (k + 1)}. Jumlah sedia ada = ${avg} × ${k} = ${avg * k}. Markah diperlukan = ${need}.`, calc: `${target}*(${k}+1)-${avg}*${k}` };
  }),
  M('m-purata-baharu', PD, 'Purata selepas penambahan', 'medium', (r) => {
    const k = r.int(3, 9), avg = r.int(30, 60), newAvg = avg + r.pick([-2, -1, 1, 2, 3]), x = newAvg * (k + 1) - avg * k;
    return { q: `Purata jisim ${k} buah bungkusan ialah ${avg} kg. Sebuah bungkusan berjisim ${x} kg ditambah. Berapakah purata jisim baharu bagi semua bungkusan itu?`, ans: newAvg, wrong: [(avg + x) / 2, avg, (avg * k + x) / k], f: u('kg'), expl: `Jumlah asal = ${k} × ${avg} = ${k * avg} kg. Jumlah baharu = ${k * avg + x} kg. Purata = ${k * avg + x} ÷ ${k + 1} = ${newAvg} kg.`, calc: `(${k}*${avg}+${x})/(${k}+1)` };
  }),
  M('m-guli-kebolehjadian', KB, 'Pecahan sebagai kebolehjadian', 'hard', (r) => {
    const [a, b] = r.pick([[1, 4], [1, 5], [2, 5], [1, 3], [3, 10]] as const), [c, d] = r.pick([[1, 2], [2, 5], [1, 4], [3, 10], [1, 5]] as const), lcm = r.pick([20, 40, 60]), total = lcm * (b === 3 ? 3 : 1);
    const red = (total * a) / b, blue = (total * c) / d, green = total - red - blue;
    if (green <= 0 || !Number.isInteger(red) || !Number.isInteger(blue)) return null;
    return { q: `Sebuah balang mengandungi ${total} biji gula-gula berperisa strawberi, anggur dan limau. Jika sebiji diambil secara rawak, peluang mendapat perisa strawberi ialah ${a}/${b} dan peluang mendapat perisa anggur ialah ${c}/${d}. Berapakah bilangan gula-gula berperisa limau?`, ans: green, wrong: [red, blue, red + blue], f: n, expl: `Strawberi = ${a}/${b} × ${total} = ${red}. Anggur = ${c}/${d} × ${total} = ${blue}. Limau = ${total} − ${red} − ${blue} = ${green}.`, calc: `${total}-${total}*${a}/${b}-${total}*${c}/${d}` };
  }),
  M('m-luas-segitiga-koordinat', K, 'Luas pada satah Cartes', 'hard', (r) => {
    const x1 = r.int(1, 4), y = r.int(1, 4), base = r.pick([4, 6, 8, 10]), h = r.int(3, 9), cx = x1 + r.int(1, base - 1);
    return { q: `Bucu sebuah segi tiga terletak pada titik P(${x1}, ${y}), Q(${x1 + base}, ${y}) dan R(${cx}, ${y + h}). Berapakah luas segi tiga PQR?`, ans: (base * h) / 2, wrong: [base * h, base + h, (base * (y + h)) / 2], f: u('unit²'), expl: `Tapak PQ = ${base} unit. Tinggi = ${y + h} − ${y} = ${h} unit. Luas = 1/2 × ${base} × ${h} = ${(base * h) / 2} unit².`, calc: `(${x1 + base}-${x1})*(${y + h}-${y})/2` };
  }),
];

const science: Template[] = [
  C('c-kelajuan', 'Daya & Gerakan', 'Kelajuan', 'easy', (r) => {
    const v = r.pick([40, 45, 50, 60, 70, 80, 90]), t = r.pick([2, 3, 4, 5]), veh = r.pick(['bas', 'lori', 'kereta', 'motosikal']);
    return { q: `Sebuah ${veh} bergerak sejauh ${v * t} km dalam masa ${t} jam pada kelajuan yang seragam. Berapakah kelajuan ${veh} itu?`, ans: v, wrong: [v * t * t, v * t - t, v * t + t], f: u('km/j'), expl: `Kelajuan = jarak ÷ masa = ${v * t} ÷ ${t} = ${v} km/j.`, calc: `${v * t}/${t}` };
  }),
  C('c-jarak', 'Daya & Gerakan', 'Kelajuan', 'medium', (r) => {
    const v = r.int(3, 12), t = r.pick([15, 20, 25, 30, 40, 45, 50]), who = r.pick(['pelari', 'penunggang basikal', 'perenang', 'pemain kasut roda']);
    return { q: `Seorang ${who} bergerak dengan kelajuan seragam ${v} m/s. Berapakah jarak yang dilaluinya dalam masa ${t} saat?`, ans: v * t, wrong: [t / v, v + t, (v * t) / 10], f: u('m'), expl: `Jarak = kelajuan × masa = ${v} × ${t} = ${v * t} m.`, calc: `${v}*${t}` };
  }),
  C('c-masa', 'Daya & Gerakan', 'Kelajuan', 'hard', (r) => {
    const v = r.pick([40, 50, 60, 80, 100]), t = r.pick([1.5, 2.5, 3.5, 4.5]);
    return { q: `Sebuah kereta api bergerak dengan kelajuan seragam ${v} km/j. Berapa lamakah masa yang diambil untuk perjalanan sejauh ${v * t} km?`, ans: t, wrong: [v * t * v / 1000, t + 1, t - 0.5], f: u('jam'), expl: `Masa = jarak ÷ kelajuan = ${v * t} ÷ ${v} = ${t} jam.`, calc: `${v * t}/${v}` };
  }),
  C('c-ramal-keterlarutan', 'Kemahiran Saintifik', 'Meramal daripada pola data', 'hard', (r) => {
    const per = r.pick([12, 15, 18, 22, 25, 35]), step = r.pick([20, 25, 50]), ask = step * r.pick([6, 7, 8, 10]), sub = r.pick(['garam', 'gula', 'serbuk soda']);
    return {
      q: `Jadual menunjukkan jisim ${sub} yang larut dalam isi padu air yang berbeza pada suhu yang sama. Berdasarkan pola itu, ramalkan jisim ${sub} yang boleh larut dalam ${ask} ml air.`,
      ans: (ask / step) * per, wrong: [per * 5, per * 4 + step, ask], f: u('g'), expl: `Setiap ${step} ml air melarutkan ${per} g. ${ask} ÷ ${step} = ${ask / step}; ${ask / step} × ${per} = ${(ask / step) * per} g.`, calc: `${ask}/${step}*${per}`,
      figure: { type: 'table', caption: `Keterlarutan ${sub}`, headers: ['Isi padu air (ml)', `Jisim ${sub} terlarut (g)`], rows: [1, 2, 3, 4].map((k) => [String(step * k), String(per * k)]) },
    };
  }),
  C('c-nadi', 'Manusia', 'Kadar denyutan nadi', 'easy', (r) => {
    const sec = r.pick([10, 15, 20, 30]), beats = r.int(11, 17) * (sec / 10) + r.int(0, 2), act = r.pick(['berehat', 'berjalan pantas', 'menaiki tangga', 'bermain badminton']);
    return { q: `Seorang murid mengira denyutan nadinya selepas ${act}. Dia mendapati nadinya berdenyut ${beats} kali dalam masa ${sec} saat. Berapakah kadar denyutan nadinya dalam seminit?`, ans: (beats * 60) / sec, wrong: [beats * sec, beats + 60, beats * 60], f: u('denyutan seminit'), expl: `1 minit = 60 saat = ${60 / sec} × ${sec} saat. ${beats} × ${60 / sec} = ${(beats * 60) / sec} denyutan seminit.`, calc: `${beats}*60/${sec}` };
  }),
  C('c-tenaga-alat', 'Tenaga & Elektrik', 'Penggunaan tenaga elektrik', 'hard', (r) => {
    const w = r.pick([40, 60, 100, 200, 500, 1000, 1500]), h = r.pick([2, 3, 4, 5, 6]), days = r.pick([7, 10, 30]), dev = r.pick(['kipas', 'televisyen', 'pemanas air', 'lampu', 'komputer']);
    return { q: `Sebuah ${dev} berkuasa ${w} W digunakan selama ${h} jam setiap hari. Berapakah tenaga elektrik yang digunakannya dalam ${days} hari, dalam kWj? (1 kWj = 1000 W digunakan selama 1 jam)`, ans: (w * h * days) / 1000, wrong: [w * h * days, (w * h) / 1000, (w * days) / 1000], f: u('kWj'), expl: `Tenaga = ${w} W × ${h} jam × ${days} hari = ${w * h * days} Wj = ${n((w * h * days) / 1000)} kWj.`, calc: `${w}*${h}*${days}/1000` };
  }),
  C('c-purata-bacaan', 'Kemahiran Saintifik', 'Purata bacaan ulangan', 'medium', (r) => {
    const base = r.int(120, 480) / 10, d = r.pick([0.1, 0.2, 0.3]), what = r.pick(['masa 10 ayunan bandul (s)', 'panjang spring (cm)', 'suhu air (°C)', 'jisim bongkah (g)']);
    const vals = [base - d, base + d, base].map(n);
    return { q: `Seorang murid mengulang pengukuran ${what} sebanyak tiga kali dan mendapat bacaan ${vals.join(', ')}. Apakah nilai purata yang patut direkodkan?`, ans: base, wrong: [base + d, base * 3, base - d], f: n, expl: `Purata = (${vals.join(' + ')}) ÷ 3 = ${n(base)}.`, calc: `(${vals[0]}+${vals[1]}+${vals[2]})/3` };
  }),
];

const stem: Template[] = [
  S('s-sebutan-ke-n', PM, 'Pola aritmetik', 'hard', (r) => {
    const a = r.int(2, 15), d = r.int(3, 9), k = r.pick([15, 20, 25, 30, 40, 50]);
    return { q: `Diberi pola nombor ${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, ... Apakah sebutan ke-${k} dalam pola ini?`, ans: a + (k - 1) * d, wrong: [a + k * d, k * d, a * k], f: n, expl: `Setiap sebutan bertambah ${d}. Sebutan ke-${k} = ${a} + ${k - 1} × ${d} = ${a + (k - 1) * d}.`, calc: `${a}+(${k}-1)*${d}` };
  }),
  S('s-mancis', PM, 'Pola bentuk', 'medium', (r) => {
    const [side, shape] = r.pick([[3, 'segi tiga'], [4, 'segi empat sama'], [5, 'pentagon'], [6, 'heksagon']] as const), k = r.int(9, 40);
    return { q: `Batang mancis disusun membentuk sebaris ${shape} yang bercantum sisi. Rajah pertama (1 ${shape}) menggunakan ${side} batang mancis, dan setiap ${shape} tambahan berkongsi satu sisi dengan ${shape} sebelumnya. Berapakah batang mancis yang diperlukan untuk membentuk ${k} ${shape}?`, ans: side + (k - 1) * (side - 1), wrong: [side * k, (side - 1) * k, side * k - k - 1], f: n, expl: `${shape} pertama perlu ${side} batang; setiap yang berikutnya perlu ${side - 1} batang. ${side} + ${k - 1} × ${side - 1} = ${side + (k - 1) * (side - 1)}.`, calc: `${side}+(${k}-1)*(${side}-1)` };
  }),
  S('s-tambah-beza', PM, 'Dua syarat serentak', 'hard', (r) => {
    const small = r.int(8, 60), diff = r.int(3, 30) * 2;
    return { q: `Hasil tambah dua nombor ialah ${2 * small + diff} dan beza antara dua nombor itu ialah ${diff}. Apakah nombor yang lebih kecil?`, ans: small, wrong: [small + diff, (2 * small + diff) / 2, small + diff / 2], f: n, expl: `Nombor kecil = (${2 * small + diff} − ${diff}) ÷ 2 = ${small}. Semak: ${small} + ${small + diff} = ${2 * small + diff}.`, calc: `(${2 * small + diff}-${diff})/2` };
  }),
  S('s-umur-gandaan', PM, 'Masalah umur', 'advanced', (r) => {
    const [m1, m2] = r.pick([[4, 2], [5, 3], [6, 3], [7, 4], [3, 2], [5, 2]] as const), child = r.int(4, 12), years = (child * (m1 - m2)) / (m2 - 1);
    if (!Number.isInteger(years) || years < 2) return null;
    return { q: `Umur seorang ibu sekarang ialah ${m1} kali umur anaknya. Dalam masa ${years} tahun lagi, umur ibu itu akan menjadi ${m2} kali umur anaknya. Berapakah umur anak itu sekarang?`, ans: child, wrong: [child + years, m1 * child, years], f: u('tahun'), expl: `Jika umur anak = x: ${m1}x + ${years} = ${m2}(x + ${years}). Maka ${m1 - m2}x = ${years * (m2 - 1)} dan x = ${child}.`, calc: `${years}*(${m2}-1)/(${m1}-${m2})` };
  }),
  S('s-jabat-tangan', PM, 'Membilang pasangan', 'hard', (r) => {
    const k = r.int(6, 24), ctx = r.pick(['bertukar kad nama', 'berjabat tangan', 'bermain satu perlawanan catur']);
    return { q: `Dalam satu perjumpaan, setiap orang ${ctx} sekali sahaja dengan setiap orang lain. Terdapat ${k} orang yang hadir. Berapakah jumlah pertemuan dua orang yang berlaku?`, ans: (k * (k - 1)) / 2, wrong: [k * (k - 1), k * k, 2 * k], f: n, expl: `Setiap orang bertemu ${k - 1} orang lain: ${k} × ${k - 1} = ${k * (k - 1)}, tetapi setiap pertemuan dikira dua kali. ${k * (k - 1)} ÷ 2 = ${(k * (k - 1)) / 2}.`, calc: `${k}*(${k}-1)/2` };
  }),
  S('s-jumlah-siri', PM, 'Hasil tambah siri', 'hard', (r) => {
    const k = r.pick([20, 30, 40, 60, 80, 100, 120, 200]);
    return { q: `Berapakah hasil tambah semua nombor bulat dari 1 hingga ${k}?`, ans: (k * (k + 1)) / 2, wrong: [k * (k + 1), (k * k) / 2, (k * (k - 1)) / 2], f: n, expl: `Pasangkan 1 + ${k}, 2 + ${k - 1}, ...: ${k / 2} pasangan berjumlah ${k + 1}. ${k / 2} × ${k + 1} = ${(k * (k + 1)) / 2}.`, calc: `${k}*(${k}+1)/2` };
  }),
  S('s-kepala-kaki', BR, 'Andaian dan pelarasan', 'hard', (r) => {
    const four = r.int(4, 20), two = r.int(4, 25), [a2, a4] = r.pick([['itik', 'lembu'], ['ayam', 'arnab'], ['burung unta', 'kuda']] as const);
    return { q: `Di sebuah ladang terdapat ${a2} dan ${a4} sahaja. Jumlah kepala ialah ${four + two} dan jumlah kaki ialah ${4 * four + 2 * two}. Berapakah bilangan ${a4}?`, ans: four, wrong: [two, (4 * four + 2 * two) / 4, four + two - 2], f: u('ekor'), expl: `Jika semua ${a2}: ${2 * (four + two)} kaki. Lebihan ${2 * four} kaki datang daripada ${a4} (2 kaki tambahan seekor): ${2 * four} ÷ 2 = ${four}.`, calc: `(${4 * four + 2 * two}-2*${four + two})/2` };
  }),
  S('s-siput', BR, 'Kemajuan bersih', 'hard', (r) => {
    const up = r.int(3, 6), down = r.int(1, up - 1), h = r.int(10, 30), days = Math.ceil((h - up) / (up - down)) + 1, animal = r.pick(['katak', 'siput', 'cicak']);
    return { q: `Seekor ${animal} berada di dasar sebuah perigi sedalam ${h} m. Setiap siang ia memanjat ${up} m, tetapi setiap malam ia tergelincir turun ${down} m. Pada hari ke berapakah ${animal} itu sampai ke bibir perigi?`, ans: days, wrong: [Math.ceil(h / (up - down)), days - 1, Math.ceil(h / up)], f: (v) => `Hari ke-${n(v)}`, expl: `Kemajuan bersih sehari ialah ${up - down} m, tetapi pada hari terakhir ia memanjat ${up} m dan terus sampai. Selepas ${days - 1} hari penuh ia berada pada ${(days - 1) * (up - down)} m; hari ke-${days} ia sampai.`, calc: `(${h}-${up}+(${up - down}-(${h}-${up})%${up - down})%${up - down})/${up - down}+1` };
  }),
  S('s-pokok-jalan', BR, 'Selang dan titik hujung', 'medium', (r) => {
    const gap = r.pick([4, 5, 6, 8, 10]), cnt = r.int(8, 30), thing = r.pick(['tiang lampu', 'pokok palma', 'bendera', 'pasu bunga']);
    return { q: `${thing[0].toUpperCase() + thing.slice(1)} dipasang di sepanjang sebatang jalan lurus sepanjang ${gap * cnt} m. Jarak antara dua ${thing} yang bersebelahan ialah ${gap} m, dan terdapat ${thing} di kedua-dua hujung jalan. Berapakah bilangan ${thing} itu?`, ans: cnt + 1, wrong: [cnt, cnt - 1, 2 * cnt], f: n, expl: `${gap * cnt} ÷ ${gap} = ${cnt} selang. Bilangan ${thing} = bilangan selang + 1 = ${cnt + 1}.`, calc: `${gap * cnt}/${gap}+1` };
  }),
  S('s-dentingan', BR, 'Selang antara peristiwa', 'advanced', (r) => {
    const a = r.int(3, 6), gap = r.int(2, 4), b = r.int(a + 2, 12);
    return { q: `Sebuah jam besar berdenting ${a} kali pada pukul ${a}. Masa dari dentingan pertama hingga dentingan terakhir ialah ${(a - 1) * gap} saat. Berapa saatkah masa dari dentingan pertama hingga dentingan terakhir apabila jam itu berdenting ${b} kali pada pukul ${b}?`, ans: (b - 1) * gap, wrong: [((a - 1) * gap * b) / a, b * gap, (b - 1) * gap + gap * 2], f: u('saat'), expl: `${a} dentingan mempunyai ${a - 1} selang: ${(a - 1) * gap} ÷ ${a - 1} = ${gap} saat setiap selang. ${b} dentingan mempunyai ${b - 1} selang: ${(b - 1) * gap} saat.`, calc: `${(a - 1) * gap}/(${a}-1)*(${b}-1)` };
  }),
  S('s-lilin', BR, 'Dua kadar berubah', 'advanced', (r) => {
    const r2 = r.int(1, 3), r1 = r2 + r.int(1, 3), t = r.int(2, 8), h2 = r.int(10, 20) + r2 * t, h1 = h2 + (r1 - r2) * t;
    return { q: `Lilin X setinggi ${h1} cm terbakar pada kadar ${r1} cm sejam. Lilin Y setinggi ${h2} cm terbakar pada kadar ${r2} cm sejam. Kedua-duanya dinyalakan serentak. Selepas berapa jamkah kedua-dua lilin itu sama tinggi?`, ans: t, wrong: [h1 / r1, (h1 - h2) / r1, t + 1], f: u('jam'), expl: `Beza tinggi ${h1 - h2} cm berkurang ${r1 - r2} cm setiap jam. ${h1 - h2} ÷ ${r1 - r2} = ${t} jam.`, calc: `(${h1}-${h2})/(${r1}-${r2})` };
  }),
  S('s-kereta-api-terowong', BR, 'Jarak sebenar yang dilalui', 'hard', (r) => {
    const v = r.pick([15, 20, 25, 30]), len = r.pick([150, 200, 250, 300]), t = r.int(20, 60), tunnel = v * t - len;
    if (tunnel < 200) return null;
    return { q: `Sebuah kereta api sepanjang ${len} m bergerak dengan laju ${v} m sesaat merentasi sebuah jambatan sepanjang ${tunnel} m. Berapa lamakah masa dari saat kepala kereta api mula menaiki jambatan hingga gerabak terakhir meninggalkan jambatan sepenuhnya?`, ans: t, wrong: [tunnel / v, (tunnel - len) / v, len / v], f: u('saat'), expl: `Kereta api perlu bergerak ${tunnel} + ${len} = ${tunnel + len} m. ${tunnel + len} ÷ ${v} = ${t} saat.`, calc: `(${tunnel}+${len})/${v}` };
  }),
  S('s-tangki-bocor', BR, 'Kadar bersih', 'hard', (r) => {
    const fill = r.int(8, 20), leak = r.int(2, fill - 3), t = r.int(20, 90);
    return { q: `Sebuah tangki kosong berkapasiti ${(fill - leak) * t} liter diisi air pada kadar ${fill} liter seminit. Pada masa yang sama, air mengalir keluar melalui satu kebocoran pada kadar ${leak} liter seminit. Berapa minitkah masa yang diambil untuk memenuhkan tangki itu?`, ans: t, wrong: [((fill - leak) * t) / fill, ((fill - leak) * t) / (fill + leak), ((fill - leak) * t) / leak], f: u('minit'), expl: `Kadar bersih = ${fill} − ${leak} = ${fill - leak} liter seminit. ${(fill - leak) * t} ÷ ${fill - leak} = ${t} minit.`, calc: `${(fill - leak) * t}/(${fill}-${leak})` };
  }),
  S('s-purata-laju', BR, 'Purata laju perjalanan pergi balik', 'advanced', (r) => {
    const [v1, v2, avg] = r.pick([[60, 40, 48], [60, 30, 40], [90, 45, 60], [80, 48, 60], [120, 60, 80], [40, 24, 30], [75, 50, 60], [100, 25, 40]] as const), d = v1 * v2 / 20;
    return { q: `Encik ${r.pick(NAMES)} memandu dari rumah ke kampung sejauh ${n(d)} km dengan laju ${v1} km/j, kemudian pulang melalui jalan yang sama dengan laju ${v2} km/j. Berapakah purata laju bagi keseluruhan perjalanan pergi dan balik itu?`, ans: avg, wrong: [(v1 + v2) / 2, v1 - v2, v2], f: u('km/j'), expl: `Purata laju = jumlah jarak ÷ jumlah masa = ${n(2 * d)} ÷ (${n(d / v1)} + ${n(d / v2)}) jam = ${avg} km/j. Ia bukan purata dua laju itu.`, calc: `2*${n(d)}/(${n(d)}/${v1}+${n(d)}/${v2})` };
  }),
  S('s-syiling-campur', BR, 'Andaian dan pelarasan', 'hard', (r) => {
    const [c1, c2] = r.pick([[10, 50], [20, 50], [10, 20], [5, 20]] as const), a = r.int(4, 15), b = r.int(4, 15);
    return { q: `Sebuah tabung mengandungi ${a + b} keping syiling yang terdiri daripada syiling ${c1} sen dan syiling ${c2} sen sahaja. Jumlah nilainya ialah ${rm((a * c1 + b * c2) / 100)}. Berapakah bilangan syiling ${c2} sen?`, ans: b, wrong: [a, a + b - 1, Math.round((a * c1 + b * c2) / c2)], f: u('keping'), expl: `Jika semua syiling ${c1} sen: ${rm(((a + b) * c1) / 100)}. Lebihan ${rm((b * (c2 - c1)) / 100)} datang daripada syiling ${c2} sen (${c2 - c1} sen tambahan sekeping): ${b} keping.`, calc: `(${a * c1 + b * c2}-${a + b}*${c1})/(${c2}-${c1})` };
  }),
  S('s-barisan', BR, 'Kedudukan dalam barisan', 'medium', (r) => {
    const f = r.int(5, 25), b = r.int(5, 25);
    return { q: `Dalam satu barisan perhimpunan, ${r.pick(NAMES)} berada di kedudukan ke-${f} dari hadapan dan ke-${b} dari belakang. Berapakah jumlah murid dalam barisan itu?`, ans: f + b - 1, wrong: [f + b, f + b + 1, f + b - 2], f: n, expl: `${f} + ${b} = ${f + b}, tetapi murid itu dikira dua kali. ${f + b} − 1 = ${f + b - 1}.`, calc: `${f}+${b}-1` };
  }),
  S('s-kalah-mati', BR, 'Penaakulan songsang', 'advanced', (r) => {
    const k = r.pick([16, 24, 32, 37, 48, 64, 75, 100, 128]), sport = r.pick(['ping pong', 'badminton', 'catur', 'tenis']);
    return { q: `${k} orang pemain menyertai kejohanan ${sport} kalah mati. Dalam setiap perlawanan, pemain yang kalah terus tersingkir dan tiada keputusan seri. Berapakah jumlah perlawanan yang diperlukan untuk menentukan seorang juara?`, ans: k - 1, wrong: [k / 2, k, Math.ceil(Math.log2(k))], f: n, expl: `Setiap perlawanan menyingkirkan tepat seorang pemain. Untuk tinggal seorang juara, ${k - 1} pemain mesti tersingkir, maka ${k - 1} perlawanan.`, calc: `${k}-1` };
  }),
  S('s-venn', LG, 'Set bertindih', 'hard', (r) => {
    const both = r.int(3, 12), onlyA = r.int(4, 15), onlyB = r.int(4, 15), none = r.int(2, 8), [x, y] = r.pick([['berenang', 'berbasikal'], ['catur', 'dam'], ['melukis', 'menyanyi'], ['kopi', 'teh']] as const);
    const total = both + onlyA + onlyB + none;
    return { q: `Dalam satu tinjauan terhadap ${total} orang, ${both + onlyA} orang suka ${x}, ${both + onlyB} orang suka ${y} dan ${none} orang tidak suka kedua-duanya. Berapakah bilangan orang yang suka kedua-dua ${x} dan ${y}?`, ans: both, wrong: [onlyA, both + none, both + onlyA + both + onlyB - total + none], f: n, expl: `Yang suka sekurang-kurangnya satu = ${total} − ${none} = ${total - none}. Suka kedua-duanya = ${both + onlyA} + ${both + onlyB} − ${total - none} = ${both}.`, calc: `${both + onlyA}+${both + onlyB}-(${total}-${none})` };
  }),
  S('s-algoritma-ulang', PK, 'Menjejak algoritma', 'medium', (r) => {
    const x = r.int(2, 9), a = r.pick([2, 3]), b = r.int(1, 5), k = r.pick([3, 4]);
    let v = x; const steps = [x];
    for (let i = 0; i < k; i++) { v = v * a - b; steps.push(v); }
    if (v <= 0) return null;
    return { q: `Ikuti algoritma ini:\n1. Mula dengan nombor ${x}.\n2. Ulang ${k} kali: darab dengan ${a}, kemudian tolak ${b}.\n3. Paparkan nombor itu.\n\nApakah nombor yang dipaparkan?`, ans: v, wrong: [steps[k - 1], x * a ** k - b, (x - b) * a ** k], f: n, expl: steps.join(' → ') + '.', calc: Array.from({ length: k }).reduce<string>((e) => `(${e}*${a}-${b})`, String(x)) };
  }),
  S('s-binari', PK, 'Nombor binari', 'medium', (r) => {
    const v = r.int(9, 63), bin = v.toString(2);
    return { q: `Dalam sistem binari, nilai tempat dari kanan ialah 1, 2, 4, 8, 16, 32 dan seterusnya.\n\nApakah nilai nombor binari ${bin} dalam sistem perpuluhan?`, ans: v, wrong: [bin.split('').filter((c) => c === '1').length, v + 1, v - 2, bin.length], f: n, expl: `Tambah nilai tempat bagi setiap digit 1: ${bin.split('').map((c, i) => (c === '1' ? 2 ** (bin.length - 1 - i) : 0)).filter(Boolean).join(' + ')} = ${v}.`, calc: bin.split('').map((c, i) => `${c}*${2 ** (bin.length - 1 - i)}`).join('+') };
  }),
  S('s-gelung-bersarang', PK, 'Gelung bersarang', 'easy', (r) => {
    const a = r.int(3, 9), b = r.int(3, 9), c = r.int(1, 4), shape = r.pick(['bulatan', 'bintang', 'petak']);
    return { q: `Berapakah bilangan ${shape} yang dilukis oleh arahan ini?\n\nUlang ${a} kali [ Ulang ${b} kali [ lukis satu ${shape} ] ]\nUlang ${c} kali [ lukis satu ${shape} ]`, ans: a * b + c, wrong: [a + b + c, a * b * c, a * b], f: n, expl: `Gelung bersarang melukis ${a} × ${b} = ${a * b} ${shape}. Gelung kedua menambah ${c}. Jumlah = ${a * b + c}.`, calc: `${a}*${b}+${c}` };
  }),
  S('s-kilat', AS, 'Laju bunyi', 'medium', (r) => {
    const t = r.int(2, 12), v = r.pick([330, 340, 345]);
    return { q: `Seorang pemerhati melihat kilat dan mendengar bunyi guruh ${t} saat kemudian. Jika laju bunyi di udara ialah ${v} m sesaat dan cahaya dianggap sampai serta-merta, kira-kira berapakah jarak kilat itu dari pemerhati?`, ans: v * t, wrong: [v / t, v + t, (v * t) / 2], f: u('m'), expl: `Jarak = laju bunyi × masa = ${v} × ${t} = ${v * t} m.`, calc: `${v}*${t}` };
  }),
  S('s-panel-suria', SS, 'Keperluan tenaga', 'medium', (r) => {
    const w = r.pick([250, 300, 350, 400]), kw = r.pick([1.8, 2.4, 3.2, 4.5, 5]), cnt = Math.ceil((kw * 1000) / w);
    return { q: `Sebuah bangunan memerlukan ${kw} kW kuasa elektrik. Setiap panel suria menghasilkan ${w} W. Berapakah bilangan panel suria paling sedikit yang diperlukan? (1 kW = 1000 W)`, ans: cnt, wrong: [cnt - 1, Math.round(kw * 1000 / w * 10), Math.round(w / kw)], f: u('panel'), expl: `${kw} kW = ${kw * 1000} W. ${kw * 1000} ÷ ${w} = ${n((kw * 1000) / w)}, maka sekurang-kurangnya ${cnt} panel.`, calc: `(${kw * 1000}+(${w}-${kw * 1000}%${w})%${w})/${w}` };
  }),
  S('s-led-jimat', SS, 'Penjimatan tenaga', 'hard', (r) => {
    const old = r.pick([40, 60, 75, 100]), led = r.pick([8, 10, 12, 15]), h = r.int(3, 8), days = r.pick([30, 60, 90]), cnt = r.int(2, 10);
    return { q: `Sebuah sekolah menggantikan ${cnt} biji mentol ${old} W dengan lampu LED ${led} W. Setiap lampu digunakan ${h} jam sehari. Berapakah jumlah tenaga elektrik yang dijimatkan dalam ${days} hari, dalam kWj? (1 kWj = 1000 Wj)`, ans: (cnt * (old - led) * h * days) / 1000, wrong: [((old - led) * h * days) / 1000, (cnt * old * h * days) / 1000, (cnt * (old - led) * days) / 1000], f: u('kWj'), expl: `Penjimatan kuasa = ${cnt} × (${old} − ${led}) = ${cnt * (old - led)} W. Masa = ${h} × ${days} = ${h * days} jam. Tenaga = ${cnt * (old - led) * h * days} Wj = ${n((cnt * (old - led) * h * days) / 1000)} kWj.`, calc: `${cnt}*(${old}-${led})*${h}*${days}/1000` };
  }),
  S('s-dron', SS, 'Had operasi', 'hard', (r) => {
    const v = r.pick([30, 36, 40, 48, 60]), min = r.pick([20, 25, 30, 40, 45, 50]), d = (v * min) / 60 / 2;
    if (Math.abs(d * 10 - Math.round(d * 10)) > 1e-9) return null;
    return { q: `Sebuah dron penghantar boleh terbang selama ${min} minit dengan laju ${v} km/j sebelum baterinya habis. Dron itu mesti pergi ke satu lokasi dan pulang semula ke pangkalan tanpa mengecas. Berapakah jarak paling jauh lokasi itu dari pangkalan?`, ans: d, wrong: [d * 2, (v * min) / 2, v / 2], f: u('km'), expl: `Jarak penerbangan maksimum = ${v} × ${min}/60 = ${n(d * 2)} km. Untuk pergi dan balik, lokasi mesti dalam lingkungan ${n(d)} km.`, calc: `${v}*${min}/60/2` };
  }),
  S('s-pengairan', SS, 'Penggunaan sumber', 'medium', (r) => {
    const l = r.pick([1.5, 2, 2.5, 3, 4]), trees = r.int(6, 40) * 10, h = r.int(2, 5), days = r.pick([5, 7, 10, 14]);
    return { q: `Sebuah sistem pengairan titis membekalkan ${l} liter air sejam kepada setiap pokok. Ladang itu mempunyai ${trees} batang pokok dan sistem itu beroperasi ${h} jam sehari. Berapa literkah air yang digunakan dalam ${days} hari?`, ans: l * trees * h * days, wrong: [l * trees * h, l * trees * days, trees * h * days], f: u('liter'), expl: `Sehari: ${l} × ${trees} × ${h} = ${n(l * trees * h)} liter. ${days} hari: ${n(l * trees * h * days)} liter.`, calc: `${l}*${trees}*${h}*${days}` };
  }),
  S('s-tadahan-hujan', SS, 'Isi padu daripada luas dan kedalaman', 'advanced', (r) => {
    const area = r.int(4, 20) * 10, mm = r.pick([5, 10, 15, 20, 25, 40]);
    return { q: `Sebuah sistem tadahan air hujan mengumpulkan air dari bumbung seluas ${area} m². Pada suatu hari, hujan setinggi ${mm} mm turun. Berapa literkah air yang dapat dikumpulkan jika tiada air yang hilang? (1 m³ = 1000 liter)`, ans: area * mm, wrong: [(area * mm) / 10, area * mm * 10, (area * mm) / 1000], f: u('liter'), expl: `${mm} mm = ${mm / 1000} m. Isi padu = ${area} × ${mm / 1000} = ${n((area * mm) / 1000)} m³ = ${area * mm} liter.`, calc: `${area}*${mm}/1000*1000` };
  }),
  S('s-sesaran', PS, 'Kaedah sesaran air', 'medium', (r) => {
    const a = r.int(20, 60), v = r.int(8, 45), k = r.int(2, 5), obj = r.pick(['guli', 'bebola keluli', 'batu kelikir yang serupa', 'skru']);
    return { q: `Sebuah silinder penyukat berisi ${a} ml air. Apabila ${k} biji ${obj} yang sama saiz dimasukkan, paras air naik kepada ${a + v * k} ml. Berapakah isi padu sebiji ${obj}? (1 ml = 1 cm³)`, ans: v, wrong: [v * k, a + v * k, (a + v * k) / k], f: u('cm³'), expl: `Isi padu ${k} biji = ${a + v * k} − ${a} = ${v * k} cm³. Sebiji = ${v * k} ÷ ${k} = ${v} cm³.`, calc: `(${a + v * k}-${a})/${k}` };
  }),
  S('s-purata-jadual', AD, 'Purata daripada jadual', 'medium', (r) => {
    const months = ['Januari', 'Februari', 'Mac', 'April', 'Mei'], vals = months.map(() => r.int(12, 40) * 10), sum = vals.reduce((x, y) => x + y, 0), place = r.pick(['Stesen Bukit Jati', 'Stesen Sungai Lada', 'Stesen Padang Luas', 'Stesen Teluk Biru']);
    return { q: `Jadual menunjukkan jumlah hujan bulanan yang direkodkan di ${place}. Berapakah purata hujan bulanan bagi lima bulan itu?`, ans: sum / 5, wrong: [sum, (Math.max(...vals) + Math.min(...vals)) / 2 + 1, sum / 4], f: u('mm'), expl: `Jumlah = ${vals.join(' + ')} = ${sum} mm. Purata = ${sum} ÷ 5 = ${sum / 5} mm.`, calc: `(${vals.join('+')})/5`, figure: { type: 'table', caption: `Hujan bulanan di ${place}`, headers: ['Bulan', 'Hujan (mm)'], rows: months.map((m, i) => [m, String(vals[i])]) } };
  }),
  S('s-sudut-sektor', AD, 'Carta palang kepada carta pai', 'advanced', (r) => {
    const total = r.pick([120, 180, 360, 720]), unit = total / 360, parts = [r.int(60, 110), r.int(60, 100), r.int(40, 80)].map((x) => Math.round(x / 5) * 5), last = 360 - parts[0] - parts[1] - parts[2];
    if (last < 30) return null;
    const angles = [...parts, last], labels = ['Robotik', 'Sains', 'Matematik', 'Catur'], vals = angles.map((a) => a * unit), idx = r.int(0, 3);
    if (vals.some((v) => !Number.isInteger(v))) return null;
    return { q: `Carta palang menunjukkan bilangan ahli empat kelab; setiap murid menyertai satu kelab sahaja. Jika data ini dilukis semula sebagai carta pai, berapakah sudut sektor bagi Kelab ${labels[idx]}?`, ans: angles[idx], wrong: [vals[idx], (vals[idx] / total) * 100, angles[idx] / 2, 90], f: (v) => `${n(v)}°`, expl: `Jumlah ahli = ${total}. Sudut = ${vals[idx]}/${total} × 360° = ${angles[idx]}°.`, calc: `${vals[idx]}/(${vals.join('+')})*360`, figure: { type: 'bar', caption: 'Keahlian kelab', labels, values: vals, yLabel: 'Bilangan ahli' } };
  }),
  S('s-peratus-perubahan', AD, 'Peratus perubahan daripada data', 'hard', (r) => {
    const from = r.pick([200, 250, 400, 500, 800]), p = r.pick([10, 20, 25, 30, 40]), down = r.pick([true, false]), to = from * (1 + (down ? -p : p) / 100), thing = r.pick(['pelawat', 'pelanggan', 'peserta', 'penumpang']);
    return { q: `Jadual menunjukkan bilangan ${thing} pada dua minggu berturutan. Berapakah peratus ${down ? 'penurunan' : 'peningkatan'} bilangan ${thing} dari Minggu 1 ke Minggu 2?`, ans: p, wrong: [Math.abs(to - from), (Math.abs(to - from) / to) * 100, 100 - p], f: pct, expl: `Perubahan = ${Math.abs(to - from)}. Peratus = ${Math.abs(to - from)} ÷ ${from} × 100% = ${p}%. Peratus dikira atas nilai asal (Minggu 1).`, calc: down ? `(${from}-${to})/${from}*100` : `(${to}-${from})/${from}*100`, figure: { type: 'table', caption: `Bilangan ${thing}`, headers: ['Minggu', `Bilangan ${thing}`], rows: [['Minggu 1', String(from)], ['Minggu 2', String(to)]] } };
  }),
];

export const TEMPLATES: Template[] = [...math, ...science, ...stem];
