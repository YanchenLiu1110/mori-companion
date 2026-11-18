import { FREE_LEVEL_CAP, SKILLS, XP_PER_MINUTE, getStage } from './constants.js';
import { clamp, dateKey, dayDifference, startOfDay } from './date.js';

/**
 * COMMERCIAL CORE — XP & LEVEL CURVE
 * 1 focused minute = 2 XP.
 * XP needed to reach the next level = 100 × current level.
 * Cumulative XP to reach level n = 50 × (n - 1) × n.
 * Free accounts are capped at level 5; Premium removes the cap.
 */

export function xpForMinutes(minutes) {
  return Math.round(Number(minutes || 0) * XP_PER_MINUTE);
}

export function xpThresholdForLevel(level) {
  const safe = Math.max(1, Math.floor(level));
  return 50 * (safe - 1) * safe;
}

export function levelForXp(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0);
  let level = 1;
  while (xp >= xpThresholdForLevel(level + 1) && level < 100) level += 1;
  return level;
}

export function getProgression(totalXp, premium = false) {
  const xp = Math.max(0, Number(totalXp) || 0);
  const rawLevel = levelForXp(xp);
  const displayedLevel = premium ? rawLevel : Math.min(rawLevel, FREE_LEVEL_CAP);
  const floor = xpThresholdForLevel(displayedLevel);
  const nextFloor = premium || displayedLevel < FREE_LEVEL_CAP
    ? xpThresholdForLevel(displayedLevel + 1)
    : null;
  const xpIntoLevel = Math.max(0, xp - floor);
  const xpForNext = nextFloor ? Math.max(1, nextFloor - floor) : xpForNextAtCap(displayedLevel);
  const progress = nextFloor
    ? clamp((xp - floor) / (nextFloor - floor), 0, 1)
    : 1;
  const stage = getStage(displayedLevel);

  return {
    level: displayedLevel,
    rawLevel,
    xp,
    floor,
    nextFloor,
    xpIntoLevel,
    xpForNext,
    progress,
    stage,
    premium,
    atFreeCap: !premium && displayedLevel >= FREE_LEVEL_CAP,
    cappedByPremium: !premium && rawLevel > FREE_LEVEL_CAP,
    maxedOut: Boolean(premium && displayedLevel >= 10),
  };
}

function xpForNextAtCap(level) {
  return Math.max(1, xpThresholdForLevel(level + 1) - xpThresholdForLevel(level));
}

export function getSkills(level, premium) {
  return SKILLS.map((skill) => ({
    ...skill,
    unlocked: level >= skill.level && (!skill.premium || Boolean(premium)),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Study data selectors                                                       */
/* -------------------------------------------------------------------------- */

export function focusSessions(sessions = []) {
  return sessions.filter((session) => session.type !== 'break' && session.duration > 0);
}

export function totalMinutesOf(sessions = []) {
  return focusSessions(sessions).reduce((sum, session) => sum + Number(session.duration || 0), 0);
}

export function totalXpOf(sessions = []) {
  return focusSessions(sessions).reduce((sum, session) => sum + Number(session.xpEarned || 0), 0);
}

export function minutesOnDate(sessions = [], date = new Date()) {
  const key = dateKey(date);
  return focusSessions(sessions)
    .filter((session) => dateKey(session.startTime) === key)
    .reduce((sum, session) => sum + Number(session.duration || 0), 0);
}

export function sessionsOnDate(sessions = [], date = new Date()) {
  const key = dateKey(date);
  return focusSessions(sessions).filter((session) => dateKey(session.startTime) === key);
}

export function studyDayKeys(sessions = []) {
  return new Set(focusSessions(sessions).map((session) => dateKey(session.startTime)));
}

export function calculateStreak(sessions = [], now = new Date()) {
  const days = studyDayKeys(sessions);
  let cursor = startOfDay(now);

  // A streak stays alive until the end of today, even before today's session.
  if (!days.has(dateKey(cursor))) cursor = new Date(cursor.getTime() - 86_400_000);
  if (!days.has(dateKey(cursor))) return 0;

  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}

export function daysSinceLastStudy(sessions = [], now = new Date()) {
  const focus = focusSessions(sessions);
  if (!focus.length) return null;
  const latest = focus.reduce((max, session) => {
    const time = new Date(session.startTime).getTime();
    return time > max ? time : max;
  }, 0);
  return Math.max(0, dayDifference(now, latest));
}

export function todayStatus({ sessions = [], dailyGoal = 30, now = new Date() }) {
  const minutesToday = minutesOnDate(sessions, now);
  const streak = calculateStreak(sessions, now);
  const sinceLast = daysSinceLastStudy(sessions, now);
  const goalReached = minutesToday >= dailyGoal;
  const sessionsToday = sessionsOnDate(sessions, now).length;

  return {
    minutesToday,
    streak,
    daysSinceLastStudy: sinceLast,
    goalReached,
    sessionsToday,
    goalRemaining: Math.max(0, dailyGoal - minutesToday),
    goalProgress: clamp(minutesToday / Math.max(1, dailyGoal), 0, 1),
  };
}

export function getTodaySessions(sessions = [], now = new Date()) {
  return sessionsOnDate(sessions, now).sort(
    (a, b) => new Date(b.startTime) - new Date(a.startTime),
  );
}

export function getLast7Days(sessions = [], now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfDay(now));
    date.setDate(date.getDate() - (6 - index));
    return {
      date,
      minutes: minutesOnDate(sessions, date),
      key: dateKey(date),
    };
  });
}

/**
 * Builds a human timeline from the real study history.
 * Used on the Companion page to make progress feel earned, not decorative.
 */
export function buildTimeline({ user, sessions = [], premium = false }) {
  const focus = [...focusSessions(sessions)].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime),
  );
  if (!focus.length) {
    return [
      {
        id: 'met',
        title: `${user?.nickname || 'You'} met ${getCompanionName(user)}`,
        date: user?.createdAt,
        description: 'Every forest starts with a single seed.',
        icon: 'Sprout',
        achieved: true,
      },
    ];
  }

  const entries = [];
  entries.push({
    id: 'met',
    title: `${getCompanionName(user)} found a home`,
    date: user?.createdAt,
    description: 'Day one. A tiny companion, a blank page, a beginning.',
    icon: 'Sprout',
    achieved: true,
  });

  entries.push({
    id: 'first-session',
    title: 'First focus session',
    date: focus[0].startTime,
    description: `${focus[0].duration} minutes together. The first ring in the trunk.`,
    icon: 'BookOpen',
    achieved: true,
  });

  let cumulativeXp = 0;
  let cumulativeMinutes = 0;
  const reached = new Set();
  const levelMilestones = premium ? [2, 3, 5, 7, 9] : [2, 3, 5];
  for (const session of focus) {
    cumulativeXp += session.xpEarned || xpForMinutes(session.duration);
    cumulativeMinutes += session.duration;
    for (const level of levelMilestones) {
      if (!reached.has(level) && cumulativeXp >= xpThresholdForLevel(level)) {
        reached.add(level);
        entries.push({
          id: `level-${level}`,
          title: `Reached Level ${level} · ${getStage(level).name}`,
          date: session.startTime,
          description:
            level === 5
              ? 'The forest friend badge. A bond with roots now.'
              : level >= 7
                ? 'A new chapter of your companion’s growth.'
                : 'A little taller, a little braver.',
          icon: level >= 7 ? 'Crown' : 'Sparkles',
          achieved: true,
        });
      }
    }
    for (const minutes of [60, 600, 1800]) {
      if (!reached.has(`min-${minutes}`) && cumulativeMinutes >= minutes) {
        reached.add(`min-${minutes}`);
        entries.push({
          id: `minutes-${minutes}`,
          title:
            minutes === 60
              ? 'One hour together'
              : minutes === 600
                ? 'Ten hours of showing up'
                : 'Thirty hours in the forest',
          date: session.startTime,
          description:
            minutes === 60
              ? 'Enough time for the roots to take hold.'
              : 'Quietly, consistently, you built something real.',
          icon: minutes === 60 ? 'Clock3' : 'TreePine',
          achieved: true,
        });
      }
    }
  }

  if (premium && user?.premiumSince) {
    entries.push({
      id: 'premium',
      title: 'Became a MORI Plus member',
      date: user.premiumSince,
      description: 'The gate opened. Every future stage is yours to grow into.',
      icon: 'Crown',
      achieved: true,
    });
  }

  const currentProgression = getProgression(user?.xp || cumulativeXp, premium);
  if (currentProgression.atFreeCap) {
    entries.push({
      id: 'premium-gate',
      title: 'The path beyond Level 5',
      date: null,
      description: 'MORI Plus opens this chapter — and every one after it.',
      icon: 'Lock',
      achieved: false,
    });
  } else {
    const nextLevel = Math.max(currentProgression.level + 1, 2);
    entries.push({
      id: `next-${nextLevel}`,
      title: `Next: Level ${nextLevel} · ${getStage(nextLevel).name}`,
      date: null,
      description: 'A little more time together, and the next leaf will unfold.',
      icon: 'Leaf',
      achieved: false,
    });
  }

  return entries
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, 7);
}

function getCompanionName(user) {
  if (!user) return 'Your companion';
  return user.companionName || 'your companion';
}

export function buildMilestoneStats(user, sessions) {
  const focus = focusSessions(sessions);
  const totalMinutes = totalMinutesOf(sessions);
  const longest = focus.reduce((max, session) => Math.max(max, session.duration), 0);
  return {
    totalMinutes,
    totalSessions: focus.length,
    longestSession: longest,
    daysTogether: user?.createdAt ? Math.max(1, dayDifference(new Date(), user.createdAt) + 1) : 1,
  };
}
