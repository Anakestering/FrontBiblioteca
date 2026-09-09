'use client';

import { useState } from 'react';
import { RelatorioGeral }    from './subabas/RelatorioGeral';
import { VisualizacaoAtual } from './subabas/VisualizacaoAtual';
import { Selecao }           from './subabas/Selecao';
import { Editor }            from './subabas/Editor';
import type { DadosRecursos, FiltrosRelatorio } from '../../page';
import type { Sala, Computador } from '@/types';
import type { ExportSnapshot } from './utils/types';

type SubAba = 'geral' | 'atual' | 'selecao' | 'editor';

interface SubAbaMeta {
  key: SubAba;
  label: string;
  descricao: string;
  badge?: string;
}

const SUB_ABAS: SubAbaMeta[] = [
  { key: 'geral',    label: 'Relatório Geral',    descricao: 'Resumo automático com as principais métricas. Escolha o período e baixe.' },
  { key: 'atual',   label: 'O que estou vendo',  descricao: 'Exporta o que está carregado nas abas com os filtros já aplicados.' },
  { key: 'selecao', label: 'Seleção',             descricao: 'Escolha quais seções e componentes incluir na exportação.' },
  { key: 'editor',  label: 'Editor',              descricao: 'Monte o relatório do zero arrastando e reordenando os blocos.', badge: 'Em breve' },
];

interface Props {
  dados: DadosRecursos;
  filtros: FiltrosRelatorio;
  exportSnapshot: ExportSnapshot | null;
  salasDisponiveis: Sala[];
  computadoresDisponiveis: Computador[];
}

export function AbaDownload({ dados, filtros, exportSnapshot, salasDisponiveis, computadoresDisponiveis }: Props) {
  const [subAba, setSubAba] = useState<SubAba>('geral');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SUB_ABAS.map(({ key, label, descricao, badge }) => {
          const ativo = subAba === key;
          return (
            <button
              key={key}
              onClick={() => setSubAba(key)}
              className={`text-left p-4 rounded-xl border-2 transition-all space-y-1 ${
                ativo
                  ? 'border-blue-600 bg-blue-600/10'
                  : 'border-[var(--border)] hover:border-[var(--text-muted)] bg-[var(--surface-1)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${ativo ? 'text-blue-400' : 'text-[var(--text-primary)]'}`}>
                  {label}
                </span>
                {badge && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{descricao}</p>
            </button>
          );
        })}
      </div>

      {subAba === 'geral'   && <RelatorioGeral />}
      {subAba === 'atual'   && <VisualizacaoAtual snapshot={exportSnapshot} />}
      {subAba === 'selecao' && <Selecao snapshot={exportSnapshot} salasDisponiveis={salasDisponiveis} computadoresDisponiveis={computadoresDisponiveis} />}
      {subAba === 'editor'  && <Editor />}
    </div>
  );
}
