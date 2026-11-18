import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Leaf,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { EVENTS, track } from '../lib/analytics.js';
import { COMPANIONS, COMPANION_LIST } from '../lib/constants.js';
import { cn } from '../lib/utils.js';
import { CompanionArt } from '../components/CompanionArt.jsx';
import { Logo, SproutMark } from '../components/Logo.jsx';
import { Avatar } from '../components/UI.jsx';

export function WelcomePage() {
  const { completeOnboarding } = useMori();
  const navigate = useNavigate();
  const [step, setStep] = useState('name');
  const [nickname, setNickname] = useState('');
  const [selected, setSelected] = useState('bear');
  const [error, setError] = useState('');
  const companion = COMPANIONS[selected];

  useEffect(() => {
    track(EVENTS.ONBOARDING_STARTED, { step: 'name' });
  }, []);

  const canContinue = useMemo(() => nickname.trim().length >= 1, [nickname]);

  function handleNameSubmit(event) {
    event.preventDefault();
    if (!canContinue) {
      setError('A nickname helps your companion say hello.');
      return;
    }
    setError('');
    setStep('companion');
    track(EVENTS.ONBOARDING_STARTED, { step: 'companion' });
  }

  function handleCharacterSelect(type) {
    setSelected(type);
    track(EVENTS.CHARACTER_SELECTED, {
      character_type: type,
      character_name: COMPANIONS[type].name,
    });
  }

  function handleStart() {
    if (!nickname.trim()) {
      setStep('name');
      return;
    }
    completeOnboarding({ nickname: nickname.trim(), characterType: selected });
    navigate('/home');
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[38rem] w-[38rem] rounded-full bg-forest-200/30 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-52 -left-40 h-[36rem] w-[36rem] rounded-full bg-peach/15 blur-[100px]" />
      <div className="pointer-events-none absolute left-[45%] top-1/3 hidden h-64 w-64 rounded-full border border-forest-900/[0.05] lg:block" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
        <header className="flex items-center justify-between">
          <Logo />
          <span className="hidden items-center gap-2 rounded-full border border-line bg-paper/60 px-4 py-2 text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-forest-700/60 sm:inline-flex">
            <Sparkles className="h-3 w-3 text-forest-500" />
            A softer way to study
          </span>
        </header>

        <main className="grid flex-1 items-center gap-10 pb-4 pt-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:pb-8 lg:pt-4">
          <section className="relative z-10">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-forest-900/10 bg-paper/60 px-3.5 py-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-forest-600">
                <span className="h-1.5 w-1.5 rounded-full bg-moss" />
                AI companion · study app
              </span>
              <h1 className="mt-6 max-w-[660px] font-display text-[3.6rem] font-semibold leading-[0.92] tracking-[-0.06em] text-forest-950 sm:text-[4.6rem] lg:text-[5.2rem]">
                Don’t study alone.
                <span className="mt-1 block italic text-forest-600">
                  Grow together.
                  <svg
                    className="ml-1 inline-block w-[4.2rem] -translate-y-2 text-moss sm:w-[5.4rem]"
                    viewBox="0 0 100 30"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M3 20C30 8 66 7 97 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mt-5 max-w-[27rem] text-[0.92rem] font-semibold leading-relaxed text-forest-900/55 sm:text-[0.98rem]">
                Every focused minute becomes XP for a companion who remembers you showed
                up. Watch them grow, one small session at a time.
              </p>
            </div>

            <div className="mt-8 hidden max-w-[530px] grid-cols-3 gap-2.5 animate-fade-up [animation-delay:120ms] sm:grid">
              {[
                ['Focus', 'one honest minute'],
                ['Grow', 'a companion who blooms'],
                ['Belong', 'a softer kind of streak'],
              ].map(([title, body], index) => (
                <div key={title} className="rounded-2xl border border-line/70 bg-paper/45 p-3.5">
                  <span className="font-display text-[1.1rem] font-semibold text-forest-800">
                    0{index + 1}
                  </span>
                  <p className="mt-2 text-[0.65rem] font-extrabold text-forest-900">{title}</p>
                  <p className="mt-0.5 text-[0.57rem] font-semibold leading-snug text-forest-800/40">
                    {body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 hidden lg:block">
              <ForestStage companion={companion} compact />
            </div>
          </section>

          <section className="relative z-10 mx-auto w-full max-w-[500px] animate-fade-up [animation-delay:100ms] lg:mx-0">
            <div className="absolute -inset-3 -z-10 rounded-[2.5rem] bg-paper/35 blur-xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-paper/90 p-6 shadow-float backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-1.5 w-8 rounded-full transition-all duration-500',
                      step === 'name' ? 'bg-forest-900' : 'bg-forest-200',
                    )}
                  />
                  <span
                    className={cn(
                      'h-1.5 w-8 rounded-full transition-all duration-500',
                      step === 'companion' ? 'bg-forest-900' : 'bg-forest-200',
                    )}
                  />
                </div>
                <span className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-forest-700/40">
                  {step === 'name' ? '01 / 02' : '02 / 02'}
                </span>
              </div>

              {step === 'name' ? (
                <form onSubmit={handleNameSubmit} className="animate-fade-up">
                  <p className="eyebrow">First, a hello</p>
                  <h2 className="mt-2 font-display text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.035em] text-forest-950">
                    What should we call you?
                  </h2>
                  <p className="mt-2.5 text-[0.78rem] font-semibold leading-relaxed text-forest-800/50">
                    Your companion will use it when they check in. A nickname is perfect.
                  </p>

                  <label htmlFor="nickname" className="mt-7 block text-[0.63rem] font-black uppercase tracking-[0.15em] text-forest-700/60">
                    Your nickname
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(event) => {
                      setNickname(event.target.value);
                      if (error) setError('');
                    }}
                    maxLength={24}
                    autoFocus
                    autoComplete="nickname"
                    placeholder="e.g. Mira"
                    className="field mt-2 py-4 text-[1rem]"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'nickname-error' : undefined}
                  />
                  {error && (
                    <p id="nickname-error" className="mt-2 text-[0.66rem] font-bold text-clay">
                      {error}
                    </p>
                  )}

                  <button type="submit" className="btn-primary mt-4 w-full py-4">
                    Meet your companion
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-forest-50/75 p-3">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" />
                    <p className="text-[0.61rem] font-semibold leading-relaxed text-forest-800/50">
                      No account, no email. This prototype keeps everything in your
                      browser so you can explore freely.
                    </p>
                  </div>
                </form>
              ) : (
                <div className="animate-fade-up">
                  <button
                    type="button"
                    onClick={() => setStep('name')}
                    className="mb-4 inline-flex items-center gap-1.5 text-[0.66rem] font-extrabold text-forest-700/55 transition hover:text-forest-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <p className="eyebrow">Choose your companion</p>
                  <h2 className="mt-2 font-display text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.035em] text-forest-950">
                    Who will grow with you?
                  </h2>

                  <div className="mt-5 space-y-2" role="radiogroup" aria-label="Choose a companion">
                    {COMPANION_LIST.map((item) => {
                      const active = item.id === selected;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => handleCharacterSelect(item.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition duration-200',
                            active
                              ? 'border-forest-800 bg-forest-50 shadow-[0_8px_24px_-18px_rgba(30,61,43,0.7)]'
                              : 'border-line/80 bg-white/35 hover:border-forest-300 hover:bg-forest-50/50',
                          )}
                        >
                          <Avatar
                            companion={item}
                            mood={active ? 'joyful' : 'ready'}
                            size={46}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[0.82rem] font-extrabold text-forest-950">
                                {item.name}
                              </span>
                              <span className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-forest-700/35">
                                {item.species}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[0.64rem] font-semibold text-forest-800/45">
                              {item.tagline}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'grid h-6 w-6 shrink-0 place-items-center rounded-full border transition',
                              active
                                ? 'border-forest-900 bg-forest-900 text-moss'
                                : 'border-forest-900/15 text-transparent',
                            )}
                          >
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-forest-50/75 p-3.5">
                    <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" />
                    <p className="text-[0.67rem] font-semibold leading-relaxed text-forest-800/60">
                      <span className="font-extrabold text-forest-900">{companion.name}:</span>{' '}
                      {companion.welcome}
                    </p>
                  </div>

                  <button type="button" onClick={handleStart} className="btn-primary mt-4 w-full py-4">
                    Start my journey
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="mt-3 text-center text-[0.58rem] font-bold text-forest-800/35">
                    Focus → grow → feel a little less alone
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[0.58rem] font-bold text-forest-800/35 lg:hidden">
              <SproutMark className="h-4 w-4 text-forest-500" />
              A tiny forest, grown by showing up
            </div>
          </section>

          <div className="lg:hidden">
            <ForestStage companion={companion} />
          </div>
        </main>

        <footer className="relative z-10 mt-8 flex flex-col items-center justify-between gap-2 border-t border-line/60 pt-5 text-[0.58rem] font-bold text-forest-800/35 sm:flex-row">
          <p>A prototype for the CBPA 2027 business challenge.</p>
          <p className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-moss" />
            Focus is the seed. Connection is the forest.
          </p>
        </footer>
      </div>
    </div>
  );
}

function ForestStage({ companion, compact = false }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-white/50 bg-gradient-to-br from-forest-200/80 via-forest-50/70 to-apricot/30',
        compact ? 'h-[235px]' : 'h-[300px]',
      )}
    >
      <div className="absolute inset-0 align-dot opacity-40" />
      <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/40 blur-2xl" />
      <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-forest-300/20 blur-2xl" />

      <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/60 bg-paper/60 px-3 py-1.5 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-forest-500" />
        <span className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-forest-700/60">
          Your little corner of the forest
        </span>
      </div>

      <div className="absolute bottom-4 left-1/2 h-[74%] w-[72%] -translate-x-1/2">
        <div className="absolute inset-x-0 bottom-0 h-[72%] rounded-t-full border border-white/40 bg-forest-900/90 shadow-float" />
        <div className="absolute inset-x-6 bottom-4 h-[55%] rounded-t-full border border-white/10 bg-forest-800/60" />
        <div className="absolute bottom-0 left-1/2 h-[23%] w-[85%] -translate-x-1/2 rounded-[50%] bg-forest-700/40 blur-[2px]" />
        <div className="absolute inset-x-0 bottom-[7%] flex justify-center">
          <CompanionArt
            type={companion.id}
            companion={companion}
            mood="joyful"
            pose="idle"
            level={4}
            size={compact ? 190 : 235}
            glow
            className="drop-shadow-[0_16px_25px_rgba(11,27,18,0.25)]"
          />
        </div>
        <div className="absolute bottom-[48%] left-[-2%] hidden w-[140px] sm:block">
          <div className="rounded-2xl rounded-bl-md border border-white/50 bg-paper/90 px-3.5 py-2.5 shadow-soft backdrop-blur">
            <p className="text-[0.6rem] font-semibold leading-snug text-forest-900/70">
              “{companion.tagline}”
            </p>
            <p className="mt-1 text-[0.5rem] font-black uppercase tracking-[0.15em] text-forest-600">
              {companion.name}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-5 flex gap-1.5">
        {['🌱', '✦', '🍃'].map((symbol, index) => (
          <span
            key={index}
            className="grid h-6 w-6 place-items-center rounded-full border border-white/40 bg-white/30 text-[0.55rem] backdrop-blur"
          >
            {symbol}
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute left-[12%] top-[38%] h-1.5 w-1.5 animate-drift rounded-full bg-butter" />
      <div className="pointer-events-none absolute right-[18%] top-[31%] h-1 w-1 animate-drift rounded-full bg-white [animation-delay:1.5s]" />
    </div>
  );
}
