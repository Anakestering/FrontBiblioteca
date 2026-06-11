'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { EstatisticasOcupacaoDiaDTO } from '@/types';
import { FiltroPeriodoInline, PeriodoFiltro } from '../FiltroPeriodoInline';
import { FiltrosRelatorio } from '../../page';
import { relatorios } from '@/lib/api';
import { toISOLocal } from '@/lib/utils';

interface Props {
  filtros: FiltrosRelatorio;
  globalVersao: number;
}

interface Tooltip {
  visivel: boolean;
  x: number;
  y: number;
  nome: string;
  taxa: number;
}

function getCorBarra(taxa: number, isMax: boolean): string {
  if (isMax) return '#a855f7';
  if (taxa >= 80) return '#7c3aed';
  if (taxa >= 60) return '#6d28d9';
  if (taxa >= 40) return '#5b21b6';
  if (taxa >= 20) return '#4c1d95';
  return '#3b0764';
}

export function OcupacaoSemanaCard({ filtros, globalVersao }: Props) {
  const [dados, setDados]              = useState<EstatisticasOcupacaoDiaDTO[]>([]);
  const [loading, setLoading]          = useState(false);
  const [periodoLocal, setPeriodoLocal] = useState<PeriodoFiltro>({ inicio: filtros.inicio, fim: filtros.fim });
  const [tooltip, setTooltip]          = useState<Tooltip>({ visivel: false, x: 0, y: 0, nome: '', taxa: 0 });

  const filtrosRef = useRef(filtros);
  useEffect(() => { filtrosRef.current = filtros; });

  const buscar = useCallback(async (periodo: PeriodoFiltro) => {
    setLoading(true);
    try {
      const data = await relatorios.ocupacaoSemana({
        inicio: periodo.inicio ? toISOLocal(periodo.inicio) : undefined,
        fim:    periodo.fim    ? toISOLocal(periodo.fim, true) : undefined,
      });
      setDados(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { buscar(periodoLocal); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const f = filtrosRef.current;
    const novo = { inicio: f.inicio, fim: f.fim };
    setPeriodoLocal(novo);
    buscar(novo);
  }, [globalVersao]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiltroChange = (p: PeriodoFiltro) => { setPeriodoLocal(p); buscar(p); };

  const maxTaxa = dados.length > 0 ? Math.max(...dados.map(d => d.taxaOcupacao)) : 0;

  return (
    <div className="card p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative group/label inline-block">
          <h3 className="section-title cursor-default">Ocupação por Dia</h3>
          <div className="absolute top-full left-0 mt-1 hidden group-hover/label:block z-50 pointer-events-none">
            <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-1.5 text-xs whitespace-nowrap text-gray-300">
              % do tempo utilizado por dia da semana
            </div>
          </div>
        </div>
        <FiltroPeriodoInline
          valor={periodoLocal}
          onChange={handleFiltroChange}
          loading={loading}
          comBotaoAplicar
        />
      </div>

      {/* Barras */}
      <div className="flex flex-col gap-5 relative">
        {loading && (
          <div className="py-6 flex items-center justify-center">
            <div className="h-4 w-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && dados.map(d => {
          const isMax = d.taxaOcupacao === maxTaxa && maxTaxa > 0;
          const cor   = getCorBarra(d.taxaOcupacao, isMax);
          return (
            <div key={d.diaSemana} className="flex items-center gap-3">
              <span
                className="text-xs font-semibold w-7 shrink-0 text-right"
                style={{ color: isMax ? '#a855f7' : 'var(--text-muted)' }}
              >
                {d.nome}
              </span>
              <div className="flex-1 h-5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${d.taxaOcupacao}%`,
                    background: `linear-gradient(90deg, ${cor}aa, ${cor})`,
                    boxShadow: isMax ? `0 0 8px ${cor}88` : 'none',
                  }}
                  onMouseMove={e => setTooltip({ visivel: true, x: e.clientX, y: e.clientY, nome: d.nome, taxa: d.taxaOcupacao })}
                  onMouseLeave={() => setTooltip(t => ({ ...t, visivel: false }))}
                />
              </div>
              <span className="text-xs tabular-nums w-10 shrink-0 text-[var(--text-muted)]">
                {d.taxaOcupacao.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip.visivel && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-2 text-xs whitespace-nowrap">
            <p className="font-semibold text-white mb-1">{tooltip.nome}</p>
            <p className="text-gray-400">
              <span className="text-violet-300 font-bold">{tooltip.taxa.toFixed(1)}%</span>
              <span className="text-gray-500"> de ocupação média</span>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}