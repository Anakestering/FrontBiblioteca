'use client';

import { CrescimentoMesDTO } from '@/types';
import { useState } from 'react';

interface Props {
  crescimento: CrescimentoMesDTO[];
  loading: boolean;
}

interface TooltipState {
  visivel: boolean;
  x: number;
  y: number;
  mes: string;
  novosCadastros: number;
  primeiroUso: number;
}

function formatarMes(mes: string): string {
  const [ano, m] = mes.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[parseInt(m) - 1]}/${ano.slice(2)}`;
}

export function CrescimentoCard({ crescimento, loading }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visivel: false, x: 0, y: 0, mes: '', novosCadastros: 0, primeiroUso: 0,
  });

  const maxVal = crescimento.length > 0
    ? Math.max(...crescimento.flatMap(d => [d.novosCadastros, d.primeiroUso]))
    : 1;

  const W = 600, H = 140, PADDING_X = 40, PADDING_Y = 20;
  const plotW = W - PADDING_X * 2;
  const plotH = H - PADDING_Y * 2;
  const n = crescimento.length;

  const xOf = (i: number) => n <= 1 ? PADDING_X + plotW / 2 : PADDING_X + (i / (n - 1)) * plotW;
  const yOf = (val: number) => PADDING_Y + plotH - (maxVal > 0 ? (val / maxVal) * plotH : 0);

  const pathLine = (campo: 'novosCadastros' | 'primeiroUso') =>
    crescimento.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(d[campo])}`).join(' ');

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="relative group/label inline-block">
          <h3 className="section-title cursor-default">Crescimento da Base</h3>
          <div className="absolute top-full left-0 mt-1 hidden group-hover/label:block z-50 pointer-events-none">
            <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-1.5 text-xs whitespace-nowrap text-gray-300">
              Novos cadastros vs. primeiro uso efetivo por mês
            </div>
          </div>
        </div>
        {/* Legenda */}
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-blue-500 inline-block" />
            Cadastros
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-emerald-500 inline-block" />
            Primeiro uso
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-40 rounded-xl shimmer" />
      ) : crescimento.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-10">Sem dados no período</p>
      ) : (
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H + 20}`}
            className="w-full"
            style={{ minWidth: 300 }}
          >
            {/* Grid horizontal */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => {
              const y = PADDING_Y + plotH - pct * plotH;
              const val = Math.round(maxVal * pct);
              return (
                <g key={pct}>
                  <line x1={PADDING_X} y1={y} x2={W - PADDING_X} y2={y}
                    stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
                  <text x={PADDING_X - 5} y={y + 4} textAnchor="end"
                    className="fill-[var(--text-muted)]" style={{ fontSize: 9 }}>{val}</text>
                </g>
              );
            })}

            {/* Linhas */}
            {n > 1 && (
              <>
                <path d={pathLine('novosCadastros')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={pathLine('primeiroUso')} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}

            {/* Pontos interativos */}
            {crescimento.map((d, i) => (
              <g key={i}>
                <circle cx={xOf(i)} cy={yOf(d.novosCadastros)} r={4} fill="#3b82f6"
                  onMouseMove={e => setTooltip({ visivel: true, x: e.clientX, y: e.clientY, mes: d.mes, novosCadastros: d.novosCadastros, primeiroUso: d.primeiroUso })}
                  onMouseLeave={() => setTooltip(t => ({ ...t, visivel: false }))}
                  style={{ cursor: 'pointer' }}
                />
                <circle cx={xOf(i)} cy={yOf(d.primeiroUso)} r={4} fill="#10b981"
                  onMouseMove={e => setTooltip({ visivel: true, x: e.clientX, y: e.clientY, mes: d.mes, novosCadastros: d.novosCadastros, primeiroUso: d.primeiroUso })}
                  onMouseLeave={() => setTooltip(t => ({ ...t, visivel: false }))}
                  style={{ cursor: 'pointer' }}
                />
                {/* Label do mês */}
                <text x={xOf(i)} y={H + 15} textAnchor="middle"
                  className="fill-[var(--text-muted)]" style={{ fontSize: 9 }}>
                  {formatarMes(d.mes)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}

      {tooltip.visivel && (
        <div className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-2 text-xs whitespace-nowrap">
            <p className="font-semibold text-white mb-1">{formatarMes(tooltip.mes)}</p>
            <p className="text-blue-400">{tooltip.novosCadastros} novos cadastros</p>
            <p className="text-emerald-400">{tooltip.primeiroUso} primeiro uso</p>
            {tooltip.novosCadastros > 0 && (
              <p className="text-gray-500 mt-1 text-[10px]">
                conversão: {((tooltip.primeiroUso / tooltip.novosCadastros) * 100).toFixed(0)}%
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
