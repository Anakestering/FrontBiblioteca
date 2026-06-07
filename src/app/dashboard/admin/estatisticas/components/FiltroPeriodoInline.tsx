'use client';

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';

export interface PeriodoFiltro {
  inicio: Date | null;
  fim: Date | null;
}

interface Props {
  valor: PeriodoFiltro;
  loading?: boolean;
  onChange: (periodo: PeriodoFiltro) => void;
  comBotaoAplicar?: boolean; // true = aplica só ao clicar; false = aplica ao selecionar
}

function calcularDatas(periodo: string): PeriodoFiltro {
  const hoje = new Date();
  if (periodo === 'semana') {
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - hoje.getDay() + 1);
    seg.setHours(0, 0, 0, 0);
    return { inicio: seg, fim: hoje };
  }
  if (periodo === 'mes') return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1), fim: hoje };
  if (periodo === 'ano') return { inicio: new Date(hoje.getFullYear(), 0, 1), fim: hoje };
  return { inicio: null, fim: null };
}

function detectarPeriodo(valor: PeriodoFiltro): 'semana' | 'mes' | 'ano' | 'personalizado' {
  if (!valor.inicio || !valor.fim) return 'personalizado';
  const fmt   = (d: Date) => d.toDateString();
  const sem   = calcularDatas('semana');
  const mes   = calcularDatas('mes');
  const ano   = calcularDatas('ano');
  if (fmt(valor.inicio) === fmt(sem.inicio!)) return 'semana';
  if (fmt(valor.inicio) === fmt(mes.inicio!)) return 'mes';
  if (fmt(valor.inicio) === fmt(ano.inicio!)) return 'ano';
  return 'personalizado';
}

export function FiltroPeriodoInline({ valor, loading, onChange, comBotaoAplicar = false }: Props) {
  const [periodo, setPeriodo]       = useState<'semana' | 'mes' | 'ano' | 'personalizado'>(detectarPeriodo(valor));
  const [rangeInicio, setRangeInicio] = useState<Date | null>(valor.inicio);
  const [rangeFim, setRangeFim]       = useState<Date | null>(valor.fim);
  const [pendente, setPendente]       = useState<PeriodoFiltro | null>(null);

  // Sincroniza quando o filtro global sobrescreve
  useEffect(() => {
    setPeriodo(detectarPeriodo(valor));
    setRangeInicio(valor.inicio);
    setRangeFim(valor.fim);
    setPendente(null);
  }, [valor.inicio?.getTime(), valor.fim?.getTime()]);

  const emitir = (novo: PeriodoFiltro) => {
    if (comBotaoAplicar) {
      setPendente(novo);
    } else {
      onChange(novo);
    }
  };

  const handleSelect = (val: string) => {
    const p = val as 'semana' | 'mes' | 'ano' | 'personalizado';
    setPeriodo(p);
    if (p !== 'personalizado') {
      const novo = calcularDatas(p);
      setRangeInicio(novo.inicio);
      setRangeFim(novo.fim);
      emitir(novo);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={periodo}
        onChange={e => handleSelect(e.target.value)}
        disabled={loading}
        className="text-xs px-2.5 py-1.5 rounded-md disabled:opacity-50 transition-colors cursor-pointer outline-none [&>option]:bg-[#0f0f14] [&>option]:text-white"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--text-muted)',
        }}
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
            startDate={rangeInicio}
            endDate={rangeFim}
            onChange={([start, end]) => {
              setRangeInicio(start);
              setRangeFim(end);
              if (start && end) emitir({ inicio: start, fim: end });
            }}
            locale="pt-BR"
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm – dd/mm"
            className="text-xs px-2.5 py-1.5 rounded-md w-40 outline-none [background:rgba(255,255,255,0.05)] [border:1px_solid_rgba(255,255,255,0.08)] [color:var(--text-muted)]"
            isClearable
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            minDate={new Date(2025, 0, 1)}
            maxDate={new Date()}
          />
        </div>
      )}

      {comBotaoAplicar && (
        <button
          onClick={() => { if (pendente) onChange(pendente); else onChange({ inicio: rangeInicio, fim: rangeFim }); }}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-md font-medium transition-all disabled:opacity-40"
          style={{
            background: 'rgba(7, 42, 242, 0.15)',
            border: '1px solid rgba(124,58,237,0.25)',
            color: '#a78bfa',
          }}
        >
          {loading ? '...' : 'Aplicar'}
        </button>
      )}
    </div>
  );
}