'use client';

import { useState, useEffect, useMemo } from 'react';
import { FiltrosRelatorio, DadosRecursos } from '../../page';
import { FiltrosRecursos } from './FiltrosBarras';
import { FiltrosBarras } from '../FiltrosBase';
import { RecursosCard } from './RecursosCard';
import { ResumoAbas, CardInfo } from '../ResumoAbas';
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

function formatarHoras(minutos: number): string {
  const horas = minutos / 60;
  if (horas >= 1000) return `${(horas / 1000).toFixed(1)}k h`;
  if (horas < 1) return `${minutos}min`;
  return `${Math.round(horas)}h`;
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

  // Cálculos do resumo — derivados dos dados já carregados, sem requisição extra
  const resumo = useMemo(() => {
    const todos = [...dados.computadores, ...dados.salas];
    if (todos.length === 0) return null;

    const comUso = todos.filter(r => r.totalMinutosUsados > 0);
    const maisUsado = comUso.length > 0
      ? comUso.reduce((max, r) => r.totalMinutosUsados > max.totalMinutosUsados ? r : max)
      : null;
    const menosUsado = comUso.length > 1
      ? comUso.reduce((min, r) => r.totalMinutosUsados < min.totalMinutosUsados ? r : min)
      : null;

    const totalMinutos = todos.reduce((s, r) => s + r.totalMinutosUsados, 0);

    const ocupacaoMedia = todos.filter(r => r.minutosDisponiveis > 0).length > 0
      ? todos
          .filter(r => r.minutosDisponiveis > 0)
          .reduce((s, r) => s + (r.totalMinutosUsados / r.minutosDisponiveis) * 100, 0) /
        todos.filter(r => r.minutosDisponiveis > 0).length
      : 0;

    return { maisUsado, menosUsado, totalMinutos, ocupacaoMedia };
  }, [dados]);

  const cards: CardInfo[] = [
    {
      label: 'Recurso mais usado',
      valor: resumo?.maisUsado?.nome ?? '—',
      cor: 'blue' as const,
    },
    {
      label: 'Recurso menos usado',
      valor: resumo?.menosUsado?.nome ?? '—',
      cor: 'violet' as const,
    },
    {
      label: 'Ocupação média',
      valor: resumo ? `${resumo.ocupacaoMedia.toFixed(1)}%` : '—',
      sub: 'dos recursos selecionados',
      cor: 'emerald' as const,
    },
    {
      label: 'Total de horas usadas',
      valor: resumo ? formatarHoras(resumo.totalMinutos) : '—',
      sub: 'todos os recursos',
      cor: 'amber' as const,
    },
  ];

  return (
    <div className="space-y-6">

      <ResumoAbas cards={cards} loading={loading} />

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