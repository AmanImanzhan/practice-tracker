const WEEKDAY_ABBREVIATIONS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Days in `month` (1-12) of `year`, leap years included. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 'YYYY-MM-DD' — matches Postgres `date` columns and Supabase's range filters. */
export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayParts(): { year: number; month: number; day: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** True if `dateISO` ('YYYY-MM-DD') is strictly after today's calendar date. Safe to
 *  compare as plain strings — both sides are zero-padded to the same 'YYYY-MM-DD' shape. */
export function isFutureDate(dateISO: string): boolean {
  const today = todayParts();
  return dateISO > toISODate(today.year, today.month, today.day);
}

/** True if (year, month) is the calendar month the device clock is currently in. */
export function isCurrentMonth(year: number, month: number): boolean {
  const today = todayParts();
  return today.year === year && today.month === month;
}

export function weekdayAbbrev(year: number, month: number, day: number): string {
  return WEEKDAY_ABBREVIATIONS[new Date(year, month - 1, day).getDay()];
}

/** '15.10.26' — table row date format. */
export function formatShortDate(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${String(year).slice(-2)}`;
}

/** 'Oct 2026' — month selector label. */
export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_ABBREVIATIONS[month - 1]} ${year}`;
}

/** 'Oct 15' — "Selected: ..." footer label. */
export function formatMonthDay(month: number, day: number): string {
  return `${MONTH_ABBREVIATIONS[month - 1]} ${day}`;
}

/** 'Thursday, Oct 15' — day detail modal header. */
export function formatLongDate(year: number, month: number, day: number): string {
  const weekday = new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday}, ${MONTH_ABBREVIATIONS[month - 1]} ${day}`;
}

/** 'October 2025' — Account Profile's "Member since". */
export function formatMonthYear(isoDateString: string): string {
  return new Date(isoDateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** 'Oct 2025' — Export Practice Data's "Date range" preview. */
export function formatShortMonthYear(isoDateString: string): string {
  const date = new Date(isoDateString);
  return `${MONTH_ABBREVIATIONS[date.getMonth()]} ${date.getFullYear()}`;
}

/** '09:00' (24h) -> '09:00 AM' — Notifications screen's reminder time. */
export function formatTime12h(time24: string): string {
  const [hoursStr, minutesStr] = time24.split(':');
  const hours = Number(hoursStr);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hours12).padStart(2, '0')}:${minutesStr} ${period}`;
}

export type Period = 'AM' | 'PM';

/** '09:00' (24h) -> { hour12: 9, minute: 0, period: 'AM' } — for the time picker's steppers. */
export function to12Hour(time24: string): { hour12: number; minute: number; period: Period } {
  const [hoursStr, minutesStr] = time24.split(':');
  const hours = Number(hoursStr);
  const period: Period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return { hour12, minute: Number(minutesStr), period };
}

/** Inverse of `to12Hour` — rebuilds a '09:00'-style 24h time string. */
export function to24Hour(hour12: number, minute: number, period: Period): string {
  const hours = period === 'AM' ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12;
  return `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** '3h 40min' / '2h' / '45min' — a single day's summed practice time. */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

/** '59.5 Hours' — the stats card's monthly total. */
export function formatTotalHours(totalMinutes: number): string {
  const hours = Math.round((totalMinutes / 60) * 10) / 10;
  return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
}

/** '00:45:17' — the Timer screen's HH:MM:SS clock face. */
export function formatClock(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.round(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
