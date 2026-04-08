'use client';

import { useState, useCallback, useEffect } from 'react';
import { AppSettings, loadSettings, saveSettings } from '@/lib/settings';

async function fetchSheetSettings(sheetId: string): Promise<Partial<AppSettings>> {
  const res = await fetch(`/api/sheets/settings?sheetId=${encodeURIComponent(sheetId)}`);
  if (!res.ok) return {};
  const data = await res.json();
  if (!data || (!data.roomName && !data.workDays)) return {};
  return {
    ...(data.roomName ? { roomName: data.roomName } : {}),
    ...(Array.isArray(data.workDays) ? { workDays: data.workDays } : {}),
  };
}

async function pushSheetSettings(sheetId: string, s: AppSettings): Promise<void> {
  await fetch('/api/sheets/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheetId, roomName: s.roomName, workDays: s.workDays }),
  });
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Sheets 연동이 켜져 있으면 초기 로드 시 Sheets 값으로 덮어씌움
  useEffect(() => {
    const s = loadSettings();
    if (!s.sheet.enabled || !s.sheet.sheetId) return;
    fetchSheetSettings(s.sheet.sheetId).then(remote => {
      if (Object.keys(remote).length === 0) return;
      const merged: AppSettings = { ...s, ...remote };
      saveSettings(merged);
      setSettings(merged);
    });
  }, []);

  const updateSettings = useCallback((next: AppSettings) => {
    saveSettings(next);
    setSettings(next);
    // Sheets 연동이 켜져 있으면 기본정보/근무요일도 시트에 저장
    if (next.sheet.enabled && next.sheet.sheetId) {
      pushSheetSettings(next.sheet.sheetId, next).catch(() => {/* silent */});
    }
    window.dispatchEvent(new CustomEvent('settings-updated'));
  }, []);

  return { settings, updateSettings };
}
