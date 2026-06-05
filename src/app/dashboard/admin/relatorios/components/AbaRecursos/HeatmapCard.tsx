'use client';

import { useState } from 'react';
import { RelatorioHeatmapDTO } from '@/types';

interface Props {
  heatmap: RelatorioHeatmapDTO[];
  loadingHeatmap: boolean;
  modoHeatmap: 'media' | 'total';
  onModoHeatmap: (modo: 'media' | 'total') => void;
}

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const HORAS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h às 21h

const GRADACOES = [
  { cor: '#1e1b2e', label: 'Vazio' },
  { cor: '#fef3c7', label: 'Muito baixo' },
  { cor: '#fcd34d', label: 'Baixo' },
  { cor: '#f97316', label: 'Médio' },
  { cor: '#dc2626', label: 'Alto' },
  { cor: '#531515', label: 'Muito alto' },
];

function getCorHeatmap(valor: number, max: number): string {
  if (max === 0 || valor === 0) return GRADACOES[0].cor;
  const pct = valor / max;
  if (pct < 0.1)  return GRADACOES[1].cor;
  if (pct < 0.3)  return GRADACOES[2].cor;
  if (pct < 0.55) return GRADACOES[3].cor;
  if (pct < 0.8)  return GRADACOES[4].cor;
  return GRADACOES[5].cor;
}

// Gera padrão de + com a cor sobre fundo escuro
function getCellStyle(cor: string, val: number): React.CSSProperties {
  if (val === 0) return { backgroundColor: '#1e1b2e' };
  
  // Criamos a estrutura com os pontos e o degradê combinados
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='20'>
    <defs>
      <pattern id='dots' width='4' height='4' patternUnits='userSpaceOnUse'>
        <circle cx='2' cy='2' r='1.2' fill='#ffffff' />
      </pattern>
      
      <linearGradient id='fade' x1='0%' y1='0%' x2='0%' y2='100%'>
        <stop offset='0%' stop-color='#ffffff' stop-opacity='1' />
        <stop offset='100%' stop-color='#ffffff' stop-opacity='0' />
      </linearGradient>
      
      <mask id='dot-fade'>
        <rect width='60' height='20' fill='url(#dots)' opacity='0.9' />
        <rect width='60' height='20' fill='url(#fade)' mix-blend-mode='multiply' />
      </mask>
    </defs>

    <rect width='54' height='20' fill='${cor}' mask='url(#dot-fade)' />
  </svg>`;

  return {
    backgroundColor: '#1e1b2e',
    // Correção aqui: svg+xml garante que o navegador renderize a imagem
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundSize: '16px 100%', // Largura de cada bloco/coluna no gráfico
    backgroundRepeat: 'repeat-x',
  };
}

interface Tooltip {
  visivel: boolean;
  x: number;
  y: number;
  dia: string;
  hora: number;
  valor: number;
  modo: 'media' | 'total';
}

export function HeatmapCard({ heatmap, loadingHeatmap, modoHeatmap, onModoHeatmap }: Props) {

  const [tooltip, setTooltip] = useState<Tooltip>({ visivel: false, x: 0, y: 0, dia: '', hora: 0, valor: 0, modo: 'media' });

  const heatmapGrid: Record<string, number> = {};
  heatmap.forEach(h => {
    heatmapGrid[`${h.diaSemana}:${h.hora}`] = modoHeatmap === 'media' ? h.media : h.total;
  });
  const maxHeatmap = Math.max(...heatmap.map(h => modoHeatmap === 'media' ? h.media : h.total), 1);

  const handleMouseEnter = (e: React.MouseEvent, dia: string, hora: number, valor: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ visivel: true, x: rect.left + rect.width / 2, y: rect.top - 8, dia, hora, valor, modo: modoHeatmap });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visivel: false }));
  };

  return (
    <div className="card p-5 space-y-4 relative w-fit">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">Horários de Uso</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {modoHeatmap === 'media'
              ? 'Média de pessoas por horário no período'
              : 'Total de pessoas por horário no período'}
          </p>
        </div>

        {/* Toggle média/total */}
        <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-lg p-1">
          <button
            onClick={() => onModoHeatmap('media')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              modoHeatmap === 'media'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Média
          </button>
          <button
            onClick={() => onModoHeatmap('total')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              modoHeatmap === 'total'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Total
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loadingHeatmap ? (
        <div className="h-48 w-96 rounded-lg shimmer" />
      ) : (
        <div>
          <table className="text-xs">
            <thead>
              <tr>
                <th className="w-12 text-[var(--text-muted)] font-medium text-right pr-3 pb-2" />
                {DIAS.map(d => (
                  <th key={d} className="text-center text-[var(--text-muted)] font-medium pb-2 px-1 w-24">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORAS.map(hora => (
                <tr key={hora}>
                  <td className="text-right pr-3 text-[var(--text-muted)] font-mono py-0.5 select-none">{hora}h</td>
                  {DIAS.map((dNome, dIdx) => {
                    const val = heatmapGrid[`${dIdx + 1}:${hora}`] ?? 0;
                    const cor = getCorHeatmap(val, maxHeatmap);
                    return (
                      <td key={dIdx} className="px-0.5 py-0.5">
                        <div
                          className="w-24 h-5 rounded-sm cursor-default transition-all duration-200 hover:scale-105 hover:shadow-md"
                          style={getCellStyle(cor, val)}
                          onMouseEnter={e => handleMouseEnter(e, dNome, hora, val)}
                          onMouseLeave={handleMouseLeave}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Legenda ── */}
          <div className="flex items-center gap-2 mt-4 justify-end">
            <span className="text-xs text-[var(--text-muted)]">Menos</span>
            {GRADACOES.map((g, i) => (
              <div key={i} title={g.label} className="w-5 h-3 rounded-sm" style={{ backgroundColor: g.cor }} />
            ))}
            <span className="text-xs text-[var(--text-muted)]">Mais</span>
          </div>
        </div>
      )}

      {/* ── Tooltip ── */}
      {tooltip.visivel && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-2 text-xs whitespace-nowrap">
            <p className="font-semibold text-white">{tooltip.dia}, {tooltip.hora}h</p>
            <p className="text-gray-400 mt-0.5">
              {tooltip.modo === 'media'
                ? `média de ${tooltip.valor} pessoa${tooltip.valor !== 1 ? 's' : ''}`
                : `${tooltip.valor} pessoa${tooltip.valor !== 1 ? 's' : ''} no total`}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}