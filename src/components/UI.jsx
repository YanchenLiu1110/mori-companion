import { Leaf, X } from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { cn } from '../lib/utils.js';
import { CompanionArt } from './CompanionArt.jsx';

export function Avatar({
  companion,
  mood = 'ready',
  level = 1,
  size = 44,
  className,
  showLevel = false,
  ring = true,
}) {
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-full',
          ring && 'border border-forest-900/10 bg-gradient-to-br from-forest-100 via-paper to-apricot/60',
        )}
      >
        <CompanionArt
          type={companion?.id}
          companion={companion}
          mood={mood}
          level={level}
          size={size}
          faceOnly
          animated={false}
          className="translate-y-[2%] scale-[1.13]"
        />
      </span>
      {showLevel && (
        <span className="absolute -bottom-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border border-paper bg-forest-900 px-1 text-[8px] font-black text-cream shadow-sm">
          {level}
        </span>
      )}
    </span>
  );
}

const MOOD_STYLES = {
  ready: { dot: 'bg-moss', text: 'text-forest-800', bg: 'bg-forest-100/80' },
  focused: { dot: 'bg-forest-500', text: 'text-forest-800', bg: 'bg-forest-100/80' },
  joyful: { dot: 'bg-[#D8AA3B]', text: 'text-forest-900', bg: 'bg-butter/50' },
  sleepy: { dot: 'bg-[#C99062]', text: 'text-forest-900', bg: 'bg-apricot/40' },
  missing: { dot: 'bg-peach', text: 'text-forest-900', bg: 'bg-peach/25' },
};

export function MoodPill({ mood, light = false, className }) {
  const style = MOOD_STYLES[mood?.key || 'ready'] || MOOD_STYLES.ready;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.68rem] font-extrabold',
        light ? 'bg-white/10 text-cream/90' : `${style.bg} ${style.text}`,
        className,
      )}
    >
      <span className={cn('relative flex h-1.5 w-1.5 rounded-full', style.dot)}>
        <span className={cn('absolute inset-0 animate-ping rounded-full opacity-50', style.dot)} />
      </span>
      {mood?.label || 'Ready when you are'}
    </span>
  );
}

export function XPBar({ progression, light = false, showLabels = true, className }) {
  const percent = Math.round((progression?.progress || 0) * 100);
  return (
    <div className={className}>
      {showLabels && (
        <div
          className={cn(
            'mb-2 flex items-center justify-between text-[0.66rem] font-bold',
            light ? 'text-cream/55' : 'text-forest-700/60',
          )}
        >
          <span>
            {progression?.atFreeCap
              ? 'Free level cap'
              : progression?.maxedOut
                ? 'Fully grown'
                : `${Math.round(progression?.xpIntoLevel || 0)} / ${Math.round(progression?.xpForNext || 0)} XP`}
          </span>
          <span>{percent}%</span>
        </div>
      )}
      <div
        className={cn(
          'relative h-2.5 overflow-hidden rounded-full',
          light ? 'bg-white/[0.12]' : 'bg-forest-900/[0.08]',
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Companion XP progress"
      >
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out',
            light
              ? 'bg-gradient-to-r from-moss to-[#B8D996]'
              : 'bg-gradient-to-r from-forest-600 to-moss',
            progression?.atFreeCap && 'animate-[shimmer_3s_linear_infinite] bg-[length:200%_100%]',
          )}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  );
}

export function Confetti({ pieces = 22, className }) {
  const colors = ['#7BC47F', '#F4E4AE', '#F2B998', '#B7CDB6', '#FFF9EA', '#D8AA3B'];
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      {Array.from({ length: pieces }).map((_, index) => {
        const left = (index * 47) % 100;
        const delay = (index % 8) * 0.15;
        const duration = 2.2 + (index % 5) * 0.35;
        const size = 5 + (index % 4) * 2;
        return (
          <span
            key={index}
            className="absolute top-0 block rounded-[2px]"
            style={{
              left: `${left}%`,
              width: size,
              height: index % 3 === 0 ? size * 2.1 : size,
              backgroundColor: colors[index % colors.length],
              animation: `confetti ${duration}s ${delay}s ease-in forwards`,
              transform: `rotate(${index * 32}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

export function ToastHost() {
  const { toast, dismissToast } = useMori();
  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.8rem] z-[120] flex justify-center px-4 sm:bottom-7">
      <div
        role="status"
        className={cn(
          'pointer-events-auto flex max-w-md animate-fade-up items-center gap-3 rounded-2xl border px-4 py-3 shadow-float backdrop-blur-xl',
          toast.tone === 'premium'
            ? 'border-butter/30 bg-forest-900 text-cream'
            : 'border-white/10 bg-forest-950/95 text-cream',
        )}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-moss">
          <Leaf className="h-3.5 w-3.5" />
        </span>
        <p className="text-[0.78rem] font-bold leading-snug">{toast.message}</p>
        {toast.actionLabel && (
          <button
            type="button"
            className="ml-1 shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[0.7rem] font-extrabold text-butter transition hover:bg-white/20"
            onClick={() => {
              toast.onAction?.();
              dismissToast();
            }}
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          type="button"
          aria-label="Dismiss notification"
          className="ml-0.5 shrink-0 text-cream/45 transition hover:text-cream"
          onClick={dismissToast}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
