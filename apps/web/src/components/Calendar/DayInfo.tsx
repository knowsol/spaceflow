'use client';

import { Reservation, Room } from '@/lib/types';
import { getReservationsForDate, formatDateDisplay } from '@/lib/reservationLogic';

interface Props {
  selectedDate: string;
  reservations: Reservation[];
  room?: Room;
  defaultRoomId?: string;
  onSetDefault?: (roomId: string) => void;
}

export default function DayInfo({ selectedDate, reservations, room, defaultRoomId, onSetDefault }: Props) {
  const dayRes = getReservationsForDate(reservations, selectedDate);
  const confirmed = dayRes.filter(r => r.status === 'confirmed');
  const hasRepeat = confirmed.some(r => r.repeat_type !== 'none');
  const hasAllDay = confirmed.some(r => r.all_day);

  return (
    <div className="bg-white rounded-sm p-4 space-y-3">
      <div>
        <p className="text-xs text-gray-400 mb-0.5">선택 날짜</p>
        <p className="text-sm font-semibold text-gray-900 leading-snug">
          {formatDateDisplay(selectedDate)}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">예약 건수</span>
          <span className="text-sm font-semibold text-gray-900">{confirmed.length}건</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">반복 예약</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-sm font-medium ${
              hasRepeat ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-400'
            }`}
          >
            {hasRepeat ? '포함' : '없음'}
          </span>
        </div>
        {hasAllDay && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">종일 예약</span>
            <span className="text-xs px-2 py-0.5 rounded-sm font-medium bg-gray-100 text-gray-700">
              있음
            </span>
          </div>
        )}
      </div>

      {room && (
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                room.is_active ? 'bg-[var(--accent-mid)]' : 'bg-gray-300'
              }`}
            />
            <span className="flex-1 text-xs text-gray-700 font-medium">{room.room_name}</span>
            {onSetDefault && (
              <button
                onClick={() => onSetDefault(room.room_id)}
                title={defaultRoomId === room.room_id ? '기본 공간으로 설정됨' : '기본 공간으로 설정'}
                className="p-0.5 rounded-sm transition-colors flex-shrink-0"
              >
                {defaultRoomId === room.room_id ? (
                  /* 채워진 별 — 기본값으로 설정된 상태 */
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-[var(--accent)]">
                    <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                  </svg>
                ) : (
                  /* 빈 별 — 미설정 상태 */
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" className="w-3.5 h-3.5 text-gray-300 hover:text-[var(--accent)]">
                    <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                  </svg>
                )}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-4">
            {defaultRoomId === room.room_id
              ? '기본 공간으로 설정됨'
              : room.is_active ? '정상 운영 중' : '사용 중단'}
          </p>
        </div>
      )}
    </div>
  );
}
