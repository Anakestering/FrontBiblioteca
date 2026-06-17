'use client';

import { useMemo } from 'react';
import { ResumoAbas } from '../ResumoAbas';
import { DadosRecursos } from '../../page';

interface Props {
  dados: DadosRecursos;
  loading: boolean;
}

function formatarHoras(minutos: number): string {
  const horas = minutos / 60;
  if (horas >= 1000) return `${(horas / 1000).toFixed(1)}k h`;
  if (horas < 1) return `${minutos}min`;
  return `${Math.round(horas)}h`;
}

export function ResumoCardsRecursos({ dados, loading }: Props) {
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

  const cards = [
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

  return <ResumoAbas cards={cards} loading={loading} />;
}
