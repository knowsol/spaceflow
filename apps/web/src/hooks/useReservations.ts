'use client';

import { useState, useEffect, useCallback } from 'react';
import { Reservation, Room, ReservationHistory } from '@/lib/types';
import { IReservationRepository, reservationRepository as mockRepo } from '@/lib/reservationService';
import { loadSettings } from '@/lib/settings';

/** settings.sheet.enabled + sheetId 여부에 따라 레포지터리 선택 */
function getRepository(): IReservationRepository {
  if (typeof window === 'undefined') return mockRepo;
  const s = loadSettings();
  if (s.sheet.enabled && s.sheet.sheetId) {
    // 동적 import 없이 클라이언트 번들에 포함 (lazy 로딩 아님)
    const { createGoogleSheetsRepository } = require('@/lib/googleSheetsRepository');
    return createGoogleSheetsRepository({ sheetId: s.sheet.sheetId }) as IReservationRepository;
  }
  return mockRepo;
}

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [history, setHistory] = useState<ReservationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // settings 변경 감지를 위해 storage 이벤트도 구독
  const [repoKey, setRepoKey] = useState(0);

  useEffect(() => {
    // 다른 탭: storage 이벤트
    function onStorageChange(e: StorageEvent) {
      if (e.key === 'meeting-room-settings') setRepoKey(k => k + 1);
    }
    // 같은 탭: 커스텀 이벤트
    function onSettingsUpdated() { setRepoKey(k => k + 1); }
    window.addEventListener('storage', onStorageChange);
    window.addEventListener('settings-updated', onSettingsUpdated);
    return () => {
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener('settings-updated', onSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const repo = getRepository();
    (async () => {
      try {
        let [res, rm, hist] = await Promise.all([
          repo.getReservations(),
          repo.getRooms(),
          repo.getHistory(),
        ]);

        // 회의실이 하나도 없으면 기본 회의실 자동 생성 (mock 모드 전용)
        // Google Sheets 모드에서는 자동 생성 안함 — 사용자가 설정에서 직접 추가해야 함
        if (rm.length === 0) {
          const s = loadSettings();
          const isSheetsMode = s.sheet.enabled && !!s.sheet.sheetId;
          if (!isSheetsMode) {
            try {
              const defaultRoom = await repo.addRoom('회의실');
              rm = [defaultRoom];
            } catch {
              // 자동 생성 실패 시 무시 (오프라인 등)
            }
          }
        }

        setReservations(res);
        setRooms(rm);
        setHistory(hist);
      } catch {
        // 데이터 로드 실패 시에도 로딩 해제 (무한 로딩 방지)
      } finally {
        setIsLoading(false);
      }
    })();
  }, [repoKey]);

  const refreshHistory = useCallback(async () => {
    const hist = await getRepository().getHistory();
    setHistory(hist);
  }, []);

  // ── Reservation CRUD ─────────────────────────────────────────────────────

  const addReservations = useCallback(
    async (
      items: Omit<Reservation, 'reservation_id' | 'created_at' | 'updated_at'>[],
      created_by: string
    ) => {
      const added = await getRepository().addReservations(items, created_by);
      setReservations(prev => [...prev, ...added]);
      try { await refreshHistory(); } catch { }
      return added;
    },
    [refreshHistory]
  );

  const updateReservation = useCallback(
    async (
      id: string,
      data: Partial<Omit<Reservation, 'reservation_id' | 'created_at'>>,
      changed_by: string
    ) => {
      const updated = await getRepository().updateReservation(id, data, changed_by);
      setReservations(prev => prev.map(r => (r.reservation_id === id ? updated : r)));
      try { await refreshHistory(); } catch { }
      return updated;
    },
    [refreshHistory]
  );

  const cancelReservation = useCallback(
    async (id: string, cancelled_by = '사용자') => {
      await getRepository().cancelReservation(id, cancelled_by);
      setReservations(prev =>
        prev.map(r => (r.reservation_id === id ? { ...r, status: 'cancelled' as const } : r))
      );
      try { await refreshHistory(); } catch { }
    },
    [refreshHistory]
  );

  const cancelReservationsByGroup = useCallback(
    async (groupId: string, cancelled_by = '사용자') => {
      await getRepository().cancelReservationsByGroup(groupId, cancelled_by);
      setReservations(prev =>
        prev.map(r => (r.repeat_group_id === groupId ? { ...r, status: 'cancelled' as const } : r))
      );
      try { await refreshHistory(); } catch { }
    },
    [refreshHistory]
  );

  const updateReservationsByGroup = useCallback(
    async (
      groupId: string,
      data: Partial<Omit<import('@/lib/types').Reservation, 'reservation_id' | 'created_at' | 'date'>>,
      changed_by: string
    ) => {
      await getRepository().updateReservationsByGroup(groupId, data, changed_by);
      setReservations(prev =>
        prev.map(r =>
          r.repeat_group_id === groupId && r.status !== 'cancelled'
            ? { ...r, ...data, updated_at: new Date().toISOString() }
            : r
        )
      );
      try { await refreshHistory(); } catch { }
    },
    [refreshHistory]
  );

  // ── Room CRUD ────────────────────────────────────────────────────────────

  const addRoom = useCallback(async (name: string, color?: string) => {
    const newRoom = await getRepository().addRoom(name, color);
    setRooms(prev => [...prev, newRoom].sort((a, b) => a.sort_order - b.sort_order));
    return newRoom;
  }, []);

  const updateRoom = useCallback(async (id: string, data: Partial<Omit<Room, 'room_id'>>) => {
    const updated = await getRepository().updateRoom(id, data);
    setRooms(prev =>
      prev.map(r => (r.room_id === id ? updated : r)).sort((a, b) => a.sort_order - b.sort_order)
    );
    return updated;
  }, []);

  const deleteRoom = useCallback(async (id: string) => {
    await getRepository().deleteRoom(id);
    setRooms(prev => prev.filter(r => r.room_id !== id));
  }, []);

  return {
    reservations,
    rooms,
    history,
    isLoading,
    addReservations,
    updateReservation,
    cancelReservation,
    cancelReservationsByGroup,
    updateReservationsByGroup,
    addRoom,
    updateRoom,
    deleteRoom,
  };
}
