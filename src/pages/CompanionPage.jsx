import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Crown,
  Heart,
  Lock,
  Send,
  Share2,
  Sparkles,
} from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { EVENTS, track, trackOnce } from '../lib/analytics.js';
import { generateCompanionReply } from '../lib/companionAI.js';
import { formatDuration, formatLongDate, formatShortDate } from '../lib/date.js';
import { buildMilestoneStats, buildTimeline } from '../lib/progression.js';
import { cn } from '../lib/utils.js';
import { Avatar, Confetti, MoodPill, XPBar } from '../components/UI.jsx';
import { CompanionArt } from '../components/CompanionArt.jsx';
import { Icon } from '../components/Icon.jsx';

export function CompanionPage() {
  const {
    user,
    companion,
    progression,
    derived,
    sessions,
    chat,
    appendChat,
    openShare,
    openPaywall,
  } = useMori();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const sendingRef = useRef(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const timeline = useMemo(
    () => buildTimeline({ user, sessions, premium: Boolean(user?.premium) }),
    [user, sessions],
  );
  const milestoneStats = useMemo(() => buildMilestoneStats(user, sessions), [user, sessions]);
  const suggestions = useMemo(
    () => [
      'I feel stuck today',
      `Cheer me on, ${companion?.name}`,
      'How is our streak going?',
      'Tell me about yourself',
    ],
    [companion?.name],
  );

  useEffect(() => {
    trackOnce(EVENTS.CHAT_OPENED, 'chat-opened', {
      messages: chat.length,
      level: progression.level,
    });
  }, [chat.length, progression.level]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [chat.length, typing]);

  async function sendMessage(raw) {
    const message = (raw ?? input).trim();
    if (!message || sendingRef.current) return;
    sendingRef.current = true;
    setInput('');
    appendChat({ role: 'user', text: message });
    track(EVENTS.CHAT_MESSAGE_SENT, {
      characters: message.length,
      level: progression.level,
      minutes_today: derived?.minutesToday || 0,
    });
    setTyping(true);

    try {
      const reply = await generateCompanionReply(message, {
        nickname: user?.nickname,
        companionName: companion?.name,
        level: progression.level,
        streak: derived?.streak,
        minutesToday: derived?.minutesToday,
        dailyGoal: user?.dailyGoal,
        totalMinutes: derived?.totalMinutes,
        daysSinceLastStudy: derived?.daysSinceLastStudy,
        mood: derived?.mood?.key,
      });
      appendChat({
        role: 'assistant',
        text: reply,
        meta: `${companion?.name} · here with you`,
      });
      track(EVENTS.COMPANION_REPLIED, {
        reply_length: reply.length,
        level: progression.level,
      });
      if (/proud|bloom|grew|growth|root|garden|forest/i.test(reply)) {
        setCelebrating(true);
        window.setTimeout(() => setCelebrating(false), 1800);
      }
    } finally {
      setTyping(false);
      sendingRef.current = false;
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <p className="eyebrow">Companion</p>
            <span className="h-1 w-1 rounded-full bg-forest-300" />
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.13em] text-forest-700/35">
              {milestoneStats.daysTogether} {milestoneStats.daysTogether === 1 ? 'day' : 'days'} together
            </p>
          </div>
          <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.045em] text-forest-950 sm:text-[2.65rem]">
            A little life, <span className="italic text-forest-600">growing</span> with you.
          </h1>
          <p className="mt-2 max-w-lg text-[0.8rem] font-semibold leading-relaxed text-forest-800/50">
            {companion?.name} remembers the quietest pages and the days you chose to
            come back. This is where that story lives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openShare('companion-header')}
            className="btn-secondary px-4 py-2.5 text-[0.7rem]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share card
          </button>
          <Link to="/report" className="btn-primary px-4 py-2.5 text-[0.7rem]">
            Growth report
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[0.83fr_1.17fr]">
        <ProfileCard
          user={user}
          companion={companion}
          progression={progression}
          mood={derived?.mood}
          derived={derived}
          stats={milestoneStats}
          onShare={() => openShare('companion-profile')}
          onPaywall={() => openPaywall('companion-profile')}
        />
        <ChatCard
          user={user}
          companion={companion}
          chat={chat}
          typing={typing}
          input={input}
          setInput={setInput}
          inputRef={inputRef}
          scrollRef={scrollRef}
          suggestions={suggestions}
          onSuggest={sendMessage}
          onSubmit={handleSubmit}
          celebrating={celebrating}
          progression={progression}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">The story so far</p>
              <h2 className="mt-1.5 font-display text-[1.5rem] font-semibold tracking-tight text-forest-950">
                How you’ve grown.
              </h2>
            </div>
            <span className="chip">
              <Sparkles className="h-3 w-3" />
              {derived?.xp || 0} XP
            </span>
          </div>
          <Timeline entries={timeline} />
        </div>

        <div className="space-y-4">
          <div className="card p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Little abilities</p>
                <h2 className="mt-1.5 font-display text-[1.5rem] font-semibold tracking-tight text-forest-950">
                  What {companion?.name} can do.
                </h2>
              </div>
              <span className="text-[0.56rem] font-extrabold uppercase tracking-wider text-forest-800/35">
                {derived?.skills?.filter((skill) => skill.unlocked).length || 0} /{' '}
                {derived?.skills?.length || 0}
              </span>
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {derived?.skills?.map((skill) => (
                <SkillCard key={skill.id} skill={skill} premium={Boolean(user?.premium)} />
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.75rem] bg-forest-900 p-5 text-cream shadow-card sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border border-white/10" />
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-butter">
                <Heart className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.73rem] font-extrabold">The bond is the product.</p>
                <p className="mt-1.5 text-[0.65rem] font-semibold leading-relaxed text-cream/45">
                  MORI does not measure worth in streak length. The only metric that
                  matters is whether you feel a little less alone when you study.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3.5">
              <p className="text-[0.56rem] font-bold text-cream/30">
                {formatLongDate()}
              </p>
              <button
                type="button"
                onClick={() => openShare('companion-note')}
                className="text-[0.6rem] font-extrabold text-moss transition hover:text-cream"
              >
                Make a memory card
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileCard({ user, companion, progression, mood, derived, stats, onShare, onPaywall }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-forest-950 p-6 text-cream shadow-float">
      <div className="pointer-events-none absolute inset-0 align-dot opacity-25" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-moss/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-peach/10 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <MoodPill mood={mood} light />
        <button
          type="button"
          onClick={onShare}
          aria-label="Share growth card"
          className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-cream/45 transition hover:bg-white/10 hover:text-cream"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative mt-1 flex justify-center">
        <div className="absolute top-8 h-48 w-48 rounded-full border border-white/[0.06]" />
        <div className="absolute top-2 h-60 w-60 rounded-full border border-white/[0.035]" />
        <div className="absolute bottom-5 h-20 w-40 rounded-full bg-moss/10 blur-2xl" />
        <span className="absolute right-0 top-4 z-10 rounded-full border border-white/10 bg-forest-900/70 px-2.5 py-1 text-[0.52rem] font-black uppercase tracking-[0.14em] text-cream/50 backdrop-blur">
          {progression.stage.name}
        </span>
        <CompanionArt
          type={companion?.id}
          companion={companion}
          mood={mood?.key}
          pose={mood?.key === 'sleepy' ? 'sleep' : mood?.key === 'joyful' ? 'celebrate' : 'idle'}
          level={progression.level}
          size={292}
          glow
          className="relative drop-shadow-[0_22px_35px_rgba(0,0,0,0.35)]"
        />
      </div>

      <div className="relative -mt-1 text-center">
        <h2 className="font-display text-[2.05rem] font-semibold leading-none tracking-[-0.04em] text-cream">
          {companion?.name}
        </h2>
        <p className="mt-1.5 text-[0.57rem] font-black uppercase tracking-[0.18em] text-moss/70">
          {companion?.species} · Level {progression.level}
        </p>
        <p className="mx-auto mt-3 max-w-[17rem] font-display text-[0.83rem] font-medium italic leading-snug text-cream/50">
          “{companion?.quote}”
        </p>
      </div>

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[0.56rem] font-bold text-cream/40">
            {progression.xpIntoLevel} / {progression.xpForNext} XP this level
          </span>
          <span className="text-[0.53rem] font-extrabold text-cream/30">
            {progression.xp} total
          </span>
        </div>
        <XPBar progression={progression} light showLabels={false} />
      </div>

      <div className="relative mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.035] py-3">
        <ProfileStat value={derived?.streak || 0} label="day streak" />
        <ProfileStat value={formatDuration(stats.totalMinutes)} label="focused" />
        <ProfileStat value={stats.totalSessions} label="sessions" />
      </div>

      <div className="relative mt-4 flex gap-2">
        <button type="button" onClick={onShare} className="btn flex-1 bg-cream py-3 text-[0.68rem] font-extrabold text-forest-950 transition hover:-translate-y-0.5 hover:bg-white">
          <Share2 className="h-3.5 w-3.5" />
          Share us
        </button>
        <button
          type="button"
          onClick={onPaywall}
          className="btn flex-1 border border-white/15 bg-white/[0.05] py-3 text-[0.68rem] font-extrabold text-cream/75 transition hover:bg-white/10"
        >
          {user?.premium ? <Crown className="h-3.5 w-3.5 text-butter" /> : <Lock className="h-3.5 w-3.5 text-butter" />}
          {user?.premium ? 'MORI Plus' : progression.atFreeCap ? 'Unlock next stage' : 'MORI Plus'}
        </button>
      </div>

      {progression.atFreeCap && !user?.premium && (
        <p className="relative mt-3 text-center text-[0.56rem] font-bold text-butter/60">
          Free growth stops at Level 5. {companion?.name} is waiting at the gate.
        </p>
      )}
    </div>
  );
}

function ProfileStat({ value, label }) {
  return (
    <div className="text-center">
      <p className="font-display text-[1.08rem] font-semibold leading-none text-cream">{value}</p>
      <p className="mt-1 text-[0.46rem] font-black uppercase tracking-[0.13em] text-cream/30">{label}</p>
    </div>
  );
}

function ChatCard({
  user,
  companion,
  chat,
  typing,
  input,
  setInput,
  inputRef,
  scrollRef,
  suggestions,
  onSuggest,
  onSubmit,
  celebrating,
  progression,
}) {
  return (
    <div className="card flex h-full min-h-[590px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line/70 px-4 py-3.5 sm:px-5">
        <Avatar companion={companion} mood="joyful" level={progression.level} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[0.76rem] font-extrabold text-forest-950">{companion?.name}</p>
            <span className="rounded-full bg-forest-100 px-1.5 py-0.5 text-[0.45rem] font-black uppercase tracking-[0.12em] text-forest-700">
              AI
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-[0.56rem] font-semibold text-forest-800/40">
            <span className="h-1.5 w-1.5 rounded-full bg-moss" />
            here with you · replies in a moment
          </p>
        </div>
        <span className="hidden rounded-full border border-line bg-white/45 px-2.5 py-1 text-[0.5rem] font-extrabold uppercase tracking-[0.1em] text-forest-700/40 sm:block">
          mock · LLM-ready
        </span>
      </div>

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(183,205,182,0.16),transparent_35%)]" />
        {celebrating && <Confetti pieces={12} />}
        <div className="relative space-y-3.5">
          {chat.map((message) => (
            <ChatBubble key={message.id} message={message} companion={companion} />
          ))}
          {typing && <TypingBubble companion={companion} />}
          {chat.length <= 1 && !typing && (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-forest-50 text-forest-500">
                <Icon name="Sprout" className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-[1.15rem] font-medium italic text-forest-950/60">
                No perfect words needed.
              </p>
              <p className="mt-1.5 max-w-[19rem] text-[0.65rem] font-semibold leading-relaxed text-forest-800/35">
                Tell {companion?.name} about your day, ask for a nudge, or just say hi.
                They are not going anywhere.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-line/70 bg-white/30 px-4 pb-4 pt-3 sm:px-5">
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-0.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggest(suggestion)}
              disabled={typing}
              className="shrink-0 rounded-full border border-line bg-paper/80 px-3 py-1.5 text-[0.58rem] font-extrabold text-forest-700/70 transition hover:border-forest-300 hover:text-forest-950 disabled:opacity-40"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={240}
            placeholder={`Say something to ${user ? companion?.name : 'your companion'}…`}
            aria-label={`Message ${companion?.name}`}
            className="field min-w-0 flex-1 border-line/80 bg-paper/70 px-4 py-3 text-[0.78rem]"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            aria-label="Send message"
            className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-forest-900 text-moss transition hover:-translate-y-0.5 hover:bg-forest-800 disabled:translate-y-0 disabled:opacity-35"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-center text-[0.52rem] font-bold text-forest-800/25">
          Mock companion replies · ready for a real LLM in production
        </p>
      </div>
    </div>
  );
}

function ChatBubble({ message, companion }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar companion={companion} mood="joyful" size={26} ring={false} className="mb-0.5" />
      )}
      <div className={cn('max-w-[82%] sm:max-w-[78%]', isUser && 'text-right')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-left text-[0.72rem] font-semibold leading-relaxed whitespace-pre-line',
            isUser
              ? 'rounded-br-md bg-forest-900 text-cream'
              : 'rounded-bl-md border border-line/80 bg-paper text-forest-900/80 shadow-sm',
          )}
        >
          {message.text}
        </div>
        <p className={cn('mt-1 text-[0.48rem] font-bold text-forest-800/25', isUser && 'pr-1')}>
          {isUser ? 'You' : message.meta || companion?.name}
        </p>
      </div>
    </div>
  );
}

function TypingBubble({ companion }) {
  return (
    <div className="flex items-end gap-2">
      <Avatar companion={companion} mood="ready" size={26} ring={false} className="mb-0.5" />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line/80 bg-paper px-4 py-3 shadow-sm">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-400"
            style={{ animationDelay: `${index * 0.12}s`, animationDuration: '0.9s' }}
          />
        ))}
      </div>
    </div>
  );
}

function Timeline({ entries }) {
  return (
    <div className="relative mt-5">
      <div className="absolute bottom-3 left-[17px] top-2 w-px bg-line" />
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div key={entry.id} className={cn('relative flex gap-3.5', !entry.achieved && 'opacity-55')}>
            <span
              className={cn(
                'relative z-10 mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border',
                entry.achieved
                  ? 'border-forest-200 bg-forest-100 text-forest-700'
                  : 'border-dashed border-line bg-paper text-forest-700/40',
              )}
            >
              <Icon name={entry.icon} className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <p className="text-[0.72rem] font-extrabold text-forest-950">{entry.title}</p>
                <span className="text-[0.52rem] font-bold text-forest-800/30">
                  {entry.date ? formatShortDate(entry.date) : 'Still to come'}
                </span>
              </div>
              <p className="mt-0.5 text-[0.63rem] font-semibold leading-relaxed text-forest-800/45">
                {entry.description}
              </p>
              {index === 0 && entry.achieved && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[0.48rem] font-extrabold uppercase tracking-[0.1em] text-forest-600">
                  <Check className="h-2.5 w-2.5" /> Most recent
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillCard({ skill, premium }) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border p-3.5 transition',
        skill.unlocked
          ? 'border-line/80 bg-white/40'
          : 'border-dashed border-line bg-forest-900/[0.015]',
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            'grid h-8 w-8 place-items-center rounded-xl',
            skill.unlocked ? 'bg-forest-100 text-forest-700' : 'bg-forest-900/[0.04] text-forest-800/30',
          )}
        >
          {skill.unlocked ? <Icon name={skill.icon} className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
        </span>
        {skill.unlocked ? (
          <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[0.45rem] font-black uppercase tracking-[0.1em] text-forest-600">
            Unlocked
          </span>
        ) : skill.premium && !premium ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-butter/40 px-2 py-0.5 text-[0.45rem] font-black uppercase tracking-[0.1em] text-forest-700">
            <Crown className="h-2.5 w-2.5" />
            Plus
          </span>
        ) : (
          <span className="rounded-full bg-forest-900/[0.04] px-2 py-0.5 text-[0.45rem] font-black uppercase tracking-[0.1em] text-forest-800/35">
            Lv.{skill.level}
          </span>
        )}
      </div>
      <p className={cn('mt-2.5 text-[0.67rem] font-extrabold', skill.unlocked ? 'text-forest-950' : 'text-forest-800/55')}>
        {skill.name}
      </p>
      <p className="mt-0.5 text-[0.56rem] font-semibold leading-snug text-forest-800/40">
        {skill.description}
      </p>
    </div>
  );
}
