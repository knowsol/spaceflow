'use client';

import { useState, useCallback, useEffect } from 'react';
import { Reservation, Room, ReservationFormData } from '@/lib/types';
import {
  checkConflicts,
  generateRepeatDates,
  formatDate,
  generateTimeOptions,
} from '@/lib/reservationLogic';
import TimeSelector from './TimeSelector';
import RepeatOptions, { RepeatConfig } from './RepeatOptions';

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

type Props = (CreateMode | EditMode) & {
  reservations: Reservation[];
  rooms: Room[];
  selectedRoomId?: string;
  onClose: () => void;
  /** create 모드 */
  onSubmit?: (items: Omit<Reservation, 'reservation_id' | 'created_at' | 'updated_at'>[], created_by: string) => void;
  /** edit 모드 */
  onUpdate?: (
    id: string,
    data: Partial<Omit<Reservation, 'reservation_id' | 'created_at'>>,
    changed_by: string
  ) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = formatDate(new Date());
const TIME_OPTIONS = generateTimeOptions(8, 22);

type FormErrors = Partial<
  Record<keyof ReservationFormData | 'repeat_days' | 'repeat_end_date' | 'changed_by', string>
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
  return {
    title: '',
    reserver_name: '',
    purpose: '',
    date: init?.date ?? TODAY,
    start_time: init?.start_time ?? '09:00',
    end_time: init?.end_time ?? '10:00',
    all_day: false,
    repeat_type: 'none',
    repeat_interval: 1,
    repeat_days: [],
    repeat_start_date: init?.date ?? TODAY,
    repeat_end_date: '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReservationModal(props: Props) {
  const { reservations, rooms, selectedRoomId, onClose } = props;
  const isEdit = props.mode === 'edit';
  const editTarget = isEdit ? props.editTarget : undefined;

  const activeRooms = rooms.filter(r => r.is_active);

  // 선택된 회의실 ID: edit이면 원래 예약의 room_id, create면 selectedRoomId 또는 첫 번째 방
  const defaultRoomId = isEdit
    ? (editTarget?.room_id ?? activeRooms[0]?.room_id ?? '')
    : (selectedRoomId ?? activeRooms[0]?.room_id ?? '');

  const [roomId, setRoomId] = useState(defaultRoomId);

  const [form, setForm] = useState<ReservationFormData>(() =>
    isEdit ? reservationToForm(editTarget!) : defaultForm(props.initialData)
  );
  const [changedBy, setChangedBy] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [conflicts, setConflicts] = useState<{ dates: string[]; items: Reservation[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const room = activeRooms.find(r => r.room_id === roomId) ?? activeRooms[0];

  // 수정 모드에서 editTarget이 바뀌면 폼 초기화
  useEffect(() => {
    if (isEdit && editTarget) setForm(reservationToForm(editTarget));
  }, [isEdit, editTarget]);

  const update = useCallback(
    (partial: Partial<ReservationFormData>) => {
      setForm(prev => ({ ...prev, ...partial }));
      setConflicts(null);
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
      if (form.repeat_type === 'weekly' && form.repeat_days.length === 0)
        e.repeat_days = '반복 요일을 하나 이상 선택해주세요';
    }
    if (!changedBy.trim()) e.changed_by = isEdit ? '수정자명을 입력해주세요' : '등록자명을 입력해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    // ── Edit mode ──────────────────────────────────────────────────────────
    if (isEdit && editTarget && props.onUpdate) {
      // Conflict check (exclude self, same room only)
      const result = checkConflicts(
        {
          dates: [form.date],
          start_time: form.start_time,
          end_time: form.end_time,
          all_day: form.all_day,
          room_id: roomId,
        },
        reservations,
        editTarget.reservation_id
      );
      if (result.hasConflict) {
        setConflicts({ dates: result.conflictDates, items: result.conflictReservations });
        setSubmitting(false);
        return;
      }

      props.onUpdate(
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
        changedBy.trim()
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

      props.onSubmit(newItems, changedBy.trim());
    }

    setSubmitting(false);
  };

  const repeatDates = form.repeat_type !== 'none' && form.repeat_end_date ? getDates() : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? '예약 수정' : '예약하기'}
            </h2>
            {isEdit && editTarget?.repeat_type !== 'none' && (
              <p className="text-xs text-amber-600 mt-0.5">반복 예약 — 이 항목만 수정됩니다</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Room selector */}
          {activeRooms.length <= 1 ? (
            <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-700">{room?.room_name ?? '공용 회의실'}</span>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                회의실 <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {activeRooms.map(r => (
                  <button
                    key={r.room_id}
                    type="button"
                    onClick={() => { setRoomId(r.room_id); setConflicts(null); }}
                    className={[
                      'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                      roomId === r.room_id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600',
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
          <Field label="예약자명" required error={errors.reserver_name}>
            <input
              type="text"
              placeholder="이름"
              value={form.reserver_name}
              onChange={e => update({ reserver_name: e.target.value })}
              className={inputCls(!!errors.reserver_name)}
            />
          </Field>

          {/* Purpose */}
          <Field label="예약 목적">
            <textarea
              placeholder="간단한 목적 (선택)"
              value={form.purpose}
              onChange={e => update({ purpose: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </Field>

          {/* Date */}
          <Field label="날짜" required error={errors.date}>
            <input
              type="date"
              value={form.date}
              onChange={e => update({ date: e.target.value, repeat_start_date: e.target.value })}
              className={inputCls(!!errors.date)}
            />
          </Field>

          {/* All-day toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-700">종일 사용</p>
              <p className="text-xs text-gray-400">시간 선택 없이 하루 전체 점유</p>
            </div>
            <button
              type="button"
              onClick={() => update({ all_day: !form.all_day })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                form.all_day ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.all_day ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Time selectors */}
          {!form.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <TimeSelector
                label="시작 시간 *"
                value={form.start_time}
                onChange={v => {
                  const newEnd =
                    form.end_time <= v
                      ? TIME_OPTIONS.find(t => t > v) ?? '22:00'
                      : form.end_time;
                  update({ start_time: v, end_time: newEnd });
                }}
              />
              <TimeSelector
                label="종료 시간 *"
                value={form.end_time}
                onChange={v => update({ end_time: v })}
                minTime={form.start_time}
                error={errors.end_time}
              />
            </div>
          )}

          {/* Repeat options (create only — edit affects single instance) */}
          {!isEdit && (
            <div className="border-t border-gray-100 pt-4">
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
                errors={{
                  repeat_days: errors.repeat_days,
                  repeat_end_date: errors.repeat_end_date,
                }}
              />
            </div>
          )}

          {/* Repeat summary */}
          {!isEdit && repeatDates && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-600">
              {repeatDates.length}개의 예약이 생성됩니다 ({form.repeat_start_date} ~ {form.repeat_end_date})
            </div>
          )}

          {/* ── Changed-by field ──────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-4">
            <Field
              label={isEdit ? '수정자명' : '등록자명'}
              required
              error={errors.changed_by}
              hint={isEdit ? '변경 이력에 기록됩니다' : '등록 이력에 기록됩니다'}
            >
              <input
                type="text"
                placeholder="이름"
                value={changedBy}
                onChange={e => {
                  setChangedBy(e.target.value);
                  if (errors.changed_by) setErrors(prev => ({ ...prev, changed_by: undefined }));
                }}
                className={inputCls(!!errors.changed_by)}
              />
            </Field>
          </div>

          {/* Conflict warning */}
          {conflicts && conflicts.dates.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-2">⚠ 예약 충돌</p>
              <p className="text-xs text-red-600 mb-2">아래 날짜에 이미 예약이 있습니다:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {conflicts.dates.map(d => (
                  <div key={d} className="text-xs bg-red-100 text-red-600 rounded px-2 py-1">
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
            className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {submitting ? '처리 중...' : isEdit ? '수정 저장' : '저장'}
          </button>
        </div>
      </div>
    </div>
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
    'w-full border rounded-lg px-3 py-2 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    hasError ? 'border-red-300' : 'border-gray-200',
  ].join(' ');
}
