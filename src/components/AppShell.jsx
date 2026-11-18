import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  ChevronRight,
  Crown,
  Heart,
  Home,
  RotateCcw,
  Share2,
  Sparkles,
  TimerReset,
} from 'lucide-react';
import { useMori } from '../context/MoriContext.jsx';
import { cn } from '../lib/utils.js';
import { Logo } from './Logo.jsx';
import { Avatar } from './UI.jsx';

const NAV_ITEMS = [
  { to: '/home', label: 'Today', icon: Home, end: true },
  { to: '/focus', label: 'Focus', icon: TimerReset },
  { to: '/companion', label: 'Companion', icon: Heart },
  { to: '/report', label: 'Insights', icon: BarChart3 },
];

export function AppShell() {
  const {
    user,
    companion,
    progression,
    derived,
    demoLoaded,
    loadDemo,
    resetDemo,
    openPaywall,
    openShare,
    showToast,
  } = useMori();
  const location = useLocation();
  const navigate = useNavigate();
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  function handleDemo() {
    if (demoBusy) return;
    setDemoBusy(true);
    if (demoLoaded) {
      resetDemo();
      showToast('Demo history cleared. Your own forest is back.', { tone: 'default' });
    } else {
      const result = loadDemo();
      const hours = Math.max(1, Math.round(result.totalMinutes / 60));
      showToast(
        `30-day demo loaded — ${hours} hours of memories. ${companion.name} is ready to show off.`,
        {
          tone: 'premium',
          actionLabel: 'See report',
          onAction: () => navigate('/report'),
          duration: 5000,
        },
      );
    }
    window.setTimeout(() => setDemoBusy(false), 700);
  }

  return (
    <div className="min-h-dvh">
      <DesktopSidebar
        user={user}
        companion={companion}
        progression={progression}
        derived={derived}
        demoLoaded={demoLoaded}
        demoBusy={demoBusy}
        onDemo={handleDemo}
        openPaywall={openPaywall}
      />

      <div className="min-h-dvh lg:pl-[264px]">
        <MobileHeader
          user={user}
          companion={companion}
          progression={progression}
          demoLoaded={demoLoaded}
          onDemo={handleDemo}
          openShare={() => openShare('mobile-header')}
        />
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-32 pt-5 sm:px-7 sm:pt-8 lg:px-10 lg:pb-16 lg:pt-9">
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

function DesktopSidebar({
  user,
  companion,
  progression,
  derived,
  demoLoaded,
  demoBusy,
  onDemo,
  openPaywall,
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-line/70 bg-paper/65 px-5 pb-6 pt-7 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Logo asLink />
      </div>

      <nav className="mt-10 space-y-1.5" aria-label="Main navigation">
        <p className="mb-3 px-4 text-[0.58rem] font-black uppercase tracking-[0.2em] text-forest-700/40">
          Your forest
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn('group nav-link', isActive && 'nav-link-active')}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-[1.1rem] w-[1.1rem] shrink-0 transition',
                    isActive ? 'text-moss' : 'text-forest-800/50 group-hover:text-forest-800',
                  )}
                  strokeWidth={2.2}
                />
                <span>{item.label}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-moss" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8">
        <div className="relative overflow-hidden rounded-[1.6rem] border border-forest-800/60 bg-forest-900 p-5 text-cream shadow-soft">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-moss/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-butter/15 text-butter">
                <Crown className="h-3.5 w-3.5" />
              </span>
              {user?.premium ? (
                <span className="rounded-full bg-moss/20 px-2 py-1 text-[0.55rem] font-black uppercase tracking-wider text-moss">
                  Active
                </span>
              ) : (
                <span className="text-[0.6rem] font-bold text-cream/40">¥18 / month</span>
              )}
            </div>
            <p className="mt-3 font-display text-[1.25rem] font-semibold leading-tight">
              {user?.premium ? 'Growing without limits.' : 'Let them grow beyond Lv.5.'}
            </p>
            <p className="mt-1.5 text-[0.68rem] font-semibold leading-relaxed text-cream/45">
              {user?.premium
                ? 'Every future stage, scene, and milestone is unlocked.'
                : 'MORI Plus unlocks every stage, scene, and milestone.'}
            </p>
            <button
              type="button"
              onClick={() => openPaywall('sidebar')}
              className="mt-4 flex w-full items-center justify-between rounded-full bg-cream/10 px-3.5 py-2.5 text-[0.68rem] font-extrabold text-cream transition hover:bg-cream/15"
            >
              {user?.premium ? 'View membership' : 'Explore MORI Plus'}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="rounded-2xl border border-line/80 bg-white/35 p-3">
          <button
            type="button"
            onClick={onDemo}
            disabled={demoBusy}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-forest-900/[0.04] disabled:opacity-50"
          >
            <span
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                demoLoaded ? 'bg-butter/60 text-forest-900' : 'bg-forest-100 text-forest-700',
              )}
            >
              {demoLoaded ? <RotateCcw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.72rem] font-extrabold text-forest-900">
                {demoLoaded ? 'Reset demo data' : 'Demo Mode'}
              </span>
              <span className="block truncate text-[0.6rem] font-semibold text-forest-800/45">
                {demoLoaded ? 'Return to your real history' : 'Fill 30 days for a pitch'}
              </span>
            </span>
            <span
              className={cn(
                'ml-auto h-1.5 w-1.5 rounded-full',
                demoLoaded ? 'bg-[#D8AA3B]' : 'bg-forest-300',
              )}
            />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2.5 px-2">
          <Avatar
            companion={companion}
            mood={derived?.mood?.key}
            level={progression.level}
            size={38}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.74rem] font-extrabold text-forest-900">{user?.nickname}</p>
            <p className="text-[0.6rem] font-semibold text-forest-800/45">
              Level {progression.level} · {progression.stage.name}
            </p>
          </div>
          <span className="flex items-center gap-1 text-[0.52rem] font-extrabold uppercase tracking-wider text-forest-700/35">
            <Activity className="h-3 w-3" />
            Live
          </span>
        </div>

        {demoLoaded && (
          <p className="mt-3 flex items-center gap-1.5 px-2 text-[0.55rem] font-bold text-[#9A7728]">
            <span className="h-1 w-1 rounded-full bg-[#D8AA3B]" />
            DEMO · {Math.round(user?.xp / 2 / 60)}h history ·{' '}
            {user?.premium ? `Lv.${progression.level} Plus` : 'Lv.5 free cap'}
          </p>
        )}
      </div>
    </aside>
  );
}

function MobileHeader({ user, companion, progression, demoLoaded, onDemo, openShare }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-cream/85 px-4 py-3 backdrop-blur-xl sm:px-7 lg:hidden">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between">
        <Logo compact />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openShare}
            aria-label="Share growth card"
            className="icon-btn"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDemo}
            aria-label={demoLoaded ? 'Reset demo data' : 'Load demo data'}
            className={cn(
              'icon-btn',
              demoLoaded && 'border-butter bg-butter/40 text-forest-900',
            )}
          >
            {demoLoaded ? <RotateCcw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </button>
          <NavLink to="/companion" aria-label="Open companion profile">
            <Avatar
              companion={companion}
              mood="ready"
              level={progression.level}
              size={38}
              showLevel
            />
          </NavLink>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-paper/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'relative flex min-w-[3.9rem] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[0.57rem] font-extrabold transition',
                isActive ? 'text-forest-900' : 'text-forest-800/40',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full transition',
                    isActive ? 'bg-forest-900 text-moss' : 'bg-transparent',
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                {item.label}
                {isActive && (
                  <span className="absolute -top-0.5 h-0.5 w-5 rounded-full bg-moss" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
