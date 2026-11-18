import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/utils.js';

export function Modal({
  open,
  onClose,
  children,
  className,
  panelClassName,
  labelledBy,
  hideClose = false,
  closeTone = 'light',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-end justify-center bg-forest-950/45 p-0 backdrop-blur-[6px] sm:items-center sm:p-6',
        className,
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : 'MORI dialog'}
        className={cn(
          'relative max-h-[92dvh] w-full animate-pop-in overflow-y-auto overscroll-contain rounded-t-[2rem] bg-paper shadow-float sm:max-h-[90dvh] sm:rounded-[2rem]',
          panelClassName,
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className={cn(
              'absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full transition',
              closeTone === 'dark'
                ? 'bg-white/10 text-cream hover:bg-white/20'
                : 'bg-forest-900/[0.055] text-forest-800 hover:bg-forest-900/10',
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
