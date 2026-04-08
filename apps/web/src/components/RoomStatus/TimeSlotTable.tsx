'use client';

import { Reservation } from '@/lib/types';
import { getReservationsForDate, generateTimeSlots } from '@/lib/reservationLogic';
import ReservationCard from './ReservationCard';

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
  const hasAllDay = allDayRes.length > 0;
  const timeSlots = generateTimeSlots(dayReservations);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{roomName}</h2>
        <span className="text-xs text-gray-400">1시간 단위 표시 · 10분 단위 예약</span>
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
                {/* Actions */}
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

      {/* Time slots */}
      <div className="divide-y divide-gray-50 mt-1">
        {timeSlots.map(slot => (
          <div
            key={slot.hour}
            className="flex items-start px-4 py-2.5 gap-3 hover:bg-gray-50 transition-colors group"
          >
            {/* Time label */}
            <div className="w-12 flex-shrink-0 pt-0.5">
              <span className="text-xs font-mono text-gray-400">{slot.label}</span>
            </div>

            {/* Reservation content */}
            <div className="flex-1 min-w-0">
              {slot.reservations.length > 0 ? (
                <div className="space-y-1.5">
                  {slot.reservations.map(r => (
                    <ReservationCard
                      key={r.reservation_id}
                      reservation={r}
                      onEdit={onEditReservation}
                      onCancel={onCancelReservation}
                    />
                  ))}
                </div>
              ) : (
                <span className={`text-xs ${hasAllDay ? 'text-gray-300' : 'text-gray-400'}`}>
                  {hasAllDay ? '예약 불가' : '예약 가능'}
                </span>
              )}
            </div>

            {/* Quick reserve button */}
            {slot.isAvailable && (
              <button
                onClick={() => onReserveSlot(slot.hour)}
                className="flex-shrink-0 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                예약
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
