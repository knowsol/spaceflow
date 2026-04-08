/**
 * googleSheetsRepository.ts
 *
 * Google Sheets 기반 IReservationRepository 구현체.
 * - 최초 연결 시 sheets(tabs) + 헤더 행 자동 생성
 * - REST API v4 (fetch) 방식, API 키 사용 (공개 읽기)
 * - 쓰기 작업은 Service Account 또는 OAuth 필요 (현재 구조만 준비, 활성화 예정)
 *
 * ══════════════════════════════════════════════════════
 *  스프레드시트 구조 (3개 탭)
 * ══════════════════════════════════════════════════════
 *
 *  [rooms] 탭
 *  │ room_id │ room_name │ is_active │ sort_order │ created_at │
 *
 *  [reservations] 탭
 *  │ reservation_id │ room_id │ title │ reserver_name │ purpose │
 *  │ date │ start_time │ end_time │ all_day │ repeat_type │
 *  │ repeat_interval │ repeat_days │ repeat_start_date │ repeat_end_date │
 *  │ repeat_group_id │ status │ created_at │ updated_at │
 *
 *  [history] 탭
 *  │ history_id │ reservation_id │ action │ changed_by │ changed_at │
 *  │ changed_fields │ before_json │ after_json │
 *
 *  * repeat_days → 쉼표 구분 문자열 "0,1,2"
 *  * all_day / is_active → "TRUE" / "FALSE"
 *  * before_json / after_json → JSON.stringify 문자열
 * ══════════════════════════════════════════════════════
 */

import { Reservation, Room, ReservationHistory } from './types';
import { IReservationRepository } from './reservationService';

// ─── Sheet definitions ────────────────────────────────────────────────────────

export const SHEET_NAMES = {
  rooms: 'rooms',
  reservations: 'reservations',
  history: 'history',
} as const;

export const SHEET_HEADERS: Record<keyof typeof SHEET_NAMES, string[]> = {
  rooms: ['room_id', 'room_name', 'is_active', 'sort_order', 'created_at'],
  reservations: [
    'reservation_id', 'room_id', 'title', 'reserver_name', 'purpose',
    'date', 'start_time', 'end_time', 'all_day',
    'repeat_type', 'repeat_interval', 'repeat_days',
    'repeat_start_date', 'repeat_end_date', 'repeat_group_id',
    'status', 'created_at', 'updated_at',
  ],
  history: [
    'history_id', 'reservation_id', 'action', 'changed_by', 'changed_at',
    'changed_fields', 'before_json', 'after_json',
  ],
};

// ─── Serialization helpers ────────────────────────────────────────────────────

/** Reservation → row array (order matches SHEET_HEADERS.reservations) */
function serializeReservation(r: Reservation): string[] {
  return [
    r.reservation_id,
    r.room_id,
    r.title,
    r.reserver_name,
    r.purpose,
    r.date,
    r.start_time,
    r.end_time,
    r.all_day ? 'TRUE' : 'FALSE',
    r.repeat_type,
    String(r.repeat_interval),
    r.repeat_days.join(','),
    r.repeat_start_date ?? '',
    r.repeat_end_date ?? '',
    r.repeat_group_id ?? '',
    r.status,
    r.created_at,
    r.updated_at,
  ];
}

/** Row array → Reservation */
function deserializeReservation(row: string[]): Reservation {
  const [
    reservation_id, room_id, title, reserver_name, purpose,
    date, start_time, end_time, all_day,
    repeat_type, repeat_interval, repeat_days,
    repeat_start_date, repeat_end_date, repeat_group_id,
    status, created_at, updated_at,
  ] = row;
  return {
    reservation_id,
    room_id,
    title,
    reserver_name,
    purpose,
    date,
    start_time,
    end_time,
    all_day: all_day === 'TRUE',
    repeat_type: (repeat_type || 'none') as Reservation['repeat_type'],
    repeat_interval: parseInt(repeat_interval || '1', 10),
    repeat_days: repeat_days ? repeat_days.split(',').map(Number).filter(n => !isNaN(n)) : [],
    repeat_start_date: repeat_start_date || null,
    repeat_end_date: repeat_end_date || null,
    repeat_group_id: repeat_group_id || null,
    status: (status || 'confirmed') as Reservation['status'],
    created_at: created_at || new Date().toISOString(),
    updated_at: updated_at || new Date().toISOString(),
  };
}

/** Room → row array */
function serializeRoom(r: Room): string[] {
  return [
    r.room_id,
    r.room_name,
    r.is_active ? 'TRUE' : 'FALSE',
    String(r.sort_order),
    new Date().toISOString(),
  ];
}

/** Row array → Room */
function deserializeRoom(row: string[]): Room {
  const [room_id, room_name, is_active, sort_order] = row;
  return {
    room_id,
    room_name,
    is_active: is_active === 'TRUE',
    sort_order: parseInt(sort_order || '0', 10),
  };
}

/** History → row array */
function serializeHistory(h: ReservationHistory): string[] {
  return [
    h.history_id,
    h.reservation_id,
    h.action,
    h.changed_by,
    h.changed_at,
    h.changed_fields.join(','),
    h.before_snapshot ? JSON.stringify(h.before_snapshot) : '',
    h.after_snapshot ? JSON.stringify(h.after_snapshot) : '',
  ];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

interface SheetsConfig {
  sheetId: string;
  apiKey: string;
  sheetName: string; // 기준 탭명 (미사용, 구조상 보존)
}

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function sheetsGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function sheetsPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function sheetsPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Sheet initializer ────────────────────────────────────────────────────────

/**
 * 최초 연결 시:
 *  1. 스프레드시트의 현재 탭 목록 조회
 *  2. rooms / reservations / history 탭이 없으면 자동 생성
 *  3. 각 탭의 1행에 헤더 컬럼 기입 (비어있는 경우만)
 */
export async function initializeSheets(config: SheetsConfig): Promise<{
  created: string[];
  existing: string[];
}> {
  const { sheetId, apiKey } = config;

  // 1. 현재 탭 목록 조회
  interface SpreadsheetMeta {
    sheets: { properties: { title: string; sheetId: number } }[];
  }
  const meta = await sheetsGet<SpreadsheetMeta>(
    `${BASE}/${sheetId}?fields=sheets.properties&key=${apiKey}`
  );
  const existingTabs = meta.sheets.map(s => s.properties.title);

  const created: string[] = [];
  const existing: string[] = [];

  // 2. 필요한 탭 생성
  const tabsToCreate = Object.values(SHEET_NAMES).filter(name => !existingTabs.includes(name));

  if (tabsToCreate.length > 0) {
    await sheetsPost(
      `${BASE}/${sheetId}:batchUpdate?key=${apiKey}`,
      {
        requests: tabsToCreate.map(title => ({
          addSheet: { properties: { title } },
        })),
      }
    );
    created.push(...tabsToCreate);
  }

  existing.push(...Object.values(SHEET_NAMES).filter(n => existingTabs.includes(n)));

  // 3. 각 탭 헤더 확인 후 기입
  for (const tabName of Object.keys(SHEET_NAMES) as (keyof typeof SHEET_NAMES)[]) {
    const headers = SHEET_HEADERS[tabName];
    const rangeUrl = `${BASE}/${sheetId}/values/${tabName}!A1:A1?key=${apiKey}`;

    interface ValuesResponse { values?: string[][] }
    const firstCell = await sheetsGet<ValuesResponse>(rangeUrl).catch(() => ({ values: [] }));

    // 헤더가 없으면 기입
    if (!firstCell.values || firstCell.values.length === 0) {
      await sheetsPut(
        `${BASE}/${sheetId}/values/${tabName}!A1?valueInputOption=RAW&key=${apiKey}`,
        { values: [headers] }
      );
    }
  }

  return { created, existing };
}

// ─── Google Sheets Repository ─────────────────────────────────────────────────

export function createGoogleSheetsRepository(config: SheetsConfig): IReservationRepository {
  const { sheetId, apiKey } = config;

  async function readSheet(tab: string): Promise<string[][]> {
    interface ValuesResponse { values?: string[][] }
    const res = await sheetsGet<ValuesResponse>(
      `${BASE}/${sheetId}/values/${tab}?key=${apiKey}`
    );
    const rows = res.values ?? [];
    return rows.slice(1); // skip header row
  }

  async function appendRow(tab: string, row: string[]): Promise<void> {
    await sheetsPost(
      `${BASE}/${sheetId}/values/${tab}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&key=${apiKey}`,
      { values: [row] }
    );
  }

  async function updateRow(tab: string, rowIndex: number, row: string[]): Promise<void> {
    // rowIndex is 0-based data row → sheet row = rowIndex + 2 (1-based + header)
    const sheetRow = rowIndex + 2;
    await sheetsPut(
      `${BASE}/${sheetId}/values/${tab}!A${sheetRow}?valueInputOption=RAW&key=${apiKey}`,
      { values: [row] }
    );
  }

  return {
    async getReservations() {
      const rows = await readSheet(SHEET_NAMES.reservations);
      return rows.filter(r => r.length > 0).map(deserializeReservation);
    },

    async getRooms() {
      const rows = await readSheet(SHEET_NAMES.rooms);
      return rows.filter(r => r.length > 0).map(deserializeRoom)
        .sort((a, b) => a.sort_order - b.sort_order);
    },

    async addReservations(items, created_by) {
      const now = new Date().toISOString();
      const added: Reservation[] = items.map((item, i) => ({
        ...item,
        reservation_id: `res-${Date.now()}-${i}`,
        created_at: now,
        updated_at: now,
      }));
      for (const r of added) {
        await appendRow(SHEET_NAMES.reservations, serializeReservation(r));
        const histEntry: ReservationHistory = {
          history_id: `hist-${Date.now()}`,
          reservation_id: r.reservation_id,
          action: 'create',
          changed_by: created_by,
          changed_at: now,
          before_snapshot: null,
          after_snapshot: r,
          changed_fields: [],
        };
        await appendRow(SHEET_NAMES.history, serializeHistory(histEntry));
      }
      return added;
    },

    async updateReservation(id, data, changed_by) {
      const rows = await readSheet(SHEET_NAMES.reservations);
      const idx = rows.findIndex(r => r[0] === id);
      if (idx < 0) throw new Error(`Reservation ${id} not found`);
      const before = deserializeReservation(rows[idx]);
      const after: Reservation = { ...before, ...data, updated_at: new Date().toISOString() };
      await updateRow(SHEET_NAMES.reservations, idx, serializeReservation(after));

      const changed_fields = Object.keys(data).filter(k => k !== 'updated_at');
      const histEntry: ReservationHistory = {
        history_id: `hist-${Date.now()}`,
        reservation_id: id,
        action: 'update',
        changed_by,
        changed_at: new Date().toISOString(),
        before_snapshot: before,
        after_snapshot: after,
        changed_fields,
      };
      await appendRow(SHEET_NAMES.history, serializeHistory(histEntry));
      return after;
    },

    async cancelReservation(id, cancelled_by) {
      const rows = await readSheet(SHEET_NAMES.reservations);
      const idx = rows.findIndex(r => r[0] === id);
      if (idx < 0) return;
      const before = deserializeReservation(rows[idx]);
      const after: Reservation = { ...before, status: 'cancelled', updated_at: new Date().toISOString() };
      await updateRow(SHEET_NAMES.reservations, idx, serializeReservation(after));

      const histEntry: ReservationHistory = {
        history_id: `hist-${Date.now()}`,
        reservation_id: id,
        action: 'cancel',
        changed_by: cancelled_by,
        changed_at: new Date().toISOString(),
        before_snapshot: before,
        after_snapshot: null,
        changed_fields: [],
      };
      await appendRow(SHEET_NAMES.history, serializeHistory(histEntry));
    },

    async getHistory(reservationId?) {
      const rows = await readSheet(SHEET_NAMES.history);
      const entries: ReservationHistory[] = rows.filter(r => r.length > 0).map(row => {
        const [history_id, reservation_id, action, changed_by, changed_at, changed_fields, before_json, after_json] = row;
        return {
          history_id,
          reservation_id,
          action: action as ReservationHistory['action'],
          changed_by,
          changed_at,
          before_snapshot: before_json ? JSON.parse(before_json) as Reservation : null,
          after_snapshot: after_json ? JSON.parse(after_json) as Reservation : null,
          changed_fields: changed_fields ? changed_fields.split(',') : [],
        };
      });
      const filtered = reservationId ? entries.filter(h => h.reservation_id === reservationId) : entries;
      return filtered.reverse();
    },

    async addRoom(name) {
      const rows = await readSheet(SHEET_NAMES.rooms);
      const maxOrder = rows.reduce((m, r) => Math.max(m, parseInt(r[3] || '0', 10)), 0);
      const newRoom: Room = {
        room_id: `room-${Date.now()}`,
        room_name: name.trim(),
        is_active: true,
        sort_order: maxOrder + 1,
      };
      await appendRow(SHEET_NAMES.rooms, serializeRoom(newRoom));
      return newRoom;
    },

    async updateRoom(id, data) {
      const rows = await readSheet(SHEET_NAMES.rooms);
      const idx = rows.findIndex(r => r[0] === id);
      if (idx < 0) throw new Error(`Room ${id} not found`);
      const before = deserializeRoom(rows[idx]);
      const updated: Room = { ...before, ...data };
      await updateRow(SHEET_NAMES.rooms, idx, serializeRoom(updated));
      return updated;
    },

    async deleteRoom(id) {
      // Sheets에서 행 삭제는 batchUpdate 필요 — 여기서는 is_active=FALSE로 소프트 삭제
      const rows = await readSheet(SHEET_NAMES.rooms);
      const idx = rows.findIndex(r => r[0] === id);
      if (idx < 0) return;
      const room = deserializeRoom(rows[idx]);
      await updateRow(SHEET_NAMES.rooms, idx, serializeRoom({ ...room, is_active: false }));
    },
  };
}

// ─── Connection test ──────────────────────────────────────────────────────────

/** API 키 + Sheet ID로 연결 테스트. 성공 시 스프레드시트 제목 반환 */
export async function testSheetsConnection(sheetId: string, apiKey: string): Promise<string> {
  interface Meta { properties: { title: string } }
  const meta = await fetch(
    `${BASE}/${sheetId}?fields=properties.title&key=${apiKey}`
  );
  if (!meta.ok) {
    const err = await meta.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? `HTTP ${meta.status}`);
  }
  const data = await meta.json() as Meta;
  return data.properties.title;
}
