import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPANIONS,
  FREE_LEVEL_CAP,
  SKILLS,
  XP_PER_MINUTE,
} from '../lib/constants.js';
import { EVENTS, track, trackOnce } from '../lib/analytics.js';
import { dateKey } from '../lib/date.js';
import { createDemoSessions, summarizeDemo } from '../lib/demo.js';
import { getCompanionMood } from '../lib/mood.js';
import {
  calculateStreak,
  daysSinceLastStudy,
  getProgression,
  minutesOnDate,
  todayStatus,
  totalMinutesOf,
  xpForMinutes,
  xpThresholdForLevel,
} from '../lib/progression.js';
import { uid } from '../lib/utils.js';

const STORAGE_KEY = 'mori.state.v1';
const MoriContext = createContext(null);

function emptyState() {
  return {
    version: 1,
    user: null,
    sessions: [],
    chat: [],
    demoLoaded: false,
    demoBackup: null,
  };
}

function loadState() {
  if (typeof window === 'undefined') return emptyState();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || parsed.version !== 1) return emptyState();
    return {
      ...emptyState(),
      ...parsed,
      user: parsed.user || null,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      chat: Array.isArray(parsed.chat) ? parsed.chat : [],
    };
  } catch {
    return emptyState();
  }
}

function welcomeMessage(companion, nickname) {
  return {
    id: uid('msg'),
    role: 'assistant',
    text: companion?.welcome || 'I am so glad you are here. Shall we begin?',
    createdAt: new Date().toISOString(),
    meta: nickname ? `Day one with ${nickname}` : 'Day one',
  };
}

function createFreshUser(nickname, characterType) {
  const companion = COMPANIONS[characterType] || COMPANIONS.bear;
  return {
    id: uid('user'),
    nickname: nickname.trim(),
    characterType: companion.id,
    companionName: companion.name,
    level: 1,
    xp: 0,
    streak: 0,
    totalMinutes: 0,
    dailyGoal: 30,
    premium: false,
    premiumSince: null,
    createdAt: new Date().toISOString(),
    lastStudyAt: null,
  };
}

export function MoriProvider({ children }) {
  const [state, setState] = useState(loadState);
  const stateRef = useRef(state);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const commit = useCallback((updater) => {
    const previous = stateRef.current;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Persistence is best-effort in private browsing.
    }
  }, [state]);

  useEffect(() => {
    trackOnce(EVENTS.APP_OPENED, 'app-opened', {
      returning: Boolean(state.user),
      demo: state.demoLoaded,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((message, options = {}) => {
    clearTimeout(toastTimer.current);
    setToast({
      id: uid('toast'),
      message,
      tone: options.tone || 'default',
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    });
    toastTimer.current = setTimeout(() => setToast(null), options.duration || 4200);
  }, []);

  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const completeOnboarding = useCallback(
    ({ nickname, characterType }) => {
      const companion = COMPANIONS[characterType] || COMPANIONS.bear;
      const user = createFreshUser(nickname, characterType);
      commit({
        ...emptyState(),
        user,
        chat: [welcomeMessage(companion, nickname)],
      });
      track(EVENTS.ONBOARDING_COMPLETED, {
        character_type: characterType,
        nickname_length: nickname.length,
      });
      return user;
    },
    [commit],
  );

  const setDailyGoal = useCallback(
    (dailyGoal) => {
      const minutes = Math.max(5, Math.min(240, Math.round(dailyGoal)));
      commit((previous) => ({
        ...previous,
        user: { ...previous.user, dailyGoal: minutes },
      }));
      track(EVENTS.GOAL_UPDATED, { daily_goal: minutes });
    },
    [commit],
  );

  const addSession = useCallback(
    ({ minutes, type = 'focus', startTime = new Date(), endTime = new Date() }) => {
      const previous = stateRef.current;
      if (!previous.user) return null;

      const safeMinutes = Math.max(1, Math.round(minutes));
      const isFocus = type === 'focus';
      const xpEarned = isFocus ? xpForMinutes(safeMinutes) : 0;
      const previousXp = previous.user.xp || 0;
      const previousProgress = getProgression(previousXp, previous.user.premium);
      const nextXp = previousXp + xpEarned;
      const nextProgress = getProgression(nextXp, previous.user.premium);

      const session = {
        id: uid('session'),
        userId: previous.user.id,
        type,
        duration: safeMinutes,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        xpEarned,
      };
      const sessions = [...previous.sessions, session];
      const totalMinutes = totalMinutesOf(sessions);
      const streak = calculateStreak(sessions);
      const nextUser = {
        ...previous.user,
        xp: nextXp,
        level: nextProgress.level,
        streak,
        totalMinutes,
        lastStudyAt: new Date(startTime).toISOString(),
      };

      commit({ ...previous, sessions, user: nextUser });

      const levelUp = nextProgress.level > previousProgress.level;
      const goalReached = minutesOnDate(sessions) >= nextUser.dailyGoal;
      const goalWasReached = minutesOnDate(previous.sessions) >= nextUser.dailyGoal;

      if (isFocus) {
        track(EVENTS.FOCUS_COMPLETED, {
          minutes: safeMinutes,
          xp_earned: xpEarned,
          level_before: previousProgress.level,
          level_after: nextProgress.level,
          streak,
          goal_reached: goalReached,
          source: previous.demoLoaded ? 'demo' : 'timer',
        });
        if (levelUp) {
          track(EVENTS.LEVEL_UP, {
            from: previousProgress.level,
            to: nextProgress.level,
            xp: nextXp,
          });
        }
        if (nextProgress.atFreeCap) {
          track(EVENTS.LEVEL_CAP_REACHED, {
            level: nextProgress.level,
            xp: nextXp,
            free_cap: FREE_LEVEL_CAP,
          });
        }
        if (goalReached && !goalWasReached) {
          track(EVENTS.DAILY_GOAL_REACHED, {
            minutes: minutesOnDate(sessions),
            goal: nextUser.dailyGoal,
          });
        }
      }

      return {
        session,
        xpEarned,
        levelBefore: previousProgress.level,
        levelAfter: nextProgress.level,
        levelUp,
        progression: nextProgress,
        goalReached,
        streak,
        totalMinutes,
      };
    },
    [commit],
  );

  const unlockPremium = useCallback(() => {
    const previous = stateRef.current;
    if (!previous.user) return null;
    const before = getProgression(previous.user.xp || 0, Boolean(previous.user.premium));
    const premiumSince = previous.user.premiumSince || new Date().toISOString();
    const after = getProgression(previous.user.xp || 0, true);
    commit({
      ...previous,
      user: {
        ...previous.user,
        premium: true,
        premiumSince,
        level: after.level,
      },
    });
    track(EVENTS.PREMIUM_UNLOCKED, {
      level_before: before.level,
      level_after: after.level,
      price_rmb: 18,
      simulated: true,
    });
    if (after.level > before.level) {
      track(EVENTS.LEVEL_UP, { from: before.level, to: after.level, xp: after.xp });
    }
    return {
      previousLevel: before.level,
      newLevel: after.level,
      levelUp: after.level > before.level,
      progression: after,
    };
  }, [commit]);

  const loadDemo = useCallback(() => {
    const previous = stateRef.current;
    if (!previous.user) return null;
    const sessions = createDemoSessions(new Date());
    const summary = summarizeDemo(sessions);
    const progress = getProgression(summary.totalXp, previous.user.premium);
    const streak = calculateStreak(sessions);
    const next = {
      ...previous,
      sessions,
      demoLoaded: true,
      demoBackup: previous.demoLoaded
        ? previous.demoBackup
        : { sessions: previous.sessions, createdAt: previous.user.createdAt },
      user: {
        ...previous.user,
        xp: summary.totalXp,
        level: progress.level,
        totalMinutes: summary.totalMinutes,
        streak,
        createdAt: sessions[0]?.startTime || new Date().toISOString(),
        lastStudyAt: new Date().toISOString(),
      },
    };
    commit(next);
    track(EVENTS.DEMO_LOADED, {
      days: 30,
      sessions: summary.sessionCount,
      minutes: summary.totalMinutes,
      xp: summary.totalXp,
      level: progress.level,
    });
    return { ...summary, level: progress.level, streak };
  }, [commit]);

  const resetDemo = useCallback(() => {
    const previous = stateRef.current;
    if (!previous.user) return;
    const sessions = previous.demoBackup?.sessions || [];
    const xp = sessions.reduce((sum, session) => sum + (session.xpEarned || 0), 0);
    const progress = getProgression(xp, previous.user.premium);
    const totalMinutes = totalMinutesOf(sessions);
    const streak = calculateStreak(sessions);
    commit({
      ...previous,
      sessions,
      demoLoaded: false,
      demoBackup: null,
      user: {
        ...previous.user,
        xp,
        level: progress.level,
        streak,
        totalMinutes,
        createdAt: previous.demoBackup?.createdAt || previous.user.createdAt,
        lastStudyAt: sessions.length
          ? sessions[sessions.length - 1].startTime
          : null,
      },
    });
    track(EVENTS.DEMO_RESET, { restored_sessions: sessions.length });
  }, [commit]);

  const resetEverything = useCallback(() => {
    commit(emptyState());
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('mori.events');
    } catch {
      // Ignore storage failures.
    }
    setPaywallOpen(false);
    setShareOpen(false);
    setCelebration(null);
    setToast(null);
  }, [commit]);

  const appendChat = useCallback(
    (message) => {
      const nextMessage = {
        id: uid('msg'),
        createdAt: new Date().toISOString(),
        ...message,
      };
      commit((previous) => ({
        ...previous,
        chat: [...previous.chat, nextMessage].slice(-80),
      }));
      return nextMessage;
    },
    [commit],
  );

  const replaceChat = useCallback(
    (messages) => {
      commit((previous) => ({ ...previous, chat: messages.slice(-80) }));
    },
    [commit],
  );

  const openPaywall = useCallback(
    (source = 'unknown') => {
      setPaywallOpen(true);
      track(EVENTS.PAYWALL_VIEWED, { source });
    },
    [],
  );

  const openShare = useCallback((source = 'unknown') => {
    setShareOpen(true);
    track(EVENTS.SHARE_OPENED, { source });
  }, []);

  const celebrateLevel = useCallback(
    ({ level, previousLevel, companion, source = 'focus' }) => {
      setCelebration({
        level,
        previousLevel,
        companion,
        source,
        id: uid('celebration'),
      });
    },
    [],
  );

  const clearCelebration = useCallback(() => setCelebration(null), []);

  const user = state.user;
  const companion = user ? COMPANIONS[user.characterType] || COMPANIONS.bear : null;
  const progression = useMemo(
    () => getProgression(user?.xp || 0, Boolean(user?.premium)),
    [user?.xp, user?.premium],
  );

  const derived = useMemo(() => {
    if (!user) return null;
    const status = todayStatus({ sessions: state.sessions, dailyGoal: user.dailyGoal });
    const mood = getCompanionMood({
      sessions: state.sessions,
      dailyGoal: user.dailyGoal,
    });
    const streak = calculateStreak(state.sessions);
    const minutesToday = minutesOnDate(state.sessions);
    const daysSince = daysSinceLastStudy(state.sessions);
    const totalMinutes = totalMinutesOf(state.sessions);
    const xp = user.xp || 0;
    const nextLevelXp = xpThresholdForLevel(progression.level + 1);
    const skills = SKILLS.map((skill) => ({
      ...skill,
      unlocked:
        progression.level >= skill.level &&
        (!skill.premium || Boolean(user.premium)),
    }));

    return {
      ...status,
      streak,
      minutesToday,
      daysSinceLastStudy: daysSince,
      totalMinutes,
      mood,
      skills,
      xp,
      nextLevelXp,
      weekKey: dateKey(new Date()),
    };
  }, [state.sessions, user, progression.level]);

  const value = useMemo(
    () => ({
      state,
      user,
      companion,
      sessions: state.sessions,
      chat: state.chat,
      demoLoaded: state.demoLoaded,
      progression,
      derived,
      paywallOpen,
      shareOpen,
      celebration,
      toast,
      completeOnboarding,
      setDailyGoal,
      addSession,
      unlockPremium,
      loadDemo,
      resetDemo,
      resetEverything,
      appendChat,
      replaceChat,
      openPaywall,
      closePaywall: () => setPaywallOpen(false),
      openShare,
      closeShare: () => setShareOpen(false),
      celebrateLevel,
      clearCelebration,
      showToast,
      dismissToast,
      XP_PER_MINUTE,
    }),
    [
      state,
      user,
      companion,
      progression,
      derived,
      paywallOpen,
      shareOpen,
      celebration,
      toast,
      completeOnboarding,
      setDailyGoal,
      addSession,
      unlockPremium,
      loadDemo,
      resetDemo,
      resetEverything,
      appendChat,
      replaceChat,
      openPaywall,
      openShare,
      celebrateLevel,
      clearCelebration,
      showToast,
      dismissToast,
    ],
  );

  return <MoriContext.Provider value={value}>{children}</MoriContext.Provider>;
}

export function useMori() {
  const context = useContext(MoriContext);
  if (!context) throw new Error('useMori must be used within MoriProvider');
  return context;
}
