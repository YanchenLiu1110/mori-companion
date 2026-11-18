import { Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils.js';

export function Logo({ light = false, compact = false, className, asLink = false }) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded-[0.8rem] shadow-sm',
          light ? 'bg-cream/10 text-cream' : 'bg-forest-900 text-moss',
        )}
      >
        <Leaf className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.4} />
        <span
          className={cn(
            'absolute right-1.5 top-1.5 h-1 w-1 rounded-full',
            light ? 'bg-moss' : 'bg-butter',
          )}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[1.35rem] font-semibold tracking-[0.08em]',
            light ? 'text-cream' : 'text-forest-950',
          )}
        >
          MORI
        </span>
        {!compact && (
          <span
            className={cn(
              'mt-1 text-[0.55rem] font-extrabold uppercase tracking-[0.24em]',
              light ? 'text-forest-200/70' : 'text-forest-700/55',
            )}
          >
            Grow together
          </span>
        )}
      </span>
    </span>
  );

  if (asLink) {
    return (
      <Link to="/home" aria-label="MORI home">
        {content}
      </Link>
    );
  }

  return content;
}

export function SproutMark({ className }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 40V21"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M24 27c-8 0-13-5-14-13 8 0 13 5 14 13Z"
        fill="currentColor"
        opacity=".65"
      />
      <path
        d="M24 21c8 0 13-5 14-13-8 0-13 5-14 13Z"
        fill="currentColor"
      />
    </svg>
  );
}
