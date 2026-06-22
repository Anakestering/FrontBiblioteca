'use client';

import { useMemo } from 'react';
import { DadosRecursos } from '../../page';
import { EstatisticasRecursoDTO } from '@/types';
import { formatarHoras } from '@/lib/utils';

interface Props {
  dados: DadosRecursos;
  loading: boolean;
  diasFuturo: number;
}

/** Encontra o mais e o menos usado dentro de um array, pelo campo dado. */
function maisEMenos(
  items: EstatisticasRecursoDTO[],
  campo: keyof Pick<EstatisticasRecursoDTO, 'totalMinutosUsados' | 'minutosReservadosFuturos'>
): { mais: EstatisticasRecursoDTO | null; menos: EstatisticasRecursoDTO | null } {
  const comUso = items.filter(r => r[campo] > 0);
  if (comUso.length === 0) return { mais: null, menos: null };
  const mais  = comUso.reduce((a, b) => b[campo] > a[campo] ? b : a);
  const menos = comUso.length > 1
    ? comUso.reduce((a, b) => b[campo] < a[campo] ? b : a)
    : null;
  return { mais, menos };
}

/** Nome curto: se for null exibe travessao. */
function nome(r: EstatisticasRecursoDTO | null): string {
  return r?.nome ?? '—';
}

// ─── Card customizado com dois itens (mais / menos) ───────────────────────────

interface CardDuploProps {
  label: string;
  corLabel: string;
  linhas: { icone: string; titulo: string; sala: string; pc: string }[];
  loading: boolean;
}

function CardDuplo({ label, corLabel, linhas, loading }: CardDuploProps) {
  return (
    <div className="card p-4 flex flex-col gap-2 min-w-0">
      <span className={`text-[12px] font-semibold uppercase tracking-widest ${corLabel}`}>
        {label}
      </span>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="space-y-1.5">
            <div className="h-3 w-16 rounded shimmer" />
            <div className="h-3.5 w-20 rounded shimmer" />
            <div className="h-3.5 w-14 rounded shimmer" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-16 rounded shimmer" />
            <div className="h-3.5 w-20 rounded shimmer" />
            <div className="h-3.5 w-14 rounded shimmer" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-0.5">
          {linhas.map((l, i) => (
            <div key={i}>
              <span className="text-[12px] text-[var(--text-muted)] uppercase tracking-wide block mb-1">
                {l.icone} {l.titulo}
              </span>
              <p
                className="text-sm font-semibold text-[var(--text-primary)] truncate"
                title={l.sala}
              >
                {l.sala}
              </p>
              <p
                className="text-sm font-semibold text-[var(--text-primary)] truncate"
                title={l.pc}
              >
                {l.pc}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card simples (igual ao ResumoAbas original) ─────────────────────────────

interface CardSimplesProps {
  label: string;
  valor: string;
  sub?: string;
  corLabel: string;
  loading: boolean;
}

function CardSimples({ label, valor, sub, corLabel, loading }: CardSimplesProps) {
  return (
    <div className="card p-4 flex flex-col gap-1 min-w-0">
      <span className={`text-[12px] font-semibold uppercase tracking-widest ${corLabel}`}>
        {label}
      </span>
      {loading ? (
        <div className="h-7 w-24 rounded shimmer mt-1" />
      ) : (
        <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-tight truncate">
          {valor}
        </span>
      )}
      {sub && !loading && (
        <span className="text-[14px] text-[var(--text-muted)]">{sub}</span>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ResumoCardsRecursos({ dados, loading, diasFuturo }: Props) {
  const resumo = useMemo(() => {
    const salas = dados.salas;
    const pcs   = dados.computadores;
    const todos = [...salas, ...pcs];
    if (todos.length === 0) return null;

    // Passado
    const { mais: maisSalaPassado,  menos: menosSalaPassado  } = maisEMenos(salas, 'totalMinutosUsados');
    const { mais: maisPcPassado,    menos: menosPcPassado    } = maisEMenos(pcs,   'totalMinutosUsados');

    // Futuro
    const { mais: maisSalaFuturo,   menos: menosSalaFuturo   } = maisEMenos(salas, 'minutosReservadosFuturos');
    const { mais: maisPcFuturo,     menos: menosPcFuturo     } = maisEMenos(pcs,   'minutosReservadosFuturos');

    // Cards 3 e 4
    const comDisponivel = todos.filter(r => r.minutosDisponiveis > 0);
    const ocupacaoMedia = comDisponivel.length > 0
      ? comDisponivel.reduce((s, r) => s + (r.totalMinutosUsados / r.minutosDisponiveis) * 100, 0) /
        comDisponivel.length
      : 0;
    const totalMinutos = todos.reduce((s, r) => s + r.totalMinutosUsados, 0);

    return {
      maisSalaPassado, menosSalaPassado,
      maisPcPassado,   menosPcPassado,
      maisSalaFuturo,  menosSalaFuturo,
      maisPcFuturo,    menosPcFuturo,
      ocupacaoMedia,   totalMinutos,
    };
  }, [dados]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Card 1: Passado */}
      <CardDuplo
        label="Até hoje"
        corLabel="text-violet-400"
        loading={loading}
        linhas={[
          {
            icone: '▲',
            titulo: 'Mais usado',
            sala: nome(resumo?.maisSalaPassado ?? null),
            pc:   nome(resumo?.maisPcPassado   ?? null),
          },
          {
            icone: '▼',
            titulo: 'Menos usado',
            sala: nome(resumo?.menosSalaPassado ?? null),
            pc:   nome(resumo?.menosPcPassado   ?? null),
          },
        ]}
      />

      {/* Card 2: Futuro */}
      <CardDuplo
        label={`Prox. ${diasFuturo} dias`}
        corLabel="text-amber-400"
        loading={loading}
        linhas={[
          {
            icone: '▲',
            titulo: 'Mais reservado',
            sala: nome(resumo?.maisSalaFuturo ?? null),
            pc:   nome(resumo?.maisPcFuturo   ?? null),
          },
          {
            icone: '▼',
            titulo: 'Menos reservado',
            sala: nome(resumo?.menosSalaFuturo ?? null),
            pc:   nome(resumo?.menosPcFuturo   ?? null),
          },
        ]}
      />

      {/* Card 3: Ocupação média */}
      <CardSimples
        label="Ocupacao media"
        valor={resumo ? `${resumo.ocupacaoMedia.toFixed(1)}%` : '—'}
        sub="dos recursos selecionados"
        corLabel="text-emerald-400"
        loading={loading}
      />

      {/* Card 4: Total de horas */}
      <CardSimples
        label="Total de horas usadas"
        valor={resumo ? formatarHoras(resumo.totalMinutos) : '—'}
        sub="todos os recursos"
        corLabel="text-blue-400"
        loading={loading}
      />
    </div>
  );
}
