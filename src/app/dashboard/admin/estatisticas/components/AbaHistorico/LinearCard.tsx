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
import { toISOLocal } from '@/lib/utils';
import { relatorios } from '@/lib/api';
import {
  EstatisticasPontoHistoricoDTO as PontoHistorico,
  EstatisticasPontoAbandono    as PontoAbandono,
  EstatisticasTendencia        as TendenciaDTO,
} from '@/types';

interface Props {
  filtros: FiltrosRelatorio;
  globalVersao: number;
  onDadosChange?: (dados: {
    pontos: PontoHistorico[];
    tendencia: TendenciaDTO | null;
    mediaPessoasDia: number;
    abandonos: PontoAbandono[];
    tendenciaAbandono: TendenciaDTO | null;
    taxaAbandono: number;
  }) => void;
}

type Agrupamento = 'dia' | 'semana' | 'mes';

const JANELA_MM: Record<Agrupamento, number> = { dia: 7, semana: 4, mes: 3 };

function toTime(data: string): Time {
  return data as Time;
}

function formatarLabel(data: string, agrupamento: Agrupamento): string {
  const [ano, mes, dia] = data.split('-');
  if (agrupamento === 'mes') {
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${MESES[parseInt(mes) - 1]} ${ano}`;
  }
  return `${dia}/${mes}`;
}

function formatarTooltip(data: string, agrupamento: Agrupamento): string {
  const [ano, mes, dia] = data.split('-');
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  if (agrupamento === 'mes') return `${MESES[parseInt(mes) - 1]} de ${ano}`;
  if (agrupamento === 'semana') return `Semana de ${dia}/${mes}/${ano}`;
  return `${dia}/${mes}/${ano}`;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: string;
  total?: number;           // pedidos finalizados
  totalReservas?: number;   // recursos individuais utilizados
  mm?: number;
  abandono?: number;
  abandonoMm?: number;
  agrupamento: Agrupamento;
}

function Tooltip({ state, visReservas, visAbandono, visTendencia, visTendenciaAbandono, janela }: {
  state: TooltipState;
  visReservas: boolean;
  visAbandono: boolean;
  visTendencia: boolean;
  visTendenciaAbandono: boolean;
  janela: number;
}) {
  if (!state.visible) return null;
  const temAlgo = (visReservas && state.total !== undefined)
    || (visAbandono && state.abandono !== undefined)
    || (visTendencia && state.mm !== undefined)
    || (visTendenciaAbandono && state.abandonoMm !== undefined);
  if (!temAlgo) return null;

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ left: state.x + 12, top: state.y - 8, transform: 'translateY(-50%)' }}
    >
      <div style={{
        background: 'rgba(15,15,25,0.95)',
        border: '1px solid rgba(124,58,237,0.4)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        minWidth: 150,
      }}>
        <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
          {formatarTooltip(state.data, state.agrupamento)}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visReservas && state.total !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#e5e7eb' }}>
                <strong style={{ color: '#fff' }}>{state.total}</strong>
                <span style={{ color: '#9ca3af', marginLeft: 4 }}>pedidos finalizados</span>
              </span>
            </div>
          )}
          {visReservas && state.totalReservas !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 14 }}>
              <span style={{ fontSize: 12, color: '#e5e7eb' }}>
                <strong style={{ color: '#c4b5fd' }}>{state.totalReservas}</strong>
                <span style={{ color: '#9ca3af', marginLeft: 4 }}>reservas finalizadas</span>
              </span>
            </div>
          )}
          {visTendencia && state.mm !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 2, borderTop: '2px dashed #a78bfa', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#e5e7eb' }}>
                <strong style={{ color: '#a78bfa' }}>{state.mm.toFixed(1)}</strong>
                <span style={{ color: '#9ca3af', marginLeft: 4 }}>média tendencia </span>
              </span>
            </div>
          )}
          {visAbandono && state.abandono !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#e5e7eb' }}>
                <strong style={{ color: '#fb923c' }}>{state.abandono}</strong>
                <span style={{ color: '#9ca3af', marginLeft: 4 }}>abandonos</span>
              </span>
            </div>
          )}
          {visTendenciaAbandono && state.abandonoMm !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 2, borderTop: '2px dashed #fb923c', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#e5e7eb' }}>
                <strong style={{ color: '#fb923c' }}>{state.abandonoMm.toFixed(1)}</strong>
                <span style={{ color: '#9ca3af', marginLeft: 4 }}>media abandono {janela}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToggleProps {
  ativo: boolean;
  onChange: (v: boolean) => void;
  cor: string;
  dashed?: boolean;
  label: string;
  disabled?: boolean;
}

function ToggleLinha({ ativo, onChange, cor, dashed, label, disabled }: ToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!ativo)}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-xs transition-all rounded px-1.5 py-1 ${
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : ativo
          ? 'opacity-100 cursor-pointer hover:opacity-80'
          : 'opacity-40 cursor-pointer hover:opacity-60'
      }`}
    >
      {dashed ? (
        <div className="w-4 h-0" style={{ borderTop: `1.5px dashed ${cor}` }} />
      ) : (
        <div className="w-4 h-0.5 rounded" style={{ background: cor }} />
      )}
      <span style={{ color: ativo && !disabled ? cor : '#6b7280' }}>{label}</span>
    </button>
  );
}

export function LinearCard({ filtros, globalVersao, onDadosChange }: Props) {
  const [dados, setDados]               = useState<PontoHistorico[]>([]);
  const [abandonos, setAbandonos]       = useState<PontoAbandono[]>([]);
  const [tendencia, setTendencia]       = useState<TendenciaDTO | null>(null);
  const [tendenciaAbandono, setTendenciaAbandono] = useState<TendenciaDTO | null>(null);
  const [periodoLocal, setPeriodoLocal] = useState<PeriodoFiltro>({
    inicio: filtros.inicio,
    fim:    filtros.fim,
  });
  const [loading, setLoading]           = useState(false);
  const [agrupamento, setAgrupamento]   = useState<Agrupamento>('dia');
  const [tooltip, setTooltip]           = useState<TooltipState>({
    visible: false, x: 0, y: 0, data: '', agrupamento: 'dia',
  });

  // Toggles — reservas e tendência visíveis por padrão, abandono e tendência abandono ocultos
  const [visReservas, setVisReservas]                       = useState(true);
  const [visTendencia, setVisTendencia]                     = useState(true);
  const [visAbandono, setVisAbandono]                       = useState(false);
  const [visTendenciaAbandono, setVisTendenciaAbandono]     = useState(false);

  const temAbandono = abandonos.length > 0;

  const containerRef              = useRef<HTMLDivElement>(null);
  const wrapperRef                = useRef<HTMLDivElement>(null);
  const chartRef                  = useRef<IChartApi | null>(null);
  const mainSeriesRef             = useRef<ISeriesApi<'Line'> | null>(null);
  const mmSeriesRef               = useRef<ISeriesApi<'Line'> | null>(null);
  const abandonoSeriesRef         = useRef<ISeriesApi<'Line'> | null>(null);
  const abandonoMmSeriesRef       = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    setPeriodoLocal({ inicio: filtros.inicio, fim: filtros.fim });
  }, [globalVersao]); // eslint-disable-line react-hooks/exhaustive-deps

  const buscar = useCallback(async (f: FiltrosRelatorio, agrup: Agrupamento) => {
    setLoading(true);
    try {
      const resposta = await relatorios.historico({
        inicio:      f.inicio ? toISOLocal(f.inicio)        : undefined,
        fim:         f.fim    ? toISOLocal(f.fim, true)     : undefined,
        agrupamento: agrup,
      });

      if (Array.isArray(resposta)) {
        // compatibilidade versão antiga
        setDados(resposta);
        setAbandonos([]);
        setTendencia(null);
        setTendenciaAbandono(null);
        onDadosChange?.({ pontos: resposta, tendencia: null, mediaPessoasDia: 0, abandonos: [], tendenciaAbandono: null, taxaAbandono: 0 });
      } else {
        // resposta já é EstatisticasHistoricoDTO — sem cast necessário
        const r = resposta;
        setDados(r.pontos ?? []);
        setAbandonos(r.abandonos ?? []);
        setTendencia(r.tendencia ?? null);
        setTendenciaAbandono(r.tendenciaAbandono ?? null);
        onDadosChange?.({
          pontos: r.pontos ?? [],
          tendencia: r.tendencia ?? null,
          mediaPessoasDia: r.mediaPessoasDia ?? 0,
          abandonos: r.abandonos ?? [],
          tendenciaAbandono: r.tendenciaAbandono ?? null,
          taxaAbandono: r.taxaAbandono ?? 0,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    buscar({ ...filtros, ...periodoLocal }, agrupamento);
  }, [periodoLocal, agrupamento, globalVersao]); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza visibilidade das séries sem recriar o gráfico
  useEffect(() => {
    mainSeriesRef.current?.applyOptions({ visible: visReservas });
  }, [visReservas]);
  useEffect(() => {
    mmSeriesRef.current?.applyOptions({ visible: visTendencia });
  }, [visTendencia]);
  useEffect(() => {
    abandonoSeriesRef.current?.applyOptions({ visible: visAbandono });
  }, [visAbandono]);
  useEffect(() => {
    abandonoMmSeriesRef.current?.applyOptions({ visible: visTendenciaAbandono });
  }, [visTendenciaAbandono]);

  // Constrói/reconstrói o gráfico quando dados ou agrupamento mudam
  useEffect(() => {
    if (!containerRef.current || dados.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      mmSeriesRef.current = null;
      abandonoSeriesRef.current = null;
      abandonoMmSeriesRef.current = null;
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
        tickMarkFormatter: (time: Time) => formatarLabel(time as string, agrupamento),
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
      visible: visReservas,
    });

    const mmSeries = chart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: visTendencia,
    });

    const abandonoSeries = chart.addSeries(LineSeries, {
      color: '#f97316',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: '#f97316',
      lastValueVisible: false,
      priceLineVisible: false,
      visible: visAbandono,
    });

    const abandonoMmSeries = chart.addSeries(LineSeries, {
      color: '#fb923c',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: visTendenciaAbandono,
    });

    mainSeries.setData(dados.map(d => ({ time: toTime(d.data), value: d.total })));
    mmSeries.setData(dados.filter(d => d.mm !== undefined).map(d => ({ time: toTime(d.data), value: d.mm as number })));
    abandonoSeries.setData(abandonos.map(d => ({ time: toTime(d.data), value: d.total })));
    abandonoMmSeries.setData(abandonos.filter(d => d.mm !== undefined).map(d => ({ time: toTime(d.data), value: d.mm as number })));
    chart.timeScale().fitContent();

    // Mapa rápido para lookup no crosshair
    const dadosMap = new Map(dados.map(d => [d.data, d]));
    const abandonosMap = new Map(abandonos.map(d => [d.data, d]));

    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param.point || !param.time || !wrapperRef.current) {
        setTooltip(t => ({ ...t, visible: false }));
        return;
      }
      const timeStr = param.time as string;
      const mainVal      = param.seriesData.get(mainSeries);
      const mmVal        = param.seriesData.get(mmSeries);
      const abandonoVal  = param.seriesData.get(abandonoSeries);
      const abMmVal      = param.seriesData.get(abandonoMmSeries);

      const pontoRes = dadosMap.get(timeStr);
      const pontoAb  = abandonosMap.get(timeStr);

      if (!mainVal && !abandonoVal) {
        setTooltip(t => ({ ...t, visible: false }));
        return;
      }

      setTooltip({
        visible: true,
        x: param.point.x,
        y: param.point.y,
        data: pontoRes?.data ?? pontoAb?.data ?? timeStr,
        total:         mainVal    ? (mainVal    as LineData).value : undefined,
        totalReservas: pontoRes?.totalReservas,
        mm:            mmVal      ? (mmVal      as LineData).value : undefined,
        abandono:      abandonoVal ? (abandonoVal as LineData).value : undefined,
        abandonoMm:    abMmVal    ? (abMmVal    as LineData).value : undefined,
        agrupamento,
      });
    });

    const ro = new ResizeObserver(entries => { chart.resize(entries[0].contentRect.width, 260); });
    ro.observe(containerRef.current);

    chartRef.current          = chart;
    mainSeriesRef.current     = mainSeries;
    mmSeriesRef.current       = mmSeries;
    abandonoSeriesRef.current = abandonoSeries;
    abandonoMmSeriesRef.current = abandonoMmSeries;

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [dados, abandonos, agrupamento]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card p-5 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative group/label inline-block">
            <h2 className="section-title cursor-default">Fluxo de Reservas</h2>
            <div className="absolute top-full left-0 mt-1 hidden group-hover/label:block z-50 pointer-events-none">
              <div className="bg-black border border-gray-700 rounded-lg shadow-xl px-3 py-1.5 text-xs whitespace-nowrap text-gray-300">
                Total de pedidos/reservas finalizadas ao longo do tempo
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
            onChange={p => setPeriodoLocal(p)}
            comBotaoAplicar
          />
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-lg p-1">
            {(['dia', 'semana', 'mes'] as Agrupamento[]).map(a => (
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

      {/* Área do gráfico */}
      {loading ? (
        <div className="h-64 rounded-lg shimmer" />
      ) : dados.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-[var(--text-muted)]">
          Nenhum dado no período selecionado
        </div>
      ) : (
        <div className="w-full relative" ref={wrapperRef}>
          <div ref={containerRef} className="w-full" />
          <Tooltip
            state={tooltip}
            visReservas={visReservas}
            visAbandono={visAbandono}
            visTendencia={visTendencia}
            visTendenciaAbandono={visTendenciaAbandono}
            janela={JANELA_MM[agrupamento]}
          />
        </div>
      )}

      {/* Legenda com toggles */}
      {!loading && dados.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <ToggleLinha
            ativo={visReservas}
            onChange={setVisReservas}
            cor="#7c3aed"
            label="Pedidos"
          />
          <ToggleLinha
            ativo={visTendencia}
            onChange={setVisTendencia}
            cor="#a78bfa"
            dashed
            label={`Tendência pedido`}
          />
          <ToggleLinha
            ativo={visAbandono}
            onChange={setVisAbandono}
            cor="#f97316"
            label="Abandonos"
            disabled={!temAbandono}
          />
          <ToggleLinha
            ativo={visTendenciaAbandono}
            onChange={setVisTendenciaAbandono}
            cor="#fb923c"
            dashed
            label="Tendência abandono"
            disabled={!temAbandono}
          />
        </div>
      )}
    </div>
  );
}