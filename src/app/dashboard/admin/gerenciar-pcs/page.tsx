'use client';

import { useEffect, useState } from 'react';
import { computadores as computadoresApi } from '@/lib/api';

interface Computador {
  id: number;
  codigo: string;
  capacidadePessoas: number;
  observacao?: string;
  ativo: boolean;
}

interface ComputadorDTO {
  codigo: string;
  capacidadePessoas: number;
  observacao?: string;
}

// ─── Modal genérico ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
            <span className={`font-medium ${pc.ativo ? 'text-green-600 dark:text-green-400' : 'text-rose-500'}`}>
              {pc.ativo ? 'Ativo' : 'Inativo'}
            </span>
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

  const loadList = async () => {
    setLoading(true);
    try { setList(await computadoresApi.listarTodos()); } catch (_) { }
    setLoading(false);
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
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    }
    setSaving(false);
  };

  const handleToggle = async (pc: Computador) => {
    try {
      if (pc.ativo) await computadoresApi.desativar(pc.id);
      else await computadoresApi.ativar(pc.id);
      await loadList();
      setModal(null);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro'); }
  };

  const handleDeletar = async (pc: Computador) => {
    if (!confirm(`Excluir permanentemente "${pc.codigo}"? Esta ação não pode ser desfeita.`)) return;
    try { await computadoresApi.deletar(pc.id); await loadList(); setModal(null); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro'); }
  };

  const filtered = list.filter(p =>
    !search ||
    p.codigo.toLowerCase().includes(search.toLowerCase()) ||
    (p.observacao ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const ativos = filtered.filter(p => p.ativo);
  const inativos = filtered.filter(p => !p.ativo);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Gerenciar Computadores</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''} · {inativos.length} inativo{inativos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCriar} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Computador
        </button>
      </div>

      <input type="text" placeholder="Buscar por código..." value={search}
        onChange={e => setSearch(e.target.value)} className="input-field max-w-sm" />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-secondary)]">Nenhum computador encontrado</p>
        </div>
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
                  <span className="text-blue-600 dark:text-blue-400 text-lg">💻</span>
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
                    <span className={pc.ativo ? 'text-green-600 dark:text-green-400' : 'text-rose-500'}>
                      {pc.ativo ? 'Ativo' : 'Inativo'}
                    </span>
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
          title={modal.tipo === 'criar' ? 'Novo Computador' : `Editar — ${(modal as { tipo: 'editar'; pc: Computador }).pc.codigo}`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Código do computador</label>
              <input type="text" className="input-field font-mono" placeholder="Ex: PC-01"
                value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>

            <div>
              <label className="label">Capacidade (máx. 2 pessoas)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={2} value={form.capacidadePessoas}
                  onChange={e => setForm(f => ({ ...f, capacidadePessoas: Number(e.target.value) }))}
                  className="flex-1 accent-blue-600" />
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

            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.codigo.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</>
                  : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}