'use client';

import { useEffect, useState, useMemo } from 'react';
import { computadores as computadoresApi } from '@/lib/api';
import { Computador, ComputadorDTO } from '@/types';
import { Modal } from '@/app/components/ui/Modal';
import { Alert } from '@/app/components/ui/ErrorAlert';
import { ActiveBadge } from '@/app/components/ui/ActiveBadge';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingList } from '@/app/components/ui/LoadingList';
import { SaveButton } from '@/app/components/ui/SaveButton';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { useConfirm } from '@/app/hooks/useConfirm';


// ─── Modal de detalhes do PC ──────────────────────────────────────────────────
function DetalhesModal({ pc, onClose, onEditar, onToggle, onDeletar }: {
  pc: Computador;
  onClose: () => void;
  onEditar: () => void;
  onToggle: () => void;
  onDeletar: () => void;
}) {
  return (
    <Modal title={pc.codigo} onClose={onClose}>
      <div className="space-y-4">
        {/* Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Status</span>
            <ActiveBadge ativo={pc.ativo} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Capacidade</span>
            <span className="font-medium text-[var(--text-primary)]">{pc.capacidadePessoas} pessoa{pc.capacidadePessoas !== 1 ? 's' : ''}</span>
          </div>
          {pc.observacao && (
            <div className="pt-2">
              <p className="text-xs text-[var(--text-muted)] mb-1">Observação</p>
              <p className="text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] rounded-lg p-3 leading-relaxed overflow-y-auto max-h-32 break-words whitespace-pre-wrap">
                {pc.observacao}
              </p>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onEditar}
            className="flex-1 h-10 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Editar
          </button>
          <button
            onClick={onToggle}
            className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${pc.ativo
              ? 'border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20'
              : 'border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20'
              }`}
          >
            {pc.ativo ? 'Desativar' : 'Ativar'}
          </button>
          <button
            onClick={onDeletar}
            className="flex-1 h-10 rounded-lg border border-rose-300 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
const emptyForm = (): ComputadorDTO => ({ codigo: '', capacidadePessoas: 2, observacao: '' });

type ModalState =
  | { tipo: 'criar' }
  | { tipo: 'editar'; pc: Computador }
  | { tipo: 'detalhes'; pc: Computador }
  | null;

export default function GerenciarComputadoresPage() {
  const [list, setList] = useState<Computador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<ComputadorDTO>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { openConfirm, confirmModal } = useConfirm();


  const loadList = async () => {
    setLoading(true);
    try {
      setList(await computadoresApi.listarTodos());
    } catch (err) {
      console.error('Erro ao carregar computadores:', err);
    }
    setLoading(false);
  };

  const handleToggle = (pc: Computador) => {
    openConfirm({
      title: pc.ativo ? 'Desativar computador' : 'Ativar computador',
      message: pc.ativo
        ? `Desativar "${pc.codigo}"? Ele não aparecerá para reservas.`
        : `Ativar "${pc.codigo}"?`,
      confirmLabel: pc.ativo ? 'Desativar' : 'Ativar',
      confirmStyle: pc.ativo ? 'warning' : 'success',
      onConfirm: async () => {
        if (pc.ativo) await computadoresApi.desativar(pc.id);
        else await computadoresApi.ativar(pc.id);
        await loadList();
        setModal(null);
      },
    });
  };

  const handleDeletar = (pc: Computador) => {
    openConfirm({
      title: 'Excluir computador',
      message: `Excluir permanentemente "${pc.codigo}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      confirmStyle: 'danger',
      onConfirm: async () => {
        await computadoresApi.deletar(pc.id);
        await loadList();
        setModal(null);
      },
    });
  };

  useEffect(() => { loadList(); }, []);

  const openCriar = () => { setForm(emptyForm()); setError(''); setModal({ tipo: 'criar' }); };

  const openEditar = (pc: Computador) => {
    setForm({ codigo: pc.codigo, capacidadePessoas: pc.capacidadePessoas, observacao: pc.observacao ?? '' });
    setError('');
    setModal({ tipo: 'editar', pc });
  };

  const openDetalhes = (pc: Computador) => setModal({ tipo: 'detalhes', pc });

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (modal?.tipo === 'criar') await computadoresApi.criar(form);
      else if (modal?.tipo === 'editar') await computadoresApi.atualizar(modal.pc.id, form);
      await loadList();
      setModal(null);
    } catch (e: unknown) {
      console.error('Erro ao salvar computador:', e);
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    }
    setSaving(false);
  };

  
  const { ativos, inativos, filtered } = useMemo(() => {
    const LowerSearch = search.toLowerCase().trim();
    const listaFiltrada = list.filter(p =>
      !LowerSearch ||
      p.codigo.toLowerCase().includes(LowerSearch) ||
      (p.observacao ?? '').toLowerCase().includes(LowerSearch)
    );
    
    return {
      filtered: listaFiltrada,
      ativos: listaFiltrada.filter(p => p.ativo),
      inativos: listaFiltrada.filter(p => !p.ativo)
    };
  }, [list, search]);


  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Gerenciar Computadores"
        subtitle={`${ativos.length} ativo${ativos.length !== 1 ? 's' : ''} · ${inativos.length} inativo${inativos.length !== 1 ? 's' : ''}`}
        buttonLabel="Novo Computador"
        onButtonClick={openCriar}
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." />

      {loading ? (
        <LoadingList />
      ) : filtered.length === 0 ? (
        <EmptyState message="Nenhum computador encontrado" />
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {[...ativos, ...inativos].map(pc => (
            <div
              key={pc.id}
              onClick={() => openDetalhes(pc)}
              className={`flex items-center justify-between px-5 py-4 gap-3 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors ${!pc.ativo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)] font-mono">{pc.codigo}</p>
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <span>Cap. {pc.capacidadePessoas}p</span>
                    {pc.observacao && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[160px]">{pc.observacao}</span>
                      </>
                    )}
                    <span>·</span>
                    <ActiveBadge ativo={pc.ativo} />
                  </p>
                </div>
              </div>

              <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}


        </div>

      )}

      {/* Modal detalhes */}
      {modal?.tipo === 'detalhes' && (
        <DetalhesModal
          pc={modal.pc}
          onClose={() => setModal(null)}
          onEditar={() => openEditar(modal.pc)}
          onToggle={() => handleToggle(modal.pc)}
          onDeletar={() => handleDeletar(modal.pc)}
        />
      )}

      {/* Modal criar/editar */}
      {(modal?.tipo === 'criar' || modal?.tipo === 'editar') && (
        <Modal
          title={modal.tipo === 'criar' ? 'Novo Computador' : `Editar — ${modal.pc.codigo}`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Código do computador</label>
              <input 
                type="text" 
                className="input-field font-mono" 
                placeholder="Ex: PC-01"
                value={form.codigo} 
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} 
              />
            </div>

            <div>
              <label className="label">Capacidade (máx. 2 pessoas)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min={1} 
                  max={2} 
                  value={form.capacidadePessoas}
                  onChange={e => setForm(f => ({ ...f, capacidadePessoas: Number(e.target.value) }))}
                  className="flex-1 accent-blue-600" 
                />
                <span className="w-8 text-center font-bold text-[var(--text-primary)]">{form.capacidadePessoas}</span>
              </div>
            </div>

            <div>
              <label className="label">
                Observação{' '}
                <span className="normal-case font-normal text-[var(--text-muted)]">(opcional)</span>
              </label>
              <textarea
                className="input-field resize-none pt-3"
                style={{ height: '80px' }}
                placeholder="Ex: Monitor duplo, fileira 3..."
                value={form.observacao ?? ''}
                onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              />
            </div>

            <Alert message={error} />

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancelar</button>
              {/* Proteção com Fallback para string idônea no trim() */}
              <SaveButton 
                saving={saving} 
                onClick={handleSave} 
                disabled={!(form.codigo ?? '').trim() || saving} 
              />
            </div>
          </div>
        </Modal>
      )}

      { confirmModal }
    </div>


  );
}