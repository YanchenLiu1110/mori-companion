// Local stand-in for the Netlify Functions + static hosting runtime (testing only).
//   /.netlify/functions/companion → netlify/functions/companion.js default export
//   everything else               → dist/ (static build output)
// Outbound Gemini calls are redirected to GEMINI_MOCK_URL when set.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT || 8888);
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const MOCK_BASE = process.env.GEMINI_MOCK_URL;
if (MOCK_BASE) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => {
    const target = String(url).replace(GEMINI_BASE, MOCK_BASE);
    return realFetch(target, options);
  };
}

const { default: handler } = await import('../netlify/functions/companion.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  if (url.pathname.startsWith('/.netlify/functions/companion')) {
    const request = new Request(`http://127.0.0.1:${PORT}${url.pathname}`, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
    return;
  }

  const filePath = normalize(join('dist', url.pathname === '/' ? 'index.html' : url.pathname));
  try {
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`mock netlify runtime on ${PORT}`));
