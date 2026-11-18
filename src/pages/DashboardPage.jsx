import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  Sparkles,
  Target,
} from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { formatDuration, formatLongDate, formatTime, getGreeting, getLastNDays } from '../lib/date.js';
import { getCompanionMessage, getDailyLine } from '../lib/mood.js';
import { getTodaySessions } from '../lib/progression.js';
import { cn } from '../lib/utils.js';
import { CompanionArt } from '../components/CompanionArt.jsx';
import { Modal } from '../components/Modal.jsx';
import { Avatar, MoodPill, XPBar } from '../components/UI.jsx';

export function DashboardPage() {
  const {
    user,
    companion,
    progression,
    derived,
    sessions,
    openPaywall,
    openShare,
    setDailyGoal,
    showToast,
  } = useMori();
  const navigate = useNavigate();
  const [goalOpen, setGoalOpen] = useState(false);
  const [draftGoal, setDraftGoal] = useState(user?.dailyGoal || 30);

  const greeting = getGreeting();
  const mood = derived?.mood;
  const note = useMemo(
    () =>
      getCompanionMessage({
        companion,
        mood,
        nickname: user?.nickname,
        dailyGoal: user?.dailyGoal,
      }),
    [companion, mood, user?.nickname, user?.dailyGoal],
  );
  const dailyLine = getDailyLine({ mood });
  const todaySessions = getTodaySessions(sessions);
  const week = getLastNDays(7);
  const weekData = week.map((day) => ({
    ...day,
    minutes: sessions
      .filter(
        (session) =>
          session.type !== 'break' &&
          new Date(session.startTime).toDateString() === day.date.toDateString(),
      )
      .reduce((sum, session) => sum + session.duration, 0),
  }));
  const weekTotal = weekData.reduce((sum, day) => sum + day.minutes, 0);

  const heroTitle = {
    focused: `${companion?.name} is reading beside you.`,
    joyful: 'Today’s goal is in the roots.',
    missing: `${companion?.name} left the light on.`,
    sleepy: 'A quiet night in the forest.',
    ready: 'The reading nook is ready.',
  }[mood?.key || 'ready'];

  function saveGoal() {
    setDailyGoal(draftGoal);
    setGoalOpen(false);
    showToast(`Daily goal set to ${draftGoal} minutes.`);
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <p className="eyebrow">{formatLongDate()}</p>
            <span className="h-1 w-1 rounded-full bg-forest-300" />
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.13em] text-forest-700/35">
              Day{' '}
              {user?.createdAt
                ? Math.max(
                    1,
                    Math.round(
                      (new Date().setHours(0, 0, 0, 0) -
                        new Date(user.createdAt).setHours(0, 0, 0, 0)) /
                        86_400_000,
                    ) + 1,
                  )
                : 1}{' '}
              with {companion?.name}
            </p>
          </div>
          <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.045em] text-forest-950 sm:text-[2.65rem]">
            {greeting}, <span className="italic text-forest-600">{user?.nickname}</span>.
          </h1>
          <p className="mt-2 max-w-lg text-[0.8rem] font-semibold leading-relaxed text-forest-800/50">
            One honest session is enough to make today count. {companion?.name} is
            already proud you opened the app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openShare('dashboard')}
            className="btn-secondary px-4 py-2.5 text-[0.72rem]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share card
          </button>
          <button
            type="button"
            onClick={() => navigate('/focus')}
            className="btn-primary px-4 py-2.5 text-[0.72rem] sm:hidden"
          >
            Start focus
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <CompanionHero
          user={user}
          companion={companion}
          progression={progression}
          mood={mood}
          heroTitle={heroTitle}
          onFocus={() => navigate('/focus')}
          onPaywall={() => openPaywall('dashboard-level-cap')}
        />
        <DailyGoalCard
          minutesToday={derived?.minutesToday || 0}
          goal={user?.dailyGoal || 30}
          progress={derived?.goalProgress || 0}
          remaining={derived?.goalRemaining || 0}
          goalReached={derived?.goalReached}
          onStart={() => navigate('/focus')}
          onEdit={() => {
            setDraftGoal(user?.dailyGoal || 30);
            setGoalOpen(true);
          }}
        />
      </section>

      {progression.atFreeCap && !user?.premium && (
        <button
          type="button"
          onClick={() => openPaywall('dashboard-cap-banner')}
          className="group mt-4 flex w-full items-center gap-4 rounded-[1.45rem] border border-butter/70 bg-gradient-to-r from-butter/45 via-[#F9F0D1] to-apricot/25 px-4 py-3.5 text-left transition hover:border-[#D8AA3B]/50 sm:px-5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-900 text-butter shadow-sm">
            <Lock className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.78rem] font-extrabold text-forest-950">
              {companion?.name} has reached the free Level 5 cap.
            </span>
            <span className="mt-0.5 block text-[0.65rem] font-semibold text-forest-800/50">
              Every minute still counts as XP — Plus unlocks everything waiting beyond.
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-1 text-[0.66rem] font-extrabold text-forest-800 sm:flex">
            See Plus
            <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-forest-700 sm:hidden" />
        </button>
      )}

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Current streak"
          value={`${derived?.streak || 0} ${derived?.streak === 1 ? 'day' : 'days'}`}
          helper={
            derived?.streak
              ? 'A warm little chain of leaves.'
              : 'Start one today — one is enough.'
          }
          accent="butter"
          trailing={
            <div className="flex gap-1">
              {weekData.map((day, index) => (
                <span
                  key={day.key}
                  title={`${day.label}: ${day.minutes} min`}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    day.minutes > 0 ? 'bg-forest-500' : 'bg-forest-900/10',
                    index === weekData.length - 1 && 'ring-2 ring-forest-200',
                  )}
                />
              ))}
            </div>
          }
        />
        <StatCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Focus today"
          value={formatDuration(derived?.minutesToday || 0)}
          helper={
            derived?.goalReached
              ? 'Goal met. Go be soft with yourself.'
              : `${derived?.goalRemaining || 0} min left to today’s goal`
          }
          accent="forest"
        />
        <StatCard
          icon={<Heart className="h-4 w-4" />}
          label={`${companion?.name}’s mood`}
          value={mood?.label || 'Ready'}
          helper={`${companion?.name} ${mood?.blurb || 'is close by'}.`}
          accent="peach"
          trailing={<MoodPill mood={mood} />}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">This week</p>
              <h2 className="mt-1.5 font-display text-[1.45rem] font-semibold tracking-tight text-forest-950">
                A gentle rhythm.
              </h2>
            </div>
            <div className="text-right">
              <p className="font-display text-[1.4rem] font-semibold leading-none text-forest-900">
                {formatDuration(weekTotal)}
              </p>
              <p className="mt-1 text-[0.56rem] font-extrabold uppercase tracking-wider text-forest-800/35">
                last 7 days
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-end gap-2 sm:gap-3">
            {weekData.map((day, index) => {
              const max = Math.max(...weekData.map((item) => item.minutes), user?.dailyGoal || 30, 1);
              const height = Math.max(day.minutes ? 12 : 3, (day.minutes / max) * 112);
              const isToday = index === weekData.length - 1;
              return (
                <div key={day.key} className="group flex flex-1 flex-col items-center gap-2">
                  <span className="text-[0.52rem] font-extrabold text-forest-800/0 transition group-hover:text-forest-800/50">
                    {day.minutes}m
                  </span>
                  <div className="flex h-28 w-full items-end rounded-full bg-transparent p-1">
                    <div
                      className={cn(
                        'w-full rounded-full transition-all duration-700',
                        isToday
                          ? 'bg-forest-800'
                          : day.minutes
                            ? 'bg-forest-300'
                            : 'bg-forest-900/10',
                      )}
                      style={{ height: `${height}px` }}
                      title={`${day.label}: ${day.minutes} minutes`}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[0.58rem] font-extrabold',
                      isToday ? 'text-forest-900' : 'text-forest-800/35',
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col justify-between gap-2 border-t border-line/70 pt-4 sm:flex-row sm:items-center">
            <p className="flex items-center gap-2 text-[0.65rem] font-semibold text-forest-800/45">
              <CalendarDays className="h-3.5 w-3.5 text-forest-500" />
              {derived?.sessionsToday || 0} session{derived?.sessionsToday === 1 ? '' : 's'} today
              · {user?.dailyGoal || 30} min goal
            </p>
            <Link
              to="/report"
              className="inline-flex items-center gap-1 text-[0.66rem] font-extrabold text-forest-700 transition hover:text-forest-950"
            >
              Full insights
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EBDDBF] bg-gradient-to-br from-[#FBF1D7] via-[#F9F0DE] to-[#F6E7D5] p-5 shadow-card sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-[#D8AA3B]/15" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-peach/20 blur-2xl" />
          <div className="relative flex items-center gap-2.5">
            <Avatar
              companion={companion}
              mood={mood?.key}
              level={progression.level}
              size={40}
            />
            <div>
              <p className="text-[0.72rem] font-extrabold text-forest-950">
                A note from {companion?.name}
              </p>
              <p className="text-[0.52rem] font-extrabold uppercase tracking-[0.13em] text-forest-700/35">
                Written for today
              </p>
            </div>
            <Sparkles className="ml-auto h-4 w-4 text-[#CA9E3B]" />
          </div>
          <blockquote className="relative mt-5 font-display text-[1.28rem] font-medium italic leading-[1.32] tracking-tight text-forest-950">
            “{note}”
          </blockquote>
          <p className="relative mt-3 text-[0.68rem] font-semibold leading-relaxed text-forest-900/50">
            {dailyLine}
          </p>
          <Link
            to="/companion"
            className="relative mt-5 inline-flex items-center gap-1.5 rounded-full border border-forest-900/10 bg-white/45 px-3.5 py-2 text-[0.65rem] font-extrabold text-forest-800 transition hover:bg-white/70"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Talk with {companion?.name}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Today’s moments</p>
              <h2 className="mt-1.5 font-display text-[1.35rem] font-semibold tracking-tight text-forest-950">
                {todaySessions.length ? 'Little pages, turned.' : 'Still a blank page.'}
              </h2>
            </div>
            <span className="chip">{derived?.sessionsToday || 0} today</span>
          </div>

          {todaySessions.length ? (
            <div className="mt-4 divide-y divide-line/70">
              {todaySessions.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-forest-100 text-forest-700">
                    <BookOpen className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.72rem] font-extrabold text-forest-900">
                      {session.duration} minute focus
                    </p>
                    <p className="mt-0.5 text-[0.58rem] font-semibold text-forest-800/40">
                      {formatTime(session.startTime)} · with {companion?.name}
                    </p>
                  </div>
                  <span className="rounded-full bg-forest-50 px-2.5 py-1 text-[0.55rem] font-extrabold text-forest-700">
                    +{session.xpEarned} XP
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl bg-forest-50/60 p-4 sm:flex-row sm:items-center">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-forest-600 shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="flex-1 text-[0.7rem] font-semibold leading-relaxed text-forest-800/55">
                {companion?.name} is waiting by the window. A tiny 10-minute session
                would make this page feel warmer.
              </p>
              <button
                type="button"
                onClick={() => navigate('/focus')}
                className="btn-moss shrink-0 px-4 py-2 text-[0.65rem]"
              >
                Begin
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] bg-forest-900 p-5 text-cream shadow-card sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-moss/10 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.53rem] font-black uppercase tracking-[0.15em] text-moss">
              <Target className="h-3 w-3" />
              The same 30 minutes
            </span>
            <p className="mt-4 font-display text-[1.45rem] font-medium leading-[1.15] text-balance">
              You study. They grow. Nobody has to do it alone.
            </p>
            <p className="mt-2.5 text-[0.66rem] font-semibold leading-relaxed text-cream/40">
              Every finished session turns into experience for {companion?.name}. No
              streak guilt, no perfect routine — just a small life that brightens when
              you show up.
            </p>
          </div>
          <div className="relative mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <div className="flex -space-x-2">
              {['#A9744F', '#C99A6C', '#D77C50'].map((color, index) => (
                <span
                  key={color}
                  className="grid h-7 w-7 place-items-center rounded-full border-2 border-forest-900 text-[0.55rem]"
                  style={{ backgroundColor: color }}
                >
                  {['B', 'F', 'M'][index]}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openShare('dashboard-bottom')}
              className="inline-flex items-center gap-1 text-[0.6rem] font-extrabold text-cream/60 transition hover:text-cream"
            >
              <Share2 className="h-3 w-3" />
              Keep this moment
            </button>
          </div>
        </div>
      </section>

      <GoalModal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        goal={draftGoal}
        setGoal={setDraftGoal}
        onSave={saveGoal}
      />
    </div>
  );
}

function CompanionHero({ user, companion, progression, mood, heroTitle, onPaywall }) {
  const pose = {
    focused: 'study',
    joyful: 'celebrate',
    sleepy: 'sleep',
    missing: 'idle',
    ready: 'idle',
  }[mood?.key || 'ready'];

  return (
    <div className="relative min-h-[330px] overflow-hidden rounded-[2rem] bg-forest-950 p-6 text-cream shadow-float sm:p-8">
      <div className="absolute inset-0 align-dot opacity-25" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-moss/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-peach/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[16%] top-5 h-24 w-24 rounded-full border border-white/[0.07]" />
      <div className="pointer-events-none absolute right-[10%] top-14 h-40 w-40 rounded-full border border-white/[0.04]" />

      <div className="relative grid gap-3 sm:grid-cols-[1fr_210px] sm:items-center">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <MoodPill mood={mood} light />
            {user?.premium && (
              <span className="rounded-full border border-butter/25 bg-butter/10 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-butter">
                Plus member
              </span>
            )}
          </div>
          <h2 className="mt-5 max-w-[25rem] font-display text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.045em] text-cream sm:text-[2.6rem]">
            {heroTitle}
          </h2>
          <p className="mt-3 max-w-[24rem] text-[0.76rem] font-semibold leading-relaxed text-cream/45">
            {mood?.key === 'missing'
              ? `No catching up required. ${companion?.name} just likes it when you are around.`
              : mood?.key === 'joyful'
                ? `You filled today’s ${user?.dailyGoal}-minute goal. ${companion?.name} is still glowing.`
                : `${companion?.name} is at Level ${progression.level} · ${progression.stage.name}. A few focused minutes would make the forest brighter.`}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/companion"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-[0.67rem] font-extrabold text-cream/85 transition hover:bg-white/[0.12]"
            >
              Visit {companion?.name}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {progression.atFreeCap && !user?.premium && (
              <button
                type="button"
                onClick={onPaywall}
                className="inline-flex items-center gap-1.5 text-[0.65rem] font-extrabold text-butter transition hover:text-cream"
              >
                <Lock className="h-3 w-3" />
                Unlock Lv.6+
              </button>
            )}
          </div>
        </div>

        <div className="relative -mb-8 mt-2 flex justify-center sm:-mb-4 sm:mt-0">
          <div className="absolute bottom-8 h-32 w-40 rounded-full bg-moss/15 blur-2xl" />
          <span className="absolute right-1 top-1 z-10 rounded-full border border-white/10 bg-forest-900/70 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-[0.13em] text-cream/60 backdrop-blur">
            {progression.stage.name}
          </span>
          <CompanionArt
            type={companion?.id}
            companion={companion}
            mood={mood?.key}
            pose={pose}
            level={progression.level}
            size={230}
            glow
            className="relative drop-shadow-[0_18px_30px_rgba(0,0,0,0.3)]"
          />
        </div>
      </div>

      <div className="relative mt-4 border-t border-white/10 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-cream/10 font-display text-[0.7rem] font-semibold text-moss">
              {progression.level}
            </span>
            <div>
              <p className="text-[0.65rem] font-extrabold text-cream/80">
                Level {progression.level}
              </p>
              <p className="text-[0.5rem] font-semibold text-cream/35">
                {progression.atFreeCap
                  ? 'Free level cap reached'
                  : `${progression.xpIntoLevel} / ${progression.xpForNext} XP this level`}
              </p>
            </div>
          </div>
          <span className="text-[0.53rem] font-extrabold uppercase tracking-[0.13em] text-cream/30">
            {progression.xp} total XP
          </span>
        </div>
        <XPBar progression={progression} light showLabels={false} />
        {progression.atFreeCap && !user?.premium && (
          <p className="mt-2 flex items-center gap-1 text-[0.53rem] font-bold text-butter/75">
            <Lock className="h-2.5 w-2.5" /> MORI Plus opens every stage after Level 5.
          </p>
        )}
      </div>
    </div>
  );
}

function DailyGoalCard({
  minutesToday,
  goal,
  progress,
  remaining,
  goalReached,
  onStart,
  onEdit,
}) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(progress, 1));

  return (
    <div className="card relative flex min-h-[330px] flex-col overflow-hidden p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Today’s focus</p>
          <h2 className="mt-1.5 font-display text-[1.45rem] font-semibold tracking-tight text-forest-950">
            A small target.
          </h2>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1.5 text-[0.55rem] font-extrabold text-forest-700/55 transition hover:border-forest-300 hover:text-forest-900"
        >
          <Target className="h-3 w-3" />
          Edit
        </button>
      </div>

      <div className="my-3 flex flex-1 items-center justify-center">
        <div className="relative h-[142px] w-[142px]">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#EAE4D7" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="url(#daily-goal-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700"
            />
            <defs>
              <linearGradient id="daily-goal-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#326843" />
                <stop offset="100%" stopColor="#7BC47F" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[2.2rem] font-semibold leading-none tracking-tight text-forest-950">
              {minutesToday}
            </span>
            <span className="mt-1 text-[0.56rem] font-extrabold uppercase tracking-[0.16em] text-forest-800/35">
              of {goal} min
            </span>
          </div>
          {goalReached && (
            <span className="absolute -right-1 bottom-2 grid h-7 w-7 place-items-center rounded-full bg-forest-900 text-moss shadow-sm">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>

      <p className="mb-3 text-center text-[0.66rem] font-semibold text-forest-800/45">
        {goalReached
          ? 'Goal met. The forest is proud of you.'
          : `${remaining} more minute${remaining === 1 ? '' : 's'} to fill today’s ring.`}
      </p>

      <button type="button" onClick={onStart} className="btn-primary w-full py-3.5">
        Start focus
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatCard({ icon, label, value, helper, trailing, accent }) {
  const accents = {
    butter: 'bg-butter/35 text-forest-800',
    forest: 'bg-forest-100 text-forest-700',
    peach: 'bg-peach/20 text-forest-800',
  };
  return (
    <div className="card flex items-start gap-3 p-4">
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', accents[accent] || accents.forest)}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.56rem] font-black uppercase tracking-[0.13em] text-forest-700/40">
          {label}
        </p>
        <p className="mt-1 truncate font-display text-[1.24rem] font-semibold leading-none text-forest-950">
          {value}
        </p>
        <p className="mt-1.5 truncate text-[0.6rem] font-semibold text-forest-800/40">{helper}</p>
      </div>
      {trailing && <div className="shrink-0 pt-1">{trailing}</div>}
    </div>
  );
}

function GoalModal({ open, onClose, goal, setGoal, onSave }) {
  const presets = [15, 30, 45, 60, 90];
  return (
    <Modal open={open} onClose={onClose} panelClassName="max-w-[430px]">
      <div className="p-6 sm:p-7">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-forest-100 text-forest-700">
          <Target className="h-5 w-5" />
        </span>
        <p className="mt-4 eyebrow">A gentle target</p>
        <h2 className="mt-1.5 font-display text-[1.9rem] font-semibold leading-tight tracking-tight text-forest-950">
          How much togetherness today?
        </h2>
        <p className="mt-2 text-[0.72rem] font-semibold leading-relaxed text-forest-800/50">
          This is a direction, not a debt. You can change it whenever the day changes.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setGoal(preset)}
              className={cn(
                'rounded-full border px-4 py-2 text-[0.7rem] font-extrabold transition',
                goal === preset
                  ? 'border-forest-900 bg-forest-900 text-cream'
                  : 'border-line bg-white/50 text-forest-800 hover:border-forest-300',
              )}
            >
              {preset} min
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-line bg-white/45 p-3">
          <button
            type="button"
            aria-label="Decrease goal by five minutes"
            onClick={() => setGoal(Math.max(5, goal - 5))}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-forest-800 transition hover:bg-forest-50"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <div className="text-center">
            <span className="font-display text-[2.1rem] font-semibold leading-none text-forest-950">
              {goal}
            </span>
            <span className="ml-1 text-[0.62rem] font-bold text-forest-800/40">minutes</span>
          </div>
          <button
            type="button"
            aria-label="Increase goal by five minutes"
            onClick={() => setGoal(Math.min(180, goal + 5))}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-forest-800 transition hover:bg-forest-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <button type="button" onClick={onSave} className="btn-primary mt-4 w-full py-3.5">
          Save this gently
          <Check className="h-4 w-4" />
        </button>
      </div>
    </Modal>
  );
}
