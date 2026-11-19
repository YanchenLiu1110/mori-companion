/**
 * AI health check for the presentation demo.
 * Sends one tiny real ping so the status reflects whether Gemini actually
 * answers (covers missing key, bad key, region blocks, quota limits).
 */

const FUNCTION_ENDPOINT = '/.netlify/functions/companion';
const PING = 'hi';

export const AI_CONFIGURED = 'gemini';
export const AI_NOT_CONFIGURED = 'unconfigured';
export const AI_UNREACHABLE = 'unreachable';

let cached = null;

export async function checkCompanionAI() {
  if (cached) return cached;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ userMessage: PING }),
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    if (response.ok && typeof data.reply === 'string') {
      cached = { state: AI_CONFIGURED, reply: data.reply };
    } else if (response.ok && data.configured === false) {
      cached = { state: AI_NOT_CONFIGURED };
    } else {
      cached = { state: AI_UNREACHABLE, detail: data?.error || `HTTP ${response.status}` };
    }
  } catch {
    cached = { state: AI_UNREACHABLE };
  }
  return cached;
}
