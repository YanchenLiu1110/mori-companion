import { addDays, dateKey, startOfDay } from './date.js';

/**
 * Demo Mode — deterministic 30-day study history.
 * The seed is stable so a pitch always tells the same story.
 * Free accounts will cap at Lv.5; unlocking Premium shows the full advanced form.
 */

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const DURATION_POOL = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
const MISSED_DAYS = new Set([27, 21, 16, 9]); // gaps make the history feel human

export function createDemoSessions(now = new Date()) {
  const random = seededRandom(20271118);
  const sessions = [];
  const end = startOfDay(now);

  for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
    if (MISSED_DAYS.has(daysAgo)) continue;

    const date = addDays(end, -daysAgo);
    const focusMinutes =
      DURATION_POOL[Math.floor(random() * DURATION_POOL.length)] +
      (daysAgo % 5 === 0 ? 15 : 0);

    const startHour = daysAgo % 3 === 0 ? 7 : daysAgo % 4 === 0 ? 21 : 19;
    const startMinute = daysAgo % 2 === 0 ? 10 : 40;
    const start = new Date(date);
    start.setHours(startHour, startMinute, 0, 0);

    sessions.push({
      id: `demo-${dateKey(date)}-a`,
      userId: 'demo-user',
      type: 'focus',
      duration: focusMinutes,
      xpEarned: focusMinutes * 2,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + focusMinutes * 60_000).toISOString(),
      source: 'demo',
    });

    // Some days have a second, shorter session — a realistic study rhythm.
    if (daysAgo % 6 === 0 || daysAgo === 1) {
      const secondStart = new Date(date);
      secondStart.setHours(15, 20, 0, 0);
      const duration = 20 + Math.floor(random() * 3) * 5;
      sessions.push({
        id: `demo-${dateKey(date)}-b`,
        userId: 'demo-user',
        type: 'focus',
        duration,
        xpEarned: duration * 2,
        startTime: secondStart.toISOString(),
        endTime: new Date(secondStart.getTime() + duration * 60_000).toISOString(),
        source: 'demo',
      });
    }
  }

  // Ensure today's goal is met so the companion's joyful state is visible.
  const today = new Date(now);
  today.setHours(8, 25, 0, 0);
  const todayKey = dateKey(now);
  const existingToday = sessions.filter((session) => dateKey(session.startTime) === todayKey);
  const todayMinutes = existingToday.reduce((sum, session) => sum + session.duration, 0);
  if (todayMinutes < 35) {
    const duration = 35 - todayMinutes;
    sessions.push({
      id: `demo-${todayKey}-topup`,
      userId: 'demo-user',
      type: 'focus',
      duration,
      xpEarned: duration * 2,
      startTime: today.toISOString(),
      endTime: new Date(today.getTime() + duration * 60_000).toISOString(),
      source: 'demo',
    });
  }

  return sessions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

export function summarizeDemo(sessions) {
  const focus = sessions.filter((session) => session.type === 'focus');
  const totalMinutes = focus.reduce((sum, session) => sum + session.duration, 0);
  const totalXp = focus.reduce((sum, session) => sum + session.xpEarned, 0);
  return { totalMinutes, totalXp, sessionCount: focus.length };
}
