'use client';

import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  width?: string;        // tailwind width class, default 'sm:w-[480px]'
  children: React.ReactNode;
}

/**
 * 오른쪽에서 슬라이드인하는 공용 패널.
 * 예약하기 / 변경이력 / 설정 에서 공통으로 사용.
 */
export default function RightPanel({ open, onClose, width = 'sm:w-[480px]', children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Android 뒤로가기 키 처리:
  // 패널이 열릴 때 history에 항목을 추가해두고,
  // popstate(뒤로가기) 이벤트 발생 시 패널을 닫음.
  // X / 백드롭으로 닫을 경우에는 history.go(-1)로 추가한 항목을 정리.
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (typeof window === 'undefined' || !open) return;

    window.history.pushState({ panel: true }, '');
    pushedRef.current = true;

    function handlePopState() {
      pushedRef.current = false; // 뒤로가기로 닫힘 → go(-1) 불필요
      onCloseRef.current();
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // X / 백드롭 등으로 닫힐 때 → 직접 push한 항목 제거
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.go(-1);
      }
    };
  }, [open]);

  // 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        className={[
          'fixed top-0 right-0 h-full w-full bg-white shadow-2xl z-50 flex flex-col',
          width,
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {children}
      </aside>
    </>
  );
}
