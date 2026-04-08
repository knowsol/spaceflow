/**
 * sheetsService.ts — 서버 전용 (API Route에서만 import)
 * Service Account로 Google Sheets API v4 접근
 *
 * 환경변수:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — 서비스 계정 이메일
 *   GOOGLE_PRIVATE_KEY            — 서비스 계정 비밀키 (\n 그대로 저장)
 */

import { google } from 'googleapis';
import {
  SHEET_NAMES,
  SHEET_HEADERS,
  serializeReservation,
  deserializeReservation,
  serializeRoom,
  deserializeRoom,
  serializeHistory,
} from './sheetsSerializer';
import type { Reservation, Room, ReservationHistory } from './types';

// ─── Auth ──────────────────────────────────────────────────────────────────────

function getSheets(sheetId: string) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Service Account 환경변수가 설정되지 않았습니다 (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)');
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { sheets: google.sheets({ version: 'v4', auth }), sheetId };
}

// ─── Init ──────────────────────────────────────────────────────────────────────

export async function initializeSheets(sheetId: string): Promise<{ created: string[]; existing: string[] }> {
  const { sheets } = getSheets(sheetId);

  // 1. 현재 탭 목록 조회
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'sheets.properties' });
  const existingTabs = (meta.data.sheets ?? []).map(s => s.properties?.title ?? '');

  const created: string[] = [];
  const existing: string[] = [];

  // 2. 없는 탭 생성
  const tabsToCreate = Object.values(SHEET_NAMES).filter(name => !existingTabs.includes(name));
  if (tabsToCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: tabsToCreate.map(title => ({ addSheet: { properties: { title } } })),
      },
    });
    created.push(...tabsToCreate);
  }
  existing.push(...Object.values(SHEET_NAMES).filter(n => existingTabs.includes(n)));

  // 3. 헤더 기입 (비어있는 탭만)
  for (const tabName of Object.keys(SHEET_NAMES) as (keyof typeof SHEET_NAMES)[]) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A1:A1`,
    });
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [SHEET_HEADERS[tabName]] },
      });
    }
  }

  return { created, existing };
}

// ─── Connection test ───────────────────────────────────────────────────────────

export async function testConnection(sheetId: string): Promise<string> {
  const { sheets } = getSheets(sheetId);
  const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'properties.title' });
  return res.data.properties?.title ?? sheetId;
}

// ─── Read helpers ──────────────────────────────────────────────────────────────

async function readSheet(sheetId: string, tab: string): Promise<string[][]> {
  const { sheets } = getSheets(sheetId);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: tab });
  const rows = (res.data.values ?? []) as string[][];
  return rows.slice(1); // skip header
}

async function appendRow(sheetId: string, tab: string, row: string[]): Promise<void> {
  const { sheets } = getSheets(sheetId);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: tab,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

async function updateRow(sheetId: string, tab: string, rowIndex: number, row: string[]): Promise<void> {
  const { sheets } = getSheets(sheetId);
  const sheetRow = rowIndex + 2; // 0-based data → 1-based + header
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tab}!A${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

// ─── Rooms ─────────────────────────────────────────────────────────────────────

export async function getRooms(sheetId: string): Promise<Room[]> {
  const rows = await readSheet(sheetId, SHEET_NAMES.rooms);
  return rows.filter(r => r.length > 0).map(deserializeRoom).sort((a, b) => a.sort_order - b.sort_order);
}

export async function addRoom(sheetId: string, name: string): Promise<Room> {
  const rows = await readSheet(sheetId, SHEET_NAMES.rooms);
  const maxOrder = rows.reduce((m, r) => Math.max(m, parseInt(r[3] || '0', 10)), 0);
  const newRoom: Room = {
    room_id: `room-${Date.now()}`,
    room_name: name.trim(),
    is_active: true,
    sort_order: maxOrder + 1,
  };
  await appendRow(sheetId, SHEET_NAMES.rooms, serializeRoom(newRoom));
  return newRoom;
}

export async function updateRoom(sheetId: string, id: string, data: Partial<Omit<Room, 'room_id'>>): Promise<Room> {
  const rows = await readSheet(sheetId, SHEET_NAMES.rooms);
  const idx = rows.findIndex(r => r[0] === id);
  if (idx < 0) throw new Error(`Room ${id} not found`);
  const updated: Room = { ...deserializeRoom(rows[idx]), ...data };
  await updateRow(sheetId, SHEET_NAMES.rooms, idx, serializeRoom(updated));
  return updated;
}

export async function deleteRoom(sheetId: string, id: string): Promise<void> {
  const rows = await readSheet(sheetId, SHEET_NAMES.rooms);
  const idx = rows.findIndex(r => r[0] === id);
  if (idx < 0) return;
  const room = deserializeRoom(rows[idx]);
  await updateRow(sheetId, SHEET_NAMES.rooms, idx, serializeRoom({ ...room, is_active: false }));
}

// ─── Reservations ──────────────────────────────────────────────────────────────

export async function getReservations(sheetId: string): Promise<Reservation[]> {
  const rows = await readSheet(sheetId, SHEET_NAMES.reservations);
  return rows.filter(r => r.length > 0).map(deserializeReservation);
}

export async function addReservations(
  sheetId: string,
  items: Omit<Reservation, 'reservation_id' | 'created_at' | 'updated_at'>[],
  created_by: string
): Promise<Reservation[]> {
  const now = new Date().toISOString();
  const added: Reservation[] = items.map((item, i) => ({
    ...item,
    reservation_id: `res-${Date.now()}-${i}`,
    created_at: now,
    updated_at: now,
  }));
  for (const r of added) {
    await appendRow(sheetId, SHEET_NAMES.reservations, serializeReservation(r));
    const hist: ReservationHistory = {
      history_id: `hist-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      reservation_id: r.reservation_id,
      action: 'create',
      changed_by: created_by,
      changed_at: now,
      before_snapshot: null,
      after_snapshot: r,
      changed_fields: [],
    };
    await appendRow(sheetId, SHEET_NAMES.history, serializeHistory(hist));
  }
  return added;
}

export async function updateReservation(
  sheetId: string,
  id: string,
  data: Partial<Omit<Reservation, 'reservation_id' | 'created_at'>>,
  changed_by: string
): Promise<Reservation> {
  const rows = await readSheet(sheetId, SHEET_NAMES.reservations);
  const idx = rows.findIndex(r => r[0] === id);
  if (idx < 0) throw new Error(`Reservation ${id} not found`);
  const before = deserializeReservation(rows[idx]);
  const after: Reservation = { ...before, ...data, updated_at: new Date().toISOString() };
  await updateRow(sheetId, SHEET_NAMES.reservations, idx, serializeReservation(after));
  const hist: ReservationHistory = {
    history_id: `hist-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    reservation_id: id,
    action: 'update',
    changed_by,
    changed_at: new Date().toISOString(),
    before_snapshot: before,
    after_snapshot: after,
    changed_fields: Object.keys(data).filter(k => k !== 'updated_at'),
  };
  await appendRow(sheetId, SHEET_NAMES.history, serializeHistory(hist));
  return after;
}

export async function cancelReservation(sheetId: string, id: string, cancelled_by: string): Promise<void> {
  const rows = await readSheet(sheetId, SHEET_NAMES.reservations);
  const idx = rows.findIndex(r => r[0] === id);
  if (idx < 0) return;
  const before = deserializeReservation(rows[idx]);
  const after: Reservation = { ...before, status: 'cancelled', updated_at: new Date().toISOString() };
  await updateRow(sheetId, SHEET_NAMES.reservations, idx, serializeReservation(after));
  const hist: ReservationHistory = {
    history_id: `hist-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    reservation_id: id,
    action: 'cancel',
    changed_by: cancelled_by,
    changed_at: new Date().toISOString(),
    before_snapshot: before,
    after_snapshot: null,
    changed_fields: [],
  };
  await appendRow(sheetId, SHEET_NAMES.history, serializeHistory(hist));
}

// ─── History ───────────────────────────────────────────────────────────────────

export async function getHistory(sheetId: string, reservationId?: string): Promise<ReservationHistory[]> {
  const rows = await readSheet(sheetId, SHEET_NAMES.history);
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
}
