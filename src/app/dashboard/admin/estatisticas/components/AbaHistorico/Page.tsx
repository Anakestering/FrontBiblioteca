'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiltrosRelatorio } from '../../page';
import { EstatisticasHeatmapDTO } from '@/types';
import { PeriodoFiltro } from '@/lib/utils';
import { HeatmapCard } from './HeatmapCard';
import { LinearCard } from './LinearCard';
import { ResumoCardsHistorico } from './ResumoCards';
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

export interface DadosLinear {
  pontos: { data: string; total: number; mm?: number; totalReservas?: number }[];
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

  const picoHorario = useMemo(() => {
    if (heatmap.length === 0) return null;
    const pico = heatmap.reduce((max, h) => h.valorParaCor > max.valorParaCor ? h : max, heatmap[0]);
    return `${DIAS[pico.diaSemana]} ${pico.hora}h`;
  }, [heatmap]);

  return (
    <div className="space-y-6">

      <ResumoCardsHistorico
        dados={dadosLinear}
        picoHorario={picoHorario}
        loading={loadingLinear || loadingHeatmap}
      />

      <LinearCard
        filtros={filtros}
        globalVersao={globalVersao}
        onDadosChange={(d) => { setDadosLinear(d); setLoadingLinear(false); }}
      />

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
