'use client';

import { useState, useMemo } from 'react';
import type { ExportSnapshot, ComponenteId } from '../utils/types';
import { COMPONENTES_META, ABA_META } from '../utils/types';

interface Props {
  snapshot: ExportSnapshot | null;
}

function fmtPeriodo(inicio: Date | null | undefined, fim: Date | null | undefined) {
  const f = (d: Date | null | undefined) => d?.toLocaleDateString('pt-BR') ?? null;
  const i = f(inicio), e = f(fim);
  if (!i && !e) return 'Todo o período';
  if (!i) return `Até ${e}`;
  if (!e) return `A partir de ${i}`;
  return `${i} a ${e}`;
}

function SemDados() {
  return (
    <div className="card p-10 text-center space-y-2">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Nenhum dado carregado ainda</p>
      <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
        Navegue pelas abas <strong>Histórico</strong>, <strong>PC/Sala</strong> e <strong>Usuários</strong>.
        Os dados são capturados automaticamente.
      </p>
    </div>
  );
}

export function VisualizacaoAtual({ snapshot }: Props) {
  const todosDisponiveis = useMemo(() =>
    COMPONENTES_META
      .filter(c => {
        if (!snapshot) return false;
        if (c.aba === 'historico') return !!snapshot.historico;
        if (c.aba === 'recursos')  return !!snapshot.recursos;
        if (c.aba === 'usuarios')  return !!snapshot.usuarios;
        return false;
      })
      .map(c => c.id),
  [snapshot]);

  const [selecionados, setSelecionados] = useState<Set<ComponenteId>>(
    () => new Set(COMPONENTES_META.map(c => c.id))
  );
  const [loading, setLoading] = useState<'word' | 'excel' | null>(null);

  if (!snapshot) return <SemDados />;

  const abaPresente = {
    historico: !!snapshot.historico,
    recursos:  !!snapshot.recursos,
    usuarios:  !!snapshot.usuarios,
  };

  function toggle(id: ComponenteId) {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAba(aba: 'historico' | 'recursos' | 'usuarios') {
    const ids = COMPONENTES_META.filter(c => c.aba === aba).map(c => c.id);
    setSelecionados(prev => {
      const allSel = ids.every(id => prev.has(id));
      const next = new Set(prev);
      ids.forEach(id => allSel ? next.delete(id) : next.add(id));
      return next;
    });
  }

  async function baixar(fmt: 'word' | 'excel') {
    if (selecionados.size === 0) return;
    setLoading(fmt);
    try {
      if (fmt === 'word') {
        const { exportSnapshotToWord } = await import('../utils/exportSnapshot');
        exportSnapshotToWord(snapshot!, selecionados, 'o-que-estou-vendo');
      } else {
        const { exportSnapshotToExcel } = await import('../utils/exportSnapshot');
        exportSnapshotToExcel(snapshot!, selecionados, 'o-que-estou-vendo');
      }
    } finally { setLoading(null); }
  }

  const totalSel = COMPONENTES_META.filter(c => selecionados.has(c.id) && abaPresente[c.aba]).length;
  const totalDisp = todosDisponiveis.length;

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Exportar estado atual das abas
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Dados capturados em {snapshot.capturedAt.toLocaleString('pt-BR')} com os filtros aplicados em cada aba.
            {' '}{totalSel} de {totalDisp} seções selecionadas.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setSelecionados(new Set(todosDisponiveis))}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] transition-colors"
          >Tudo</button>
          <button
            onClick={() => setSelecionados(new Set())}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] transition-colors"
          >Nada</button>
          <button onClick={() => baixar('word')} disabled={!!loading || totalSel === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-all">
            {loading === 'word'
              ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            }
            Word
          </button>
          <button onClick={() => baixar('excel')} disabled={!!loading || totalSel === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold transition-all">
            {loading === 'excel'
              ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            }
            Excel
          </button>
        </div>
      </div>

      {/* Cards por aba */}
      {ABA_META.map(({ key, label }) => {
        const disponivel = abaPresente[key];
        const componentes = COMPONENTES_META.filter(c => c.aba === key);
        const periodo = key === 'historico' ? snapshot.historico?.periodo
          : key === 'recursos' ? snapshot.recursos?.periodo
          : snapshot.usuarios?.periodo;

        return (
          <div key={key} className={`space-y-1.5 ${!disponivel ? 'opacity-35 pointer-events-none' : ''}`}>

            {/* Label da aba */}
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => disponivel && toggleAba(key)}
                className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {label}
              </button>
              {periodo && disponivel && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {fmtPeriodo(periodo.inicio, periodo.fim)}
                </span>
              )}
              {!disponivel && (
                <span className="text-[10px] text-[var(--text-muted)]">Aba não visitada</span>
              )}
            </div>

            {/* Grid de cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {componentes.map(c => {
                const sel = selecionados.has(c.id) && disponivel;
                return (
                  <button
                    key={c.id}
                    onClick={() => disponivel && toggle(c.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      sel
                        ? 'border-blue-500/60 bg-blue-600/10 opacity-100'
                        : 'border-transparent bg-[var(--surface-1)] opacity-40 hover:opacity-60'
                    }`}
                  >
                    <p className={`text-xs font-semibold leading-tight ${sel ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                      {c.label}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                      {c.descricao}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
