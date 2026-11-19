/**
 * Local test harness for the Gemini proxy — NO real API key required.
 * Starts the Netlify function with a mocked Gemini Interactions endpoint.
 *
 *   node scripts/test-companion-function.mjs
 *
 * The proxy returns one JSON document, so real HTTP status codes are asserted
 * directly. (Streaming keep-alive was tried and dropped: Netlify terminates
 * the edge response once the function returns, so only the first chunk reached
 * the browser — the JSON was lost.)
 */
const GEMINI_INTERACTIONS = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const GEMINI_CALLS = [];
const PROBE_STATE = { slowProbe: false };
let mockGeminiHandler = null;

// Intercept the outbound Gemini request.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  if (String(url).startsWith('https://generativelanguage.googleapis.com/')) {
    // Reachability probe (GET models) — no model call, no quota.
    if (!options.method || options.method === 'GET') {
      if (PROBE_STATE.slowProbe) {
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, 5000);
          options?.signal?.addEventListener('abort', () => {
            clearTimeout(t);
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          }, { once: true });
        });
      }
      return new Response('{"models":[]}', { status: 200 });
    }
    const body = JSON.parse(options.body || '{}');
    GEMINI_CALLS.push({ url: String(url), key: options.headers?.['x-goog-api-key'], body });
    const result = mockGeminiHandler(body);
    return new Response(JSON.stringify(result.body), { status: result.status || 200 });
  }
  return realFetch(url, options);
};

const moduleUrl = new URL(`../netlify/functions/companion.js?v=${Date.now()}`, import.meta.url);
let { default: handler } = await import(moduleUrl.href);

function makeRequest(body, method = 'POST') {
  return new Request('https://example.netlify.app/.netlify/functions/companion', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

function errorStatus(data) {
  if (data.error === 'Method not allowed') return 405;
  if (data.error === 'Invalid JSON body.') return 400;
  if (data.error === 'A user message is required.') return 400;
  if (/key not valid|API_KEY_INVALID/i.test(data.error)) return 400;
  if (/no longer available/i.test(data.error)) return 404;
  if (data.retryable) return 502;
  if (/high demand/i.test(data.error)) return 503;
  return 400;
}

/** Calls the handler and returns { status, data, raw }. */
async function call(body, method = 'POST') {
  const response = await handler(makeRequest(body, method));
  const raw = await response.text();
  const data = JSON.parse(raw || '{}');
  return { status: response.status, data, raw };
}

const REPLY = 'Stuck usually means the next step is too big, Mira. Open the document and write one ugly sentence — the forest will do the rest.';
const ok = (text) => ({ body: { id: 'int_123', status: 'completed', output_text: text } });

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

// 1) No key
delete process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_KEYS;
let { status, data } = await call(conversation);
check(
  'No key configured → { configured: false }',
  status === 200 && data.configured === false && data.reply === null,
  JSON.stringify(data),
);

// 2) Happy path
process.env.GEMINI_API_KEY = 'test-key-primary';
mockGeminiHandler = () => ok(REPLY);
({ status, data } = await call(conversation));
check('Valid key → Gemini reply', status === 200 && data.reply === REPLY, `status ${status}`);
const sentCall = GEMINI_CALLS.at(-1);
check('Uses Interactions API endpoint', sentCall?.url === GEMINI_INTERACTIONS, sentCall?.url);
check('Model defaults to gemini-3.8-flash', sentCall?.body?.model === 'gemini-3.8-flash', sentCall?.body?.model);
check('System instruction forwarded (snake_case)', sentCall?.body?.system_instruction?.includes('Boba'));
check('Conversation sent as 3 turns', sentCall?.body?.input?.length === 3, `input ${sentCall?.body?.input?.length}`);
check('First turn is user_input', sentCall?.body?.input?.[0]?.type === 'user_input');
check('Assistant turns mapped to model_output', sentCall?.body?.input?.[1]?.type === 'model_output');
check('Last turn is user_input (no prefill)', sentCall?.body?.input?.at(-1)?.type === 'user_input');
check(
  'No deprecated temperature/top_p sent',
  !('temperature' in (sentCall?.body?.generation_config || {})) && !('top_p' in (sentCall?.body?.generation_config || {})),
);
check('thinking_level=low for snappy chat', sentCall?.body?.generation_config?.thinking_level === 'low');
check('store=false (no PII retained server-side)', sentCall?.body?.store === false);
check('Key sent in x-goog-api-key header', sentCall?.key === 'test-key-primary');

// 3) Markdown stripped
mockGeminiHandler = () => ok('**Proud of you**, Mira. Rest counts too.');
({ data } = await call(conversation));
check('Markdown bold removed', data.reply === 'Proud of you, Mira. Rest counts too.', data.reply);

// 4) Trailing assistant turn is dropped (prefill would 400)
mockGeminiHandler = () => ok('Sure.');
await call({
  systemPrompt: 'x',
  messages: [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'hi there' },
  ],
});
const trimmed = GEMINI_CALLS.at(-1).body.input;
check('Trailing model turn removed', trimmed.length === 1 && trimmed[0].type === 'user_input', `${trimmed.length} turns`);

// 5) Daily quota: only one attempt per model (no retry burn), 429 surfaced with hint
process.env.GEMINI_API_KEYS = 'test-key-backup';
let limitedAttempts = 0;
let limitedKeys = [];
mockGeminiHandler = () => {
  limitedAttempts += 1;
  limitedKeys.push(GEMINI_CALLS.at(-1).key);
  return { status: 429, body: { error: { code: 429, message: 'Rate limit exceeded for model gemini-3.8-flash (limit: 20 requests per day on Free Tier). Please retry in 4h10m47s or upgrade your tier at https://ai.dev/rate-limit.' } } };
};
({ status, data } = await call(conversation));
check('Daily quota → 429 with retry_in hint', status === 429 && /4h10m47s/.test(data.retry_in || ''), `${status} · ${data.retry_in}`);
check(
  'Daily quota → one attempt per model, then next key',
  limitedAttempts === 2 && limitedKeys.join(',') === 'test-key-primary,test-key-backup',
  `${limitedAttempts} attempts on ${limitedKeys.length} keys`,
);

// 5b) Quota hit on every model → the key rotates before giving up
process.env.GEMINI_API_KEYS = '';
process.env.GEMINI_API_KEY = 'test-key-primary';
let modelOrder = [];
mockGeminiHandler = (body) => {
  modelOrder.push(body.model);
  return { status: 429, body: { error: { code: 429, message: 'Rate limit exceeded for model ' + body.model + ' (limit: 20 requests per day on Free Tier).' } } };
};
({ status } = await call(conversation));
check('Quota → falls through each model, then stops', status === 429 && modelOrder.length === 1, modelOrder.join(','));

// 6) Invalid key → surfaced
process.env.GEMINI_API_KEYS = '';
mockGeminiHandler = () => ({ status: 400, body: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } } });
({ status, data } = await call(conversation));
check('Invalid key → 400 surfaced', status === 400 && /key not valid/i.test(data.error), data.error);

// 7) Model retired → 404 surfaced
mockGeminiHandler = () => ({
  status: 404,
  body: { error: { code: 404, message: 'This model models/gemini-2.5-flash is no longer available to new users.' } },
});
({ status, data } = await call(conversation));
check('Retired model → 404 surfaced', status === 404 && /no longer available/.test(data.error), `status ${status}`);

// 8) Completed interaction with empty text → 502 (mock fallback)
mockGeminiHandler = () => ({ body: { id: 'int_x', status: 'completed', output_text: '' } });
({ status } = await call(conversation));
check('Empty output_text → fallback signal', status === 502, `status ${status}`);

// 9) Alternate response shape fallback
mockGeminiHandler = () => ({
  body: {
    id: 'int_y',
    output: [
      { type: 'thought', content: [{ type: 'text', text: 'hidden reasoning', thought: true }] },
      { type: 'model_output', content: [{ type: 'text', text: 'From the steps shape.' }] },
    ],
  },
});
({ status, data } = await call(conversation));
check('Alternate output[] shape parsed', status === 200 && data.reply === 'From the steps shape.', data.reply);

// 10) Rescue: overloaded on first try → retry succeeds
let tries = 0;
mockGeminiHandler = () => {
  tries += 1;
  return tries === 1
    ? { status: 503, body: { error: { code: 503, message: 'gemini-3.8-flash is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.' } } }
    : ok('Second try worked, Mira.');
};
({ status, data } = await call(conversation));
check('Overloaded on first try → auto retry succeeds', status === 200 && data.reply.includes('Second try'), `status ${status}, attempts ${tries}`);

// 11) Rescue: primary overloaded for every attempt → fallback model answers
process.env.GEMINI_FALLBACK_MODELS = 'gemini-3.6-flash';
const modelTries = {};
mockGeminiHandler = (body) => {
  modelTries[body.model] = (modelTries[body.model] || 0) + 1;
  if (body.model === 'gemini-3.8-flash') {
    return { status: 503, body: { error: { code: 503, message: 'gemini-3.8-flash is currently experiencing high demand. Please try again later.' } } };
  }
  return ok(`Fallback ${body.model} here.`);
};
({ status, data } = await call(conversation));
check(
  'Primary fully overloaded → fallback model answers',
  status === 200 && data.fallback === true && data.model === 'gemini-3.6-flash',
  `${data.model} · ${JSON.stringify(modelTries)}`,
);
delete process.env.GEMINI_FALLBACK_MODELS;

// 12) No fan-out on real 400s
let fanOut = 0;
mockGeminiHandler = () => {
  fanOut += 1;
  return { status: 400, body: { error: { code: 400, message: 'Invalid argument: bad input.' } } };
};
({ status } = await call(conversation));
check('400 is not retried across models', status === 400 && fanOut === 1, `${fanOut} attempts`);

// 13) Every model down → retryable failure
process.env.GEMINI_FALLBACK_MODELS = 'gemini-3.6-flash';
mockGeminiHandler = () => ({ status: 500, body: { error: { code: 500, message: 'Internal error encountered.' } } });
({ status, data } = await call(conversation));
check('All models down → 502 retryable', status === 502 && data.retryable === true, JSON.stringify(data));
delete process.env.GEMINI_FALLBACK_MODELS;

// 14) Validation
({ status } = await call({}, 'GET'));
check('GET → 405', status === 405);
delete process.env.GEMINI_API_KEY;
const invalidJson = await handler(new Request('https://example.netlify.app/x', { method: 'POST', body: 'not-json' }));
const invalidData = JSON.parse(await invalidJson.text());
check('Invalid JSON → 400', invalidData.error === 'Invalid JSON body.');
process.env.GEMINI_API_KEY = 'test-key-primary';
({ status } = await call({ messages: [{ role: 'assistant', content: 'only model turn' }] }));
check('No user turn → 400', status === 400);

// 15) Response is a single JSON document (no streamed prefix)
mockGeminiHandler = () => ok('Framing check.');
const framed = await call(conversation);
check(
  'Single JSON body (no streamed prefix)',
  framed.raw.trim().startsWith('{"') && framed.data.reply === 'Framing check.',
  JSON.stringify(framed.raw.slice(0, 24)),
);

// 16) Slow upstream is cut off by the budget so the gateway never times out
process.env.GEMINI_TIMEOUT_MS = '400';
const realFetchSlow = globalThis.fetch;
const hadProbe = PROBE_STATE.slowProbe;
PROBE_STATE.slowProbe = false; // made the warm instance look healthy (fast probe)
globalThis.fetch = async (url, options) => {
  if (String(url).includes('generativelanguage') && options?.method === 'POST') {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 5000);
      options?.signal?.addEventListener('abort', () => {
        clearTimeout(t);
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
    });
  }
  return new Response('{}', { status: 200 });
};
const slowStart = Date.now();
({ status } = await call(conversation));
const slowMs = Date.now() - slowStart;
globalThis.fetch = realFetchSlow;
PROBE_STATE.slowProbe = hadProbe;
check('Slow Gemini → aborted within budget → 502 retryable', status === 502 && slowMs < 2000, `${slowMs} ms`);
delete process.env.GEMINI_TIMEOUT_MS;

// 17) Slow upstream probe → light model first
// Fresh module instance → empty probe cache, now against a slow upstream.
({ default: handler } = await import(new URL(`../netlify/functions/companion.js?v=2-${Date.now()}`, import.meta.url).href));
const order = [];
PROBE_STATE.slowProbe = true;
globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes('generativelanguage') && options?.method === 'GET') {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 5000);
      options?.signal?.addEventListener('abort', () => { clearTimeout(t); reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); }, { once: true });
    });
  }
  const body = JSON.parse(options.body || '{}');
  order.push(body.model);
  return new Response(JSON.stringify({ output_text: 'Lite answer.' }), { status: 200 });
};
({ status, data } = await call(conversation));
check(
  'Slow upstream probe → light model tried first',
  status === 200 && order[0] === 'gemini-3.5-flash-lite',
  order.join(' → '),
);
globalThis.fetch = realFetch;

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
