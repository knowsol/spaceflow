'use client';

import { useState, useCallback } from 'react';
import { AppSettings, loadSettings, saveSettings } from '@/lib/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const updateSettings = useCallback((next: AppSettings) => {
    saveSettings(next);
    setSettings(next);
  }, []);

  return { settings, updateSettings };
}
