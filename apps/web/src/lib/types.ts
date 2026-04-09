export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReservationStatus = 'confirmed' | 'cancelled';

export interface Room {
  room_id: string;
  room_name: string;
  color: string;       // hex color e.g. '#6d28d9'
  is_active: boolean;
  sort_order: number;
}

export interface Reservation {
  reservation_id: string;
  room_id: string;
  title: string;
  reserver_name: string;
  purpose: string;
  date: string;           // YYYY-MM-DD
  start_time: string;     // HH:mm
  end_time: string;       // HH:mm
  all_day: boolean;
  repeat_type: RepeatType;
  repeat_interval: number;
  repeat_days: number[];  // 0=Sun … 6=Sat
  repeat_start_date: string | null;
  repeat_end_date: string | null;
  repeat_group_id: string | null;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
}

export interface RepeatGroup {
  repeat_group_id: string;
  repeat_type: RepeatType;
  repeat_interval: number;
  repeat_days: number[];
  repeat_start_date: string;
  repeat_end_date: string;
}

export interface BlockedDate {
  date: string;
  reason: string;
  is_blocked: boolean;
}

export interface TimeSlot {
  hour: number;
  label: string;
  reservations: Reservation[];
  isAvailable: boolean;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictDates: string[];
  conflictReservations: Reservation[];
}

// ─── History ──────────────────────────────────────────────────────────────────

export type HistoryAction = 'create' | 'update' | 'cancel';

export interface ReservationHistory {
  history_id: string;
  reservation_id: string;
  action: HistoryAction;
  changed_by: string;           // 등록자 또는 수정자 이름
  changed_at: string;           // ISO timestamp
  before_snapshot: Reservation | null;  // 변경 전 (create 시 null)
  after_snapshot: Reservation | null;   // 변경 후 (cancel 시 null)
  changed_fields: string[];     // 수정된 필드명 목록
  note?: string;
}

export interface ReservationFormData {
  title: string;
  reserver_name: string;
  purpose: string;
  date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  repeat_type: RepeatType;
  repeat_interval: number;
  repeat_days: number[];
  repeat_start_date: string;
  repeat_end_date: string;
}
