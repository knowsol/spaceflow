'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'meeting-room-saved-name';

/**
 * localStorage에 이름을 저장/불러오는 훅.
 * - savedName : 저장된 이름 (없으면 '')
 * - isSaveEnabled : "이름 저장" 체크박스 상태
 * - setIsSaveEnabled : 체크박스 토글
 * - persistName(name) : 이름 저장
 * - clearName()       : 저장 삭제
 */
export function useStoredName() {
  const [savedName, setSavedName] = useState('');
  const [isSaveEnabled, setIsSaveEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedName(stored);
        setIsSaveEnabled(true);
      }
    } catch {
      // localStorage 접근 불가 환경 무시
    }
  }, []);

  function persistName(name: string) {
    try {
      if (name.trim()) {
        localStorage.setItem(STORAGE_KEY, name.trim());
        setSavedName(name.trim());
      }
    } catch { }
  }

  function clearName() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedName('');
    } catch { }
  }

  return { savedName, isSaveEnabled, setIsSaveEnabled, persistName, clearName };
}
