/**
 * Lightweight, privacy-safe product analytics for the prototype.
 * Events are printed to the console with a readable style and mirrored into
 * window.__MORI_EVENTS__ so a presenter can inspect the funnel.
 *
 * No data leaves the browser.
 */

const EVENT_STYLE = 'background:#1E3D2B;color:#F4E4AE;padding:3px 7px;border-radius:6px;font-weight:700';
const DETAIL_STYLE = 'color:#4F7960;font-weight:600';

export const EVENTS = {
  APP_OPENED: 'app_opened',
  ONBOARDING_STARTED: 'onboarding_started',
  CHARACTER_SELECTED: 'character_selected',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FOCUS_STARTED: 'focus_started',
  FOCUS_PAUSED: 'focus_paused',
  FOCUS_RESUMED: 'focus_resumed',
  FOCUS_COMPLETED: 'focus_completed',
  FOCUS_ENDED_EARLY: 'focus_ended_early',
  BREAK_STARTED: 'break_started',
  BREAK_COMPLETED: 'break_completed',
  SESSION_ABANDONED: 'session_abandoned',
  LEVEL_UP: 'level_up',
  LEVEL_CAP_REACHED: 'level_cap_reached',
  PAYWALL_VIEWED: 'paywall_viewed',
  PREMIUM_CLICKED: 'premium_clicked',
  PREMIUM_UNLOCKED: 'premium_unlocked',
  DEMO_LOADED: 'demo_loaded',
  DEMO_RESET: 'demo_reset',
  CHAT_OPENED: 'chat_opened',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  COMPANION_REPLIED: 'companion_replied',
  REPORT_VIEWED: 'report_viewed',
  RANGE_CHANGED: 'report_range_changed',
  SHARE_OPENED: 'share_opened',
  SHARE_DOWNLOADED: 'share_downloaded',
  SHARE_CLICKED: 'share_clicked',
  GOAL_UPDATED: 'goal_updated',
  DAILY_GOAL_REACHED: 'daily_goal_reached',
};

export function track(name, properties = {}) {
  if (typeof window === 'undefined') return;

  const event = {
    name,
    properties,
    at: new Date().toISOString(),
  };

  try {
    window.__MORI_EVENTS__ = [...(window.__MORI_EVENTS__ || []), event].slice(-100);
    const stored = JSON.parse(sessionStorage.getItem('mori.events') || '[]');
    sessionStorage.setItem('mori.events', JSON.stringify([...stored, event].slice(-100)));
  } catch {
    // Storage can be unavailable in private mode; console logging still works.
  }

  // Analytics are intentionally visible for the pitch demo.
  console.info(
    `%c MORI %c ${name}`,
    EVENT_STYLE,
    DETAIL_STYLE,
    properties,
  );
}

export function trackOnce(name, key, properties) {
  if (typeof window === 'undefined') return;
  try {
    const seenKey = `mori.once.${key || name}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, '1');
  } catch {
    // Continue without deduplication.
  }
  track(name, properties);
}
