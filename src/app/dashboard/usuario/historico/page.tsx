'use client';

import { useEffect, useState, useCallback } from 'react';
import { pedidos as pedidosApi } from '@/lib/api';
import { PedidoReserva } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { CheckinCheckoutInfo } from '@/app/components/ui/CheckinCheckoutInfo';

const STATUS_ENCERRADOS = ['FINALIZADA', 'CANCELADA', 'ATRASADO', 'REJEITADA'];

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function HistoricoModal({ pedido, onClose }: { pedido: PedidoReserva; onClose: () => void }) {
  const isPc = pedido.tipo === 'COMPUTADOR';
  const itens = isPc
    ? pedido.reservasComputador?.map(r => r.computador?.codigo ?? '—') ?? []
    : pedido.reservasSala?.map(r => r.sala?.nome ?? '—') ?? [];
  const primeiraReserva = isPc
    ? pedido.reservasComputador?.[0]
    : pedido.reservasSala?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isPc
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
              {isPc ? 'COMPUTADOR' : 'SALA'}
            </span>
            <StatusBadge status={pedido.status} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-2">{isPc ? 'Computadores' : 'Salas'}</p>
            <div className="flex flex-wrap gap-2">
              {itens.map((item, i) => (
                <span key={i} className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isPc
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-mono'
                  : 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Data</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{formatDate(pedido.inicioPrevisto)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Horário</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatHora(pedido.inicioPrevisto)} → {formatHora(pedido.fimPrevisto)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Pessoas</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{pedido.qtdePessoas}</p>
            </div>
            {pedido.observacao && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Observação</p>
                <p className="text-sm text-[var(--text-secondary)] truncate">{pedido.observacao}</p>
              </div>
            )}
          </div>

          <CheckinCheckoutInfo
            checkinEm={primeiraReserva?.checkinEm}
            checkoutEm={primeiraReserva?.checkoutEm}
          />
        </div>
      </div>
    </div>
  );
}

function HistoricoCard({ pedido, onClick }: { pedido: PedidoReserva; onClick: () => void }) {
  const isPc = pedido.tipo === 'COMPUTADOR';
  const qtd = isPc ? pedido.reservasComputador?.length ?? 0 : pedido.reservasSala?.length ?? 0;
  const labelItem = isPc
    ? `${qtd} computador${qtd !== 1 ? 'es' : ''}`
    : `${qtd} sala${qtd !== 1 ? 's' : ''}`;

  return (
    <div onClick={onClick}
      className="px-5 py-4 cursor-pointer hover:bg-[var(--surface-2)] transition-colors opacity-70">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${isPc
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
              {isPc ? 'PC' : 'SALA'}
            </span>
            <p className="text-sm font-medium text-[var(--text-primary)]">{labelItem}</p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {formatDate(pedido.inicioPrevisto)} · {formatHora(pedido.inicioPrevisto)} → {formatHora(pedido.fimPrevisto)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={pedido.status} />
          <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<PedidoReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<PedidoReserva | null>(null);

  const fetchHistorico = useCallback(async () => {
    try {
      const lista = await pedidosApi.meus();
      setHistorico(
        lista
          .filter(p => STATUS_ENCERRADOS.includes(p.status))
          .sort((a, b) => new Date(b.inicioPrevisto).getTime() - new Date(a.inicioPrevisto).getTime())
      );
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Histórico</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {historico.length} reserva{historico.length !== 1 ? 's' : ''} encerrada{historico.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="card divide-y divide-[var(--border)]">
          {[1, 2, 3].map(i => <div key={i} className="h-16 shimmer" />)}
        </div>
      ) : historico.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[var(--text-secondary)] font-medium">Nenhuma reserva no histórico</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">As reservas finalizadas, canceladas e atrasadas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {historico.map(p => (
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