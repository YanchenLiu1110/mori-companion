import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Crown,
  Leaf,
  LoaderCircle,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { EVENTS, track } from '../lib/analytics.js';
import { PREMIUM_PERKS, PREMIUM_PRICE_RMB } from '../lib/constants.js';
import { cn } from '../lib/utils.js';
import { CompanionArt } from './CompanionArt.jsx';
import { Modal } from './Modal.jsx';
import { Avatar } from './UI.jsx';
import { Icon } from './Icon.jsx';

export function PaywallModal() {
  const {
    paywallOpen,
    closePaywall,
    user,
    companion,
    progression,
    unlockPremium,
    celebrateLevel,
    openShare,
    showToast,
  } = useMori();
  const [step, setStep] = useState('offer');
  const timerRef = useRef(null);

  useEffect(() => {
    if (paywallOpen) setStep(user?.premium ? 'member' : 'offer');
    // Only reset the view when the modal opens; unlocking updates user.premium.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywallOpen]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleUnlock() {
    if (step === 'processing') return;
    setStep('processing');
    track(EVENTS.PREMIUM_CLICKED, {
      price_rmb: PREMIUM_PRICE_RMB,
      plan: 'monthly',
      simulated: true,
    });

    timerRef.current = setTimeout(() => {
      const result = unlockPremium();
      setStep('success');
      if (result?.levelUp) {
        window.setTimeout(() => {
          closePaywall();
          celebrateLevel({
            level: result.newLevel,
            previousLevel: result.previousLevel,
            companion,
            source: 'paywall',
          });
        }, 850);
      } else {
        showToast('MORI Plus unlocked. Every stage is yours to grow into.', {
          tone: 'premium',
        });
      }
    }, 1250);
  }

  if (!paywallOpen) return null;

  return (
    <Modal
      open={paywallOpen}
      onClose={step === 'processing' ? () => {} : closePaywall}
      panelClassName={
        step === 'offer'
          ? 'max-w-[920px] overflow-hidden'
          : 'max-w-[540px] overflow-hidden'
      }
      hideClose={step === 'success'}
    >
      {user?.premium && step !== 'success' ? (
        <MemberState
          user={user}
          companion={companion}
          progression={progression}
          onClose={closePaywall}
          onShare={() => {
            closePaywall();
            openShare('membership');
          }}
        />
      ) : step === 'success' ? (
        <SuccessState companion={companion} progression={progression} onClose={closePaywall} />
      ) : (
        <div className="grid md:grid-cols-[0.92fr_1.08fr]">
          <div className="relative hidden min-h-[620px] overflow-hidden bg-forest-950 p-8 text-cream md:flex md:flex-col">
            <div className="absolute inset-0 align-dot opacity-30" />
            <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-moss/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-butter/10 blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[0.6rem] font-black uppercase tracking-[0.16em] text-butter">
                <Crown className="h-3 w-3" />
                MORI Plus
              </span>
              <span className="text-[0.62rem] font-bold text-cream/35">Limited preview</span>
            </div>

            <div className="relative z-10 my-auto flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-moss/20 blur-3xl" />
                <CompanionArt
                  type={companion?.id}
                  companion={companion}
                  mood="joyful"
                  pose="celebrate"
                  level={9}
                  size={280}
                  glow
                  className="relative"
                />
                <span className="absolute -right-2 top-8 flex h-12 w-12 rotate-6 items-center justify-center rounded-full border border-butter/30 bg-butter text-forest-950 shadow-lg">
                  <Crown className="h-5 w-5" />
                </span>
              </div>
              <p className="font-display text-[1.8rem] font-medium leading-[1.15] text-balance">
                Some things are worth growing into.
              </p>
              <p className="mt-3 max-w-[19rem] text-[0.75rem] font-semibold leading-relaxed text-cream/45">
                Open every future stage for {companion?.name}. Your study minutes already
                planted the roots — Plus lets them keep reaching.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3">
              <Avatar
                companion={companion}
                mood="joyful"
                level={progression.level}
                size={38}
                ring={false}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[0.68rem] font-extrabold text-cream">
                  {companion?.name} is at Level {progression.level}
                </p>
                <p className="text-[0.58rem] font-semibold text-cream/40">
                  {progression.atFreeCap
                    ? 'Waiting at the free level cap'
                    : 'Ready for the next chapter'}
                </p>
              </div>
              <Lock className="h-3.5 w-3.5 text-butter/70" />
            </div>
          </div>

          <div className="p-6 pb-7 sm:p-8 md:p-9">
            <div className="mb-7 flex items-center gap-3 md:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-forest-900 text-butter">
                <Crown className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-[0.17em] text-forest-600">
                  MORI Plus
                </p>
                <p className="text-[0.68rem] font-bold text-forest-900/50">
                  For the companion who keeps growing
                </p>
              </div>
            </div>

            <p className="eyebrow">Unlock the full forest</p>
            <h2 className="mt-3 max-w-sm font-display text-[2.15rem] font-semibold leading-[1.06] tracking-[-0.035em] text-forest-950 sm:text-[2.45rem]">
              Let {companion?.name} grow beyond{' '}
              <span className="relative whitespace-nowrap italic text-forest-600">
                Level 5
                <svg
                  className="absolute -bottom-1 left-0 w-full text-moss/70"
                  viewBox="0 0 120 8"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M2 5.5C34 2 76 2 118 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h2>
            <p className="mt-4 text-[0.8rem] font-semibold leading-relaxed text-forest-900/55">
              The free plan ends at Lv.5. Plus keeps every future chapter, seasonal
              scene, and little ceremony open.
            </p>

            <div className="mt-6 flex items-end gap-2">
              <span className="font-display text-[2.8rem] font-semibold leading-none tracking-tight text-forest-950">
                ¥{PREMIUM_PRICE_RMB}
              </span>
              <span className="pb-1 text-[0.7rem] font-bold text-forest-800/45">/ month</span>
              <span className="mb-1.5 ml-auto rounded-full bg-forest-100 px-2.5 py-1 text-[0.56rem] font-black uppercase tracking-wide text-forest-700">
                Cancel anytime
              </span>
            </div>

            <div className="mt-6 grid gap-2.5">
              {PREMIUM_PERKS.map((perk) => (
                <div key={perk.title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest-100 text-forest-700">
                    <Icon name={perk.icon} className="h-3 w-3" />
                  </span>
                  <div>
                    <p className="text-[0.74rem] font-extrabold text-forest-900">{perk.title}</p>
                    <p className="text-[0.65rem] font-semibold leading-snug text-forest-800/45">
                      {perk.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleUnlock}
              disabled={step === 'processing'}
              className={cn(
                'mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-forest-900 px-5 py-4 text-[0.8rem] font-extrabold text-cream transition hover:-translate-y-0.5 hover:bg-forest-800 disabled:translate-y-0 disabled:bg-forest-800',
              )}
            >
              {step === 'processing' ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin text-moss" />
                  Planting your membership…
                </>
              ) : (
                <>
                  Start growing · ¥{PREMIUM_PRICE_RMB}/month
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.58rem] font-bold text-forest-800/35">
              <ShieldCheck className="h-3 w-3" />
              Simulated payment — no card required for this prototype
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MemberState({ user, companion, progression, onClose, onShare }) {
  return (
    <div className="relative overflow-hidden p-7 text-center sm:p-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-butter/35 to-transparent" />
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-forest-900 text-butter shadow-glow">
        <Crown className="h-8 w-8" />
        <Sparkles className="absolute -right-2 top-0 h-4 w-4 text-[#D8AA3B]" />
      </div>
      <p className="relative mt-5 eyebrow">MORI Plus member</p>
      <h2 className="relative mt-2 font-display text-[2.2rem] font-semibold tracking-tight text-forest-950">
        Growing without limits.
      </h2>
      <p className="relative mx-auto mt-3 max-w-md text-[0.8rem] font-semibold leading-relaxed text-forest-800/55">
        {companion?.name} is free to reach every stage, {user?.nickname}. Your Plus
        membership is active in this prototype.
      </p>

      <div className="relative mx-auto mt-6 grid max-w-sm grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-white/45 py-4">
        <Stat label="Level" value={progression.level} />
        <Stat label="Stage" value={progression.stage.name} small />
        <Stat label="Since" value={new Date(user?.premiumSince || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} small />
      </div>

      <div className="relative mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <button type="button" className="btn-primary" onClick={onShare}>
          Share our growth
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Back to the forest
        </button>
      </div>
    </div>
  );
}

function SuccessState({ companion, progression, onClose }) {
  return (
    <div className="relative overflow-hidden px-7 py-12 text-center sm:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(123,196,127,0.2),transparent_58%)]" />
      <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-forest-900 text-moss shadow-glow">
        <Check className="h-7 w-7" strokeWidth={2.5} />
      </div>
      <p className="eyebrow">Payment simulated</p>
      <h2 className="mt-2 font-display text-[2.2rem] font-semibold tracking-tight text-forest-950">
        Welcome to MORI Plus.
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-[0.8rem] font-semibold leading-relaxed text-forest-800/55">
        {companion?.name} can now grow through Level {progression.level}. Every future
        minute of focus has somewhere beautiful to go.
      </p>
      <button type="button" onClick={onClose} className="btn-primary relative mt-6">
        Meet the new chapter
        <ArrowRight className="h-4 w-4" />
      </button>
      <div className="relative mt-4 flex items-center justify-center gap-1.5 text-[0.58rem] font-bold text-forest-800/35">
        <Leaf className="h-3 w-3" /> No real charge was made
      </div>
    </div>
  );
}

function Stat({ label, value, small }) {
  return (
    <div className="px-2">
      <p className={cn('font-display font-semibold leading-none text-forest-950', small ? 'text-[0.9rem]' : 'text-xl')}>
        {value}
      </p>
      <p className="mt-1.5 text-[0.53rem] font-black uppercase tracking-wider text-forest-800/35">
        {label}
      </p>
    </div>
  );
}
