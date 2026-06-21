'use client';

import { useState } from 'react';
import type { ReportData } from '../utils/types';

interface Props {
  data: ReportData;
  filename?: string;
}

type Format = 'word' | 'excel' | 'pdf';

export function DownloadButtons({ data, filename = 'relatorio_biblioteca' }: Props) {
  const [loading, setLoading] = useState<Format | null>(null);

  async function handleDownload(format: Format) {
    setLoading(format);
    try {
      if (format === 'word') {
        const { exportToWord } = await import('../utils/exportWord');
        exportToWord(data, filename);
      } else if (format === 'excel') {
        const { exportToExcel } = await import('../utils/exportExcel');
        exportToExcel(data, filename);
      } else {
        const { exportToPdf } = await import('../utils/exportPdf');
        exportToPdf(data, filename);
      }
    } catch (err) {
      console.error('Erro ao gerar arquivo:', err);
    } finally {
      setLoading(null);
    }
  }

  const buttons: { format: Format; label: string; color: string }[] = [
    { format: 'word',  label: 'Baixar Word',  color: 'bg-blue-600 hover:bg-blue-700' },
    { format: 'excel', label: 'Baixar Excel', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { format: 'pdf',   label: 'Visualizar / PDF', color: 'bg-rose-600 hover:bg-rose-700' },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {buttons.map(({ format, label, color }) => (
        <button
          key={format}
          onClick={() => handleDownload(format)}
          disabled={loading !== null}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 text-white shadow-sm ${color}`}
        >
          {loading === format ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          )}
          {loading === format ? 'Gerando...' : label}
        </button>
      ))}
    </div>
  );
}
