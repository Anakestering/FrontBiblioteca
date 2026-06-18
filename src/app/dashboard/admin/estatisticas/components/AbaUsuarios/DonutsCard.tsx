'use client';

import { useState } from 'react';
import { DistribuicaoTipoDTO } from '@/types';

interface Props {
  distribuicao: DistribuicaoTipoDTO[];
  loading: boolean;
}

const TIPO_LABELS: Record<string, string> = {
  SENAI: 'Senai',
  SESI: 'Sesi',
  COLABORADOR: 'Colaborador',
  RESPONSAVEL: 'Responsável',
  OUTRO: 'Outro',
};

const CORES = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

interface TooltipState {
  visivel: boolean;
  x: number;
  y: number;
  tipo: string;
  usuarios: number;
  pedidos: number;
  media: number;
}

function Donut({
  titulo,
  dados,
  loading,
}: {
  titulo: string;
  dados: { label: string; valor: number; cor: string }[];
  loading: boolean;
}) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visivel: false, x: 0, y: 0, tipo: '', usuarios: 0, pedidos: 0, media: 0,
  });

  const total = dados.reduce((s, d) => s + d.valor, 0);
  const raio = 42;
  const circunferencia = 2 * Math.PI * raio;

  // Calcula os arcos
  let acumulado = 0;
  const arcos = dados.map(d => {
    const pct = total > 0 ? d.valor / total : 0;
    const offset = circunferencia * (1 - acumulado);
    const dash = circunferencia * pct;
    acumulado += pct;
    return { ...d, pct, offset, dash };
  });

  // Rotação inicial: começar do topo (−90°)
  const rotacao = -90;

  return (
    <div className="card p-4 flex flex-col gap-3 flex-1 min-w-0">
      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{titulo}</h4>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center h-32 text-xs text-[var(--text-muted)]">
          Sem dados no período
        </div>
      ) : (
        <>
          {/* SVG Donut */}
          <div className="flex items-center justify-center relative">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <g transform={`translate(55,55) rotate(${rotacao})`}>
                {/* fundo */}
                <circle r={raio} fill="none" stroke="var(--bg-tertiary)" strokeWidth="14" />
                {/* arcos */}
                {arcos.map((arco, i) => (
                  <circle
                    key={i}
                    r={raio}
                    fill="none"
                    stroke={arco.cor}
                    strokeWidth="14"
                    strokeDasharray={`${arco.dash} ${circunferencia}`}
                    strokeDashoffset={-arco.offset + circunferencia}
                    style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                    onMouseMove={e => setTooltip({
                      visivel: true, x: e.clientX, y: e.clientY,
                      tipo: arco.label, usuarios: arco.valor,
                      pedidos: 0, media: 0,
                    })}
                    onMouseLeave={() => setTooltip(t => ({ ...t, visivel: false }))}
                  />
                ))}
              </g>
              {/* Centro: total */}
              <text x="55" y="51" textAnchor="middle" className="fill-[var(--text-primary)]"
                style={{ fontSize: 16, fontWeight: 700 }}>{total.toLocaleString('pt-BR')}</text>
              <text x="55" y="64" textAnchor="middle" className="fill-[var(--text-muted)]"
                style={{ fontSize: 9 }}>usuários</text>
            </svg>
          </div>

          {/* Legenda */}
          <div className="space-y-1.5">
            {arcos.map((arco, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: arco.cor }} />
                  <span className="text-xs text-[var(--text-secondary)] truncate">{arco.label}</span>
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums shrink-0">
                  {arco.valor} <span className="text-[var(--text-muted)] font-normal">
                    ({total > 0 ? (arco.pct * 100).toFixed(0) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {tooltip.visivel && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-2 text-xs whitespace-nowrap">
            <p className="font-semibold text-white">{tooltip.tipo}</p>
            <p className="text-gray-400 mt-0.5">{tooltip.usuarios} usuário{tooltip.usuarios !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function DonutsCard({ distribuicao, loading }: Props) {
  const mapear = (campo: 'usuariosFinalizados' | 'usuariosAbandonos' | 'usuariosCancelamentos') =>
    distribuicao.map((d, i) => ({
      label: TIPO_LABELS[d.tipo] ?? d.tipo,
      valor: d[campo],
      cor: CORES[i % CORES.length],
    })).filter(d => d.valor > 0);

  return (
    <div className="flex gap-4">
      <Donut titulo="Finalizados" dados={mapear('usuariosFinalizados')} loading={loading} />
      <Donut titulo="Abandonos" dados={mapear('usuariosAbandonos')} loading={loading} />
      <Donut titulo="Cancelamentos" dados={mapear('usuariosCancelamentos')} loading={loading} />
    </div>
  );
}
