'use client';

import { useState, useMemo } from 'react';
import { Reservation } from '@/lib/types';
import { getDatesWithReservations, getWeekDates, formatDate } from '@/lib/reservationLogic';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

interface Props {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onTodayClick: () => void;
  reservations: Reservation[];
  viewMode?: 'day' | 'week';
  workDays?: number[];
}

export default function MiniCalendar({ selectedDate, onDateSelect, onTodayClick, reservations, viewMode = 'day', workDays }: Props) {
  const today = formatDate(new Date());

  const [viewYear, setViewYear] = useState(() => parseInt(selectedDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(selectedDate.slice(5, 7)) - 1);

  const datesWithRes = useMemo(
    () => getDatesWithReservations(reservations, viewYear, viewMonth),
    [reservations, viewYear, viewMonth]
  );

  const selectedWeek = useMemo(
    () => viewMode === 'week' ? new Set(getWeekDates(selectedDate)) : new Set<string>(),
    [viewMode, selectedDate]
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const toDateStr = (day: number) =>
    `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-white rounded-sm p-4 select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-sm transition-colors text-gray-400"
          aria-label="이전 달"
        >
          ‹
        </button>
        <button
          onClick={() => {
            const d = new Date();
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
          }}
          className="text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors"
        >
          {viewYear}년 {MONTH_LABELS[viewMonth]}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onTodayClick}
            className="px-2 py-1 text-xs text-[var(--accent)] border border-[var(--accent-border)] rounded-sm hover:bg-[var(--accent-lighter)] transition-colors font-medium"
          >
            오늘
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-sm transition-colors text-gray-400"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-gray-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />;

          const dateStr = toDateStr(day);
          const isSelected = dateStr === selectedDate;
          const isInWeek = viewMode === 'week' && selectedWeek.has(dateStr);
          const isTodayDate = dateStr === today;
          const hasRes = datesWithRes.has(dateStr);
          const colIdx = idx % 7;
          const isWorkDay = !workDays || workDays.includes(colIdx);

          let dayTextColor = 'text-gray-700';
          if (colIdx === 0) dayTextColor = 'text-red-400';

          return (
            <div key={day} className="flex flex-col items-center">
              <button
                onClick={isWorkDay ? () => onDateSelect(dateStr) : undefined}
                disabled={!isWorkDay}
                className={[
                  'w-8 h-8 rounded-full text-xs font-medium transition-colors flex items-center justify-center',
                  !isWorkDay
                    ? 'text-gray-300 cursor-not-allowed'
                    : isSelected
                    ? 'bg-[var(--accent)] text-white'
                    : isInWeek
                    ? 'bg-[var(--accent-lighter)] text-[var(--accent)]'
                    : isTodayDate
                    ? 'ring-2 ring-[var(--accent)] font-bold text-gray-900'
                    : `hover:bg-gray-100 ${dayTextColor}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {day}
              </button>
              <div
                className={`w-1 h-1 rounded-full mt-0.5 transition-colors ${
                  hasRes && isWorkDay
                    ? isSelected || isInWeek
                      ? 'bg-[var(--accent-300)]'
                      : 'bg-[var(--accent-mid)]'
                    : 'invisible'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
