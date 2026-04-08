'use client';

import { Reservation } from '@/lib/types';
import { getReservationsForDate, timeToMinutes } from '@/lib/reservationLogic';

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
      className="absolute left-0.5 right-0.5 rounded overflow-hidden group/res cursor-pointer z-10 transition-opacity hover:opacity-90"
      style={{ top, height }}
      onClick={() => onEdit(r)}
    >
      <div className={`h-full px-2 py-0.5 flex flex-col ${isRepeat ? 'bg-indigo-100 border border-indigo-200' : 'bg-blue-100 border border-blue-200'}`}>
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
        {!isShort && height >= 80 && r.purpose && (
          <p className={`text-[10px] leading-tight truncate ${isRepeat ? 'text-indigo-400' : 'text-blue-400'}`}>
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
  onReserveSlot: (hour: number) => void;
  onEditReservation: (reservation: Reservation) => void;
  onCancelReservation: (id: string) => void;
}

export default function TimeSlotTable({
  selectedDate,
  reservations,
  roomName = '회의실 현황',
  onReserveSlot,
  onEditReservation,
  onCancelReservation,
}: Props) {
  const dayReservations = getReservationsForDate(reservations, selectedDate);
  const allDayRes = dayReservations.filter(r => r.all_day && r.status === 'confirmed');
  const timedRes = dayReservations.filter(r => !r.all_day && r.status === 'confirmed');
  const hasAllDay = allDayRes.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{roomName}</h2>
        <span className="text-xs text-gray-400">1시간 단위 표시 · 30분 단위 예약</span>
      </div>

      {/* All-day banner */}
      {hasAllDay && (
        <div className="mx-4 mt-3 space-y-2">
          {allDayRes.map(r => (
            <div
              key={r.reservation_id}
              className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 group/allday"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0">
                    종일
                  </span>
                  <span className="text-sm font-semibold text-gray-900 truncate">{r.title}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">· {r.reserver_name}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2 opacity-0 group-hover/allday:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditReservation(r)}
                    className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onCancelReservation(r.reservation_id)}
                    className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition-colors"
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
      <div className="overflow-y-auto mt-1" style={{ maxHeight: '560px' }}>
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
            {/* Hour divider lines + click-to-reserve */}
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute w-full border-b border-gray-100 group/hour"
                style={{ top: (h - START_HOUR) * CELL_H, height: CELL_H }}
              >
                {!hasAllDay && (
                  <button
                    className="absolute inset-0 w-full hover:bg-blue-50/40 transition-colors z-0"
                    onClick={() => onReserveSlot(h)}
                    title={`${pad(h)}:00 예약`}
                  >
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 opacity-0 group-hover/hour:opacity-100 transition-opacity">
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
  );
}
