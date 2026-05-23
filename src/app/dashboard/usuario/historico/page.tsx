'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { pedidos as pedidosApi } from '@/lib/api';
import { PedidoReserva } from '@/types';
import { HistoricoCard, HistoricoModal } from '@/app/components/usuario/HistoricoComponents';

const STATUS_ENCERRADOS = ['FINALIZADA', 'CANCELADA', 'ATRASADO', 'REJEITADA'];

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<PedidoReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<PedidoReserva | null>(null);
  const [erro, setErro] = useState('');

  // Estados dos Filtros Estilizados
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'COMPUTADOR' | 'SALA'>('TODOS');
  const [filtroData, setFiltroData] = useState('');

  const fetchHistorico = useCallback(async () => {
    try {
      setLoading(true);
      const lista = await pedidosApi.meus();
      setHistorico(
        lista
          .filter(p => STATUS_ENCERRADOS.includes(p.status))
          .sort((a, b) => new Date(b.inicioPrevisto).getTime() - new Date(a.inicioPrevisto).getTime())
      );
    } catch (err) {
      console.error(err);
      setErro('Não foi possível carregar o histórico. Tente recarregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchHistorico(); 
  }, [fetchHistorico]);

  const historicoFiltrado = useMemo(() => {
    return historico.filter(p => {
      const passaTipo = filtroTipo === 'TODOS' || p.tipo === filtroTipo;
      let passaData = true;
      if (filtroData) {
        const dataPedido = p.inicioPrevisto.split('T')[0];
        passaData = dataPedido === filtroData;
      }
      return passaTipo && passaData;
    });
  }, [historico, filtroTipo, filtroData]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Histórico</h1>
        </div>

        {/* FILTRO DE DATA ESTILIZADO (CALENDÁRIO) */}
        <div className="relative shrink-0 w-full sm:w-auto">
          <input 
            type="date" 
            value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
            className="input-field w-full sm:w-44 pr-8 bg-[var(--surface)] text-sm font-medium cursor-pointer transition-colors hover:border-[var(--border-hover)]"
          />
          {filtroData && (
            <button 
              type="button"
              onClick={() => setFiltroData('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-rose-500 transition-colors p-1"
              title="Limpar data"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* BOTÕES DE FILTRO EM CIMA (SEGMENTED CONTROL) */}
      <div className="flex p-1 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] max-w-sm">
        <button
          type="button"
          onClick={() => setFiltroTipo('TODOS')}
          className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
            filtroTipo === 'TODOS'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setFiltroTipo('COMPUTADOR')}
          className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
            filtroTipo === 'COMPUTADOR'
              ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-700'
              : 'text-[var(--text-muted)] hover:text-blue-500'
          }`}
        >
          Computadores
        </button>
        <button
          type="button"
          onClick={() => setFiltroTipo('SALA')}
          className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
            filtroTipo === 'SALA'
              ? 'bg-violet-600 text-white shadow-sm dark:bg-violet-700'
              : 'text-[var(--text-muted)] hover:text-violet-500'
          }`}
        >
          Salas
        </button>
      </div>

      {erro && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-700 dark:text-rose-300">
          {erro}
        </div>
      )}

      {/* LISTAGEM PRINCIPAL */}
      {loading ? (
        <div className="card divide-y divide-[var(--border)]">
          {[1, 2, 3].map(i => <div key={i} className="h-16 shimmer" />)}
        </div>
      ) : historicoFiltrado.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <svg className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-[var(--text-secondary)] font-medium">Nenhum resultado encontrado</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {historico.length === 0 
              ? 'Você ainda não possui reservas finalizadas.' 
              : 'Nenhum registro corresponde aos filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden shadow-sm">
          {historicoFiltrado.map(p => (
            <HistoricoCard key={p.id} pedido={p} onClick={() => setSelecionado(p)} />
          ))}
        </div>
      )}

      {selecionado && (
        <HistoricoModal pedido={selecionado} onClose={() => setSelecionado(null)} />
      )}
    </div>
  );
}