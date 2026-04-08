'use client';

interface Props {
  title?: string;
  onTodayClick: () => void;
  onReserveClick: () => void;
  onHistoryClick: () => void;
  historyCount: number;
}

export default function Header({ title, onTodayClick, onReserveClick, onHistoryClick, historyCount }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.89 2 3 2.9 3 4v16c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H5V8h14v13zM7 10h5v5H7z" />
            </svg>
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 whitespace-nowrap">
            {title || '공용 회의실 예약'}
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTodayClick}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            오늘
          </button>

          {/* History button */}
          <button
            onClick={onHistoryClick}
            className="relative px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="변경 이력 보기"
          >
            <span className="hidden sm:inline">이력</span>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 sm:hidden">
              <path d="M1.5 8A6.5 6.5 0 1 1 8 14.5H4.75a.75.75 0 0 1 0-1.5H8a5 5 0 1 0-5-5v1h1.25a.75.75 0 0 1 0 1.5h-3A.75.75 0 0 1 .5 9.75V8A.75.75 0 0 1 1.5 8ZM7.25 4.75a.75.75 0 0 1 1.5 0V8l1.5 1.5a.75.75 0 1 1-1.06 1.06l-1.72-1.72a.75.75 0 0 1-.22-.53V4.75Z" />
            </svg>
            {historyCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                {historyCount > 99 ? '99' : historyCount}
              </span>
            )}
          </button>

          <button
            onClick={onReserveClick}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <span className="hidden sm:inline">+ 예약하기</span>
            <span className="sm:hidden">+ 예약</span>
          </button>
        </div>
      </div>
    </header>
  );
}
