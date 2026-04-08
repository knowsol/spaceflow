// ─── Types ────────────────────────────────────────────────────────────────────

export interface SheetSettings {
  enabled: boolean;
  sheetId: string;       // Google Sheet ID (extracted from URL or entered directly)
  sheetName: string;     // Tab name inside the spreadsheet
  apiKey: string;        // Google API key (public read-only access)
}

export interface AppSettings {
  roomName: string;
  /** 근무 요일: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토. 기본값: 월~금 */
  workDays: number[];
  sheet: SheetSettings;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  roomName: '공용 회의실 A',
  workDays: [1, 2, 3, 4, 5],
  sheet: {
    enabled: false,
    sheetId: '',
    sheetName: '예약',
    apiKey: '',
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
      sheet: { ...DEFAULT_SETTINGS.sheet, ...(parsed.sheet ?? {}) },
    };
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
