'use client';

import { useMemo } from 'react';
import { RepeatType } from '@/lib/types';
import { generateRepeatDates, REPEAT_MAX_COUNT } from '@/lib/reservationLogic';

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
  maxCount?: number;
  errors?: { repeat_days?: string; repeat_end_date?: string };
}

export default function RepeatOptions({ value, onChange, baseDate, maxCount, errors }: Props) {
  const update = (partial: Partial<RepeatConfig>) => onChange({ ...value, ...partial });

  const limit = maxCount ?? REPEAT_MAX_COUNT;

  // 실시간 생성 건수 계산
  const repeatCount = useMemo(() => {
    if (value.repeat_type === 'none' || !value.repeat_end_date) return 0;
    return generateRepeatDates(
      value.repeat_start_date || baseDate,
      value.repeat_end_date,
      value.repeat_type,
      value.repeat_interval,
      value.repeat_days
    ).length;
  }, [value, baseDate]);

  const isOverLimit = repeatCount > limit;

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
                'px-3 py-1.5 text-xs rounded-sm border font-medium transition-colors',
                value.repeat_type === opt.value
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
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
              className="w-16 border border-gray-200 rounded-sm px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
                          ? 'bg-[var(--accent)] text-white'
                          : idx === 0
                          ? 'bg-red-50 text-red-400 hover:bg-red-100'
                          : idx === 6
                          ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                onChange={e => {
                  const newStart = e.target.value;
                  const patch: Partial<RepeatConfig> = { repeat_start_date: newStart };
                  if (value.repeat_end_date && newStart >= value.repeat_end_date) {
                    patch.repeat_end_date = newStart;
                  }
                  update(patch);
                }}
                className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">반복 종료일</label>
              <input
                type="date"
                value={value.repeat_end_date}
                min={value.repeat_start_date || baseDate}
                onChange={e => {
                  const newEnd = e.target.value;
                  const patch: Partial<RepeatConfig> = { repeat_end_date: newEnd };
                  if (value.repeat_start_date && newEnd <= value.repeat_start_date) {
                    patch.repeat_start_date = newEnd;
                  }
                  update(patch);
                }}
                className={`w-full border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                  errors?.repeat_end_date ? 'border-red-300' : 'border-gray-200'
                }`}
              />
              {errors?.repeat_end_date && (
                <p className="text-xs text-red-500 mt-1">{errors.repeat_end_date}</p>
              )}
            </div>
          </div>

          {/* 생성 건수 미리보기 */}
          {repeatCount > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              isOverLimit
                ? 'bg-red-50 border border-red-200 text-red-600'
                : 'bg-[var(--accent-lighter)] border border-[var(--accent-border)] text-[var(--accent)]'
            }`}>
              {isOverLimit ? (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
                </svg>
              )}
              <span>
                {isOverLimit
                  ? `${repeatCount}건 — 최대 ${limit}건 초과. 종료일을 앞당겨 주세요.`
                  : `${repeatCount}건 생성 예정 (최대 ${limit}건)`
                }
              </span>
              {!isOverLimit && (
                <span className="ml-auto text-[var(--accent-mid)] font-medium">
                  {Math.round((repeatCount / REPEAT_MAX_COUNT) * 100)}%
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
