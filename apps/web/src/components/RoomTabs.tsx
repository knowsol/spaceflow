'use client';

import { Room } from '@/lib/types';

interface Props {
  rooms: Room[];
  selectedRoomId: string;
  onSelect: (roomId: string) => void;
}

export default function RoomTabs({ rooms, selectedRoomId, onSelect }: Props) {
  const activeRooms = rooms.filter(r => r.is_active);

  // 방이 없으면 아무것도 표시하지 않음
  if (activeRooms.length === 0) return null;

  // 방이 1개면 탭 불필요
  if (activeRooms.length === 1) return null;

  // 방이 2개 이상이면 선택 가능한 탭 표시
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {activeRooms.map(room => {
        const isSelected = room.room_id === selectedRoomId;
        return (
          <button
            key={room.room_id}
            onClick={() => onSelect(room.room_id)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-sm whitespace-nowrap transition-colors flex-shrink-0',
              isSelected
                ? 'bg-[var(--accent)] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            ].join(' ')}
          >
            {room.room_name}
          </button>
        );
      })}
    </div>
  );
}
