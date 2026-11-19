/**
 * MORI companion AI proxy — Google Gemini (AI Studio key)
 *
 * Runs as a Netlify Function at /.netlify/functions/companion.
 * The API key lives ONLY in Netlify environment variables:
 *   GEMINI_API_KEY   (required)  e.g. AIza...
 *   GEMINI_API_KEYS  (optional)  comma-separated pool for rotation
 *   GEMINI_MODEL     (optional)  default: gemini-3.8-flash
 *   GEMINI_THINKING_LEVEL (optional) default: low (faster, cheaper chat)
 *
 * Uses the Interactions API (POST /v1beta/interactions), the recommended
 * interface for Gemini 3.x models:
 *   { model, input:[{type:'user_input',...}], system_instruction, generation_config }
 * Note for Gemini 3.x: temperature/top_p are deprecated and NOT sent.
 *
 * The browser never receives the key. If no key is configured, the function
 * answers 200 { configured: false } and the client falls back to mock replies.
 */

const DEFAULT_MODEL = 'gemini-3.8-flash';
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

function buildInteractionRequest(body = {}) {
  return {
    model: body.model || process.env.GEMINI_MODEL || DEFAULT_MODEL,
    payload: {
      model: body.model || process.env.GEMINI_MODEL || DEFAULT_MODEL,
      input: normalizeInput(body),
      system_instruction: String(body.systemPrompt || '').slice(0, 8000),
      generation_config: {
        max_output_tokens: 512,
        thinking_level: process.env.GEMINI_THINKING_LEVEL || 'low',
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
const MAX_PER_WINDOW = 30;
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

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const keys = getKeys();
  if (!keys.length) {
    // 200 (not an error) so the browser console stays clean before the key is set.
    return json(200, { configured: false, reply: null });
  }

  if (isRateLimited()) {
    return json(429, { error: 'Too many requests. Breathe for a minute.' });
  }

  const { model, payload } = buildInteractionRequest(body);
  if (!payload.input.length) {
    return json(400, { error: 'A user message is required.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  let lastError = null;

  try {
    // Try each key in the pool; rotate on quota/auth failures.
    for (const key of keys) {
      let response;
      try {
        response = await fetch(INTERACTIONS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (error) {
        lastError = {
          status: 502,
          message: error?.name === 'AbortError' ? 'Gemini timed out.' : 'Gemini is unreachable.',
        };
        break;
      }

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const reply = extractReply(data);
        if (reply) return json(200, { reply, model, provider: 'gemini' });
        lastError = { status: 502, message: 'The companion had nothing to say.' };
        if (data?.id) lastError.interactionId = data.id;
        continue;
      }

      const detail = Array.isArray(data)
        ? data[0]?.error
        : data?.error || data;
      lastError = {
        status: response.status,
        message: detail?.message || `Gemini returned ${response.status}.`,
      };
      const retryable = [401, 403, 429].includes(response.status) || response.status >= 500;
      if (!retryable) break;
    }
  } finally {
    clearTimeout(timeout);
  }

  console.warn('[MORI ai] gemini request failed', lastError);
  // 4xx means the client should not retry; everything else maps to 502 so the
  // UI quietly falls back to mock replies instead of showing an error.
  const clientStatus = lastError?.status >= 400 && lastError.status < 500 ? lastError.status : 502;
  return json(clientStatus, {
    error: lastError?.message || 'Gemini request failed.',
    model,
  });
}
