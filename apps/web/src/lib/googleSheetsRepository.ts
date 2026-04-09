/**
 * googleSheetsRepository.ts — 클라이언트 전용
 *
 * Google Sheets에 직접 접근하지 않고, Next.js API Route(/api/sheets/*)를 경유합니다.
 * 실제 Google Sheets 인증(Service Account)은 서버 사이드(sheetsService.ts)에서 처리됩니다.
 */

import { Reservation, Room } from './types';
import { IReservationRepository } from './reservationService';
import { SHEET_NAMES, SHEET_HEADERS } from './sheetsSerializer';

export { SHEET_NAMES, SHEET_HEADERS };

// ─── 연결 테스트 ───────────────────────────────────────────────────────────────

export async function testSheetsConnection(sheetId: string): Promise<string> {
  const res = await fetch('/api/sheets/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheetId }),
  });
  const data = await res.json() as { title?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.title!;
}

// ─── 시트 초기화 ───────────────────────────────────────────────────────────────

export async function initializeSheets(config: { sheetId: string }): Promise<{ created: string[]; existing: string[] }> {
  const res = await fetch('/api/sheets/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheetId: config.sheetId }),
  });
  const data = await res.json() as { created?: string[]; existing?: string[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return { created: data.created!, existing: data.existing! };
}

// ─── Repository 생성 ───────────────────────────────────────────────────────────

export function createGoogleSheetsRepository(config: { sheetId: string }): IReservationRepository {
  const { sheetId } = config;

  async function api<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`/api/sheets${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json() as T & { error?: string };
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    return data;
  }

  return {
    async getReservations() {
      return api<Reservation[]>(`/reservations?sheetId=${sheetId}`);
    },

    async getRooms() {
      return api<Room[]>(`/rooms?sheetId=${sheetId}`);
    },

    async addReservations(items, created_by) {
      return api<Reservation[]>('/reservations', {
        method: 'POST',
        body: JSON.stringify({ sheetId, items, created_by }),
      });
    },

    async updateReservation(id, data, changed_by) {
      return api<Reservation>(`/reservations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sheetId, changed_by, ...data }),
      });
    },

    async cancelReservation(id, cancelled_by) {
      await api(`/reservations/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ sheetId, cancelled_by }),
      });
    },

    async cancelReservationsByGroup(groupId, cancelled_by) {
      await api(`/reservations/group/${groupId}`, {
        method: 'DELETE',
        body: JSON.stringify({ sheetId, cancelled_by }),
      });
    },

    async updateReservationsByGroup(groupId, data, changed_by) {
      await api(`/reservations/group/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify({ sheetId, changed_by, ...data }),
      });
    },

    async getHistory(reservationId?) {
      const qs = reservationId ? `&reservationId=${reservationId}` : '';
      return api(`/history?sheetId=${sheetId}${qs}`);
    },

    async addRoom(name, color = '#6d28d9') {
      return api<Room>('/rooms', {
        method: 'POST',
        body: JSON.stringify({ sheetId, name, color }),
      });
    },

    async updateRoom(id, data) {
      return api<Room>(`/rooms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sheetId, ...data }),
      });
    },

    async deleteRoom(id) {
      await api(`/rooms/${id}?sheetId=${sheetId}`, { method: 'DELETE' });
    },
  };
}
