'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import MiniCalendar from '@/components/Calendar/MiniCalendar';
import DayInfo from '@/components/Calendar/DayInfo';
import SummaryCards from '@/components/SummaryCards';
import TimeSlotTable from '@/components/RoomStatus/TimeSlotTable';
import WeekSlotTable from '@/components/RoomStatus/WeekSlotTable';
import ReservationModal from '@/components/ReservationForm/ReservationModal';
import HistoryDrawer from '@/components/History/HistoryDrawer';
import SettingsModal from '@/components/Settings/SettingsModal';
import CancelConfirmModal from '@/components/CancelConfirmModal';
import { useReservations } from '@/hooks/useReservations';
import { useSettings } from '@/hooks/useSettings';
import { formatDate, getWeekDates } from '@/lib/reservationLogic';
import { Reservation } from '@/lib/types';
import { applyAccentColor } from '@/lib/colorUtils';

type ViewMode = 'day' | 'week';

// ─── Modal state types ────────────────────────────────────────────────────────

type ModalState =
  | { open: false }
  | { open: true; mode: 'create'; initialData?: Partial<{ date: string; start_time: string; end_time: string }> }
  | { open: true; mode: 'edit'; editTarget: Reservation };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const today = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<ViewMode>('week');
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [defaultRoomId, setDefaultRoomId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('meeting-room-default-room') ?? '';
  });

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const {
    reservations, rooms, history, isLoading,
    addReservations, updateReservation, cancelReservation,
    cancelReservationsByGroup, updateReservationsByGroup,
    addRoom, updateRoom, deleteRoom,
  } = useReservations();
  const { settings, updateSettings } = useSettings();

  // rooms 로드 시 초기 공간 결정:
  // 1) defaultRoomId(localStorage)가 활성 방이면 그 방
  // 2) 아니면 첫 번째 활성 방
  useEffect(() => {
    const activeRooms = rooms.filter(r => r.is_active);
    if (activeRooms.length === 0) return;
    const isValid = activeRooms.some(r => r.room_id === selectedRoomId);
    if (!isValid) {
      const preferred = activeRooms.find(r => r.room_id === defaultRoomId);
      setSelectedRoomId(preferred ? preferred.room_id : activeRooms[0].room_id);
    }
  }, [rooms]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSetDefaultRoom(roomId: string) {
    setDefaultRoomId(roomId);
    localStorage.setItem('meeting-room-default-room', roomId);
  }

  // 현재 선택된 방
  const selectedRoom = rooms.find(r => r.room_id === selectedRoomId);

  // 선택된 공간의 포인트 컬러를 전역 CSS 변수로 적용
  useEffect(() => {
    if (selectedRoom?.color) {
      applyAccentColor(selectedRoom.color);
    }
  }, [selectedRoom?.color]);

  // 선택된 방의 예약만 필터링
  const roomReservations = useMemo(
    () => reservations.filter(r => r.room_id === selectedRoomId),
    [reservations, selectedRoomId]
  );

  // ── Open create modal ──────────────────────────────────────────────────────
  const openCreate = useCallback(
    (data?: Partial<{ date: string; start_time: string; end_time: string }>) => {
      setModal({ open: true, mode: 'create', initialData: data ?? { date: selectedDate } });
    },
    [selectedDate]
  );

  // ── Open edit modal ────────────────────────────────────────────────────────
  const openEdit = useCallback((reservation: Reservation) => {
    setModal({ open: true, mode: 'edit', editTarget: reservation });
  }, []);

  const closeModal = useCallback(() => setModal({ open: false }), []);

  // ── Slot quick-reserve (day view) ─────────────────────────────────────────
  const handleSlotReserve = useCallback(
    (hour: number) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      openCreate({
        date: selectedDate,
        start_time: `${pad(hour)}:00`,
        end_time: `${pad(hour + 1)}:00`,
      });
    },
    [selectedDate, openCreate]
  );

  // ── Slot quick-reserve (week view) ────────────────────────────────────────
  const handleWeekSlotReserve = useCallback(
    (date: string, hour: number) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      openCreate({
        date,
        start_time: `${pad(hour)}:00`,
        end_time: `${pad(hour + 1)}:00`,
      });
    },
    [openCreate]
  );

  // ── Day / Week navigation ─────────────────────────────────────────────────
  const shiftDay = useCallback((delta: number) => {
    const d = new Date(selectedDate.replace(/-/g, '/'));
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDate(d));
  }, [selectedDate]);

  const shiftWeek = useCallback((delta: number) => {
    const d = new Date(selectedDate.replace(/-/g, '/'));
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(formatDate(d));
  }, [selectedDate]);

  // ── Cancel (open confirm modal) ───────────────────────────────────────────
  const handleCancel = useCallback(
    (id: string) => {
      const target = reservations.find(r => r.reservation_id === id);
      if (target) setCancelTarget(target);
    },
    [reservations]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
        {/* 귀여운 캘린더 로딩 아이콘 */}
        <div className="relative">
          {/* 캘린더 본체 */}
          <div className="w-16 h-16 bg-white rounded-xl shadow-md border border-gray-100 flex flex-col overflow-hidden">
            <div className="bg-[var(--accent-mid)] h-4 w-full flex items-center justify-center gap-1">
              <div className="w-1 h-1 rounded-full bg-white/70" />
              <div className="w-1 h-1 rounded-full bg-white/70" />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-px p-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-sm bg-[var(--accent-light)]"
                  style={{
                    animation: `pulse 1.2s ease-in-out ${i * 0.08}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
          {/* 튀어오르는 점 3개 */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-end gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--accent-mid)]"
                style={{
                  animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); opacity: 0.5; }
            50% { transform: translateY(-6px); opacity: 1; }
          }
          @keyframes ellipsis {
            0%  { width: 0; }
            33% { width: 0.5em; }
            66% { width: 1em; }
            100%{ width: 1.5em; }
          }
        `}</style>
      </div>
    );
  }

  const maxW = settings.layoutWidth === 'full' ? undefined : `${settings.layoutWidth}px`;
  const constrainStyle: React.CSSProperties | undefined = maxW
    ? { maxWidth: maxW, width: '100%', marginLeft: 'auto', marginRight: 'auto' }
    : undefined;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Header
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        onHistoryClick={() => setHistoryOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
        historyCount={history.length}
        innerStyle={constrainStyle}
      />

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="bg-white flex flex-col lg:flex-row flex-1 min-h-0" style={constrainStyle}>
          {/* ── Left main (schedule) ────────────────────────────────────── */}
          <section className="flex-1 min-w-0 min-h-0 flex flex-col gap-4 px-4 py-4 pb-24 lg:pb-4 lg:order-1">

            {/* ── Day / Week table ────────────────────────────────────── */}
            <div className="flex-1 min-h-0">
              {/* 공통 뷰 스위처 */}
            {(() => {
                const viewSwitcher = (
                  <div className="flex bg-gray-100 rounded-sm p-0.5">
                    <button onClick={() => setView('day')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${view === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>일단위</button>
                    <button onClick={() => setView('week')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>주단위</button>
                  </div>
                );
                return view === 'day' ? (
                  <TimeSlotTable
                    selectedDate={selectedDate}
                    reservations={roomReservations}
                    roomName={selectedRoom?.room_name}
                    headerActions={viewSwitcher}
                    onPrevDay={() => shiftDay(-1)}
                    onNextDay={() => shiftDay(1)}
                    onReserveSlot={handleSlotReserve}
                    onEditReservation={openEdit}
                    onCancelReservation={handleCancel}
                  />
                ) : (
                  <WeekSlotTable
                    weekDates={weekDates}
                    reservations={roomReservations}
                    roomName={selectedRoom?.room_name}
                    workDays={settings.workDays}
                    onPrevWeek={() => shiftWeek(-1)}
                    onNextWeek={() => shiftWeek(1)}
                    headerActions={viewSwitcher}
                    onReserveSlot={handleWeekSlotReserve}
                    onEditReservation={openEdit}
                    onCancelReservation={handleCancel}
                  />
                );
              })()}
            </div>
          </section>

          {/* ── Right sidebar (PC only) ─────────────────────────────────── */}
          <aside className="hidden lg:flex lg:flex-col lg:w-72 flex-shrink-0 gap-4 overflow-y-auto px-4 py-4 lg:order-2 lg:border-l border-gray-100">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onTodayClick={() => setSelectedDate(today)}
              reservations={roomReservations}
              viewMode={view}
              workDays={settings.workDays}
            />

            {/* ── 예약하기 버튼 ────────────────────────────────────────── */}
            <button
              onClick={() => openCreate()}
              className="w-full px-4 py-3 text-sm bg-[var(--accent)] text-white rounded-sm hover:bg-[var(--accent-dark)] transition-colors font-medium"
            >
              + 예약하기
            </button>

            <DayInfo
              selectedDate={selectedDate}
              reservations={roomReservations}
              room={selectedRoom}
              defaultRoomId={defaultRoomId}
              onSetDefault={handleSetDefaultRoom}
            />
          </aside>

          {/* ── 모바일 플로팅 예약하기 버튼 ─────────────────────────────── */}
          <button
            onClick={() => openCreate()}
            className="lg:hidden fixed bottom-6 right-6 z-30 flex items-center gap-2 px-5 py-3.5 bg-[var(--accent)] text-white text-sm font-semibold rounded-full shadow-lg hover:bg-[var(--accent-dark)] active:scale-95 transition-all"
            style={{ boxShadow: '0 4px 20px rgba(var(--accent-rgb), 0.45)' }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
            </svg>
            예약하기
          </button>

        </div>
      </main>

      {/* ── Reservation panel (create) ────────────────────────────────── */}
      <ReservationModal
        open={modal.open && modal.mode === 'create'}
        mode="create"
        initialData={modal.open && modal.mode === 'create' ? modal.initialData : undefined}
        reservations={reservations}
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        repeatMaxCount={settings.repeatMaxCount}
        onClose={closeModal}
        onSubmit={async (items, created_by) => {
          await addReservations(items, created_by);
          closeModal();
        }}
      />

      {/* ── Reservation panel (edit) ──────────────────────────────────── */}
      {modal.open && modal.mode === 'edit' && (
        <ReservationModal
          open={true}
          mode="edit"
          editTarget={modal.editTarget}
          reservations={reservations}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          repeatMaxCount={settings.repeatMaxCount}
          onClose={closeModal}
          onUpdate={async (id, data, changed_by, scope) => {
            if (scope === 'group') {
              const target = reservations.find(r => r.reservation_id === id);
              if (target?.repeat_group_id) {
                await updateReservationsByGroup(target.repeat_group_id, data, changed_by);
              } else {
                await updateReservation(id, data, changed_by);
              }
            } else {
              await updateReservation(id, data, changed_by);
            }
            closeModal();
          }}
        />
      )}

      {/* ── Cancel confirm modal (레이어 팝업 유지) ───────────────────── */}
      {cancelTarget && (
        <CancelConfirmModal
          reservation={cancelTarget}
          roomName={rooms.find(r => r.room_id === cancelTarget.room_id)?.room_name}
          onConfirm={async (cancelledBy, scope) => {
            if (scope === 'group' && cancelTarget.repeat_group_id) {
              await cancelReservationsByGroup(cancelTarget.repeat_group_id, cancelledBy);
            } else {
              await cancelReservation(cancelTarget.reservation_id, cancelledBy);
            }
            setCancelTarget(null);
          }}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {/* ── History panel ─────────────────────────────────────────────── */}
      <HistoryDrawer
        open={historyOpen}
        history={history}
        onClose={() => setHistoryOpen(false)}
      />

      {/* ── Settings panel ────────────────────────────────────────────── */}
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onSave={updateSettings}
        onClose={() => setSettingsOpen(false)}
        rooms={rooms}
        onAddRoom={addRoom}
        onUpdateRoom={updateRoom}
        onDeleteRoom={deleteRoom}
      />
    </div>
  );
}
