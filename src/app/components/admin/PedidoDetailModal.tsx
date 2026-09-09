'use client';

import { useState } from 'react';
import { PedidoReserva, AprovacaoReserva } from '@/types';
import { formatTime, maskCpf, maskTel } from '@/lib/utils';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { CheckinCheckoutInfo } from '@/app/components/ui/CheckinCheckoutInfo';
import { useConfirm } from '@/app/hooks/useConfirm';
import { Modal } from '@/app/components/ui/Modal';
import { Alert } from '@/app/components/ui/ErrorAlert';
import { pedidos as pedidosApi, aprovacoes as aprovacaoApi } from '@/lib/api';

interface PedidoDetailModalProps {
  pedido: PedidoReserva;
  aprovacoes: AprovacaoReserva[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export function PedidoDetailModal({ pedido, aprovacoes, onClose, onRefresh }: PedidoDetailModalProps) {
  const [acting, setActing] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const isPc = pedido.tipo === 'COMPUTADOR';
  const itens = isPc
    ? pedido.reservasComputador?.map(r => r.computador?.codigo ?? '—') ?? []
    : pedido.reservasSala?.map(r => r.sala?.nome ?? '—') ?? [];

  const primeiraReserva = isPc
    ? pedido.reservasComputador?.[0]
    : pedido.reservasSala?.[0];

  const aprovacaoPendente = aprovacoes.find(ap => ap.pedido?.id === pedido.id);
  const podeAprovar = pedido.status === 'PENDENTE_APROVACAO' && !!aprovacaoPendente;
  const podeCancelar = ['APROVADA', 'PENDENTE_APROVACAO', 'EM_ANDAMENTO'].includes(pedido.status);
  const { openConfirm, confirmModal } = useConfirm();

  const handleCancelar = () => {
    openConfirm({
      title: 'Cancelar reserva',
      message: 'Cancelar esta reserva? Esta ação não pode ser desfeita.',
      confirmLabel: 'Cancelar reserva',
      confirmStyle: 'danger',
      onConfirm: async () => {
        setActing('cancelar');
        setError('');
        try {
          await pedidosApi.cancelarComoAdmin(pedido.id);
          await onRefresh();
          onClose();
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Erro ao cancelar');
        }
        setActing(null);
      },
    });
  };

  const handleAprovacao = async (acao: 'aprovar' | 'rejeitar') => {
    if (!aprovacaoPendente) return;
    setActing(acao);
    setError('');
    try {
      if (acao === 'aprovar') await aprovacaoApi.aprovar(aprovacaoPendente.id, motivo || undefined);
      else await aprovacaoApi.rejeitar(aprovacaoPendente.id, motivo || undefined);
      await onRefresh();
      onClose();
    } catch (e: unknown) {
      console.error('Erro ao processar aprovação:', e);
      setError(e instanceof Error ? e.message : 'Erro');
    }
    setActing(null);
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${isPc
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
            {isPc ? 'COMPUTADOR' : 'SALA'}
          </span>
        </div>
      }
      onClose={onClose}
      maxWidth="lg"
    >
      <div className="space-y-4">
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
            <p className="text-xs text-[var(--text-muted)] mb-1">Nome</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{pedido.usuario?.nome}</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">E-mail</p>
            <p className="text-xs text-[var(--text-muted)]">{pedido.usuario?.email}</p>
          </div>
          {pedido.usuario?.cpf && (
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">CPF</p>
              <p className="text-xs text-[var(--text-muted)] font-mono">{maskCpf(pedido.usuario.cpf)}</p>
            </div>
          )}
          {pedido.usuario?.telefone && (
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Telefone</p>
              <p className="text-xs text-[var(--text-muted)]">{maskTel(pedido.usuario.telefone)}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
            <StatusBadge status={pedido.status} />
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">Pessoas</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{pedido.qtdePessoas}</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">Data</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {new Date(pedido.inicioPrevisto).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">Horário previsto</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {formatTime(pedido.inicioPrevisto)} → {formatTime(pedido.fimPrevisto)}
            </p>
          </div>
        </div>

        {pedido.observacao && (
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">Observação</p>
            <p className="text-sm text-[var(--text-secondary)]">{pedido.observacao}</p>
          </div>
        )}

        <CheckinCheckoutInfo
          checkinEm={primeiraReserva?.checkinEm}
          checkoutEm={primeiraReserva?.checkoutEm}
        />

        {(podeAprovar || podeCancelar) && (
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            {podeAprovar && (
              <div className="space-y-2">
                <input
                  type="text"
                  className="input-field text-sm"
                  placeholder="Motivo (opcional)"
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => handleAprovacao('rejeitar')} disabled={!!acting}
                    className="btn-danger flex-1 flex items-center justify-center gap-2 text-sm">
                    {acting === 'rejeitar' ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✕'}
                    Rejeitar
                  </button>
                  <button onClick={() => handleAprovacao('aprovar')} disabled={!!acting}
                    className="btn-success flex-1 flex items-center justify-center gap-2 text-sm">
                    {acting === 'aprovar' ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✓'}
                    Aprovar
                  </button>
                </div>
              </div>
            )}
            {podeCancelar && (
              <button onClick={handleCancelar} disabled={!!acting}
                className="btn-danger w-full flex items-center justify-center gap-2 text-sm">
                {acting === 'cancelar' ? 'Cancelando...' : 'Cancelar reserva'}
              </button>
            )}
          </div>
        )}

        <Alert message={error} />
        {confirmModal}
      </div>
    </Modal>
  );
}