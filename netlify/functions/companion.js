/**
 * MORI companion AI proxy — Google Gemini (AI Studio key)
 *
 * Runs as a Netlify Function at /.netlify/functions/companion.
 * The API key lives ONLY in Netlify environment variables:
 *   GEMINI_API_KEY   (required)  e.g. AIza...
 *   GEMINI_API_KEYS  (optional)  comma-separated pool for rotation
 *   GEMINI_MODEL     (optional)  default: gemini-3.8-flash
 *   GEMINI_THINKING_LEVEL (optional) default: low (faster, cheaper chat)
 *   GEMINI_FALLBACK_MODELS (optional) comma-separated models to try when the
 *                          primary is overloaded/unavailable. Default:
 *                          gemini-3.6-flash,gemini-3.5-flash-lite
 *
 * Uses the Interactions API (POST /v1beta/interactions), the recommended
 * interface for Gemini 3.x models:
 *   { model, input:[{type:'user_input',...}], system_instruction, generation_config }
 * Note for Gemini 3.x: temperature/top_p are deprecated and NOT sent.
 *
 * The browser never receives the key. If no key is configured, the function
 * answers 200 { configured: false } and the client falls back to mock replies.
 */

const FN_VERSION = '2026-11-19T21:15';
// Fast, capable default. Free tier limits are per model, so the chain below is
// what keeps chat working when one model is busy or out of quota.
const DEFAULT_MODEL = 'gemini-3.5-flash';
const DEFAULT_FALLBACKS = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
].join(',');
const DEFAULT_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'low';
const OVERLOAD_PATTERN = /high demand|overloaded|unavailable|temporarily|try again later|resource_exhausted|no longer available/i;
const RATE_LIMIT_PATTERN = /rate limit|quota|per day|per minute|retry in|exceeded/i;

/** Extracts a human "retry in Xh Ym" hint from Gemini's message when present. */
function retryHint(message = '') {
  const match = String(message).match(/retry in ([\dhms ]+?)(?:\.|$|\s+or\s)/i);
  return match ? match[1].trim() : null;
}

/** True when the error is a quota/rate limit rather than a transient overload. */
function isRateLimitedError(status, message) {
  return status === 429 && !OVERLOAD_PATTERN.test(message) || RATE_LIMIT_PATTERN.test(message);
}
const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

/**
 * Conversation history is sent statelessly with every call.
 * Clients may send { userMessage, messages: [{ role, content }] }.
 * Gemini requires the first turn to be the user and no trailing model turn.
 */
function normalizeInput(body = {}) {
  const raw = Array.isArray(body.messages)
    ? body.messages
    : Array.isArray(body.history)
      ? body.history
      : body.userMessage
        ? [{ role: 'user', content: body.userMessage }]
        : [];

  const turns = raw
    .filter((message) => message && typeof message.content === 'string' && message.content.trim())
    .slice(-10)
    .map((message) => ({
      role: message.role === 'assistant' || message.role === 'model' ? 'model' : 'user',
      text: message.content.trim().slice(0, 2000),
    }));

  // Drop leading model turns and a trailing model turn (prefill is rejected).
  while (turns.length && turns[0].role !== 'user') turns.shift();
  while (turns.length && turns[turns.length - 1].role !== 'user') turns.pop();

  return turns.map((turn) =>
    turn.role === 'model'
      ? { type: 'model_output', content: [{ type: 'text', text: turn.text }] }
      : { type: 'user_input', content: [{ type: 'text', text: turn.text }] },
  );
}

function buildInteractionRequest(body = {}, modelOverride) {
  const model = modelOverride || body.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return {
    model,
    payload: {
      model,
      input: normalizeInput(body),
      system_instruction: String(body.systemPrompt || '').slice(0, 8000),
      generation_config: {
        max_output_tokens: 512,
        thinking_level: /lite/.test(model) ? 'minimal' : DEFAULT_THINKING_LEVEL,
      },
      store: false,
    },
  };
}

function extractReply(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return stripFormatting(data.output_text);
  }
  // Defensive fallback for alternate response shapes.
  const steps = Array.isArray(data?.output) ? data.output : Array.isArray(data?.steps) ? data.steps : [];
  const text = steps
    .flatMap((step) => (Array.isArray(step?.content) ? step.content : []))
    .filter((part) => part?.type === 'text' && !part?.thought)
    .map((part) => part.text)
    .join('');
  return stripFormatting(text);
}

function stripFormatting(value) {
  return String(value || '')
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

function getKeys() {
  const pool = String(process.env.GEMINI_API_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  if (process.env.GEMINI_API_KEY) pool.unshift(process.env.GEMINI_API_KEY.trim());
  return [...new Set(pool)];
}

// Small in-memory throttle; Netlify may recycle instances, it is a safety net only.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
let windowStart = 0;
let windowCount = 0;

function isRateLimited() {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount > MAX_PER_WINDOW;
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function primaryModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/** Primary model first, then distinct fallbacks configured on the server. */
function modelChain() {
  const fallbacks = String(process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACKS)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([primaryModel(), ...fallbacks])];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Per-instance memory of model health. Google's "high demand" and quota errors
 * are per model, so remembering a failure lets the next request start with a
 * model that actually works.
 */
const DOWN_MS = 60_000;
const modelHealth = new Map(); // model -> { until, reason, hits }

function markModel(model, reason, ttl = DOWN_MS) {
  modelHealth.set(model, { until: Date.now() + ttl, reason, hits: (modelHealth.get(model)?.hits || 0) + 1 });
}

function markModelHealthy(model) {
  modelHealth.delete(model);
}

function isModelDown(model) {
  const health = modelHealth.get(model);
  return Boolean(health && health.until > Date.now());
}

/** Least-recently-failing first: healthy models, then others, with the primary at the front when healthy. */
function orderByHealth(chain) {
  const healthy = chain.filter((model) => !isModelDown(model));
  const down = chain
    .filter((model) => isModelDown(model))
    .sort((a, b) => (modelHealth.get(a)?.until || 0) - (modelHealth.get(b)?.until || 0));
  return [...healthy, ...down];
}

// Latency probe cache (per warm instance). A GET on the interactions API needs no
// quota and is rejected/answered quickly, so it measures reachability + RTT.
let preflight = null;

async function probeUpstreamLatency(key) {
  if (preflight) return preflight;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      method: 'GET',
      headers: { 'x-goog-api-key': key },
      signal: controller.signal,
    });
    preflight = Date.now() - started;
  } catch {
    preflight = 4_000;
  } finally {
    clearTimeout(timer);
  }
  return preflight;
}

/**
 * Overloaded Flash models answer in a couple of seconds; a tiny model with a
 * minimal-thinking budget is the safest bet when the upstream looks slow.
 */
function orderModelsForLatency(chain) {
  if (preflight === null || preflight < 1_500) return chain;
  // Slow upstream: try the fastest models first as a rescue, then the normal chain.
  const light = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'];
  return [
    ...chain.filter((model) => light.includes(model)),
    ...light.filter((model) => !chain.includes(model)),
    ...chain.filter((model) => !light.includes(model)),
  ];
}

async function callGemini({ key, model, payload, signal }) {
  const response = await fetch(INTERACTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({ ...payload, model }),
    signal,
  });
  const data = await response.json().catch(() => ({}));
  const detail = Array.isArray(data) ? data[0]?.error : data?.error || data;
  return {
    ok: response.ok,
    status: response.status,
    message: detail?.message || `Gemini returned ${response.status}.`,
    data,
  };
}

async function handle(request) {
  if (request.method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return { status: 400, body: { error: 'Invalid JSON body.' } };
  }

  const keys = getKeys();
  if (!keys.length) {
    // 200 (not an error) so the browser console stays clean before the key is set.
    return { status: 200, body: { configured: false, reply: null, fn_version: FN_VERSION } };
  }

  if (isRateLimited()) {
    return { status: 429, body: { error: 'Too many requests. Breathe for a minute.' } };
  }

  const { payload: initialPayload } = buildInteractionRequest(body, primaryModel());
  if (!initialPayload.input.length) {
    return { status: 400, body: { error: 'A user message is required.' } };
  }

  // Stay well under Netlify's ~30s gateway timeout, and keep replies snappy.
  // Cold calls to Gemini 3.8 can take 15-25s from some regions. Observe it rather
  // than abort: Netlify's ~30s gateway limit still applies (see GEMINI_TIMEOUT_MS).
  const BUDGET_MS = Number(process.env.GEMINI_TIMEOUT_MS || 26_000);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BUDGET_MS);
  const deadline = Date.now() + BUDGET_MS;
  let lastError = null;
  let sawQuotaError = false;

  try {
    // If we know the upstream is slow for this deployment, start with a lighter model.
    preflight = await probeUpstreamLatency(keys[0]);
    const ordered = orderModelsForLatency(orderByHealth(modelChain()));
    outer: for (const key of keys) {
      for (const model of ordered) {
        if (Date.now() >= deadline) break outer;
        const { payload } = buildInteractionRequest(body, model);
        // Rate limits are not transient: a retry just burns the window.
        const rateLimited = lastError ? isRateLimitedError(lastError.status, lastError.message) : false;
        const attempts = rateLimited ? [0] : [0, 500]; // usually one try + one short retry
        for (const delay of attempts) {
          if (delay) await sleep(delay + Math.random() * 250);
          if (Date.now() >= deadline) break outer;
          let result;
          try {
            result = await callGemini({ key, model, payload, signal: controller.signal });
          } catch (error) {
            lastError = {
              status: 502,
              message: error?.name === 'AbortError' ? 'Gemini timed out.' : 'Gemini is unreachable.',
            };
            break;
          }

          if (result.ok) {
            const reply = extractReply(result.data);
            if (reply) {
              markModelHealthy(model);
              return {
                status: 200,
                body: {
                  fn_version: FN_VERSION,
                  reply,
                  model,
                  provider: 'gemini',
                  fallback: model !== primaryModel(),
                },
              };
            }
            lastError = { status: 502, message: 'The companion had nothing to say.', model };
            break;
          }

          lastError = { status: result.status, message: result.message, model };
          if (result.status === 429 || /resource_exhausted|quota/i.test(result.message)) sawQuotaError = true;

          // Only overload / availability errors are worth retrying.
          if (isRateLimitedError(result.status, result.message)) {
            markModel(model, 'quota', 10 * 60_000);
            break; // quota is per model: try the next one immediately
          }
          if (OVERLOAD_PATTERN.test(result.message) && delay !== attempts[attempts.length - 1]) continue; // busy: one quick retry
          if (result.status >= 500 && !OVERLOAD_PATTERN.test(result.message)) continue; // server error: one quick retry
          break;
        }

        if (OVERLOAD_PATTERN.test(lastError?.message || '') && lastError?.status >= 500) {
          markModel(model, 'busy');
        }
        const authFailure = [401, 403].includes(lastError?.status) && !/quota|demand|overloaded|rate limit/i.test(lastError?.message || '');
        if (authFailure) break; // bad key: moving to the next model with the same key is pointless
        const stillRateLimited = isRateLimitedError(lastError?.status, lastError?.message);
        if (!stillRateLimited && lastError?.status >= 400 && lastError.status < 500) break;
      }
      // Another key only helps for quota errors, and only if time remains.
      const limited = isRateLimitedError(lastError?.status, lastError?.message);
      if (!limited) break;
      if (Date.now() >= deadline) break;
    }
  } finally {
    clearTimeout(timeout);
  }

  // Visible in Netlify → Functions → companion logs during a live demo.
  console.warn(
    '[MORI ai] gemini request failed',
    JSON.stringify({
      ...lastError,
      elapsed_ms: Date.now() - startedAt,
      budget_ms: BUDGET_MS,
      preflight_ms: preflight,
    }),
  );
  // 4xx means the client should not retry; everything else maps to 502 so the
  // UI quietly falls back to mock replies instead of showing an error.
  const timedOut = /^Gemini timed out/.test(lastError?.message || '');
  const rateLimited = isRateLimitedError(lastError?.status, lastError?.message);
  const clientStatus = rateLimited
    ? 429
    : lastError?.status >= 400 && lastError.status < 500 && !timedOut
      ? lastError.status
      : 502;
  return { status: clientStatus, body: {
    fn_version: FN_VERSION,
    elapsed_ms: Date.now() - startedAt,
    preflight_ms: preflight,
    error: lastError?.message || 'Gemini request failed.',
    model: lastError?.model || primaryModel(),
    retryable: clientStatus === 502 || clientStatus === 429,
    retry_in: rateLimited ? retryHint(lastError?.message) : null,
  } };
}

export default async function handler(request) {
  const { status, body } = await handle(request);
  return json(status, body);
}
