'use client';

import { useEffect, useState } from 'react';
import { usuarios as usuariosApi, auth } from '@/lib/api';
import { Usuario } from '@/types';
import { formatDate } from '@/lib/utils';

interface CadastroForm {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  senha: string;
}

const emptyForm = (): CadastroForm => ({ nome: '', email: '', cpf: '', telefone: '', senha: '' });

function maskCpf(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

function maskTel(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

// ─── Modal genérico ───────────────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-start px-6 py-4 border-b border-[var(--border)] gap-3">
          <h2 className="flex-1 min-w-0 text-lg font-semibold text-[var(--text-primary)] break-words leading-snug">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}


// ─── Modal de detalhes do usuário ─────────────────────────────────────────────
function DetalhesModal({ usuario, onClose, onEditar, onDesativar, onAtivar }: {
  usuario: Usuario;
  onClose: () => void;
  onEditar: () => void;
  onDesativar: () => void;
  onAtivar: () => void;
}) {
  return (
    <Modal title={usuario.nome} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">E-mail</span>
            <span className="font-medium text-[var(--text-primary)]">{usuario.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">CPF</span>
            <span className="font-mono text-[var(--text-primary)]">
              {maskCpf(usuario.cpf)}
            </span>
          </div>
          {usuario.telefone && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Telefone</span>
              <span className="text-[var(--text-primary)]">
                {maskTel(usuario.telefone)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Cadastro</span>
            <span className="text-[var(--text-primary)]">{formatDate(usuario.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Status</span>
            <span className={`font-medium ${usuario.ativo ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {usuario.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        {usuario.nivelAcesso !== 'ADMIN' && (
          <div className="flex gap-2 pt-2">
            {usuario.ativo ? (
              <>
                <button
                  onClick={onEditar}
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  Editar
                </button>

                <button
                  onClick={onDesativar}
                  className="flex-1 h-10 rounded-lg border border-rose-300 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors"
                >
                  Desativar
                </button>
              </>
            ) : (
              <button
                onClick={onAtivar}
                className="w-full h-10 rounded-lg border border-emerald-300 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors"
              >
                Ativar
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Modal de edição do usuário ───────────────────────────────────────────────
function EditarModal({ usuario, onClose, onSucesso }: {
  usuario: Usuario;
  onClose: () => void;
  onSucesso: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    nome: usuario.nome,
    email: usuario.email,
    cpf: maskCpf(usuario.cpf ?? ''),
    telefone: maskTel(usuario.telefone ?? ''),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSalvar = async () => {
    setError('');
    setSaving(true);

    try {
      await usuariosApi.atualizar(usuario.id, {
        nome: form.nome,
        email: form.email,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone
          ? form.telefone.replace(/\D/g, '')
          : undefined,
      });

      // Recarrega a lista
      await onSucesso();

      // Fecha o modal de edição
      // e reabre automaticamente o modal de detalhes atualizado
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    }

    setSaving(false);
  };

  return (
    <Modal title={`Editar — ${usuario.nome}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input className="input-field" value={form.nome} onChange={e => set('nome', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">CPF</label>
            <input className="input-field font-mono" value={form.cpf}
              onChange={e => set('cpf', maskCpf(e.target.value))} maxLength={14} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input-field" value={form.telefone}
              onChange={e => set('telefone', maskTel(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" className="input-field" value={form.email}
            onChange={e => set('email', e.target.value)} />
        </div>

        {error && (
          <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSalvar} disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal de cadastro ────────────────────────────────────────────────────────
function CadastroModal({ onClose, onSucesso }: { onClose: () => void; onSucesso: () => void }) {
  const [form, setForm] = useState<CadastroForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof CadastroForm, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await auth.cadastrar({
        nome: form.nome,
        email: form.email,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone ? form.telefone.replace(/\D/g, '') : undefined,
        senha: form.senha,
      });
      onSucesso();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Cadastrar Usuário</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input className="input-field" placeholder="Ex: João da Silva" required
              value={form.nome} onChange={e => set('nome', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">CPF</label>
              <input className="input-field" placeholder="000.000.000-00" required
                value={form.cpf} onChange={e => set('cpf', maskCpf(e.target.value))} maxLength={14} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input-field" placeholder="(00) 00000-0000"
                value={form.telefone} onChange={e => set('telefone', maskTel(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="label">E-mail</label>
            <input type="email" className="input-field" placeholder="email@exemplo.com" required
              value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Senha</label>
            <input type="password" className="input-field" placeholder="Mínimo 6 caracteres" required
              minLength={6} value={form.senha} onChange={e => set('senha', e.target.value)} />
          </div>
          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
type ModalState =
  | { tipo: 'detalhes'; usuario: Usuario }
  | { tipo: 'editar'; usuario: Usuario }
  | { tipo: 'cadastro' }
  | null;

export default function UsuariosAdminPage() {
  const [list, setList] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [aba, setAba] = useState<'ATIVOS' | 'INATIVOS'>('ATIVOS');

  const loadList = async () => {
    setLoading(true);
    try { setList(await usuariosApi.listar()); } catch (_) { }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  const handleDesativar = async (u: Usuario) => {
    if (!confirm(`Desativar usuário ${u.email}?`)) return;
    try { await usuariosApi.deletar(u.id); await loadList(); setModal(null); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro'); }
  };

  const filtered = list.filter(u => {
    // Normaliza o texto digitado
    const textoBusca = (search || '').trim().toLowerCase();
    const numerosBusca = (search || '').replace(/\D/g, '');

    // Campos do usuário protegidos contra null/undefined
    const nome = (u.nome || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const cpf = (u.cpf || '').replace(/\D/g, '');

    // Busca por nome, email ou CPF
    const correspondeBusca =
      textoBusca === '' ||
      nome.includes(textoBusca) ||
      email.includes(textoBusca) ||
      (numerosBusca !== '' && cpf.includes(numerosBusca));

    // Filtra pela aba selecionada
    const correspondeAba =
      aba === 'ATIVOS'
        ? u.ativo === true
        : u.ativo === false;

    return correspondeBusca && correspondeAba;
  });
  const ativos = list.filter(u => u.ativo).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Gerenciar Usuários</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {ativos} ativo{ativos !== 1 ? 's' : ''} · {list.length - ativos} inativo{(list.length - ativos) !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setModal({ tipo: 'cadastro' })} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Usuário
        </button>
      </div>

      <input type="text" placeholder="Buscar por nome, email ou CPF..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="input-field max-w-sm" />

      <div className="flex gap-2">
        <button
          onClick={() => setAba('ATIVOS')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === 'ATIVOS'
            ? 'bg-blue-600 text-white'
            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
            }`}
        >
          Ativos ({ativos})
        </button>

        <button
          onClick={() => setAba('INATIVOS')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === 'INATIVOS'
            ? 'bg-gray-600 text-white'
            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
            }`}
        >
          Inativos ({list.length - ativos})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-secondary)]">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {filtered.map(u => (
            <div key={u.id} onClick={() => setModal({ tipo: 'detalhes', usuario: u })}
              className={`flex items-center justify-between px-5 py-4 gap-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors ${!u.ativo ? 'opacity-50' : ''}`}>

              {/* Nome e CPF */}
              <div className="flex items-start gap-8 min-w-0 flex-1">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-muted)]">Nome</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] break-words leading-snug">
                    {u.nome}
                  </p>
                </div>
                <div className="shrink-0">
                  <p className="text-xs text-[var(--text-muted)]">CPF</p>
                  <p className="text-sm font-mono text-[var(--text-secondary)]">
                    {maskCpf(u.cpf)}
                  </p>
                </div>
              </div>

              {/* Status  */}
              <div className="flex items-center gap-3 shrink-0">
                <span className={`badge ${u.ativo
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
          <div className="px-5 py-2 text-xs text-[var(--text-muted)]">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {modal?.tipo === 'cadastro' && (
        <CadastroModal onClose={() => setModal(null)} onSucesso={loadList} />
      )}


      {modal?.tipo === 'detalhes' && (
        <DetalhesModal
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onEditar={() => setModal({ tipo: 'editar', usuario: modal.usuario })}  // 👈 simples agora
          onDesativar={() => handleDesativar(modal.usuario)}
          onAtivar={async () => {                                                 // 👈 handler separado
            await usuariosApi.ativar(modal.usuario.id);
            await loadList();
            setModal(null);
          }}
        />
      )}

      {modal?.tipo === 'editar' && (
        <EditarModal
          usuario={modal.usuario}
          onClose={() => setModal({ tipo: 'detalhes', usuario: modal.usuario })}
          onSucesso={loadList}
        />
      )}
    </div>
  );
}