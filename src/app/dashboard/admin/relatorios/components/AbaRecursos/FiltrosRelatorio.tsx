'use client';

import { useState, useEffect } from 'react';
import { salas as salasApi, computadores as computadoresApi } from '@/lib/api';
import { Sala, Computador } from '@/types';
import { FiltrosRelatorio, } from '../../page';
import DatePicker from 'react-datepicker';

interface Props {
  filtros: FiltrosRelatorio;
  loading: boolean;
  onAplicar: (filtros: FiltrosRelatorio) => void;
}

export function FiltrosRelatorioCard({ filtros, loading, onAplicar }: Props) {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [computadores, setComputadores] = useState<Computador[]>([]);
  const [loadingRecursos, setLoadingRecursos] = useState(true);

  const [inicio, setInicio] = useState<Date | null>(filtros.inicio);
  const [fim, setFim] = useState<Date | null>(filtros.fim);
  const [salasSelecionadas, setSalasSelecionadas] = useState<number[]>(filtros.salaIds);
  const [pcsSelecionados, setPcsSelecionados] = useState<number[]>(filtros.computadorIds);
  const [periodoPadrao, setPeriodoPadrao] = useState<'semana' | 'mes' | 'ano' | 'inicio' | 'personalizado'>('semana');
  const [dropdownSalas, setDropdownSalas] = useState(false);
  const [dropdownPcs, setDropdownPcs] = useState(false);

  useEffect(() => {
    Promise.all([salasApi.listarTodas(), computadoresApi.listarTodos()])
      .then(([s, c]) => {
        setSalas(s ?? []);
        setComputadores(c ?? []);
      })
      .finally(() => setLoadingRecursos(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.dropdown-recursos')) {
        setDropdownSalas(false);
        setDropdownPcs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sincroniza quando filtros externos mudam (carga inicial)
  useEffect(() => {
    setSalasSelecionadas(filtros.salaIds);
    setPcsSelecionados(filtros.computadorIds);
    setInicio(filtros.inicio);
    setFim(filtros.fim);
  }, [filtros.salaIds.length, filtros.computadorIds.length]);

  function calcularDatas(periodo: typeof periodoPadrao): { start: Date | null; end: Date | null } {
    const hoje = new Date();
    if (periodo === 'semana') {
      const seg = new Date(hoje);
      seg.setDate(hoje.getDate() - hoje.getDay() + 1);
      return { start: seg, end: hoje };
    }
    if (periodo === 'mes') return { start: new Date(hoje.getFullYear(), hoje.getMonth(), 1), end: hoje };
    if (periodo === 'ano') return { start: new Date(hoje.getFullYear(), 0, 1), end: hoje };
    if (periodo === 'inicio') return { start: null, end: hoje };
    return { start: inicio, end: fim };
  }

  const handleAplicar = () => {
    const { start, end } = calcularDatas(periodoPadrao);
    const novoInicio = periodoPadrao === 'personalizado' ? inicio : start;
    const novoFim = periodoPadrao === 'personalizado' ? fim : end;
    onAplicar({
      inicio: novoInicio,
      fim: novoFim,
      salaIds: salasSelecionadas,
      computadorIds: pcsSelecionados,
    });
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end gap-3">

        {/* Período */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-muted)]">Período</label>
          <div className="flex items-center gap-2">
            <select
              value={periodoPadrao}
              onChange={e => {
                const val = e.target.value as typeof periodoPadrao;
                setPeriodoPadrao(val);
                if (val !== 'personalizado') {
                  const { start, end } = calcularDatas(val);
                  setInicio(start);
                  setFim(end);
                }
              }}
              className="input text-sm px-3 py-2"
            >
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
              <option value="ano">Este ano</option>
              <option value="inicio">Desde o início</option>
              <option value="personalizado">Personalizado</option>
            </select>

            {periodoPadrao === 'inicio' && (
              <span title="Consulta todos os registros, pode demorar um pouco" className="text-amber-500 cursor-help text-sm">⚠</span>
            )}

            {periodoPadrao === 'personalizado' && (
              <div className="datepicker-wrapper">
                <DatePicker
                  selectsRange
                  startDate={inicio}
                  endDate={fim}
                  onChange={([start, end]) => { setInicio(start); setFim(end); }}
                  locale="pt-BR"
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selecione o período"
                  className="input text-sm px-3 py-2 w-56"
                  isClearable
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  minDate={new Date(2025, 0, 1)}
                  maxDate={new Date()}
                />
              </div>
            )}
          </div>
        </div>

        {/* Dropdown PCs */}
        {!loadingRecursos && computadores.length > 0 && (
          <div className="relative dropdown-recursos">
            <button
              onClick={(e) => { e.stopPropagation(); setDropdownPcs(p => !p); setDropdownSalas(false); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${pcsSelecionados.length > 0
                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-2)]'
                }`}
            >
              <span>Computadores</span>
              {pcsSelecionados.length > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pcsSelecionados.length}
                </span>
              )}
              <svg className={`w-4 h-4 transition-transform ${dropdownPcs ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownPcs && (
              <div className="absolute top-full mt-1 left-0 z-20 w-52 card p-2 space-y-0.5 shadow-lg">
                <div className="flex justify-between px-2 py-1 mb-1">
                  <button onClick={() => setPcsSelecionados(computadores.map(c => c.id))} className="text-xs text-blue-600 hover:underline">Todos</button>
                  <button onClick={() => setPcsSelecionados([])} className="text-xs text-[var(--text-muted)] hover:underline">Nenhum</button>
                </div>
                {computadores.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] cursor-pointer">
                    <input type="checkbox" checked={pcsSelecionados.includes(c.id)} onChange={() => setPcsSelecionados(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])} className="accent-blue-600 w-4 h-4" />
                    <span className="text-sm text-[var(--text-primary)]">{c.codigo}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dropdown Salas */}
        {!loadingRecursos && salas.length > 0 && (
          <div className="relative dropdown-recursos">
            <button
              onClick={(e) => { e.stopPropagation(); setDropdownSalas(p => !p); setDropdownPcs(false); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${salasSelecionadas.length > 0
                ? 'border-violet-500 text-violet-600 bg-violet-50 dark:bg-violet-900/20'
                : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-2)]'
                }`}
            >
              <span>Salas</span>
              {salasSelecionadas.length > 0 && (
                <span className="bg-violet-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {salasSelecionadas.length}
                </span>
              )}
              <svg className={`w-4 h-4 transition-transform ${dropdownSalas ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownSalas && (
              <div className="absolute top-full mt-1 left-0 z-20 w-52 card p-2 space-y-0.5 shadow-lg">
                <div className="flex justify-between px-2 py-1 mb-1">
                  <button onClick={() => setSalasSelecionadas(salas.map(s => s.id))} className="text-xs text-blue-600 hover:underline">Todas</button>
                  <button onClick={() => setSalasSelecionadas([])} className="text-xs text-[var(--text-muted)] hover:underline">Nenhuma</button>
                </div>
                {salas.map(s => (
                  <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] cursor-pointer">
                    <input type="checkbox" checked={salasSelecionadas.includes(s.id)} onChange={() => setSalasSelecionadas(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])} className="accent-violet-600 w-4 h-4" />
                    <span className="text-sm text-[var(--text-primary)]">{s.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botão Aplicar */}
        <button onClick={handleAplicar} disabled={loading} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">
          {loading ? 'Carregando...' : 'Aplicar'}
        </button>

      </div>
    </div>
  );
}