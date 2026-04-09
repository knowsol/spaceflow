'use client';

import { useMemo, useRef, useEffect } from 'react';

const SWIPE_THRESHOLD = 50; // px
import { Reservation } from '@/lib/types';
import { getReservationsForDate, timeToMinutes, formatDate, parseDate } from '@/lib/reservationLogic';

const START_HOUR = 8;
const END_HOUR = 22;
const CELL_H = 56; // px per hour
const TOTAL_H = (END_HOUR - START_HOUR) * CELL_H;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
// Sun-Sat order (index 0 = Sunday)
const DOW_LABEL: Record<number, string> = { 0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토' };

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

// ─── Reservation block (absolutely positioned in day column) ──────────────────

interface BlockProps {
  reservation: Reservation;
  onEdit: (r: Reservation) => void;
  onCancel: (id: string) => void;
}

function ResBlock({ reservation: r, onEdit, onCancel }: BlockProps) {
  const startMins = Math.max(timeToMinutes(r.start_time) - START_HOUR * 60, 0);
  const endMins = Math.min(timeToMinutes(r.end_time) - START_HOUR * 60, (END_HOUR - START_HOUR) * 60);
  const top = (startMins / 60) * CELL_H;
  const height = Math.max(((endMins - startMins) / 60) * CELL_H, 22);
  const isShort = height < 40;

  const isRepeat = r.repeat_type !== 'none';

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded-sm overflow-hidden group/res cursor-pointer z-10 transition-opacity hover:opacity-90"
      style={{ top, height }}
      onClick={() => onEdit(r)}
    >
      <div className={`h-full px-1.5 py-0.5 flex flex-col ${isRepeat ? 'bg-[var(--accent-light)] border border-[var(--accent-border)]' : 'bg-[var(--accent)] border border-[var(--accent)]'}`}>
        <p className={`font-semibold truncate leading-tight ${isShort ? 'text-[10px]' : 'text-xs'} ${isRepeat ? 'text-[var(--accent)]' : 'text-white'}`}>
          {r.title}
        </p>
        {!isShort && (
          <p className={`text-[10px] leading-tight truncate ${isRepeat ? 'text-[var(--accent-mid)]' : 'text-gray-300'}`}>
            {r.start_time}–{r.end_time}
          </p>
        )}
        {!isShort && height >= 58 && r.reserver_name && (
          <p className={`text-[10px] leading-tight truncate ${isRepeat ? 'text-[var(--accent-mid)]' : 'text-gray-300'}`}>
            {r.reserver_name}
          </p>
        )}
      </div>

      {/* Cancel button on hover */}
      <button
        onClick={e => { e.stopPropagation(); onCancel(r.reservation_id); }}
        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/80 text-gray-500 text-[11px] hidden group-hover/res:flex items-center justify-center hover:bg-red-100 hover:text-red-600 z-20 leading-none"
      >
        ×
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  weekDates: string[];   // 7 dates, Sun–Sat
  reservations: Reservation[];
  roomName?: string;
  workDays?: number[];   // 0=일~6=토, undefined = 모두 표시
  headerActions?: React.ReactNode;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onReserveSlot: (date: string, hour: number) => void;
  onEditReservation: (reservation: Reservation) => void;
  onCancelReservation: (id: string) => void;
}

export default function WeekSlotTable({
  weekDates,
  reservations,
  roomName = '회의실 현황',
  workDays,
  headerActions,
  onPrevWeek,
  onNextWeek,
  onReserveSlot,
  onEditReservation,
  onCancelReservation,
}: Props) {
  const today = formatDate(new Date());

  // Current time indicator
  const now = new Date();
  const nowTop = ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / 60) * CELL_H;
  const showNow = now.getHours() >= START_HOUR && now.getHours() < END_HOUR;

  const allDayData = useMemo(() =>
    weekDates.map(date => {
      const all = getReservationsForDate(reservations, date).filter(r => r.status === 'confirmed');
      return {
        date,
        dow: parseDate(date).getDay(),
        allDay: all.filter(r => r.all_day),
        timed: all.filter(r => !r.all_day),
      };
    }),
    [weekDates, reservations]
  );

  // Only show columns for workDays
  const dayData = useMemo(() =>
    workDays ? allDayData.filter(d => workDays.includes(d.dow)) : allDayData,
    [allDayData, workDays]
  );

  const hasAnyAllDay = dayData.some(d => d.allDay.length > 0);
  const colCount = dayData.length;

  // Week label: first and last visible day
  const weekLabel = (() => {
    const visible = dayData.length > 0 ? dayData : allDayData;
    const s = parseDate(visible[0].date);
    const e = parseDate(visible[visible.length - 1].date);
    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    return `${fmt(s)} - ${fmt(e)}`;
  })();

  const gridCols = `48px repeat(${colCount}, minmax(80px, 1fr))`;
  const minW = 48 + colCount * 80;

  // 스크롤 끝에서 추가 스와이프 → 이전주/다음주 (pull indicator — direct DOM)
  // window 레벨 touchmove: Android Chrome native scroll 중에도 항상 이벤트 수신
  const scrollRef   = useRef<HTMLDivElement>(null);
  const indLeftRef  = useRef<HTMLDivElement>(null);
  const indRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el: HTMLDivElement = scrollRef.current;
    let startX = 0, startY = 0, startScrollLeft = 0, tracking = false;

    function hideAll(instant = true) {
      [indLeftRef.current, indRightRef.current].forEach(ind => {
        if (!ind) return;
        ind.style.transition = instant ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out';
        ind.style.transform  = 'translateY(-50%) scale(0)';
        ind.style.opacity    = '0';
      });
    }
    function updateIndicator(dx: number) {
      const absDx  = Math.abs(dx);
      const isLeft = dx > 0;
      const progress = Math.min(Math.sqrt(absDx / SWIPE_THRESHOLD) * 1.1, 1.1);
      const reached  = absDx >= SWIPE_THRESHOLD;
      const active   = isLeft ? indLeftRef.current  : indRightRef.current;
      const inactive = isLeft ? indRightRef.current : indLeftRef.current;

      if (inactive) {
        inactive.style.transition = 'none';
        inactive.style.opacity    = '0';
        inactive.style.transform  = 'translateY(-50%) scale(0)';
      }
      if (active) {
        active.style.transition = 'none';
        active.style.opacity    = String(Math.min(progress, 1));
        active.style.transform  = `translateY(-50%) scale(${progress})`;
        const inner = active.firstElementChild as HTMLElement | null;
        if (inner) {
          inner.style.backgroundColor = reached ? 'var(--accent)' : 'white';
          inner.style.color           = reached ? 'white' : '#9ca3af';
          inner.style.borderColor     = reached ? 'transparent' : '#f3f4f6';
        }
      }
    }

    function onStart(e: TouchEvent) {
      const rect  = el.getBoundingClientRect();
      const touch = e.touches[0];
      if (touch.clientX < rect.left || touch.clientX > rect.right ||
          touch.clientY < rect.top  || touch.clientY > rect.bottom) return;
      startX          = touch.clientX;
      startY          = touch.clientY;
      startScrollLeft = el.scrollLeft;
      tracking        = true;
      hideAll(true);
    }
    function onMove(e: TouchEvent) {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) * 2.5) { hideAll(true); return; }
      const maxScroll = el.scrollWidth - el.clientWidth;
      const atLeft  = startScrollLeft <= 0 && el.scrollLeft <= 0;
      const atRight = startScrollLeft >= maxScroll - 2 && el.scrollLeft >= maxScroll - 2;
      if ((dx > 0 && atLeft) || (dx < 0 && atRight)) {
        updateIndicator(dx);
      } else {
        hideAll(true);
      }
    }
    function onEnd(e: TouchEvent) {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) >= Math.abs(dy)) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        const atLeft  = startScrollLeft <= 0 && el.scrollLeft <= 0;
        const atRight = startScrollLeft >= maxScroll - 2 && el.scrollLeft >= maxScroll - 2;
        if (dx > 0 && atLeft)  { hideAll(true); onPrevWeek(); return; }
        if (dx < 0 && atRight) { hideAll(true); onNextWeek(); return; }
      }
      hideAll(false);
    }
    function onCancel() { if (!tracking) return; tracking = false; hideAll(false); }

    el.addEventListener('touchstart',  onStart,  { passive: true });
    window.addEventListener('touchmove',   onMove,   { passive: true });
    window.addEventListener('touchend',    onEnd,    { passive: true });
    window.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      el.removeEventListener('touchstart',  onStart);
      window.removeEventListener('touchmove',   onMove);
      window.removeEventListener('touchend',    onEnd);
      window.removeEventListener('touchcancel', onCancel);
    };
  }, [onPrevWeek, onNextWeek]);

  return (
    <div className="bg-white overflow-hidden h-full flex flex-col">
      {/* Navigation header */}
      <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <button onClick={onPrevWeek} className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm transition-colors flex-shrink-0">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" clipRule="evenodd" /></svg>
            </button>
            <span className="text-sm font-semibold text-gray-900 inline-block w-28 text-center">{weekLabel}</span>
            <button onClick={onNextWeek} className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm transition-colors flex-shrink-0">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-gray-400">1시간 단위 표시 · 30분 단위 예약</span>
          {headerActions}
        </div>
      </div>

      {/* ── Single scroll container (both x and y) ── */}
      <div className="relative flex-1 min-h-0">
        {/* Pull indicators — always in DOM, controlled via ref */}
        <div ref={indLeftRef} className="absolute left-[10px] top-1/2 z-30 pointer-events-none"
          style={{ opacity: 0, transform: 'translateY(-50%) scale(0)' }}>
          <div className="w-11 h-11 rounded-full shadow-xl flex items-center justify-center border"
            style={{ backgroundColor: 'white', color: '#9ca3af', borderColor: '#f3f4f6' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div ref={indRightRef} className="absolute right-[10px] top-1/2 z-30 pointer-events-none"
          style={{ opacity: 0, transform: 'translateY(-50%) scale(0)' }}>
          <div className="w-11 h-11 rounded-full shadow-xl flex items-center justify-center border"
            style={{ backgroundColor: 'white', color: '#9ca3af', borderColor: '#f3f4f6' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      <div ref={scrollRef} className="overflow-auto h-full" style={{ touchAction: 'pan-x pan-y' }}>
        <div style={{ minWidth: `${minW}px` }}>

          {/* ── Sticky day header row ── */}
          <div
            className="grid sticky top-0 z-30 bg-gray-50 border-b border-gray-100"
            style={{ gridTemplateColumns: gridCols }}
          >
            {/* Corner cell: sticky left AND top */}
            <div className="sticky left-0 z-40 bg-gray-50 border-r border-gray-100" />
            {dayData.map(({ date, dow }) => {
              const d = parseDate(date);
              const isToday = date === today;
              const isSun = dow === 0;
              const isSat = dow === 6;
              return (
                <div
                  key={date}
                  className={`text-center py-2.5 border-l border-gray-100 ${isToday ? 'bg-gray-50' : ''}`}
                >
                  <p className={`text-[10px] font-medium ${isSun ? 'text-red-400' : 'text-gray-400'}`}>
                    {DOW_LABEL[dow]}
                  </p>
                  <div className={`mx-auto mt-0.5 w-7 h-7 rounded-full flex items-center justify-center ${isToday ? 'bg-[var(--accent)]' : ''}`}>
                    <span className={`text-sm font-semibold ${isToday ? 'text-white' : isSun ? 'text-red-500' : isSat ? 'text-gray-500' : 'text-gray-700'}`}>
                      {d.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── All-day row ── */}
          {hasAnyAllDay && (
            <div
              className="grid border-b border-gray-100 bg-amber-50/60"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div className="sticky left-0 z-20 bg-amber-50 flex items-center justify-end pr-2 py-1.5 border-r border-gray-100">
                <span className="text-[10px] text-gray-400">종일</span>
              </div>
              {dayData.map(({ date, allDay }) => (
                <div key={date} className="border-l border-gray-100 px-0.5 py-1 space-y-0.5 min-h-[28px]">
                  {allDay.map(r => (
                    <div
                      key={r.reservation_id}
                      onClick={() => onEditReservation(r)}
                      className="bg-amber-100 border border-amber-200 rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-amber-800 truncate cursor-pointer hover:bg-amber-200 transition-colors"
                    >
                      {r.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── Time grid: flat grid with sticky time column ── */}
          <div
            className="grid"
            style={{ gridTemplateColumns: gridCols }}
          >
            {/* Sticky time labels column */}
            <div className="sticky left-0 z-20 bg-white border-r border-gray-100">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-2"
                  style={{ height: CELL_H }}
                >
                  <span className="text-[10px] text-gray-400 mt-0.5">{pad(h)}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {dayData.map(({ date, timed, dow }) => {
              const isToday = date === today;
              const isSat = dow === 6;
              const isSun = dow === 0;
              return (
                <div
                  key={date}
                  className={`relative border-l border-gray-100 ${
                    isToday ? 'bg-gray-50/60' : isSat || isSun ? 'bg-gray-50/60' : ''
                  }`}
                  style={{ height: TOTAL_H }}
                >
                  {/* Hour divider lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute w-full border-b border-gray-100"
                      style={{ top: (h - START_HOUR) * CELL_H, height: CELL_H }}
                    />
                  ))}

                  {/* Click-to-reserve overlays (per hour) */}
                  {HOURS.map(h => (
                    <button
                      key={h}
                      className="absolute w-full hover:bg-gray-50 transition-colors z-0"
                      style={{ top: (h - START_HOUR) * CELL_H, height: CELL_H }}
                      onClick={() => onReserveSlot(date, h)}
                      title={`${pad(h)}:00 예약`}
                    />
                  ))}

                  {/* Reservation blocks */}
                  {timed.map(r => (
                    <ResBlock
                      key={r.reservation_id}
                      reservation={r}
                      onEdit={onEditReservation}
                      onCancel={onCancelReservation}
                    />
                  ))}

                  {/* Current time indicator */}
                  {isToday && showNow && (
                    <div
                      className="absolute w-full z-20 pointer-events-none flex items-center"
                      style={{ top: nowTop }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -translate-x-0.5" />
                      <div className="flex-1 h-px bg-red-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
      </div>
    </div>
  );
}
