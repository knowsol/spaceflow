import { Reservation, TimeSlot, ConflictResult, RepeatType } from './types';

// ─── Date / time utilities ────────────────────────────────────────────────────

/** "HH:mm" → minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** minutes → "HH:mm" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Date → "YYYY-MM-DD" (local timezone) */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

/** "YYYY-MM-DD" → Date (local timezone, no UTC shift) */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "YYYY-MM-DD" → "2026년 4월 8일 (수)" */
export function formatDateDisplay(dateStr: string): string {
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const d = parseDate(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;
}

/** Two half-open intervals [s1, e1) and [s2, e2) overlap? */
export function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return timeToMinutes(s1) < timeToMinutes(e2) && timeToMinutes(e1) > timeToMinutes(s2);
}

/** Generate 10-minute time option strings: "08:00", "08:10", … "22:00" */
export function generateTimeOptions(startHour = 8, endHour = 22): string[] {
  const opts: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === endHour && m > 0) break;
      opts.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return opts;
}

// ─── Slot / schedule logic ────────────────────────────────────────────────────

/** Reservations that overlap with [hour:00, hour+1:00) */
export function getReservationsForHour(reservations: Reservation[], hour: number): Reservation[] {
  const s = `${hour.toString().padStart(2, '0')}:00`;
  const e = `${(hour + 1).toString().padStart(2, '0')}:00`;
  return reservations.filter(r => !r.all_day && timesOverlap(r.start_time, r.end_time, s, e));
}

/** Build 1-hour display slots for a day (08:00-22:00) */
export function generateTimeSlots(reservations: Reservation[], startHour = 8, endHour = 22): TimeSlot[] {
  const confirmed = reservations.filter(r => r.status === 'confirmed');
  const hasAllDay = confirmed.some(r => r.all_day);

  return Array.from({ length: endHour - startHour }, (_, i) => {
    const hour = startHour + i;
    const slotRes = hasAllDay ? [] : getReservationsForHour(confirmed, hour);
    return {
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      reservations: slotRes,
      isAvailable: !hasAllDay && slotRes.length === 0,
    };
  });
}

// ─── Repeat occurrence check ──────────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const day = d.getDay();
  const m = new Date(d);
  m.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  m.setHours(0, 0, 0, 0);
  return m;
}

/** Does reservation `r` occur on `dateStr`? */
export function reservationOccursOnDate(r: Reservation, dateStr: string): boolean {
  if (r.status !== 'confirmed') return false;

  // Direct date match (covers non-repeating reservations)
  if (r.date === dateStr) return true;
  if (r.repeat_type === 'none') return false;

  const target = parseDate(dateStr);
  const dayOfWeek = target.getDay();
  const repeatStart = parseDate(r.repeat_start_date || r.date);
  const repeatEnd = r.repeat_end_date ? parseDate(r.repeat_end_date) : null;

  if (target < repeatStart) return false;
  if (repeatEnd && target > repeatEnd) return false;

  const daysDiff = Math.round((target.getTime() - repeatStart.getTime()) / 86_400_000);

  switch (r.repeat_type) {
    case 'daily':
      return daysDiff % (r.repeat_interval || 1) === 0;

    case 'weekly': {
      const weeksDiff = Math.round(
        (getMondayOf(target).getTime() - getMondayOf(repeatStart).getTime()) / (7 * 86_400_000)
      );
      if (weeksDiff < 0 || weeksDiff % (r.repeat_interval || 1) !== 0) return false;
      if (r.repeat_days && r.repeat_days.length > 0) return r.repeat_days.includes(dayOfWeek);
      return dayOfWeek === repeatStart.getDay();
    }

    case 'monthly': {
      const monthsDiff =
        (target.getFullYear() - repeatStart.getFullYear()) * 12 +
        (target.getMonth() - repeatStart.getMonth());
      if (monthsDiff < 0 || monthsDiff % (r.repeat_interval || 1) !== 0) return false;
      return target.getDate() === repeatStart.getDate();
    }

    case 'yearly': {
      const yearsDiff = target.getFullYear() - repeatStart.getFullYear();
      if (yearsDiff < 0 || yearsDiff % (r.repeat_interval || 1) !== 0) return false;
      return (
        target.getMonth() === repeatStart.getMonth() && target.getDate() === repeatStart.getDate()
      );
    }

    default:
      return false;
  }
}

/** All reservations effective on `dateStr` */
export function getReservationsForDate(allReservations: Reservation[], dateStr: string): Reservation[] {
  return allReservations.filter(r => reservationOccursOnDate(r, dateStr));
}

/** Set of dates in `year/month` that have ≥1 reservation */
export function getDatesWithReservations(
  allReservations: Reservation[],
  year: number,
  month: number
): Set<string> {
  const result = new Set<string>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    if (getReservationsForDate(allReservations, dateStr).length > 0) result.add(dateStr);
  }
  return result;
}

// ─── Repeat date generation ───────────────────────────────────────────────────

/** Generate every occurrence date for a repeat pattern */
export function generateRepeatDates(
  startDate: string,
  endDate: string,
  repeatType: RepeatType,
  repeatInterval: number,
  repeatDays: number[]
): string[] {
  if (!endDate || startDate > endDate) return [startDate];

  const end = parseDate(endDate);
  const cur = parseDate(startDate);
  const dates: string[] = [];
  let safety = 0;

  while (cur <= end && safety++ < 600) {
    const ds = formatDate(cur);

    switch (repeatType) {
      case 'daily':
        dates.push(ds);
        cur.setDate(cur.getDate() + repeatInterval);
        break;

      case 'weekly':
        if (repeatDays.length > 0) {
          for (let d = 0; d < 7; d++) {
            const check = new Date(cur);
            check.setDate(cur.getDate() + d);
            if (check > end) break;
            if (repeatDays.includes(check.getDay())) dates.push(formatDate(check));
          }
          cur.setDate(cur.getDate() + 7 * repeatInterval);
        } else {
          dates.push(ds);
          cur.setDate(cur.getDate() + 7 * repeatInterval);
        }
        break;

      case 'monthly':
        dates.push(ds);
        cur.setMonth(cur.getMonth() + repeatInterval);
        break;

      case 'yearly':
        dates.push(ds);
        cur.setFullYear(cur.getFullYear() + repeatInterval);
        break;

      default:
        return [startDate];
    }
  }

  return [...new Set(dates)].filter(d => d >= startDate && d <= endDate).sort();
}

// ─── Week utilities ───────────────────────────────────────────────────────────

/**
 * Returns [Sun, Mon, Tue, Wed, Thu, Fri, Sat] for the week containing dateStr.
 * Weeks start on Sunday.
 */
export function getWeekDates(dateStr: string): string[] {
  const d = parseDate(dateStr);
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay()); // rewind to Sunday

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    return formatDate(day);
  });
}

// ─── Conflict detection ───────────────────────────────────────────────────────

export function checkConflicts(
  params: { dates: string[]; start_time: string; end_time: string; all_day: boolean; room_id?: string },
  existingReservations: Reservation[],
  excludeId?: string
): ConflictResult {
  // room_id가 주어지면 해당 방의 예약만 검사
  if (params.room_id) {
    existingReservations = existingReservations.filter(r => r.room_id === params.room_id);
  }
  const conflictDates: string[] = [];
  const conflictReservations: Reservation[] = [];

  for (const date of params.dates) {
    const dayRes = getReservationsForDate(existingReservations, date).filter(
      r => r.reservation_id !== excludeId
    );
    for (const existing of dayRes) {
      const clash =
        params.all_day || existing.all_day
          ? true
          : timesOverlap(params.start_time, params.end_time, existing.start_time, existing.end_time);

      if (clash) {
        if (!conflictDates.includes(date)) conflictDates.push(date);
        if (!conflictReservations.find(r => r.reservation_id === existing.reservation_id))
          conflictReservations.push(existing);
      }
    }
  }

  return { hasConflict: conflictDates.length > 0, conflictDates, conflictReservations };
}
