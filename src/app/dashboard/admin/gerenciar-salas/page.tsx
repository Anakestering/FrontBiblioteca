'use client';

import { useEffect, useState } from 'react';
import { salas as salasApi } from '@/lib/api';
import { Sala, SalaDTO } from '@/types';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function GerenciarSalasPage() {
  const [list, setList] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'criar' | Sala | null>(null);
  const [form, setForm] = useState<SalaDTO>({ nome: '', capacidadePessoas: 5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadList = async () => {
    setLoading(true);
    try {
      setList(await salasApi.listarTodas());
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  const openCriar = () => {
    setForm({ nome: '', capacidadePessoas: 5 });
    setError('');
    setModal('criar');
  };

  const openEditar = (sala: Sala) => {
    setForm({ nome: sala.nome, capacidadePessoas: sala.capacidadePessoas });
    setError('');
    setModal(sala);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (modal === 'criar') await salasApi.criar(form);
      else await salasApi.atualizar((modal as Sala).id, form);
      await loadList();
      setModal(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    }
    setSaving(false);
  };

  const handleToggle = async (sala: Sala) => {
    try {
      if (sala.ativo) await salasApi.desativar(sala.id);
      else await salasApi.ativar(sala.id);
      await loadList();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro');
    }
  };

  const handleDeletar = async (sala: Sala) => {
    if (!confirm(`Excluir permanentemente a sala "${sala.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await salasApi.deletar(sala.id);
      await loadList();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro');
    }
  };

  const filtered = list.filter(s =>
    !search || s.nome.toLowerCase().includes(search.toLowerCase())
  );

  const ativas = filtered.filter(s => s.ativo);
  const inativas = filtered.filter(s => !s.ativo);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Gerenciar Salas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {ativas.length} ativa{ativas.length !== 1 ? 's' : ''} · {inativas.length} inativa{inativas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCriar} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Sala
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input-field max-w-sm"
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-secondary)]">Nenhuma sala encontrada</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {[...ativas, ...inativas].map(sala => (
            <div
              key={sala.id}
              className={`flex items-center justify-between px-5 py-4 gap-3 transition-opacity ${
                !sala.ativo ? 'opacity-50' : ''
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
                    <span className={sala.ativo
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-rose-500 dark:text-rose-400'
                    }>
                      {sala.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditar(sala)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline underline-offset-2 px-2 py-1"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggle(sala)}
                  className={`text-sm hover:underline underline-offset-2 px-2 py-1 ${
                    sala.ativo
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {sala.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleDeletar(sala)}
                  className="text-sm text-rose-500 dark:text-rose-400 hover:underline underline-offset-2 px-2 py-1"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal
          title={modal === 'criar' ? 'Nova Sala' : `Editar — ${(modal as Sala).nome}`}
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

            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nome.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</>
                  : 'Salvar'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}