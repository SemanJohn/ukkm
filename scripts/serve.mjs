// Pelayan statik ringkas untuk folder out/ (hasil `npm run build`).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');
const port = Number(process.argv[2] || process.env.PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

if (!fs.existsSync(root)) {
  console.error('Folder out/ tiada. Jalankan `npm run build` dahulu.');
  process.exit(1);
}

http
  .createServer((req, res) => {
    const p = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.normalize(path.join(root, p));
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    let status = 200;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    if (!fs.existsSync(file)) {
      file = path.join(root, '404.html');
      status = 404;
    }
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' };
    if (path.basename(file) === 'sw.js') headers['Cache-Control'] = 'no-cache';
    res.writeHead(status, headers);
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Simulator MRSM 2027: http://localhost:${port}`));
