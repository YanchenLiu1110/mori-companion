import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Crown, Sparkles, Star } from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { getStage } from '../lib/constants.js';
import { CompanionArt } from './CompanionArt.jsx';
import { Confetti } from './UI.jsx';

export function LevelUpOverlay() {
  const { celebration, clearCelebration, user, openShare } = useMori();

  useEffect(() => {
    if (!celebration) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') clearCelebration();
    };
    window.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [celebration, clearCelebration]);

  if (!celebration) return null;
  const stage = getStage(celebration.level);
  const jumped = celebration.level - celebration.previousLevel > 1;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center overflow-hidden bg-forest-950/95 p-5 backdrop-blur-xl">
      <div className="absolute inset-0 align-dot opacity-30" />
      <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-moss/15 blur-[100px]" />
      <Confetti pieces={34} />

      <div className="relative z-10 w-full max-w-[450px] animate-pop-in text-center text-cream">
        <div className="mb-2 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-butter/25 bg-butter/10 px-3.5 py-1.5 text-[0.6rem] font-black uppercase tracking-[0.18em] text-butter">
            <Sparkles className="h-3 w-3" />
            New chapter unlocked
          </span>
        </div>

        <div className="relative mx-auto mt-2 w-[280px] max-w-full">
          <div className="absolute inset-x-6 bottom-5 h-24 rounded-full bg-moss/20 blur-2xl" />
          <CompanionArt
            type={celebration.companion?.id}
            companion={celebration.companion}
            mood="joyful"
            pose="celebrate"
            level={celebration.level}
            size={290}
            glow
            className="relative drop-shadow-[0_20px_35px_rgba(0,0,0,0.25)]"
          />
          <span className="absolute left-1/2 top-3 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-butter/30 bg-butter text-forest-950 shadow-xl">
            <Crown className="h-5 w-5" />
          </span>
        </div>

        <p className="mt-2 font-display text-[0.9rem] font-medium italic text-cream/55">
          {jumped ? 'The gates opened all at once.' : 'A little more room to grow.'}
        </p>
        <h2 className="mt-2 font-display text-[3.3rem] font-semibold leading-none tracking-[-0.05em] text-cream sm:text-[3.8rem]">
          Level {celebration.level}
        </h2>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[0.7rem] font-extrabold text-cream/80">
          <Star className="h-3.5 w-3.5 text-butter" />
          {stage.name}
        </p>
        <p className="mx-auto mt-4 max-w-sm text-[0.8rem] font-semibold leading-relaxed text-cream/45">
          {celebration.companion?.name} grew because you showed up. {user?.nickname},
          every minute you spent became a leaf in this crown.
        </p>

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => {
              clearCelebration();
              openShare('level-up');
            }}
            className="btn-moss px-6"
          >
            Share this moment
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={clearCelebration}
            className="btn rounded-full border border-white/15 px-6 py-3.5 text-cream/75 transition hover:bg-white/10"
          >
            Keep growing
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
