'use client';

import { Reservation, Room } from '@/lib/types';
import { getReservationsForDate, formatDateDisplay } from '@/lib/reservationLogic';

interface Props {
  selectedDate: string;
  reservations: Reservation[];
  room?: Room;
}

export default function DayInfo({ selectedDate, reservations, room }: Props) {
  const dayRes = getReservationsForDate(reservations, selectedDate);
  const confirmed = dayRes.filter(r => r.status === 'confirmed');
  const hasRepeat = confirmed.some(r => r.repeat_type !== 'none');
  const hasAllDay = confirmed.some(r => r.all_day);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Selected date */}
      <div>
        <p className="text-xs text-gray-400 mb-0.5">선택 날짜</p>
        <p className="text-sm font-semibold text-gray-900 leading-snug">
          {formatDateDisplay(selectedDate)}
        </p>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">예약 건수</span>
          <span className="text-sm font-semibold text-blue-600">{confirmed.length}건</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">반복 예약</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              hasRepeat ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'
            }`}
          >
            {hasRepeat ? '포함' : '없음'}
          </span>
        </div>
        {hasAllDay && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">종일 예약</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">
              있음
            </span>
          </div>
        )}
      </div>

      {/* Room info */}
      {room && (
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                room.is_active ? 'bg-green-400' : 'bg-gray-300'
              }`}
            />
            <span className="text-xs text-gray-700 font-medium">{room.room_name}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-4">
            {room.is_active ? '정상 운영 중' : '사용 중단'}
          </p>
        </div>
      )}
    </div>
  );
}
