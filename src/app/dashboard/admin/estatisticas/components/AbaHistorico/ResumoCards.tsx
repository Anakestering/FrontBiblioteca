'use client';

import { ResumoAbas, CardInfo } from '../ResumoAbas';

interface Ponto {
  total: number;
  totalReservas?: number;
}

interface DadosLinear {
  pontos: Ponto[];
  tendencia: { pct: number; subindo: boolean } | null;
  mediaPessoasDia: number;
  taxaAbandono: number;
}

interface Props {
  dados: DadosLinear | null;
  picoHorario: string | null;
  loading: boolean;
}

export function ResumoCardsHistorico({ dados, picoHorario, loading }: Props) {
  const totalPedidos = dados
    ? dados.pontos.reduce((s, p) => s + p.total, 0)
    : 0;

  const totalReservasFeitasGlobal = dados
    ? dados.pontos.reduce((s, p) => s + (p.totalReservas ?? 0), 0)
    : 0;

  const tendenciaValor = () => {
    const t = dados?.tendencia;
    const taxa = dados?.taxaAbandono ?? 0;
    if (!t && taxa === 0) return '—';
    const parts: string[] = [];
    if (t) parts.push(`${t.subindo ? '↑' : '↓'} ${t.pct.toFixed(1)}%`);
    if (taxa > 0) parts.push(`${taxa.toFixed(1)}% aband.`);
    return parts.join('  ·  ');
  };

  const tendenciaSub = () => {
    const t = dados?.tendencia;
    const taxa = dados?.taxaAbandono ?? 0;
    if (!t && taxa === 0) return 'dados insuficientes';
    const parts: string[] = [];
    if (t) parts.push(t.subindo ? 'crescimento' : 'queda');
    if (taxa > 0) parts.push('taxa de abandono');
    return parts.join(' · ');
  };

  const tendenciaCor = (): CardInfo['cor'] => {
    const t = dados?.tendencia;
    if (!t) return 'violet';
    return t.subindo ? 'emerald' : 'rose';
  };

  const cards: CardInfo[] = [
    {
      label: 'Pedidos finalizados',
      valor: totalPedidos.toLocaleString('pt-BR'),
      sub: totalReservasFeitasGlobal > 0
        ? `${totalReservasFeitasGlobal.toLocaleString('pt-BR')} reservas finalizadas`
        : undefined,
      cor: 'blue',
    },
    {
      label: 'Pico de horário',
      valor: picoHorario ?? '—',
      sub: 'horário mais movimentado',
      cor: 'amber',
    },
    {
      label: 'Média de pessoas/dia',
      valor: dados ? dados.mediaPessoasDia.toLocaleString('pt-BR') : '—',
      sub: 'dias úteis no período',
      cor: 'emerald',
    },
    {
      label: 'Tendência',
      valor: tendenciaValor(),
      sub: tendenciaSub(),
      cor: tendenciaCor(),
    },
  ];

  return <ResumoAbas cards={cards} loading={loading} />;
}
