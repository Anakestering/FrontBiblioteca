'use client';

import { useState } from 'react';
import { DadosRecursos, FiltrosRelatorio } from '../../page';
import { minutosDisponiveisPeriodo } from '@/lib/constants';

interface Props {
  dados: DadosRecursos;
  filtros: FiltrosRelatorio;
}

interface TooltipState {
  visivel: boolean;
  x: number;
  y: number;
  usado: number;
  disponivelMin: number;
  pctReal: number;
}

function minutosParaHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function calcPcts(valores: number[]): number[] {
  if (valores.every(v => v === 0)) return valores.map(() => 0);

  const max = Math.max(...valores);

  const logPcts = valores.map(v => {
    if (v === 0) return 0;
    return (Math.log(v + 1) / Math.log(max + 1)) * 100;
  });

  const indices = valores
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .map(x => x.i);

  const result = [...logPcts];
  const MIN_DIFF = 6;
  const MAX_DIFF = 28;

  for (let r = 1; r < indices.length; r++) {
    const prevIdx = indices[r - 1];
    const currIdx = indices[r];
    if (result[currIdx] === 0) continue;

    const diff = result[prevIdx] - result[currIdx];
    if (diff < MIN_DIFF) {
      result[currIdx] = Math.max(result[prevIdx] - MIN_DIFF, 4);
    } else if (diff > MAX_DIFF) {
      result[currIdx] = result[prevIdx] - MAX_DIFF;
    }
  }

  return result;
}

export function RecursosCard({ dados, filtros }: Props) {
  const temPcs = dados.computadores.length > 0;
  const temSalas = dados.salas.length > 0;
  if (!temPcs && !temSalas) return null;

  const disponivel = minutosDisponiveisPeriodo(filtros.inicio, filtros.fim);
  const unico = (temPcs && !temSalas) || (!temPcs && temSalas);

  const pctsPcs = calcPcts(dados.computadores.map(c => c.totalMinutosUsados));
  const pctsSalas = calcPcts(dados.salas.map(s => s.totalMinutosUsados));

  const [tooltip, setTooltip] = useState<TooltipState>({
    visivel: false, x: 0, y: 0, usado: 0, disponivelMin: 0, pctReal: 0,
  });

  const handleMouseMove = (e: React.MouseEvent, usado: number, pctReal: number) => {
    setTooltip({ visivel: true, x: e.clientX, y: e.clientY - 36, usado, disponivelMin: disponivel, pctReal });
  };

  const handleMouseLeave = () => setTooltip(p => ({ ...p, visivel: false }));

  const renderGrupo = (
    items: { id: number; nome: string; totalMinutosUsados: number }[],
    pcts: number[],
    cor: 'blue' | 'violet',
    label: string
  ) => (
    <div className="card p-4 w-full space-y-1 self-start">
      <div className="relative group/label inline-block mb-3">
        <p className={`text-[10px] font-semibold uppercase tracking-widest cursor-default ${
          cor === 'blue' ? 'text-blue-500' : 'text-violet-500'
        }`}>
          {label}
        </p>
        <div className="absolute bottom-full left-0 mb-1 hidden group-hover/label:block z-50 pointer-events-none">
          <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-1.5 text-xs whitespace-nowrap text-gray-300">
            {cor === 'blue' ? 'Total de horas usadas por computador no período' : 'Total de horas usadas por sala no período'}
          </div>
        </div>
      </div>

      {items.map((item, i) => {
        const pct = pcts[i];
        const pctReal = disponivel > 0
          ? Math.min((item.totalMinutosUsados / disponivel) * 100, 100)
          : 0;
        const barColor = cor === 'blue' ? 'bg-blue-500' : 'bg-violet-500';

        return (
          <div key={item.id} className="space-y-0.5">
            <span className="text-[11px] font-mono text-[var(--text-primary)]">
              {item.nome}
            </span>
            <div className="h-1.5 rounded-full bg-[var(--surface-2)] w-full">
              <div
                className={`h-full rounded-full ${barColor} transition-all duration-700 cursor-default`}
                style={{ width: `${pct}%` }}
                onMouseMove={e => handleMouseMove(e, item.totalMinutosUsados, pctReal)}
                onMouseLeave={handleMouseLeave}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {tooltip.visivel && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
        >
          <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-1.5 text-xs whitespace-nowrap">
            <span className="text-white font-semibold">{minutosParaHoras(tooltip.usado)}</span>
            <span className="text-gray-500"> / {minutosParaHoras(tooltip.disponivelMin)} · </span>
            <span className="text-gray-300">{Math.round(tooltip.pctReal)}%</span>
          </div>
        </div>
      )}

      <div className="flex gap-4 items-start flex-1 min-w-0">
        {temPcs && (
          <div className={unico ? 'w-1/2' : 'flex-1 min-w-0'}>
            {renderGrupo(dados.computadores, pctsPcs, 'blue', 'Computadores')}
          </div>
        )}
        {temSalas && (
          <div className={unico ? 'w-1/2' : 'flex-1 min-w-0'}>
            {renderGrupo(dados.salas, pctsSalas, 'violet', 'Salas')}
          </div>
        )}
      </div>
    </>
  );
}