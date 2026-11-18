/** Timezone-safe, local-date helpers used across MORI. */

export function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function dateKey(date = new Date()) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dayDifference(later, earlier) {
  const a = startOfDay(later).getTime();
  const b = startOfDay(earlier).getTime();
  return Math.round((a - b) / 86_400_000);
}

export function getLastNDays(count, endDate = new Date()) {
  const end = startOfDay(endDate);
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(end, -(count - 1 - index));
    return {
      date,
      key: dateKey(date),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });
}

export function formatDuration(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes || 0));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatHours(totalMinutes) {
  return (Math.max(0, totalMinutes || 0) / 60).toFixed(1);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(value || 0));
}

export function formatShortDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatLongDate(date = new Date()) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'A quiet night';
}

export function getWeekdayInitial(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'narrow' });
}

export function getMonthLabel(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short' });
}

export function getHourBucket(hour) {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
