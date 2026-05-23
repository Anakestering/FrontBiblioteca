
'use client';

import { useEffect, useState, useMemo } from 'react';
import { salas as salasApi } from '@/lib/api';
import { Sala, SalaDTO } from '@/types';
import { Modal } from '@/app/components/ui/Modal';
import { Alert } from '@/app/components/ui/ErrorAlert';
import { ActiveBadge } from '@/app/components/ui/ActiveBadge';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingList } from '@/app/components/ui/LoadingList';
import { SaveButton } from '@/app/components/ui/SaveButton';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { useConfirm } from '@/app/hooks/useConfirm';

type ModalState =
  | { tipo: 'criar' }
  | { tipo: 'editar'; sala: Sala }
  | null;

export default function GerenciarSalasPage() {
  const [list, setList] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<SalaDTO>({ nome: '', capacidadePessoas: 5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { openConfirm, confirmModal } = useConfirm();

  const loadList = async () => {
    setLoading(true);
    try {
      setList(await salasApi.listarTodas());
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  const openCriar = () => {
    setForm({ nome: '', capacidadePessoas: 5 });
    setError('');
    setModal({ tipo: 'criar' });
  };

  const openEditar = (sala: Sala) => {
    setForm({ nome: sala.nome, capacidadePessoas: sala.capacidadePessoas });
    setError('');
    setModal({ tipo: 'editar', sala });
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (modal?.tipo === 'criar') await salasApi.criar(form);
      else if (modal?.tipo === 'editar') await salasApi.atualizar(modal.sala.id, form);
      await loadList();
      setModal(null);
    } catch (e: unknown) {
      console.error('Erro ao salvar sala:', e);
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    }
    setSaving(false);
  };

  const handleToggle = (sala: Sala) => {
    openConfirm({
      title: sala.ativo ? 'Desativar sala' : 'Ativar sala',
      message: sala.ativo
        ? `Desativar "${sala.nome}"? Ela não aparecerá para reservas.`
        : `Ativar "${sala.nome}"?`,
      confirmLabel: sala.ativo ? 'Desativar' : 'Ativar',
      confirmStyle: sala.ativo ? 'warning' : 'success',
      onConfirm: async () => {
        if (sala.ativo) await salasApi.desativar(sala.id);
        else await salasApi.ativar(sala.id);
        await loadList();
      },
    });
  };

  const handleDeletar = (sala: Sala) => {
    openConfirm({
      title: 'Excluir sala',
      message: `Excluir permanentemente "${sala.nome}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      confirmStyle: 'danger',
      onConfirm: async () => {
        await salasApi.deletar(sala.id);
        await loadList();
      },
    });
  };

  // ✅ OTIMIZAÇÃO: Filtros e contadores calculados de forma performática
  const { ativos, inativas, filtered } = useMemo(() => {
    const lowerSearch = search.toLowerCase().trim();
    const listaFiltrada = list.filter(s =>
      !lowerSearch || s.nome.toLowerCase().includes(lowerSearch)
    );

    return {
      filtered: listaFiltrada,
      ativos: listaFiltrada.filter(s => s.ativo),
      inativas: listaFiltrada.filter(s => !s.ativo)
    };
  }, [list, search]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Gerenciar Salas"
        subtitle={`${ativos.length} ativa${ativos.length !== 1 ? 's' : ''} · ${inativas.length} inativa${inativas.length !== 1 ? 's' : ''}`}
        buttonLabel="Nova Sala"
        onButtonClick={openCriar}
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome..." />

      {loading ? (
        <LoadingList />
      ) : filtered.length === 0 ? (
        <EmptyState message="Nenhuma sala encontrada" />
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {[...ativos, ...inativas].map(sala => (
            <div
              key={sala.id}
              className={`flex items-center justify-between px-5 py-4 gap-3 transition-colors ${
                !sala.ativo ? 'opacity-60 bg-[var(--bg-muted)]/20' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <span className="text-violet-600 dark:text-violet-400 text-lg">🏫</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">{sala.nome}</p>
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                    <span>Cap. {sala.capacidadePessoas} pessoas</span>
                    <span>·</span>
                    <ActiveBadge ativo={sala.ativo} genero="feminino" />
                  </p>
                </div>
              </div>

              {/* ✅ MELHORIA DE LAYOUT: Botões de ação elegantes na linha */}
              <div className="flex items-center gap-2 shrink-0 text-xs font-medium">
                <button 
                  onClick={() => openEditar(sala)}
                  className="px-2.5 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleToggle(sala)}
                  className={`px-2.5 py-1.5 rounded-md border transition-colors ${
                    sala.ativo 
                      ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-950/20' 
                      : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-900/30 dark:text-green-400 dark:hover:bg-green-950/20'
                  }`}
                >
                  {sala.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button 
                  onClick={() => handleDeletar(sala)}
                  className="px-2.5 py-1.5 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-950/20 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ CORREÇÃO DE TIPAGEM: Sem typecast forçado no Modal */}
      {(modal?.tipo === 'criar' || modal?.tipo === 'editar') && (
        <Modal
          title={modal.tipo === 'criar' ? 'Nova Sala' : `Editar — ${modal.sala.nome}`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Nome da sala</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Sala A"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Capacidade (máx. 5 pessoas)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" 
                  min={1} 
                  max={5}
                  value={form.capacidadePessoas}
                  onChange={e => setForm(f => ({ ...f, capacidadePessoas: Number(e.target.value) }))}
                  className="flex-1 accent-violet-600"
                />
                <span className="w-8 text-center font-bold text-[var(--text-primary)]">
                  {form.capacidadePessoas}
                </span>
              </div>
            </div>

            <Alert message={error} />

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
              {/* ✅ SEGURANÇA: Fallback de string segura no trim e trava durante loading */}
              <SaveButton 
                saving={saving} 
                onClick={handleSave} 
                disabled={!(form.nome ?? '').trim() || saving} 
              />
            </div>
          </div>
        </Modal>
      )}
      {confirmModal}
    </div>
  );
}