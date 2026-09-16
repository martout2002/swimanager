import type { Criterion, Sequence, StageTree } from './curriculum';

/**
 * The demo clock. All seeded attendance sits in August 2026, so a fixed "today" keeps
 * that data current instead of stranding it in the past.
 * ponytail: swap for new Date() once real lessons are being logged.
 */
export const TODAY = '2026-08-29';
export const PERIOD = TODAY.slice(0, 7);

export const GRID_START_HOUR = 9;
export const GRID_END_HOUR = 19;

export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Absence billing rules. `credit` means the absence earns a make-up credit. */
export const BILLING_RULES = {
  present: { label: 'Present', chargeable: true, credit: false },
  absent_notified: { label: 'Notified', chargeable: false, credit: true },
  absent_no_show: { label: 'No-show', chargeable: true, credit: false },
  cancelled_instructor: { label: 'Cancelled (me)', chargeable: false, credit: true },
  cancelled_weather: { label: 'Weather', chargeable: false, credit: true },
  makeup: { label: 'Make-up', chargeable: false, credit: false },
} as const;

export type AttendanceStatus = keyof typeof BILLING_RULES;

export const STATUS_ORDER: AttendanceStatus[] = [
  'present',
  'absent_notified',
  'absent_no_show',
  'cancelled_instructor',
  'cancelled_weather',
  'makeup',
];

/* ---------- dates (plain YYYY-MM-DD strings throughout) ---------- */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayOfWeekOf(dateStr: string): number {
  return parseDate(dateStr).getDay();
}

export function addMonthsStr(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setMonth(d.getMonth() + n);
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function addDaysStr(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function formatDateLabel(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function monthLabel(y: number, m: number): string {
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Sunday on or before dateStr. */
export function weekStartOf(dateStr: string): string {
  return addDaysStr(dateStr, -dayOfWeekOf(dateStr));
}

export function formatWeekLabel(weekStart: string): string {
  const a = parseDate(weekStart);
  const b = parseDate(addDaysStr(weekStart, 6));
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(a)} – ${fmt(b)}, ${b.getFullYear()}`;
}

export function formatHourLabel(hour: number): string {
  const h = hour % 24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
}

/* ---------- progress maths ---------- */

export function criterionPct(c: Criterion): number {
  if (c.timed) return c.checked ? 100 : 0;
  if (c.subSkills.length === 0) return c.checked ? 100 : 0;
  const total = c.subSkills.reduce((s, x) => s + x.weight, 0);
  const done = c.subSkills.reduce((s, x) => s + (x.checked ? x.weight : 0), 0);
  return total ? Math.round((done / total) * 100) : 0;
}

export function criterionAchieved(c: Criterion): boolean {
  return criterionPct(c) === 100;
}

export function sequencePct(seq: Sequence): number {
  const arr = seq.criteria.map(criterionPct);
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

export function stagePct(stage: StageTree): number {
  const arr = stage.sequences.flatMap((s) => s.criteria.map(criterionPct));
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

export function stageReady(stage: StageTree): boolean {
  return stage.sequences.every((seq) => seq.criteria.every(criterionAchieved));
}

export function findCriterion(stage: StageTree, id: string): Criterion | null {
  for (const seq of stage.sequences) {
    const c = seq.criteria.find((x) => x.id === id);
    if (c) return c;
  }
  return null;
}

/** "1:42" -> 102. NaN when unparseable. */
export function timeToSeconds(value: string): number {
  const parts = value.split(':').map(Number);
  return parts.length === 2 ? parts[0] * 60 + parts[1] : NaN;
}

/* ---------- make-up credits ---------- */

export type CreditStatus = 'available' | 'used' | 'expired';

export function computeCreditStatus(credit: { status: string; expiresDate: string }): CreditStatus {
  if (credit.status === 'used') return 'used';
  if (TODAY > credit.expiresDate) return 'expired';
  return 'available';
}

/**
 * What marking `next` over `prev` should do to this student's credit ledger.
 * At most one credit per student per calendar month, and correcting a mis-marked
 * absence hands the credit back.
 */
export function creditEffect(
  prev: AttendanceStatus | null,
  next: AttendanceStatus,
  issuedDates: string[],
  date: string,
): 'issue' | 'revoke' | 'none' {
  const prevEarns = prev ? BILLING_RULES[prev].credit : false;
  const nextEarns = BILLING_RULES[next].credit;

  if (prevEarns && !nextEarns) return 'revoke';
  if (nextEarns && !prevEarns) {
    const month = date.slice(0, 7);
    return issuedDates.some((d) => d.slice(0, 7) === month) ? 'none' : 'issue';
  }
  return 'none';
}
