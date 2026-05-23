'use client';

import { useEffect, useState } from 'react';
import { usuarios as usuariosApi, auth } from '@/lib/api';
import { Usuario } from '@/types';
import { formatDate } from '@/lib/utils';
import { maskCpf, maskTel } from '@/lib/utils';
import { Modal } from '@/app/components/ui/Modal';
import { Alert } from '@/app/components/ui/ErrorAlert';
import { ActiveBadge } from '@/app/components/ui/ActiveBadge';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { SaveButton } from '@/app/components/ui/SaveButton';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { useConfirm } from '@/app/hooks/useConfirm';
import { LoadingList } from '@/app/components/ui/LoadingList';

interface CadastroForm {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  senha: string;
}

interface Stats {
  total: number;
  ativos: number;
  cadastradosNaSemana: number;
}

const emptyForm = (): CadastroForm => ({ nome: '', email: '', cpf: '', telefone: '', senha: '' });


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
            <span className="font-mono text-[var(--text-primary)]">{maskCpf(usuario.cpf)}</span>
          </div>
          {usuario.telefone && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Telefone</span>
              <span className="text-[var(--text-primary)]">{maskTel(usuario.telefone)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Cadastro</span>
            <span className="text-[var(--text-primary)]">{formatDate(usuario.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Status</span>
            <ActiveBadge ativo={usuario.ativo} />
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
        telefone: form.telefone ? form.telefone.replace(/\D/g, '') : undefined,
      });
      await onSucesso();
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
        <Alert message={error} />
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <SaveButton saving={saving} onClick={handleSalvar} />
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
    <Modal title="Cadastrar Usuário" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <input type="password" className="input-field" placeholder="Mínimo 8 caracteres" required
            minLength={8} value={form.senha} onChange={e => set('senha', e.target.value)} />
        </div>
        <Alert message={error} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <SaveButton saving={saving} type="submit" label="Cadastrar" />
        </div>
      </form>
    </Modal>
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const { openConfirm, confirmModal } = useConfirm();

  // Carrega stats ao montar
  useEffect(() => {
    usuariosApi.stats().then(setStats).catch(console.error);
  }, []);

  // Busca usuários conforme pesquisa
  useEffect(() => {
    if (!search.trim()) { setList([]); return; }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        setList(await usuariosApi.buscarPorTermo(search.trim()));
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
      }
      setLoading(false);
    }, 350); // debounce

    return () => clearTimeout(timeout);
  }, [search]);

  const refreshBusca = async () => {
    if (search.trim()) {
      setLoading(true);
      try {
        setList(await usuariosApi.buscarPorTermo(search.trim()));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    // Atualiza stats também
    usuariosApi.stats().then(setStats).catch(console.error);
  };

  const handleDesativar = (u: Usuario) => {
    openConfirm({
      title: 'Desativar usuário',
      message: `Desativar "${u.email}"? O usuário não conseguirá mais acessar o sistema.`,
      confirmLabel: 'Desativar',
      confirmStyle: 'danger',
      onConfirm: async () => {
        await usuariosApi.deletar(u.id);
        await refreshBusca();
        setModal(null);
      },
    });
  };

  const handleAtivar = (u: Usuario) => {
    openConfirm({
      title: 'Ativar usuário',
      message: `Ativar "${u.email}"?`,
      confirmLabel: 'Ativar',
      confirmStyle: 'success',
      onConfirm: async () => {
        await usuariosApi.ativar(u.id);
        await refreshBusca();
        setModal(null);
      },
    });
  };

  const subtitle = stats
    ? `${stats.total} total · ${stats.cadastradosNaSemana} esta semana`
    : '—';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Gerenciar Usuários"
        subtitle={subtitle}
        buttonLabel="Novo Usuário"
        onButtonClick={() => setModal({ tipo: 'cadastro' })}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome, email ou CPF..."
      />

      {loading ? (
        <LoadingList items={3} />
      ) : !search.trim() ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-secondary)]">Digite o nome, email ou CPF para buscar por um usuário</p>
        </div>
      ) : list.length === 0 ? (
        <EmptyState message="Nenhum usuário encontrado" />
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {list.map(u => (
            <div key={u.id} onClick={() => setModal({ tipo: 'detalhes', usuario: u })}
              className={`flex items-center justify-between px-5 py-4 gap-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors ${!u.ativo ? 'opacity-50' : ''}`}>

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

              <div className="flex items-center gap-3 shrink-0">
                <ActiveBadge ativo={u.ativo} />
                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
          <div className="px-5 py-2 text-xs text-[var(--text-muted)]">
            {list.length} resultado{list.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {modal?.tipo === 'cadastro' && (
        <CadastroModal
          onClose={() => setModal(null)}
          onSucesso={() => { refreshBusca(); setModal(null); }}
        />
      )}

      {modal?.tipo === 'detalhes' && (
        <DetalhesModal
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onEditar={() => setModal({ tipo: 'editar', usuario: modal.usuario })}
          onDesativar={() => handleDesativar(modal.usuario)}
          onAtivar={() => handleAtivar(modal.usuario)}
        />
      )}

      {modal?.tipo === 'editar' && (
        <EditarModal
          usuario={modal.usuario}
          onClose={() => setModal({ tipo: 'detalhes', usuario: modal.usuario })}
          onSucesso={refreshBusca}
        />
      )}

      {confirmModal}
    </div>
  );
}