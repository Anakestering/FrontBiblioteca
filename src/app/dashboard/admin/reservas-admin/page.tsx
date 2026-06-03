'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { aprovacoes as aprovacaoApi, pedidos as pedidosApi } from '@/lib/api';
import { PedidoReserva, AprovacaoReserva, StatusReserva, TipoPedido } from '@/types';
import { statusReservaLabel, statusReservaColor, formatDateTime, maskCpf, maskTel } from '@/lib/utils';
import { Alert } from '@/app/components/ui/ErrorAlert';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingList } from '@/app/components/ui/LoadingList';
import { useConfirm } from '@/app/hooks/useConfirm';
import { Modal } from '@/app/components/ui/Modal';

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

type PeriodoOpcao = 'HOJE' | '7_DIAS' | 'MES_ATUAL' | 'CUSTOMIZADO';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHora(iso: string) {
  if (!iso) return '--:--';
  const t = iso.split('T')[1];
  return t ? t.substring(0, 5) : iso;
}

function formatDataCurta(iso: string) {
  if (!iso) return '../../....';
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
  const [acting, setActing] = useState<'aprovar' | 'rejeitar' | 'cancelar' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const isPC = pedido.tipo === 'COMPUTADOR';
  const itens = isPC
    ? (pedido.reservasComputador ?? []).map(r => r.computador?.codigo)
    : (pedido.reservasSala ?? []).map(r => r.sala?.nome);

  const aprovacaoPendente = aprovacoes.find(ap => ap.pedido?.id === pedido.id);
  const podeAprovar = pedido.status === 'PENDENTE_APROVACAO' && !!aprovacaoPendente;
  const podeCancelar = STATUS_ATIVAS.includes(pedido.status);
  const { openConfirm, confirmModal } = useConfirm();

  const primeiraReserva = isPC
    ? pedido.reservasComputador?.[0]
    : pedido.reservasSala?.[0];

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
        } finally {
          setActing(null);
        }
      },
    });
  };

  const handleAprovacao = async (acao: 'aprovar' | 'rejeitar') => {
    if (!aprovacaoPendente) return;
    setActing(acao);
    setError('');
    try {
      const motivoTrimmed = motivo.trim() || undefined;
      if (acao === 'aprovar') {
        await aprovacaoApi.aprovar(aprovacaoPendente.id, motivoTrimmed);
      } else {
        await aprovacaoApi.rejeitar(aprovacaoPendente.id, motivoTrimmed);
      }
      await onRefresh();
      onClose();
    } catch (e: unknown) {
      console.error(`Erro ao processar ${acao}:`, e);
      setError(e instanceof Error ? e.message : `Erro ao ${acao} a reserva`);
    } finally {
      setActing(null);
    }
  };

  const modalTitle = `${isPC ? '💻 PC' : '🏫 SALA'} — Pedido #${pedido.id}`;

  return (
    <Modal title={modalTitle} onClose={onClose} maxWidth="lg">
      <div className="space-y-4">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">{isPC ? 'Computadores' : 'Salas'}</p>
          <div className="flex flex-wrap gap-2">
            {itens.map((item, i) => item && (
              <span key={i} className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isPC
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-mono'
                : 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'}`}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">Nome</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{pedido.usuario?.nome}</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">E-mail</p>
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">{pedido.usuario?.email}</p>
          </div>
          {pedido.usuario?.cpf && (
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">CPF</p>
              <p className="text-xs font-mono text-[var(--text-secondary)]">{maskCpf(pedido.usuario.cpf)}</p>
            </div>
          )}
          {pedido.usuario?.telefone && (
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Telefone</p>
              <p className="text-xs text-[var(--text-secondary)]">{maskTel(pedido.usuario.telefone)}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[var(--surface-2)] flex flex-col justify-between">
            <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
            <span className={`badge text-center w-fit ${statusReservaColor[pedido.status] || ''}`}>
              {statusReservaLabel[pedido.status] || pedido.status}
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
        </div>

        {(primeiraReserva?.checkinEm || primeiraReserva?.checkoutEm) && (
          <div className="grid grid-cols-2 gap-3">
            {primeiraReserva?.checkinEm && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Check-in realizado</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {formatDateTime(primeiraReserva.checkinEm)}
                </p>
              </div>
            )}
            {primeiraReserva?.checkoutEm && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Check-out realizado</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {formatDateTime(primeiraReserva.checkoutEm)}
                </p>
              </div>
            )}
          </div>
        )}

        {pedido.observacao && (
          <div className="p-3 rounded-xl bg-[var(--surface-2)] break-words">
            <p className="text-xs text-[var(--text-muted)] mb-1">Observação do Usuário</p>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{pedido.observacao}</p>
          </div>
        )}

        <Alert message={error} />

        {(podeAprovar || podeCancelar) && (
          <div className="space-y-3 pt-3 border-t border-[var(--border)]">
            {podeAprovar && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Motivo da Decisão administrativa</label>
                <input
                  type="text"
                  className="input-field text-sm"
                  placeholder="Justificativa para o usuário (opcional)"
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  disabled={!!acting}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAprovacao('rejeitar')}
                    disabled={!!acting}
                    className="btn-danger flex-1 h-10 flex items-center justify-center gap-2 text-sm"
                  >
                    {acting === 'rejeitar' ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : '✕ Rejeitar'}
                  </button>
                  <button
                    onClick={() => handleAprovacao('aprovar')}
                    disabled={!!acting}
                    className="btn-success flex-1 h-10 flex items-center justify-center gap-2 text-sm"
                  >
                    {acting === 'aprovar' ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : '✓ Aprovar'}
                  </button>
                </div>
              </div>
            )}
            {podeCancelar && !podeAprovar && (
              <button
                onClick={handleCancelar}
                disabled={!!acting}
                className="btn-danger w-full h-10 flex items-center justify-center gap-2 text-sm font-medium"
              >
                {acting === 'cancelar' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cancelando...
                  </>
                ) : 'Cancelar Reserva Permanentemente'}
              </button>
            )}
          </div>
        )}

        {confirmModal}
      </div>
    </Modal>
  );
}

// ─── Card de pedido ───────────────────────────────────────────────────────────

function PedidoCard({ pedido, onClick }: { pedido: PedidoReserva; onClick: () => void }) {
  const isPC = pedido.tipo === 'COMPUTADOR';
  const qtd = isPC ? (pedido.reservasComputador?.length ?? 0) : (pedido.reservasSala?.length ?? 0);
  const labelItem = isPC ? `${qtd} computador${qtd !== 1 ? 'es' : ''}` : `${qtd} sala${qtd !== 1 ? 's' : ''}`;
  const encerrado = STATUS_ENCERRADAS.includes(pedido.status);

  return (
    <div
      onClick={onClick}
      className={`px-5 py-4 cursor-pointer hover:bg-[var(--surface-2)] transition-colors ${encerrado ? 'opacity-50' : ''}`}
    >
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
            {pedido.usuario?.nome} · <span className="font-mono">{pedido.usuario?.email}</span>
          </p>
        </div>
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatHora(pedido.inicioPrevisto)} → {formatHora(pedido.fimPrevisto)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{formatDataCurta(pedido.inicioPrevisto)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`badge text-xs ${statusReservaColor[pedido.status] || ''}`}>
            {statusReservaLabel[pedido.status] || pedido.status}
          </span>
          <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Interno com Lógica (Mantido Puro) ───────────────────────────

function ReservasAdminPageContent() {
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get('tipo') as TipoPedido | null;
  const dataParam = searchParams.get('data');

  const [tab, setTab] = useState<TipoPedido | 'TODOS'>(
    tipoParam === 'SALA' ? 'SALA' : tipoParam === 'COMPUTADOR' ? 'COMPUTADOR' : 'TODOS'
  );
  const [todosPedidos, setTodosPedidos] = useState<PedidoReserva[]>([]);
  const [aprovacoes, setAprovacoes] = useState<AprovacaoReserva[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Filtro
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusReserva | ''>('');
  const [periodo, setPeriodo] = useState<PeriodoOpcao>('HOJE');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dataCustomizada, setDataCustomizada] = useState(dataParam ?? today);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoReserva | null>(null);
  const [dataCustomizadaFim, setDataCustomizadaFim] = useState(today);

  // Função unificada de busca que conversa com o back-end inteligente
  const buscarFiltrado = async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof pedidosApi.filtrar>[0] = {
        status: statusFilter || undefined,
        busca: search.trim() || undefined,
      };

      // Injeta as regras de datas baseadas no seletor de Período
      if (periodo === 'HOJE') {
        params.data = today;
      } else if (periodo === '7_DIAS') {
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 7);
        params.dataInicio = dataInicio.toISOString().split('T')[0];
        params.dataFim = today;
      } else if (periodo === 'MES_ATUAL') {
        const agora = new Date();
        const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1);
        const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
        params.dataInicio = primeiroDia.toISOString().split('T')[0];
        params.dataFim = ultimoDia.toISOString().split('T')[0];
      } else if (periodo === 'CUSTOMIZADO') {
        if (dataCustomizada && dataCustomizadaFim) {
          params.dataInicio = dataCustomizada;
          params.dataFim = dataCustomizadaFim;
        } else if (dataCustomizada) {
          params.data = dataCustomizada;
        }
      }

      const [ped, ap] = await Promise.all([
        pedidosApi.filtrar(params),
        aprovacaoApi.pendentes(),
      ]);

      setTodosPedidos(ped ?? []);
      setAprovacoes(ap ?? []);
    } catch (err) {
      console.error('Erro ao carregar reservas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dispara a busca no banco sempre que qualquer filtro mudar
  useEffect(() => {
    buscarFiltrado();
  }, [periodo, dataCustomizada, dataCustomizadaFim, statusFilter, search]);

  // Filtra localmente apenas o Chaveamento de Abas (Tabs) para performance instantânea
  const pedidosFiltrados = useMemo(() => {
    return todosPedidos
      .filter(p => tab === 'TODOS' || p.tipo === tab)
      .sort((a, b) => new Date(b.inicioPrevisto).getTime() - new Date(a.inicioPrevisto).getTime());
  }, [todosPedidos, tab]);

  const { totalComputador, totalSala } = useMemo(() => {
    return {
      totalComputador: todosPedidos.filter(p => p.tipo === 'COMPUTADOR').length,
      totalSala: todosPedidos.filter(p => p.tipo === 'SALA').length
    };
  }, [todosPedidos]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Todas as Reservas</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {pedidosFiltrados.length} resultado{pedidosFiltrados.length !== 1 ? 's' : ''}
            {(statusFilter || search || periodo !== 'HOJE') ? ' encontrados' : ''}
          </p>
        </div>
        <Link href="/dashboard/usuario/reservar" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Reserva
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-2)] rounded-xl w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => { setTab('TODOS'); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${tab === 'TODOS'
            ? 'bg-white dark:bg-[#161b22] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
        >
          Todos ({totalComputador + totalSala})
        </button>
        <button
          onClick={() => { setTab('COMPUTADOR'); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${tab === 'COMPUTADOR'
            ? 'bg-white dark:bg-[#161b22] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
        >
          Computadores ({totalComputador})
        </button>
        <button
          onClick={() => { setTab('SALA'); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${tab === 'SALA'
            ? 'bg-white dark:bg-[#161b22] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
        >
          Salas ({totalSala})
        </button>
      </div>

      {/* Filtros Modernizados */}
      <div className="grid grid-cols-1 sm:flex gap-3 flex-wrap items-center">
        {/* Campo de Busca Global */}
        <input
          type="text"
          placeholder="Buscar no período (Nome, e-mail, sala, PC)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 sm:max-w-xs"
        />

        {/* Filtro de Status */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusReserva | '')}
          className="input-field sm:max-w-[200px]"
        >
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Novo Seletor de Período Inteligente */}
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value as PeriodoOpcao)}
          className="input-field sm:max-w-[180px] font-medium"
        >
          <option value="HOJE">Hoje</option>
          <option value="7_DIAS">Últimos 7 dias</option>
          <option value="MES_ATUAL">Mês Atual</option>
          <option value="CUSTOMIZADO">Data Específica</option>
        </select>

        {/* Input de Data condicional (só aparece se escolher "Data Específica") */}
        {periodo === 'CUSTOMIZADO' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={dataCustomizada}
              onChange={e => setDataCustomizada(e.target.value)}
              className="input-field sm:max-w-[160px]"
              placeholder="Data início"
            />
            <span className="text-xs text-[var(--text-muted)] shrink-0">até</span>
            <input
              type="date"
              value={dataCustomizadaFim}
              onChange={e => setDataCustomizadaFim(e.target.value)}
              min={dataCustomizada}
              className="input-field sm:max-w-[160px]"
              placeholder="Data fim"
            />
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <LoadingList items={5} />
      ) : pedidosFiltrados.length === 0 ? (
        <EmptyState message="Nenhuma reserva encontrada para os filtros selecionados" />
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {pedidosFiltrados.map(p => (
            <PedidoCard key={p.id} pedido={p} onClick={() => setPedidoSelecionado(p)} />
          ))}
          <div className="px-5 py-2.5 bg-[var(--bg-muted)]/10 text-xs text-[var(--text-muted)] font-medium">
            Mostrando {pedidosFiltrados.length} registro{pedidosFiltrados.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {pedidoSelecionado && (
        <DetalheModal
          pedido={pedidoSelecionado}
          aprovacoes={aprovacoes}
          onClose={() => setPedidoSelecionado(null)}
          onRefresh={buscarFiltrado}
        />
      )}
    </div>
  );
}

// ─── Componente Root wrapper (Segurança Total de Escopo) ───────────────────

export default function ReservasAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-muted)] font-medium">Carregando painel administrativo...</div>}>
      <ReservasAdminPageContent />
    </Suspense>
  );
}