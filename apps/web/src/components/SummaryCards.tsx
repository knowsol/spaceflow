'use client';

import { Reservation } from '@/lib/types';
import { getReservationsForDate, formatDate } from '@/lib/reservationLogic';

interface Props {
  selectedDate: string;
  reservations: Reservation[];
}

export default function SummaryCards({ selectedDate, reservations }: Props) {
  const today = formatDate(new Date());
  const isToday = selectedDate === today;

  const dayRes = getReservationsForDate(reservations, selectedDate);
  const confirmed = dayRes.filter(r => r.status === 'confirmed');
  const repeatCount = confirmed.filter(r => r.repeat_type !== 'none').length;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const currentRes = isToday
    ? confirmed.find(r => r.all_day || (r.start_time <= currentTime && currentTime < r.end_time))
    : null;

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <div className="bg-white rounded-sm border border-gray-100 p-3 sm:p-4">
        <p className="text-xs text-gray-400 mb-1">현재 사용 중</p>
        {currentRes ? (
          <>
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {currentRes.title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{currentRes.reserver_name}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-gray-400">
            {isToday ? '비어있음' : '—'}
          </p>
        )}
      </div>

      <div className="bg-white rounded-sm border border-gray-100 p-3 sm:p-4">
        <p className="text-xs text-gray-400 mb-1">총 예약</p>
        <p className="text-2xl font-bold text-[var(--accent)] leading-none">{confirmed.length}</p>
        <p className="text-xs text-gray-400 mt-1">건</p>
      </div>

      <div className="bg-white rounded-sm border border-gray-100 p-3 sm:p-4">
        <p className="text-xs text-gray-400 mb-1">반복 예약</p>
        <p className="text-2xl font-bold text-[var(--accent)] leading-none">{repeatCount}</p>
        <p className="text-xs text-gray-400 mt-1">건</p>
      </div>
    </div>
  );
}
