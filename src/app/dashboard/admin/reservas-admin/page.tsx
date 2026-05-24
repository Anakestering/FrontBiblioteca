'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { aprovacoes as aprovacaoApi, pedidos as pedidosApi } from '@/lib/api';
import { PedidoReserva, AprovacaoReserva, StatusReserva, TipoPedido } from '@/types';
import { statusReservaLabel, statusReservaColor, formatDateTime, maskCpf, maskTel } from '@/lib/utils';

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_ATIVAS: StatusReserva[] = ['APROVADA', 'PENDENTE_APROVACAO', 'EM_ANDAMENTO'];
const STATUS_ENCERRADAS: StatusReserva[] = ['FINALIZADA', 'CANCELADA', 'ATRASADO', 'REJEITADA'];

const statusOptions: { value: StatusReserva | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDENTE_APROVACAO', label: 'Aguardando Aprovação' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
  { value: 'ATRASADO', label: 'Atrasado' },
  { value: 'REJEITADA', label: 'Rejeitada' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHora(iso: string) {
  const t = iso.split('T')[1];
  return t ? t.substring(0, 5) : iso;
}

function formatDataCurta(iso: string) {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

// ─── Modal de detalhes ────────────────────────────────────────────────────────

function DetalheModal({ pedido, aprovacoes, onClose, onRefresh }: {
  pedido: PedidoReserva;
  aprovacoes: AprovacaoReserva[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [acting, setActing] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const isPC = pedido.tipo === 'COMPUTADOR';
  const itens = isPC
    ? pedido.reservasComputador.map(r => r.computador.codigo)
    : pedido.reservasSala.map(r => r.sala.nome);

  const aprovacaoPendente = aprovacoes.find(ap => ap.pedido?.id === pedido.id);
  const podeAprovar = pedido.status === 'PENDENTE_APROVACAO' && !!aprovacaoPendente;
  const podeCancelar = STATUS_ATIVAS.includes(pedido.status);

  const primeiraReserva = isPC
    ? pedido.reservasComputador[0]
    : pedido.reservasSala[0];

  const handleCancelar = async () => {
    if (!confirm('Cancelar esta reserva?')) return;
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
      setError(e instanceof Error ? e.message : 'Erro');
    }
    setActing(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isPC
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
              {isPC ? 'COMPUTADOR' : 'SALA'}
            </span>
            <span className="text-xs text-[var(--text-muted)]">Pedido #{pedido.id}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Itens */}
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-2">{isPC ? 'Computadores' : 'Salas'}</p>
            <div className="flex flex-wrap gap-2">
              {itens.map((item, i) => (
                <span key={i} className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isPC
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-mono'
                  : 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Dados do usuário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Nome</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{pedido.usuario.nome}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">E-mail</p>
              <p className="text-xs text-[var(--text-muted)]">{pedido.usuario.email}</p>
            </div>
            {pedido.usuario.cpf && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">CPF</p>
                <p className="text-xs font-mono text-[var(--text-muted)]">{maskCpf(pedido.usuario.cpf)}</p>
              </div>
            )}
            {pedido.usuario.telefone && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Telefone</p>
                <p className="text-xs text-[var(--text-muted)]">{maskTel(pedido.usuario.telefone)}</p>
              </div>
            )}
          </div>

          {/* Detalhes da reserva */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
              <span className={`badge ${statusReservaColor[pedido.status]}`}>
                {statusReservaLabel[pedido.status]}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Pessoas</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{pedido.qtdePessoas}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Data</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatDataCurta(pedido.inicioPrevisto)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Horário</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatHora(pedido.inicioPrevisto)} → {formatHora(pedido.fimPrevisto)}
              </p>
            </div>
            {primeiraReserva?.checkinEm && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Check-in</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {formatDateTime(primeiraReserva.checkinEm)}
                </p>
              </div>
            )}
            {primeiraReserva?.checkoutEm && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Check-out</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {formatDateTime(primeiraReserva.checkoutEm)}
                </p>
              </div>
            )}
          </div>

          {pedido.observacao && (
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Observação</p>
              <p className="text-sm text-[var(--text-secondary)]">{pedido.observacao}</p>
            </div>
          )}

          {/* Ações */}
          {(podeAprovar || podeCancelar) && (
            <div className="space-y-3 pt-2 border-t border-[var(--border)]">
              {podeAprovar && (
                <div className="space-y-2">
                  <input type="text" className="input-field text-sm" placeholder="Motivo (opcional)"
                    value={motivo} onChange={e => setMotivo(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => handleAprovacao('rejeitar')} disabled={!!acting}
                      className="btn-danger flex-1 flex items-center justify-center gap-2 text-sm">
                      {acting === 'rejeitar'
                        ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : '✕'}
                      Rejeitar
                    </button>
                    <button onClick={() => handleAprovacao('aprovar')} disabled={!!acting}
                      className="btn-success flex-1 flex items-center justify-center gap-2 text-sm">
                      {acting === 'aprovar'
                        ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : '✓'}
                      Aprovar
                    </button>
                  </div>
                </div>
              )}
              {podeCancelar && (
                <button onClick={handleCancelar} disabled={!!acting}
                  className="btn-danger w-full flex items-center justify-center gap-2 text-sm">
                  {acting === 'cancelar' &&
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {acting === 'cancelar' ? 'Cancelando...' : 'Cancelar reserva'}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card de pedido ───────────────────────────────────────────────────────────

function PedidoCard({ pedido, onClick }: { pedido: PedidoReserva; onClick: () => void }) {
  const isPC = pedido.tipo === 'COMPUTADOR';
  const qtd = isPC ? pedido.reservasComputador.length : pedido.reservasSala.length;
  const labelItem = isPC ? `${qtd} computador${qtd !== 1 ? 'es' : ''}` : `${qtd} sala${qtd !== 1 ? 's' : ''}`;

  const encerrado = STATUS_ENCERRADAS.includes(pedido.status);

  return (
    <div onClick={onClick}
      className={`px-5 py-4 cursor-pointer hover:bg-[var(--surface-2)] transition-colors ${encerrado ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${isPC
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
              {isPC ? 'PC' : 'SALA'}
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {labelItem}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] truncate">
            {pedido.usuario.nome} · {pedido.usuario.email}
          </p>
        </div>
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatHora(pedido.inicioPrevisto)} → {formatHora(pedido.fimPrevisto)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{formatDataCurta(pedido.inicioPrevisto)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge ${statusReservaColor[pedido.status]}`}>
            {statusReservaLabel[pedido.status]}
          </span>
          <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Página  ────────────────────────────────────────────────

function ReservasAdminPage() {
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get('tipo') as TipoPedido | null;
  const dataParam = searchParams.get('data');

  const [tab, setTab] = useState<TipoPedido | 'TODOS'>(
    tipoParam === 'SALA' ? 'SALA' : tipoParam === 'COMPUTADOR' ? 'COMPUTADOR' : 'TODOS'
  );
  const [todosPedidos, setTodosPedidos] = useState<PedidoReserva[]>([]);
  const [aprovacoes, setAprovacoes] = useState<AprovacaoReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusReserva | ''>('');
  const [dataFiltro, setDataFiltro] = useState(dataParam ?? '');
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoReserva | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ped, ap] = await Promise.all([
        pedidosApi.todos(),
        aprovacaoApi.pendentes(),
      ]);
      setTodosPedidos(ped);
      setAprovacoes(ap);
    } catch (_) { }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const pedidosFiltrados = todosPedidos
    .filter(p => {
      if (tab !== 'TODOS' && p.tipo !== tab) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (dataFiltro && p.inicioPrevisto.substring(0, 10) !== dataFiltro) return false;
      if (search) {
        const term = search.toLowerCase();
        const matchUsuario = p.usuario.email.toLowerCase().includes(term) ||
          p.usuario.nome.toLowerCase().includes(term);
        const matchItem = p.tipo === 'COMPUTADOR'
          ? p.reservasComputador.some(r => r.computador.codigo.toLowerCase().includes(term))
          : p.reservasSala.some(r => r.sala.nome.toLowerCase().includes(term));
        if (!matchUsuario && !matchItem) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.inicioPrevisto).getTime() - new Date(a.inicioPrevisto).getTime());

  const totalComputador = todosPedidos.filter(p => p.tipo === 'COMPUTADOR').length;
  const totalSala = todosPedidos.filter(p => p.tipo === 'SALA').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Todas as Reservas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {todosPedidos.length} {todosPedidos.length !== 1 ? '' : ''} até hoje
          </p>
        </div>
        <Link href="/dashboard/usuario/reservar" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Reserva
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-2)] rounded-xl w-fit">
        <button
          onClick={() => { setTab('TODOS'); setStatusFilter(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'TODOS'
            ? 'bg-white dark:bg-[#161b22] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
          Todos ({totalComputador + totalSala})
        </button>
        <button
          onClick={() => { setTab('COMPUTADOR'); setStatusFilter(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'COMPUTADOR'
            ? 'bg-white dark:bg-[#161b22] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
          Computadores ({totalComputador})
        </button>
        <button
          onClick={() => { setTab('SALA'); setStatusFilter(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'SALA'
            ? 'bg-white dark:bg-[#161b22] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
          Salas ({totalSala})
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input type="text"
          placeholder={tab === 'COMPUTADOR' ? 'Buscar por usuário ou PC...' : tab === 'SALA' ? 'Buscar por usuário ou sala...' : 'Buscar por usuário...'}
          value={search} onChange={e => setSearch(e.target.value)}
          className="input-field max-w-xs" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusReserva | '')}
          className="input-field max-w-[220px]">
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)}
            className="input-field max-w-[180px]" />
          {dataFiltro && (
            <button onClick={() => setDataFiltro('')} className="text-xs text-rose-500 hover:underline">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-secondary)]">Nenhuma reserva encontrada</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {pedidosFiltrados.map(p => (
            <PedidoCard key={p.id} pedido={p} onClick={() => setPedidoSelecionado(p)} />
          ))}
          <div className="px-5 py-2 text-xs text-[var(--text-muted)]">
            {pedidosFiltrados.length} resultado{pedidosFiltrados.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {pedidoSelecionado && (
        <DetalheModal
          pedido={pedidoSelecionado}
          aprovacoes={aprovacoes}
          onClose={() => setPedidoSelecionado(null)}
          onRefresh={loadAll}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-muted)]">Carregando...</div>}>
      <ReservasAdminPage />
    </Suspense>
  );
}