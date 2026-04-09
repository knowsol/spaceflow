'use client';

import React from 'react';
import { Room } from '@/lib/types';

interface Props {
  rooms: Room[];
  selectedRoomId: string;
  onSelectRoom: (id: string) => void;
  onHistoryClick: () => void;
  onSettingsClick: () => void;
  historyCount: number;
  innerStyle?: React.CSSProperties;
}

export default function Header({ rooms, selectedRoomId, onSelectRoom, onHistoryClick, onSettingsClick, historyCount, innerStyle }: Props) {
  const activeRooms = rooms.filter(r => r.is_active);

  return (
    <header className="border-b border-gray-100 sticky top-0 z-20 bg-gray-50">
      <div className="bg-white px-4 py-2 flex items-center justify-between gap-4" style={innerStyle}>
        {/* 공간 탭 (왼쪽) */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
          {activeRooms.length >= 2 && activeRooms.map(room => {
            const isSelected = room.room_id === selectedRoomId;
            return (
              <button
                key={room.room_id}
                onClick={() => onSelectRoom(room.room_id)}
                className={[
                  'px-4 py-2 text-sm font-medium rounded-sm whitespace-nowrap transition-colors flex-shrink-0',
                  isSelected ? 'text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
                ].join(' ')}
                style={isSelected ? { backgroundColor: room.color || '#6d28d9' } : undefined}
              >
                {room.room_name}
              </button>
            );
          })}
          {activeRooms.length === 1 && (
            <div className="flex items-center gap-2 px-1">
              <div
                className="w-6 h-6 rounded-[9px] flex-shrink-0"
                style={{ backgroundColor: activeRooms[0].color || '#6d28d9' }}
              />
              <span className="text-[21px] font-bold tracking-tight text-gray-900">
                {activeRooms[0].room_name}
              </span>
            </div>
          )}
        </div>

        {/* Actions (오른쪽) */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* 변경이력 */}
          <button
            onClick={onHistoryClick}
            title="최근 변경이력"
            className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5z" clipRule="evenodd" />
            </svg>
            {historyCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[var(--accent)] text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                {historyCount > 9 ? '9+' : historyCount}
              </span>
            )}
          </button>

          {/* 환경설정 */}
          <button
            onClick={onSettingsClick}
            title="관리자 환경설정"
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
