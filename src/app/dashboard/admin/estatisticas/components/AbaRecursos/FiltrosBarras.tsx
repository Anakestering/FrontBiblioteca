'use client';

import { useState, useEffect } from 'react';
import { Sala, Computador } from '@/types';

interface Props {
  salaIds: number[];
  computadorIds: number[];
  diasFuturo: number;
  onChangeSalas: (ids: number[]) => void;
  onChangePcs: (ids: number[]) => void;
  onChangeDiasFuturo: (dias: number) => void;
  salasDisponiveis: Sala[];
  computadoresDisponiveis: Computador[];
}

export function FiltrosRecursos({
  salaIds, computadorIds, diasFuturo,
  onChangeSalas, onChangePcs, onChangeDiasFuturo,
  salasDisponiveis, computadoresDisponiveis,
}: Props) {
  const [dropdownSalas, setDropdownSalas] = useState(false);
  const [dropdownPcs, setDropdownPcs] = useState(false);

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

  return (
    <>
      {/* Select: período futuro */}
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm">
        <span className="text-[var(--text-muted)]">Prox:</span>
        <select
          value={diasFuturo}
          onChange={e => onChangeDiasFuturo(Number(e.target.value))}
          className="bg-transparent text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer"
        >
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
        </select>
      </div>

      {/* Dropdown PCs */}
      {computadoresDisponiveis.length > 0 && (
        <div className="relative dropdown-recursos">
          <button
            onClick={e => { e.stopPropagation(); setDropdownPcs(p => !p); setDropdownSalas(false); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              computadorIds.length > 0
                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-2)]'
            }`}
          >
            <span>Computadores</span>
            {computadorIds.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {computadorIds.length}
              </span>
            )}
            <svg className={`w-4 h-4 transition-transform ${dropdownPcs ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownPcs && (
            <div className="absolute top-full mt-1 left-0 z-20 w-52 card p-2 space-y-0.5 shadow-lg">
              <div className="flex justify-between px-2 py-1 mb-1">
                <button onClick={() => onChangePcs(computadoresDisponiveis.map(c => c.id))} className="text-xs text-blue-600 hover:underline">Todos</button>
                <button onClick={() => onChangePcs([])} className="text-xs text-[var(--text-muted)] hover:underline">Nenhum</button>
              </div>
              {computadoresDisponiveis.map(c => (
                <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={computadorIds.includes(c.id)}
                    onChange={() => onChangePcs(
                      computadorIds.includes(c.id)
                        ? computadorIds.filter(x => x !== c.id)
                        : [...computadorIds, c.id]
                    )}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{c.codigo}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dropdown Salas */}
      {salasDisponiveis.length > 0 && (
        <div className="relative dropdown-recursos">
          <button
            onClick={e => { e.stopPropagation(); setDropdownSalas(p => !p); setDropdownPcs(false); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              salaIds.length > 0
                ? 'border-violet-500 text-violet-600 bg-violet-50 dark:bg-violet-900/20'
                : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-2)]'
            }`}
          >
            <span>Salas</span>
            {salaIds.length > 0 && (
              <span className="bg-violet-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {salaIds.length}
              </span>
            )}
            <svg className={`w-4 h-4 transition-transform ${dropdownSalas ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownSalas && (
            <div className="absolute top-full mt-1 left-0 z-20 w-52 card p-2 space-y-0.5 shadow-lg">
              <div className="flex justify-between px-2 py-1 mb-1">
                <button onClick={() => onChangeSalas(salasDisponiveis.map(s => s.id))} className="text-xs text-blue-600 hover:underline">Todas</button>
                <button onClick={() => onChangeSalas([])} className="text-xs text-[var(--text-muted)] hover:underline">Nenhuma</button>
              </div>
              {salasDisponiveis.map(s => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={salaIds.includes(s.id)}
                    onChange={() => onChangeSalas(
                      salaIds.includes(s.id)
                        ? salaIds.filter(x => x !== s.id)
                        : [...salaIds, s.id]
                    )}
                    className="accent-violet-600 w-4 h-4"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{s.nome}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
