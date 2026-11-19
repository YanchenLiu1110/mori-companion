// Local stand-in for the Gemini generateContent endpoint (no real API key).
// GET /_calls lists received requests.
import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const calls = [];

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    if (req.url.startsWith('/_calls')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(calls));
      return;
    }
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    calls.push({
      key: req.headers['x-goog-api-key'],
      contents: body.contents || [],
      system: body.systemInstruction?.parts?.[0]?.text || '',
      generationConfig: body.generationConfig,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        candidates: [
          {
            content: { parts: [{ text: "Yeah — let's shrink it down. Open the doc, Mira, write one messy sentence, and I'll wait by the window." }] },
            finishReason: 'STOP',
          },
        ],
      }),
    );
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`mock gemini on ${PORT}`));
