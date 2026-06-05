'use client';
import { useState, useEffect, useCallback } from 'react';
import { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import { AbaRecursos } from './components/AbaRecursos';
import { AbaUsuarios } from './components/AbaUsuarios';
import { AbaDownload } from './components/AbaDownload';
import { relatorios } from '@/lib/api';
import { RelatorioRecursoDTO, RelatorioStatusReservasDTO, RelatorioHeatmapDTO } from '@/types';
import { salas as salasApi, computadores as computadoresApi } from '@/lib/api';
import { Sala, Computador } from '@/types';


registerLocale('pt-BR', ptBR);

type Aba = 'recursos' | 'usuarios' | 'download';

export interface FiltrosRelatorio {
  inicio: Date | null;
  fim: Date | null;
  salaIds: number[];
  computadorIds: number[];
}

export interface DadosRecursos {
  salas: RelatorioRecursoDTO[];
  computadores: RelatorioRecursoDTO[];
  status: RelatorioStatusReservasDTO | null;
}

function getInicioSemana(): Date {
  const hoje = new Date();
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - hoje.getDay() + 1);
  seg.setHours(0, 0, 0, 0);
  return seg;
}

function toISOLocal(date: Date, endOfDay = false): string {
  const d = new Date(date);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 19);
}

export default function RelatoriosPage() {
  const [aba, setAba] = useState<Aba>('recursos');

  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    inicio: getInicioSemana(),
    fim: new Date(),
    salaIds: [],
    computadorIds: [],
  });

  const [dadosRecursos, setDadosRecursos] = useState<DadosRecursos>({
    salas: [],
    computadores: [],
    status: null,
  });

  const [loadingRecursos, setLoadingRecursos] = useState(false);
  const [erroRecursos, setErroRecursos] = useState<string | null>(null);
  const [jaCarregou, setJaCarregou] = useState(false);
  const [heatmapData, setHeatmapData] = useState<RelatorioHeatmapDTO[]>([]);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [modoHeatmap, setModoHeatmap] = useState<'media' | 'total'>('media');

  const buscarHeatmap = useCallback(async (f: FiltrosRelatorio) => {
    setLoadingHeatmap(true);
    try {
      const params = {
        inicio: f.inicio ? toISOLocal(f.inicio) : undefined,
        fim: f.fim ? toISOLocal(f.fim, true) : undefined,
      };
      const data = await relatorios.heatmap({
        inicio: f.inicio ? toISOLocal(f.inicio) : undefined,
        fim: f.fim ? toISOLocal(f.fim, true) : undefined,
      });
      setHeatmapData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHeatmap(false);
    }
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
        fim: f.fim ? toISOLocal(f.fim, true) : undefined,
      };

      const [salasData, computadoresData, statusData] = await Promise.all([
        f.salaIds.length > 0
          ? relatorios.salas({ ...params, salaIds: f.salaIds })
          : Promise.resolve([]),
        f.computadorIds.length > 0
          ? relatorios.computadores({ ...params, computadorIds: f.computadorIds })
          : Promise.resolve([]),
        relatorios.status({ ...params, salaIds: f.salaIds, computadorIds: f.computadorIds }),
      ]);

      setDadosRecursos({
        salas: salasData,
        computadores: computadoresData,
        status: statusData,
      });
    } catch (err) {
      setErroRecursos('Erro ao carregar dados. Tente novamente.');
      console.error(err);
    } finally {
      setLoadingRecursos(false);
    }
  }, []);

  // Carrega automaticamente na primeira vez
  useEffect(() => {
    if (!jaCarregou) {
      setJaCarregou(true);
      Promise.all([salasApi.listar(), computadoresApi.listar()]).then(([s, c]) => {
        const todosIds = {
          salaIds: s.map((x: Sala) => x.id),
          computadorIds: c.map((x: Computador) => x.id),
        };
        const filtrosIniciais: FiltrosRelatorio = {
          inicio: getInicioSemana(),
          fim: new Date(),
          ...todosIds,
        };
        setFiltros(filtrosIniciais);
        buscarRecursos(filtrosIniciais);
        buscarHeatmap(filtrosIniciais);
      });
    }
  }, []);

  const handleAplicar = (novosFiltros: FiltrosRelatorio) => {
    setFiltros(novosFiltros);
    buscarRecursos(novosFiltros);
    buscarHeatmap(novosFiltros);
  };

  return (
    <div className="space-y-6">
      {/* Header com abas */}
      <div className="border-b border-[var(--border)] -mx-4 lg:-mx-8 px-4 lg:px-8">
        <div className="flex items-end gap-8">
          <div className="pb-3">
            <h1 className="page-title">Relatórios</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Estatísticas e exportação de dados</p>
          </div>
          <div className="flex gap-0">
            {([
              { key: 'recursos', label: 'PC/Sala' },
              { key: 'usuarios', label: 'Usuários' },
              { key: 'download', label: 'Baixar Relatório' },
            ] as { key: Aba; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setAba(key)}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${aba === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {aba === 'recursos' && (
        <AbaRecursos
          filtros={filtros}
          dados={dadosRecursos}
          heatmap={heatmapData}
          loadingHeatmap={loadingHeatmap}
          loading={loadingRecursos}
          erro={erroRecursos}
          onAplicar={handleAplicar}
          modoHeatmap={modoHeatmap}
          onModoHeatmap={setModoHeatmap}
        />
      )}
      {aba === 'usuarios' && <AbaUsuarios />}
      {aba === 'download' && <AbaDownload dados={dadosRecursos} filtros={filtros} />}
    </div>
  );
}