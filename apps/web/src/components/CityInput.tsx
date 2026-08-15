import React from 'react';
import { UZBEKISTAN_REGIONS } from '@printerp/shared';
import { MapPin } from 'lucide-react';

interface CityInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const CityInput: React.FC<CityInputProps> = ({
  value,
  onChange,
  placeholder = 'напр. Ташкент',
  className = '',
  id,
}) => {
  const datalistId = id ? `uz-regions-${id}` : 'uz-regions-datalist';

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <input
          type="text"
          id={id}
          list={datalistId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0 ${className}`}
        />
        <datalist id={datalistId}>
          {UZBEKISTAN_REGIONS.map((region) => (
            <option key={region} value={region} />
          ))}
        </datalist>

        {/* Dropdown trigger icon with invisible native select over it for 1-tap mobile picker */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center cursor-pointer text-slate-400 hover:text-amber-400">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onChange(e.target.value);
              }
            }}
            title="Выбрать область Узбекистана"
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
          >
            <option value="" disabled>
              Выберите область...
            </option>
            {UZBEKISTAN_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        </div>
      </div>
    </div>
  );
};
