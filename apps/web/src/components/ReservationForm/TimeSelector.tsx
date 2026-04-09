'use client';

import { generateTimeOptions } from '@/lib/reservationLogic';

const ALL_OPTIONS = generateTimeOptions(8, 22);

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minTime?: string;  // options strictly after this time
  disabled?: boolean;
  error?: string;
}

export default function TimeSelector({ label, value, onChange, minTime, disabled, error }: Props) {
  const options = minTime ? ALL_OPTIONS.filter(t => t > minTime) : ALL_OPTIONS;

  // Clamp value if it falls outside available options
  const safeValue = options.includes(value) ? value : options[0] ?? value;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={safeValue}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={[
          'w-full border rounded-sm px-3 h-9 text-sm text-gray-900 bg-white',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
          'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          error ? 'border-red-300' : 'border-gray-200',
        ].join(' ')}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
