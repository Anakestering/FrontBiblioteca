'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiltrosRelatorio } from '../../page';
import { EstatisticasHeatmapDTO } from '@/types';
import { PeriodoFiltro } from '@/lib/utils';
import { HeatmapCard } from './HeatmapCard';
import { LinearCard } from './LinearCard';
import { ResumoAbas, CardInfo } from '../ResumoAbas';
import { OcupacaoSemanaCard } from './OcupacaoSemanaCard';

const DIAS = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

interface Props {
  filtros: FiltrosRelatorio;
  globalVersao: number;
  heatmap: EstatisticasHeatmapDTO[];
  loadingHeatmap: boolean;
  onBuscarHeatmap: (f: FiltrosRelatorio) => void;
  modoHeatmap: 'media' | 'total';
  onModoHeatmap: (modo: 'media' | 'total') => void;
}

interface DadosLinear {
  pontos: { data: string; total: number; mm?: number }[];
  tendencia: { pct: number; subindo: boolean } | null;
  mediaPessoasDia: number;
  abandonos: { data: string; total: number; mm?: number }[];
  tendenciaAbandono: { pct: number; subindo: boolean } | null;
  taxaAbandono: number;
}

export function AbaHistorico({
  filtros,
  globalVersao,
  heatmap,
  loadingHeatmap,
  onBuscarHeatmap,
  modoHeatmap,
  onModoHeatmap,
}: Props) {
  const [periodoHeatmap, setPeriodoHeatmap] = useState<PeriodoFiltro>({
    inicio: filtros.inicio,
    fim: filtros.fim,
  });
  const [dadosLinear, setDadosLinear] = useState<DadosLinear | null>(null);
  const [loadingLinear, setLoadingLinear] = useState(true);

  useEffect(() => {
    setPeriodoHeatmap({ inicio: filtros.inicio, fim: filtros.fim });
  }, [globalVersao]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHeatmapChange = useCallback((periodo: PeriodoFiltro) => {
    setPeriodoHeatmap(periodo);
    onBuscarHeatmap({ ...filtros, inicio: periodo.inicio, fim: periodo.fim });
  }, [filtros, onBuscarHeatmap]);

  // Pico de horário — célula do heatmap com maior valorParaCor
  const picoHorario = useMemo(() => {
    if (heatmap.length === 0) return null;
    const pico = heatmap.reduce((max, h) => h.valorParaCor > max.valorParaCor ? h : max, heatmap[0]);
    return `${DIAS[pico.diaSemana]} ${pico.hora}h`;
  }, [heatmap]);

  const totalReservas = dadosLinear
    ? dadosLinear.pontos.reduce((s, p) => s + p.total, 0)
    : 0;

  // Card de Tendência: mostra tendência de crescimento + taxa de abandono juntas
  const tendenciaValor = () => {
    const t = dadosLinear?.tendencia;
    const taxa = dadosLinear?.taxaAbandono ?? 0;
    if (!t && taxa === 0) return '—';
    const parts: string[] = [];
    if (t) parts.push(`${t.subindo ? '↑' : '↓'} ${t.pct.toFixed(1)}%`);
    if (taxa > 0) parts.push(`${taxa.toFixed(1)}% aband.`);
    return parts.join('  ·  ');
  };

  const tendenciaSub = () => {
    const t = dadosLinear?.tendencia;
    const taxa = dadosLinear?.taxaAbandono ?? 0;
    if (!t && taxa === 0) return 'dados insuficientes';
    const parts: string[] = [];
    if (t) parts.push(t.subindo ? 'crescimento' : 'queda');
    if (taxa > 0) parts.push('taxa de abandono');
    return parts.join(' · ');
  };

  const tendenciaCor = (): CardInfo['cor'] => {
    const t = dadosLinear?.tendencia;
    if (!t) return 'violet';
    return t.subindo ? 'emerald' : 'rose';
  };

  const cards: CardInfo[] = [
    {
      label: 'Total de reservas',
      valor: totalReservas.toLocaleString('pt-BR'),
      cor: 'blue' as const,
    },
    {
      label: 'Pico de horário',
      valor: picoHorario ?? '—',
      sub: 'horário mais movimentado',
      cor: 'amber' as const,
    },
    {
      label: 'Média de pessoas/dia',
      valor: dadosLinear ? dadosLinear.mediaPessoasDia.toLocaleString('pt-BR') : '—',
      sub: 'dias úteis no período',
      cor: 'emerald' as const,
    },
    {
      label: 'Tendência',
      valor: tendenciaValor(),
      sub: tendenciaSub(),
      cor: tendenciaCor(),
    },
  ];

  return (
    <div className="space-y-6">

      <ResumoAbas cards={cards} loading={loadingLinear && loadingHeatmap} />

      <LinearCard
        filtros={filtros}
        globalVersao={globalVersao}
        onDadosChange={(d) => { setDadosLinear(d); setLoadingLinear(false); }}
      />

      {/* Heatmap + Ocupação por dia lado a lado */}
      <div className="flex gap-6 items-start">
        <HeatmapCard
          heatmap={heatmap}
          loadingHeatmap={loadingHeatmap}
          modoHeatmap={modoHeatmap}
          onModoHeatmap={onModoHeatmap}
          filtroPeriodo={periodoHeatmap}
          onFiltroPeriodoChange={handleHeatmapChange}
          globalVersao={globalVersao}
        />
        <div className="flex-1 min-w-0">
          <OcupacaoSemanaCard
            filtros={filtros}
            globalVersao={globalVersao}
          />
        </div>
      </div>
    </div>
  );
}