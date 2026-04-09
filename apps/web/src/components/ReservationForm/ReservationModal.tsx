'use client';

import { useState, useCallback, useEffect } from 'react';
import { Reservation, Room, ReservationFormData } from '@/lib/types';
import {
  checkConflicts,
  generateRepeatDates,
  formatDate,
  generateTimeOptions,
  timeToMinutes,
  minutesToTime,
  REPEAT_MAX_COUNT,
} from '@/lib/reservationLogic';
import TimeSelector from './TimeSelector';
import RepeatOptions, { RepeatConfig } from './RepeatOptions';
import { useStoredName } from '@/hooks/useStoredName';
import RightPanel from '@/components/RightPanel';

// ─── Props ────────────────────────────────────────────────────────────────────

type CreateMode = {
  mode: 'create';
  initialData?: Partial<{ date: string; start_time: string; end_time: string }>;
  editTarget?: undefined;
};

type EditMode = {
  mode: 'edit';
  editTarget: Reservation;
  initialData?: undefined;
};

export type EditScope = 'single' | 'group';

type Props = (CreateMode | EditMode) & {
  open: boolean;
  reservations: Reservation[];
  rooms: Room[];
  selectedRoomId?: string;
  repeatMaxCount?: number;
  onClose: () => void;
  /** create 모드 */
  onSubmit?: (items: Omit<Reservation, 'reservation_id' | 'created_at' | 'updated_at'>[], created_by: string) => Promise<void> | void;
  /** edit 모드 — scope: 'single'=이 항목만, 'group'=전체 시리즈 */
  onUpdate?: (
    id: string,
    data: Partial<Omit<Reservation, 'reservation_id' | 'created_at'>>,
    changed_by: string,
    scope: EditScope
  ) => Promise<void> | void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = formatDate(new Date());
const TIME_OPTIONS = generateTimeOptions(8, 22);

/** 이번 달 말일 (YYYY-MM-DD) */
function lastDayOfCurrentMonth(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return formatDate(last);
}

/** 현재 시각 이후 첫 번째 선택 가능한 시간 슬롯 반환. 22시 이후면 undefined 반환 */
function nextAvailableTime(): string | undefined {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return TIME_OPTIONS.find(t => t > hhmm);
}

const DURATION_PRESETS = [
  { label: '30분', minutes: 30 },
  { label: '1시간', minutes: 60 },
  { label: '2시간', minutes: 120 },
  { label: '3시간', minutes: 180 },
];

type FormErrors = Partial<
  Record<keyof ReservationFormData | 'repeat_days' | 'repeat_end_date', string>
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function reservationToForm(r: Reservation): ReservationFormData {
  return {
    title: r.title,
    reserver_name: r.reserver_name,
    purpose: r.purpose,
    date: r.date,
    start_time: r.start_time,
    end_time: r.end_time,
    all_day: r.all_day,
    repeat_type: r.repeat_type,
    repeat_interval: r.repeat_interval,
    repeat_days: r.repeat_days,
    repeat_start_date: r.repeat_start_date ?? r.date,
    repeat_end_date: r.repeat_end_date ?? '',
  };
}

function defaultForm(init?: CreateMode['initialData']): ReservationFormData {
  const availableSlot = nextAvailableTime();
  const isPastLastSlot = !availableSlot; // 22:00 이후 슬롯 없음

  // 22시 이후 → 다음 날 09:00 기본값
  let defaultDate = init?.date ?? TODAY;
  let defaultStart = init?.start_time ?? availableSlot ?? '09:00';
  if (!init?.date && isPastLastSlot) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    defaultDate = formatDate(tomorrow);
    defaultStart = init?.start_time ?? '09:00';
  }

  const defaultEnd = init?.end_time ?? (TIME_OPTIONS.find(t => t > defaultStart) ?? '22:00');
  return {
    title: '',
    reserver_name: '',
    purpose: '',
    date: defaultDate,
    start_time: defaultStart,
    end_time: defaultEnd,
    all_day: false,
    repeat_type: 'none',
    repeat_interval: 1,
    repeat_days: [],
    repeat_start_date: defaultDate,
    repeat_end_date: lastDayOfCurrentMonth(),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReservationModal(props: Props) {
  const { open, reservations, rooms, selectedRoomId, repeatMaxCount, onClose } = props;
  const limit = repeatMaxCount ?? REPEAT_MAX_COUNT;
  const isEdit = props.mode === 'edit';
  const editTarget = isEdit ? props.editTarget : undefined;

  const activeRooms = rooms.filter(r => r.is_active);

  // 선택된 회의실 ID: edit이면 원래 예약의 room_id, create면 selectedRoomId 또는 첫 번째 방
  // selectedRoomId가 활성 방 목록에 없으면 첫 번째 활성 방 사용
  const resolvedDefaultRoomId = isEdit
    ? (editTarget?.room_id ?? activeRooms[0]?.room_id ?? '')
    : (activeRooms.some(r => r.room_id === selectedRoomId)
        ? selectedRoomId ?? activeRooms[0]?.room_id ?? ''
        : activeRooms[0]?.room_id ?? '');

  const [roomId, setRoomId] = useState(resolvedDefaultRoomId);

  const { savedName, isSaveEnabled, setIsSaveEnabled, persistName, clearName } = useStoredName();

  const [form, setForm] = useState<ReservationFormData>(() =>
    isEdit ? reservationToForm(editTarget!) : defaultForm(props.initialData)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [conflicts, setConflicts] = useState<{ dates: string[]; items: Reservation[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<EditScope>('single');

  // 모달이 열릴 때마다 form 초기화 (슬롯 클릭 시 시간이 반영되도록)
  useEffect(() => {
    if (!open) return;
    setForm(isEdit ? reservationToForm(editTarget!) : defaultForm(props.initialData));
    setErrors({});
    setConflicts(null);
    setSubmitError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 저장된 이름 초기 세팅 (create 모드이고 아직 입력 안 했을 때만)
  useEffect(() => {
    if (!isEdit && savedName && !form.reserver_name) {
      setForm(prev => ({ ...prev, reserver_name: savedName }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedName]);

  const room = activeRooms.find(r => r.room_id === roomId) ?? activeRooms[0];

  // 수정 모드에서 editTarget이 바뀌면 폼 초기화
  useEffect(() => {
    if (isEdit && editTarget) setForm(reservationToForm(editTarget));
  }, [isEdit, editTarget]);

  const update = useCallback(
    (partial: Partial<ReservationFormData>) => {
      setForm(prev => ({ ...prev, ...partial }));
      setConflicts(null);
      setSubmitError(null);
    },
    []
  );

  const getDates = (): string[] => {
    if (form.repeat_type === 'none') return [form.date];
    return generateRepeatDates(
      form.repeat_start_date || form.date,
      form.repeat_end_date,
      form.repeat_type,
      form.repeat_interval,
      form.repeat_days
    );
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.title.trim()) e.title = '예약명을 입력해주세요';
    if (!form.reserver_name.trim()) e.reserver_name = '예약자명을 입력해주세요';
    if (!form.date) e.date = '날짜를 선택해주세요';
    if (!form.all_day && form.start_time >= form.end_time)
      e.end_time = '종료 시간은 시작 시간보다 늦어야 합니다';
    if (form.repeat_type !== 'none') {
      if (!form.repeat_end_date) e.repeat_end_date = '반복 종료일을 입력해주세요';
      else if (form.repeat_start_date > form.repeat_end_date)
        e.repeat_end_date = '종료일은 시작일보다 늦어야 합니다';
      else {
        const count = generateRepeatDates(
          form.repeat_start_date || form.date,
          form.repeat_end_date,
          form.repeat_type,
          form.repeat_interval,
          form.repeat_days
        ).length;
        if (count > limit)
          e.repeat_end_date = `최대 ${limit}건까지 생성 가능합니다 (현재 ${count}건). 종료일을 앞당겨 주세요.`;
      }
      if (form.repeat_type === 'weekly' && form.repeat_days.length === 0)
        e.repeat_days = '반복 요일을 하나 이상 선택해주세요';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // 이름 저장 처리
      if (isSaveEnabled) {
        persistName(form.reserver_name);
      } else {
        clearName();
      }

      // ── Edit mode ──────────────────────────────────────────────────────────
      if (isEdit && editTarget && props.onUpdate) {
        // Conflict check (exclude self + same repeat group)
        const result = checkConflicts(
          {
            dates: [form.date],
            start_time: form.start_time,
            end_time: form.end_time,
            all_day: form.all_day,
            room_id: roomId,
          },
          reservations,
          editTarget.reservation_id,
          editTarget.repeat_group_id ?? undefined
        );
        if (result.hasConflict) {
          setConflicts({ dates: result.conflictDates, items: result.conflictReservations });
          setSubmitting(false);
          return;
        }

        await props.onUpdate(
          editTarget.reservation_id,
          {
            title: form.title.trim(),
            reserver_name: form.reserver_name.trim(),
            purpose: form.purpose.trim(),
            date: form.date,
            start_time: form.all_day ? '08:00' : form.start_time,
            end_time: form.all_day ? '22:00' : form.end_time,
            all_day: form.all_day,
            repeat_type: form.repeat_type,
            repeat_interval: form.repeat_interval,
            repeat_days: form.repeat_days,
            repeat_start_date: form.repeat_type !== 'none' ? form.repeat_start_date : null,
            repeat_end_date: form.repeat_type !== 'none' ? form.repeat_end_date : null,
          },
          form.reserver_name.trim(),
          editScope
        );
        setSubmitting(false);
        return;
      }

      // ── Create mode ────────────────────────────────────────────────────────
      if (!isEdit && props.onSubmit) {
        const dates = getDates();
        const result = checkConflicts(
          { dates, start_time: form.start_time, end_time: form.end_time, all_day: form.all_day, room_id: roomId },
          reservations
        );
        if (result.hasConflict) {
          setConflicts({ dates: result.conflictDates, items: result.conflictReservations });
          setSubmitting(false);
          return;
        }

        const groupId = form.repeat_type !== 'none' ? `group-${Date.now()}` : null;
        const newItems: Omit<Reservation, 'reservation_id' | 'created_at' | 'updated_at'>[] = dates.map(
          date => ({
            room_id: roomId || room?.room_id || 'room-1',
            title: form.title.trim(),
            reserver_name: form.reserver_name.trim(),
            purpose: form.purpose.trim(),
            date,
            start_time: form.all_day ? '08:00' : form.start_time,
            end_time: form.all_day ? '22:00' : form.end_time,
            all_day: form.all_day,
            repeat_type: form.repeat_type,
            repeat_interval: form.repeat_interval,
            repeat_days: form.repeat_days,
            repeat_start_date: form.repeat_type !== 'none' ? form.repeat_start_date : null,
            repeat_end_date: form.repeat_type !== 'none' ? form.repeat_end_date : null,
            repeat_group_id: groupId,
            status: 'confirmed' as const,
          })
        );

        await props.onSubmit(newItems, form.reserver_name.trim());
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const repeatDates = form.repeat_type !== 'none' && form.repeat_end_date ? getDates() : null;

  return (
    <RightPanel open={open} onClose={onClose}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? '예약 수정' : '예약하기'}
          </h2>
          {isEdit && editTarget?.repeat_type !== 'none' && editTarget?.repeat_group_id && (
            <p className="text-xs text-amber-600 mt-0.5">반복 예약</p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-sm hover:bg-gray-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* 반복 일정 수정 범위 선택 */}
          {isEdit && editTarget?.repeat_type !== 'none' && editTarget?.repeat_group_id && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 overflow-hidden">
              <button
                type="button"
                onClick={() => setEditScope('single')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  editScope === 'single' ? 'bg-amber-100' : 'hover:bg-amber-100/60'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  editScope === 'single' ? 'border-amber-500' : 'border-gray-300'
                }`}>
                  {editScope === 'single' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-800">이 항목만 수정</p>
                  <p className="text-xs text-gray-400">{editTarget.date} 일정만 변경됩니다.</p>
                </div>
              </button>
              <div className="h-px bg-amber-100" />
              <button
                type="button"
                onClick={() => setEditScope('group')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  editScope === 'group' ? 'bg-amber-100' : 'hover:bg-amber-100/60'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  editScope === 'group' ? 'border-amber-500' : 'border-gray-300'
                }`}>
                  {editScope === 'group' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-800">전체 반복 일정 수정</p>
                  <p className="text-xs text-gray-400">이 시리즈의 모든 일정에 적용됩니다.</p>
                </div>
              </button>
            </div>
          )}

          {/* Room selector */}
          {activeRooms.length <= 1 ? (
            <div className="bg-gray-50 rounded-sm px-3 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-800">{room?.room_name ?? '공용 공간'}</span>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                공간 <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {activeRooms.map(r => (
                  <button
                    key={r.room_id}
                    type="button"
                    onClick={() => { setRoomId(r.room_id); setConflicts(null); }}
                    className={[
                      'px-3 py-1.5 text-sm rounded-sm border transition-colors',
                      roomId === r.room_id
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900',
                    ].join(' ')}
                  >
                    {r.room_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <Field label="예약명" required error={errors.title}>
            <input
              type="text"
              placeholder="예: 팀 주간 회의"
              value={form.title}
              onChange={e => update({ title: e.target.value })}
              className={inputCls(!!errors.title)}
            />
          </Field>

          {/* Reserver */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">
                예약자명 <span className="text-red-400">*</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSaveEnabled}
                  onChange={e => setIsSaveEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-themed cursor-pointer"
                />
                <span className="text-xs text-gray-400 select-none">이름 저장</span>
              </label>
            </div>
            <input
              type="text"
              placeholder="이름"
              value={form.reserver_name}
              onChange={e => update({ reserver_name: e.target.value })}
              className={inputCls(!!errors.reserver_name)}
            />
            {errors.reserver_name && (
              <p className="text-xs text-red-500 mt-1">{errors.reserver_name}</p>
            )}
          </div>

          {/* Purpose */}
          <Field label="예약 목적">
            <textarea
              placeholder="간단한 목적 (선택)"
              value={form.purpose}
              onChange={e => update({ purpose: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            />
          </Field>

          {/* Date + Time — single row */}
          <div>
            <div className="grid gap-2 grid-cols-[3fr_2fr_2fr]">
              {/* 날짜 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  날짜 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => update({ date: e.target.value, repeat_start_date: e.target.value })}
                  className={inputCls(!!errors.date)}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>
              {/* 시작 시간 */}
              <TimeSelector
                label="시작 시간 *"
                value={form.start_time}
                disabled={form.all_day}
                onChange={v => {
                  const newEnd =
                    form.end_time <= v
                      ? TIME_OPTIONS.find(t => t > v) ?? '22:00'
                      : form.end_time;
                  update({ start_time: v, end_time: newEnd });
                }}
              />
              {/* 종료 시간 */}
              <TimeSelector
                label="종료 시간 *"
                value={form.end_time}
                disabled={form.all_day}
                onChange={v => update({ end_time: v })}
                minTime={form.start_time}
                error={errors.end_time}
              />
            </div>
          </div>

          {/* 종일 · 이용시간 — compact sub-row */}
          <div className="flex items-center gap-2 flex-wrap -mt-1">
            {/* 종일 토글 */}
            <button
              type="button"
              onClick={() => update({ all_day: !form.all_day })}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-sm border transition-colors flex-shrink-0 ${
                form.all_day
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'
              }`}
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z"/>
              </svg>
              종일
            </button>

            {/* 구분 */}
            <span className="text-gray-200 text-xs select-none">|</span>

            {/* 이용 시간 프리셋 */}
            {DURATION_PRESETS.map(({ label, minutes }) => {
              const targetEnd = minutesToTime(
                Math.min(timeToMinutes(form.start_time) + minutes, 22 * 60)
              );
              const isActive = !form.all_day && TIME_OPTIONS.includes(targetEnd) && form.end_time === targetEnd;
              return (
                <button
                  key={minutes}
                  type="button"
                  disabled={form.all_day}
                  onClick={() => {
                    const endTime = TIME_OPTIONS.includes(targetEnd)
                      ? targetEnd
                      : TIME_OPTIONS.filter(t => t > form.start_time).at(-1) ?? '22:00';
                    update({ end_time: endTime });
                  }}
                  className={[
                    'px-2.5 py-1 text-xs rounded-sm border transition-colors flex-shrink-0',
                    form.all_day
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-white'
                      : isActive
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Repeat options (create only — edit affects single instance) */}
          {!isEdit && (
            <div className={`border-t border-gray-100 pt-4 ${form.all_day ? 'opacity-40 pointer-events-none select-none' : ''}`}>
              <RepeatOptions
                value={{
                  repeat_type: form.repeat_type,
                  repeat_interval: form.repeat_interval,
                  repeat_days: form.repeat_days,
                  repeat_start_date: form.repeat_start_date,
                  repeat_end_date: form.repeat_end_date,
                }}
                onChange={(v: RepeatConfig) => update(v)}
                baseDate={form.date}
                maxCount={limit}
                errors={{
                  repeat_days: errors.repeat_days,
                  repeat_end_date: errors.repeat_end_date,
                }}
              />
            </div>
          )}

          {/* Repeat summary — RepeatOptions 내부에 카운트 표시되므로 제거 */}

          {/* Submit error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">⚠ 저장 실패</p>
              <p className="text-xs text-red-600 break-all">{submitError}</p>
            </div>
          )}

          {/* Conflict warning */}
          {conflicts && conflicts.dates.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4">
              <p className="text-sm font-semibold text-red-700 mb-2">⚠ 예약 충돌</p>
              <p className="text-xs text-red-600 mb-2">아래 날짜에 이미 예약이 있습니다:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {conflicts.dates.map(d => (
                  <div key={d} className="text-xs bg-red-100 text-red-600 rounded-sm px-2 py-1">
                    {d}
                    {conflicts.items
                      .filter(r => r.date === d)
                      .map(r => ` — ${r.title} (${r.reserver_name})`)
                      .join(', ')}
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-500 mt-2">충돌 날짜를 제외하거나 기존 예약 취소 후 재시도해주세요.</p>
            </div>
          )}
        </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-sm hover:bg-gray-50 transition-colors font-medium"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 py-2.5 text-sm bg-[var(--accent)] text-white rounded-sm hover:bg-[var(--accent-dark)] transition-colors font-medium disabled:opacity-50"
        >
          {submitting ? '처리 중...' : isEdit ? '수정 저장' : '저장'}
        </button>
      </div>
    </RightPanel>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{' '}
        {required && <span className="text-red-400">*</span>}
        {hint && <span className="text-gray-400 font-normal ml-1">· {hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return [
    'w-full border rounded-sm px-3 h-9 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
    hasError ? 'border-red-300' : 'border-gray-200',
  ].join(' ');
}
