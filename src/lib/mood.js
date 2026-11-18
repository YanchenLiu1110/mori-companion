import { DAILY_NOTES, MOODS, XP_PER_MINUTE, getStage } from './constants.js';
import {
  calculateStreak,
  daysSinceLastStudy,
  minutesOnDate,
  todayStatus,
} from './progression.js';

/**
 * COMMERCIAL CORE — EMOTIONAL STATE
 * The companion reacts to behaviour, never scolds.
 * 3+ days away → "Missing you" (the retention hook, kept gentle).
 * Daily goal met → "Over the moon".
 * Any focus today → "In the zone".
 */
export function getCompanionMood({ sessions = [], dailyGoal = 30, now = new Date() }) {
  const status = todayStatus({ sessions, dailyGoal, now });
  const hour = now.getHours();
  let key = 'ready';

  if (status.daysSinceLastStudy !== null && status.daysSinceLastStudy >= 3) {
    key = 'missing';
  } else if (status.goalReached) {
    key = 'joyful';
  } else if (status.minutesToday > 0) {
    key = 'focused';
  } else if (hour >= 22 || hour < 6) {
    key = 'sleepy';
  }

  return {
    ...MOODS[key],
    key,
    ...status,
    note: pickNote(key),
  };
}

export function pickNote(key) {
  const notes = DAILY_NOTES[key] || DAILY_NOTES.ready;
  return notes[Math.floor(Math.random() * notes.length)];
}

export function getCompanionMessage({ companion, mood, nickname, dailyGoal }) {
  const name = companion?.name || 'Your companion';
  const you = nickname || 'friend';

  switch (mood.key) {
    case 'missing':
      return `${name} has been keeping the reading nook warm. No catching up needed, ${you} — just come as you are.`;
    case 'joyful':
      return `${name} is still doing happy little spins. You reached your ${dailyGoal}-minute goal together.`;
    case 'focused':
      return `${name} is curled up beside you, quietly proud. ${mood.minutesToday} minutes already in the roots today.`;
    case 'sleepy':
      return `It's late, ${you}. ${name} is half asleep but saved you a blanket. A short session is plenty.`;
    default:
      return `${name} saved you the sunny spot. Whenever you're ready, we'll grow a little.`;
  }
}

export function getDailyLine({ mood }) {
  return mood?.note || pickNote('ready');
}

export function getSessionEncouragement({ companion, minutes, goalReached, newLevel, streak }) {
  const name = companion?.name || 'Your companion';
  const unit = minutes === 1 ? 'minute' : 'minutes';
  if (newLevel) {
    return `${name} grew into a new chapter. ${minutes} focused ${unit}, and look what bloomed.`;
  }
  if (goalReached) {
    return `${minutes} ${unit}! You just watered the whole forest. ${name} is beaming.`;
  }
  if (streak >= 7) {
    return `${minutes} more ${unit} together — and a ${streak}-day streak. The roots are deep now.`;
  }
  const options = [
    `${minutes} ${unit}, ${minutes * XP_PER_MINUTE} XP. ${name} felt every single one.`,
    `You showed up. ${name} thinks that is the bravest part.`,
    `${minutes} focused ${unit}, tucked safely into the trunk.`,
    `${name} is quietly doing a little happy dance. ${minutes} ${unit} is no small thing.`,
    `The page turned, the roots grew. ${minutes} ${unit} well spent.`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}

export function getLevelUpLine({ companion, level }) {
  const stage = getStage(level);
  const name = companion?.name || 'Your companion';
  return [
    `${name} reached Level ${level} — ${stage.name}.`,
    'The forest is a little brighter tonight.',
    'Every minute you spent became a new leaf.',
  ];
}

export function getStatusForHeader({ user, sessions, dailyGoal }) {
  const streak = calculateStreak(sessions);
  const minutesToday = minutesOnDate(sessions);
  const since = daysSinceLastStudy(sessions);
  return { streak, minutesToday, since };
}
