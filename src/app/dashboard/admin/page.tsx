'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  pedidos as pedidosApi,
  aprovacoes as aprovacaoApi,
  usuarios,
  computadores as computadoresApi,
  salas as salasApi,
} from '@/lib/api';
import { PedidoReserva, AprovacaoReserva, Computador, Sala } from '@/types';
import { statusReservaLabel, statusReservaColor, formatDateTime, formatDate, maskCpf, maskTel } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(offset = 0): Date[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
type FiltroTipo = 'todos' | 'COMPUTADOR' | 'SALA';

// ─── Modal de detalhe do pedido ───────────────────────────────────────────────

function PedidoDetailModal({ pedido, aprovacoes, onClose, onRefresh }: {
  pedido: PedidoReserva;
  aprovacoes: AprovacaoReserva[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [acting, setActing] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const isPc = pedido.tipo === 'COMPUTADOR';
  const itens = isPc
    ? pedido.reservasComputador?.map(r => r.computador?.codigo ?? '—') ?? []
    : pedido.reservasSala?.map(r => r.sala?.nome ?? '—') ?? [];

  const aprovacaoPendente = aprovacoes.find(ap => ap.pedido?.id === pedido.id);
  const podeAprovar = pedido.status === 'PENDENTE_APROVACAO' && !!aprovacaoPendente;
  const podeCancelar = ['APROVADA', 'PENDENTE_APROVACAO', 'EM_ANDAMENTO'].includes(pedido.status);

  const handleCancelar = async () => {
    if (!confirm('Cancelar este pedido?')) return;
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

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isPc
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
              {isPc ? 'COMPUTADOR' : 'SALA'}
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

          {/* Dados do usuário */}
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
                {new Date(pedido.inicioPrevisto).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Horário</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatHora(pedido.inicioPrevisto)} → {formatHora(pedido.fimPrevisto)}
              </p>
            </div>
          </div>

          {pedido.observacao && (
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Observação</p>
              <p className="text-sm text-[var(--text-secondary)]">{pedido.observacao}</p>
            </div>
          )}
          
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
                    <button
                      onClick={() => handleAprovacao('rejeitar')}
                      disabled={!!acting}
                      className="btn-danger flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                      {acting === 'rejeitar'
                        ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : '✕'}
                      Rejeitar
                    </button>
                    <button
                      onClick={() => handleAprovacao('aprovar')}
                      disabled={!!acting}
                      className="btn-success flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                      {acting === 'aprovar'
                        ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : '✓'}
                      Aprovar
                    </button>
                  </div>
                </div>
              )}
              {podeCancelar && (
                <button
                  onClick={handleCancelar}
                  disabled={!!acting}
                  className="btn-danger w-full flex items-center justify-center gap-2 text-sm"
                >
                  {acting === 'cancelar'
                    ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : null}
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

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [pedidos, setPedidos] = useState<PedidoReserva[]>([]);
  const [pendentes, setPendentes] = useState<AprovacaoReserva[]>([]);
  const [allPcs, setAllPcs] = useState<Computador[]>([]);
  const [allSalas, setAllSalas] = useState<Sala[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroSemana, setFiltroSemana] = useState<FiltroTipo>('todos');
  const [selectedPedido, setSelectedPedido] = useState<PedidoReserva | null>(null);

  const today = new Date();
  const router = useRouter();
  const weekDays = getWeekDays(weekOffset);

  const fetchAll = useCallback(async () => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) return;
    try {
      const [pd, ap, u, pcs, sls] = await Promise.all([
        pedidosApi.todos(),
        aprovacaoApi.pendentes(),
        usuarios.listar(),
        computadoresApi.listar(),
        salasApi.listar(),
      ]);
      setPedidos(pd);
      setPendentes(ap);
      setUsersCount(u.length);
      setAllPcs(pcs);
      setAllSalas(sls);
    } catch (_) {}
    setLoading(false);
  }, []);

  const { isLoading: authLoading } = useAuth();
  useEffect(() => { if (!authLoading) fetchAll(); }, [fetchAll, authLoading]);

  useEffect(() => {
    setSelectedDay(getWeekDays(weekOffset)[0]);
  }, [weekOffset]);

  // ── Derivados ──────────────────────────────────────────────────────────────

  const pedidosHojePC   = pedidos.filter(p => p.tipo === 'COMPUTADOR' && isSameDay(new Date(p.inicioPrevisto), today));
  const pedidosHojeSala = pedidos.filter(p => p.tipo === 'SALA'       && isSameDay(new Date(p.inicioPrevisto), today));
  const emUsoPC         = pedidos.filter(p => p.tipo === 'COMPUTADOR' && p.status === 'EM_ANDAMENTO').length;
  const emUsoSala       = pedidos.filter(p => p.tipo === 'SALA'       && p.status === 'EM_ANDAMENTO').length;
  const totalPcsAtivos  = allPcs.filter(p => p.ativo).length;
  const totalSalasAtivas = allSalas.filter(s => s.ativo).length;

  const pedidosDiaFiltrados = pedidos
    .filter(p => isSameDay(new Date(p.inicioPrevisto), selectedDay))
    .filter(p => filtroSemana === 'todos' || p.tipo === filtroSemana)
    .sort((a, b) => new Date(a.inicioPrevisto).getTime() - new Date(b.inicioPrevisto).getTime());

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Painel Administrativo</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Visão geral do sistema</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/admin/aprovacoes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            pendentes.length > 0
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30'
              : 'bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-secondary)]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Aprovações
          {pendentes.length > 0 && (
            <span className="bg-white text-amber-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendentes.length}
            </span>
          )}
        </button>
      </div>

      {/* Cards de hoje */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push(`/dashboard/admin/reservas-admin?tipo=COMPUTADOR&data=${todayStr}`)}
          className="card p-5 text-left hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">PC</span>
            <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-blue-600">{loading ? '—' : pedidosHojePC.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Reservas de PC hoje</p>
          <p className="text-xs text-blue-500 mt-0.5 font-medium">Ver todas →</p>
        </button>

        <button
          onClick={() => router.push(`/dashboard/admin/reservas-admin?tipo=SALA&data=${todayStr}`)}
          className="card p-5 text-left hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-violet-600 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded">SALA</span>
            <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-violet-600">{loading ? '—' : pedidosHojeSala.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Reservas de Sala hoje</p>
          <p className="text-xs text-violet-500 mt-0.5 font-medium">Ver todas →</p>
        </button>
      </div>

      {/* Em uso agora — com total */}
      <div>
        <h2 className="section-title mb-3">Em uso agora</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">Computadores em uso</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-[var(--text-primary)]">{loading ? '—' : emUsoPC}</span>
              <span className="text-xl text-[var(--text-muted)] mb-1">/ {loading ? '—' : totalPcsAtivos}</span>
            </div>
            {!loading && totalPcsAtivos > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${(emUsoPC / totalPcsAtivos) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">Salas em uso</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-[var(--text-primary)]">{loading ? '—' : emUsoSala}</span>
              <span className="text-xl text-[var(--text-muted)] mb-1">/ {loading ? '—' : totalSalasAtivas}</span>
            </div>
            {!loading && totalSalasAtivas > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${(emUsoSala / totalSalasAtivas) * 100}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendário semanal */}
      <div>
        <h2 className="section-title mb-4">Reservas da Semana</h2>
        <div className="card overflow-hidden">

          {/* Navegação */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => setWeekOffset(0)}
              className="text-xs font-medium text-blue-600 hover:underline underline-offset-2">
              {weekOffset === 0 ? 'Semana atual' : 'Voltar para hoje'}
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Dias */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {weekDays.map((day, i) => {
              const isToday    = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const dp = pedidos.filter(p => p.tipo === 'COMPUTADOR' && isSameDay(new Date(p.inicioPrevisto), day)).length;
              const ds = pedidos.filter(p => p.tipo === 'SALA'       && isSameDay(new Date(p.inicioPrevisto), day)).length;
              return (
                <button key={i} onClick={() => setSelectedDay(day)}
                  className={`p-3 text-center transition-colors hover:bg-[var(--surface-2)] ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600' : ''}`}>
                  <p className={`text-xs font-medium ${isSelected ? 'text-blue-600' : 'text-[var(--text-muted)]'}`}>
                    {dayNames[day.getDay()]}
                  </p>
                  <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-blue-600' : isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--text-primary)]'}`}>
                    {day.getDate()}
                  </p>
                  {(dp + ds) > 0 && (
                    <div className="flex justify-center gap-1 mt-1">
                      {dp > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />}
                      {ds > 0 && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Lista do dia */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                {formatDate(selectedDay.toISOString())}
              </p>
              <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-lg">
                {(['todos', 'COMPUTADOR', 'SALA'] as FiltroTipo[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFiltroSemana(f)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      filtroSemana === f
                        ? 'bg-white dark:bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {f === 'todos' ? 'Todos' : f === 'COMPUTADOR' ? 'PC' : 'Sala'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg shimmer" />)}</div>
            ) : pedidosDiaFiltrados.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">Nenhuma reserva neste dia</p>
            ) : (
              <div className="space-y-2">
                {pedidosDiaFiltrados.map(p => {
                  const isPc = p.tipo === 'COMPUTADOR';
                  const nomeItem = isPc
                    ? p.reservasComputador?.map(r => r.computador?.codigo ?? '—').join(', ')
                    : p.reservasSala?.map(r => r.sala?.nome ?? '—').join(', ');
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPedido(p)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors gap-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                          isPc
                            ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
                            : 'text-violet-600 bg-violet-100 dark:bg-violet-900/30'
                        }`}>
                          {isPc ? 'PC' : 'SALA'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{nomeItem}</p>
                          <p className="text-xs text-[var(--text-muted)]">{p.usuario?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-xs text-[var(--text-muted)] font-mono">
                          {formatDateTime(p.inicioPrevisto).split(' ')[1]} → {formatDateTime(p.fimPrevisto).split(' ')[1]}
                        </p>
                        <span className={`badge ${statusReservaColor[p.status]}`}>{statusReservaLabel[p.status]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Links de gerenciamento */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/dashboard/admin/gerenciar-salas"
          className="card p-5 border-2 border-violet-200 dark:border-violet-800 hover:border-violet-400 hover:shadow-md transition-all">
          <div className="text-2xl mb-2">🏫</div>
          <p className="font-semibold text-[var(--text-primary)]">Gerenciar Salas</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {allSalas.length} sala{allSalas.length !== 1 ? 's' : ''} cadastrada{allSalas.length !== 1 ? 's' : ''}
          </p>
        </Link>
        <Link href="/dashboard/admin/gerenciar-pcs"
          className="card p-5 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:shadow-md transition-all">
          <div className="text-2xl mb-2">💻</div>
          <p className="font-semibold text-[var(--text-primary)]">Gerenciar PCs</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {allPcs.length} computador{allPcs.length !== 1 ? 'es' : ''} cadastrado{allPcs.length !== 1 ? 's' : ''}
          </p>
        </Link>
        <Link href="/dashboard/admin/usuarios-admin"
          className="card p-5 border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:shadow-md transition-all">
          <div className="text-2xl mb-2">👥</div>
          <p className="font-semibold text-[var(--text-primary)]">Gerenciar Usuários</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {usersCount} usuário{usersCount !== 1 ? 's' : ''} cadastrado{usersCount !== 1 ? 's' : ''}
          </p>
        </Link>
      </div>

      {/* Modal */}
      {selectedPedido && (
        <PedidoDetailModal
          pedido={selectedPedido}
          aprovacoes={pendentes}
          onClose={() => setSelectedPedido(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}