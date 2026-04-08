'use client';

import { Room } from '@/lib/types';

interface Props {
  rooms: Room[];
  selectedRoomId: string;
  onSelect: (roomId: string) => void;
}

export default function RoomTabs({ rooms, selectedRoomId, onSelect }: Props) {
  const activeRooms = rooms.filter(r => r.is_active);

  if (activeRooms.length <= 1) return null; // 방이 1개 이하면 탭 불필요

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {activeRooms.map(room => {
        const isSelected = room.room_id === selectedRoomId;
        return (
          <button
            key={room.room_id}
            onClick={() => onSelect(room.room_id)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex-shrink-0',
              isSelected
                ? 'bg-gray-900 text-white'
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
