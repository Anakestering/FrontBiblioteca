'use client';

import { useState } from 'react';
import { FiltroPeriodoInline, PeriodoFiltro } from '../FiltroPeriodoInline';
import { EstatisticasHeatmapDTO } from '@/types';
import { useEffect } from 'react';

interface Props {
    heatmap: EstatisticasHeatmapDTO[];
    loadingHeatmap: boolean;
    modoHeatmap: 'media' | 'total';
    onModoHeatmap: (modo: 'media' | 'total') => void;
    filtroPeriodo: PeriodoFiltro;       // controlado pelo pai
    onFiltroPeriodoChange: (p: PeriodoFiltro) => void;
    globalVersao: number;
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
    if (pct < 0.1) return GRADACOES[1].cor;
    if (pct < 0.3) return GRADACOES[2].cor;
    if (pct < 0.55) return GRADACOES[3].cor;
    if (pct < 0.8) return GRADACOES[4].cor;
    return GRADACOES[5].cor;
}

// Gera padrão de + com a cor sobre fundo escuro
function getCellStyle(cor: string, val: number): React.CSSProperties {
    if (val === 0) return { backgroundColor: '#1e1b2e' };

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
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: '16px 100%',
        backgroundRepeat: 'repeat-x',
    };
}

interface Tooltip {
    visivel: boolean;
    x: number;
    y: number;
    dia: string;
    hora: number;
    p1: number; // Pessoas antes das XX:30
    p2: number; // Pessoas depois das XX:30
}

export function HeatmapCard({ heatmap, loadingHeatmap, modoHeatmap, onModoHeatmap, filtroPeriodo, onFiltroPeriodoChange, globalVersao }: Props) {

    const [tooltip, setTooltip] = useState<Tooltip>({ visivel: false, x: 0, y: 0, dia: '', hora: 0, p1: 0, p2: 0 });

    // Mapeia o grid inteiro guardando o objeto completo do DTO
    const heatmapGrid: Record<string, EstatisticasHeatmapDTO> = {};
    heatmap.forEach(h => {
        heatmapGrid[`${h.diaSemana}:${h.hora}`] = h;
    });

    // O cálculo da cor (maxHeatmap) continua se baseando no campo 'media' ou no acumulado do 'valorParaCor'
    const maxHeatmap = Math.max(...heatmap.map(h => modoHeatmap === 'media' ? h.media : h.valorParaCor), 1);

    const handleMouseEnter = (e: React.MouseEvent, dia: string, hora: number, p1: number, p2: number) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setTooltip({
            visivel: true,
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
            dia,
            hora,
            p1,
            p2
        });
    };

    const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visivel: false }));
    };

    return (
        <div className="card p-5 space-y-4 relative w-fit">

            {/* ── Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="relative group/label inline-block">
                    <h2 className="section-title cursor-default">Horários de Uso</h2>
                    <div className="absolute top-full left-0 mt-1 hidden group-hover/label:block z-50 pointer-events-none">
                        <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-1.5 text-xs whitespace-nowrap text-gray-300">
                            {modoHeatmap === 'media'
                                ? 'Média de pessoas por horário no período selecionado'
                                : 'Total de pessoas por horário no período selecionado'}
                        </div>
                    </div>
                </div>

                {/* Toggle média/total + filtro individual */}
                <div className="flex items-center gap-2">
                  <FiltroPeriodoInline valor={filtroPeriodo} loading={loadingHeatmap} onChange={onFiltroPeriodoChange} comBotaoAplicar />
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-lg p-1">
                    <button
                        onClick={() => onModoHeatmap('media')}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${modoHeatmap === 'media'
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        Média
                    </button>
                    <button
                        onClick={() => onModoHeatmap('total')}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${modoHeatmap === 'total'
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        Total
                    </button>
                  </div>
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
                                        const dto = heatmapGrid[`${dIdx + 1}:${hora}`];

                                        // Define o valor para a intensidade da cor com base no botão ativo (media ou fluxo de cor)
                                        const valParaCor = dto ? (modoHeatmap === 'media' ? dto.media : dto.valorParaCor) : 0;
                                        const cor = getCorHeatmap(valParaCor, maxHeatmap);

                                        // Puxa as metades calculadas para mandar para o Tooltip (se não existirem, assume 0)
                                        const p1 = dto ? dto.totalPrimeiraMetade : 0;
                                        const p2 = dto ? dto.totalSegundaMetade : 0;

                                        return (
                                            <td key={dIdx} className="px-0.5 py-0.5">
                                                <div
                                                    className="w-24 h-5 rounded-sm cursor-default transition-all duration-200 hover:scale-105 hover:shadow-md"
                                                    style={getCellStyle(cor, valParaCor)}
                                                    onMouseEnter={e => handleMouseEnter(e, dNome, hora, p1, p2)}
                                                    onMouseLeave={handleMouseLeave}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Legenda */}
                    <div className="flex items-center gap-2 mt-4 justify-end">
                        <span className="text-xs text-[var(--text-muted)]">Menos</span>
                        {GRADACOES.map((g, i) => (
                            <div key={i} className="relative group/cor">
                                <div
                                    className="w-5 h-3 rounded-sm cursor-default"
                                    style={{ backgroundColor: g.cor }}
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/cor:block z-50 pointer-events-none">
                                    <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-1.5 text-xs whitespace-nowrap text-gray-300">
                                        {g.label}
                                    </div>
                                </div>
                            </div>
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
                        <p className="font-semibold text-white mb-1">{tooltip.dia}, {tooltip.hora}h</p>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-gray-400">
                                <span className="text-violet-300 font-bold">{tooltip.p1}</span>
                                <span className="text-gray-500"> pessoas · </span>
                                <span className="text-gray-500">{tooltip.hora}:00–{tooltip.hora}:30</span>
                            </p>
                            <p className="text-gray-400">
                                <span className="text-violet-300 font-bold">{tooltip.p2}</span>
                                <span className="text-gray-500"> pessoas · </span>
                                <span className="text-gray-500">{tooltip.hora}:30–{tooltip.hora + 1}:00</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}