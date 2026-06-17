'use client';

import { useEffect, useState, useMemo } from 'react';
// Importamos pedidos para usar a nova busca inteligente do servidor
import { aprovacoes as aprovacaoApi, pedidos as pedidosApi } from '@/lib/api';
import { AprovacaoReserva } from '@/types';
import { formatDate, maskCpf, maskTel } from '@/lib/utils';
import { Alert } from '@/app/components/ui/ErrorAlert';
import { LoadingList } from '@/app/components/ui/LoadingList';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Modal } from '@/app/components/ui/Modal';

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
      console.error('Erro ao processar aprovação:', e);
      setError(e instanceof Error ? e.message : 'Erro ao processar decisão');
      setActing(null);
    }
  };

  return (
    <Modal
      title={
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isPC
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
          {isPC ? 'COMPUTADOR' : 'SALA'}
        </span>
      }
      onClose={onClose}
    >
      <div className="space-y-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">Nome</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{pedido.usuario.nome}</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">E-mail</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{pedido.usuario.email}</p>
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

        {/* Detalhes do horário */}
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
          <div className="p-3 rounded-xl bg-[var(--surface-2)] break-words">
            <p className="text-xs text-[var(--text-muted)] mb-1">Observação</p>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{pedido.observacao}</p>
          </div>
        )}

        {/* Decisão */}
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          <input
            type="text"
            className="input-field"
            placeholder="Motivo da decisão administrativo (opcional)"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={() => handle('rejeitar')}
              disabled={!!acting}
              className="btn-danger flex-1 h-10 flex items-center justify-center gap-2"
            >
              {acting === 'rejeitar'
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : '✕'}
              Rejeitar
            </button>
            <button
              onClick={() => handle('aprovar')}
              disabled={!!acting}
              className="btn-success flex-1 h-10 flex items-center justify-center gap-2"
            >
              {acting === 'aprovar'
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : '✓'}
              Aprovar
            </button>
          </div>
        </div>

        <Alert message={error} />
      </div>
    </Modal>
  );
}

// ─── Card de aprovação ────────────────────────────────────────────────────────

function AprovacaoCard({ ap, onClick }: { ap: AprovacaoReserva; onClick: () => void }) {
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
            {pedido.usuario.nome} · <span className="font-mono">{pedido.usuario.email}</span>
          </p>
        </div>

        <div className="shrink-0 text-center hidden sm:block">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatHora(pedido.inicioPrevisto)} → {formatHora(pedido.fimPrevisto)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {formatDate(pedido.inicioPrevisto)}
          </p>
        </div>

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
  const [search, setSearch] = useState(''); // <-- Novo estado para a busca por texto
  const [selecionada, setSelecionada] = useState<AprovacaoReserva | null>(null);

  const loadList = async () => {
    setLoading(true);
    try {
      // 1. Buscamos os pedidos filtrados direto do back-end (Ignorando datas, focando no status e no texto)
      const pedidosPendentes = await pedidosApi.filtrar({
        status: 'PENDENTE_APROVACAO',
        busca: search.trim() || undefined
      });

      // 2. Buscamos a lista base de aprovações do sistema
      const aprovacoesPendentes = await aprovacaoApi.pendentes();

      // Cruzamos os dados para garantir que só listamos os objetos 'AprovacaoReserva' 
      // cujo Pedido passou no filtro de busca por texto do servidor
      const listaFiltradaPeloBanco = aprovacoesPendentes.filter(ap => 
        pedidosPendentes.some(p => p.id === ap.pedido.id)
      );

      setList(listaFiltradaPeloBanco);
    } catch (err) {
      console.error('Erro ao carregar aprovações:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dispara a busca no banco sempre que o usuário digitar na busca
  useEffect(() => { 
    loadList(); 
  }, [search]);

  const handleDecisao = async (id: number, acao: 'aprovar' | 'rejeitar', motivo?: string) => {
    if (acao === 'aprovar') await aprovacaoApi.aprovar(id, motivo);
    else await aprovacaoApi.rejeitar(id, motivo);
    await loadList();
  };

  const { pcCount, salaCount } = useMemo(() => {
    return {
      pcCount: list.filter(ap => ap.pedido.tipo === 'COMPUTADOR').length,
      salaCount: list.filter(ap => ap.pedido.tipo === 'SALA').length
    };
  }, [list]);

  const listFiltrada = useMemo(() => {
    return list.filter(ap => filtroTipo === 'todos' || ap.pedido.tipo === filtroTipo);
  }, [list, filtroTipo]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Aprovações Pendentes</h1>
      </div>

      {/* Filtros e Barra de Pesquisa */}
      <div className="space-y-3">
        <input 
          type="text"
          placeholder="Buscar pendentes por usuário, e-mail, PC ou sala..."
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="input-field w-full sm:max-w-md" 
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroTipo('todos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroTipo === 'todos'
              ? 'bg-violet-600 text-white'
              : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}
          >
            Todos ({list.length})
          </button>
          <button
            onClick={() => setFiltroTipo('COMPUTADOR')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroTipo === 'COMPUTADOR'
              ? 'bg-violet-600 text-white'
              : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}
          >
            Computadores ({pcCount})
          </button>
          <button
            onClick={() => setFiltroTipo('SALA')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroTipo === 'SALA'
              ? 'bg-violet-600 text-white'
              : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}
          >
            Salas ({salaCount})
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <LoadingList items={3} height="h-20" />
      ) : listFiltrada.length === 0 ? (
        <EmptyState message={search ? "Nenhum pedido pendente corresponde à busca" : "Nenhuma reserva aguardando aprovação"} />
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {listFiltrada.map(ap => (
            <AprovacaoCard key={ap.id} ap={ap} onClick={() => setSelecionada(ap)} />
          ))}
          <div className="px-5 py-2.5 bg-[var(--bg-muted)]/10 text-xs text-[var(--text-muted)] font-medium">
            Mostrando {listFiltrada.length} pedido{listFiltrada.length !== 1 ? 's' : ''} encontrado{listFiltrada.length !== 1 ? 's' : ''}
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