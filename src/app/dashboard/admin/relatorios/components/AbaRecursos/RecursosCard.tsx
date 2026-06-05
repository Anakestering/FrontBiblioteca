'use client';

import { DadosRecursos, FiltrosRelatorio } from '../../page';
import { minutosDisponiveisPeriodo } from '@/lib/constants';

interface Props {
  dados: DadosRecursos;
  filtros: FiltrosRelatorio;
}

function minutosParaHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function RecursosCard({ dados, filtros }: Props) {
  const temDadosSalas = dados.salas.length > 0;
  const temDadosPcs = dados.computadores.length > 0;

  if (!temDadosSalas && !temDadosPcs) return null;

  const maxMinSalas = Math.max(...dados.salas.map(s => s.totalMinutosUsados), 1);
  const maxMinPcs = Math.max(...dados.computadores.map(c => c.totalMinutosUsados), 1);

  return (
    <div className="flex flex-wrap gap-4 items-start">

      {/* PCs */}
      {temDadosPcs && (
        <div className="card p-5 space-y-3 flex-1 min-w-[280px]">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Computadores</p>
          {dados.computadores.map(pc => {
            const pct = maxMinPcs > 0 ? (pc.totalMinutosUsados / maxMinPcs) * 100 : 0;
            const disponivel = minutosDisponiveisPeriodo(filtros.inicio, filtros.fim);
            const pctReal = disponivel > 0 ? Math.min((pc.totalMinutosUsados / disponivel) * 100, 100) : 0;
            return (
              <div key={pc.id} className="group space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-[var(--text-primary)]">{pc.nome}</span>
                  <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2">
                    {minutosParaHoras(pc.totalMinutosUsados)} / {minutosParaHoras(disponivel)} · {Math.round(pctReal)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Salas */}
      {temDadosSalas && (
        <div className="card p-5 space-y-3 flex-1 min-w-[280px]">
          <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide">Salas</p>
          {dados.salas.map(sala => {
            const pct = maxMinSalas > 0 ? (sala.totalMinutosUsados / maxMinSalas) * 100 : 0;
            const disponivel = minutosDisponiveisPeriodo(filtros.inicio, filtros.fim);
            const pctReal = disponivel > 0 ? Math.min((sala.totalMinutosUsados / disponivel) * 100, 100) : 0;
            return (
              <div key={sala.id} className="group space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{sala.nome}</span>
                  <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2">
                    {minutosParaHoras(sala.totalMinutosUsados)} / {minutosParaHoras(disponivel)} · {Math.round(pctReal)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}