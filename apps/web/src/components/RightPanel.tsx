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
