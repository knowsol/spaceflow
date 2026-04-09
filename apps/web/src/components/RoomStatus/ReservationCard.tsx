import { Reservation } from '@/lib/types';

const REPEAT_LABEL: Record<string, string> = {
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
};

interface Props {
  reservation: Reservation;
  onEdit?: (reservation: Reservation) => void;
  onCancel?: (id: string) => void;
}

export default function ReservationCard({ reservation: r, onEdit, onCancel }: Props) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-sm px-3 py-2 group/card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {r.all_day ? '종일' : `${r.start_time} – ${r.end_time}`}
            {' · '}
            {r.reserver_name}
          </p>
          {r.purpose && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{r.purpose}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {r.all_day && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-sm font-medium">
              종일
            </span>
          )}
          {r.repeat_type !== 'none' && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-sm font-medium">
              {REPEAT_LABEL[r.repeat_type]}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-gray-100 opacity-0 group-hover/card:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={() => onEdit(r)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 px-2 py-0.5 rounded-sm transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z" />
            </svg>
            수정
          </button>
        )}
        {onCancel && (
          <button
            onClick={() => onCancel(r.reservation_id)}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded-sm transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z" />
            </svg>
            취소
          </button>
        )}
      </div>
    </div>
  );
}
