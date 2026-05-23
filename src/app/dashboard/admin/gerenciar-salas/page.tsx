'use client';

import { useEffect, useState } from 'react';
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


export default function GerenciarSalasPage() {
  const [list, setList] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  type ModalState =
    | { tipo: 'criar' }
    | { tipo: 'editar'; sala: Sala }
    | null;

  const [modal, setModal] = useState<ModalState>(null);

  const [form, setForm] = useState<SalaDTO>({ nome: '', capacidadePessoas: 5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { openConfirm, confirmModal } = useConfirm();

  const loadList = async () => {
    setLoading(true);
    try {
      setList(await salasApi.listarTodas());
    } catch (err) { console.error(err); }
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

  const filtered = list.filter(s =>
    !search || s.nome.toLowerCase().includes(search.toLowerCase())
  );

  const ativas = filtered.filter(s => s.ativo);
  const inativas = filtered.filter(s => !s.ativo);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Gerenciar Salas"
        subtitle={`${ativas.length} ativa${ativas.length !== 1 ? 's' : ''} · ${inativas.length} inativa${inativas.length !== 1 ? 's' : ''}`}
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
          {[...ativas, ...inativas].map(sala => (
            <div
              key={sala.id}
              className={`flex items-center justify-between px-5 py-4 gap-3 transition-opacity ${!sala.ativo ? 'opacity-50' : ''
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <span className="text-violet-600 dark:text-violet-400 text-lg">🏫</span>
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{sala.nome}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Cap. {sala.capacidadePessoas} pessoas ·{' '}
                    <ActiveBadge ativo={sala.ativo} genero="feminino" />
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => openEditar(sala)}>Editar</button>
                <button onClick={() => handleToggle(sala)}>...</button>
                <button onClick={() => handleDeletar(sala)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal
          title={modal.tipo === 'criar' ? 'Nova Sala' : `Editar — ${(modal as { tipo: 'editar'; sala: Sala }).sala.nome}`}
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
                  type="range" min={1} max={5}
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
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <SaveButton saving={saving} onClick={handleSave} disabled={!form.nome.trim()} />
            </div>
          </div>
        </Modal>
      )}
      {confirmModal}
    </div>
  );
}