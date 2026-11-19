/**
 * MORI companion AI proxy — Google Gemini (AI Studio key)
 *
 * Runs as a Netlify Function at /.netlify/functions/companion.
 * The API key lives ONLY in Netlify environment variables:
 *   GEMINI_API_KEY   (required)  e.g. AIza...
 *   GEMINI_API_KEYS  (optional)  comma-separated pool for rotation
 *   GEMINI_MODEL     (optional)  default: gemini-2.5-flash
 *
 * The browser never receives the key. If no key is configured, the function
 * answers 503 and the client falls back to its built-in mock replies.
 */

const DEFAULT_MODEL = 'gemini-2.5-flash';

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

/**
 * Recent messages are forwarded for conversational continuity.
 * Clients may send either { userMessage, history } or { messages: [...] }.
 */
function normalizeMessages(body = {}) {
  const raw = Array.isArray(body.messages)
    ? body.messages
    : Array.isArray(body.history)
      ? body.history
      : body.userMessage
        ? [{ role: 'user', content: body.userMessage }]
        : [];

  return raw
    .filter((message) => message && typeof message.content === 'string' && message.content.trim())
    .slice(-10)
    .map((message) => ({
      role: message.role === 'assistant' || message.role === 'model' ? 'model' : 'user',
      parts: [{ text: message.content.trim().slice(0, 2000) }],
    }));
}

function buildGeminiRequest(body = {}) {
  return {
    model: body.model || process.env.GEMINI_MODEL || DEFAULT_MODEL,
    payload: {
      systemInstruction: {
        parts: [{ text: String(body.systemPrompt || '').slice(0, 8000) }],
      },
      contents: normalizeMessages(body),
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 256,
        // Gemini 2.5 thinking is disabled for snappy chat replies; other
        // model families simply ignore this field.
        thinkingConfig: { thinkingBudget: 0 },
      },
      safetySettings: SAFETY_SETTINGS,
    },
  };
}

function extractReply(data) {
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('')
    .replace(/\*\*/g, '')
    .trim();
  return { text, finishReason: candidate?.finishReason || null, blocked: !text };
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

  const { model, payload } = buildGeminiRequest(body);
  if (!payload.contents.length) {
    return json(400, { error: 'A user message is required.' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let lastError = null;

  try {
    // Try each key in the pool; rotate on quota/auth failures.
    for (const key of keys) {
      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (error) {
        lastError = { status: 502, message: error?.name === 'AbortError' ? 'Gemini timed out.' : 'Gemini is unreachable.' };
        break;
      }

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const { text } = extractReply(data);
        if (text) return json(200, { reply: text, model, provider: 'gemini' });
        // Empty or safety-blocked candidate: not a client error, let the UI mock reply.
        lastError = { status: 502, message: 'The companion had nothing to say.' };
        continue;
      }

      lastError = { status: response.status, message: data?.error?.message || `Gemini returned ${response.status}.` };
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
  return json(clientStatus, { error: lastError?.message || 'Gemini request failed.' });
}
