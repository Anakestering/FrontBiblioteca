'use client';

import { useState, useEffect, ReactNode } from 'react';
import { FiltrosRelatorio } from '../page';
import { calcularDatas, detectarPeriodo, PeriodoPreset } from '@/lib/utils';
import DatePicker from 'react-datepicker';

interface Props {
  filtros: FiltrosRelatorio;
  globalVersao: number;
  loading: boolean;
  onAplicar: (filtros: FiltrosRelatorio) => void;
  children?: ReactNode;
}

export function FiltrosBarras({ filtros, globalVersao, loading, onAplicar, children }: Props) {
  const [periodo, setPeriodo] = useState<PeriodoPreset>(
    detectarPeriodo({ inicio: filtros.inicio, fim: filtros.fim })
  );
  const [inicio, setInicio] = useState<Date | null>(filtros.inicio);
  const [fim, setFim]       = useState<Date | null>(filtros.fim);

  // filtros já chega atualizado no mesmo render que globalVersao muda
  // (igual AbaHistorico), então leitura direta sem ref
  useEffect(() => {
    setPeriodo(detectarPeriodo({ inicio: filtros.inicio, fim: filtros.fim }));
    setInicio(filtros.inicio);
    setFim(filtros.fim);
  }, [globalVersao]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAplicar = () => {
    const datas = periodo !== 'personalizado' ? calcularDatas(periodo) : { inicio, fim };
    onAplicar({ ...filtros, inicio: datas.inicio, fim: datas.fim });
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end gap-3">

        {/* Período */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-muted)]">Período</label>
          <div className="flex items-center gap-2">
            <select
              value={periodo}
              onChange={e => {
                const val = e.target.value as PeriodoPreset;
                setPeriodo(val);
                if (val !== 'personalizado') {
                  const { inicio: s, fim: e2 } = calcularDatas(val);
                  setInicio(s);
                  setFim(e2);
                }
              }}
              className="input text-sm px-3 py-2 [&>option]:bg-[#0f0f14] [&>option]:text-white"
            >
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
              <option value="ano">Este ano</option>
              <option value="personalizado">Personalizado</option>
            </select>

            {periodo === 'personalizado' && (
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

        {/* Slot para dropdowns de salas/PCs (FiltrosRecursos) */}
        {children}

        {/* Botão Aplicar */}
        <button
          onClick={handleAplicar}
          disabled={loading}
          className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
        >
          {loading ? 'Carregando...' : 'Aplicar'}
        </button>

      </div>
    </div>
  );
}