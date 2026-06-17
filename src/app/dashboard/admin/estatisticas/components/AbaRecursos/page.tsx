'use client';

import { useState, useEffect } from 'react';
import { FiltrosRelatorio, DadosRecursos } from '../../page';
import { FiltrosRecursos } from './FiltrosBarras';
import { FiltrosBarras } from '../FiltrosBase';
import { RecursosCard } from './RecursosCard';
import { ResumoCardsRecursos } from './ResumoCards';
import { Sala, Computador } from '@/types';

interface Props {
  filtros: FiltrosRelatorio;
  globalVersao: number;
  dados: DadosRecursos;
  loading: boolean;
  erro: string | null;
  onBuscarRecursos: (filtros: FiltrosRelatorio) => void;
  salasDisponiveis: Sala[];
  computadoresDisponiveis: Computador[];
}

export function AbaRecursos({ filtros, globalVersao, dados, loading, erro, onBuscarRecursos, salasDisponiveis, computadoresDisponiveis }: Props) {
  const [salaIds, setSalaIds]             = useState<number[]>(filtros.salaIds);
  const [computadorIds, setComputadorIds] = useState<number[]>(filtros.computadorIds);

  useEffect(() => {
    if (globalVersao === 0) return;
    setSalaIds(filtros.salaIds);
    setComputadorIds(filtros.computadorIds);
  }, [globalVersao]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAplicar = (f: FiltrosRelatorio) => {
    onBuscarRecursos({ ...f, salaIds, computadorIds });
  };

  return (
    <div className="space-y-6">

      <ResumoCardsRecursos dados={dados} loading={loading} />

      <FiltrosBarras
        filtros={filtros}
        globalVersao={globalVersao}
        loading={loading}
        onAplicar={handleAplicar}
      >
        <FiltrosRecursos
          salaIds={salaIds}
          computadorIds={computadorIds}
          onChangeSalas={setSalaIds}
          onChangePcs={setComputadorIds}
          salasDisponiveis={salasDisponiveis}
          computadoresDisponiveis={computadoresDisponiveis}
        />
      </FiltrosBarras>

      {erro && (
        <div className="card p-4 border-rose-500 text-rose-500 text-sm">{erro}</div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl shimmer" />)}
        </div>
      )}

      {!loading && (
        <RecursosCard dados={dados} />
      )}

    </div>
  );
}