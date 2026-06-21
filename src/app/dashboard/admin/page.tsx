'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import { formatDate, formatTime, maskCpf, maskTel } from '@/lib/utils';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { useRouter } from 'next/navigation';
import { PedidoDetailModal } from '@/app/components/admin/PedidoDetailModal';

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

function formatLocalDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
type FiltroTipo = 'todos' | 'COMPUTADOR' | 'SALA';

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const hoje = new Date();
    const dow = hoje.getDay();
    if (dow === 0 || dow === 6) return getWeekDays(0)[0]; // segunda se for fim de semana
    return hoje;
  });

  // Dados fixos e em tempo real do dia de HOJE para os cards do topo
  const [pedidosHoje, setPedidosHoje] = useState<PedidoReserva[]>([]);

  // Cache que armazena os dados das semanas já visitadas para evitar refetching
  const [cacheSemanas, setCacheSemanas] = useState<{ [periodoChave: string]: PedidoReserva[] }>({});

  const [pendentes, setPendentes] = useState<AprovacaoReserva[]>([]);
  const [allPcs, setAllPcs] = useState<Computador[]>([]);
  const [allSalas, setAllSalas] = useState<Sala[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingCalendario, setLoadingCalendario] = useState(false);
  const [filtroSemana, setFiltroSemana] = useState<FiltroTipo>('todos');
  const [selectedPedido, setSelectedPedido] = useState<PedidoReserva | null>(null);
  const [expandEmUso, setExpandEmUso] = useState<'pc' | 'sala' | null>(null);

  const today = new Date();
  const router = useRouter();
  const weekDays = getWeekDays(weekOffset);
  const weekDaysDisplay = weekDays.slice(0, 5); // Seg–Sex apenas
  const selectedPedidoRef = useRef(selectedPedido);
  selectedPedidoRef.current = selectedPedido;

  // Gera uma string identificadora única para a semana visível
  const currentWeekDays = getWeekDays(weekOffset);
  const chavePeriodoAtual = `${formatLocalDateISO(currentWeekDays[0])}_${formatLocalDateISO(currentWeekDays[6])}`;

  const fetchAll = useCallback(async (forcarRevalidacao = false) => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      setLoadingGlobal(false);
      router.push('/login');
      return;
    }
    try {
      const hojeStr = formatLocalDateISO(today);
      const diasDaSemanaAlvo = getWeekDays(weekOffset);
      const dataInicioStr = formatLocalDateISO(diasDaSemanaAlvo[0]);
      const dataFimStr = formatLocalDateISO(diasDaSemanaAlvo[6]);
      const chaveDestaSemana = `${dataInicioStr}_${dataFimStr}`;

      const existeNoCache = !!cacheSemanas[chaveDestaSemana];

      // Se já temos a semana no cache e não é uma revalidação automática de 30s, atualizamos apenas dados rápidos de hoje
      if (!forcarRevalidacao && existeNoCache) {
        const [pdHoje, ap, u, pcs, sls] = await Promise.all([
          pedidosApi.filtrar({ data: hojeStr }), // Corrigido aqui
          aprovacaoApi.pendentes(),
          usuarios.stats(),
          computadoresApi.listar(),
          salasApi.listar(),
        ]);
        setPedidosHoje(pdHoje ?? []);
        setPendentes(ap ?? []);
        setUsersCount(u?.total ?? 0);
        setAllPcs(pcs ?? []);
        setAllSalas(sls ?? []);
        return;
      }

      // Caso precise buscar (semana nova ou revalidação de 30s)
      if (!forcarRevalidacao) setLoadingCalendario(true);

      const [pdSemana, pdHoje, ap, u, pcs, sls] = await Promise.all([
        pedidosApi.filtrar({ dataInicio: dataInicioStr, dataFim: dataFimStr }), // Corrigido aqui
        pedidosApi.filtrar({ data: hojeStr }), // Corrigido aqui
        aprovacaoApi.pendentes(),
        usuarios.stats(),
        computadoresApi.listar(),
        salasApi.listar(),
      ]);

      // Atualiza o cache adicionando ou sobrepondo a semana correspondente
      setCacheSemanas(prev => ({
        ...prev,
        [chaveDestaSemana]: pdSemana ?? []
      }));

      setPedidosHoje(pdHoje ?? []);
      setPendentes(ap ?? []);
      setUsersCount(u?.total ?? 0);
      setAllPcs(pcs ?? []);
      setAllSalas(sls ?? []);
    } catch (err) {
      console.error('Erro ao carregar dados do admin:', err);
    } finally {
      setLoadingGlobal(false);
      setLoadingCalendario(false);
    }
  }, [weekOffset, cacheSemanas, router]);

  const { isLoading: authLoading } = useAuth();

  // Polling de 30 segundos (Revalidação silenciosa em background)
  useEffect(() => {
    if (!authLoading) {
      let id: ReturnType<typeof setInterval>;

      const iniciar = () => {
        id = setInterval(() => fetchAll(true), 30000);
      };

      const pausar = () => clearInterval(id);

      const handleVisibility = () => {
        if (document.hidden) pausar();
        else { fetchAll(true); iniciar(); }
      };

      fetchAll(false);
      iniciar();
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        pausar();
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [fetchAll, authLoading]);

  // Altera o dia selecionado por padrão ao paginar a semana
  useEffect(() => {
    if (weekOffset === 0) {
      // Semana atual: seleciona hoje (se for fim de semana, vai pra segunda)
      const hoje = new Date();
      const dow = hoje.getDay(); // 0=Dom, 6=Sab
      if (dow === 0 || dow === 6) {
        setSelectedDay(getWeekDays(0)[0]); // segunda desta semana
      } else {
        setSelectedDay(hoje);
      }
    } else {
      setSelectedDay(getWeekDays(weekOffset)[0]); // segunda da semana alvo
    }
  }, [weekOffset]);

  // Mantém o modal sincronizado caso os dados em cache mudem em background
  useEffect(() => {
    if (!selectedPedidoRef.current) return;
    const pedidosDaSemanaAtual = cacheSemanas[chavePeriodoAtual] || [];
    const atualizado = pedidosDaSemanaAtual.find(p => p.id === selectedPedidoRef.current!.id) ||
      pedidosHoje.find(p => p.id === selectedPedidoRef.current!.id);
    if (atualizado) setSelectedPedido(atualizado);
  }, [cacheSemanas, pedidosHoje, chavePeriodoAtual]);

  // Seleciona os dados da semana atual a partir do cache para renderizar o calendário
  const pedidosSemanaAtual = cacheSemanas[chavePeriodoAtual] || [];

  // Dados dos cards fixos de HOJE
  const pedidosHojePC = pedidosHoje.filter(p => p.tipo === 'COMPUTADOR');
  const pedidosHojeSala = pedidosHoje.filter(p => p.tipo === 'SALA');

  // Status de uso em tempo real (baseado sempre em HOJE)
  const emUsoPC = pedidosHoje
    .filter(p => p.tipo === 'COMPUTADOR')
    .flatMap(p => p.reservasComputador ?? [])
    .filter(r => r.status === 'EM_ANDAMENTO')
    .length;

  const emUsoSala = pedidosHoje
    .filter(p => p.tipo === 'SALA')
    .flatMap(p => p.reservasSala ?? [])
    .filter(r => r.status === 'EM_ANDAMENTO')
    .length;

  const totalPcsAtivos = allPcs.filter(p => p.ativo).length;
  const totalSalasAtivas = allSalas.filter(s => s.ativo).length;

  const pcsEmUso = pedidosHoje
    .filter(p => p.tipo === 'COMPUTADOR')
    .flatMap(p => p.reservasComputador ?? [])
    .filter(r => r.status === 'EM_ANDAMENTO')
    .map(r => r.computador?.codigo ?? '—');

  const salasEmUso = pedidosHoje
    .filter(p => p.tipo === 'SALA')
    .flatMap(p => p.reservasSala ?? [])
    .filter(r => r.status === 'EM_ANDAMENTO')
    .map(r => r.sala?.nome ?? '—');

  // Filtra as linhas do dia selecionado consumindo a lista armazenada no cache
  const pedidosDiaFiltrados = useMemo(() => {
    return pedidosSemanaAtual
      .filter(p => isSameDay(new Date(p.inicioPrevisto), selectedDay))
      .filter(p => filtroSemana === 'todos' || p.tipo === filtroSemana)
      .sort((a, b) => new Date(a.inicioPrevisto).getTime() - new Date(b.inicioPrevisto).getTime());
  }, [pedidosSemanaAtual, selectedDay, filtroSemana]);

  const todayStr = formatLocalDateISO(today);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Painel Administrativo</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Visão geral do sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/usuario/reservar"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-secondary)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Reserva
          </Link>
          <button
            onClick={() => router.push('/dashboard/admin/aprovacoes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${pendentes.length > 0
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
      </div>

      {/* Cards de hoje - Fixos */}
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
          <p className="text-2xl font-bold text-blue-600">{loadingGlobal ? '—' : pedidosHojePC.length}</p>
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
          <p className="text-2xl font-bold text-violet-600">{loadingGlobal ? '—' : pedidosHojeSala.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Reservas de Sala hoje</p>
          <p className="text-xs text-violet-500 mt-0.5 font-medium">Ver todas →</p>
        </button>
      </div>

      {/* Em uso agora - Fixo */}
      <div>
        <h2 className="section-title mb-3">Em uso agora</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* PCs em uso */}
          <div className="card p-5 cursor-pointer select-none" onClick={() => setExpandEmUso(expandEmUso === 'pc' ? null : 'pc')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">Computadores em uso</span>
              </div>
              <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expandEmUso === 'pc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-[var(--text-primary)]">{loadingGlobal ? '—' : emUsoPC}</span>
              <span className="text-xl text-[var(--text-muted)] mb-1">/ {loadingGlobal ? '—' : totalPcsAtivos}</span>
            </div>
            {!loadingGlobal && totalPcsAtivos > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${(emUsoPC / totalPcsAtivos) * 100}%` }} />
              </div>
            )}
            {expandEmUso === 'pc' && !loadingGlobal && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
                {pcsEmUso.length === 0
                  ? <p className="text-xs text-[var(--text-muted)]">Nenhum computador em uso</p>
                  : pcsEmUso.map((cod, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {cod}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
          {/* Salas em uso */}
          <div className="card p-5 cursor-pointer select-none" onClick={() => setExpandEmUso(expandEmUso === 'sala' ? null : 'sala')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">Salas em uso</span>
              </div>
              <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expandEmUso === 'sala' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-[var(--text-primary)]">{loadingGlobal ? '—' : emUsoSala}</span>
              <span className="text-xl text-[var(--text-muted)] mb-1">/ {loadingGlobal ? '—' : totalSalasAtivas}</span>
            </div>
            {!loadingGlobal && totalSalasAtivas > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${(emUsoSala / totalSalasAtivas) * 100}%` }} />
              </div>
            )}
            {expandEmUso === 'sala' && !loadingGlobal && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
                {salasEmUso.length === 0
                  ? <p className="text-xs text-[var(--text-muted)]">Nenhuma sala em uso</p>
                  : salasEmUso.map((nome, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {nome}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendário semanal com mecanismo de cache */}
      <div>
        <h2 className="section-title mb-4">Reservas da Semana</h2>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => setWeekOffset(0)}
              className="text-xs font-medium text-blue-600 hover:underline underline-offset-2">
              {weekOffset === 0 ? 'Semana atual' : weekDays[0].toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-5 border-b border-[var(--border)]">
            {weekDaysDisplay.map((day, i) => {
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);

              const dp = pedidosSemanaAtual.filter(p => p.tipo === 'COMPUTADOR' && isSameDay(new Date(p.inicioPrevisto), day)).length;
              const ds = pedidosSemanaAtual.filter(p => p.tipo === 'SALA' && isSameDay(new Date(p.inicioPrevisto), day)).length;
              const temCheckinPendente = pedidosSemanaAtual.some(p => isSameDay(new Date(p.inicioPrevisto), day) && (p.naJanelaCheckin ?? false));

              return (
                <button key={i} onClick={() => setSelectedDay(day)}
                  className={`p-3 text-center transition-colors hover:bg-[var(--surface-2)] ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600' : ''}`}>
                  <p className={`text-xs font-medium ${isSelected ? 'text-blue-600' : 'text-[var(--text-muted)]'}`}>
                    {dayNames[day.getDay()]}
                  </p>
                  <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-blue-600' : isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--text-primary)]'}`}>
                    {day.getDate()}
                  </p>
                  <div className="flex justify-center gap-1 mt-1">
                    {dp > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />}
                    {ds > 0 && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />}
                    {temCheckinPendente && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-pulse" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                {formatDate(selectedDay.toISOString())}
              </p>
              <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-lg">
                {(['todos', 'COMPUTADOR', 'SALA'] as FiltroTipo[]).map(f => (
                  <button key={f} onClick={() => setFiltroSemana(f)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${filtroSemana === f
                      ? 'bg-white dark:bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}>
                    {f === 'todos' ? 'Todos' : f === 'COMPUTADOR' ? 'PC' : 'Sala'}
                  </button>
                ))}
              </div>
            </div>

            {loadingCalendario ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg shimmer" />)}</div>
            ) : pedidosDiaFiltrados.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">Nenhuma reserva neste dia</p>
            ) : (
              <div className="space-y-2">
                {pedidosDiaFiltrados.map(p => {
                  const isPc = p.tipo === 'COMPUTADOR';
                  const qtd = isPc ? p.reservasComputador?.length ?? 0 : p.reservasSala?.length ?? 0;
                  const nomeItem = isPc ? `${qtd} computador${qtd !== 1 ? 'es' : ''}` : `${qtd} sala${qtd !== 1 ? 's' : ''}`;
                  const checkinPendente = p.naJanelaCheckin ?? false;

                  const primeiraReserva = isPc
                    ? p.reservasComputador?.[0]
                    : p.reservasSala?.[0];

                  const fimExibido = primeiraReserva?.checkoutEm
                    ? formatTime(primeiraReserva.checkoutEm)
                    : formatTime(p.fimPrevisto);

                  return (
                    <button key={p.id} onClick={() => setSelectedPedido(p)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors gap-3 text-left ${checkinPendente
                        ? 'bg-amber-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/20'
                        : 'bg-[var(--surface-2)] hover:bg-[var(--border)]'
                        }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${isPc
                          ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
                          : 'text-violet-600 bg-violet-100 dark:bg-violet-900/30'
                          }`}>
                          {isPc ? 'PC' : 'SALA'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{nomeItem}</p>
                          <p className="text-xs text-[var(--text-muted)]">{p.usuario?.nome}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-xs text-[var(--text-muted)] font-mono">
                          {formatTime(p.inicioPrevisto)} → {fimExibido}
                        </p>
                        {checkinPendente
                          ? <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">Aguard. check-in</span>
                          : <StatusBadge status={p.status} />
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPedido && (
        <PedidoDetailModal
          pedido={selectedPedido}
          aprovacoes={pendentes}
          onClose={() => setSelectedPedido(null)}
          onRefresh={() => fetchAll(true)}
        />
      )}
    </div>
  );
}