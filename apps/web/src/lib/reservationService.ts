/**
 * reservationService.ts
 *
 * Data-access layer. UI only talks to IReservationRepository.
 * To switch to Google Sheets, implement the same interface in
 * googleSheetsRepository.ts and swap the export at the bottom.
 */

import { Reservation, Room, ReservationHistory, HistoryAction } from './types';
import { MOCK_RESERVATIONS, ROOMS } from './mockData';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IReservationRepository {
  // ── Reservations ──────────────────────────────────────────────────────────
  getReservations(): Promise<Reservation[]>;
  addReservations(
    items: Omit<Reservation, 'reservation_id' | 'created_at' | 'updated_at'>[],
    created_by: string
  ): Promise<Reservation[]>;
  updateReservation(
    id: string,
    data: Partial<Omit<Reservation, 'reservation_id' | 'created_at'>>,
    changed_by: string
  ): Promise<Reservation>;
  cancelReservation(id: string, cancelled_by: string): Promise<void>;
  getHistory(reservationId?: string): Promise<ReservationHistory[]>;

  // ── Rooms ─────────────────────────────────────────────────────────────────
  getRooms(): Promise<Room[]>;
  addRoom(name: string): Promise<Room>;
  updateRoom(id: string, data: Partial<Omit<Room, 'room_id'>>): Promise<Room>;
  deleteRoom(id: string): Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

function logEntry(
  history: ReservationHistory[],
  action: HistoryAction,
  changed_by: string,
  before: Reservation | null,
  after: Reservation | null
): ReservationHistory {
  const entry: ReservationHistory = {
    history_id: makeId('hist'),
    reservation_id: (after ?? before)!.reservation_id,
    action,
    changed_by,
    changed_at: new Date().toISOString(),
    before_snapshot: before,
    after_snapshot: after,
    changed_fields:
      action === 'update' && before && after
        ? diffFields(
            before as unknown as Record<string, unknown>,
            after as unknown as Record<string, unknown>
          ).filter(f => !['updated_at'].includes(f))
        : [],
  };
  history.push(entry);
  return entry;
}

// ─── localStorage keys ────────────────────────────────────────────────────────

const ROOMS_KEY = 'meeting-room-rooms';

function loadRoomsFromStorage(): Room[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ROOMS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Room[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveRoomsToStorage(rooms: Room[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    }
  } catch {
    // ignore
  }
}

// ─── Mock (in-memory + localStorage) implementation ──────────────────────────

export function createMockRepository(
  initialReservations: Reservation[] = MOCK_RESERVATIONS
): IReservationRepository {
  let store = [...initialReservations];
  const history: ReservationHistory[] = [];
  let rooms: Room[] = loadRoomsFromStorage() ?? [...ROOMS];

  // Seed history for initial reservations
  store.forEach(r => {
    history.push({
      history_id: makeId('hist'),
      reservation_id: r.reservation_id,
      action: 'create',
      changed_by: r.reserver_name || 'system',
      changed_at: r.created_at,
      before_snapshot: null,
      after_snapshot: r,
      changed_fields: [],
    });
  });

  return {
    // ── Reservations ────────────────────────────────────────────────────────
    async getReservations() {
      return [...store];
    },

    async addReservations(items, created_by) {
      const now = new Date().toISOString();
      const added: Reservation[] = items.map((item, i) => ({
        ...item,
        reservation_id: `res-${Date.now()}-${i}`,
        created_at: now,
        updated_at: now,
      }));
      store = [...store, ...added];
      added.forEach(r => logEntry(history, 'create', created_by, null, r));
      return added;
    },

    async updateReservation(id, data, changed_by) {
      const before = store.find(r => r.reservation_id === id);
      if (!before) throw new Error(`Reservation ${id} not found`);
      const after: Reservation = { ...before, ...data, updated_at: new Date().toISOString() };
      store = store.map(r => (r.reservation_id === id ? after : r));
      logEntry(history, 'update', changed_by, before, after);
      return after;
    },

    async cancelReservation(id, cancelled_by) {
      const before = store.find(r => r.reservation_id === id);
      if (!before) return;
      const after: Reservation = { ...before, status: 'cancelled', updated_at: new Date().toISOString() };
      store = store.map(r => (r.reservation_id === id ? after : r));
      logEntry(history, 'cancel', cancelled_by, before, after);
    },

    async getHistory(reservationId?) {
      const entries = reservationId
        ? history.filter(h => h.reservation_id === reservationId)
        : [...history];
      return entries.slice().reverse();
    },

    // ── Rooms ────────────────────────────────────────────────────────────────
    async getRooms() {
      return [...rooms].sort((a, b) => a.sort_order - b.sort_order);
    },

    async addRoom(name) {
      const maxOrder = rooms.reduce((m, r) => Math.max(m, r.sort_order), 0);
      const newRoom: Room = {
        room_id: makeId('room'),
        room_name: name.trim(),
        is_active: true,
        sort_order: maxOrder + 1,
      };
      rooms = [...rooms, newRoom];
      saveRoomsToStorage(rooms);
      return newRoom;
    },

    async updateRoom(id, data) {
      const room = rooms.find(r => r.room_id === id);
      if (!room) throw new Error(`Room ${id} not found`);
      const updated: Room = { ...room, ...data };
      rooms = rooms.map(r => (r.room_id === id ? updated : r));
      saveRoomsToStorage(rooms);
      return updated;
    },

    async deleteRoom(id) {
      rooms = rooms.filter(r => r.room_id !== id);
      saveRoomsToStorage(rooms);
    },
  };
}

// ─── Default singleton ────────────────────────────────────────────────────────

export const reservationRepository = createMockRepository();
