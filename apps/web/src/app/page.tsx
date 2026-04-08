'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import MiniCalendar from '@/components/Calendar/MiniCalendar';
import DayInfo from '@/components/Calendar/DayInfo';
import SummaryCards from '@/components/SummaryCards';
import TimeSlotTable from '@/components/RoomStatus/TimeSlotTable';
import WeekSlotTable from '@/components/RoomStatus/WeekSlotTable';
import ReservationModal from '@/components/ReservationForm/ReservationModal';
import HistoryDrawer from '@/components/History/HistoryDrawer';
import SettingsModal from '@/components/Settings/SettingsModal';
import RoomTabs from '@/components/RoomTabs';
import { useReservations } from '@/hooks/useReservations';
import { useSettings } from '@/hooks/useSettings';
import { formatDate, getWeekDates } from '@/lib/reservationLogic';
import { Reservation } from '@/lib/types';

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
  const [view, setView] = useState<ViewMode>('day');
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const {
    reservations, rooms, history, isLoading,
    addReservations, updateReservation, cancelReservation,
    addRoom, updateRoom, deleteRoom,
  } = useReservations();
  const { settings, updateSettings } = useSettings();

  // rooms가 로드되면 selectedRoomId 초기화 (첫 번째 활성 방)
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      const firstActive = rooms.find(r => r.is_active);
      if (firstActive) setSelectedRoomId(firstActive.room_id);
    }
  }, [rooms, selectedRoomId]);

  // 현재 선택된 방
  const selectedRoom = rooms.find(r => r.room_id === selectedRoomId);

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

  // ── Week navigation ────────────────────────────────────────────────────────
  const shiftWeek = useCallback((delta: number) => {
    const d = new Date(selectedDate.replace(/-/g, '/'));
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(formatDate(d));
  }, [selectedDate]);

  // ── Cancel (ask for name) ──────────────────────────────────────────────────
  const handleCancel = useCallback(
    async (id: string) => {
      const name = window.prompt('취소 처리자 이름을 입력해주세요:');
      if (name === null) return; // user pressed cancel in prompt
      await cancelReservation(id, name.trim() || '사용자');
    },
    [cancelReservation]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={settings.roomName}
        onTodayClick={() => setSelectedDate(today)}
        onReserveClick={() => openCreate()}
        onHistoryClick={() => setHistoryOpen(true)}
        historyCount={history.length}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left sidebar ────────────────────────────────────────────── */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              reservations={roomReservations}
              viewMode={view}
              workDays={settings.workDays}
            />
            <DayInfo
              selectedDate={selectedDate}
              reservations={roomReservations}
              room={selectedRoom}
            />

            {/* ── Admin settings button ──────────────────────────────── */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:text-gray-700 transition-colors group"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" clipRule="evenodd" />
              </svg>
              <span>관리자 환경설정</span>
            </button>
          </aside>

          {/* ── Right main ──────────────────────────────────────────────── */}
          <section className="flex-1 min-w-0 space-y-4">
            <SummaryCards selectedDate={selectedDate} reservations={roomReservations} />

            {/* ── Room tabs ────────────────────────────────────────────── */}
            <RoomTabs
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelect={setSelectedRoomId}
            />

            {/* ── View toggle ─────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setView('day')}
                  className={[
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    view === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  일단위
                </button>
                <button
                  onClick={() => setView('week')}
                  className={[
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  주단위
                </button>
              </div>

              {view === 'week' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => shiftWeek(-1)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-500 min-w-[120px] text-center">
                    {(() => {
                      const s = new Date(weekDates[0].replace(/-/g, '/'));
                      const e = new Date(weekDates[6].replace(/-/g, '/'));
                      if (s.getMonth() === e.getMonth()) {
                        return `${s.getMonth() + 1}월 ${s.getDate()}일 – ${e.getDate()}일`;
                      }
                      return `${s.getMonth() + 1}월 ${s.getDate()}일 – ${e.getMonth() + 1}월 ${e.getDate()}일`;
                    })()}
                  </span>
                  <button
                    onClick={() => shiftWeek(1)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* ── Day / Week table ────────────────────────────────────── */}
            {view === 'day' ? (
              <TimeSlotTable
                selectedDate={selectedDate}
                reservations={roomReservations}
                roomName={selectedRoom?.room_name ?? settings.roomName}
                onReserveSlot={handleSlotReserve}
                onEditReservation={openEdit}
                onCancelReservation={handleCancel}
              />
            ) : (
              <WeekSlotTable
                weekDates={weekDates}
                reservations={roomReservations}
                roomName={selectedRoom?.room_name ?? settings.roomName}
                workDays={settings.workDays}
                onReserveSlot={handleWeekSlotReserve}
                onEditReservation={openEdit}
                onCancelReservation={handleCancel}
              />
            )}
          </section>
        </div>
      </main>

      {/* ── Reservation modal (create / edit) ─────────────────────────── */}
      {modal.open && modal.mode === 'create' && (
        <ReservationModal
          mode="create"
          initialData={modal.initialData}
          reservations={reservations}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onClose={closeModal}
          onSubmit={(items, created_by) => {
            addReservations(items, created_by);
            closeModal();
          }}
        />
      )}

      {modal.open && modal.mode === 'edit' && (
        <ReservationModal
          mode="edit"
          editTarget={modal.editTarget}
          reservations={reservations}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onClose={closeModal}
          onUpdate={(id, data, changed_by) => {
            updateReservation(id, data, changed_by);
            closeModal();
          }}
        />
      )}

      {/* ── History drawer ─────────────────────────────────────────────── */}
      {historyOpen && (
        <HistoryDrawer
          history={history}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {/* ── Settings modal ─────────────────────────────────────────────── */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={() => setSettingsOpen(false)}
          rooms={rooms}
          onAddRoom={addRoom}
          onUpdateRoom={updateRoom}
          onDeleteRoom={deleteRoom}
        />
      )}
    </div>
  );
}
