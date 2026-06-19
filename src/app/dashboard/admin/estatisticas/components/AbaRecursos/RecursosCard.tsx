'use client';

import { useState } from 'react';
import { DadosRecursos } from '../../page';
import { EstatisticasRecursoDTO } from '@/types';
import { minutosParaHoras } from '@/lib/utils';

interface Props {
  dados: DadosRecursos;
  diasFuturo: number;
}

interface TooltipState {
  visivel: boolean;
  x: number;
  y: number;
  item: EstatisticasRecursoDTO | null;
}

/**
 * Calcula larguras (%) da barra segmentada de um recurso.
 * - pctUsado:  historico / disponivel
 * - pctFuturo: futuro reservado / disponivel (limitado ao espaco restante)
 * Quando nao ha minutosDisponiveis, usa o maior valor como referencia (escala relativa).
 */
function calcBarras(
  items: EstatisticasRecursoDTO[]
): { pctUsado: number; pctFuturo: number }[] {
  const temDisponivel = items.some(r => r.minutosDisponiveis > 0);

  if (temDisponivel) {
    return items.map(r => {
      const total = r.minutosDisponiveis;
      if (total === 0) return { pctUsado: 0, pctFuturo: 0 };
      const pctUsado  = Math.min(100, (r.totalMinutosUsados          / total) * 100);
      const pctFuturo = Math.min(100 - pctUsado, (r.minutosReservadosFuturos / total) * 100);
      return { pctUsado, pctFuturo };
    });
  }

  // Sem dados de capacidade: escala relativa ao maior valor combinado
  const maxCombinado = Math.max(
    1,
    ...items.map(r => r.totalMinutosUsados + r.minutosReservadosFuturos)
  );
  return items.map(r => {
    const pctUsado  = (r.totalMinutosUsados          / maxCombinado) * 90;
    const pctFuturo = (r.minutosReservadosFuturos / maxCombinado) * 90;
    return { pctUsado, pctFuturo };
  });
}

interface GrupoProps {
  items: EstatisticasRecursoDTO[];
  cor: 'blue' | 'violet';
  label: string;
  diasFuturo: number;
  onHover: (e: React.MouseEvent, item: EstatisticasRecursoDTO) => void;
  onLeave: () => void;
}

function GrupoRecursos({ items, cor, label, diasFuturo, onHover, onLeave }: GrupoProps) {
  const corBarra    = cor === 'blue' ? 'bg-blue-500'   : 'bg-violet-500';
  const corLabel    = cor === 'blue' ? 'text-blue-500' : 'text-violet-500';
  const sorted      = [...items].sort((a, b) => b.totalMinutosUsados - a.totalMinutosUsados);
  const barras      = calcBarras(sorted);

  return (
    <div className="card p-4 w-full self-start">
      {/* Cabecalho do grupo */}
      <div className="flex items-center justify-between mb-4">
        <p className={`text-[10px] font-semibold uppercase tracking-widest ${corLabel}`}>
          {label}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className={`inline-block w-2.5 h-1.5 rounded-sm ${corBarra}`} />
            Historico
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-1.5 rounded-sm bg-amber-400" />
            Prox. {diasFuturo}d
          </span>
        </div>
      </div>

      {/* Lista de recursos */}
      <div className="space-y-3">
        {sorted.map((item, i) => {
          const { pctUsado, pctFuturo } = barras[i];
          const ocupacao = item.minutosDisponiveis > 0
            ? Math.round((item.totalMinutosUsados / item.minutosDisponiveis) * 100)
            : null;

          return (
            <div
              key={item.id}
              className="group cursor-default"
              onMouseMove={e => onHover(e, item)}
              onMouseLeave={onLeave}
            >
              {/* Nome + valores */}
              <div className="flex items-baseline justify-between mb-1.5">
                <span className={`text-xs truncate max-w-[55%] flex items-center gap-1 ${i === 0 && item.totalMinutosUsados > 0 ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>
                  {i === 0 && item.totalMinutosUsados > 0 && (
                    <span className={`text-[9px] ${cor === 'blue' ? 'text-blue-400' : 'text-violet-400'}`}>▲</span>
                  )}
                  {item.nome}
                </span>
                <div className="flex items-center gap-2 text-[10px] shrink-0">
                  <span className={`font-semibold ${corLabel}`}>
                    {minutosParaHoras(item.totalMinutosUsados)}
                  </span>
                  {item.minutosReservadosFuturos > 0 && (
                    <span className="text-amber-400 font-semibold">
                      +{minutosParaHoras(item.minutosReservadosFuturos)}
                    </span>
                  )}
                  {ocupacao !== null && (
                    <span className="text-[var(--text-muted)]">{ocupacao}%</span>
                  )}
                </div>
              </div>

              {/* Barra segmentada: [historico][futuro][disponivel] */}
              <div className="h-2 rounded-full bg-[var(--surface-2)] w-full overflow-hidden flex">
                <div
                  className={`h-full rounded-l-full transition-all duration-700 ${corBarra}`}
                  style={{ width: `${pctUsado}%` }}
                />
                <div
                  className="h-full transition-all duration-700 bg-amber-400"
                  style={{ width: `${pctFuturo}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RecursosCard({ dados, diasFuturo }: Props) {
  // Hooks antes de qualquer return condicional (Rules of Hooks)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visivel: false, x: 0, y: 0, item: null,
  });

  const temPcs   = dados.computadores.length > 0;
  const temSalas = dados.salas.length > 0;
  if (!temPcs && !temSalas) return null;

  const onHover = (e: React.MouseEvent, item: EstatisticasRecursoDTO) =>
    setTooltip({ visivel: true, x: e.clientX, y: e.clientY - 56, item });

  const onLeave = () => setTooltip(p => ({ ...p, visivel: false }));

  const tt = tooltip.item;

  return (
    <>
      {/* Tooltip flutuante */}
      {tooltip.visivel && tt && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
        >
          <div className="bg-[#111] border border-gray-700 rounded-lg shadow-xl px-3 py-2 text-xs whitespace-nowrap space-y-1">
            <div className="text-gray-300 font-semibold mb-1">{tt.nome}</div>
            <div>
              <span className="text-[var(--text-muted)]">Historico: </span>
              <span className="text-white font-medium">{minutosParaHoras(tt.totalMinutosUsados)}</span>
              {tt.minutosDisponiveis > 0 && (
                <span className="text-gray-500">
                  {' '}/ {minutosParaHoras(tt.minutosDisponiveis)}{' '}
                  ({Math.round((tt.totalMinutosUsados / tt.minutosDisponiveis) * 100)}%)
                </span>
              )}
            </div>
            {tt.minutosReservadosFuturos > 0 && (
              <div>
                <span className="text-[var(--text-muted)]">Agendado: </span>
                <span className="text-amber-400 font-medium">+{minutosParaHoras(tt.minutosReservadosFuturos)}</span>
              </div>
            )}
            {tt.totalReservasFinalizadas > 0 && (
              <div className="text-gray-500">{tt.totalReservasFinalizadas} reservas finalizadas</div>
            )}
          </div>
        </div>
      )}

      {/* Salas e Computadores lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {temSalas && (
          <GrupoRecursos
            items={dados.salas}
            cor="violet"
            label="Salas"
            diasFuturo={diasFuturo}
            onHover={onHover}
            onLeave={onLeave}
          />
        )}
        {temPcs && (
          <GrupoRecursos
            items={dados.computadores}
            cor="blue"
            label="Computadores"
            diasFuturo={diasFuturo}
            onHover={onHover}
            onLeave={onLeave}
          />
        )}
      </div>
    </>
  );
}
