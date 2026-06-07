'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineData,
  Time,
  ColorType,
  CrosshairMode,
  LineStyle,
  MouseEventParams,
} from 'lightweight-charts';
import { FiltrosRelatorio } from '../../page';
import { FiltroPeriodoInline, PeriodoFiltro } from '../FiltroPeriodoInline';
import { relatorios } from '@/lib/api';

interface Props {
  filtros: FiltrosRelatorio;   // base do filtro global
  globalVersao: number;        // quando muda, sincroniza o filtro local
}

interface PontoHistorico {
  data: string; // sempre "yyyy-MM-dd" vindo do backend
  total: number;
  mm?: number;
}

type Agrupamento = 'dia' | 'semana' | 'mes';

// ─── helpers ────────────────────────────────────────────────────────────────

function toISOLocal(date: Date, endOfDay = false): string {
  const d = new Date(date);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 19);
}

function calcularMediaMovel(
  dados: { total: number }[],
  janela: number,
): (number | undefined)[] {
  return dados.map((_, i) => {
    if (i < janela - 1) return undefined;
    const slice = dados.slice(i - janela + 1, i + 1);
    return slice.reduce((acc, d) => acc + d.total, 0) / janela;
  });
}

function calcularTendencia(
  dados: { total: number }[],
): { pct: number; subindo: boolean } | null {
  if (dados.length < 4) return null;
  const meio = Math.floor(dados.length / 2);
  const mediaAntes  = dados.slice(0, meio).reduce((a, d) => a + d.total, 0) / meio;
  const mediaDepois = dados.slice(meio).reduce((a, d) => a + d.total, 0) / (dados.length - meio);
  if (mediaAntes === 0) return null;
  const pct = ((mediaDepois - mediaAntes) / mediaAntes) * 100;
  return { pct: Math.abs(pct), subindo: pct >= 0 };
}

// Backend sempre envia "yyyy-MM-dd" — repassamos direto para o lightweight-charts
function toTime(data: string): Time {
  return data as Time;
}

// Formata "yyyy-MM-dd" para exibição em português
function formatarLabel(data: string, agrupamento: Agrupamento): string {
  const [ano, mes, dia] = data.split('-');
  if (agrupamento === 'mes') {
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${MESES[parseInt(mes) - 1]} ${ano}`;
  }
  // dia e semana: mostra dd/MM
  return `${dia}/${mes}`;
}

// Formata para o tooltip (mais completo)
function formatarTooltip(data: string, agrupamento: Agrupamento): string {
  const [ano, mes, dia] = data.split('-');
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  if (agrupamento === 'mes') return `${MESES[parseInt(mes) - 1]} de ${ano}`;
  if (agrupamento === 'semana') return `Semana de ${dia}/${mes}/${ano}`;
  return `${dia}/${mes}/${ano}`;
}

const JANELA_MM: Record<Agrupamento, number> = { dia: 7, semana: 4, mes: 3 };

// ─── Tooltip customizado ─────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: string;
  total: number;
  mm?: number;
  agrupamento: Agrupamento;
}

function Tooltip({ state }: { state: TooltipState }) {
  if (!state.visible) return null;

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: state.x + 12,
        top: state.y - 8,
        transform: 'translateY(-50%)',
      }}
    >
      <div
        style={{
          background: 'rgba(15,15,25,0.95)',
          border: '1px solid rgba(124,58,237,0.4)',
          borderRadius: 8,
          padding: '8px 12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          minWidth: 140,
        }}
      >
        <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6, letterSpacing: '0.02em' }}>
          {formatarTooltip(state.data, state.agrupamento)}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#e5e7eb' }}>
              <strong style={{ color: '#fff' }}>{state.total}</strong>
              <span style={{ color: '#9ca3af', marginLeft: 4 }}>reservas</span>
            </span>
          </div>
          {state.mm !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 2, borderTop: '2px dashed #a78bfa', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#e5e7eb' }}>
                <strong style={{ color: '#a78bfa' }}>{state.mm.toFixed(1)}</strong>
                <span style={{ color: '#9ca3af', marginLeft: 4 }}>
                  média {JANELA_MM[state.agrupamento]}p
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function LinearCard({ filtros, globalVersao }: Props) {
  const [dados, setDados] = useState<PontoHistorico[]>([]);
  const [periodoLocal, setPeriodoLocal] = useState<PeriodoFiltro>({
    inicio: filtros.inicio,
    fim:    filtros.fim,
  });

  // Sincroniza com o global quando ele é aplicado
  useEffect(() => {
    setPeriodoLocal({ inicio: filtros.inicio, fim: filtros.fim });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalVersao]);
  const [loading, setLoading] = useState(false);
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('dia');
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, data: '', total: 0, agrupamento: 'dia',
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const mmSeriesRef   = useRef<ISeriesApi<'Line'> | null>(null);

  // ── Busca dados ────────────────────────────────────────────────────────────
  const buscar = useCallback(async (f: FiltrosRelatorio, agrup: Agrupamento) => {
    setLoading(true);
    try {
      const raw = (await relatorios.historico({
        inicio:      f.inicio ? toISOLocal(f.inicio)        : undefined,
        fim:         f.fim    ? toISOLocal(f.fim, true)     : undefined,
        agrupamento: agrup,
      })) as { data: string; total: number }[];

      const mm = calcularMediaMovel(raw, JANELA_MM[agrup]);
      setDados(raw.map((d, i) => ({ ...d, mm: mm[i] })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscar({ ...filtros, ...periodoLocal }, agrupamento);
  }, [periodoLocal, agrupamento, globalVersao]);

  // ── Cria/recria o chart ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || dados.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      mmSeriesRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 11,
        fontFamily: 'inherit',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: 'rgba(124,58,237,0.5)',
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: '#7c3aed',
        },
        horzLine: {
          color: 'rgba(124,58,237,0.3)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#7c3aed',
          labelVisible: false,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.05 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        // Formata os ticks do eixo X em português
        tickMarkFormatter: (time: Time) => {
          return formatarLabel(time as string, agrupamento);
        },
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: false },
    });

    const mainSeries = chart.addSeries(LineSeries, {
      color: '#7c3aed',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: '#7c3aed',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const mmSeries = chart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const mainData: LineData[] = dados.map((d) => ({
      time: toTime(d.data),
      value: d.total,
    }));

    const mmData: LineData[] = dados
      .filter((d) => d.mm !== undefined)
      .map((d) => ({
        time: toTime(d.data),
        value: d.mm as number,
      }));

    mainSeries.setData(mainData);
    mmSeries.setData(mmData);
    chart.timeScale().fitContent();

    // Tooltip
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param.point || !param.time || !wrapperRef.current) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }

      const mainVal = param.seriesData.get(mainSeries);
      const mmVal   = param.seriesData.get(mmSeries);

      if (!mainVal) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }

      const timeStr = param.time as string;
      const ponto   = dados.find((d) => toTime(d.data) === timeStr);

      setTooltip({
        visible: true,
        x: param.point.x,
        y: param.point.y,
        data: ponto?.data ?? timeStr,
        total: (mainVal as LineData).value,
        mm: mmVal ? (mmVal as LineData).value : undefined,
        agrupamento,
      });
    });

    const ro = new ResizeObserver((entries) => {
      chart.resize(entries[0].contentRect.width, 260);
    });
    ro.observe(containerRef.current);

    chartRef.current    = chart;
    mainSeriesRef.current = mainSeries;
    mmSeriesRef.current   = mmSeries;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, agrupamento]);

  const tendencia = calcularTendencia(dados);

  return (
    <div className="card p-5 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative group/label inline-block">
            <h2 className="section-title cursor-default">Fluxo de Reservas</h2>
            <div className="absolute top-full left-0 mt-1 hidden group-hover/label:block z-50 pointer-events-none">
              <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-1.5 text-xs whitespace-nowrap text-gray-300">
                Total de reservas finalizadas ao longo do tempo
              </div>
            </div>
          </div>

          {tendencia && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              tendencia.subindo
                ? 'text-emerald-400 bg-emerald-400/10'
                : 'text-rose-400 bg-rose-400/10'
            }`}>
              {tendencia.subindo ? '↑' : '↓'} {tendencia.pct.toFixed(1)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <FiltroPeriodoInline
            valor={periodoLocal}
            onChange={(p) => setPeriodoLocal(p)}
            comBotaoAplicar
          />
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-lg p-1">
          {(['dia', 'semana', 'mes'] as Agrupamento[]).map((a) => (
            <button
              key={a}
              onClick={() => setAgrupamento(a)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                agrupamento === a
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {a === 'dia' ? 'Dia' : a === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-64 rounded-lg shimmer" />
      ) : dados.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-[var(--text-muted)]">
          Nenhum dado no período selecionado
        </div>
      ) : (
        <div className="w-full relative" ref={wrapperRef}>
          <div ref={containerRef} className="w-full" />
          <Tooltip state={tooltip} />
        </div>
      )}

      {/* Legenda */}
      {!loading && dados.length > 0 && (
        <div className="flex items-center gap-4 px-2 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-violet-600 rounded" />
            <span>Reservas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0" style={{ borderTop: '1.5px dashed #a78bfa' }} />
            <span>Média {JANELA_MM[agrupamento]}p</span>
          </div>
        </div>
      )}
    </div>
  );
}