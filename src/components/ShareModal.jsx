import { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Check, Copy, Download, LoaderCircle, Share2, Sparkles } from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { EVENTS, track } from '../lib/analytics.js';
import { formatDuration } from '../lib/date.js';
import { focusSessions } from '../lib/progression.js';
import { Modal } from './Modal.jsx';
import { CompanionArt } from './CompanionArt.jsx';
import { Logo } from './Logo.jsx';
import { cn } from '../lib/utils.js';

export function ShareModal() {
  const {
    shareOpen,
    closeShare,
    user,
    companion,
    progression,
    derived,
    sessions,
    showToast,
  } = useMori();
  const cardRef = useRef(null);
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const focus = focusSessions(sessions);
    return {
      totalMinutes: focus.reduce((sum, session) => sum + session.duration, 0),
      sessions: focus.length,
      bestStreak: derived?.streak || 0,
    };
  }, [sessions, derived?.streak]);

  const caption = `I've grown ${formatDuration(stats.totalMinutes)} with ${companion?.name} in MORI. Level ${progression.level} · ${progression.stage.name}. Small steps, big roots. 🌱 #MORI #GrowTogether`;

  if (!shareOpen) return null;

  async function buildImage() {
    if (!cardRef.current) throw new Error('Share card is not ready');
    return toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: '#F7F4EB',
      style: { transform: 'none' },
    });
  }

  function triggerDownload(dataUrl) {
    const link = document.createElement('a');
    const safeName = (user?.nickname || 'mori').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `mori-${safeName}-level-${progression.level}.png`;
    link.href = dataUrl;
    link.click();
  }

  async function handleDownload() {
    if (busy) return;
    setBusy('download');
    try {
      const dataUrl = await buildImage();
      triggerDownload(dataUrl);
      track(EVENTS.SHARE_DOWNLOADED, {
        level: progression.level,
        total_minutes: stats.totalMinutes,
        format: 'png',
      });
      showToast('Share card saved to your downloads.', { tone: 'premium' });
    } catch (error) {
      console.error(error);
      showToast('The card could not be generated. Please try again.');
    } finally {
      setBusy('');
    }
  }

  async function handleCopyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      showToast('Caption copied to your clipboard.');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      showToast('Copy is unavailable in this browser.');
    }
  }

  async function handleShare() {
    if (busy) return;
    setBusy('share');
    track(EVENTS.SHARE_CLICKED, {
      level: progression.level,
      destination: 'native-or-download',
    });

    try {
      const dataUrl = await buildImage();
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'mori-growth-card.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My MORI growth card',
          text: caption,
        });
        showToast('Shared from your forest.', { tone: 'premium' });
      } else {
        triggerDownload(dataUrl);
        try {
          await navigator.clipboard.writeText(caption);
        } catch {
          // Download still succeeds without clipboard access.
        }
        showToast('Card downloaded and caption copied — ready to post.', {
          tone: 'premium',
        });
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        showToast('Sharing is unavailable here — try Download instead.');
      }
    } finally {
      setBusy('');
    }
  }

  return (
    <Modal
      open={shareOpen}
      onClose={closeShare}
      panelClassName="max-w-[900px]"
      labelledBy="share-card-title"
    >
      <div className="grid md:grid-cols-[1fr_0.92fr]">
        <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-forest-950 p-6 sm:p-8">
          <div className="absolute inset-0 align-dot opacity-25" />
          <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-moss/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-0 h-60 w-60 rounded-full bg-peach/10 blur-3xl" />
          <div className="relative w-full max-w-[370px]">
            <div ref={cardRef} className="w-full">
              <GrowthCard
                user={user}
                companion={companion}
                progression={progression}
                stats={stats}
              />
            </div>
          </div>
        </div>

        <div className="p-6 pb-8 sm:p-8 md:flex md:flex-col md:justify-center">
          <p className="eyebrow">Share the growth</p>
          <h2
            id="share-card-title"
            className="mt-2 font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-forest-950"
          >
            A little proof of showing up.
          </h2>
          <p className="mt-3 text-[0.78rem] font-semibold leading-relaxed text-forest-800/55">
            Every minute becomes a leaf. Download a card for your feed, or share it
            straight from your forest.
          </p>

          <div className="mt-5 rounded-2xl border border-line/90 bg-white/45 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.56rem] font-black uppercase tracking-[0.16em] text-forest-700/45">
                Suggested caption
              </span>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="inline-flex items-center gap-1 text-[0.6rem] font-extrabold text-forest-700 transition hover:text-forest-950"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[0.67rem] font-semibold leading-relaxed text-forest-900/65">
              {caption}
            </p>
          </div>

          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={handleShare}
              disabled={Boolean(busy)}
              className="btn-primary w-full py-3.5"
            >
              {busy === 'share' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Share growth card
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={Boolean(busy)}
              className="btn-secondary w-full py-3.5"
            >
              {busy === 'download' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download image
            </button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[0.56rem] font-bold text-forest-800/35 md:justify-start">
            <Sparkles className="h-3 w-3" />
            Generated locally. Nothing leaves your browser.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function GrowthCard({ user, companion, progression, stats }) {
  return (
    <div
      className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.7rem] border border-white/30 bg-[#F9F5E9] text-forest-950 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.65)]"
      aria-label="MORI growth share card"
    >
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#DDEBD5]" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#F6DCC3]/70" />
      <div className="pointer-events-none absolute right-4 top-28 h-24 w-24 rounded-full border border-forest-900/[0.06]" />
      <svg
        className="pointer-events-none absolute bottom-8 right-3 w-24 text-forest-500/25"
        viewBox="0 0 100 120"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M81 104C51 84 42 51 59 15c20 20 31 51 22 89Z" />
        <path d="M73 74C56 61 52 44 58 24c14 11 22 29 15 50Z" opacity=".6" />
      </svg>

      <div className="relative flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <Logo compact />
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[0.48rem] font-black uppercase tracking-[0.14em]',
              user?.premium
                ? 'bg-forest-900 text-butter'
                : 'border border-forest-900/10 bg-white/50 text-forest-700',
            )}
          >
            {user?.premium ? 'Plus member' : 'Growth card'}
          </span>
        </div>

        <div className="mt-2 flex-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-900 px-2.5 py-1 text-[0.5rem] font-black uppercase tracking-[0.13em] text-moss">
              Level {progression.level}
            </span>
            <span className="text-[0.52rem] font-bold text-forest-800/35">
              {new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="relative mx-auto -mb-3 mt-1 flex items-center justify-center">
            <div className="absolute h-[68%] w-[68%] rounded-full bg-gradient-to-b from-forest-200/80 to-butter/30 blur-xl" />
            <CompanionArt
              type={companion?.id}
              companion={companion}
              mood="joyful"
              pose="celebrate"
              level={progression.level}
              size={188}
              animated={false}
              className="relative"
            />
          </div>

          <div className="text-center">
            <p className="font-display text-[1.8rem] font-semibold leading-none tracking-[-0.04em] text-forest-950">
              {companion?.name}
            </p>
            <p className="mt-1.5 text-[0.55rem] font-black uppercase tracking-[0.17em] text-forest-600">
              {progression.stage.name}
            </p>
            <p className="mx-auto mt-2 max-w-[15rem] font-display text-[0.78rem] font-medium italic leading-snug text-forest-900/55">
              “{companion?.quote}”
            </p>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 divide-x divide-forest-900/10 rounded-xl border border-forest-900/[0.08] bg-white/45 py-2.5">
            <CardStat value={(stats.totalMinutes / 60).toFixed(1)} label="hours" />
            <CardStat value={stats.bestStreak} label="day streak" />
            <CardStat value={stats.sessions} label="sessions" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[0.52rem] font-extrabold text-forest-900/40">
              {user?.nickname} & {companion?.name} · growing together
            </p>
            <span className="font-display text-[0.62rem] font-bold tracking-[0.12em] text-forest-800/50">
              MORI
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardStat({ value, label }) {
  return (
    <div className="text-center">
      <p className="font-display text-[1.05rem] font-semibold leading-none text-forest-950">{value}</p>
      <p className="mt-1 text-[0.44rem] font-black uppercase tracking-[0.13em] text-forest-800/35">
        {label}
      </p>
    </div>
  );
}
