'use client';

import { useState } from 'react';
import { AppSettings, LayoutWidth, extractSheetId } from '@/lib/settings';
import { Room } from '@/lib/types';
import RightPanel from '@/components/RightPanel';

const ADMIN_PASSWORD = '0301';

type Tab = 'general' | 'rooms' | 'data';
type ConnectionStatus = 'idle' | 'testing' | 'ok' | 'error';

interface Props {
  open: boolean;
  settings: AppSettings;
  rooms: Room[];
  onSave: (next: AppSettings) => void;
  onAddRoom: (name: string, color?: string) => Promise<Room>;
  onUpdateRoom: (id: string, data: Partial<Omit<Room, 'room_id'>>) => Promise<Room>;
  onDeleteRoom: (id: string) => Promise<void>;
  onClose: () => void;
}

// ─── 포인트 컬러 팔레트 ────────────────────────────────────────────────────────
const COLOR_PALETTE = [
  '#6d28d9', '#2563eb', '#0891b2', '#16a34a',
  '#65a30d', '#d97706', '#dc2626', '#db2777',
  '#7c3aed', '#475569',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_PALETTE.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
          style={{
            backgroundColor: c,
            borderColor: value === c ? '#111' : 'transparent',
            boxShadow: value === c ? '0 0 0 1px #fff inset' : undefined,
          }}
          title={c}
        />
      ))}
    </div>
  );
}

export default function SettingsModal({
  open,
  settings,
  rooms,
  onSave,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onClose,
}: Props) {
  // ── Password gate ──────────────────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState(false);

  function handleUnlock() {
    if (password === ADMIN_PASSWORD) {
      setUnlocked(true);
    } else {
      setPwError(true);
      setPassword('');
    }
  }

  // ── Settings draft ─────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('general');
  const [workDays, setWorkDays] = useState<number[]>([...settings.workDays]);
  const [repeatMaxCount, setRepeatMaxCount] = useState(settings.repeatMaxCount ?? 100);
  const [layoutWidth, setLayoutWidth] = useState<LayoutWidth>(settings.layoutWidth ?? 'full');
  const [sheet, setSheet] = useState({ ...settings.sheet });
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('idle');
  const [connMsg, setConnMsg] = useState('');
  const [dirty, setDirty] = useState(false);

  // ── Room management state ──────────────────────────────────────────────────
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#6d28d9');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomColor, setNewRoomColor] = useState('#6d28d9');
  const [roomLoading, setRoomLoading] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function setSheetField<K extends keyof typeof sheet>(k: K, v: (typeof sheet)[K]) {
    setSheet(prev => ({ ...prev, [k]: v }));
    setDirty(true);
    setConnStatus('idle');
  }

  function toggleWorkDay(day: number) {
    if (workDays.includes(day)) {
      if (workDays.length <= 1) return;
      setWorkDays(prev => prev.filter(d => d !== day));
    } else {
      setWorkDays(prev => [...prev, day].sort((a, b) => a - b));
    }
    setDirty(true);
  }

  async function testConnection() {
    if (!sheet.sheetId) { setConnStatus('error'); setConnMsg('Sheet ID를 먼저 입력해주세요.'); return; }
    setConnStatus('testing'); setConnMsg('');
    try {
      const { testSheetsConnection } = await import('@/lib/googleSheetsRepository');
      const title = await testSheetsConnection(sheet.sheetId);
      setConnStatus('ok');
      setConnMsg(`연결 성공: "${title}"`);
    } catch (e) {
      setConnStatus('error');
      setConnMsg(`연결 실패: ${(e as Error).message}`);
    }
  }

  async function initSheets() {
    if (!sheet.sheetId) return;
    setConnStatus('testing'); setConnMsg('');
    try {
      const { initializeSheets } = await import('@/lib/googleSheetsRepository');
      const result = await initializeSheets({ sheetId: sheet.sheetId });
      setConnStatus('ok');
      setConnMsg(
        result.created.length > 0
          ? `초기화 완료. 생성된 탭: ${result.created.join(', ')}`
          : '이미 모든 탭이 존재합니다.'
      );
    } catch (e) {
      setConnStatus('error');
      setConnMsg(`초기화 실패: ${(e as Error).message}`);
    }
  }

  function handleSave() {
    onSave({
      workDays: workDays.length > 0 ? workDays : settings.workDays,
      repeatMaxCount: repeatMaxCount >= 1 ? repeatMaxCount : 100,
      layoutWidth,
      sheet,
    });
    setDirty(false);
    onClose();
  }

  // ── Room management ────────────────────────────────────────────────────────

  async function handleAddRoom() {
    if (!newRoomName.trim()) return;
    setRoomLoading(true);
    await onAddRoom(newRoomName.trim(), newRoomColor);
    setNewRoomName('');
    setNewRoomColor('#6d28d9');
    setRoomLoading(false);
  }

  async function handleUpdateRoom(id: string) {
    if (!editingName.trim()) return;
    setRoomLoading(true);
    await onUpdateRoom(id, { room_name: editingName.trim(), color: editingColor });
    setEditingRoomId(null);
    setRoomLoading(false);
  }

  async function handleToggleActive(room: Room) {
    if (room.is_active) {
      if (!confirm(`"${room.room_name}"을(를) 비활성화하시겠습니까?\n비활성화하면 화면에서 보이지 않게 됩니다.`)) return;
    }
    setRoomLoading(true);
    await onUpdateRoom(room.room_id, { is_active: !room.is_active });
    setRoomLoading(false);
  }

  async function handleDeleteRoom(id: string) {
    if (rooms.length <= 1) return; // 최소 1개 보호
    if (!confirm('이 공간을 삭제하시겠습니까? 기존 예약은 유지됩니다.')) return;
    setRoomLoading(true);
    await onDeleteRoom(id);
    setRoomLoading(false);
  }

  async function handleMoveRoom(id: string, direction: 'up' | 'down') {
    const sorted = [...rooms].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(r => r.room_id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const current = sorted[idx];
    const neighbor = sorted[swapIdx];
    setRoomLoading(true);
    await Promise.all([
      onUpdateRoom(current.room_id,  { sort_order: neighbor.sort_order }),
      onUpdateRoom(neighbor.room_id, { sort_order: current.sort_order }),
    ]);
    setRoomLoading(false);
  }

  // ── Password screen ────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <RightPanel open={open} onClose={onClose}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-sm flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1zm3 8V5.5a3 3 0 1 0-6 0V9h6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">관리자 인증</h2>
              <p className="text-xs text-gray-400">비밀번호를 입력하세요</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-sm hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-start pt-[35vh] px-6 pb-8">
          <div className="space-y-3 w-1/2">
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={e => { setPassword(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
              className={[
                'w-full border rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors',
                pwError ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-[var(--accent)]',
              ].join(' ')}
            />
            {pwError && <p className="text-xs text-red-500">비밀번호가 올바르지 않습니다.</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-sm hover:bg-gray-50 transition-colors">취소</button>
              <button onClick={handleUnlock} className="flex-1 px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-sm hover:bg-[var(--accent-dark)] transition-colors font-medium">확인</button>
            </div>
          </div>
        </div>
      </RightPanel>
    );
  }

  // ── Settings screen ────────────────────────────────────────────────────────
  return (
    <RightPanel open={open} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[var(--accent)] rounded-sm flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">환경설정</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-sm hover:bg-gray-100 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0 px-6 overflow-x-auto">
            {([
              ['general', '기본설정'],
              ['rooms',   '공간관리'],
              ['data',    '데이터연동'],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={[
                  'py-3 px-1 text-sm font-medium border-b-2 mr-5 whitespace-nowrap transition-colors',
                  tab === key ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-gray-400 hover:text-gray-600',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* ── 기본 설정 ──────────────────────────────────────────────── */}
            {tab === 'general' && (
              <div className="space-y-6">

                {/* 근무 요일 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">근무 요일</label>
                  <p className="text-xs text-gray-400 mb-2.5">선택한 요일만 캘린더 선택 및 주간 뷰에 표시됩니다 (최소 1개)</p>
                  <div className="flex gap-1.5">
                    {([0,1,2,3,4,5,6] as const).map(dow => {
                      const labels = ['일','월','화','수','목','금','토'];
                      const selected = workDays.includes(dow);
                      const isLast = workDays.length === 1 && selected;
                      return (
                        <button
                          key={dow}
                          onClick={() => toggleWorkDay(dow)}
                          title={isLast ? '최소 1개 이상 선택해야 합니다' : undefined}
                          className={[
                            'w-9 h-9 rounded-sm text-sm font-medium transition-colors border',
                            selected
                              ? dow === 0 ? 'bg-red-500 text-white border-red-500'
                                : dow === 6 ? 'bg-gray-500 text-white border-gray-500'
                                : 'bg-[var(--accent)] text-white border-[var(--accent)]'
                              : 'border-gray-200 text-gray-400 hover:bg-gray-50',
                            isLast ? 'opacity-60 cursor-not-allowed' : '',
                          ].join(' ')}
                        >
                          {labels[dow]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    선택됨: {workDays.map(d => ['일','월','화','수','목','금','토'][d]).join(' · ')}
                  </p>
                </div>

                {/* 반복 일정 최대 건수 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">반복 일정 최대 생성 건수</label>
                  <p className="text-xs text-gray-400 mb-2">
                    반복 예약 생성 시 허용되는 최대 건수입니다.
                    Google Sheets API 안전 범위는 <span className="font-medium text-gray-600">100건</span> 이하를 권장합니다.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={repeatMaxCount}
                      onChange={e => {
                        const v = parseInt(e.target.value) || 1;
                        setRepeatMaxCount(Math.min(500, Math.max(1, v)));
                        setDirty(true);
                      }}
                      className="w-24 border border-gray-200 rounded-sm px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                    <span className="text-xs text-gray-500">건</span>
                    {repeatMaxCount > 100 && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                        </svg>
                        100건 초과 시 API 속도 제한이 발생할 수 있습니다
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[30, 50, 100].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => { setRepeatMaxCount(v); setDirty(true); }}
                        className={`px-2.5 py-1 text-xs rounded-sm border transition-colors ${
                          repeatMaxCount === v
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {v}건
                      </button>
                    ))}
                  </div>
                </div>

                {/* 화면 가로 너비 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PC 화면 가로 너비</label>
                  <p className="text-xs text-gray-400 mb-2.5">콘텐츠 영역의 최대 가로 너비를 지정합니다.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['full', 1920, 1600, 1400, 1200, 1000] as LayoutWidth[]).map(opt => (
                      <button
                        key={String(opt)}
                        type="button"
                        onClick={() => { setLayoutWidth(opt); setDirty(true); }}
                        className={`px-3 py-1.5 text-xs rounded-sm border transition-colors font-medium ${
                          layoutWidth === opt
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {opt === 'full' ? '전체 화면' : `${opt}px`}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ── 공간 관리 ───────────────────────────────────────────────── */}
            {tab === 'rooms' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">비활성화된 공간은 화면에 표시되지 않습니다. 최소 1개 이상 유지해야 합니다.</p>

                <div className="space-y-2">
                  {[...rooms].sort((a, b) => a.sort_order - b.sort_order).map((room, idx, sorted) => (
                    <div key={room.room_id} className="border border-gray-100 rounded-sm bg-gray-50 overflow-hidden">
                      {editingRoomId === room.room_id ? (
                        /* ── 편집 모드 ── */
                        <div className="p-3 space-y-2.5">
                          <input
                            type="text"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') setEditingRoomId(null); }}
                            autoFocus
                            className="w-full border border-gray-300 rounded-sm px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          />
                          <div>
                            <p className="text-xs text-gray-500 mb-1.5">포인트 컬러</p>
                            <ColorPicker value={editingColor} onChange={setEditingColor} />
                          </div>
                          <div className="flex gap-1.5 pt-0.5">
                            <button onClick={() => handleUpdateRoom(room.room_id)} disabled={roomLoading} className="px-3 py-1.5 text-xs bg-[var(--accent)] text-white rounded-sm hover:bg-[var(--accent-dark)] transition-colors font-medium">저장</button>
                            <button onClick={() => setEditingRoomId(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-sm hover:bg-gray-100 transition-colors">취소</button>
                          </div>
                        </div>
                      ) : (
                        /* ── 표시 모드 ── */
                        <div className="flex items-center gap-2.5 px-3 py-2.5">
                          {/* 순서 변경 버튼 */}
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => handleMoveRoom(room.room_id, 'up')}
                              disabled={idx === 0 || roomLoading}
                              className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              title="위로"
                            >
                              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l4 4a.5.5 0 0 1-.708.708L8 5.707l-3.646 3.647a.5.5 0 0 1-.708-.708l4-4z" clipRule="evenodd"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleMoveRoom(room.room_id, 'down')}
                              disabled={idx === sorted.length - 1 || roomLoading}
                              className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              title="아래로"
                            >
                              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                          {/* 포인트 컬러 스와치 */}
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10"
                            style={{ backgroundColor: room.color || '#6d28d9' }}
                          />
                          <span className="flex-1 text-sm text-gray-800 font-medium">{room.room_name}</span>
                          {!room.is_active && (
                            <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-sm">비활성</span>
                          )}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => { setEditingRoomId(room.room_id); setEditingName(room.room_name); setEditingColor(room.color || '#6d28d9'); }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-sm transition-colors"
                              title="수정"
                            >
                              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleToggleActive(room)}
                              className={`p-1.5 rounded-sm transition-colors ${room.is_active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                              title={room.is_active ? '비활성화' : '활성화'}
                            >
                              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                {room.is_active
                                  ? <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7z"/>
                                  : <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                }
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.room_id)}
                              disabled={rooms.length <= 1}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={rooms.length <= 1 ? '최소 1개 이상 유지해야 합니다' : '삭제'}
                            >
                              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 새 공간 추가 */}
                <div className="border border-dashed border-gray-200 rounded-sm p-3 space-y-2.5">
                  <p className="text-xs font-medium text-gray-500">새 공간 추가</p>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
                    placeholder="공간 이름"
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">포인트 컬러</p>
                    <ColorPicker value={newRoomColor} onChange={setNewRoomColor} />
                  </div>
                  <button
                    onClick={handleAddRoom}
                    disabled={!newRoomName.trim() || roomLoading}
                    className="w-full py-2 text-sm bg-[var(--accent)] text-white rounded-sm hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-40 font-medium"
                  >
                    + 추가
                  </button>
                </div>
              </div>
            )}

            {/* ── 데이터 연동 ─────────────────────────────────────────────── */}
            {tab === 'data' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-sm">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Google Sheets 연동 사용</p>
                    <p className="text-xs text-gray-400 mt-0.5">활성화 시 스프레드시트에서 데이터를 불러옵니다</p>
                  </div>
                  <button
                    onClick={() => setSheetField('enabled', !sheet.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${sheet.enabled ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${sheet.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className={sheet.enabled ? '' : 'opacity-50 pointer-events-none'}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Google Sheet URL 또는 ID</label>
                      <input
                        type="text"
                        value={sheet.sheetId}
                        onChange={e => setSheetField('sheetId', extractSheetId(e.target.value))}
                        placeholder="https://docs.google.com/spreadsheets/d/... 또는 Sheet ID"
                        className="w-full border border-gray-200 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                      {sheet.sheetId && <p className="text-xs text-gray-500 mt-1">Sheet ID: <span className="font-mono">{sheet.sheetId}</span></p>}
                    </div>
                    {/* 연결 테스트 + 시트 초기화 */}
                    <div className="flex gap-2">
                      <button
                        onClick={testConnection}
                        disabled={connStatus === 'testing'}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {connStatus === 'testing'
                          ? <svg className="w-4 h-4 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          : <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                        }
                        연결 테스트
                      </button>
                      <button
                        onClick={initSheets}
                        disabled={connStatus === 'testing' || !sheet.sheetId}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
                        </svg>
                        시트 초기화
                      </button>
                    </div>

                    {connStatus !== 'idle' && connStatus !== 'testing' && (
                      <div className={`flex items-start gap-2 px-3 py-2 rounded-sm text-xs ${connStatus === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        <span className="mt-0.5 flex-shrink-0">{connStatus === 'ok' ? '✓' : '✗'}</span>
                        <span>{connMsg}</span>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-sm p-3.5 text-xs text-gray-700 space-y-1.5">
                      <p className="font-medium">스프레드시트 구조 (자동 생성)</p>
                      <div className="space-y-1 text-gray-500">
                        <p><span className="font-mono bg-gray-200 px-1 rounded-sm">rooms</span> — room_id, room_name, is_active, sort_order, created_at</p>
                        <p><span className="font-mono bg-gray-200 px-1 rounded-sm">reservations</span> — reservation_id, room_id, title, reserver_name, purpose, date, start_time, end_time, all_day, repeat_*, status, ...</p>
                        <p><span className="font-mono bg-gray-200 px-1 rounded-sm">history</span> — history_id, reservation_id, action, changed_by, changed_at, changed_fields, before_json, after_json</p>
                      </div>
                      <p className="text-gray-400 mt-1">「시트 초기화」 버튼을 누르면 3개 탭과 헤더 행이 자동 생성됩니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
      </div>

      {/* Dirty warning banner */}
      {tab === 'general' && dirty && (
        <div className="mx-6 mb-0 mt-0 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-sm flex items-center gap-2 flex-shrink-0">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          <p className="text-xs font-medium text-amber-700">저장되지 않은 변경사항이 있습니다.</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-sm hover:bg-gray-50 transition-colors">닫기</button>
        {tab === 'general' && (
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-sm hover:bg-[var(--accent-dark)] transition-colors font-medium">저장</button>
        )}
      </div>
    </RightPanel>
  );
}
