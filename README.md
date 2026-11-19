# MORI · Don't study alone. Grow together.

> **The hypothesis:** when focused study time becomes visible growth for a virtual companion, users form a stronger emotional bond — and come back more often.
>
> This prototype tests one complete loop: **focus → grow → feel something → return.** AI replies and payment are mocked behind real interfaces, so both can be replaced without rebuilding the product.

**Live demo:** https://moricompanion.netlify.app/

![MORI welcome screen](docs/welcome.png)

## What is in the prototype

| Area | What it does |
| --- | --- |
| **Onboarding** | Nickname + one of three illustrated companions: Boba the bear, Fenn the deer, Miso the fox. |
| **Today** | XP bar, level, streak, daily goal, mood, weekly rhythm, today's sessions, and a personalized note from the companion. |
| **Focus room** | 25/45/60-minute and custom Pomodoro timer, 5/10/15-minute breaks, animated study/rest poses, pause/resume, early finish with banked minutes, and completion celebration. |
| **Companion** | Full character stage, growth timeline, unlockable abilities, mood states, and a Gemini-powered chat with conversation memory and study-data context. |
| **Insights** | Week/month filters, daily bar chart, time-of-day focus pattern, cumulative growth curve, focus score, and data-aware AI-style recommendations. |
| **MORI Plus** | Free accounts cap at **Level 5**. A simulated ¥18/month paywall unlocks every future stage and triggers a level-up celebration. |
| **Share card** | Generates a real PNG growth card with the companion, level, stage, streak, and stats. Supports native share when available and download everywhere else. |
| **Demo Mode** | One click fills 30 days of deterministic study history for a pitch. Your real history is backed up and restored when the demo is reset. |
| **Analytics** | A visible event log in the browser console covering acquisition, activation, engagement, conversion, retention, and sharing events. |

### Desktop and mobile

<p align="center">
  <img src="docs/dashboard.png" alt="MORI dashboard desktop" width="72%" />
  <img src="docs/dashboard-mobile.png" alt="MORI dashboard mobile" width="24%" />
</p>

## Run it locally

The fastest way to see MORI is the live demo: **https://moricompanion.netlify.app/** — it runs entirely in the browser, so no install is required.

To run it locally, you need **Node.js 18+** and npm:

```bash
npm install
npm run dev
```

Open the URL printed by Vite — normally **http://localhost:5173**.

Production build:

```bash
npm run build
npm run preview
```

No environment variables are required. Without an LLM endpoint, the companion uses the built-in mock reply engine.

## The growth loop (core product logic)

All commercial rules live in `src/lib/constants.js`, `src/lib/progression.js`, and `src/lib/mood.js`.

| Rule | Implementation |
| --- | --- |
| XP earned | **1 focused minute = 2 XP** (`XP_PER_MINUTE`). Break time earns no XP. |
| Level curve | Cumulative XP to reach level `n` = `50 × (n − 1) × n`. The next level always needs **100 × current level** more XP. |
| Free cap | Free accounts stop at **Level 5** (`FREE_LEVEL_CAP`). Extra XP still accumulates and is revealed after upgrading. |
| Premium | Simulated ¥18/month. Removes the cap and unlocks premium abilities/scenes. |
| Daily goal | Default 30 minutes, editable in the Today page. Hitting it changes the companion to **Over the moon**. |
| Streak | Consecutive local calendar days with at least one focus session. A streak survives until the end of today even before today's session. |
| Companion moods | Daily goal met → **Over the moon** · any focus today → **In the zone** · 3+ days away → **Missing you** · late night → **A little sleepy** · otherwise **Ready when you are**. |
| Character state | Derived from study data and displayed through copy, facial expression, pose, and animation. Nothing is a fake static state. |
| Demo Mode | Generates 29 days of sessions + today, with realistic missed days. It does **not** silently grant Premium: the Level 5 cap is visible, and unlocking Plus demonstrates the full advanced form. |

![Focus room](docs/focus.png)

The companion page combines the full character stage, a data-driven growth timeline, unlockable abilities, and a scene-aware chat:

![Companion page](docs/companion.png)

## Companion AI — Gemini via Netlify Functions

Chat is powered by **Gemini 3.8 Flash** through a serverless proxy:

```text
Browser (chat UI)
   │  POST /.netlify/functions/companion
   ▼
Netlify Function  netlify/functions/companion.js   ← GEMINI_API_KEY lives only here
   │  POST generativelanguage.googleapis.com/v1beta/interactions  (Gemini 3.x Interactions API)
   ▼
Google Gemini
```

- The API key is read from Netlify environment variables and **never reaches the browser**.
- Each request carries the companion persona, the user's live study data (level, streak, minutes today, mood, days away) and the last few chat turns, so replies are personal and stay in context.
- Resilience: overload (`503 high demand`) is retried twice with short back-off, then the proxy tries the fallback models before giving up. Missing key, invalid key, no user turn and empty candidates fall back to the built-in mock replies — a live demo never breaks.
- The chat header shows **Gemini · live** when the proxy answers, or **Preview mode** when it falls back to mock.

### Enabling it (full walkthrough: [AI-SETUP.md](AI-SETUP.md))

1. Create a key at <https://aistudio.google.com/apikey>.
2. In Netlify: **Site configuration → Environment variables → Add a variable** → key `GEMINI_API_KEY`, value your key.
3. Push to GitHub (triggers a deploy) or **Deploys → Trigger deploy → Deploy site**.
4. Open the Companion page — the chat header should read **Gemini · live**.

Optional server variables:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Primary key (required). |
| `GEMINI_API_KEYS` | Comma-separated extra keys, rotated automatically on 429/403. |
| `GEMINI_MODEL` | Override the model (default `gemini-3.8-flash`). |
| `GEMINI_THINKING_LEVEL` | `low` / `medium` / `high`. Default `low` keeps chat snappy and cheap. |
| `GEMINI_FALLBACK_MODELS` | Comma-separated fallbacks used when the primary is overloaded. Default `gemini-3.6-flash,gemini-3.5-flash-lite`. |

### Local development

`npm run dev` serves the UI on :5173; chat needs the function running. Use the Netlify CLI:

```bash
npx netlify-cli dev            # builds functions + serves the site with a proxy
npx netlify-cli env:get GEMINI_API_KEY   # or add to .env for local use (never commit)
```

Without a key locally, chat simply uses mock replies — everything else works.

### Testing the integration without a real key

```bash
npm install playwright-core --no-save   # only needed for the browser test
npm run test:ai    # 27 proxy checks against a mocked Gemini Interactions endpoint
npm run test:e2e   # boots mock servers + Chrome, verifies live + fallback paths
```

`VITE_MORI_LLM_ENDPOINT` can point the UI at any other proxy exposing the same contract (`POST { systemPrompt, userMessage, messages } → { reply }`), e.g. OpenAI or Claude behind your own endpoint.

## Data model and persistence

The prototype deliberately avoids a database. State is stored in `localStorage` under `mori.state.v1`:

```js
{
  version: 1,
  user: {
    id, nickname, characterType, companionName,
    level, xp, streak, totalMinutes, dailyGoal,
    premium, premiumSince, createdAt, lastStudyAt
  },
  sessions: [
    { id, userId, type: 'focus' | 'break', duration, startTime, endTime, xpEarned }
  ],
  chat: [
    { id, role: 'user' | 'assistant', text, createdAt, meta }
  ],
  demoLoaded: false,
  demoBackup: null
}
```

`Character` and `streak`/`mood` state are derived selectors rather than duplicated records. To reset the prototype, run this in the browser console:

```js
localStorage.removeItem('mori.state.v1');
location.reload();
```

## Analytics

Open the browser console and look for styled `MORI` events. Events are also available at `window.__MORI_EVENTS__` and in `sessionStorage` under `mori.events`.

Tracked events include:

`app_opened`, `onboarding_started`, `character_selected`, `onboarding_completed`, `focus_started`, `focus_paused`, `focus_resumed`, `focus_completed`, `focus_ended_early`, `break_started`, `break_completed`, `session_abandoned`, `level_up`, `level_cap_reached`, `daily_goal_reached`, `paywall_viewed`, `premium_clicked`, `premium_unlocked`, `demo_loaded`, `demo_reset`, `chat_opened`, `chat_message_sent`, `companion_replied`, `report_viewed`, `range_changed`, `share_opened`, `share_downloaded`, `share_clicked`, `goal_updated`.

This is intentionally a demo-grade event stream. In production, replace `src/lib/analytics.js` with your product analytics SDK or a server endpoint.

## Share card

`src/components/ShareModal.jsx` renders a 3:4 growth card at 3× pixel ratio with `html-to-image` and downloads it as a PNG. It uses the Web Share API when the browser can share files and falls back to download + clipboard caption. Everything happens locally; no image or study data leaves the browser.

![Growth report](docs/report.png)

## Project structure

```text
mori-companion/
├── src/
│   ├── components/
│   │   ├── AppShell.jsx          # Sidebar, mobile nav, demo control
│   │   ├── CompanionArt.jsx      # Original SVG companion artwork & poses
│   │   ├── LevelUpOverlay.jsx    # Premium level-jump celebration
│   │   ├── Modal.jsx
│   │   ├── PaywallModal.jsx      # Simulated MORI Plus checkout
│   │   ├── ShareModal.jsx        # PNG growth card generation
│   │   └── UI.jsx                # Avatar, XP bar, mood, toast, confetti
│   ├── context/MoriContext.jsx   # Persistent state + all product actions
│   ├── lib/
│   │   ├── analytics.js          # Console event stream
│   │   ├── companionAI.js        # Mock AI + LLM proxy seam
│   │   ├── constants.js          # Characters, XP rules, price, perks
│   │   ├── demo.js               # Deterministic 30-day demo generator
│   │   ├── insights.js           # Report + recommendation generation
│   │   ├── mood.js               # Emotional state logic
│   │   └── progression.js        # XP curve, levels, streaks, timeline
│   ├── pages/
│   │   ├── WelcomePage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── FocusPage.jsx
│   │   ├── CompanionPage.jsx
│   │   └── ReportPage.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── netlify/
│   └── functions/companion.js    # Gemini proxy (server-side key)
├── scripts/                      # AI proxy tests + local mock servers
├── netlify.toml                  # Build, functions, SPA fallback
├── AI-SETUP.md                   # Step-by-step Gemini + Netlify guide
├── docs/                         # Screenshots used in this README
├── .env.example
└── README.md
```

## 3-minute pitch flow

1. **Welcome** — enter a name, choose Boba, and feel the tone of the product in under 20 seconds.
2. **Demo Mode** — load 30 days of history with one click. The streak, weekly rhythm, and full report immediately become presentation-ready.
3. **Insights → This month** — walk through the study rhythm, evening focus pattern, growth curve, and AI reflections.
4. **MORI Plus** — point out the Level 5 cap. Simulate the ¥18/month unlock. The level jump from 5 → 8 is the emotional and commercial climax.
5. **Share card** — download the growth card and show how the emotional bond becomes an acquisition loop.
6. **Console** — show the live `MORI` analytics events to reinforce a data-driven product process.

## Known limitations / next steps

- AI chat runs on Gemini once `GEMINI_API_KEY` is set in Netlify; until then the UI uses mock replies.
- Payment is simulated; no card is collected and no real charge is made.
- Persistence is local-only. A production build needs auth, a database, cross-device sync, and server-side entitlement checks.
- The tier currently uses a single monthly plan. Real pricing should test monthly vs. annual, regional pricing, and a free trial.
- Analytics are console-only for demo transparency. Production should use a privacy-respecting event pipeline.
- The share card uses system fonts if the browser blocks bundled webfonts in screenshot rendering; it still generates correctly.

---

**MORI** is a commercial prototype built with React, Vite, and Tailwind CSS. The illustrations are original inline SVG; no third-party image assets are used. All interface copy is in English.
