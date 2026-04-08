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
  reservations: Reservation[];
  viewMode?: 'day' | 'week';
  workDays?: number[]; // 0=일~6=토, undefined = 모두 허용
}

export default function MiniCalendar({ selectedDate, onDateSelect, reservations, viewMode = 'day', workDays }: Props) {
  const today = formatDate(new Date());

  const [viewYear, setViewYear] = useState(() => parseInt(selectedDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(selectedDate.slice(5, 7)) - 1);

  const datesWithRes = useMemo(
    () => getDatesWithReservations(reservations, viewYear, viewMonth),
    [reservations, viewYear, viewMonth]
  );

  // Week mode: set of dates in the selected week
  const selectedWeek = useMemo(
    () => viewMode === 'week' ? new Set(getWeekDates(selectedDate)) : new Set<string>(),
    [viewMode, selectedDate]
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun

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

  // Build cell array: null for leading empty cells
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
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
          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
        >
          {viewYear}년 {MONTH_LABELS[viewMonth]}
        </button>
        <button
          onClick={nextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
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
          // colIdx 0=일, 1=월, …, 6=토 (미니캘린더는 일요일부터 시작)
          const colIdx = idx % 7;
          const isWorkDay = !workDays || workDays.includes(colIdx);

          let dayTextColor = 'text-gray-700';
          if (colIdx === 0) dayTextColor = 'text-red-400';
          else if (colIdx === 6) dayTextColor = 'text-blue-500';

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
                    ? 'bg-blue-600 text-white'
                    : isInWeek
                    ? 'bg-blue-100 text-blue-700'
                    : isTodayDate
                    ? 'ring-2 ring-blue-500 font-bold text-blue-600'
                    : `hover:bg-gray-100 ${dayTextColor}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {day}
              </button>
              {/* Reservation dot */}
              <div
                className={`w-1 h-1 rounded-full mt-0.5 transition-colors ${
                  hasRes && isWorkDay
                    ? isSelected || isInWeek
                      ? 'bg-blue-300'
                      : 'bg-blue-500'
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
