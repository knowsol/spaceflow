'use client';

import { useState, useEffect, useCallback } from 'react';
import { Reservation, Room, ReservationHistory } from '@/lib/types';
import { reservationRepository } from '@/lib/reservationService';

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [history, setHistory] = useState<ReservationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [res, rm, hist] = await Promise.all([
        reservationRepository.getReservations(),
        reservationRepository.getRooms(),
        reservationRepository.getHistory(),
      ]);
      setReservations(res);
      setRooms(rm);
      setHistory(hist);
      setIsLoading(false);
    })();
  }, []);

  const refreshHistory = useCallback(async () => {
    const hist = await reservationRepository.getHistory();
    setHistory(hist);
  }, []);

  // ── Reservation CRUD ─────────────────────────────────────────────────────

  const addReservations = useCallback(
    async (
      items: Omit<Reservation, 'reservation_id' | 'created_at' | 'updated_at'>[],
      created_by: string
    ) => {
      const added = await reservationRepository.addReservations(items, created_by);
      setReservations(prev => [...prev, ...added]);
      await refreshHistory();
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
      const updated = await reservationRepository.updateReservation(id, data, changed_by);
      setReservations(prev => prev.map(r => (r.reservation_id === id ? updated : r)));
      await refreshHistory();
      return updated;
    },
    [refreshHistory]
  );

  const cancelReservation = useCallback(
    async (id: string, cancelled_by = '사용자') => {
      await reservationRepository.cancelReservation(id, cancelled_by);
      setReservations(prev =>
        prev.map(r => (r.reservation_id === id ? { ...r, status: 'cancelled' as const } : r))
      );
      await refreshHistory();
    },
    [refreshHistory]
  );

  // ── Room CRUD ────────────────────────────────────────────────────────────

  const addRoom = useCallback(async (name: string) => {
    const newRoom = await reservationRepository.addRoom(name);
    setRooms(prev => [...prev, newRoom].sort((a, b) => a.sort_order - b.sort_order));
    return newRoom;
  }, []);

  const updateRoom = useCallback(async (id: string, data: Partial<Omit<Room, 'room_id'>>) => {
    const updated = await reservationRepository.updateRoom(id, data);
    setRooms(prev =>
      prev.map(r => (r.room_id === id ? updated : r)).sort((a, b) => a.sort_order - b.sort_order)
    );
    return updated;
  }, []);

  const deleteRoom = useCallback(async (id: string) => {
    await reservationRepository.deleteRoom(id);
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
    addRoom,
    updateRoom,
    deleteRoom,
  };
}
