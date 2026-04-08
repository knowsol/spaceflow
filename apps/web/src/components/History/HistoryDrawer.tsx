'use client';

import { useMemo, useState } from 'react';
import { ReservationHistory, HistoryAction } from '@/lib/types';

const ACTION_LABEL: Record<HistoryAction, { text: string; color: string }> = {
  create: { text: '등록', color: 'bg-green-100 text-green-700' },
  update: { text: '수정', color: 'bg-blue-100 text-blue-700' },
  cancel: { text: '취소', color: 'bg-red-100 text-red-700' },
};

const FIELD_LABEL: Record<string, string> = {
  title: '예약명',
  reserver_name: '예약자',
  purpose: '목적',
  date: '날짜',
  start_time: '시작 시간',
  end_time: '종료 시간',
  all_day: '종일 여부',
  repeat_type: '반복 유형',
  repeat_interval: '반복 간격',
  repeat_days: '반복 요일',
  repeat_start_date: '반복 시작일',
  repeat_end_date: '반복 종료일',
  status: '상태',
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (field === 'repeat_days' && Array.isArray(value)) {
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    return (value as number[]).map(d => names[d]).join(', ') || '없음';
  }
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  return String(value);
}

interface Props {
  history: ReservationHistory[];
  onClose: () => void;
}

export default function HistoryDrawer({ history, onClose }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<HistoryAction | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const cutoff = Date.now() - 12 * 60 * 60 * 1000; // 12시간 전
    return history.filter(h => {
      if (new Date(h.changed_at).getTime() < cutoff) return false;
      if (filterAction !== 'all' && h.action !== filterAction) return false;
      if (search) {
        const q = search.toLowerCase();
        const title =
          h.after_snapshot?.title ?? h.before_snapshot?.title ?? '';
        const by = h.changed_by;
        if (!title.toLowerCase().includes(q) && !by.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [history, filterAction, search]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">최근 변경이력</h2>
            <p className="text-xs text-gray-400 mt-0.5">최근 12시간 · {filtered.length}건</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-gray-100 space-y-2 flex-shrink-0">
          {/* Search */}
          <input
            type="text"
            placeholder="예약명 또는 담당자 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Action filter */}
          <div className="flex gap-1.5">
            {(['all', 'create', 'update', 'cancel'] as const).map(a => (
              <button
                key={a}
                onClick={() => setFilterAction(a)}
                className={[
                  'px-3 py-1 text-xs rounded-full font-medium transition-colors border',
                  filterAction === a
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {a === 'all' ? '전체' : ACTION_LABEL[a].text}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              이력이 없습니다
            </div>
          ) : (
            filtered.map(h => {
              const title = h.after_snapshot?.title ?? h.before_snapshot?.title ?? '(알 수 없음)';
              const date = h.after_snapshot?.date ?? h.before_snapshot?.date ?? '';
              const isExpanded = expandedId === h.history_id;
              const meta = ACTION_LABEL[h.action];

              return (
                <div key={h.history_id} className="px-5 py-3">
                  {/* Row header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${meta.color}`}>
                        {meta.text}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {date} · {h.changed_by}
                          {h.changed_fields.length > 0 && (
                            <span className="ml-1 text-gray-300">
                              ({h.changed_fields.length}개 항목 변경)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-300 mt-0.5">{formatTimestamp(h.changed_at)}</p>
                      </div>
                    </div>

                    {/* Expand toggle (only for update with diffs) */}
                    {h.action === 'update' && h.changed_fields.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : h.history_id)}
                        className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 mt-0.5"
                      >
                        {isExpanded ? '접기' : '상세'}
                      </button>
                    )}
                  </div>

                  {/* Expanded diff */}
                  {isExpanded && h.before_snapshot && h.after_snapshot && (
                    <div className="mt-2.5 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                      <div className="grid grid-cols-[auto_1fr_1fr] text-xs">
                        <div className="bg-gray-100 px-2 py-1.5 font-medium text-gray-500 border-b border-gray-200">항목</div>
                        <div className="bg-red-50 px-2 py-1.5 font-medium text-red-500 border-b border-gray-200 border-l border-gray-200">변경 전</div>
                        <div className="bg-green-50 px-2 py-1.5 font-medium text-green-600 border-b border-gray-200 border-l border-gray-200">변경 후</div>

                        {h.changed_fields.map(field => {
                          const before = (h.before_snapshot as unknown as Record<string, unknown>)[field];
                          const after = (h.after_snapshot as unknown as Record<string, unknown>)[field];
                          return (
                            <div key={field} className="contents">
                              <div className="px-2 py-1.5 text-gray-500 border-b border-gray-100">
                                {FIELD_LABEL[field] ?? field}
                              </div>
                              <div className="px-2 py-1.5 text-red-500 border-b border-gray-100 border-l border-gray-100 line-through opacity-70">
                                {formatFieldValue(field, before)}
                              </div>
                              <div className="px-2 py-1.5 text-green-700 border-b border-gray-100 border-l border-gray-100 font-medium">
                                {formatFieldValue(field, after)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
