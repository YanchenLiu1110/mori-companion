import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  Coffee,
  Crown,
  Leaf,
  Moon,
  Share2,
  Sparkles,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { EVENTS, track, trackOnce } from '../lib/analytics.js';
import {
  formatDuration,
  formatShortDate,
  getHourBucket,
  getLastNDays,
} from '../lib/date.js';
import { buildGrowthSeries, buildReportInsights } from '../lib/insights.js';
import { focusSessions } from '../lib/progression.js';
import { cn } from '../lib/utils.js';
import { Icon } from '../components/Icon.jsx';

export function ReportPage() {
  const { user, companion, progression, sessions, openShare, openPaywall } = useMori();
  const [range, setRange] = useState('week');
  const rangeDays = range === 'week' ? 7 : 30;
  const insights = useMemo(
    () => buildReportInsights({ user, companion, sessions, rangeDays }),
    [user, companion, sessions, rangeDays],
  );
  const growth = useMemo(
    () => buildGrowthSeries(sessions, rangeDays),
    [sessions, rangeDays],
  );
  const days = getLastNDays(rangeDays);
  const daily = useMemo(
    () =>
      days.map((day) => {
        const minutes = sessions
          .filter(
            (session) =>
              session.type !== 'break' &&
              new Date(session.startTime).toDateString() === day.date.toDateString(),
          )
          .reduce((sum, session) => sum + session.duration, 0);
        return { ...day, minutes };
      }),
    [days, sessions],
  );
  const maxMinutes = Math.max(...daily.map((day) => day.minutes), 1);
  const average = insights.minutes / rangeDays;
  const averageHeight = Math.min(100, (average / maxMinutes) * 100);
  const best = daily.reduce((winner, day) => (day.minutes > winner.minutes ? day : winner), daily[0]);

  const timeBuckets = useMemo(() => {
    const start = getLastNDays(rangeDays)[0].date;
    const buckets = { morning: 0, afternoon: 0, evening: 0 };
    focusSessions(sessions)
      .filter((session) => new Date(session.startTime) >= start)
      .forEach((session) => {
        buckets[getHourBucket(new Date(session.startTime).getHours())] += session.duration;
      });
    const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
    return {
      buckets,
      total,
      dominant: Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0],
    };
  }, [sessions, rangeDays]);

  useEffect(() => {
    trackOnce(EVENTS.REPORT_VIEWED, 'report-viewed', {
      range,
      sessions: sessions.length,
      level: progression.level,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRange(next) {
    if (next === range) return;
    setRange(next);
    track(EVENTS.RANGE_CHANGED, { range: next, level: progression.level });
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <p className="eyebrow">Growth report</p>
            {progression.atFreeCap && !user?.premium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-butter/45 px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.1em] text-forest-700">
                <Crown className="h-2.5 w-2.5" />
                Level capped
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.045em] text-forest-950 sm:text-[2.65rem]">
            The shape of your <span className="italic text-forest-600">showing up</span>.
          </h1>
          <p className="mt-2 max-w-lg text-[0.8rem] font-semibold leading-relaxed text-forest-800/50">
            Not a scorecard. A gentle look at where your minutes went, and what they
            grew.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-line bg-paper/70 p-1">
            {[
              ['week', 'This week'],
              ['month', 'This month'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRange(value)}
                className={cn(
                  'rounded-full px-3.5 py-2 text-[0.63rem] font-extrabold transition',
                  range === value
                    ? 'bg-forest-900 text-cream shadow-sm'
                    : 'text-forest-800/45 hover:text-forest-900',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openShare('report')}
            className="btn-secondary px-4 py-2.5 text-[0.68rem]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[2rem] bg-forest-950 p-6 text-cream shadow-float sm:p-8">
        <div className="pointer-events-none absolute inset-0 align-dot opacity-25" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-moss/15 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-butter/10 blur-[90px]" />
        <div className="pointer-events-none absolute right-5 top-5 h-40 w-40 rounded-full border border-white/[0.05]" />

        <div className="relative grid gap-7 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[0.55rem] font-black uppercase tracking-[0.15em] text-moss">
              <Sparkles className="h-3 w-3" />
              {range === 'week' ? 'Your weekly reflection' : 'Your monthly reflection'}
            </span>
            <h2 className="mt-4 max-w-[38rem] font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-cream sm:text-[2.45rem]">
              {insights.headline}
            </h2>
            <p className="mt-3 max-w-[42rem] text-[0.78rem] font-semibold leading-relaxed text-cream/45">
              {insights.summary}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[0.58rem] font-extrabold text-cream/55">
                {insights.activeDays} active days
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[0.58rem] font-extrabold text-cream/55">
                {formatDuration(insights.minutes)} focused
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[0.58rem] font-extrabold text-cream/55">
                {insights.sessionCount} sessions
              </span>
            </div>
          </div>

          <div className="relative flex items-center gap-5 sm:flex-col sm:gap-2">
            <div className="relative h-[120px] w-[120px]">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#report-score)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - insights.focusScore / 100)}
                  className="transition-[stroke-dashoffset] duration-700"
                />
                <defs>
                  <linearGradient id="report-score" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7BC47F" />
                    <stop offset="100%" stopColor="#F4E4AE" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[2.35rem] font-semibold leading-none text-cream">
                  {insights.focusScore}
                </span>
                <span className="mt-1 text-[0.47rem] font-black uppercase tracking-[0.16em] text-cream/35">
                  focus score
                </span>
              </div>
            </div>
            <p className="max-w-[7rem] text-[0.58rem] font-semibold leading-relaxed text-cream/35">
              A soft blend of consistency and time, not a grade.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Focused time"
          value={formatDuration(insights.minutes)}
          helper={range === 'week' ? 'in the last 7 days' : 'in the last 30 days'}
          accent="forest"
        />
        <MetricCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Active days"
          value={`${insights.activeDays} / ${rangeDays}`}
          helper={`${Math.round((insights.activeDays / rangeDays) * 100)}% consistency`}
          accent="butter"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Daily average"
          value={formatDuration(Math.round(insights.minutes / Math.max(1, insights.activeDays)))}
          helper="on days you showed up"
          accent="sage"
        />
        <MetricCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Momentum"
          value={
            insights.trend === null
              ? 'New'
              : `${insights.trend >= 0 ? '+' : ''}${insights.trend}%`
          }
          helper={
            insights.trend === null
              ? 'your first comparison'
              : insights.trend >= 0
                ? 'vs. previous period'
                : 'a softer period'
          }
          accent="peach"
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Time in the forest</p>
              <h2 className="mt-1.5 font-display text-[1.5rem] font-semibold tracking-tight text-forest-950">
                {range === 'week' ? 'Your week, hour by hour.' : 'Your month, day by day.'}
              </h2>
            </div>
            <div className="text-right">
              <p className="font-display text-[1.45rem] font-semibold leading-none text-forest-950">
                {formatDuration(insights.minutes)}
              </p>
              <p className="mt-1 text-[0.54rem] font-extrabold uppercase tracking-wider text-forest-800/35">
                total focus
              </p>
            </div>
          </div>

          <div className="relative mt-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
              {[0, 1, 2, 3].map((line) => (
                <div key={line} className="border-t border-dashed border-line/70" />
              ))}
            </div>
            <div className="relative flex h-[200px] items-end gap-[3px] pb-6 sm:gap-2">
              {daily.map((day, index) => {
                const height = day.minutes ? Math.max(5, (day.minutes / maxMinutes) * 172) : 2;
                const isToday = index === daily.length - 1;
                const isBest = day.key === best.key && day.minutes > 0;
                return (
                  <div key={day.key} className="group relative flex h-full flex-1 items-end">
                    {range === 'week' && (
                      <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 text-[0.48rem] font-extrabold text-forest-800/0 transition group-hover:text-forest-800/55">
                        {day.minutes}m
                      </span>
                    )}
                    <div
                      className={cn(
                        'w-full rounded-t-[5px] transition duration-700',
                        isToday
                          ? 'bg-forest-800'
                          : isBest
                            ? 'bg-[#D8AA3B]'
                            : day.minutes
                              ? 'bg-forest-300 group-hover:bg-forest-400'
                              : 'bg-forest-900/[0.08]',
                      )}
                      style={{ height: `${height}px` }}
                      title={`${day.shortDate}: ${day.minutes} minutes`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex">
              {daily.map((day, index) => {
                const showLabel =
                  range === 'week' || index % 7 === 0 || index === daily.length - 1;
                return (
                  <div key={day.key} className="flex-1 text-center">
                    {showLabel ? (
                      <span className="text-[0.45rem] font-bold text-forest-800/30 sm:text-[0.52rem]">
                        {range === 'week' ? day.label : formatShortDate(day.date)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {average > 0 && (
              <div
                className="pointer-events-none absolute inset-x-0 flex items-center gap-2 pb-6"
                style={{ bottom: `${Math.min(176, averageHeight * 1.72)}px` }}
              >
                <span className="rounded-full bg-forest-900/5 px-1.5 py-0.5 text-[0.42rem] font-black uppercase tracking-[0.08em] text-forest-800/35">
                  avg {formatDuration(Math.round(average))}
                </span>
                <span className="h-px flex-1 border-t border-dashed border-forest-700/20" />
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3.5">
            <p className="flex items-center gap-2 text-[0.58rem] font-semibold text-forest-800/40">
              <span className="h-1.5 w-1.5 rounded-full bg-forest-300" />
              Daily focus minutes
              {best.minutes > 0 && (
                <>
                  <span className="text-forest-800/20">·</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D8AA3B]" />
                    Best day: {formatShortDate(best.date)} ({best.minutes}m)
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => openShare('report-chart')}
              className="inline-flex items-center gap-1 text-[0.58rem] font-extrabold text-forest-700 transition hover:text-forest-950"
            >
              Keep this view
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <FocusHours buckets={timeBuckets} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <GrowthChart growth={growth} progression={progression} range={range} />
        <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EADCC0] bg-gradient-to-br from-[#FBF2D9] via-[#FAF0DF] to-[#F6E7D2] p-5 shadow-card sm:p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-[#D8AA3B]/15" />
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-forest-900 text-butter">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="relative mt-4 text-[0.54rem] font-black uppercase tracking-[0.15em] text-forest-700/45">
            MORI noticed
          </p>
          <h2 className="relative mt-1.5 font-display text-[1.7rem] font-medium leading-[1.12] tracking-tight text-forest-950">
            {insights.recommendation}
          </h2>
          <p className="relative mt-3 text-[0.68rem] font-semibold leading-relaxed text-forest-900/50">
            {insights.pattern}
          </p>
          <Link
            to="/companion"
            className="relative mt-6 inline-flex items-center gap-1.5 rounded-full border border-forest-900/10 bg-white/45 px-3.5 py-2 text-[0.63rem] font-extrabold text-forest-800 transition hover:bg-white/70"
          >
            <Leaf className="h-3.5 w-3.5" />
            Talk this through with {companion?.name}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <section className="mt-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">A little guidance</p>
            <h2 className="mt-1.5 font-display text-[1.55rem] font-semibold tracking-tight text-forest-950">
              What MORI sees in the data.
            </h2>
          </div>
          <span className="rounded-full border border-line bg-paper/60 px-2.5 py-1 text-[0.5rem] font-extrabold uppercase tracking-[0.1em] text-forest-700/40">
            AI reflection · mock
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {insights.cards.map((card, index) => (
            <div
              key={card.title}
              className={cn(
                'card p-5',
                index === 0 && 'bg-gradient-to-br from-forest-50/90 to-paper',
                index === 1 && 'bg-gradient-to-br from-butter/20 to-paper',
                index === 2 && 'bg-gradient-to-br from-apricot/20 to-paper',
              )}
            >
              <div className="flex items-start justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 text-forest-700 shadow-sm">
                  <Icon name={card.icon} className="h-4 w-4" />
                </span>
                <span className="font-display text-[0.9rem] font-semibold text-forest-800/20">
                  0{index + 1}
                </span>
              </div>
              <p className="mt-4 text-[0.75rem] font-extrabold text-forest-950">{card.title}</p>
              <p className="mt-1.5 text-[0.66rem] font-semibold leading-relaxed text-forest-800/50">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {progression.atFreeCap && !user?.premium && (
        <section className="relative mt-4 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-[1.75rem] bg-forest-900 p-5 text-cream shadow-card sm:flex-row sm:items-center sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-butter/15 text-butter">
              <Crown className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[0.76rem] font-extrabold">
                {companion?.name} is waiting at Level 5.
              </p>
              <p className="mt-1 text-[0.64rem] font-semibold leading-relaxed text-cream/45">
                The data keeps growing. Only the free character stages stop here.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openPaywall('report-cap')}
            className="relative shrink-0 rounded-full bg-cream px-4 py-2.5 text-[0.66rem] font-extrabold text-forest-950 transition hover:bg-white"
          >
            Open the next chapter
          </button>
        </section>
      )}

      <footer className="mt-5 flex flex-col items-center justify-between gap-2 border-t border-line/60 pt-4 text-[0.56rem] font-bold text-forest-800/30 sm:flex-row">
        <p className="flex items-center gap-1.5">
          <Leaf className="h-3 w-3" />
          Your study data stays in this browser.
        </p>
        <p>MORI · a softer way to keep going</p>
      </footer>
    </div>
  );
}

function MetricCard({ icon, label, value, helper, accent }) {
  const accents = {
    forest: 'bg-forest-100 text-forest-700',
    butter: 'bg-butter/45 text-forest-800',
    sage: 'bg-sage/30 text-forest-700',
    peach: 'bg-peach/25 text-forest-800',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className={cn('grid h-8 w-8 place-items-center rounded-xl', accents[accent])}>
          {icon}
        </span>
        <BarChart3 className="h-3 w-3 text-forest-800/15" />
      </div>
      <p className="mt-3 text-[0.54rem] font-black uppercase tracking-[0.12em] text-forest-700/40">
        {label}
      </p>
      <p className="mt-1 font-display text-[1.35rem] font-semibold leading-none text-forest-950">
        {value}
      </p>
      <p className="mt-1.5 text-[0.56rem] font-semibold text-forest-800/35">{helper}</p>
    </div>
  );
}

function FocusHours({ buckets }) {
  const total = buckets.total || 1;
  const info = [
    { key: 'morning', label: 'Morning', icon: Sun, color: 'bg-[#E5C96C]' },
    { key: 'afternoon', label: 'Afternoon', icon: Coffee, color: 'bg-[#D99B74]' },
    { key: 'evening', label: 'Evening', icon: Moon, color: 'bg-forest-600' },
  ];
  const dominant = info.find((item) => item.key === buckets.dominant);

  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-butter/20 blur-2xl" />
      <p className="eyebrow">Your focus hours</p>
      <h2 className="mt-1.5 font-display text-[1.45rem] font-semibold tracking-tight text-forest-950">
        When the forest is awake.
      </h2>
      <p className="mt-2 text-[0.64rem] font-semibold leading-relaxed text-forest-800/45">
        {buckets.total > 0
          ? `${Math.round((buckets.buckets[buckets.dominant] / total) * 100)}% of your focus lands in the ${buckets.dominant}.`
          : 'Your time-of-day pattern will emerge after a few sessions.'}
      </p>

      <div className="mt-6 space-y-4">
        {info.map((item) => {
          const minutes = buckets.buckets[item.key] || 0;
          const percent = Math.round((minutes / total) * 100);
          return (
            <div key={item.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[0.63rem] font-extrabold text-forest-800/60">
                  <item.icon className="h-3.5 w-3.5 text-forest-600" />
                  {item.label}
                </span>
                <span className="text-[0.56rem] font-bold text-forest-800/35">
                  {minutes ? `${formatDuration(minutes)} · ${percent}%` : '—'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-forest-900/[0.05]">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', item.color)}
                  style={{ width: `${Math.max(minutes ? 4 : 0, percent)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative mt-6 rounded-2xl bg-forest-50/70 p-3.5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-paper text-forest-700 shadow-sm">
            {dominant ? <dominant.icon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </span>
          <p className="text-[0.61rem] font-semibold leading-snug text-forest-800/55">
            {buckets.total > 0
              ? `Protect a small pocket of ${buckets.dominant} quiet. That is where your focus feels most at home.`
              : 'Try a session at a different hour this week and we will find your natural rhythm.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function GrowthChart({ growth, progression, range }) {
  const days = growth.days;
  const values = days.map((day) => day.cumulativeXp);
  const min = Math.min(...values, growth.startXp);
  const max = Math.max(...values, growth.startXp + 1);
  const span = Math.max(1, max - min);
  const width = 620;
  const height = 210;
  const padX = 16;
  const padTop = 22;
  const padBottom = 26;
  const usableW = width - padX * 2;
  const usableH = height - padTop - padBottom;

  const points = days.map((day, index) => ({
    x: padX + (index / Math.max(1, days.length - 1)) * usableW,
    y: padTop + usableH - ((day.cumulativeXp - min) / span) * usableH,
    day,
  }));

  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || width - padX} ${height - padBottom} L ${padX} ${height - padBottom} Z`;
  const xpGained = values[values.length - 1] - growth.startXp;
  const startLabel = days[0]?.shortDate;
  const endLabel = days[days.length - 1]?.shortDate;

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Character growth</p>
          <h2 className="mt-1.5 font-display text-[1.5rem] font-semibold tracking-tight text-forest-950">
            Every return added a leaf.
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-forest-100 px-3 py-1.5 text-[0.58rem] font-extrabold text-forest-700">
            +{xpGained} XP {range === 'week' ? 'this week' : 'this month'}
          </span>
          <span className="rounded-full border border-line bg-paper px-2.5 py-1.5 text-[0.55rem] font-extrabold uppercase tracking-[0.1em] text-forest-700/50">
            Lv.{progression.level}
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Cumulative XP growth curve">
          <defs>
            <linearGradient id="growth-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7BC47F" stopOpacity=".3" />
              <stop offset="100%" stopColor="#7BC47F" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="growth-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#326843" />
              <stop offset="100%" stopColor="#7BC47F" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((line) => {
            const y = padTop + (line / 3) * usableH;
            return (
              <line
                key={line}
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#E7E1D4"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
            );
          })}
          <path d={areaPath} fill="url(#growth-area)" />
          <path d={linePath} fill="none" stroke="url(#growth-line)" strokeWidth="3" strokeLinecap="round" />
          {points.map((point, index) =>
            index === points.length - 1 ? (
              <g key={point.day.key}>
                <circle cx={point.x} cy={point.y} r="8" fill="#7BC47F" opacity=".18" />
                <circle cx={point.x} cy={point.y} r="4" fill="#1E3D2B" stroke="#FFF9EA" strokeWidth="2" />
              </g>
            ) : point.day.xp > 0 ? (
              <circle key={point.day.key} cx={point.x} cy={point.y} r="2" fill="#7BC47F" opacity=".65" />
            ) : null,
          )}
          <text x={padX} y={height - 7} fill="#8C9B8F" fontSize="9" fontWeight="700">
            {startLabel}
          </text>
          <text x={width - padX} y={height - 7} fill="#8C9B8F" fontSize="9" fontWeight="700" textAnchor="end">
            {endLabel}
          </text>
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3.5">
        <p className="flex items-center gap-2 text-[0.58rem] font-semibold text-forest-800/40">
          <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-forest-700 to-moss" />
          Cumulative XP · each leaf is a day you showed up
        </p>
        <span className="text-[0.56rem] font-bold text-forest-800/30">
          {progression.xp} XP total
        </span>
      </div>
    </div>
  );
}
