'use client';

import { useMemo } from 'react';
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
      className="absolute left-0.5 right-0.5 rounded overflow-hidden group/res cursor-pointer z-10 transition-opacity hover:opacity-90"
      style={{ top, height }}
      onClick={() => onEdit(r)}
    >
      <div className={`h-full px-1.5 py-0.5 flex flex-col ${isRepeat ? 'bg-indigo-100 border border-indigo-200' : 'bg-blue-100 border border-blue-200'}`}>
        <p className={`font-semibold truncate leading-tight ${isShort ? 'text-[10px]' : 'text-xs'} ${isRepeat ? 'text-indigo-900' : 'text-blue-900'}`}>
          {r.title}
        </p>
        {!isShort && (
          <p className={`text-[10px] leading-tight truncate ${isRepeat ? 'text-indigo-600' : 'text-blue-600'}`}>
            {r.start_time}–{r.end_time}
          </p>
        )}
        {!isShort && height >= 58 && r.reserver_name && (
          <p className={`text-[10px] leading-tight truncate ${isRepeat ? 'text-indigo-500' : 'text-blue-500'}`}>
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
  onReserveSlot: (date: string, hour: number) => void;
  onEditReservation: (reservation: Reservation) => void;
  onCancelReservation: (id: string) => void;
}

export default function WeekSlotTable({
  weekDates,
  reservations,
  roomName = '회의실 현황',
  workDays,
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
    if (s.getMonth() === e.getMonth()) {
      return `${s.getMonth() + 1}월 ${s.getDate()}일 – ${e.getDate()}일`;
    }
    return `${s.getMonth() + 1}월 ${s.getDate()}일 – ${e.getMonth() + 1}월 ${e.getDate()}일`;
  })();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{roomName}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{weekLabel}</p>
        </div>
        <span className="text-xs text-gray-400">1시간 단위 표시 · 30분 단위 예약</span>
      </div>

      <div className="overflow-x-auto">
        {/* Day header row */}
        <div
          className="grid border-b border-gray-100 bg-gray-50 sticky top-0 z-30"
          style={{ gridTemplateColumns: `48px repeat(${colCount}, minmax(80px, 1fr))` }}
        >
          <div className="border-r border-gray-100" />
          {dayData.map(({ date, dow }) => {
            const d = parseDate(date);
            const isToday = date === today;
            const isSun = dow === 0;
            const isSat = dow === 6;
            return (
              <div
                key={date}
                className={`text-center py-2.5 border-l border-gray-100 ${isToday ? 'bg-blue-50' : ''}`}
              >
                <p className={`text-[10px] font-medium ${isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-gray-400'}`}>
                  {DOW_LABEL[dow]}
                </p>
                <div className={`mx-auto mt-0.5 w-7 h-7 rounded-full flex items-center justify-center ${isToday ? 'bg-blue-600' : ''}`}>
                  <span className={`text-sm font-semibold ${isToday ? 'text-white' : isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-700'}`}>
                    {d.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        {hasAnyAllDay && (
          <div
            className="grid border-b border-gray-100 bg-amber-50/60"
            style={{ gridTemplateColumns: `48px repeat(${colCount}, minmax(80px, 1fr))` }}
          >
            <div className="flex items-center justify-end pr-2 py-1.5 border-r border-gray-100">
              <span className="text-[10px] text-gray-400">종일</span>
            </div>
            {dayData.map(({ date, allDay }) => (
              <div key={date} className="border-l border-gray-100 px-0.5 py-1 space-y-0.5 min-h-[28px]">
                {allDay.map(r => (
                  <div
                    key={r.reservation_id}
                    onClick={() => onEditReservation(r)}
                    className="bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-800 truncate cursor-pointer hover:bg-amber-200 transition-colors"
                  >
                    {r.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Time grid */}
        <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
          <div className="flex" style={{ minWidth: `${48 + colCount * 80}px` }}>
            {/* Time labels */}
            <div className="flex-shrink-0 w-12 border-r border-gray-100">
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
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(80px, 1fr))` }}>
              {dayData.map(({ date, timed, dow }) => {
                const isToday = date === today;
                const isSat = dow === 6;
                const isSun = dow === 0;
                return (
                  <div
                    key={date}
                    className={`relative border-l border-gray-100 ${
                      isToday ? 'bg-blue-50/20' : isSat || isSun ? 'bg-gray-50/60' : ''
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
                        className="absolute w-full hover:bg-blue-100/40 transition-colors z-0"
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
