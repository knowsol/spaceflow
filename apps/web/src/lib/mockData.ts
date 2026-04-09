import { Reservation, Room } from './types';
import { formatDate } from './reservationLogic';

export const ROOMS: Room[] = [
  { room_id: 'room-1', room_name: '회의실', color: '#6d28d9', is_active: true, sort_order: 1 },
];

function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDate(d);
}

function nextMonday(): string {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

function makeRes(overrides: Partial<Reservation>): Reservation {
  const nowStr = new Date().toISOString();
  return {
    reservation_id: '',
    room_id: 'room-1',
    title: '',
    reserver_name: '',
    purpose: '',
    date: relDate(0),
    start_time: '09:00',
    end_time: '10:00',
    all_day: false,
    repeat_type: 'none',
    repeat_interval: 1,
    repeat_days: [],
    repeat_start_date: null,
    repeat_end_date: null,
    repeat_group_id: null,
    status: 'confirmed',
    created_at: nowStr,
    updated_at: nowStr,
    ...overrides,
  };
}

const mon = nextMonday();

export const MOCK_RESERVATIONS: Reservation[] = [
  // ── 소회의실 (room-1) ─────────────────────────────────────────────────────
  makeRes({
    reservation_id: 'res-001',
    room_id: 'room-1',
    title: '팀 주간 회의',
    reserver_name: '김민준',
    purpose: '주간 업무 보고 및 이슈 공유',
    date: relDate(0),
    start_time: '09:00',
    end_time: '10:00',
  }),
  makeRes({
    reservation_id: 'res-002',
    room_id: 'room-1',
    title: '인사 면담',
    reserver_name: '최지은',
    purpose: '상반기 인사 평가 면담',
    date: relDate(1),
    start_time: '15:00',
    end_time: '16:00',
  }),
  makeRes({
    reservation_id: 'res-003',
    room_id: 'room-1',
    title: '데일리 체크인',
    reserver_name: '한지수',
    purpose: '10분 일일 점검',
    date: relDate(0),
    start_time: '08:50',
    end_time: '09:00',
    repeat_type: 'daily',
    repeat_interval: 1,
    repeat_days: [],
    repeat_start_date: relDate(0),
    repeat_end_date: relDate(30),
    repeat_group_id: 'group-001',
  }),
  makeRes({
    reservation_id: 'res-004',
    room_id: 'room-1',
    title: '주간 팀 스탠드업',
    reserver_name: '이서연',
    purpose: '매주 월요일 스탠드업 미팅',
    date: mon,
    start_time: '09:30',
    end_time: '10:00',
    repeat_type: 'weekly',
    repeat_interval: 1,
    repeat_days: [1],
    repeat_start_date: mon,
    repeat_end_date: relDate(90),
    repeat_group_id: 'group-002',
  }),

  // ── 대회의실 (room-2) ─────────────────────────────────────────────────────
  makeRes({
    reservation_id: 'res-005',
    room_id: 'room-2',
    title: '신규 프로젝트 킥오프',
    reserver_name: '이서연',
    purpose: '2026 상반기 신규 프로젝트 착수 회의',
    date: relDate(0),
    start_time: '14:00',
    end_time: '16:00',
  }),
  makeRes({
    reservation_id: 'res-006',
    room_id: 'room-2',
    title: '클라이언트 미팅',
    reserver_name: '박준혁',
    purpose: 'A사 서비스 제안 발표 및 Q&A',
    date: relDate(1),
    start_time: '10:30',
    end_time: '12:00',
  }),
  makeRes({
    reservation_id: 'res-007',
    room_id: 'room-2',
    title: '팀 워크샵',
    reserver_name: '김민준',
    purpose: '연간 팀 빌딩 워크샵',
    date: relDate(7),
    all_day: true,
    start_time: '08:00',
    end_time: '22:00',
  }),
  makeRes({
    reservation_id: 'res-008',
    room_id: 'room-2',
    title: '스프린트 리뷰',
    reserver_name: '한지수',
    purpose: '스프린트 회고 및 다음 계획 수립',
    date: relDate(3),
    start_time: '11:00',
    end_time: '12:00',
  }),

  // ── 화상회의실 (room-3) ────────────────────────────────────────────────────
  makeRes({
    reservation_id: 'res-009',
    room_id: 'room-3',
    title: '해외 파트너 콜',
    reserver_name: '정우성',
    purpose: '글로벌 파트너십 논의',
    date: relDate(0),
    start_time: '10:00',
    end_time: '11:00',
  }),
  makeRes({
    reservation_id: 'res-010',
    room_id: 'room-3',
    title: '디자인 리뷰',
    reserver_name: '정우성',
    purpose: 'UI 시안 검토 및 피드백',
    date: relDate(2),
    start_time: '13:00',
    end_time: '14:30',
  }),
  makeRes({
    reservation_id: 'res-011',
    room_id: 'room-3',
    title: '기술 세미나',
    reserver_name: '박준혁',
    purpose: '내부 기술 공유 세미나',
    date: relDate(-1),
    start_time: '15:00',
    end_time: '17:00',
  }),
];
