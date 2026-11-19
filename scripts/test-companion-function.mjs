/**
 * Local test harness for the Gemini proxy — NO real API key required.
 * Starts the Netlify function with a mocked Gemini Interactions endpoint.
 *
 *   node scripts/test-companion-function.mjs
 */
const GEMINI_INTERACTIONS = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const GEMINI_CALLS = [];
let mockGeminiHandler = null;

// Intercept the outbound Gemini request.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  if (String(url).startsWith('https://generativelanguage.googleapis.com/')) {
    const body = JSON.parse(options.body || '{}');
    GEMINI_CALLS.push({ url: String(url), key: options.headers?.['x-goog-api-key'], body });
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
let res = await handler(makeRequest(conversation));
let data = await res.json();
check(
  'No key configured → 200 { configured: false }',
  res.status === 200 && data.configured === false && data.reply === null,
  JSON.stringify(data),
);

// 2) Happy path
process.env.GEMINI_API_KEY = 'test-key-primary';
mockGeminiHandler = () => ok(REPLY);
res = await handler(makeRequest(conversation));
data = await res.json();
check('Valid key → 200 with Gemini reply', res.status === 200 && data.reply === REPLY, `status ${res.status}`);
const call = GEMINI_CALLS.at(-1);
check('Uses Interactions API endpoint', call?.url === GEMINI_INTERACTIONS, call?.url);
check('Model defaults to gemini-3.8-flash', call?.body?.model === 'gemini-3.8-flash', call?.body?.model);
check('System instruction forwarded (snake_case)', call?.body?.system_instruction?.includes('Boba'));
check('Conversation sent as 3 turns', call?.body?.input?.length === 3, `input ${call?.body?.input?.length}`);
check('First turn is user_input', call?.body?.input?.[0]?.type === 'user_input');
check('Assistant turns mapped to model_output', call?.body?.input?.[1]?.type === 'model_output');
check('Last turn is user_input (no prefill)', call?.body?.input?.at(-1)?.type === 'user_input');
check('No deprecated temperature/top_p sent', !('temperature' in (call?.body?.generation_config || {})) && !('top_p' in (call?.body?.generation_config || {})));
check('thinking_level=low for snappy chat', call?.body?.generation_config?.thinking_level === 'low');
check('store=false (no PII retained server-side)', call?.body?.store === false);
check('Key sent in x-goog-api-key header', call?.key === 'test-key-primary');

// 3) Markdown stripped
mockGeminiHandler = () => ok('**Proud of you**, Mira. Rest counts too.');
res = await handler(makeRequest(conversation));
data = await res.json();
check('Markdown bold removed', data.reply === 'Proud of you, Mira. Rest counts too.', data.reply);

// 4) Trailing assistant turn is dropped (prefill would 400)
mockGeminiHandler = () => ok('Sure.');
await handler(
  makeRequest({
    systemPrompt: 'x',
    messages: [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
    ],
  }),
);
const trimmed = GEMINI_CALLS.at(-1).body.input;
check('Trailing model turn removed', trimmed.length === 1 && trimmed[0].type === 'user_input', `${trimmed.length} turns`);

// 5) Quota error rotates to backup key
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

// 6) Invalid key → surfaced
process.env.GEMINI_API_KEYS = '';
mockGeminiHandler = () => ({ status: 400, body: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } } });
res = await handler(makeRequest(conversation));
data = await res.json();
check('Invalid key → 400 surfaced', res.status === 400 && /key not valid/i.test(data.error), data.error);

// 7) Model retired → 404 surfaced
mockGeminiHandler = () => ({
  status: 404,
  body: { error: { code: 404, message: 'This model models/gemini-2.5-flash is no longer available to new users.' } },
});
res = await handler(makeRequest(conversation));
data = await res.json();
check('Retired model → 404 surfaced', res.status === 404 && /no longer available/.test(data.error));

// 8) Completed interaction with empty text → 502 (mock fallback)
mockGeminiHandler = () => ({ body: { id: 'int_x', status: 'completed', output_text: '' } });
res = await handler(makeRequest(conversation));
check('Empty output_text → 502 (triggers mock fallback)', res.status === 502, `status ${res.status}`);

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
res = await handler(makeRequest(conversation));
data = await res.json();
check('Alternate output[] shape parsed', res.status === 200 && data.reply === 'From the steps shape.', data.reply);

// Rescue: overloaded primary → retry succeeds (Gemini's "high demand" error)
process.env.GEMINI_API_KEY = 'test-key-primary';
delete process.env.GEMINI_API_KEYS;
let tries = 0;
mockGeminiHandler = () => {
  tries += 1;
  return tries === 1
    ? { status: 503, body: { error: { code: 503, message: 'gemini-3.8-flash is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.' } } }
    : ok('Second try worked, Mira.');
};
res = await handler(makeRequest(conversation));
data = await res.json();
check('Overloaded on first try → auto retry succeeds', res.status === 200 && data.reply.includes('Second try'), `status ${res.status}, attempts ${tries}`);

// Rescue: primary overloaded for all attempts → fallback model answers
const modelTries = {};
mockGeminiHandler = (body) => {
  modelTries[body.model] = (modelTries[body.model] || 0) + 1;
  if (body.model === 'gemini-3.8-flash') {
    return { status: 503, body: { error: { code: 503, message: 'gemini-3.8-flash is currently experiencing high demand. Please try again later.' } } };
  }
  return ok(`Fallback ${body.model} here.`);
};
res = await handler(makeRequest(conversation));
data = await res.json();
check(
  'Primary fully overloaded → fallback model answers',
  res.status === 200 && data.fallback === true && data.model === 'gemini-3.6-flash',
  `${data.model} · ${JSON.stringify(modelTries)}`,
);

// No fallback on real 4xx client errors (bad request should not fan out)
let fanOut = 0;
mockGeminiHandler = () => {
  fanOut += 1;
  return { status: 400, body: { error: { code: 400, message: 'Invalid argument: bad input.' } } };
};
res = await handler(makeRequest(conversation));
check('400 is not retried across models', res.status === 400 && fanOut === 1, `${fanOut} attempts`);

// Every model down → 502 with retryable flag
process.env.GEMINI_FALLBACK_MODELS = 'gemini-3.6-flash';
mockGeminiHandler = () => ({ status: 500, body: { error: { code: 500, message: 'Internal error encountered.' } } });
res = await handler(makeRequest(conversation));
data = await res.json();
check('All models down → 502 retryable', res.status === 502 && data.retryable === true, JSON.stringify(data));
delete process.env.GEMINI_FALLBACK_MODELS;

// 10) Validation
res = await handler(makeRequest({}, 'GET'));
check('GET → 405', res.status === 405);
delete process.env.GEMINI_API_KEY;
res = await handler(new Request('https://example.netlify.app/x', { method: 'POST', body: 'not-json' }));
check('Invalid JSON → 400', res.status === 400);
process.env.GEMINI_API_KEY = 'test-key-primary';
res = await handler(makeRequest({ messages: [{ role: 'assistant', content: 'only model turn' }] }));
check('No user turn → 400', res.status === 400);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
