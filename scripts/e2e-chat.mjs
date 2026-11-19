/**
 * End-to-end check for the Gemini chat integration — no real API key needed.
 *
 *   node scripts/e2e-chat.mjs
 *
 * Boots: local mock Gemini → Netlify-function runtime (port 8888, also serves dist/)
 * Then drives Chrome: onboarding → companion page → two chat turns.
 * Verifies the browser hit the proxy, conversation memory is forwarded, and the
 * no-key case quietly falls back to mock replies.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const FN_PORT = 8899;
const GEMINI_MOCK_PORT = 8799;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const results = [];
const check = (name, pass, detail = '') => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url) {
  for (let i = 0; i < 50; i += 1) {
    try {
      await fetch(url);
      return;
    } catch {
      await sleep(100);
    }
  }
  throw new Error(`${url} did not start`);
}

function start(script, env) {
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, ...env },
    stdio: 'ignore',
  });
  return child;
}

async function runChrome(baseUrl) {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#nickname').fill('Mira');
  await page.getByRole('button', { name: /meet your companion/i }).click();
  await page.getByRole('button', { name: /start my journey/i }).click();
  await page.getByRole('link', { name: /^companion$/i }).click();
  await sleep(800);
  const badge = (await page.locator('span').filter({ hasText: /Preview mode|Gemini · live/ }).allInnerTexts()).join('|').toUpperCase();
  const input = page.getByRole('textbox', { name: /message/i });
  for (const message of ['I feel stuck today', 'and my streak?']) {
    await input.fill(message);
    await page.getByRole('button', { name: /send message/i }).click();
    await sleep(1500);
  }
  const bubbles = await page.locator('.whitespace-pre-line').allInnerTexts();
  const meta = await page.locator('p').filter({ hasText: /via Gemini/ }).count();
  const footer = (await page.getByText(/powered by Gemini|Preview replies/).innerText().catch(() => '')).toLowerCase();
  await browser.close();
  return { badge, bubbles, meta, footer, errors };
}

const geminiMock = start('scripts/mock-gemini-server.mjs', { PORT: String(GEMINI_MOCK_PORT) });
await waitFor(`http://127.0.0.1:${GEMINI_MOCK_PORT}/`);
const fn = start('scripts/mock-netlify-fn.mjs', {
  PORT: String(FN_PORT),
  GEMINI_MOCK_URL: `http://127.0.0.1:${GEMINI_MOCK_PORT}`,
  GEMINI_API_KEY: 'test-key',
});
await waitFor(`http://127.0.0.1:${FN_PORT}/`);

try {
  const base = `http://127.0.0.1:${FN_PORT}`;

  // --- With key: Gemini path ---
  const live = await runChrome(base);
  check('With key: badge shows Gemini · live', live.badge.includes('GEMINI · LIVE'), live.badge);
  check('With key: footer credits Gemini 3.8 Flash', live.footer.includes('gemini 3.8 flash'), live.footer);
  check('With key: replies come from Gemini (mock echo text)', live.bubbles.at(-1).includes('shrink it down'), live.bubbles.at(-1).slice(0, 60));
  check('With key: reply bubbles labeled "via Gemini"', live.meta >= 2, `${live.meta} labels`);
  const calls = await (await fetch(`http://127.0.0.1:${GEMINI_MOCK_PORT}/_calls`)).json();
  const chatCalls = calls.filter((c) => c.input?.length);
  const textOf = (turn) => (turn.content || []).map((part) => part.text).join('');
  const secondTurn = chatCalls.find((c) => c.input.some((turn) => textOf(turn) === 'and my streak?'));
  check('With key: proxy called Gemini Interactions API', chatCalls.length >= 2 && chatCalls.at(-1).url.includes('/interactions'), `${chatCalls.length} chat calls`);
  check('With key: model is gemini-3.8-flash', chatCalls.at(-1)?.model === 'gemini-3.8-flash', chatCalls.at(-1)?.model);
  check('With key: turn 2 carries conversation memory', Boolean(secondTurn) && secondTurn.input.length >= 3, secondTurn ? secondTurn.input.map((x) => x.type).join('→') : 'missing');
  check('With key: system prompt includes study data', /Level \d+, \d+-day streak/.test(chatCalls.at(-1)?.system || ''));
  check('With key: API key never in browser console errors', live.errors.length === 0, live.errors.join(' | '));

  // --- Without key: graceful fallback ---
  fn.kill();
  await sleep(300);
  const fnNoKey = start('scripts/mock-netlify-fn.mjs', {
    PORT: String(FN_PORT),
    GEMINI_MOCK_URL: `http://127.0.0.1:${GEMINI_MOCK_PORT}`,
  });
  await waitFor(`http://127.0.0.1:${FN_PORT}/`);
  const fallback = await runChrome(base);
  check('No key: badge shows Preview mode', fallback.badge.includes('PREVIEW MODE'), fallback.badge);
  check('No key: mock reply still answers', fallback.bubbles.length >= 3 && !fallback.bubbles.at(-1).includes('shrink it down'));
  check('No key: no browser errors', fallback.errors.length === 0, fallback.errors.join(' | '));
  fnNoKey.kill();
} finally {
  fn.kill();
  geminiMock.kill();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
