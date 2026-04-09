'use client';

import { useRef, useEffect } from 'react';
import { Reservation } from '@/lib/types';
import { getReservationsForDate, timeToMinutes, formatDateDisplay } from '@/lib/reservationLogic';

const SWIPE_THRESHOLD = 50; // px — 이 이상 수평 스와이프 시 날짜 이동

const START_HOUR = 8;
const END_HOUR = 22;
const CELL_H = 56; // px per hour — matches WeekSlotTable
const TOTAL_H = (END_HOUR - START_HOUR) * CELL_H;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

// ─── Reservation block (absolutely positioned) ────────────────────────────────

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
      <div className={`h-full px-2 py-0.5 flex flex-col ${isRepeat ? 'bg-[var(--accent-light)] border border-[var(--accent-border)]' : 'bg-[var(--accent)] border border-[var(--accent)]'}`}>
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
        {!isShort && height >= 80 && r.purpose && (
          <p className={`text-[10px] leading-tight truncate ${isRepeat ? 'text-[var(--accent-mid)]' : 'text-gray-400'}`}>
            {r.purpose}
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
  selectedDate: string;
  reservations: Reservation[];
  roomName?: string;
  headerActions?: React.ReactNode;
  onPrevDay: () => void;
  onNextDay: () => void;
  onReserveSlot: (hour: number) => void;
  onEditReservation: (reservation: Reservation) => void;
  onCancelReservation: (id: string) => void;
}

export default function TimeSlotTable({
  selectedDate,
  reservations,
  roomName = '회의실 현황',
  headerActions,
  onPrevDay,
  onNextDay,
  onReserveSlot,
  onEditReservation,
  onCancelReservation,
}: Props) {
  const dayReservations = getReservationsForDate(reservations, selectedDate);
  const allDayRes = dayReservations.filter(r => r.all_day && r.status === 'confirmed');
  const timedRes = dayReservations.filter(r => !r.all_day && r.status === 'confirmed');
  const hasAllDay = allDayRes.length > 0;

  // 수평 스와이프 → 전날/다음날 (pull indicator — direct DOM)
  // window 레벨 touchmove: Android Chrome native scroll 중에도 항상 이벤트 수신
  const containerRef  = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const indLeftRef    = useRef<HTMLDivElement>(null);
  const indRightRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollAreaRef.current) return;
    const scrollEl: HTMLDivElement = scrollAreaRef.current;
    let startX = 0, startY = 0, tracking = false;

    function hideAll(instant = true) {
      [indLeftRef.current, indRightRef.current].forEach(ind => {
        if (!ind) return;
        ind.style.transition = instant ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out';
        ind.style.transform  = 'translateY(-50%) scale(0)';
        ind.style.opacity    = '0';
      });
    }
    function updateIndicator(dx: number) {
      const absDx   = Math.abs(dx);
      const isLeft  = dx > 0;
      // sqrt 커브: 작은 이동에서도 빠르게 커짐 (max scale 1.0)
      const scale        = Math.min(Math.sqrt(absDx / SWIPE_THRESHOLD), 1.0);
      const colorT       = Math.min(absDx / SWIPE_THRESHOLD, 1);          // 0→1 색상 보간
      const overT        = Math.max(absDx - SWIPE_THRESHOLD, 0) / SWIPE_THRESHOLD;
      const nudge        = Math.min(overT * 8, 5);                         // 최대 5px 뒤로
      const nudgeX       = isLeft ? -nudge : nudge;
      const active       = isLeft ? indLeftRef.current  : indRightRef.current;
      const inactive     = isLeft ? indRightRef.current : indLeftRef.current;

      if (inactive) {
        inactive.style.transition = 'none';
        inactive.style.opacity    = '0';
        inactive.style.transform  = 'translateY(-50%) scale(0)';
      }
      if (active) {
        active.style.transition = 'none';
        active.style.opacity    = String(Math.min(scale * 1.3, 1));
        active.style.transform  = `translateY(-50%) translateX(${nudgeX}px) scale(${scale})`;
        const inner = active.firstElementChild as HTMLElement | null;
        if (inner) {
          // 흰색(255,255,255) → accent(109,40,217) 부드럽게 보간
          const r = Math.round(255 + (109 - 255) * colorT);
          const g = Math.round(255 + (40  - 255) * colorT);
          const b = Math.round(255 + (217 - 255) * colorT);
          // 아이콘: gray(156,163,175) → white(255,255,255)
          const ic = Math.round(156 + (255 - 156) * colorT);
          const ig = Math.round(163 + (255 - 163) * colorT);
          const ib = Math.round(175 + (255 - 175) * colorT);
          inner.style.backgroundColor = `rgb(${r},${g},${b})`;
          inner.style.color           = `rgb(${ic},${ig},${ib})`;
          inner.style.borderColor     = `rgba(0,0,0,${(1 - colorT) * 0.1})`;
        }
      }
    }

    // touchstart: 스크롤 영역 내 터치만 추적
    function onStart(e: TouchEvent) {
      const rect  = scrollEl.getBoundingClientRect();
      const touch = e.touches[0];
      if (touch.clientX < rect.left || touch.clientX > rect.right ||
          touch.clientY < rect.top  || touch.clientY > rect.bottom) return;
      startX   = touch.clientX;
      startY   = touch.clientY;
      tracking = true;
      hideAll(true);
    }
    // touchmove / touchend / touchcancel: window 에 붙여 native scroll 중에도 수신
    function onMove(e: TouchEvent) {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) * 2.5) { hideAll(true); return; }
      updateIndicator(dx);
    }
    function onEnd(e: TouchEvent) {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) >= Math.abs(dy)) {
        hideAll(true);
        if (dx > 0) onPrevDay(); else onNextDay();
      } else {
        hideAll(false);
      }
    }
    function onCancel() { if (!tracking) return; tracking = false; hideAll(false); }

    scrollEl.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove',   onMove,  { passive: true });
    window.addEventListener('touchend',    onEnd,   { passive: true });
    window.addEventListener('touchcancel', onCancel,{ passive: true });
    return () => {
      scrollEl.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove',   onMove);
      window.removeEventListener('touchend',    onEnd);
      window.removeEventListener('touchcancel', onCancel);
    };
  }, [onPrevDay, onNextDay]);

  // 주단위와 동일한 포맷: "04.10 (목)"
  const dayLabel = (() => {
    const d = new Date(selectedDate.replace(/-/g, '/'));
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    return `${mm}.${dd} (${names[d.getDay()]})`;
  })();

  return (
    <div ref={containerRef} className="bg-white overflow-hidden h-full flex flex-col">
      {/* Header — 주단위와 동일한 구조 */}
      <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={onPrevDay} className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm transition-colors flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" clipRule="evenodd" /></svg>
          </button>
          <span className="text-sm font-semibold text-gray-900 inline-block w-28 text-center">{dayLabel}</span>
          <button onClick={onNextDay} className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm transition-colors flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-gray-400">1시간 단위 표시 · 30분 단위 예약</span>
          {headerActions}
        </div>
      </div>

      {/* All-day banner */}
      {hasAllDay && (
        <div className="mx-4 mt-3 space-y-2">
          {allDayRes.map(r => (
            <div
              key={r.reservation_id}
              className="bg-amber-50 border border-amber-200 rounded-sm px-3 py-2.5 group/allday"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm flex-shrink-0">
                    종일
                  </span>
                  <span className="text-sm font-semibold text-gray-900 truncate">{r.title}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">· {r.reserver_name}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2 opacity-0 group-hover/allday:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditReservation(r)}
                    className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-0.5 rounded-sm transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onCancelReservation(r.reservation_id)}
                    className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded-sm transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                종일 예약으로 인해 당일 추가 예약이 불가합니다.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div className="relative flex-1 min-h-0">
        {/* Pull indicators — always in DOM, controlled via ref (direct DOM) */}
        <div ref={indLeftRef} className="absolute left-[10px] top-1/2 z-20 pointer-events-none"
          style={{ opacity: 0, transform: 'translateY(-50%) scale(0)' }}>
          <div className="w-9 h-9 rounded-full shadow-lg flex items-center justify-center border"
            style={{ backgroundColor: 'white', color: '#9ca3af', borderColor: 'rgba(0,0,0,0.1)' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div ref={indRightRef} className="absolute right-[10px] top-1/2 z-20 pointer-events-none"
          style={{ opacity: 0, transform: 'translateY(-50%) scale(0)' }}>
          <div className="w-9 h-9 rounded-full shadow-lg flex items-center justify-center border"
            style={{ backgroundColor: 'white', color: '#9ca3af', borderColor: 'rgba(0,0,0,0.1)' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div ref={scrollAreaRef} className="overflow-y-auto h-full mt-1" style={{ touchAction: 'pan-y' }}>
        <div className="flex">
          {/* Time labels */}
          <div className="flex-shrink-0 w-14 border-r border-gray-100">
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

          {/* Day column */}
          <div
            className="flex-1 relative"
            style={{ height: TOTAL_H }}
          >
            {/* Background decoration */}
            <div className="absolute bottom-0 right-0 pointer-events-none z-0 opacity-30">
              <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="120" cy="120" r="60" fill="#EDE9FE"/>
                <circle cx="140" cy="100" r="30" fill="#F3E8FF"/>
                <rect x="60" y="80" width="40" height="50" rx="2" fill="#7C3AED" opacity="0.3"/>
                <rect x="70" y="70" width="20" height="15" rx="2" fill="#A78BFA" opacity="0.5"/>
                <circle cx="50" cy="130" r="15" fill="#EC4899" opacity="0.4"/>
                <circle cx="145" cy="145" r="20" fill="#F9A8D4" opacity="0.3"/>
              </svg>
            </div>

            {/* Bottom fade gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/60 to-transparent pointer-events-none z-5" />

            {/* Empty state illustration */}
            {timedRes.length === 0 && !hasAllDay && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="15" y="20" width="90" height="80" rx="2" fill="#EDE9FE"/>
                  <rect x="15" y="20" width="90" height="18" rx="2" fill="#7C3AED"/>
                  <rect x="28" y="10" width="8" height="18" rx="4" fill="#7C3AED"/>
                  <rect x="84" y="10" width="8" height="18" rx="4" fill="#7C3AED"/>
                  <rect x="27" y="52" width="20" height="4" rx="1" fill="#C4B5FD"/>
                  <rect x="27" y="62" width="30" height="4" rx="1" fill="#C4B5FD"/>
                  <rect x="27" y="72" width="15" height="4" rx="1" fill="#C4B5FD"/>
                  <rect x="55" y="52" width="40" height="4" rx="1" fill="#DDD6FE"/>
                  <rect x="55" y="62" width="35" height="4" rx="1" fill="#DDD6FE"/>
                  <circle cx="88" cy="88" r="18" fill="#EC4899"/>
                  <path d="M81 88 L86 93 L95 83" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-sm font-medium text-[var(--accent-mid)] mt-2">예약 없음</p>
                <p className="text-xs text-gray-300 mt-0.5">이 시간대에 예약이 없습니다</p>
              </div>
            )}

            {/* Hour divider lines + click-to-reserve */}
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute w-full border-b border-gray-100 group/hour"
                style={{ top: (h - START_HOUR) * CELL_H, height: CELL_H }}
              >
                {!hasAllDay && (
                  <button
                    className="absolute inset-0 w-full hover:bg-gray-50 transition-colors z-0"
                    onClick={() => onReserveSlot(h)}
                    title={`${pad(h)}:00 예약`}
                  >
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 opacity-0 group-hover/hour:opacity-100 transition-opacity">
                      + 예약
                    </span>
                  </button>
                )}
              </div>
            ))}

            {/* Reservation blocks */}
            {timedRes.map(r => (
              <ResBlock
                key={r.reservation_id}
                reservation={r}
                onEdit={onEditReservation}
                onCancel={onCancelReservation}
              />
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
