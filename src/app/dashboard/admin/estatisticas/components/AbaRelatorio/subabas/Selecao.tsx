'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ExportSnapshot, ComponenteId, SnapshotHistorico, SnapshotRecursos, SnapshotUsuarios } from '../utils/types';
import { COMPONENTES_META, ABA_META } from '../utils/types';
import { FiltroPeriodoInline } from '../../FiltroPeriodoInline';
import { relatorios } from '@/lib/api';
import { toISOLocal } from '@/lib/utils';
import type { Sala, Computador } from '@/types';
import type { ReportPeriodo } from '../utils/types';

// ─── Tipos de configuração por seção ─────────────────────────────────────────

interface ConfigHistorico {
  periodo: ReportPeriodo;
  agrupamento: 'dia' | 'semana' | 'mes';
}

interface ConfigHeatmap {
  periodo: ReportPeriodo;
  modo: 'media' | 'total';
}

interface ConfigRecursos {
  periodo: ReportPeriodo;
  salaIds: number[];
  computadorIds: number[];
  diasFuturo: number;
}

interface ConfigUsuarios {
  periodo: ReportPeriodo;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPeriodo(inicio: Date | null | undefined, fim: Date | null | undefined) {
  const f = (d: Date | null | undefined) => d?.toLocaleDateString('pt-BR') ?? null;
  const i = f(inicio), e = f(fim);
  if (!i && !e) return 'Todo o período';
  if (!i) return `Até ${e}`;
  if (!e) return `A partir de ${i}`;
  return `${i} a ${e}`;
}

function toParams(p: ReportPeriodo) {
  return {
    inicio: p.inicio ? toISOLocal(p.inicio) : undefined,
    fim:    p.fim    ? toISOLocal(p.fim, true) : undefined,
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  snapshot: ExportSnapshot | null;
  salasDisponiveis: Sala[];
  computadoresDisponiveis: Computador[];
}

// ─── Sub-componente: Filtro de período inline pequeno ─────────────────────────

function FiltroCompacto({ valor, onChange }: {
  valor: ReportPeriodo;
  onChange: (p: ReportPeriodo) => void;
}) {
  return (
    <FiltroPeriodoInline
      valor={{ inicio: valor.inicio, fim: valor.fim }}
      onChange={p => onChange({ inicio: p.inicio, fim: p.fim })}
    />
  );
}

// ─── Sem dados ────────────────────────────────────────────────────────────────

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

// ─── Componente principal ────────────────────────────────────────────────────

export function Selecao({ snapshot, salasDisponiveis, computadoresDisponiveis }: Props) {
  // ─── Estado de seleção de componentes ─────────────────────────────────────
  const [selecionados, setSelecionados] = useState<Set<ComponenteId>>(
    () => new Set(COMPONENTES_META.map(c => c.id))
  );

  // ─── Filtros por seção (inicializados do snapshot) ─────────────────────────
  const [cfgHistorico, setCfgHistorico] = useState<ConfigHistorico>(() => ({
    periodo: snapshot?.historico?.periodo ?? { inicio: null, fim: null },
    agrupamento: 'dia',
  }));
  const [cfgHeatmap, setCfgHeatmap] = useState<ConfigHeatmap>(() => ({
    periodo: snapshot?.historico?.periodo ?? { inicio: null, fim: null },
    modo: 'total',
  }));
  const [cfgRecursos, setCfgRecursos] = useState<ConfigRecursos>(() => ({
    periodo: snapshot?.recursos?.periodo ?? { inicio: null, fim: null },
    salaIds: salasDisponiveis.map(s => s.id),
    computadorIds: computadoresDisponiveis.map(c => c.id),
    diasFuturo: snapshot?.recursos?.diasFuturo ?? 30,
  }));
  const [cfgUsuarios, setCfgUsuarios] = useState<ConfigUsuarios>(() => ({
    periodo: snapshot?.usuarios?.periodo ?? { inicio: null, fim: null },
  }));

  const [loading, setLoading] = useState<'word' | 'excel' | null>(null);
  const [erros, setErros] = useState<string[]>([]);

  if (!snapshot) return <SemDados />;

  const abaPresente = {
    historico: !!snapshot.historico,
    recursos:  !!snapshot.recursos,
    usuarios:  !!snapshot.usuarios,
  };

  const todosDisponiveis = COMPONENTES_META
    .filter(c => abaPresente[c.aba])
    .map(c => c.id);

  // ─── Toggle ────────────────────────────────────────────────────────────────

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

  // ─── Fetch e exportação ────────────────────────────────────────────────────

  async function fetchEExportar(fmt: 'word' | 'excel') {
    if (selecionados.size === 0) return;
    setLoading(fmt);
    setErros([]);

    const novosErros: string[] = [];

    // Determina quais abas têm componentes selecionados
    const querHistorico = COMPONENTES_META.some(c => c.aba === 'historico' && selecionados.has(c.id) && abaPresente.historico);
    const querHeatmap   = selecionados.has('historico_heatmap') && abaPresente.historico;
    const querOcupacao  = selecionados.has('historico_ocupacao_dia') && abaPresente.historico;
    const querRecursos  = COMPONENTES_META.some(c => c.aba === 'recursos' && selecionados.has(c.id) && abaPresente.recursos);
    const querUsuarios  = COMPONENTES_META.some(c => c.aba === 'usuarios' && selecionados.has(c.id) && abaPresente.usuarios);

    // Fetch em paralelo
    const [
      historicoRes,
      heatmapRes,
      ocupacaoRes,
      salasRes,
      pcsRes,
      statusRes,
      usuariosRes,
    ] = await Promise.allSettled([
      querHistorico
        ? relatorios.historico({ ...toParams(cfgHistorico.periodo), agrupamento: cfgHistorico.agrupamento })
        : Promise.resolve(null),
      querHeatmap
        ? relatorios.heatmap(toParams(cfgHeatmap.periodo))
        : Promise.resolve(null),
      querOcupacao
        ? relatorios.ocupacaoSemana(toParams(cfgHistorico.periodo))
        : Promise.resolve(null),
      (querRecursos && cfgRecursos.salaIds.length > 0 && selecionados.has('recursos_salas'))
        ? relatorios.salas({ ...toParams(cfgRecursos.periodo), salaIds: cfgRecursos.salaIds, diasFuturo: cfgRecursos.diasFuturo })
        : Promise.resolve(null),
      (querRecursos && cfgRecursos.computadorIds.length > 0 && selecionados.has('recursos_pcs'))
        ? relatorios.computadores({ ...toParams(cfgRecursos.periodo), computadorIds: cfgRecursos.computadorIds, diasFuturo: cfgRecursos.diasFuturo })
        : Promise.resolve(null),
      querRecursos
        ? relatorios.status({ ...toParams(cfgRecursos.periodo), salaIds: cfgRecursos.salaIds, computadorIds: cfgRecursos.computadorIds })
        : Promise.resolve(null),
      querUsuarios
        ? relatorios.usuarios(toParams(cfgUsuarios.periodo))
        : Promise.resolve(null),
    ]);

    // Extrair resultados com tolerância a erros
    function get<T>(res: PromiseSettledResult<T | null>, label: string): T | null {
      if (res.status === 'rejected') { novosErros.push(label); return null; }
      return res.value;
    }

    const historicoDados   = get(historicoRes, 'Histórico linear');
    const heatmapDados     = get(heatmapRes,   'Mapa de calor');
    const ocupacaoDados    = get(ocupacaoRes,   'Ocupação por dia');
    const salasDados       = get(salasRes,      'Salas');
    const pcsDados         = get(pcsRes,        'Computadores');
    const statusDados      = get(statusRes,     'Status de reservas');
    const usuariosDados    = get(usuariosRes,   'Usuários');

    if (novosErros.length > 0) setErros(novosErros);

    // Monta snapshot fresco com os dados buscados
    const snapshotFresco: ExportSnapshot = {
      capturedAt: new Date(),
      filtrosGlobais: cfgHistorico.periodo,
      historico: querHistorico ? {
        periodo: cfgHistorico.periodo,
        dadosLinear: historicoDados ? {
          pontos: historicoDados.pontos ?? [],
          tendencia: historicoDados.tendencia ?? null,
          mediaPessoasDia: historicoDados.mediaPessoasDia ?? 0,
          abandonos: historicoDados.abandonos ?? [],
          tendenciaAbandono: historicoDados.tendenciaAbandono ?? null,
          taxaAbandono: historicoDados.taxaAbandono ?? 0,
        } : null,
        heatmap: heatmapDados ?? (querHeatmap ? [] : (snapshot?.historico?.heatmap ?? [])),
        picoHorario: snapshot?.historico?.picoHorario ?? null,
        ocupacaoDia: ocupacaoDados ?? [],
      } satisfies SnapshotHistorico : null,
      recursos: querRecursos ? {
        periodo: cfgRecursos.periodo,
        salas: salasDados ?? [],
        computadores: pcsDados ?? [],
        status: statusDados,
        diasFuturo: cfgRecursos.diasFuturo,
      } satisfies SnapshotRecursos : null,
      usuarios: querUsuarios ? {
        periodo: cfgUsuarios.periodo,
        data: usuariosDados,
      } satisfies SnapshotUsuarios : null,
    };

    try {
      if (fmt === 'word') {
        const { exportSnapshotToWord } = await import('../utils/exportSnapshot');
        exportSnapshotToWord(snapshotFresco, selecionados, 'selecao');
      } else {
        const { exportSnapshotToExcel } = await import('../utils/exportSnapshot');
        exportSnapshotToExcel(snapshotFresco, selecionados, 'selecao');
      }
    } catch (e) {
      setErros(prev => [...prev, 'Erro ao gerar arquivo']);
    } finally {
      setLoading(null);
    }
  }

  const totalSel = COMPONENTES_META.filter(c => selecionados.has(c.id) && abaPresente[c.aba]).length;

  const Spinner = () => (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
  const DownIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
    </svg>
  );

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Selecionar seções e configurar filtros
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Escolha o que incluir e ajuste os filtros de cada seção.
            {' '}{totalSel} {totalSel !== 0 ? 'seçôes' : 'seção'} selecionada{totalSel !== 0 ? 's' : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button onClick={() => setSelecionados(new Set(todosDisponiveis))}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] transition-colors">
            Tudo
          </button>
          <button onClick={() => setSelecionados(new Set())}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] transition-colors">
            Nada
          </button>
          <button onClick={() => fetchEExportar('word')} disabled={!!loading || totalSel === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-all">
            {loading === 'word' ? <Spinner /> : <DownIcon />} Word
          </button>
          <button onClick={() => fetchEExportar('excel')} disabled={!!loading || totalSel === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold transition-all">
            {loading === 'excel' ? <Spinner /> : <DownIcon />} Excel
          </button>
        </div>
      </div>

      {/* Avisos de erro */}
      {erros.length > 0 && (
        <div className="card p-3 border border-amber-500/30 bg-amber-500/10">
          <p className="text-xs font-semibold text-amber-400 mb-1">Algumas seções não puderam ser carregadas:</p>
          <p className="text-xs text-amber-300/80">{erros.join(', ')}</p>
        </div>
      )}

      {/* ─── Histórico ─────────────────────────────────────────────────────── */}
      {abaPresente.historico && (
        <div className="card overflow-hidden">
          {/* Header da aba */}
          <div className="px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => toggleAba('historico')}
              className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Histórico
            </button>
            {/* Filtro de período compartilhado por componentes do histórico */}
            <FiltroCompacto
              valor={cfgHistorico.periodo}
              onChange={p => setCfgHistorico(prev => ({ ...prev, periodo: p }))}
            />
          </div>

          {/* Cards de componente */}
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMPONENTES_META.filter(c => c.aba === 'historico').map(c => {
              const sel = selecionados.has(c.id);
              return (
                <button key={c.id} onClick={() => toggle(c.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    sel ? 'border-blue-500/60 bg-blue-600/10' : 'border-transparent bg-[var(--surface-2)] opacity-40 hover:opacity-60'
                  }`}>
                  <p className={`text-xs font-semibold leading-tight ${sel ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {c.label}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{c.descricao}</p>
                </button>
              );
            })}
          </div>

          {/* Filtro extra do heatmap (modo media/total) */}
          {selecionados.has('historico_heatmap') && (
            <div className="px-4 py-2.5 border-t border-[var(--border)] flex items-center gap-3">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">Mapa de calor —</span>
              <div className="flex rounded-md overflow-hidden border border-[var(--border)]">
                {(['total', 'media'] as const).map(modo => (
                  <button key={modo}
                    onClick={() => setCfgHeatmap(prev => ({ ...prev, modo }))}
                    className={`text-[10px] px-3 py-1 font-medium capitalize transition-all ${
                      cfgHeatmap.modo === modo
                        ? 'bg-[rgba(255,255,255,0.1)] text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] opacity-50 hover:opacity-80'
                    }`}>
                    {modo === 'total' ? 'Total' : 'Média'}
                  </button>
                ))}
              </div>
              <FiltroCompacto
                valor={cfgHeatmap.periodo}
                onChange={p => setCfgHeatmap(prev => ({ ...prev, periodo: p }))}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── Recursos ──────────────────────────────────────────────────────── */}
      {abaPresente.recursos && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
            <button onClick={() => toggleAba('recursos')}
              className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              PC / Sala
            </button>
            <FiltroCompacto
              valor={cfgRecursos.periodo}
              onChange={p => setCfgRecursos(prev => ({ ...prev, periodo: p }))}
            />
          </div>

          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMPONENTES_META.filter(c => c.aba === 'recursos').map(c => {
              const sel = selecionados.has(c.id);
              return (
                <button key={c.id} onClick={() => toggle(c.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    sel ? 'border-blue-500/60 bg-blue-600/10' : 'border-transparent bg-[var(--surface-2)] opacity-40 hover:opacity-60'
                  }`}>
                  <p className={`text-xs font-semibold leading-tight ${sel ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {c.label}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{c.descricao}</p>
                </button>
              );
            })}
          </div>

          {/* Filtros de salas e PCs */}
          {(selecionados.has('recursos_salas') || selecionados.has('recursos_status')) && salasDisponiveis.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[var(--border)] space-y-2">
              <p className="text-[10px] font-medium text-[var(--text-muted)]">Salas incluídas</p>
              <div className="flex flex-wrap gap-1.5">
                {salasDisponiveis.map(s => {
                  const sel = cfgRecursos.salaIds.includes(s.id);
                  return (
                    <button key={s.id}
                      onClick={() => setCfgRecursos(prev => ({
                        ...prev,
                        salaIds: sel
                          ? prev.salaIds.filter(id => id !== s.id)
                          : [...prev.salaIds, s.id],
                      }))}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        sel
                          ? 'border-blue-500/60 bg-blue-600/10 text-blue-400'
                          : 'border-[var(--border)] text-[var(--text-muted)] opacity-40 hover:opacity-70'
                      }`}>
                      {s.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(selecionados.has('recursos_pcs') || selecionados.has('recursos_status')) && computadoresDisponiveis.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[var(--border)] space-y-2">
              <p className="text-[10px] font-medium text-[var(--text-muted)]">PCs incluídos</p>
              <div className="flex flex-wrap gap-1.5">
                {computadoresDisponiveis.map(c => {
                  const sel = cfgRecursos.computadorIds.includes(c.id);
                  return (
                    <button key={c.id}
                      onClick={() => setCfgRecursos(prev => ({
                        ...prev,
                        computadorIds: sel
                          ? prev.computadorIds.filter(id => id !== c.id)
                          : [...prev.computadorIds, c.id],
                      }))}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        sel
                          ? 'border-blue-500/60 bg-blue-600/10 text-blue-400'
                          : 'border-[var(--border)] text-[var(--text-muted)] opacity-40 hover:opacity-70'
                      }`}>
                      {c.codigo}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Usuários ──────────────────────────────────────────────────────── */}
      {abaPresente.usuarios && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
            <button onClick={() => toggleAba('usuarios')}
              className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Usuários
            </button>
            <FiltroCompacto
              valor={cfgUsuarios.periodo}
              onChange={p => setCfgUsuarios({ periodo: p })}
            />
          </div>

          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMPONENTES_META.filter(c => c.aba === 'usuarios').map(c => {
              const sel = selecionados.has(c.id);
              return (
                <button key={c.id} onClick={() => toggle(c.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    sel ? 'border-blue-500/60 bg-blue-600/10' : 'border-transparent bg-[var(--surface-2)] opacity-40 hover:opacity-60'
                  }`}>
                  <p className={`text-xs font-semibold leading-tight ${sel ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {c.label}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{c.descricao}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Abas não visitadas */}
      {ABA_META.filter(a => !abaPresente[a.key]).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {ABA_META.filter(a => !abaPresente[a.key]).map(({ key, label }) => (
            <div key={key} className="card px-4 py-2.5 opacity-30 flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">{label}</span>
              <span className="text-[10px] text-[var(--text-muted)]">— aba não visitada</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
