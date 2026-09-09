'use client';

import { useState } from 'react';
import { FiltroPeriodoInline } from '../../FiltroPeriodoInline';
import { DownloadButtons } from '../components/DownloadButtons';
import { SectionPreview } from '../components/SectionPreview';
import { fetchReportData } from '../utils/fetchReport';
import type { ReportData, GenerateStatus, ReportPeriodo } from '../utils/types';

// ─── RelatorioGeral ───────────────────────────────────────────────────────────
// Sub-aba mais simples: período → gerar → preview → baixar
// Sem seleção de seções — tudo incluso automaticamente.

export function RelatorioGeral() {
  const [periodo, setPeriodo] = useState<ReportPeriodo>({ inicio: null, fim: null });
  const [status, setStatus]   = useState<GenerateStatus>('idle');
  const [data, setData]       = useState<ReportData | null>(null);
  const [erro, setErro]       = useState<string | null>(null);

  async function handleGerar() {
    setStatus('loading');
    setErro(null);
    setData(null);
    try {
      const result = await fetchReportData(periodo);
      setData(result);
      setStatus('ready');
    } catch (e) {
      console.error(e);
      setErro('Erro ao buscar dados. Tente novamente.');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-6">

      {/* Configuração */}
      <div className="card p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Relatório Geral</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Resumo automático com as principais métricas da biblioteca no período selecionado.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FiltroPeriodoInline valor={periodo} onChange={setPeriodo} loading={status === 'loading'} />
            <button
              onClick={handleGerar}
              disabled={status === 'loading'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
            >
              {status === 'loading' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0121 9.414V19a2 2 0 01-2 2z" />
                  </svg>
                  Gerar Relatório
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Erro */}
      {status === 'error' && (
        <div className="card p-4 border border-rose-500/30 bg-rose-500/5">
          <p className="text-sm text-rose-400">{erro}</p>
        </div>
      )}

      {/* Preview + Download */}
      {status === 'ready' && data && (
        <>
          {/* Barra de ações */}
          <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-[var(--text-muted)]">
                Relatório gerado em {data.geradoEm.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-[var(--text-muted)] opacity-70 mt-0.5">
                Revise abaixo antes de baixar
              </p>
            </div>
            <DownloadButtons data={data} />
          </div>

          {/* Conteúdo do relatório */}
          <div className="card p-6">
            <SectionPreview data={data} />
          </div>
        </>
      )}

      {/* Estado vazio */}
      {status === 'idle' && (
        <div className="card p-12 flex flex-col items-center justify-center gap-3 text-center">
          <svg className="w-10 h-10 text-[var(--text-muted)] opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0121 9.414V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-[var(--text-muted)]">Selecione o período e clique em <strong>Gerar Relatório</strong></p>
        </div>
      )}

    </div>
  );
}
