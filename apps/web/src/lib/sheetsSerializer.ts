/**
 * sheetsSerializer.ts
 * Google Sheets 행 ↔ 도메인 객체 변환 (서버/클라이언트 공용)
 */

import type { Reservation, Room, ReservationHistory } from './types';

export const SHEET_NAMES = {
  settings: 'settings',
  rooms: 'rooms',
  reservations: 'reservations',
  history: 'history',
} as const;

export const SHEET_HEADERS: Record<keyof typeof SHEET_NAMES, string[]> = {
  settings: ['key', 'value'],
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

export function serializeReservation(r: Reservation): string[] {
  return [
    r.reservation_id, r.room_id, r.title, r.reserver_name, r.purpose,
    r.date, r.start_time, r.end_time,
    r.all_day ? 'TRUE' : 'FALSE',
    r.repeat_type, String(r.repeat_interval), r.repeat_days.join(','),
    r.repeat_start_date ?? '', r.repeat_end_date ?? '', r.repeat_group_id ?? '',
    r.status, r.created_at, r.updated_at,
  ];
}

export function deserializeReservation(row: string[]): Reservation {
  const [
    reservation_id, room_id, title, reserver_name, purpose,
    date, start_time, end_time, all_day,
    repeat_type, repeat_interval, repeat_days,
    repeat_start_date, repeat_end_date, repeat_group_id,
    status, created_at, updated_at,
  ] = row;
  return {
    reservation_id, room_id, title, reserver_name, purpose,
    date, start_time, end_time,
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

export function serializeRoom(r: Room): string[] {
  return [
    r.room_id, r.room_name,
    r.is_active ? 'TRUE' : 'FALSE',
    String(r.sort_order),
    new Date().toISOString(),
  ];
}

export function deserializeRoom(row: string[]): Room {
  const [room_id, room_name, is_active, sort_order] = row;
  return {
    room_id, room_name,
    is_active: is_active === 'TRUE',
    sort_order: parseInt(sort_order || '0', 10),
  };
}

export function serializeHistory(h: ReservationHistory): string[] {
  return [
    h.history_id, h.reservation_id, h.action, h.changed_by, h.changed_at,
    h.changed_fields.join(','),
    h.before_snapshot ? JSON.stringify(h.before_snapshot) : '',
    h.after_snapshot ? JSON.stringify(h.after_snapshot) : '',
  ];
}
