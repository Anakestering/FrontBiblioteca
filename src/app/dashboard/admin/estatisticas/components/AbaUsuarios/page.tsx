'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiltrosRelatorio } from '../../page';
import { EstatisticasUsuariosDTO } from '@/types';
import { relatorios } from '@/lib/api';
import { toISOLocal } from '@/lib/utils';
import { DonutsCard } from './DonutsCard';
import { RankingCard } from './RankingCard';
import { CrescimentoCard } from './CrescimentoCard';

interface Props {
  filtros: FiltrosRelatorio;
  globalVersao: number;
}

export function AbaUsuarios({ filtros, globalVersao }: Props) {
  const [dados, setDados] = useState<EstatisticasUsuariosDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async (f: FiltrosRelatorio) => {
    setLoading(true);
    setErro(null);
    try {
      const data = await relatorios.usuarios({
        inicio: f.inicio ? toISOLocal(f.inicio) : undefined,
        fim:    f.fim    ? toISOLocal(f.fim, true) : undefined,
      });
      setDados(data);
    } catch (err) {
      console.error(err);
      setErro('Erro ao carregar dados de usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (globalVersao === 0) return;
    buscar(filtros);
  }, [globalVersao]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">

      {erro && (
        <div className="card p-4 border-rose-500 text-rose-500 text-sm">{erro}</div>
      )}

      {/* 3 Donuts lado a lado */}
      <DonutsCard distribuicao={dados?.distribuicao ?? []} loading={loading} />

      {/* Rankings */}
      <div className="flex gap-6 items-start">
        <RankingCard
          titulo="Mais frequentes"
          subtitulo="Usuários com ao menos 1 pedido finalizado no período"
          lista={dados?.ranking ?? []}
          modo="ativos"
          loading={loading}
        />
        <RankingCard
          titulo="Não compareceram"
          subtitulo="Fizeram pedidos mas nenhum foi finalizado"
          lista={dados?.naoCompareceram ?? []}
          modo="inativos"
          loading={loading}
        />
      </div>

      {/* Crescimento */}
      <CrescimentoCard crescimento={dados?.crescimento ?? []} loading={loading} />

    </div>
  );
}
