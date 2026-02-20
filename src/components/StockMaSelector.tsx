'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

export interface MaSelectorProps {
  selectedMas: number[];
  customMas: number[];
  onTogglePreset: (ma: number) => void;
  onAddCustom: (ma: number) => void;
  onRemoveCustom: (ma: number) => void;
}

const PRESET_MAS = [5, 10, 15, 20, 60];

export function StockMaSelector({
  selectedMas,
  customMas,
  onTogglePreset,
  onAddCustom,
  onRemoveCustom,
}: MaSelectorProps) {
  const t = useTranslations('StockDetail.chart');
  const [customInput, setCustomInput] = useState('');

  const handleAddCustom = () => {
    const num = parseInt(customInput, 10);
    if (!isNaN(num) && num > 0 && !customMas.includes(num)) {
      onAddCustom(num);
      setCustomInput('');
    }
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-sm text-gray-400">{t('maSelector')}:</span>
      <div className="flex gap-2">
        {PRESET_MAS.map((ma) => (
          <button
            key={ma}
            onClick={() => onTogglePreset(ma)}
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              selectedMas.includes(ma)
                ? 'bg-[#ff9500] text-white'
                : 'bg-[#2a2a3a] text-gray-400 hover:text-white'
            )}
          >
            MA{ma}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder={t('maPlaceholder')}
          className="w-20 px-2 py-1 bg-[#2a2a3a] text-white text-xs rounded border border-[#3a3a4a] focus:border-[#ff9500] outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
        />
        <button
          onClick={handleAddCustom}
          className="px-2 py-1 text-xs bg-[#2a2a3a] text-gray-400 hover:text-white rounded transition-colors"
        >
          {t('addMA')}
        </button>
      </div>
      {customMas.length > 0 && (
        <div className="flex gap-1">
          {customMas.map((ma) => (
            <button
              key={ma}
              onClick={() => onRemoveCustom(ma)}
              className="px-2 py-1 text-xs bg-purple-900/50 text-purple-300 rounded hover:bg-purple-900 transition-colors"
            >
              MA{ma} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
