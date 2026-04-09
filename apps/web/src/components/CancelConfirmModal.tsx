'use client';

import { useState, useEffect, useRef } from 'react';
import { Reservation } from '@/lib/types';
import { useStoredName } from '@/hooks/useStoredName';

export type CancelScope = 'single' | 'group';

interface Props {
  reservation: Reservation;
  roomName?: string;
  onConfirm: (cancelledBy: string, scope: CancelScope) => Promise<void>;
  onClose: () => void;
}

export default function CancelConfirmModal({ reservation, roomName, onConfirm, onClose }: Props) {
  const { savedName, isSaveEnabled, setIsSaveEnabled, persistName, clearName } = useStoredName();

  const isRepeat = reservation.repeat_type !== 'none' && !!reservation.repeat_group_id;
  const [scope, setScope] = useState<CancelScope>('single');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (savedName) setName(savedName);
  }, [savedName]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function handleDelete() {
    const finalName = name.trim() || '사용자';
    if (isSaveEnabled) persistName(finalName);
    else clearName();

    setLoading(true);
    try {
      await onConfirm(finalName, scope);
    } finally {
      setLoading(false);
    }
  }

  const timeLabel = reservation.all_day
    ? '종일'
    : `${reservation.start_time} – ${reservation.end_time}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Icon + title */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">예약을 삭제하시겠습니까?</h2>
            <p className="text-xs text-gray-400 mt-0.5">삭제된 예약은 복구할 수 없습니다.</p>
          </div>
        </div>

        {/* Reservation summary */}
        <div className="mx-6 mb-4 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 space-y-1.5">
          <p className="text-sm font-medium text-gray-800 truncate">{reservation.title || '(제목 없음)'}</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
            </svg>
            <span>{reservation.date}</span>
            <span className="text-gray-300">·</span>
            <span>{timeLabel}</span>
          </div>
          {roomName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
              <span>{roomName}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span>{reservation.reserver_name}</span>
          </div>
        </div>

        {/* 반복 일정 범위 선택 */}
        {isRepeat && (
          <div className="mx-6 mb-4 rounded-lg border border-amber-100 bg-amber-50 overflow-hidden">
            <button
              onClick={() => setScope('single')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                scope === 'single' ? 'bg-amber-100' : 'hover:bg-amber-100/60'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                scope === 'single' ? 'border-amber-500' : 'border-gray-300'
              }`}>
                {scope === 'single' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </span>
              <div>
                <p className="text-xs font-medium text-gray-800">이 항목만 삭제</p>
                <p className="text-xs text-gray-400 mt-0.5">{reservation.date} 일정만 삭제됩니다.</p>
              </div>
            </button>
            <div className="h-px bg-amber-100" />
            <button
              onClick={() => setScope('group')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                scope === 'group' ? 'bg-amber-100' : 'hover:bg-amber-100/60'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                scope === 'group' ? 'border-amber-500' : 'border-gray-300'
              }`}>
                {scope === 'group' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </span>
              <div>
                <p className="text-xs font-medium text-gray-800">전체 반복 일정 삭제</p>
                <p className="text-xs text-gray-400 mt-0.5">이 시리즈의 모든 일정이 삭제됩니다.</p>
              </div>
            </button>
          </div>
        )}

        {/* Name input + save toggle */}
        <div className="px-6 mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600">삭제 처리자 이름</label>
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
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !loading) handleDelete(); }}
            placeholder="이름 입력 (선택)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[var(--accent-mid)] focus:ring-2 focus:ring-[var(--accent-lighter)] transition placeholder:text-gray-300"
          />
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                삭제 중…
              </>
            ) : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
