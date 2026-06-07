'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiltrosRelatorio } from '../../page';
import { EstatisticasHeatmapDTO } from '@/types';
import { PeriodoFiltro } from '../FiltroPeriodoInline';
import { HeatmapCard } from './HeatmapCard';
import { LinearCard } from './LinearCard';
import { relatorios } from '@/lib/api';

function toISOLocal(date: Date, endOfDay = false): string {
  const d = new Date(date);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 19);
}

interface Props {
  filtros: FiltrosRelatorio;
  globalVersao: number;
  heatmap: EstatisticasHeatmapDTO[];
  loadingHeatmap: boolean;
  onBuscarHeatmap: (f: FiltrosRelatorio) => void;
  modoHeatmap: 'media' | 'total';
  onModoHeatmap: (modo: 'media' | 'total') => void;
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
  // Filtro local do heatmap — começa igual ao global
  const [periodoHeatmap, setPeriodoHeatmap] = useState<PeriodoFiltro>({
    inicio: filtros.inicio,
    fim:    filtros.fim,
  });

  // Quando o global é aplicado, sobrescreve o filtro do heatmap
  useEffect(() => {
    setPeriodoHeatmap({ inicio: filtros.inicio, fim: filtros.fim });
  }, [globalVersao]);

  const handleHeatmapChange = useCallback((periodo: PeriodoFiltro) => {
    setPeriodoHeatmap(periodo);
    onBuscarHeatmap({ ...filtros, inicio: periodo.inicio, fim: periodo.fim });
  }, [filtros, onBuscarHeatmap]);

  return (
    <div className="space-y-6">
      {/* LinearCard gerencia seu próprio filtro internamente */}
      <LinearCard
        filtros={filtros}
        globalVersao={globalVersao}
      />

      <HeatmapCard
        heatmap={heatmap}
        loadingHeatmap={loadingHeatmap}
        modoHeatmap={modoHeatmap}
        onModoHeatmap={onModoHeatmap}
        filtroPeriodo={periodoHeatmap}
        onFiltroPeriodoChange={handleHeatmapChange}
        globalVersao={globalVersao}
      />
    </div>
  );
}