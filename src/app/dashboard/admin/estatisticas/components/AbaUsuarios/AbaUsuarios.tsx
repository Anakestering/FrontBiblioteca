'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiltrosRelatorio } from '../../page';
import { FiltroPeriodoInline } from '../FiltroPeriodoInline';
import { relatorios } from '@/lib/api';
import { EstatisticasUsuariosDTO, DistribuicaoTipoDTO, RankingUsuarioDTO } from '@/types';
import { toISOLocal, PeriodoFiltro, maskCpf } from '@/lib/utils';

interface Props {
  filtros: FiltrosRelatorio;
  globalVersao: number;
}

const TIPO_LABELS: Record<string, string> = {
  SENAI: 'Senai', SESI: 'Sesi', COLABORADOR: 'Colaborador',
  RESPONSAVEL: 'Responsável', OUTRO: 'Outro',
};
const TIPO_COR_BG: Record<string, string> = {
  SENAI: 'bg-blue-500', SESI: 'bg-violet-500', COLABORADOR: 'bg-emerald-500',
  RESPONSAVEL: 'bg-amber-500', OUTRO: 'bg-gray-400',
};
const TIPO_COR_TEXT: Record<string, string> = {
  SENAI: 'text-blue-500', SESI: 'text-violet-500', COLABORADOR: 'text-emerald-500',
  RESPONSAVEL: 'text-amber-500', OUTRO: 'text-gray-400',
};
const TIPOS = ['SENAI', 'SESI', 'COLABORADOR', 'RESPONSAVEL', 'OUTRO'];

type StatusFiltro = 'finalizadas' | 'canceladas' | 'abandonos';
type MaisMenos = 'mais' | 'menos';

function toParams(p: PeriodoFiltro) {
  return {
    inicio: p.inicio ? toISOLocal(p.inicio) : undefined,
    fim: p.fim ? toISOLocal(p.fim, true) : undefined,
  };
}

// ─── Hook para buscar dados por período ──────────────────────────────────────

function useDadosUsuarios(periodo: PeriodoFiltro) {
  const [data, setData] = useState<EstatisticasUsuariosDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    relatorios.usuarios(toParams(periodo))
      .then(d => { if (ativo) setData(d); })
      .catch(console.error)
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [periodo.inicio?.getTime(), periodo.fim?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading };
}

// ─── Mini gráfico de barras ───────────────────────────────────────────────────

function MiniBarras({
  distribuicao, campo, titulo, tooltip, loading,
}: {
  distribuicao: DistribuicaoTipoDTO[];
  campo: 'pedidosFinalizados' | 'totalAbandonos' | 'totalCancelamentos';
  titulo: string;
  tooltip: string;
  loading: boolean;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const values = useMemo(() => {
    const map: Record<string, number> = {};
    distribuicao.forEach(d => { map[d.tipo] = d[campo] as number; });
    return map;
  }, [distribuicao, campo]);

  const totalPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    distribuicao.forEach(d => {
      map[d.tipo] = d.pedidosFinalizados + d.totalAbandonos + d.totalCancelamentos;
    });
    return map;
  }, [distribuicao]);

  const total = TIPOS.reduce((s, t) => s + (values[t] ?? 0), 0);
  const max = Math.max(1, ...TIPOS.map(t => values[t] ?? 0));

  const toggle = (tipo: string) =>
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo); else next.add(tipo);
      return next;
    });

  const infoTipos = (selecionados.size === 0 ? TIPOS : [...selecionados])
    .filter(t => (values[t] ?? 0) > 0);

  return (
    <div className="card p-4 flex flex-col gap-3 min-w-0">
      {/* Título */}
      <div className="group relative inline-flex items-center gap-1 cursor-default w-fit">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{titulo}</span>

        <div className="absolute bottom-full left-0 mb-1 z-10 hidden group-hover:block bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 whitespace-nowrap shadow-xl pointer-events-none">
          {tooltip}
        </div>
      </div>

      {loading ? (
        <div className="flex items-end gap-1.5 h-14">
          {TIPOS.map(t => <div key={t} className="flex-1 rounded-t shimmer h-8" />)}
        </div>
      ) : (
        <>
          <div className="flex items-end gap-1.5 h-14">
            {TIPOS.map(tipo => {
              const val = values[tipo] ?? 0;
              const pct = max > 0 ? (val / max) * 100 : 0;
              const ativo = selecionados.size === 0 || selecionados.has(tipo);
              return (
                <div key={tipo} className="group/bar flex-1 flex flex-col items-center gap-0.5 cursor-pointer relative" onClick={() => toggle(tipo)}>
                  <div className="w-full flex flex-col justify-end h-12">
                    <div
                      className={`w-full rounded-t transition-all duration-500 ${TIPO_COR_BG[tipo] ?? 'bg-gray-400'} ${ativo ? 'opacity-90' : 'opacity-15'}`}
                      style={{ height: `${Math.max(pct, val > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className={`text-[8px] font-medium transition-opacity ${ativo ? (TIPO_COR_TEXT[tipo] ?? 'text-gray-400') : 'text-[var(--text-muted)] opacity-30'}`}>
                    {tipo.slice(0, 3)}
                  </span>
                  {val > 0 && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 hidden group-hover/bar:block bg-[#111] border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 whitespace-nowrap shadow-xl pointer-events-none">
                      <span className="font-bold">{val}</span>
                      <span className="text-gray-400 ml-1">({total > 0 ? Math.round((val / total) * 100) : 0}% do total)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total + info inline (sem truncar) */}
          <div className="flex items-start gap-3 flex-wrap">
            <div className="shrink-0">
              <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">Total</p>
              <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{total}</p>
            </div>
            {infoTipos.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 min-w-0">
                {infoTipos.map(tipo => {
                  const val = values[tipo] ?? 0;
                  const tot = totalPorTipo[tipo] ?? 0;
                  return (
                    <div key={tipo} className="flex items-baseline gap-1">
                      <span className={`text-xs font-medium ${TIPO_COR_TEXT[tipo] ?? 'text-gray-400'}`}>
                        {TIPO_LABELS[tipo]}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">{val}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Seção dos 3 blocos com filtro próprio ────────────────────────────────────

function SecaoBlocos({ filtroGlobal }: { filtroGlobal: PeriodoFiltro }) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>(filtroGlobal);

  // Sincroniza com global quando ele muda
  useEffect(() => { setPeriodo(filtroGlobal); }, [filtroGlobal.inicio?.getTime(), filtroGlobal.fim?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading } = useDadosUsuarios(periodo);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <FiltroPeriodoInline valor={periodo} loading={loading} onChange={setPeriodo} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MiniBarras distribuicao={data?.distribuicao ?? []} campo="pedidosFinalizados"
          titulo="Finalizadas" tooltip="Pedidos concluídos por tipo de usuário" loading={loading} />
        <MiniBarras distribuicao={data?.distribuicao ?? []} campo="totalAbandonos"
          titulo="Abandonos" tooltip="Pedidos ATRASADO (não compareceram) por tipo de usuário" loading={loading} />
        <MiniBarras distribuicao={data?.distribuicao ?? []} campo="totalCancelamentos"
          titulo="Cancelamentos" tooltip="Pedidos cancelados por tipo de usuário" loading={loading} />
      </div>
    </div>
  );
}

// ─── Cards de resumo ──────────────────────────────────────────────────────────

function CardsResumo({ data, loading }: { data: EstatisticasUsuariosDTO | null; loading: boolean }) {
  const shimmer = <div className="h-7 w-16 rounded shimmer mt-1" />;

  // Card 1: Taxa de comparecimento
  const { totalFin, totalTodos } = useMemo(() => {
    if (!data) return { totalFin: 0, totalTodos: 0 };
    return data.distribuicao.reduce((acc, d) => ({
      totalFin: acc.totalFin + d.pedidosFinalizados,
      totalTodos: acc.totalTodos + d.pedidosFinalizados + d.totalAbandonos + d.totalCancelamentos,
    }), { totalFin: 0, totalTodos: 0 });
  }, [data]);
  const taxaComparec = totalTodos > 0 ? Math.round((totalFin / totalTodos) * 100) : null;

  // Card 2: % por tipo cadastrado
  const tiposPct = useMemo(() => {
    if (!data) return [];
    const total = data.totalCadastrados || 1;
    return TIPOS
      .filter(t => (data.totalPorTipo[t] ?? 0) > 0)
      .map(t => ({ tipo: t, pct: Math.round(((data.totalPorTipo[t] ?? 0) / total) * 100) }));
  }, [data]);

  // Card 3: desempenho por tipo (% finalizadas vs total de pedidos do tipo)
  const tiposDesempenho = useMemo(() => {
    if (!data) return [];
    return TIPOS
      .filter(t => data.distribuicao.some(d => d.tipo === t))
      .map(t => {
        const d = data.distribuicao.find(x => x.tipo === t);
        if (!d) return null;
        const total = d.pedidosFinalizados + d.totalAbandonos + d.totalCancelamentos;
        const pct = total > 0 ? Math.round((d.pedidosFinalizados / total) * 100) : 0;
        return { tipo: t, pct, total };
      })
      .filter(Boolean) as { tipo: string; pct: number; total: number }[];
  }, [data]);

  // Card 4: crescimento — sparkline 5 meses + variação
  const crescimentoData = useMemo(() => {
    if (!data || data.crescimento.length < 2) return null;
    const sorted = [...data.crescimento].sort((a, b) => a.mes.localeCompare(b.mes));
    const ultimos = sorted.slice(-5);
    const atual = ultimos[ultimos.length - 1].novosCadastros;
    const anterior = ultimos.length >= 2 ? ultimos[ultimos.length - 2].novosCadastros : 0;
    const pct = anterior === 0 ? (atual > 0 ? 100 : 0) : Math.round(((atual - anterior) / anterior) * 100);
    const maxVal = Math.max(1, ...ultimos.map(m => m.novosCadastros));
    return { ultimos, atual, anterior, pct: Math.abs(pct), subindo: pct >= 0, maxVal };
  }, [data]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      {/* Card 1: Taxa de comparecimento */}
      <div className="card p-4 flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">Comparecimento</p>
        {loading ? shimmer : taxaComparec === null ? (
          <p className="text-xs text-[var(--text-muted)] mt-1">Sem dados</p>
        ) : (
          <div className="flex items-end gap-1.5 mt-0.5">
            <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{taxaComparec}%</span>
          </div>
        )}
        <p className="text-[12px] text-[var(--text-muted)]">pedidos finalizados</p>

      </div>

      {/* Card 2: % tipos cadastrados */}
      <div className="card p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Tipos cadastrados</p>
          <span className="text-[13px] text-[var(--text-muted)] opacity-60">total cadastrados</span>
        </div>
        {loading ? (
          <div className="space-y-1 mt-1">{TIPOS.slice(0, 3).map(t => <div key={t} className="h-3.5 w-full rounded shimmer" />)}</div>
        ) : (
          <div className="space-y-1 mt-1">
            {tiposPct.map(({ tipo, pct }) => (
              <div key={tipo} className="flex items-center gap-1.5">
                <span className={`text-xs font-medium w-20 shrink-0 ${TIPO_COR_TEXT[tipo] ?? 'text-gray-400'}`}>{TIPO_LABELS[tipo] ?? tipo}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${TIPO_COR_BG[tipo] ?? 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-[var(--text-muted)] tabular-nums w-8 text-right">{pct}%</span>
              </div>
            ))}
            {tiposPct.length === 0 && <p className="text-xs text-[var(--text-muted)]">Sem dados</p>}
          </div>
        )}
      </div>

      {/* Card 3: desempenho por tipo (finalizadas %) */}
      <div className="card p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">Desempenho por tipo</p>
          <span className="text-[12px] text-[var(--text-muted)] opacity-60">% pedidos finalizados por tipo</span>
        </div>
        {loading ? (
          <div className="space-y-1 mt-1">{TIPOS.slice(0, 3).map(t => <div key={t} className="h-3.5 w-full rounded shimmer" />)}</div>
        ) : (
          <div className="space-y-1.5 mt-1">
            {tiposDesempenho.map(({ tipo, pct }) => (
              <div key={tipo} className="flex items-center gap-1.5">
                <span className={`text-xs font-medium w-20 shrink-0 ${TIPO_COR_TEXT[tipo] ?? 'text-gray-400'}`}>{TIPO_LABELS[tipo] ?? tipo}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)] tabular-nums w-8 text-right">{pct}%</span>
              </div>
            ))}
            {tiposDesempenho.length === 0 && <p className="text-xs text-[var(--text-muted)]">Sem dados no período</p>}
          </div>
        )}

      </div>

      {/* Card 4: crescimento — sparkline 5 meses */}
      <div className="card p-4 flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">Crescimento</p>
        {loading ? shimmer : crescimentoData === null ? (
          <p className="text-xs text-[var(--text-muted)] mt-1">Sem dados suficientes</p>
        ) : (
          <>
            <div className="flex items-end gap-1.5 mt-0.5">
              <span className={`text-2xl font-bold tabular-nums ${crescimentoData.subindo ? 'text-emerald-400' : 'text-rose-400'}`}>
                {crescimentoData.subindo ? '▲' : '▼'} {crescimentoData.pct}%
              </span>
            </div>
            {/* Sparkline */}
            <div className="flex items-end gap-1 h-10 mt-auto">
              {crescimentoData.ultimos.map((m, i) => {
                const isLast = i === crescimentoData.ultimos.length - 1;
                const hPct = crescimentoData.maxVal > 0 ? Math.max((m.novosCadastros / crescimentoData.maxVal) * 100, m.novosCadastros > 0 ? 8 : 0) : 0;
                const mesAbrev = new Date(m.mes + '-02').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                return (
                  <div key={m.mes} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex flex-col justify-end h-8">
                      <div
                        className={`w-full rounded-t transition-all duration-500 ${isLast ? 'bg-violet-500' : 'bg-violet-900/60'}`}
                        style={{ height: `${hPct}%` }}
                      />
                    </div>
                    <span className="text-[7px] text-[var(--text-muted)] opacity-60">{mesAbrev}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

// ─── Cards de contagem ────────────────────────────────────────────────────────

function CardsContagem({ data, loading, filtroGlobal }: { data: EstatisticasUsuariosDTO | null; loading: boolean; filtroGlobal: PeriodoFiltro }) {
  const [tipoTotal, setTipoTotal] = useState('');
  const [tipoNovos, setTipoNovos] = useState('');
  const [periodoNovos, setPeriodoNovos] = useState<PeriodoFiltro>(filtroGlobal);

  useEffect(() => { setPeriodoNovos(filtroGlobal); }, [filtroGlobal.inicio?.getTime(), filtroGlobal.fim?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [novosData, setNovosData] = useState<EstatisticasUsuariosDTO | null>(null);
  const [loadingNovos, setLoadingNovos] = useState(false);

  useEffect(() => {
    setLoadingNovos(true);
    relatorios.usuarios(toParams(periodoNovos))
      .then(setNovosData)
      .catch(console.error)
      .finally(() => setLoadingNovos(false));
  }, [periodoNovos.inicio?.getTime(), periodoNovos.fim?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const novosVal = useMemo(() => {
    const map = novosData?.novosPorTipo ?? {};
    if (!tipoNovos) return Object.values(map).reduce((s: number, v: number) => s + v, 0);
    return map[tipoNovos] ?? 0;
  }, [novosData, tipoNovos]);

  const totalVal = useMemo(() => {
    if (!data) return 0;
    return tipoTotal ? (data.totalPorTipo[tipoTotal] ?? 0) : data.totalCadastrados;
  }, [data, tipoTotal]);

  const sel = "input-field text-xs h-7 py-0 px-2 w-auto";

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 mr-auto">Total cadastrados</span>
          <select className={sel} value={tipoTotal} onChange={e => setTipoTotal(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
          </select>
        </div>
        {loading ? <div className="h-8 w-20 rounded shimmer" />
          : <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{totalVal.toLocaleString()}</span>}
      </div>

      <div className="card p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400 mr-auto">Novos cadastros</span>
          <FiltroPeriodoInline valor={periodoNovos} onChange={setPeriodoNovos} />
          <select className={sel} value={tipoNovos} onChange={e => setTipoNovos(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
          </select>
        </div>
        {loading || loadingNovos ? <div className="h-8 w-20 rounded shimmer" />
          : (
            <div>
              <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{novosVal.toLocaleString()}</span>
              {totalVal > 0 && (
                <span className="text-xs text-[var(--text-muted)] ml-2">
                  {Math.round((novosVal / totalVal) * 100)}% do total
                </span>
              )}
            </div>
          )}
      </div>
    </div>
  );
}


// ─── Donut SVG com hover ────────────────────────────────────────────────────

const DONUT_SLICES = [
  { label: 'Finalizadas', color: '#10b981' },
  { label: 'Canceladas', color: '#f43f5e' },
  { label: 'Abandonos', color: '#f59e0b' },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  if (end - start >= 360) end = start + 359.99;
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function DonutTipo({ fin, can, aba, label, cor }: {
  fin: number; can: number; aba: number; label: string; cor: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = fin + can + aba;
  const vals = [fin, can, aba];
  const cx = 40, cy = 40, r = 36, holeR = 20;

  let angle = 0;
  const arcs = vals.map((v, i) => {
    const deg = total > 0 ? (v / total) * 360 : 0;
    const arc = { start: angle, end: angle + deg, color: DONUT_SLICES[i].color, val: v, idx: i };
    angle += deg;
    return arc;
  });

  const hoveredPct = hovered !== null && total > 0
    ? Math.round((vals[hovered] / total) * 100)
    : null;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`text-sm font-bold ${cor}`}>{label}</span>

      {/* Donut SVG */}
      <div className="relative">
        <svg width={120} height={120} viewBox="0 0 80 80" style={{ overflow: 'visible' }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.05)" />
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.06)" />
          ) : arcs.map(arc => arc.val > 0 && (
            <path
              key={arc.idx}
              d={arcPath(cx, cy, r, arc.start, arc.end)}
              fill={arc.color}
              opacity={hovered === null || hovered === arc.idx ? 0.9 : 0.25}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHovered(arc.idx)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Buraco central */}
          <circle cx={cx} cy={cy} r={holeR} fill="var(--surface-1, #0f0f14)" />
        </svg>
        {/* % no centro ao hover */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {hoveredPct !== null && (
            <span className="text-base font-bold text-[var(--text-primary)]">{hoveredPct}%</span>
          )}
        </div>
      </div>

      {/* Legenda: cor + total + % */}
      <div className="flex flex-col gap-0.5 w-full">
        {DONUT_SLICES.map((s, i) => (
          <div key={i}
            className="flex items-center gap-1.5 px-1 rounded transition-colors"
            style={{ background: hovered === i ? `${s.color}18` : 'transparent' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-xs tabular-nums text-[var(--text-muted)]">{vals[i]}</span>
            <span className="text-xs tabular-nums ml-auto" style={{ color: s.color }}>
              {total > 0 ? Math.round((vals[i] / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
      <span className="text-xs text-[var(--text-muted)] opacity-50">{total} pedidos</span>
    </div>
  );
}


// ─── Seção de donuts por tipo ─────────────────────────────────────────────────

function SecaoDonuts({ filtroGlobal }: { filtroGlobal: PeriodoFiltro }) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>(filtroGlobal);
  const [tipo, setTipo] = useState('');

  useEffect(() => { setPeriodo(filtroGlobal); }, [filtroGlobal.inicio?.getTime(), filtroGlobal.fim?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading } = useDadosUsuarios(periodo);

  const distribuicaoFiltrada = useMemo(() => {
    if (!data) return [];
    const lista = data.distribuicao.filter(d =>
      d.pedidosFinalizados + d.totalAbandonos + d.totalCancelamentos > 0
    );
    return tipo ? lista.filter(d => d.tipo === tipo) : lista;
  }, [data, tipo]);

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Composição por tipo</h3>
        <div className="flex items-center gap-2">
          <select className="input-field text-xs h-7 py-0 px-2 w-auto" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
          </select>
          <FiltroPeriodoInline valor={periodo} loading={loading} onChange={setPeriodo} />
        </div>
      </div>

      <div className="card p-4">
        {loading ? (
          <div className="flex gap-6 justify-around">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-[72px] h-[72px] rounded-full shimmer" />
                <div className="h-2.5 w-14 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : distribuicaoFiltrada.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">Sem dados no período</p>
        ) : (
          <div className="flex flex-wrap gap-6 justify-around">
            {TIPOS
              .map(t => distribuicaoFiltrada.find(d => d.tipo === t))
              .filter(Boolean)
              .map(d => d && (
                <DonutTipo
                  key={d.tipo}
                  fin={d.pedidosFinalizados}
                  can={d.totalCancelamentos}
                  aba={d.totalAbandonos}
                  label={TIPO_LABELS[d.tipo] ?? d.tipo}
                  cor={TIPO_COR_TEXT[d.tipo] ?? 'text-gray-400'}
                />
              ))
            }
          </div>
        )}
        {/* Legenda global */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-[12px] text-[var(--text-muted)]">Finalizadas</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span className="text-[12px] text-[var(--text-muted)]">Canceladas</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-[12px] text-[var(--text-muted)]">Abandonos</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── Card de usuário ──────────────────────────────────────────────────────────

function UserCard({ user }: { user: RankingUsuarioDTO }) {
  const [aberto, setAberto] = useState(false);
  const tipo = user.tipoUsuario ?? 'OUTRO';

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 gap-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
        onClick={() => setAberto(a => !a)}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-1 h-8 rounded-full shrink-0 ${TIPO_COR_BG[tipo] ?? 'bg-gray-400'}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{user.nome}</p>
            <p className={`text-[11px] ${TIPO_COR_TEXT[tipo] ?? 'text-gray-400'}`}>{TIPO_LABELS[tipo] ?? tipo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center"><p className="text-[11px] text-[var(--text-muted)]">Concluídas</p><p className="text-sm font-bold text-emerald-500">{user.pedidosFinalizados}</p></div>
          <div className="text-center"><p className="text-[11px] text-[var(--text-muted)]">Canceladas</p><p className="text-sm font-bold text-rose-400">{user.pedidosCancelados}</p></div>
          <div className="text-center"><p className="text-[11px] text-[var(--text-muted)]">Abandono</p><p className="text-sm font-bold text-amber-400">{user.pedidosAbandono}</p></div>
          <svg className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform shrink-0 ${aberto ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      {aberto && (() => {
        const total = user.pedidosFinalizados + user.pedidosCancelados + user.pedidosAbandono;
        const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
        return (
          <div className="px-4 pb-3 pt-2 bg-[var(--surface-2)] border-t border-[var(--border)] space-y-2">
            {/* % de cada status lado a lado */}
            <div className="flex gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Concluídas</p>
                <p className="text-base font-bold text-emerald-500">{user.pedidosFinalizados}</p>
                <p className="text-[10px] text-emerald-400">{pct(user.pedidosFinalizados)}%</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Canceladas</p>
                <p className="text-base font-bold text-rose-400">{user.pedidosCancelados}</p>
                <p className="text-[10px] text-rose-300">{pct(user.pedidosCancelados)}%</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Abandono</p>
                <p className="text-base font-bold text-amber-400">{user.pedidosAbandono}</p>
                <p className="text-[10px] text-amber-300">{pct(user.pedidosAbandono)}%</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Total</p>
                <p className="text-base font-bold text-[var(--text-primary)]">{total}</p>
                <p className="text-[10px] text-[var(--text-muted)]">pedidos</p>
              </div>
            </div>
            {/* CPF */}
            {user.cpf && (
              <p className="text-xs text-[var(--text-muted)] font-mono">
                CPF: <span className="text-[var(--text-primary)]">{maskCpf(user.cpf)}</span>
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Seção de lista com filtro próprio ───────────────────────────────────────

function SecaoLista({ filtroGlobal }: { filtroGlobal: PeriodoFiltro }) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>(filtroGlobal);
  const [maisMenos, setMaisMenos] = useState<MaisMenos>('mais');
  const [tipo, setTipo] = useState('');
  const [statusFiltro, setStatus] = useState<StatusFiltro>('finalizadas');
  const [busca, setBusca] = useState('');
  const [visivel, setVisivel] = useState(10);

  useEffect(() => { setPeriodo(filtroGlobal); }, [filtroGlobal.inicio?.getTime(), filtroGlobal.fim?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading } = useDadosUsuarios(periodo);

  const porStatus = useCallback((u: RankingUsuarioDTO) =>
    statusFiltro === 'finalizadas' ? u.pedidosFinalizados
      : statusFiltro === 'canceladas' ? u.pedidosCancelados
        : u.pedidosAbandono, [statusFiltro]);

  const listaFiltrada = useMemo(() => {
    if (!data) return [];
    return [...data.ranking, ...data.naoCompareceram]
      .filter(u => !tipo || u.tipoUsuario === tipo)
      .filter(u => !busca || u.nome.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => {
        const diff = maisMenos === 'mais' ? porStatus(b) - porStatus(a) : porStatus(a) - porStatus(b);
        if (diff !== 0) return diff;
        return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
      });
  }, [data, tipo, statusFiltro, maisMenos, busca, porStatus]);

  const listaVisivel = listaFiltrada.slice(0, visivel);
  const temMais = visivel < listaFiltrada.length;

  return (
    <div className="space-y-3">
      <div className="max-w-xl mx-auto space-y-2">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Mais / Menos — botões lado a lado */}
          <div className="flex rounded-md overflow-hidden border border-[rgba(255,255,255,0.08)]">
            {(['mais', 'menos'] as MaisMenos[]).map(op => (
              <button
                key={op}
                onClick={() => setMaisMenos(op)}
                className={`text-xs px-3 h-7 font-medium capitalize transition-all ${maisMenos === op
                  ? 'bg-[rgba(255,255,255,0.1)] text-[var(--text-primary)]'
                  : 'bg-transparent text-[var(--text-muted)] opacity-40 hover:opacity-70'}`}
              >
                {op === 'mais' ? '▲' : '▼'} {op.charAt(0).toUpperCase() + op.slice(1)}
              </button>
            ))}
          </div>
          <select className="input-field text-xm h-7 py-0 px-2 w-auto" value={statusFiltro} onChange={e => setStatus(e.target.value as StatusFiltro)}>
            <option value="finalizadas">Finalizadas</option>
            <option value="canceladas">Canceladas</option>
            <option value="abandonos">Abandonos</option>
          </select>
          <select className="input-field text-xm h-7 py-0 px-2 w-auto" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
          </select>
          <FiltroPeriodoInline valor={periodo} onChange={setPeriodo} />
        </div>
        {/* Busca */}
        <input
          type="text"
          className="input-field text-sm w-full"
          placeholder="Buscar usuário..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Lista */}
      <div className="max-w-xl mx-auto">
        {loading ? (
          <div className="card divide-y divide-[var(--border)] overflow-hidden">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-1 h-8 rounded-full bg-[var(--surface-2)] shimmer shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded shimmer" />
                  <div className="h-2.5 w-20 rounded shimmer" />
                </div>
                <div className="flex gap-3">
                  {[1, 2, 3].map(j => <div key={j} className="h-8 w-12 rounded shimmer" />)}
                </div>
              </div>
            ))}
          </div>
        ) : listaFiltrada.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <>
            <div className="card divide-y divide-[var(--border)] overflow-hidden">
              {listaVisivel.map(u => <UserCard key={u.id} user={u} />)}
            </div>
            {temMais && (
              <button
                onClick={() => setVisivel(v => v + 10)}
                className="mt-2 w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] py-2 transition-colors"
              >
                Ver mais 10 ({listaFiltrada.length - visivel} restantes)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── AbaUsuarios (export principal) ───────────────────────────────────────────

export function AbaUsuarios({ filtros, globalVersao }: Props) {
  const [filtroGlobal, setFiltroGlobal] = useState<PeriodoFiltro>({
    inicio: filtros.inicio, fim: filtros.fim,
  });

  // Sincroniza quando o filtro global da página muda
  useEffect(() => {
    if (globalVersao === 0) return;
    setFiltroGlobal({ inicio: filtros.inicio, fim: filtros.fim });
  }, [globalVersao]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: dataCards, loading: loadingCards } = useDadosUsuarios(filtroGlobal);

  return (
    <div className="space-y-5">
      {/* Cards de resumo */}
      <CardsResumo data={dataCards} loading={loadingCards} />

      {/* Contagem */}
      <CardsContagem data={dataCards} loading={loadingCards} filtroGlobal={filtroGlobal} />

      {/* 3 blocos com filtro próprio */}
      <SecaoBlocos filtroGlobal={filtroGlobal} />

      {/* Donuts por tipo */}
      <SecaoDonuts filtroGlobal={filtroGlobal} />

      {/* Lista com filtro próprio */}
      <SecaoLista filtroGlobal={filtroGlobal} />
    </div>
  );
}