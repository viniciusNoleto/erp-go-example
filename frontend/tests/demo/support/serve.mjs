// Serve o build de produção (a exportação estática em ./out) para o vídeo, como o nginx faz em produção:
// cada rota é um arquivo .html (/sales -> sales.html) e /api vai para a API de demonstração, inclusive o
// Server-Sent Events (/api/events), repassado sem buffer.
//
//   DEMO_PORT=3200 API_URL=http://localhost:8099 node tests/demo/support/serve.mjs
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../out');
const PORT = Number(process.env.DEMO_PORT ?? 3200);
const API = new URL(process.env.API_URL ?? 'http://localhost:8099');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

if (!existsSync(ROOT)) {
  console.error(`Sem build em ${ROOT}: rode \`npx next build\` antes.`);
  process.exit(1);
}

/** O arquivo de uma rota, na ordem do try_files do nginx: $uri, $uri.html, $uri/index.html. */
function resolveFile(pathname) {
  const clean = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const base = path.join(ROOT, clean);
  if (!base.startsWith(ROOT)) return null;

  for (const candidate of [base, `${base}.html`, path.join(base, 'index.html')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function proxy(req, res) {
  const upstream = http.request(
    { hostname: API.hostname, port: API.port, path: req.url, method: req.method, headers: { ...req.headers, host: API.host } },
    (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      // Sem buffer: o SSE chega no navegador evento a evento.
      res.flushHeaders();
      answer.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
}

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname.startsWith('/api/')) return proxy(req, res);

    const file = resolveFile(pathname);
    const status = file ? 200 : 404;
    const target = file ?? path.join(ROOT, '404.html');
    const immutable = pathname.startsWith('/_next/static/');

    res.writeHead(status, {
      'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    createReadStream(target).pipe(res);
  })
  .listen(PORT, () => console.log(`GoMoney (build estático) em http://localhost:${PORT}, /api -> ${API.origin}`));
