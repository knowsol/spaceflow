'use client';

import { RepeatType } from '@/lib/types';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const REPEAT_TYPES: { value: RepeatType; label: string }[] = [
  { value: 'none', label: '반복 없음' },
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
  { value: 'yearly', label: '매년' },
];

const INTERVAL_UNIT: Record<RepeatType, string> = {
  none: '',
  daily: '일',
  weekly: '주',
  monthly: '개월',
  yearly: '년',
};

export interface RepeatConfig {
  repeat_type: RepeatType;
  repeat_interval: number;
  repeat_days: number[];
  repeat_start_date: string;
  repeat_end_date: string;
}

interface Props {
  value: RepeatConfig;
  onChange: (v: RepeatConfig) => void;
  baseDate: string;
  errors?: { repeat_days?: string; repeat_end_date?: string };
}

export default function RepeatOptions({ value, onChange, baseDate, errors }: Props) {
  const update = (partial: Partial<RepeatConfig>) => onChange({ ...value, ...partial });

  const toggleDay = (idx: number) => {
    const days = value.repeat_days.includes(idx)
      ? value.repeat_days.filter(d => d !== idx)
      : [...value.repeat_days, idx].sort((a, b) => a - b);
    update({ repeat_days: days });
  };

  return (
    <div className="space-y-4">
      {/* Repeat type */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">반복 주기</label>
        <div className="flex flex-wrap gap-1.5">
          {REPEAT_TYPES.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                update({
                  repeat_type: opt.value,
                  repeat_start_date: value.repeat_start_date || baseDate,
                })
              }
              className={[
                'px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors',
                value.repeat_type === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {value.repeat_type !== 'none' && (
        <>
          {/* Interval */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap flex-shrink-0">
              반복 간격
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={value.repeat_interval}
              onChange={e => update({ repeat_interval: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">
              {INTERVAL_UNIT[value.repeat_type]}마다
            </span>
          </div>

          {/* Weekly: day picker */}
          {value.repeat_type === 'weekly' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">반복 요일</label>
              <div className="flex gap-1.5">
                {DAY_NAMES.map((name, idx) => {
                  const active = value.repeat_days.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={[
                        'w-8 h-8 rounded-full text-xs font-medium transition-colors',
                        active
                          ? 'bg-blue-600 text-white'
                          : idx === 0
                          ? 'bg-red-50 text-red-400 hover:bg-red-100'
                          : idx === 6
                          ? 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                      ].join(' ')}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              {errors?.repeat_days && (
                <p className="text-xs text-red-500 mt-1">{errors.repeat_days}</p>
              )}
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">반복 시작일</label>
              <input
                type="date"
                value={value.repeat_start_date}
                min={baseDate}
                onChange={e => update({ repeat_start_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">반복 종료일</label>
              <input
                type="date"
                value={value.repeat_end_date}
                min={value.repeat_start_date || baseDate}
                onChange={e => update({ repeat_end_date: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors?.repeat_end_date ? 'border-red-300' : 'border-gray-200'
                }`}
              />
              {errors?.repeat_end_date && (
                <p className="text-xs text-red-500 mt-1">{errors.repeat_end_date}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
