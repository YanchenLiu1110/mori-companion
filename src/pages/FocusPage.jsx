import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Coffee,
  Flame,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  TimerReset,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { EVENTS, track } from '../lib/analytics.js';
import { formatClock, formatDuration, getLastNDays } from '../lib/date.js';
import { getSessionEncouragement } from '../lib/mood.js';
import { getTodaySessions } from '../lib/progression.js';
import { cn } from '../lib/utils.js';
import { CompanionArt } from '../components/CompanionArt.jsx';
import { Modal } from '../components/Modal.jsx';
import { Avatar, Confetti } from '../components/UI.jsx';

const FOCUS_PRESETS = [25, 45, 60];
const BREAK_PRESETS = [5, 10, 15];

export function FocusPage() {
  const {
    user,
    companion,
    progression,
    derived,
    sessions,
    addSession,
    openPaywall,
    showToast,
  } = useMori();
  const navigate = useNavigate();

  const [mode, setMode] = useState('focus');
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [status, setStatus] = useState('idle');
  const [completion, setCompletion] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState(25);
  const [soundOn, setSoundOn] = useState(true);

  const endAtRef = useRef(null);
  const startedAtRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const remainingRef = useRef(remaining);
  const audioRef = useRef(null);

  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  const totalSeconds = duration * 60;
  const progress = totalSeconds ? 1 - remaining / totalSeconds : 0;
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const modeLabel = mode === 'focus' ? 'Focus' : 'Break';
  const presets = mode === 'focus' ? FOCUS_PRESETS : BREAK_PRESETS;
  const todaySessions = getTodaySessions(sessions);
  const todayXp = todaySessions.reduce((sum, session) => sum + (session.xpEarned || 0), 0);
  const week = getLastNDays(7);
  const weekMinutes = week.map((day) => ({
    ...day,
    minutes: sessions
      .filter(
        (session) =>
          session.type !== 'break' &&
          new Date(session.startTime).toDateString() === day.date.toDateString(),
      )
      .reduce((sum, session) => sum + session.duration, 0),
  }));

  const warmAudio = useCallback(() => {
    if (!soundOn) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioRef.current) audioRef.current = new AudioContextClass();
      if (audioRef.current.state === 'suspended') audioRef.current.resume();
    } catch {
      // Audio is a progressive enhancement.
    }
  }, [soundOn]);

  const playChime = useCallback(() => {
    if (!soundOn) return;
    try {
      const context = audioRef.current;
      if (!context) return;
      if (context.state === 'suspended') context.resume();
      const notes = mode === 'focus' ? [523.25, 659.25, 783.99] : [659.25, 523.25];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        const start = context.currentTime + index * 0.16;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.06, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.75);
      });
    } catch {
      // Ignore audio failures.
    }
  }, [mode, soundOn]);

  const finishSession = useCallback(
    (kind = 'natural') => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;

      const now = Date.now();
      const secondsLeft = kind === 'natural' ? 0 : Math.max(0, remainingRef.current);
      const secondsElapsed = Math.max(0, totalSeconds - secondsLeft);
      const minutes =
        mode === 'focus'
          ? kind === 'natural'
            ? duration
            : Math.max(1, Math.min(duration, Math.round(secondsElapsed / 60)))
          : 0;

      let result = null;
      if (mode === 'focus') {
        result = addSession({
          minutes,
          type: 'focus',
          startTime: startedAtRef.current || new Date(now - minutes * 60_000),
          endTime: new Date(now),
        });
        if (kind === 'early') {
          track(EVENTS.FOCUS_ENDED_EARLY, {
            planned_minutes: duration,
            banked_minutes: minutes,
            elapsed_seconds: secondsElapsed,
          });
        }
      } else {
        track(EVENTS.BREAK_COMPLETED, {
          minutes: duration,
          completed: kind === 'natural',
        });
      }

      const nextCompletion = {
        type: mode,
        kind,
        minutes,
        xpEarned: result?.xpEarned || 0,
        result,
        encouragement:
          mode === 'focus'
            ? getSessionEncouragement({
                companion,
                minutes,
                goalReached: result?.goalReached,
                newLevel: result?.levelUp,
                streak: result?.streak,
              })
            : 'You gave your attention a little room to breathe. That was the whole assignment.',
      };

      setStatus('idle');
      setRemaining(totalSeconds);
      setCompletion(nextCompletion);
      playChime();
      startedAtRef.current = null;
      endAtRef.current = null;
    },
    [
      addSession,
      companion,
      duration,
      mode,
      playChime,
      totalSeconds,
    ],
  );

  useEffect(() => {
    if (status !== 'running') return undefined;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      remainingRef.current = seconds;
      setRemaining(seconds);
      if (seconds <= 0) finishSession('natural');
    };
    tick();
    const timer = window.setInterval(tick, 400);
    return () => window.clearInterval(timer);
  }, [status, finishSession]);

  useEffect(() => {
    if (status === 'running') {
      document.title = `${formatClock(remaining)} · ${modeLabel} · MORI`;
    } else {
      document.title = 'MORI · Grow together';
    }
    return () => {
      document.title = 'MORI · Grow together';
    };
  }, [status, remaining, modeLabel]);

  useEffect(() => {
    if (status !== 'running' || !('wakeLock' in navigator)) return undefined;
    let sentinel = null;
    let cancelled = false;
    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        if (cancelled) lock.release().catch(() => {});
        else sentinel = lock;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sentinel?.release?.().catch(() => {});
    };
  }, [status]);

  useEffect(() => () => {
    audioRef.current?.close?.().catch(() => {});
  }, []);

  function handleStart() {
    if (status === 'running') return;
    hasCompletedRef.current = false;
    if (status === 'idle') {
      if (remaining <= 0) setRemaining(totalSeconds);
      startedAtRef.current = new Date();
      endAtRef.current = Date.now() + (remaining || totalSeconds) * 1000;
      setStatus('running');
      warmAudio();
      track(mode === 'focus' ? EVENTS.FOCUS_STARTED : EVENTS.BREAK_STARTED, {
        minutes: duration,
        mode,
        goal: user?.dailyGoal,
      });
    } else {
      endAtRef.current = Date.now() + remaining * 1000;
      setStatus('running');
      track(EVENTS.FOCUS_RESUMED, { remaining_seconds: remaining, mode });
    }
  }

  function handlePause() {
    const secondsLeft = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    remainingRef.current = secondsLeft;
    setRemaining(secondsLeft);
    setStatus('paused');
    track(EVENTS.FOCUS_PAUSED, {
      remaining_seconds: secondsLeft,
      elapsed_seconds: totalSeconds - secondsLeft,
      mode,
    });
  }

  function resetTimer({ silent = false } = {}) {
    if (status === 'running') {
      track(EVENTS.SESSION_ABANDONED, {
        mode,
        remaining_seconds: remaining,
        planned_minutes: duration,
      });
    }
    setStatus('idle');
    remainingRef.current = totalSeconds;
    setRemaining(totalSeconds);
    startedAtRef.current = null;
    endAtRef.current = null;
    hasCompletedRef.current = false;
    if (!silent) showToast('A clean page. Ready when you are.');
  }

  function handleModeSwitch(nextMode) {
    if (status !== 'idle') return;
    setMode(nextMode);
    const nextDuration = nextMode === 'focus' ? 25 : 5;
    setDuration(nextDuration);
    setRemaining(nextDuration * 60);
    setCustomDraft(nextDuration);
  }

  function handlePreset(minutes) {
    if (status !== 'idle') return;
    setDuration(minutes);
    setRemaining(minutes * 60);
  }

  function openCustom() {
    if (status !== 'idle') return;
    setCustomDraft(duration);
    setCustomOpen(true);
  }

  function applyCustom() {
    const max = mode === 'focus' ? 120 : 30;
    const minutes = Math.min(max, Math.max(1, Math.round(customDraft)));
    setDuration(minutes);
    setRemaining(minutes * 60);
    setCustomOpen(false);
  }

  function closeCompletion() {
    setCompletion(null);
    setStatus('idle');
    remainingRef.current = totalSeconds;
    setRemaining(totalSeconds);
    hasCompletedRef.current = false;
  }

  const canAdjust = status === 'idle';

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Focus room</p>
          <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.045em] text-forest-950 sm:text-[2.65rem]">
            A little room to <span className="italic text-forest-600">begin</span>.
          </h1>
          <p className="mt-2 max-w-lg text-[0.8rem] font-semibold leading-relaxed text-forest-800/50">
            {mode === 'focus'
              ? `Every focused minute becomes 2 XP for ${companion?.name}. Stay for as long as feels kind.`
              : 'Rest is part of the rhythm. Step away from the page for a moment.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundOn((value) => !value)}
            className="icon-btn"
            aria-label={soundOn ? 'Mute completion sound' : 'Enable completion sound'}
            title={soundOn ? 'Sound on' : 'Sound off'}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <Link to="/home" className="btn-secondary px-4 py-2.5 text-[0.7rem]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Today
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[2rem] bg-forest-950 p-5 text-cream shadow-float sm:p-8">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-moss/12 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-peach/10 blur-[100px]" />
        <div className="absolute inset-0 align-dot opacity-20" />

        <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.055] p-1">
            <button
              type="button"
              onClick={() => handleModeSwitch('focus')}
              disabled={!canAdjust}
              className={cn(
                'rounded-full px-4 py-2 text-[0.65rem] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40',
                mode === 'focus'
                  ? 'bg-cream text-forest-950 shadow-sm'
                  : 'text-cream/45 hover:text-cream/75',
              )}
            >
              Focus
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('break')}
              disabled={!canAdjust}
              className={cn(
                'rounded-full px-4 py-2 text-[0.65rem] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40',
                mode === 'break'
                  ? 'bg-cream text-forest-950 shadow-sm'
                  : 'text-cream/45 hover:text-cream/75',
              )}
            >
              Break
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[0.57rem] font-extrabold uppercase tracking-[0.13em] text-cream/45">
              {mode === 'focus' ? '1 min · 2 XP' : 'No XP · Just rest'}
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[0.57rem] font-extrabold text-cream/45 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-moss" />
              {status === 'running' ? 'Session live' : status === 'paused' ? 'Paused' : 'Ready'}
            </span>
          </div>
        </div>

        <div className="relative grid items-center gap-7 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10">
          <div className="flex flex-col items-center">
            <div className="relative flex h-[284px] w-[284px] items-center justify-center sm:h-[326px] sm:w-[326px]">
              <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="focus-ring-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={mode === 'focus' ? '#7BC47F' : '#F2B998'} />
                    <stop offset="100%" stopColor={mode === 'focus' ? '#F4E4AE' : '#F4E4AE'} />
                  </linearGradient>
                </defs>
                <circle cx="160" cy="160" r="145" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                <circle
                  cx="160"
                  cy="160"
                  r="145"
                  fill="none"
                  stroke="url(#focus-ring-gradient)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 145}
                  strokeDashoffset={2 * Math.PI * 145 * (1 - Math.max(0.002, progress))}
                  transform="rotate(-90 160 160)"
                  className="transition-[stroke-dashoffset] duration-500 ease-linear"
                />
                <circle
                  cx="160"
                  cy="160"
                  r="131"
                  fill="none"
                  stroke="rgba(255,255,255,0.035)"
                  strokeWidth="1"
                  strokeDasharray="2 8"
                />
                <g transform={`rotate(${-90 + progress * 360} 160 160)`}>
                  <circle cx="160" cy="15" r="5" fill={mode === 'focus' ? '#F4E4AE' : '#F2B998'} />
                  <circle cx="160" cy="15" r="10" fill={mode === 'focus' ? '#F4E4AE' : '#F2B998'} opacity=".13" />
                </g>
              </svg>

              <div className="relative z-10 flex flex-col items-center text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.55rem] font-black uppercase tracking-[0.17em] text-cream/45">
                  {mode === 'focus' ? <BookOpen className="h-2.5 w-2.5" /> : <Coffee className="h-2.5 w-2.5" />}
                  {status === 'running' ? `${modeLabel} in progress` : status === 'paused' ? 'Paused' : `${modeLabel} session`}
                </span>
                <span className="mt-3 font-display text-[4.2rem] font-semibold leading-none tracking-[-0.055em] text-cream sm:text-[5rem]">
                  {formatClock(remaining)}
                </span>
                <span className="mt-3 text-[0.62rem] font-bold text-cream/35">
                  {duration} minute{mode === 'focus' ? 's' : ''} · {mode === 'focus' ? `${duration * 2} XP waiting` : 'a gentle pause'}
                </span>
              </div>
            </div>

            <div className="mt-2 w-full max-w-[390px]">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={isRunning ? handlePause : handleStart}
                  className={cn(
                    'btn flex-1 py-4 text-[0.82rem]',
                    isRunning
                      ? 'border border-cream/20 bg-cream/[0.08] text-cream hover:bg-cream/[0.13]'
                      : 'bg-moss text-forest-950 shadow-[0_14px_32px_-16px_rgba(123,196,127,0.8)] hover:-translate-y-0.5 hover:bg-forest-300',
                  )}
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause session
                    </>
                  ) : isPaused ? (
                    <>
                      <Play className="h-4 w-4" />
                      Keep going
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Begin {mode === 'focus' ? 'focus' : 'break'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => resetTimer()}
                  aria-label="Reset timer"
                  className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.055] text-cream/55 transition hover:bg-white/10 hover:text-cream"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {(isRunning || isPaused) && (
                <button
                  type="button"
                  onClick={() => finishSession('early')}
                  className="mt-2.5 w-full text-center text-[0.6rem] font-bold text-cream/35 transition hover:text-cream/65"
                >
                  End early & bank {mode === 'focus' ? 'these minutes' : 'the break'}
                </button>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    disabled={!canAdjust}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-[0.6rem] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-35',
                      duration === preset
                        ? 'border-cream/30 bg-cream/[0.12] text-cream'
                        : 'border-white/10 text-cream/40 hover:border-white/20 hover:text-cream/70',
                    )}
                  >
                    {preset} min
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openCustom}
                  disabled={!canAdjust}
                  className={cn(
                    'rounded-full border border-dashed px-3.5 py-1.5 text-[0.6rem] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-35',
                    !presets.includes(duration)
                      ? 'border-cream/30 bg-cream/[0.12] text-cream'
                      : 'border-white/15 text-cream/40 hover:border-white/25 hover:text-cream/70',
                  )}
                >
                  Custom
                </button>
              </div>
            </div>
          </div>

          <FocusScene
            companion={companion}
            mode={mode}
            status={status}
            completion={completion}
            level={progression.level}
          />
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoCard
          icon={<Zap className="h-4 w-4" />}
          label="Today’s earned XP"
          value={`${todayXp} XP`}
          helper={`${derived?.minutesToday || 0} focused minutes so far`}
          accent="butter"
        />
        <InfoCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Next chapter"
          value={progression.atFreeCap ? 'Level cap' : `Level ${progression.level + 1}`}
          helper={
            progression.atFreeCap
              ? 'Unlock Plus to keep growing'
              : `${Math.max(0, progression.xpForNext - progression.xpIntoLevel)} XP to go`
          }
          accent="forest"
          onClick={progression.atFreeCap ? () => openPaywall('focus-next-level') : undefined}
        />
        <div className="card flex items-start gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-peach/20 text-forest-800">
            <Flame className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.56rem] font-black uppercase tracking-[0.13em] text-forest-700/40">
              A softer rule
            </p>
            <p className="mt-1 font-display text-[1.12rem] font-semibold leading-tight text-forest-950">
              One minute is enough.
            </p>
            <p className="mt-1.5 text-[0.6rem] font-semibold leading-snug text-forest-800/40">
              Showing up counts even when the session is tiny.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Your rhythm</p>
              <h2 className="mt-1.5 font-display text-[1.35rem] font-semibold tracking-tight text-forest-950">
                Seven days, side by side.
              </h2>
            </div>
            <span className="chip">{formatDuration(weekMinutes.reduce((sum, day) => sum + day.minutes, 0))}</span>
          </div>
          <div className="mt-5 flex items-end gap-2 sm:gap-3">
            {weekMinutes.map((day, index) => {
              const max = Math.max(...weekMinutes.map((item) => item.minutes), 30, 1);
              const height = Math.max(day.minutes ? 12 : 3, (day.minutes / max) * 100);
              const isToday = index === weekMinutes.length - 1;
              return (
                <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end rounded-full bg-transparent p-1">
                    <div
                      className={cn(
                        'w-full rounded-full',
                        isToday ? 'bg-forest-800' : day.minutes ? 'bg-forest-300' : 'bg-forest-900/10',
                      )}
                      style={{ height: `${height}px` }}
                      title={`${day.label}: ${day.minutes} minutes`}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[0.56rem] font-extrabold',
                      isToday ? 'text-forest-900' : 'text-forest-800/35',
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-paper p-5 shadow-card">
          <p className="eyebrow">Why it works</p>
          <p className="mt-2 font-display text-[1.35rem] font-semibold leading-tight text-forest-950">
            Your focus leaves a mark.
          </p>
          <div className="mt-4 space-y-3">
            {[
              ['1 min', '= 2 XP for your companion'],
              ['1 session', '= one more shared memory'],
              ['1 return', '= roots growing under the surface'],
            ].map(([left, right]) => (
              <div key={left} className="flex items-center gap-3">
                <span className="w-16 shrink-0 rounded-full bg-forest-100 px-2 py-1 text-center text-[0.55rem] font-extrabold text-forest-700">
                  {left}
                </span>
                <span className="text-[0.64rem] font-semibold text-forest-800/55">{right}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-forest-50/70 p-3">
            <Avatar companion={companion} mood="joyful" level={progression.level} size={34} />
            <p className="text-[0.6rem] font-semibold leading-snug text-forest-800/55">
              {companion?.name} is already proud of the next session you have not even started.
            </p>
          </div>
        </div>
      </section>

      <CustomDurationModal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        mode={mode}
        draft={customDraft}
        setDraft={setCustomDraft}
        onApply={applyCustom}
        companionName={companion?.name}
      />

      <SessionCompleteModal
        completion={completion}
        onClose={closeCompletion}
        companion={companion}
        progression={progression}
        onPaywall={() => {
          closeCompletion();
          openPaywall('focus-complete');
        }}
        onToday={() => {
          closeCompletion();
          navigate('/home');
        }}
      />
    </div>
  );
}

function FocusScene({ companion, mode, status, completion, level = 1 }) {
  const pose =
    completion?.type === 'focus'
      ? 'celebrate'
      : mode === 'break'
        ? 'sleep'
        : status === 'running'
          ? 'study'
          : 'idle';
  const mood =
    completion?.type === 'focus'
      ? 'joyful'
      : mode === 'break'
        ? 'sleepy'
        : status === 'running'
          ? 'focused'
          : 'ready';

  const message =
    completion?.type === 'focus'
      ? 'You did it. I felt every minute.'
      : completion?.type === 'break'
        ? 'That was a good breath. Ready when you are.'
        : mode === 'break'
          ? 'Shoulders down. Tea optional. I will keep the page warm.'
          : status === 'running'
            ? 'I am on page twelve. No rush — we have time.'
            : status === 'paused'
              ? 'Paused is allowed. I will hold your place.'
              : 'I saved you the sunny spot. Whenever you are ready.';

  return (
    <div className="relative flex min-h-[380px] flex-col overflow-hidden rounded-[1.65rem] border border-white/10 bg-forest-900/45 sm:min-h-[430px]">
      <div className="pointer-events-none absolute inset-0 align-dot opacity-20" />
      <div className="pointer-events-none absolute -right-16 -top-10 h-48 w-48 rounded-full bg-butter/10 blur-3xl" />

      <div className="relative flex items-center justify-between p-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[0.53rem] font-black uppercase tracking-[0.14em] text-cream/45">
          <span className={cn('h-1.5 w-1.5 rounded-full', status === 'running' ? 'bg-moss' : 'bg-butter/60')} />
          {mode === 'break' ? 'Resting together' : status === 'running' ? 'Reading with you' : 'Your study nook'}
        </span>
        <span className="font-display text-[0.62rem] italic text-cream/25">a quiet corner</span>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <div className="absolute bottom-[16%] h-24 w-44 rounded-full bg-butter/10 blur-2xl" />
        <span className="absolute left-4 top-[16%] max-w-[170px] rounded-2xl rounded-bl-md border border-white/10 bg-cream/[0.07] p-3 text-[0.62rem] font-semibold leading-relaxed text-cream/65 backdrop-blur-sm">
          {message}
        </span>

        <div className="relative mt-10">
          <CompanionArt
            type={companion?.id}
            companion={companion}
            mood={mood}
            pose={pose}
            level={level}
            size={260}
            glow
            className="drop-shadow-[0_25px_35px_rgba(0,0,0,0.35)]"
          />
          <div className="absolute -bottom-1 left-1/2 h-3 w-44 -translate-x-1/2 rounded-full bg-forest-950/80 blur-[1px]" />
          <div className="absolute -right-6 bottom-8 h-10 w-10 rounded-full border border-white/10 bg-white/[0.04]" />
          <div className="absolute -left-2 bottom-16 h-6 w-6 rounded-full border border-white/10 bg-white/[0.04]" />
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-forest-950/80 to-transparent" />
      </div>

      <div className="relative flex items-end justify-between px-4 pb-4">
        <div>
          <p className="text-[0.68rem] font-extrabold text-cream/75">{companion?.name}</p>
          <p className="mt-0.5 text-[0.54rem] font-semibold text-cream/30">
            {status === 'running' ? 'reading beside you' : mode === 'break' ? 'dreaming in the margins' : 'keeping the light on'}
          </p>
        </div>
        <div className="flex items-end gap-1">
          {[12, 18, 9, 22, 14].map((height, index) => (
            <span
              key={index}
              className={cn(
                'w-1 rounded-full',
                index % 2 === 0 ? 'bg-moss/55' : 'bg-butter/35',
              )}
              style={{ height }}
            />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute right-1/4 top-1/4 h-1.5 w-1.5 animate-drift rounded-full bg-butter" />
      <div className="pointer-events-none absolute left-1/3 top-1/3 h-1 w-1 animate-drift rounded-full bg-white [animation-delay:2s]" />
    </div>
  );
}

function InfoCard({ icon, label, value, helper, accent, onClick }) {
  const accents = {
    butter: 'bg-butter/35 text-forest-800',
    forest: 'bg-forest-100 text-forest-700',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'card flex items-start gap-3 p-4 text-left transition',
        onClick && 'hover:-translate-y-0.5 hover:border-forest-300',
      )}
    >
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', accents[accent] || accents.forest)}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.56rem] font-black uppercase tracking-[0.13em] text-forest-700/40">{label}</p>
        <p className="mt-1 font-display text-[1.24rem] font-semibold leading-none text-forest-950">{value}</p>
        <p className="mt-1.5 truncate text-[0.6rem] font-semibold text-forest-800/40">{helper}</p>
      </div>
      {onClick && <Lock className="mt-1 h-3.5 w-3.5 shrink-0 text-forest-700/35" />}
    </Tag>
  );
}

function CustomDurationModal({ open, onClose, mode, draft, setDraft, onApply, companionName }) {
  const max = mode === 'focus' ? 120 : 30;
  const quick = mode === 'focus' ? [1, 10, 15, 45, 90] : [3, 5, 10, 20, 30];
  return (
    <Modal open={open} onClose={onClose} panelClassName="max-w-[430px]">
      <div className="p-6 sm:p-7">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-forest-100 text-forest-700">
          <TimerReset className="h-5 w-5" />
        </span>
        <p className="mt-4 eyebrow">Custom {mode}</p>
        <h2 className="mt-1.5 font-display text-[1.9rem] font-semibold leading-tight tracking-tight text-forest-950">
          How long feels kind?
        </h2>
        <p className="mt-2 text-[0.72rem] font-semibold leading-relaxed text-forest-800/50">
          For a quick prototype walkthrough, one minute is a perfectly real session.
        </p>

        <div className="mt-6 flex items-end justify-center gap-1.5">
          <span className="font-display text-[3.2rem] font-semibold leading-none tracking-tight text-forest-950">
            {draft}
          </span>
          <span className="pb-1 text-[0.7rem] font-bold text-forest-800/40">minutes</span>
        </div>

        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={draft}
          onChange={(event) => setDraft(Number(event.target.value))}
          className="mt-5 w-full accent-forest-700"
          aria-label={`${mode} duration in minutes`}
        />
        <div className="mt-1 flex justify-between text-[0.55rem] font-bold text-forest-800/30">
          <span>1 min</span>
          <span>{max} min</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {quick.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDraft(preset)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[0.64rem] font-extrabold transition',
                draft === preset
                  ? 'border-forest-900 bg-forest-900 text-cream'
                  : 'border-line bg-white/50 text-forest-800 hover:border-forest-300',
              )}
            >
              {preset} min
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-forest-50/75 p-3.5">
          <p className="text-[0.63rem] font-semibold leading-relaxed text-forest-800/55">
            {mode === 'focus'
              ? `${draft} focused minutes will grow ${companionName || 'your companion'} by ${draft * 2} XP.`
              : 'Break minutes do not earn XP. They are simply part of a sustainable rhythm.'}
          </p>
        </div>

        <button type="button" onClick={onApply} className="btn-primary mt-4 w-full py-3.5">
          Set {draft} {draft === 1 ? 'minute' : 'minutes'}
          <Check className="h-4 w-4" />
        </button>
      </div>
    </Modal>
  );
}

function SessionCompleteModal({
  completion,
  onClose,
  companion,
  progression,
  onPaywall,
  onToday,
}) {
  if (!completion) return null;
  const isFocus = completion.type === 'focus';
  const result = completion.result;
  const nextProgression = result?.progression || progression;
  const atCap = isFocus && !result?.progression?.premium && nextProgression?.atFreeCap;

  return (
    <Modal open={Boolean(completion)} onClose={onClose} panelClassName="max-w-[470px]" hideClose>
      <div className="relative overflow-hidden px-6 pb-7 pt-8 text-center sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-forest-100/80 to-transparent" />
        {isFocus && <Confetti pieces={18} />}
        <div className="relative mx-auto w-[180px]">
          <div className="absolute inset-x-3 bottom-3 h-14 rounded-full bg-moss/15 blur-xl" />
          <CompanionArt
            type={companion?.id}
            companion={companion}
            mood={isFocus ? 'joyful' : 'sleepy'}
            pose={isFocus ? 'celebrate' : 'sleep'}
            level={result?.levelAfter || progression.level}
            size={180}
            glow={isFocus}
            className="relative"
          />
        </div>

        <p className="relative eyebrow">
          {isFocus ? (completion.kind === 'early' ? 'Banked with care' : 'Session complete') : 'Break complete'}
        </p>
        <h2 className="relative mt-2 font-display text-[2.25rem] font-semibold leading-[1.02] tracking-[-0.04em] text-forest-950">
          {isFocus ? 'You grew something.' : 'A softer pause.'}
        </h2>

        {isFocus ? (
          <>
            <div className="relative mx-auto mt-4 flex max-w-[280px] items-stretch divide-x divide-line rounded-2xl border border-line bg-white/50 py-3">
              <div className="flex-1">
                <p className="font-display text-[1.4rem] font-semibold leading-none text-forest-950">
                  +{completion.xpEarned}
                </p>
                <p className="mt-1 text-[0.5rem] font-black uppercase tracking-wider text-forest-800/35">
                  XP earned
                </p>
              </div>
              <div className="flex-1">
                <p className="font-display text-[1.4rem] font-semibold leading-none text-forest-950">
                  {completion.minutes}
                </p>
                <p className="mt-1 text-[0.5rem] font-black uppercase tracking-wider text-forest-800/35">
                  minutes
                </p>
              </div>
              <div className="flex-1">
                <p className="font-display text-[1.4rem] font-semibold leading-none text-forest-950">
                  {result?.streak || 0}
                </p>
                <p className="mt-1 text-[0.5rem] font-black uppercase tracking-wider text-forest-800/35">
                  day streak
                </p>
              </div>
            </div>

            {result?.levelUp && (
              <div className="relative mx-auto mt-3 flex max-w-[300px] items-center justify-center gap-2 rounded-full bg-forest-900 px-4 py-2 text-[0.62rem] font-extrabold text-cream">
                <Sparkles className="h-3.5 w-3.5 text-butter" />
                Level {result.levelBefore} → Level {result.levelAfter} · {nextProgression.stage.name}
              </div>
            )}
            {result?.goalReached && (
              <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-butter/40 px-3 py-1.5 text-[0.6rem] font-extrabold text-forest-800">
                <Flame className="h-3 w-3" />
                Daily goal reached
              </p>
            )}

            <p className="relative mx-auto mt-4 max-w-[310px] text-[0.74rem] font-semibold leading-relaxed text-forest-800/55">
              {completion.encouragement}
            </p>

            {atCap && (
              <button
                type="button"
                onClick={onPaywall}
                className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-butter bg-butter/30 px-4 py-3 text-[0.66rem] font-extrabold text-forest-900 transition hover:bg-butter/50"
              >
                <Lock className="h-3.5 w-3.5" />
                Level 5 is the free cap — unlock what’s next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          <p className="relative mx-auto mt-4 max-w-[310px] text-[0.76rem] font-semibold leading-relaxed text-forest-800/55">
            {completion.encouragement}
          </p>
        )}

        <div className="relative mt-6 flex gap-2.5">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">
            {isFocus ? 'Sit a little longer' : 'Back to focus'}
          </button>
          <button type="button" onClick={onToday} className="btn-primary flex-1 py-3">
            Today
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p className="relative mt-3 text-[0.55rem] font-bold text-forest-800/30">
          {isFocus ? 'This session is safely in your forest.' : 'Your timer is reset and ready.'}
        </p>
      </div>
    </Modal>
  );
}
