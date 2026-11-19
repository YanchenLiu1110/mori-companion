/**
 * Local test harness for the Gemini proxy — NO real API key required.
 * Starts the Netlify function with a mocked Gemini endpoint.
 *
 *   node scripts/test-companion-function.mjs
 */
import http from 'node:http';

const GEMINI_CALLS = [];
let mockGeminiHandler = null;

// Intercept the outbound Gemini request.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.startsWith('https://generativelanguage.googleapis.com/')) {
    const body = JSON.parse(options.body || '{}');
    GEMINI_CALLS.push({ url: target, key: options.headers?.['x-goog-api-key'], body });
    const result = mockGeminiHandler(body);
    return new Response(JSON.stringify(result.body), { status: result.status || 200 });
  }
  return realFetch(url, options);
};

const { default: handler } = await import('../netlify/functions/companion.js');

function makeRequest(body, method = 'POST') {
  return new Request('https://example.netlify.app/.netlify/functions/companion', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

const REPLY = 'Stuck usually means the next step is too big, Mira. Open the document and write one ugly sentence — the forest will do the rest.';
const ok = (body) => ({ body: { candidates: [{ content: { parts: [{ text: body }] }, finishReason: 'STOP' }] } });

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const conversation = {
  systemPrompt: 'You are Boba, a warm companion in MORI. Level 5, 9-day streak.',
  userMessage: 'I feel stuck today',
  messages: [
    { role: 'user', content: 'Hi Boba' },
    { role: 'assistant', content: 'There you are, Mira.' },
    { role: 'user', content: 'I feel stuck today' },
  ],
  context: { nickname: 'Mira', streak: 9 },
};

// 1) Happy path
delete process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_KEYS;
let res = await handler(makeRequest(conversation));
let firstBody = await res.json();
check(
  'No key configured → 200 { configured: false } fallback signal',
  res.status === 200 && firstBody.configured === false && firstBody.reply === null,
  `status ${res.status} ${JSON.stringify(firstBody)}`,
);

process.env.GEMINI_API_KEY = 'test-key-primary';
mockGeminiHandler = () => ok(REPLY);
res = await handler(makeRequest(conversation));
let data = await res.json();
check('Valid key → 200 with Gemini reply', res.status === 200 && data.reply === REPLY, `status ${res.status}`);
check('Model defaults to gemini-2.5-flash', GEMINI_CALLS.at(-1)?.url.includes('gemini-2.5-flash'), GEMINI_CALLS.at(-1)?.url.split('/models/')[1]);
const sent = GEMINI_CALLS.at(-1)?.body;
check('System instruction forwarded', sent?.systemInstruction?.parts?.[0]?.text?.includes('Boba'));
check('Conversation history forwarded (3 turns)', sent?.contents?.length === 3, `contents ${sent?.contents?.length}`);
check('Assistant turns mapped to model role', sent?.contents?.[1]?.role === 'model');
check('Thinking disabled for fast chat', sent?.generationConfig?.thinkingConfig?.thinkingBudget === 0);
check('Key sent in x-goog-api-key header', GEMINI_CALLS.at(-1)?.key === 'test-key-primary');

// 2) Markdown bold stripped
mockGeminiHandler = () => ok('**Proud of you**, Mira. Rest counts too.');
res = await handler(makeRequest(conversation));
data = await res.json();
check('Markdown bold removed', data.reply === 'Proud of you, Mira. Rest counts too.', data.reply);

// 3) Quota error rotates to the backup key
process.env.GEMINI_API_KEYS = 'test-key-backup';
let callCount = 0;
mockGeminiHandler = () => {
  callCount += 1;
  return callCount === 1
    ? { status: 429, body: { error: { code: 429, message: 'Quota exceeded' } } }
    : ok('Backup key answered, hey Mira.');
};
res = await handler(makeRequest(conversation));
data = await res.json();
check('429 on primary → retries with backup key', res.status === 200 && data.reply.includes('Backup key'), `status ${res.status}`);

// 4) Invalid key → client fallback status
process.env.GEMINI_API_KEYS = '';
callCount = 0;
mockGeminiHandler = () => ({ status: 400, body: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } } });
res = await handler(makeRequest(conversation));
data = await res.json();
check('Invalid key → 400 surfaced', res.status === 400 && /key not valid/i.test(data.error), data.error);

// 5) Safety block (no candidate text) with status 200
mockGeminiHandler = () => ({ body: { candidates: [{ finishReason: 'SAFETY' }] } });
res = await handler(makeRequest(conversation));
check('Blocked/empty candidate → 502 (triggers mock fallback)', res.status === 502, `status ${res.status}`);

// 6) Request validation
res = await handler(makeRequest({}, 'GET'));
check('GET → 405', res.status === 405);
delete process.env.GEMINI_API_KEY;
res = await handler(new Request('https://example.netlify.app/x', { method: 'POST', body: 'not-json' }));
check('Invalid JSON → 400', res.status === 400);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
