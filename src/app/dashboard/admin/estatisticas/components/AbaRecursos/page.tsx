'use client';

import { useState, useEffect } from 'react';
import { FiltrosRelatorio, DadosRecursos } from '../../page';
import { FiltrosRecursos } from './FiltrosRelatorio';
import { FiltrosBarras } from './FiltrosBarras';
import { RecursosCard } from './RecursosCard';

interface Props {
  filtros: FiltrosRelatorio;
  globalVersao: number;
  dados: DadosRecursos;
  loading: boolean;
  erro: string | null;
  onBuscarRecursos: (filtros: FiltrosRelatorio) => void;
}

export function AbaRecursos({ filtros, globalVersao, dados, loading, erro, onBuscarRecursos }: Props) {
  const [salaIds, setSalaIds] = useState<number[]>(filtros.salaIds);
  const [computadorIds, setComputadorIds] = useState<number[]>(filtros.computadorIds);
  const [filtrosLocais, setFiltrosLocais] = useState<FiltrosRelatorio>(filtros);

  // Quando global é aplicado, sobrescreve filtros locais
  useEffect(() => {
    setSalaIds(filtros.salaIds);
    setComputadorIds(filtros.computadorIds);
    setFiltrosLocais(filtros);
  }, [globalVersao]);

  const handleAplicar = (f: FiltrosRelatorio) => {
    const novos = { ...f, salaIds, computadorIds };
    setFiltrosLocais(novos);
    onBuscarRecursos(novos);
  };

  return (
    <div className="space-y-6">

      <FiltrosBarras filtros={filtrosLocais} loading={loading} onAplicar={handleAplicar}>
        <FiltrosRecursos
          salaIds={salaIds}
          computadorIds={computadorIds}
          onChangeSalas={setSalaIds}
          onChangePcs={setComputadorIds}
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
        <RecursosCard dados={dados} filtros={filtrosLocais} />
      )}

    </div>
  );
}