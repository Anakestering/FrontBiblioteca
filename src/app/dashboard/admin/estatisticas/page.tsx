'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import { AbaHistorico } from './components/AbaHistorico/Page';
import { AbaRecursos } from './components/AbaRecursos/AbaRecursos';
import { AbaUsuarios } from './components/AbaUsuarios/AbaUsuarios';
import { AbaDownload } from './components/AbaRelatorio/AbaRelatorio';
import { FiltroPeriodoInline } from './components/FiltroPeriodoInline';
import { PeriodoFiltro, toISOLocal } from '@/lib/utils';
import { relatorios } from '@/lib/api';
import type { ExportSnapshot, SnapshotHistorico, SnapshotUsuarios } from './components/AbaRelatorio/utils/types';
import { EstatisticasRecursoDTO, EstatisticasStatusReservasDTO, EstatisticasHeatmapDTO } from '@/types';
import { salas as salasApi, computadores as computadoresApi } from '@/lib/api';
import { Sala, Computador } from '@/types';

registerLocale('pt-BR', ptBR);

type Aba = 'historico' | 'recursos' | 'usuarios' | 'download';

export interface FiltrosRelatorio {
  inicio: Date | null;
  fim: Date | null;
  salaIds: number[];
  computadorIds: number[];
  diasFuturo?: number;
}

export interface DadosRecursos {
  salas: EstatisticasRecursoDTO[];
  computadores: EstatisticasRecursoDTO[];
  status: EstatisticasStatusReservasDTO | null;
}

function getInicioSemana(): Date {
  const hoje = new Date();
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - hoje.getDay() + 1);
  seg.setHours(0, 0, 0, 0);
  return seg;
}

export default function EstatisticasPage() {
  const [aba, setAba] = useState<Aba>('historico');

  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    inicio: getInicioSemana(),
    fim: new Date(),
    salaIds: [],
    computadorIds: [],
  });

  const [globalVersao, setGlobalVersao] = useState(0);

  const [dadosRecursos, setDadosRecursos] = useState<DadosRecursos>({
    salas: [], computadores: [], status: null,
  });
  const [loadingRecursos, setLoadingRecursos] = useState(false);
  const [erroRecursos, setErroRecursos]       = useState<string | null>(null);
  const [jaCarregou, setJaCarregou]           = useState(false);
  const [heatmapData, setHeatmapData]         = useState<EstatisticasHeatmapDTO[]>([]);
  const [loadingHeatmap, setLoadingHeatmap]   = useState(false);
  const [modoHeatmap, setModoHeatmap]         = useState<'media' | 'total'>('total');
  const [exportSnapshot, setExportSnapshot] = useState<ExportSnapshot | null>(null);
  const snapshotHistoricoRef = useRef<SnapshotHistorico | null>(null);
  const snapshotUsuariosRef  = useRef<SnapshotUsuarios  | null>(null);

  const [salasDisponiveis, setSalasDisponiveis]               = useState<Sala[]>([]);
  const [computadoresDisponiveis, setComputadoresDisponiveis] = useState<Computador[]>([]);

  const buscarHeatmap = useCallback(async (f: FiltrosRelatorio) => {
    setLoadingHeatmap(true);
    try {
      const data = await relatorios.heatmap({
        inicio: f.inicio ? toISOLocal(f.inicio) : undefined,
        fim:    f.fim    ? toISOLocal(f.fim, true) : undefined,
      });
      setHeatmapData(data);
    } catch (err) { console.error(err); }
    finally { setLoadingHeatmap(false); }
  }, []);

  const buscarRecursos = useCallback(async (f: FiltrosRelatorio) => {
    if (f.salaIds.length === 0 && f.computadorIds.length === 0) {
      setDadosRecursos({ salas: [], computadores: [], status: null });
      return;
    }
    setLoadingRecursos(true);
    setErroRecursos(null);
    try {
      const params = {
        inicio: f.inicio ? toISOLocal(f.inicio) : undefined,
        fim:    f.fim    ? toISOLocal(f.fim, true) : undefined,
      };
      const [salasData, computadoresData, statusData] = await Promise.all([
        f.salaIds.length > 0
          ? relatorios.salas({ ...params, salaIds: f.salaIds, diasFuturo: f.diasFuturo })
          : Promise.resolve([]),
        f.computadorIds.length > 0
          ? relatorios.computadores({ ...params, computadorIds: f.computadorIds, diasFuturo: f.diasFuturo })
          : Promise.resolve([]),
        relatorios.status({ ...params, salaIds: f.salaIds, computadorIds: f.computadorIds }),
      ]);
      setDadosRecursos({ salas: salasData, computadores: computadoresData, status: statusData });
    } catch (err) {
      setErroRecursos('Erro ao carregar dados. Tente novamente.');
      console.error(err);
    } finally { setLoadingRecursos(false); }
  }, []);

  useEffect(() => {
    if (jaCarregou) return;
    setJaCarregou(true);
    Promise.all([salasApi.listar(), computadoresApi.listar()]).then(([s, c]) => {
      setSalasDisponiveis(s);
      setComputadoresDisponiveis(c);
      const f: FiltrosRelatorio = {
        inicio: getInicioSemana(),
        fim: new Date(),
        salaIds: s.map((x: Sala) => x.id),
        computadorIds: c.map((x: Computador) => x.id),
      };
      setFiltros(f);
      setGlobalVersao(1);
      buscarHeatmap(f);
      buscarRecursos(f);
    });
  }, [buscarHeatmap, buscarRecursos]);

  const buildSnapshot = useCallback((
    historico: SnapshotHistorico | null,
    usuarios: SnapshotUsuarios | null,
    recursos: DadosRecursos,
    filtrosAtivos: FiltrosRelatorio,
  ): ExportSnapshot => ({
    capturedAt: new Date(),
    filtrosGlobais: { inicio: filtrosAtivos.inicio, fim: filtrosAtivos.fim },
    historico,
    usuarios,
    recursos: {
      periodo: { inicio: filtrosAtivos.inicio, fim: filtrosAtivos.fim },
      salas: recursos.salas,
      computadores: recursos.computadores,
      status: recursos.status,
      diasFuturo: filtrosAtivos.diasFuturo ?? 30,
    },
  }), []);

  const handleHistoricoSnapshot = useCallback((s: SnapshotHistorico) => {
    snapshotHistoricoRef.current = s;
    setExportSnapshot(prev => buildSnapshot(s, snapshotUsuariosRef.current, dadosRecursos, filtros));
  }, [buildSnapshot, dadosRecursos, filtros]);

  const handleUsuariosSnapshot = useCallback((s: SnapshotUsuarios) => {
    snapshotUsuariosRef.current = s;
    setExportSnapshot(prev => buildSnapshot(snapshotHistoricoRef.current, s, dadosRecursos, filtros));
  }, [buildSnapshot, dadosRecursos, filtros]);

  // Atualiza snapshot de recursos sempre que dadosRecursos muda
  useEffect(() => {
    setExportSnapshot(prev => {
      if (!prev && !snapshotHistoricoRef.current && !snapshotUsuariosRef.current) return prev;
      return buildSnapshot(snapshotHistoricoRef.current, snapshotUsuariosRef.current, dadosRecursos, filtros);
    });
  }, [dadosRecursos, buildSnapshot, filtros]);

  const handleAplicarGlobal = (periodo: PeriodoFiltro) => {
    const novos: FiltrosRelatorio = { ...filtros, ...periodo };
    setFiltros(novos);
    setGlobalVersao(v => v + 1);
    buscarHeatmap(novos);
    buscarRecursos(novos);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] -mx-4 lg:-mx-8 px-4 lg:px-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-end gap-8">
            <div className="pb-3">
              <h1 className="page-title">Estatísticas</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">Relatórios e exportação de dados</p>
            </div>
            <div className="flex gap-0">
              {([
                { key: 'historico', label: 'Histórico' },
                { key: 'recursos',  label: 'PC/Sala' },
                { key: 'usuarios',  label: 'Usuários' },
                { key: 'download',  label: 'Baixar Relatório' },
              ] as { key: Aba; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setAba(key)}
                  className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                    aba === key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pb-3">
            <span className="text-xs text-[var(--text-muted)] font-medium">Para todos:</span>
            <FiltroPeriodoInline
              valor={{ inicio: filtros.inicio, fim: filtros.fim }}
              loading={loadingHeatmap || loadingRecursos}
              onChange={handleAplicarGlobal}
              comBotaoAplicar
            />
          </div>
        </div>
      </div>

      <div style={{ display: aba === 'historico' ? undefined : 'none' }}>
        <AbaHistorico
          filtros={filtros}
          globalVersao={globalVersao}
          heatmap={heatmapData}
          loadingHeatmap={loadingHeatmap}
          onBuscarHeatmap={buscarHeatmap}
          modoHeatmap={modoHeatmap}
          onModoHeatmap={setModoHeatmap}
          onSnapshot={handleHistoricoSnapshot}
        />
      </div>
      <div style={{ display: aba === 'recursos' ? undefined : 'none' }}>
        <AbaRecursos
          filtros={filtros}
          globalVersao={globalVersao}
          dados={dadosRecursos}
          loading={loadingRecursos}
          erro={erroRecursos}
          onBuscarRecursos={buscarRecursos}
          salasDisponiveis={salasDisponiveis}
          computadoresDisponiveis={computadoresDisponiveis}
        />
      </div>
      <div style={{ display: aba === 'usuarios' ? undefined : 'none' }}>
        <AbaUsuarios filtros={filtros} globalVersao={globalVersao} onSnapshot={handleUsuariosSnapshot} />
      </div>
      <div style={{ display: aba === 'download' ? undefined : 'none' }}>
        <AbaDownload dados={dadosRecursos} filtros={filtros} exportSnapshot={exportSnapshot} salasDisponiveis={salasDisponiveis} computadoresDisponiveis={computadoresDisponiveis} />
      </div>
    </div>
  );
}
