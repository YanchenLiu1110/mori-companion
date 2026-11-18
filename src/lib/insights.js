import { addDays, dateKey, formatDuration, getHourBucket, startOfDay } from './date.js';
import { focusSessions } from './progression.js';

/**
 * Mock "AI-generated" report copy.
 * This is intentionally data-aware so the prototype feels alive in a pitch.
 * In production, the same structured stats can be passed to an LLM.
 */
export function buildReportInsights({ user, companion, sessions = [], rangeDays = 7, now = new Date() }) {
  const start = startOfDay(addDays(now, -(rangeDays - 1)));
  const previousStart = startOfDay(addDays(start, -rangeDays));
  const focus = focusSessions(sessions);

  const inRange = focus.filter((session) => new Date(session.startTime) >= start);
  const previous = focus.filter((session) => {
    const time = new Date(session.startTime);
    return time >= previousStart && time < start;
  });

  const minutes = inRange.reduce((sum, session) => sum + session.duration, 0);
  const previousMinutes = previous.reduce((sum, session) => sum + session.duration, 0);
  const activeDays = new Set(inRange.map((session) => dateKey(session.startTime))).size;
  const sessionCount = inRange.length;
  const avgActive = activeDays ? minutes / activeDays : 0;
  const trend = previousMinutes
    ? Math.round(((minutes - previousMinutes) / previousMinutes) * 100)
    : null;

  const dayTotals = new Map();
  const timeBuckets = { morning: 0, afternoon: 0, evening: 0 };
  for (const session of inRange) {
    const key = dateKey(session.startTime);
    dayTotals.set(key, (dayTotals.get(key) || 0) + session.duration);
    timeBuckets[getHourBucket(new Date(session.startTime).getHours())] += session.duration;
  }
  const bestDay = [...dayTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestBucket = Object.entries(timeBuckets).sort((a, b) => b[1] - a[1])[0];

  const consistency = Math.round((activeDays / rangeDays) * 100);
  const focusScore = Math.min(
    100,
    Math.round(consistency * 0.6 + Math.min(minutes / (rangeDays * 30), 1) * 40),
  );

  if (!inRange.length) {
    return {
      empty: true,
      minutes,
      activeDays,
      sessionCount,
      trend,
      focusScore: 0,
      headline: 'A blank page is still a beginning.',
      summary: `${companion?.name || 'Your companion'} is keeping the reading nook warm. One focused session is all it takes to start this story.`,
      observation: 'There is no data to read yet — and no catching up to do.',
      recommendation: 'Try a gentle 10-minute session. We will draw the first bar together.',
      pattern: 'Your first data point is waiting.',
      cards: [
        {
          icon: 'Sprout',
          title: 'A gentle start',
          body: 'Small sessions count. Try ten minutes today and let the first leaf unfold.',
        },
        {
          icon: 'Clock3',
          title: 'Pick a soft hour',
          body: 'Choose a time when you usually have a little quiet. We will meet you there.',
        },
        {
          icon: 'Heart',
          title: 'No streak pressure',
          body: 'The goal is connection, not a perfect chain. Missing a day will never change that.',
        },
      ],
    };
  }

  const bucketLabel = {
    morning: 'morning',
    afternoon: 'afternoon',
    evening: 'evening',
  }[bestBucket?.[0] || 'evening'];

  const trendLine =
    trend === null
      ? 'This is your first chapter of data.'
      : trend >= 0
        ? `That is ${trend}% more focused time than the previous period.`
        : `That is ${Math.abs(trend)}% less than the previous period — a softer week is still part of the story.`;

  const headline =
    consistency >= 70
      ? 'You are becoming someone who shows up.'
      : consistency >= 40
        ? 'A rhythm is quietly taking root.'
        : 'You are still here. That is the thread that matters.';

  const summary = `${user?.nickname || 'You'}, you spent ${formatDuration(minutes)} with ${companion?.name || 'your companion'} across ${activeDays} ${activeDays === 1 ? 'day' : 'days'}. ${trendLine}`;

  const observation =
    consistency >= 70
      ? `Consistency is your superpower right now: ${activeDays} of ${rangeDays} days had a session. Your companion can feel the steady rhythm.`
      : `You studied on ${activeDays} of ${rangeDays} days. The gaps are not failures; they are information about what your weeks actually need.`;

  const recommendation =
    bestBucket && bestBucket[1] > 0
      ? `Your focus tends to land in the ${bucketLabel}. Protect one small pocket of ${bucketLabel} quiet next week, and make it the same time each day.`
      : 'Choose one repeatable cue — the same desk, the same tea, the same first song — and let it become your starting bell.';

  const pattern = bestDay
    ? `Your strongest day was ${new Date(`${bestDay[0]}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })} with ${formatDuration(bestDay[1])}.`
    : 'Your pattern will emerge after a few more sessions.';

  return {
    empty: false,
    minutes,
    activeDays,
    sessionCount,
    trend,
    focusScore,
    headline,
    summary,
    observation,
    recommendation,
    pattern,
    cards: [
      {
        icon: 'Sprout',
        title: 'What is growing',
        body: observation,
      },
      {
        icon: 'Sun',
        title: 'Try this next',
        body: recommendation,
      },
      {
        icon: 'Compass',
        title: 'Your pattern',
        body: `${pattern} Keep this in mind when planning your next focus block.`,
      },
    ],
  };
}

export function buildGrowthSeries(sessions = [], rangeDays = 7, now = new Date()) {
  const days = [];
  const start = startOfDay(addDays(now, -(rangeDays - 1)));
  const focus = focusSessions(sessions);

  const xpBefore = focus
    .filter((session) => new Date(session.startTime) < start)
    .reduce((sum, session) => sum + (session.xpEarned || 0), 0);

  let running = xpBefore;
  for (let index = 0; index < rangeDays; index += 1) {
    const date = addDays(start, index);
    const key = dateKey(date);
    const xp = focus
      .filter((session) => dateKey(session.startTime) === key)
      .reduce((sum, session) => sum + (session.xpEarned || 0), 0);
    running += xp;
    days.push({
      date,
      key,
      xp,
      cumulativeXp: running,
    });
  }
  return { days, startXp: xpBefore, totalXp: running };
}
