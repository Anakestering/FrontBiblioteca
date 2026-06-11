'use client';

import { EstatisticasResumoDTO } from '@/types';

interface Props {
  dados: EstatisticasResumoDTO | null;
  loading: boolean;
}

interface CardProps {
  label: string;
  valor: string;
  sub?: string;
  cor: 'blue' | 'violet' | 'rose' | 'emerald';
  loading: boolean;
}

const cores = {
  blue:    { badge: 'text-blue-400',    bar: 'bg-blue-500' },
  violet:  { badge: 'text-violet-400',  bar: 'bg-violet-500' },
  rose:    { badge: 'text-rose-400',    bar: 'bg-rose-500' },
  emerald: { badge: 'text-emerald-400', bar: 'bg-emerald-500' },
};

function Card({ label, valor, sub, cor, loading }: CardProps) {
  const c = cores[cor];
  return (
    <div className="card p-4 flex flex-col gap-1 min-w-0">
      <span className={`text-[10px] font-semibold uppercase tracking-widest ${c.badge}`}>
        {label}
      </span>
      {loading ? (
        <div className="h-7 w-24 rounded shimmer mt-1" />
      ) : (
        <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-tight">
          {valor}
        </span>
      )}
      {sub && !loading && (
        <span className="text-xs text-[var(--text-muted)]">{sub}</span>
      )}
    </div>
  );
}

export function ResumoCards({ dados, loading }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        label="Total de reservas"
        valor={dados ? dados.totalReservas.toLocaleString('pt-BR') : '—'}
        cor="blue"
        loading={loading}
      />
      <Card
        label="Ocupação média"
        valor={dados ? `${dados.taxaOcupacaoMedia.toFixed(1)}%` : '—'}
        sub="dos recursos no período"
        cor="emerald"
        loading={loading}
      />
      <Card
        label="Taxa de no-show"
        valor={dados ? `${dados.taxaNoShow.toFixed(1)}%` : '—'}
        sub="reservas sem checkin"
        cor="rose"
        loading={loading}
      />
      <Card
        label="Recurso mais usado"
        valor={dados?.recursoMaisUsado ?? '—'}
        sub={dados?.tipoRecursoMaisUsado === 'PC' ? 'Computador' : dados?.tipoRecursoMaisUsado === 'SALA' ? 'Sala' : undefined}
        cor="violet"
        loading={loading}
      />
    </div>
  );
}