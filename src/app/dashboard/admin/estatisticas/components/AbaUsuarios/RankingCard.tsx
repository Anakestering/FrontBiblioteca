'use client';

import { useState } from 'react';
import { RankingUsuarioDTO } from '@/types';

const TIPO_LABELS: Record<string, string> = {
  SENAI: 'Senai',
  SESI: 'Sesi',
  COLABORADOR: 'Colaborador',
  RESPONSAVEL: 'Responsável',
  OUTRO: 'Outro',
};

interface Props {
  titulo: string;
  subtitulo: string;
  lista: RankingUsuarioDTO[];
  modo: 'ativos' | 'inativos';
  loading: boolean;
}

const PAGE_SIZE = 5;

export function RankingCard({ titulo, subtitulo, lista, modo, loading }: Props) {
  const [visiveis, setVisiveis] = useState(PAGE_SIZE);

  const itens = lista.slice(0, visiveis);
  const temMais = visiveis < lista.length;

  return (
    <div className="card p-5 flex flex-col gap-4 flex-1 min-w-0">
      {/* Header */}
      <div>
        <h3 className="section-title">{titulo}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitulo}</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg shimmer" />)}
        </div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-6">Sem dados no período</p>
      ) : (
        <>
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <span>Usuário</span>
            {modo === 'ativos' ? (
              <>
                <span className="text-right">Finalizados</span>
                <span className="text-right">Abandon.</span>
                <span className="text-right">No-show</span>
              </>
            ) : (
              <>
                <span className="text-right">Cancelados</span>
                <span className="text-right">Abandon.</span>
                <span className="text-right w-12" />
              </>
            )}
          </div>

          {/* Linhas */}
          <div className="divide-y divide-[var(--border)]">
            {itens.map((u, idx) => (
              <div key={u.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 py-2.5 px-2 items-center">
                {/* Nome + tipo */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] w-4 shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{u.nome}</p>
                  </div>
                  {u.tipoUsuario && (
                    <p className="text-[10px] text-[var(--text-muted)] ml-6">
                      {TIPO_LABELS[u.tipoUsuario] ?? u.tipoUsuario}
                    </p>
                  )}
                </div>

                {modo === 'ativos' ? (
                  <>
                    <span className="text-sm font-bold text-blue-500 tabular-nums text-right">
                      {u.pedidosFinalizados}
                    </span>
                    <span className="text-sm tabular-nums text-right text-[var(--text-secondary)]">
                      {u.pedidosAbandono}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums text-right w-12 ${
                      u.taxaAbandono >= 50 ? 'text-rose-500' :
                      u.taxaAbandono >= 20 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {u.taxaAbandono.toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm tabular-nums text-right text-[var(--text-secondary)]">
                      {u.pedidosCancelados}
                    </span>
                    <span className="text-sm tabular-nums text-right text-amber-500">
                      {u.pedidosAbandono}
                    </span>
                    <span className="w-12" />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Ver mais / ver menos */}
          <div className="flex gap-3">
            {temMais && (
              <button
                onClick={() => setVisiveis(v => v + PAGE_SIZE)}
                className="text-xs text-blue-500 hover:underline"
              >
                Ver mais {Math.min(PAGE_SIZE, lista.length - visiveis)}
              </button>
            )}
            {visiveis > PAGE_SIZE && (
              <button
                onClick={() => setVisiveis(PAGE_SIZE)}
                className="text-xs text-[var(--text-muted)] hover:underline"
              >
                Recolher
              </button>
            )}
            <span className="text-xs text-[var(--text-muted)] ml-auto">
              {Math.min(visiveis, lista.length)} de {lista.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
