'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { pedidos as pedidosApi, reservasComputador as rcApi, reservasSala as rsApi } from '@/lib/api';
import { PedidoReserva } from '@/types';
import { statusReservaLabel, statusReservaColor } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_ATIVOS = ['APROVADA', 'PENDENTE_APROVACAO', 'EM_ANDAMENTO'];
const STATUS_ENCERRADOS = ['FINALIZADA', 'CANCELADA', 'ATRASADO', 'REJEITADA'];

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Retorna info sobre check-in/checkout/cancelamento baseado no horário atual
function getAcoes(pedido: PedidoReserva) {
  const agora = new Date();
  const inicio = new Date(pedido.inicioPrevisto);
  const fim = new Date(pedido.fimPrevisto);

  const diffInicioMs = inicio.getTime() - agora.getTime();
  const diffInicioMin = diffInicioMs / 60000;

  const podeCheckin =
    pedido.status === 'APROVADA' &&
    diffInicioMin <= 5 &&           // até 5min antes
    diffInicioMin >= -15;           // até 15min depois

  const checkinExpirou =
    pedido.status === 'APROVADA' &&
    agora > new Date(inicio.getTime() + 15 * 60000);

  const podeCheckout = pedido.status === 'EM_ANDAMENTO' && agora < fim;

  const podeCancelar =
    ['APROVADA', 'PENDENTE_APROVACAO'].includes(pedido.status) &&
    diffInicioMin > 60; // mais de 1h antes

  // Tempo até o check-in abrir
  const minParaCheckin = Math.ceil(diffInicioMin - 5); // abre 5min antes

  return { podeCheckin, checkinExpirou, podeCheckout, podeCancelar, minParaCheckin };
}

// ─── Badge de status ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${statusReservaColor[status as keyof typeof statusReservaColor] ?? 'badge-gray'}`}>
      {statusReservaLabel[status as keyof typeof statusReservaLabel] ?? status}
    </span>
  );
}

// ─── Contador regressivo para check-in ───────────────────────────────────────

function CountdownCheckin({ inicioPrevisto }: { inicioPrevisto: string }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const tick = () => {
      const agora = new Date();
      const abertura = new Date(new Date(inicioPrevisto).getTime() - 5 * 60000);
      const diff = abertura.getTime() - agora.getTime();
      if (diff <= 0) { setDisplay(''); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [inicioPrevisto]);

  if (!display) return null;
  return (
    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
      Check-in em {display}
    </span>
  );
}

// ─── Modal de detalhes + ações ────────────────────────────────────────────────

function PedidoModal({
  pedido,
  onClose,
  onRefresh,
}: {
  pedido: PedidoReserva;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isPc = pedido.tipo === 'COMPUTADOR';
  const itens = isPc
    ? pedido.reservasComputador?.map(r => ({ id: r.id, nome: r.computador?.codigo ?? '—' })) ?? []
    : pedido.reservasSala?.map(r => ({ id: r.id, nome: r.sala?.nome ?? '—' })) ?? [];

  // Usa a primeira reserva do pedido para ações
  const primeiraReservaId = itens[0]?.id;
  const { podeCheckin, checkinExpirou, podeCheckout, podeCancelar, minParaCheckin } = getAcoes(pedido);

  const handle = async (acao: 'checkin' | 'checkout' | 'cancelar') => {
    setActing(acao);
    setError('');
    setSuccess('');
    try {
      if (acao === 'checkin') await pedidosApi.checkin(pedido.id);
      else if (acao === 'checkout') await pedidosApi.checkout(pedido.id);
      else await pedidosApi.cancelar(pedido.id);

      const msgs: Record<string, string> = {
        checkin: 'Check-in realizado!',
        checkout: 'Check-out realizado. Até logo!',
        cancelar: 'Reserva cancelada.',
      };
      setSuccess(msgs[acao]);
      await onRefresh();
      setTimeout(onClose, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao executar ação');
    }
    setActing(null);
  };

  const primeiraReserva = isPc
    ? pedido.reservasComputador?.[0]
    : pedido.reservasSala?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">

        {/* Header */}
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

          {/* Itens reservados */}
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-2">{isPc ? 'Computadores' : 'Salas'}</p>
            <div className="flex flex-wrap gap-2">
              {itens.map((item, i) => (
                <span key={i} className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isPc
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-mono'
                  : 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'}`}>
                  {item.nome}
                </span>
              ))}
            </div>
          </div>

          {/* Data e horário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Data</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{formatData(pedido.inicioPrevisto)}</p>
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

          {/* Check-in / Check-out realizados */}
          {(primeiraReserva?.checkinEm || primeiraReserva?.checkoutEm) && (
            <div className="grid grid-cols-2 gap-3">
              {primeiraReserva?.checkinEm && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Check-in</p>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {formatDataHora(primeiraReserva.checkinEm)}
                  </p>
                </div>
              )}
              {primeiraReserva?.checkoutEm && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Check-out</p>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    {formatDataHora(primeiraReserva.checkoutEm)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Aviso check-in expirado */}
          {checkinExpirou && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-600 dark:text-rose-400">
                ⚠️ Prazo de check-in encerrado. Esta reserva será marcada como atrasada.
              </p>
            </div>
          )}

          {/* Aviso check-in ainda não disponível */}
          {pedido.status === 'APROVADA' && !podeCheckin && !checkinExpirou && minParaCheckin > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Check-in disponível 5 min antes do início.
              </p>
              <CountdownCheckin inicioPrevisto={pedido.inicioPrevisto} />
            </div>
          )}

          {/* Feedback */}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{success}</p>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          )}

          {/* Ações */}
          {(podeCheckin || podeCheckout || podeCancelar) && (
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">

              {podeCheckin && (
                <button
                  onClick={() => handle('checkin')}
                  disabled={!!acting}
                  className="btn-success w-full flex items-center justify-center gap-2"
                >
                  {acting === 'checkin'
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>}
                  {acting === 'checkin' ? 'Fazendo check-in...' : 'Fazer Check-in'}
                </button>
              )}

              {podeCheckout && (
                <button
                  onClick={() => handle('checkout')}
                  disabled={!!acting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {acting === 'checkout'
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>}
                  {acting === 'checkout' ? 'Fazendo check-out...' : 'Fazer Check-out'}
                </button>
              )}

              {podeCancelar && (
                <button
                  onClick={() => {
                    if (confirm('Cancelar esta reserva? Esta ação não pode ser desfeita.')) handle('cancelar');
                  }}
                  disabled={!!acting}
                  className="btn-danger w-full flex items-center justify-center gap-2"
                >
                  {acting === 'cancelar'
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>}
                  {acting === 'cancelar' ? 'Cancelando...' : 'Cancelar Reserva'}
                </button>
              )}
            </div>
          )}

          {/* Info de cancelamento quando ainda não disponível */}
          {['APROVADA', 'PENDENTE_APROVACAO'].includes(pedido.status) && !podeCancelar && (
            <p className="text-xs text-[var(--text-muted)] text-center pt-1">
              Cancelamento disponível somente até 1h antes do início.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card de pedido ───────────────────────────────────────────────────────────

function PedidoCard({ pedido, onClick }: { pedido: PedidoReserva; onClick: () => void }) {
  const isPc = pedido.tipo === 'COMPUTADOR';
  const itens = isPc
    ? pedido.reservasComputador?.map(r => r.computador?.codigo ?? '—') ?? []
    : pedido.reservasSala?.map(r => r.sala?.nome ?? '—') ?? [];

  const { podeCheckin, podeCheckout, podeCancelar, checkinExpirou } = getAcoes(pedido);
  const temAcao = podeCheckin || podeCheckout || podeCancelar;
  const isAtivo = STATUS_ATIVOS.includes(pedido.status);

  // Indicadores visuais de urgência
  const urgente = podeCheckin || podeCheckout;

  return (
    <div
      onClick={onClick}
      className={`px-5 py-4 cursor-pointer transition-colors hover:bg-[var(--surface-2)] ${!isAtivo ? 'opacity-55' : ''} ${urgente ? 'border-l-2 border-blue-500' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">

        {/* Esquerda */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${isPc
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
              {isPc ? 'PC' : 'SALA'}
            </span>
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {itens.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-[var(--text-muted)]">
              {formatData(pedido.inicioPrevisto)} · {formatHora(pedido.inicioPrevisto)} → {formatHora(pedido.fimPrevisto)}
            </p>
            {podeCheckin && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                ● Check-in disponível!
              </span>
            )}
            {checkinExpirou && (
              <span className="text-xs font-semibold text-rose-500">
                ⚠ Check-in expirado
              </span>
            )}
            {podeCheckout && (
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                ● Em andamento
              </span>
            )}
            {pedido.status === 'APROVADA' && !podeCheckin && !checkinExpirou && (
              <CountdownCheckin inicioPrevisto={pedido.inicioPrevisto} />
            )}
          </div>
        </div>

        {/* Direita */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={pedido.status} />
          {temAcao && (
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          )}
          <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DashboardUsuarioPage() {
  const { user } = useAuth();
  const [meusPedidos, setMeusPedidos] = useState<PedidoReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoReserva | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  const fetchPedidos = useCallback(async () => {
    try {
      const lista = await pedidosApi.meus();
      setMeusPedidos(lista);
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  // Atualiza a cada 30s para manter check-in/checkout em dia
  useEffect(() => {
    const id = setInterval(fetchPedidos, 30000);
    return () => clearInterval(id);
  }, [fetchPedidos]);

  const ativos = meusPedidos
    .filter(p => STATUS_ATIVOS.includes(p.status))
    .sort((a, b) => new Date(a.inicioPrevisto).getTime() - new Date(b.inicioPrevisto).getTime());

  const historico = meusPedidos
    .filter(p => STATUS_ENCERRADOS.includes(p.status))
    .sort((a, b) => new Date(b.inicioPrevisto).getTime() - new Date(a.inicioPrevisto).getTime());

  const emAndamento = ativos.filter(p => p.status === 'EM_ANDAMENTO');
  const aguardandoCheckin = ativos.filter(p => {
    const { podeCheckin } = getAcoes(p);
    return podeCheckin;
  });

  // Re-abre o modal com dados atualizados após refresh
  useEffect(() => {
    if (pedidoSelecionado) {
      const atualizado = meusPedidos.find(p => p.id === pedidoSelecionado.id);
      if (atualizado) setPedidoSelecionado(atualizado);
    }
  }, [meusPedidos]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">

        <Link href="/dashboard/usuario/reservar" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Reserva
        </Link>
      </div>

      {/* Alertas de ação imediata */}
      {!loading && aguardandoCheckin.length > 0 && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-pulse shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {aguardandoCheckin.length === 1
                ? 'Você tem uma reserva aguardando check-in!'
                : `Você tem ${aguardandoCheckin.length} reservas aguardando check-in!`}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Clique na reserva abaixo para fazer o check-in.
            </p>
          </div>
        </div>
      )}

      {!loading && emAndamento.length > 0 && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 animate-pulse shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {emAndamento.length === 1 ? 'Você tem uma reserva em andamento.' : `${emAndamento.length} reservas em andamento.`}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              Clique para fazer check-out quando sair.
            </p>
          </div>
        </div>
      )}

      {/* Reservas ativas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Minhas Reservas</h2>
          <span className="text-xs text-[var(--text-muted)]">
            {ativos.length} ativa{ativos.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="card divide-y divide-[var(--border)]">
            {[1, 2, 3].map(i => <div key={i} className="h-16 shimmer" />)}
          </div>
        ) : ativos.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[var(--text-secondary)] font-medium">Nenhuma reserva ativa</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Que tal reservar uma sala ou computador?</p>
            <Link href="/dashboard/usuario/reservar" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Fazer reserva
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-[var(--border)] overflow-hidden">
            {ativos.map(p => (
              <PedidoCard key={p.id} pedido={p} onClick={() => setPedidoSelecionado(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Histórico */}
      {historico.length > 0 && (
        <div>
          <button
            onClick={() => setMostrarHistorico(v => !v)}
            className="w-full flex items-center justify-between py-2 group"
          >
            <h2 className="section-title group-hover:text-[var(--text-primary)] transition-colors">
              Histórico
            </h2>
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <span className="text-xs">{historico.length} reserva{historico.length !== 1 ? 's' : ''}</span>
              <svg
                className={`w-4 h-4 transition-transform ${mostrarHistorico ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {mostrarHistorico && (
            <div className="card divide-y divide-[var(--border)] overflow-hidden mt-2">
              {historico.map(p => (
                <PedidoCard key={p.id} pedido={p} onClick={() => setPedidoSelecionado(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {pedidoSelecionado && (
        <PedidoModal
          pedido={pedidoSelecionado}
          onClose={() => setPedidoSelecionado(null)}
          onRefresh={fetchPedidos}
        />
      )}
    </div>
  );
}