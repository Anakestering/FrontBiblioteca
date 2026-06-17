'use client';

export function formatarNumero(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return n.toLocaleString('pt-BR');
}

export interface CardInfo {
  label: string;
  valor: string;
  sub?: string;
  cor: 'blue' | 'violet' | 'rose' | 'emerald' | 'amber';
}

const cores: Record<CardInfo['cor'], string> = {
  blue:    'text-blue-400',
  violet:  'text-violet-400',
  rose:    'text-rose-400',
  emerald: 'text-emerald-400',
  amber:   'text-amber-400',
};

interface Props {
  cards: CardInfo[];
  loading?: boolean;
}

export function ResumoAbas({ cards, loading }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div key={i} className="card p-4 flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${cores[card.cor]}`}>
            {card.label}
          </span>
          {loading ? (
            <div className="h-7 w-24 rounded shimmer mt-1" />
          ) : (
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-tight truncate">
              {card.valor}
            </span>
          )}
          {card.sub && !loading && (
            <span className="text-xs text-[var(--text-muted)]">{card.sub}</span>
          )}
        </div>
      ))}
    </div>
  );
}