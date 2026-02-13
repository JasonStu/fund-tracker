'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { parseStockInfo, formatParsedStockForDisplay } from '@/utils/textParser';
import { ParsedStock } from '@/utils/textParser';

const SAMPLE_TEXT = `300739    明阳电路
相关板块：PCB元器件
教学入市区间：21.00-21.20元
操作策略：盘中低吸；
第一压力位：22.90元
支撑位：19.80
仓位：10%
投资亮点：公司主营业务为印制电路板(PCB)的研发、生产和销售...`;

export default function EditorPage() {
  const t = useTranslations('Editor');

  const [inputText, setInputText] = useState('');
  const [parsedStock, setParsedStock] = useState<ParsedStock | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleParse = () => {
    setError(null);
    setSuccess(null);

    if (!inputText.trim()) {
      setError(t('error.emptyText'));
      return;
    }

    const parsed = parseStockInfo(inputText);

    if (!parsed.code || !parsed.name) {
      setError(t('error.invalidFormat'));
      return;
    }

    setParsedStock(parsed);
  };

  const handleSubmit = async () => {
    if (!parsedStock) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/feishu/bitable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'insert',
          stock: parsedStock,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || t('error.submitFailed'));
      }

      setSuccess(t('success.submitted', { code: parsedStock.code }));
      setParsedStock(null);
      setInputText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.unknown');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_TEXT);
    setParsedStock(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-[#0d0d15] text-gray-200">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#00ffff] mb-1 sm:mb-2">{t('title')}</h1>
          <p className="text-sm sm:text-base text-gray-400">{t('description')}</p>
        </div>

        {/* Config Status */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border border-[#2a2a3a] bg-[#12121a]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_FEISHU_CONFIGURED === 'true' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-xs sm:text-sm text-gray-400">
              {process.env.NEXT_PUBLIC_FEISHU_CONFIGURED === 'true'
                ? t('config.configured')
                : t('config.notConfigured')}
            </span>
          </div>
        </div>

        {/* Main Content - Stack on mobile, side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Input Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-[#ff00ff]">{t('inputTitle')}</h2>
              <button
                onClick={handleLoadSample}
                className="text-xs sm:text-sm text-gray-400 hover:text-[#00ffff] transition-colors"
              >
                {t('loadSample')}
              </button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('inputPlaceholder')}
              className="w-full h-48 sm:h-64 md:h-80 p-3 sm:p-4 rounded-lg bg-[#12121a] border border-[#2a2a3a] text-gray-200 placeholder-gray-500 focus:border-[#00ffff] focus:outline-none font-mono text-xs sm:text-sm resize-none"
            />

            <button
              onClick={handleParse}
              disabled={isLoading || !inputText.trim()}
              className="w-full py-2.5 sm:py-3 px-4 rounded-lg bg-[#ff00ff] text-black font-medium hover:bg-[#ff00ff]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
            >
              {t('parseButton')}
            </button>
          </div>

          {/* Preview Section */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-[#ff00ff]">{t('previewTitle')}</h2>

            {error && (
              <div className="p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                {success}
              </div>
            )}

            {parsedStock ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 rounded-lg bg-[#12121a] border border-[#2a2a3a]">
                  <pre className="text-xs sm:text-sm text-gray-300 whitespace-pre-wrap break-all">
                    {formatParsedStockForDisplay(parsedStock)}
                  </pre>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-lg bg-[#00ffff] text-black font-medium hover:bg-[#00ffff]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                >
                  {isLoading ? t('submitting') : t('submitButton')}
                </button>
              </div>
            ) : (
              <div className="h-48 sm:h-64 md:h-80 p-3 sm:p-4 rounded-lg bg-[#12121a] border border-[#2a2a3a] border-dashed flex items-center justify-center text-gray-500 text-sm text-center px-4">
                {t('previewPlaceholder')}
              </div>
            )}
          </div>
        </div>

        {/* Format Guide */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-[#12121a] border border-[#2a2a3a]">
          <h3 className="text-sm sm:text-base font-medium text-gray-300 mb-1.5 sm:mb-2">{t('formatGuide.title')}</h3>
          <div className="text-xs sm:text-sm text-gray-400 space-y-0.5 sm:space-y-1">
            <p>{t('formatGuide.line1')}</p>
            <p>{t('formatGuide.line2')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
