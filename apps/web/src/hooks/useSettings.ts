'use client';

import { useState, useCallback } from 'react';
import { AppSettings, loadSettings, saveSettings } from '@/lib/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const updateSettings = useCallback((next: AppSettings) => {
    saveSettings(next);
    setSettings(next);
    // 같은 탭에서 레포지터리 전환 감지용 커스텀 이벤트
    window.dispatchEvent(new CustomEvent('settings-updated'));
  }, []);

  return { settings, updateSettings };
}
