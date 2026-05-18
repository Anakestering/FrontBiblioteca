'use client';

import { useEffect, useState } from 'react';
import { aprovacoes as aprovacaoApi } from '@/lib/api';
import { AprovacaoReserva } from '@/types';
import { formatDate } from '@/lib/utils';
import { maskCpf, maskTel } from '@/lib/utils';

type FiltroTipo = 'todos' | 'COMPUTADOR' | 'SALA';

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Modal de detalhes ────────────────────────────────────────────────────────

function DetalheModal({ ap, onClose, onDecisao }: {
  ap: AprovacaoReserva;
  onClose: () => void;
  onDecisao: (id: number, acao: 'aprovar' | 'rejeitar', motivo?: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState('');
  const [acting, setActing] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [error, setError] = useState('');

  const pedido = ap.pedido;
  const isPC = pedido.tipo === 'COMPUTADOR';
  const itens = isPC
    ? pedido.reservasComputador.map(r => r.computador.codigo)
    : pedido.reservasSala.map(r => r.sala.nome);

  const handle = async (acao: 'aprovar' | 'rejeitar') => {
    setActing(acao);
    setError('');
    try {
      await onDecisao(ap.id, acao, motivo || undefined);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
      setActing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isPC
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
              {isPC ? 'COMPUTADOR' : 'SALA'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">

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
                <p className="text-xs text-[var(--text-muted)] font-mono">{maskCpf(pedido.usuario.cpf)}</p>
              </div>
            )}
            {pedido.usuario.telefone && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Telefone</p>
                <p className="text-xs text-[var(--text-muted)]">{maskTel(pedido.usuario.telefone)}</p>

              </div>
            )}
          </div>

          {/* Data, horário, pessoas, solicitado, obs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Data</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatDate(pedido.inicioPrevisto)}
              </p>
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
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Solicitado em</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatDate(ap.solicitadaEm)}
              </p>
            </div>
          </div>

          {pedido.observacao && (
            <div className="p-3 rounded-xl bg-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Observação</p>
              <p className="text-sm text-[var(--text-secondary)]">{pedido.observacao}</p>
            </div>
          )}

          {/* Motivo + botoes */}
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            <input
              type="text"
              className="input-field"
              placeholder="Motivo (opcional)"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => handle('rejeitar')}
                disabled={!!acting}
                className="btn-danger flex-1 flex items-center justify-center gap-2"
              >
                {acting === 'rejeitar'
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : '✕'}
                Rejeitar
              </button>
              <button
                onClick={() => handle('aprovar')}
                disabled={!!acting}
                className="btn-success flex-1 flex items-center justify-center gap-2"
              >
                {acting === 'aprovar'
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : '✓'}
                Aprovar
              </button>
            </div>
          </div>

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

// ─── Card de aprovação ────────────────────────────────────────────────────────

function AprovacaoCard({ ap, onClick }: {
  ap: AprovacaoReserva;
  onClick: () => void;
}) {
  const pedido = ap.pedido;
  const isPC = pedido.tipo === 'COMPUTADOR';
  const itens = isPC
    ? pedido.reservasComputador.map(r => r.computador.codigo).join(', ')
    : pedido.reservasSala.map(r => r.sala.nome).join(', ');
  const qtdItens = isPC
    ? pedido.reservasComputador.length
    : pedido.reservasSala.length;

  return (
    <div
      onClick={onClick}
      className="px-5 py-4 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Esquerda */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${isPC
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
              {isPC ? 'COMPUTADOR' : 'SALA'}
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {qtdItens} {isPC ? `computador${qtdItens !== 1 ? 'es' : ''}` : `sala${qtdItens !== 1 ? 's' : ''}`}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] truncate">{itens}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
            {pedido.usuario.nome} · {pedido.usuario.email}
          </p>
        </div>

        {/* Centro — horário e data */}
        <div className="shrink-0 text-center hidden sm:block">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatHora(pedido.inicioPrevisto)} → {formatHora(pedido.fimPrevisto)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {formatDate(pedido.inicioPrevisto)}
          </p>
        </div>

        {/* Direita */}
        <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AprovacoesPage() {
  const [list, setList] = useState<AprovacaoReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [selecionada, setSelecionada] = useState<AprovacaoReserva | null>(null);

  const loadList = async () => {
    setLoading(true);
    try { setList(await aprovacaoApi.pendentes()); }
    catch (_) { }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  const handleDecisao = async (id: number, acao: 'aprovar' | 'rejeitar', motivo?: string) => {
    if (acao === 'aprovar') await aprovacaoApi.aprovar(id, motivo);
    else await aprovacaoApi.rejeitar(id, motivo);
    await loadList();
  };

  const pcCount = list.filter(ap => ap.pedido.tipo === 'COMPUTADOR').length;
  const salaCount = list.filter(ap => ap.pedido.tipo === 'SALA').length;

  const listFiltrada = list.filter(ap =>
    filtroTipo === 'todos' || ap.pedido.tipo === filtroTipo
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="page-title">Aprovações Pendentes</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Mais de 3 computadores, mais de 1 sala ou mais de 3 blocos consecutivos requerem aprovação
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFiltroTipo('todos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroTipo === 'todos'
            ? 'bg-blue-600 text-white'
            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}
        >
          Todos ({list.length})
        </button>
        <button
          onClick={() => setFiltroTipo('COMPUTADOR')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroTipo === 'COMPUTADOR'
            ? 'bg-blue-600 text-white'
            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}
        >
          💻 Computadores ({pcCount})
        </button>
        <button
          onClick={() => setFiltroTipo('SALA')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroTipo === 'SALA'
            ? 'bg-violet-600 text-white'
            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}
        >
          🏫 Salas ({salaCount})
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl shimmer" />)}
        </div>
      ) : listFiltrada.length === 0 ? (
        <div className="card p-16 text-center">
          <svg className="w-12 h-12 text-emerald-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[var(--text-secondary)] font-medium">
            {list.length === 0 ? 'Tudo em dia!' : 'Nenhuma aprovação nesta categoria'}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {list.length === 0 ? 'Nenhuma reserva aguardando aprovação' : 'Tente selecionar outro filtro'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {listFiltrada.map(ap => (
            <AprovacaoCard key={ap.id} ap={ap} onClick={() => setSelecionada(ap)} />
          ))}
          <div className="px-5 py-2 text-xs text-[var(--text-muted)]">
            {listFiltrada.length} pendente{listFiltrada.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Modal */}
      {selecionada && (
        <DetalheModal
          ap={selecionada}
          onClose={() => setSelecionada(null)}
          onDecisao={handleDecisao}
        />
      )}
    </div>
  );
}