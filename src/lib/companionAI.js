/**
 * Companion AI — Gemini (Google AI Studio) with a graceful mock fallback.
 *
 * Flow:  chat UI → POST /.netlify/functions/companion → Gemini generateContent
 * The Gemini key lives ONLY in Netlify environment variables (GEMINI_API_KEY).
 * It is never bundled into the browser.
 *
 * Configuration:
 *   - Production (Netlify): placeholder below resolves automatically.
 *   - Override (local/staging): VITE_MORI_LLM_ENDPOINT=/api/companion
 *   - If the API is not configured, unreachable, rate-limited, or returns an
 *     empty candidate, the companion replies from the local mock pool instead.
 *     (`lastReplySource` records which path produced the latest reply.)
 */

const FUNCTION_ENDPOINT = '/.netlify/functions/companion';
const ENDPOINT = (import.meta.env.VITE_MORI_LLM_ENDPOINT || '').trim() || FUNCTION_ENDPOINT;
const REQUEST_TIMEOUT_MS = 50_000; // proxy may retry + fall back before answering

/** Gemini is served by a model chain (see netlify/functions/companion.js). */
export const AI_ENGINE = {
  model: 'Gemini',
  label: 'Gemini',
};

let replySource = 'mock';
let replyModel = null;

export function lastReplySource() {
  return replySource;
}

export function lastReplyModel() {
  return replyModel;
}

const MOCK_REPLIES = {
  tired: [
    'Tired is real, not a moral failure. What if we trade the big plan for one soft ten-minute page? I will hold the blanket.',
    "Then let's make this gentle. Ten minutes, no perfect notes, and a nap-shaped reward afterwards. I'm in if you are.",
    'Your brain is asking for a smaller step, not a smaller dream. Let’s do the easiest possible version together.',
  ],
  stuck: [
    'Stuck usually means the next step is too big. Make it laughably small: open the document, write one ugly sentence, then we celebrate.',
    "I vote we lower the bar until it's on the floor. One page. Or one paragraph. Or just opening the tab. That counts as a beginning.",
    'You are not behind. You are at the part where the path gets quiet. Start with five minutes and let the forest wake up around you.',
  ],
  overwhelmed: [
    "Let's put the whole mountain down for a minute. Pick only the next small stone. I'll sit with you while you carry it.",
    'One thing at a time is not slow — it is how forests grow. What is the one thing that would make today feel lighter?',
    'You do not have to finish everything today. You only have to begin one small thing. I am right here.',
  ],
  win: [
    'Look at you. I am keeping this one in the scrapbook: a little effort, a little glow, a much taller tree.',
    'That deserves a tiny dance break. I am doing mine right now — no rhythm whatsoever.',
    'I felt the roots shift when you finished. Proud of you, quietly and loudly at the same time.',
  ],
  greeting: [
    'Hi, you. I was just arranging the leaves. How is your head feeling today — foggy, fiery, or somewhere in between?',
    'There you are. The reading nook has been waiting. No agenda, no catching up required.',
    'Hello from the sunny spot. I saved you the warmest cushion. What are we growing today?',
  ],
  thanks: [
    'Anytime. Showing up for yourself is the part I am proud of — I am just lucky enough to sit beside it.',
    'Thank you for letting me be here for it. Even the messy days count as together days.',
    'Always. You are the one doing the growing; I am just keeping you company in the shade.',
  ],
  intro: [
    'I am {companion}. I started as a very small seed in a very big forest, which is a polite way of saying I do not have it all figured out either.',
    'I like warm tea, quiet pages, and the sound of you deciding to begin. That is most of who I am.',
    'My whole world grows when you focus. No pressure — I am just happy to be on the same branch as you.',
  ],
  motivate: [
    'You do not need to feel ready. You just need a smaller first step. I suggest five minutes and a very average playlist.',
    'Think of it as planting, not performing. One page today is a whole season of shade later.',
    'Future you is already sitting under the tree. They would love it if you started with one small minute.',
  ],
  default: [
    'I hear you. Let’s make the next step smaller than it feels. What would a gentle ten-minute version look like?',
    'That sounds like a lot to carry. You don’t have to carry it perfectly — one small page is enough for today.',
    'The forest is quiet, the tea is warm, and there is no version of you I am disappointed in. Want to try a little together?',
    'I am noticing you showed up to the page. That is already the hard part. Shall we stay for five minutes?',
    'Some days the goal is just to keep the roots warm. A short session still counts as love for your future self.',
    'We can be slow and still be growing. I am in no hurry; I have very little else to do.',
    'Your effort does not have to look impressive from the outside. I can feel it from here.',
    'I vote one tiny session, then something warm to drink. The day does not need to be won all at once.',
  ],
};

let waiting = false;
let lastLatencyMs = null;

/** True once the browser has shown the companion is still thinking. */
export function isWaiting() {
  return waiting;
}

export function lastLatency() {
  return lastLatencyMs;
}

/** Resolves after `ms`, or immediately once `signal` aborts. */
function delay(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

export async function generateCompanionReply(userMessage, studyData = {}) {
  const message = String(userMessage || '').trim();
  const context = buildStudyContext(studyData);
  const history = Array.isArray(studyData.history) ? studyData.history : [];
  const messages = [...history, { role: 'user', content: message }]
    .filter((item) => item && typeof item.content === 'string' && item.content.trim())
    .slice(-8)
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content.trim().slice(0, 2000),
    }));

  const controller = new AbortController();
  const startedAt = Date.now();
  let answered = false;
  waiting = false;

  // If Gemini is slow, flip the typing bubble to "Boba is thinking…" so the
  // 20-30s cold path still feels alive instead of frozen.
  const slowTimer = setTimeout(() => {
    if (!answered) waiting = true;
  }, 2_200);

  try {
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemPrompt: buildSystemPrompt(context),
        userMessage: message,
        messages,
        context,
      }),
    });
    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));
    if (response.ok && typeof data.reply === 'string' && data.reply.trim()) {
      replySource = 'gemini';
      replyModel = data.model || null;
      lastLatencyMs = Date.now() - startedAt;
      console.info(`[MORI] Gemini replied in ${lastLatencyMs} ms (${data.model}${data.fallback ? ', fallback' : ''})`);
      return data.reply.trim();
    }
    if (data.configured === false) {
      // Key not configured yet — expected during setup, stay quiet.
      replySource = 'mock';
    } else {
      replySource = 'mock';
      console.warn(`[MORI] AI unavailable (${response.status}); using mock reply.`, data?.error || '');
    }
  } catch (error) {
    replySource = 'mock';
    console.warn('[MORI] AI request failed; using mock reply.', error?.message || error);
  } finally {
    answered = true;
    clearTimeout(slowTimer);
    waiting = false;
  }

  await delay(620 + Math.random() * 520, controller.signal);
  return pickMockReply(message, context);
}

export function buildSystemPrompt(context) {
  const lines = [
    `You are ${context.companion}, a warm, playful virtual companion inside the MORI study app.`,
    `You are talking with ${context.nickname}.`,
    `Their study data right now: Level ${context.level}, ${context.streak}-day streak, ${context.minutesToday} of ${context.dailyGoal} focused minutes today, ${Math.round(context.totalMinutes)} total minutes together, overall mood "${context.mood}".`,
  ];
  if (context.daysSinceLastStudy !== null && context.daysSinceLastStudy !== undefined && context.daysSinceLastStudy >= 3) {
    lines.push(`They have been away for ${context.daysSinceLastStudy} days. Welcome them back gently. Never mention the gap as a failure or ask them to catch up.`);
  }
  lines.push(
    'Reply in 1-3 short conversational sentences, in the same language the user writes in (English by default).',
    'Use their real study data when it makes the reply feel personal, but do not list numbers mechanically.',
    'You may ask at most one gentle question.',
    'Never shame, scold, lecture, or use corporate productivity jargon. No markdown, no bullet lists, at most one emoji.',
    'Never mention that you are a language model. You are simply their companion.',
  );
  return lines.join(' ');
}

function buildStudyContext(studyData) {
  return {
    nickname: studyData.nickname || 'friend',
    companion: studyData.companionName || 'Mori',
    level: studyData.level || 1,
    streak: studyData.streak || 0,
    minutesToday: studyData.minutesToday || 0,
    dailyGoal: studyData.dailyGoal || 30,
    totalMinutes: studyData.totalMinutes || 0,
    daysSinceLastStudy: studyData.daysSinceLastStudy,
    mood: studyData.mood || 'ready',
  };
}

function pickMockReply(message, context) {
  const lower = message.toLowerCase();
  const withContext = (text) => fillTokens(text, context);
  let pool;

  if (/(tired|exhaust|sleep|drained|burnt|burned)/.test(lower)) pool = MOCK_REPLIES.tired;
  else if (/(stuck|can't|cant|focus|distract|procrastinat)/.test(lower)) pool = MOCK_REPLIES.stuck;
  else if (/(stress|overwhelm|anxious|anxiety|panic|too much)/.test(lower)) pool = MOCK_REPLIES.overwhelmed;
  else if (/(finished|done|complete|good|great|win|proud|passed)/.test(lower)) pool = MOCK_REPLIES.win;
  else if (/(hi|hello|hey|good morning|good evening)/.test(lower)) pool = MOCK_REPLIES.greeting;
  else if (/(thank|thanks|appreciate)/.test(lower)) pool = MOCK_REPLIES.thanks;
  else if (/(who are you|about yourself|your name|tell me about you)/.test(lower)) pool = MOCK_REPLIES.intro;
  else if (/(motivat|lazy|start|begin|give up|quit|try)/.test(lower)) pool = MOCK_REPLIES.motivate;
  else pool = MOCK_REPLIES.default;

  let reply = withContext(pool[Math.floor(Math.random() * pool.length)]);

  // Layer in one piece of real context without repeating it every time.
  if (context.daysSinceLastStudy !== null && context.daysSinceLastStudy >= 3 && Math.random() > 0.35) {
    reply = `It has been a little quiet, but I am not counting the days — only glad you are here. ${reply}`;
  } else if (context.minutesToday >= context.dailyGoal && Math.random() > 0.4) {
    reply = `You already filled today's ${context.dailyGoal}-minute goal. ${reply}`;
  } else if (context.streak >= 3 && /streak|how are we|progress|doing/.test(lower)) {
    reply = `Our little streak is ${context.streak} days strong. Not a chain I would ever use to pull you — just a nice row of leaves. ${reply}`;
  } else if (context.minutesToday === 0 && Math.random() > 0.55) {
    reply = `The page is still blank, which means it is full of possibility. ${reply}`;
  }

  return reply;
}

function fillTokens(text, context) {
  return text
    .replaceAll('{companion}', context.companion)
    .replaceAll('{nickname}', context.nickname)
    .replaceAll('{streak}', String(context.streak))
    .replaceAll('{minutes}', String(context.minutesToday));
}
