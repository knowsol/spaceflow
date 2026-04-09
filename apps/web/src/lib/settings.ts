// ─── Types ────────────────────────────────────────────────────────────────────

export interface SheetSettings {
  enabled: boolean;
  sheetId: string;    // Google Sheet ID (URL 또는 ID 직접 입력)
  sheetName: string;  // 기준 탭명 (미사용, 구조 보존)
}

export type LayoutWidth = 'full' | number; // 'full' | px 숫자 (예: 1000, 1200, 1400)

export interface AppSettings {
  /** 근무 요일: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토. 기본값: 월~금 */
  workDays: number[];
  /** 반복 일정 최대 생성 건수. 기본값: 100 */
  repeatMaxCount: number;
  /** PC 화면 가로 최대 너비. 기본값: 'full' */
  layoutWidth: LayoutWidth;
  sheet: SheetSettings;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  workDays: [1, 2, 3, 4, 5],
  repeatMaxCount: 100,
  layoutWidth: 'full',
  sheet: {
    enabled: false,
    sheetId: '',
    sheetName: '예약',
  },
};

const STORAGE_KEY = 'meeting-room-settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function loadSettings(): AppSettings {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_SETTINGS, sheet: { ...DEFAULT_SETTINGS.sheet } };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      workDays: Array.isArray(parsed.workDays) && parsed.workDays.length > 0
        ? parsed.workDays
        : DEFAULT_SETTINGS.workDays,
      repeatMaxCount: typeof parsed.repeatMaxCount === 'number' && parsed.repeatMaxCount >= 1
        ? parsed.repeatMaxCount
        : DEFAULT_SETTINGS.repeatMaxCount,
      layoutWidth: parsed.layoutWidth === 'full' || typeof parsed.layoutWidth === 'number'
        ? parsed.layoutWidth
        : DEFAULT_SETTINGS.layoutWidth,
      sheet: { ...DEFAULT_SETTINGS.sheet, ...(parsed.sheet ?? {}) },
    } as AppSettings;
  } catch {
    return { ...DEFAULT_SETTINGS, sheet: { ...DEFAULT_SETTINGS.sheet } };
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
}

/** Extract Sheet ID from a full Google Sheets URL, or return as-is if already an ID */
export function extractSheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input.trim();
}
