'use client';

import { DadosRecursos, FiltrosRelatorio } from "../../page";

interface Props {
  dados: DadosRecursos;
  filtros: FiltrosRelatorio;
}

export function AbaDownload({ dados, filtros }: Props) {
  return (
    <div className="card p-6">
      <p className="text-[var(--text-muted)]">Baixar Relatório — em breve</p>
    </div>
  );
}