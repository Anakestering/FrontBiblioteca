'use client';

import { FiltrosRelatorio, DadosRecursos } from '../../page';
import { RelatorioHeatmapDTO } from '@/types';
import { FiltrosRelatorioCard } from './FiltrosRelatorio';
import { HeatmapCard } from './HeatmapCard';
import { RecursosCard } from './RecursosCard';

interface Props {
  filtros: FiltrosRelatorio;
  dados: DadosRecursos;
  heatmap: RelatorioHeatmapDTO[];
  loadingHeatmap: boolean;
  loading: boolean;
  erro: string | null;
  onAplicar: (filtros: FiltrosRelatorio) => void;
  modoHeatmap: 'media' | 'total';
  onModoHeatmap: (modo: 'media' | 'total') => void;
}

export function AbaRecursos({ filtros, dados, heatmap, loadingHeatmap, loading, erro, onAplicar, modoHeatmap, onModoHeatmap }: Props) {
  return (
    <div className="space-y-6">

      <FiltrosRelatorioCard
        filtros={filtros}
        loading={loading}
        onAplicar={onAplicar}
      />

      {erro && (
        <div className="card p-4 border-rose-500 text-rose-500 text-sm">{erro}</div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl shimmer" />)}
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <HeatmapCard
            heatmap={heatmap}
            loadingHeatmap={loadingHeatmap}
            modoHeatmap={modoHeatmap}
            onModoHeatmap={onModoHeatmap}
          />

          <RecursosCard
            dados={dados}
            filtros={filtros}
          />
        </div>
      )}

    </div>
  );
}