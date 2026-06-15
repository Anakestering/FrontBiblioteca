'use client';

import { useEffect, useState, useCallback } from 'react';
import { usuarios as usuariosApi, auth } from '@/lib/api';
import { Usuario, TipoUsuario, UsuarioOutroInfo } from '@/types';
import { formatDate, maskCpf, maskTel } from '@/lib/utils';
import { Modal } from '@/app/components/ui/Modal';
import { Alert } from '@/app/components/ui/ErrorAlert';
import { ActiveBadge } from '@/app/components/ui/ActiveBadge';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { SaveButton } from '@/app/components/ui/SaveButton';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { useConfirm } from '@/app/hooks/useConfirm';
import { LoadingList } from '@/app/components/ui/LoadingList';

const TIPO_USUARIO_LABELS: Record<TipoUsuario, string> = {
  SENAI: 'Senai',
  SESI: 'Sesi',
  COLABORADOR: 'Colaborador',
  RESPONSAVEL: 'Responsável',
  OUTRO: 'Outro',
};

interface CadastroForm {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  senha: string;
  tipoUsuario: TipoUsuario;
  ondeConheceu: string;
  trabalha: boolean;
  ondeTrabalha: string;
}

interface Stats {
  total: number;
  ativos: number;
  cadastradosNaSemana: number;
}

const emptyForm = (): CadastroForm => ({
  nome: '', email: '', cpf: '', telefone: '', senha: '',
  tipoUsuario: 'SENAI',
  ondeConheceu: '',
  trabalha: false,
  ondeTrabalha: '',
});

// ─── MODAL DE DETALHES ────────────────────────────────────────────────────────
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
            <span className="font-medium text-[var(--text-primary)] break-all ml-2">{usuario.email}</span>
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
          {usuario.tipoUsuario && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Tipo</span>
              <span className="text-[var(--text-primary)]">{TIPO_USUARIO_LABELS[usuario.tipoUsuario]}</span>
            </div>
          )}
          {usuario.tipoUsuario === 'OUTRO' && usuario.outroInfo && (
            <>
              <div className="border-t border-[var(--border)]" />
              {usuario.outroInfo.ondeConheceu && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Onde conheceu</span>
                  <span className="text-[var(--text-primary)] ml-2 text-right">{usuario.outroInfo.ondeConheceu}</span>
                </div>
              )}
              {usuario.outroInfo.trabalha && usuario.outroInfo.ondeTrabalha && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Onde trabalha</span>
                  <span className="text-[var(--text-primary)] ml-2 text-right">{usuario.outroInfo.ondeTrabalha}</span>
                </div>
              )}
            </>
          )}
        </div>

        {usuario.nivelAcesso !== 'ADMIN' && (
          <div className="flex gap-2 pt-2">
            {usuario.ativo ? (
              <>
                <button
                  type="button"
                  onClick={onEditar}
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={onDesativar}
                  className="flex-1 h-10 rounded-lg border border-rose-300 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors"
                >
                  Desativar
                </button>
              </>
            ) : (
              <button
                type="button"
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

// ─── MODAL DE EDIÇÃO ──────────────────────────────────────────────────────────
interface EditarForm {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  tipoUsuario: TipoUsuario;
  ondeConheceu: string;
  trabalha: boolean;
  ondeTrabalha: string;
}

function EditarModal({ usuario, onClose, onSucesso }: {
  usuario: Usuario;
  onClose: () => void;
  onSucesso: (usuarioAtualizado: Usuario) => Promise<void>;
}) {
  const [form, setForm] = useState<EditarForm>({
    nome: usuario.nome,
    email: usuario.email,
    cpf: maskCpf(usuario.cpf ?? ''),
    telefone: maskTel(usuario.telefone ?? ''),
    tipoUsuario: usuario.tipoUsuario ?? 'SENAI',
    ondeConheceu: usuario.outroInfo?.ondeConheceu ?? '',
    trabalha: usuario.outroInfo?.trabalha ?? false,
    ondeTrabalha: usuario.outroInfo?.ondeTrabalha ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof EditarForm>(field: K, value: EditarForm[K]) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSalvar = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        email: form.email,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone ? form.telefone.replace(/\D/g, '') : undefined,
      };
      await usuariosApi.atualizar(usuario.id, payload);

      const outroInfo: UsuarioOutroInfo | undefined = form.tipoUsuario === 'OUTRO'
        ? {
            ondeConheceu: form.ondeConheceu || undefined,
            trabalha: form.trabalha,
            ondeTrabalha: form.trabalha ? form.ondeTrabalha || undefined : undefined,
          }
        : undefined;

      if (form.tipoUsuario !== (usuario.tipoUsuario ?? '') || form.tipoUsuario === 'OUTRO') {
        await usuariosApi.atualizarTipo(usuario.id, form.tipoUsuario, outroInfo);
      }

      const usuarioAtualizado: Usuario = {
        ...usuario,
        ...payload,
        tipoUsuario: form.tipoUsuario,
        outroInfo,
      };
      await onSucesso(usuarioAtualizado);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
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
              onChange={e => set('telefone', maskTel(e.target.value))} maxLength={15} />
          </div>
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" className="input-field" value={form.email}
            onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">Tipo de usuário</label>
          <select className="input-field" value={form.tipoUsuario}
            onChange={e => set('tipoUsuario', e.target.value as TipoUsuario)}>
            {(Object.keys(TIPO_USUARIO_LABELS) as TipoUsuario[]).map(tipo => (
              <option key={tipo} value={tipo}>{TIPO_USUARIO_LABELS[tipo]}</option>
            ))}
          </select>
        </div>
        {form.tipoUsuario === 'OUTRO' && (
          <div className="space-y-3 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
            <div>
              <label className="label">Onde conheceu a instituição?</label>
              <input className="input-field" value={form.ondeConheceu}
                onChange={e => set('ondeConheceu', e.target.value)} placeholder="Ex: indicação de amigo" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="editar-trabalha" checked={form.trabalha}
                onChange={e => set('trabalha', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] accent-blue-700" />
              <label htmlFor="editar-trabalha" className="text-sm text-[var(--text-primary)]">Trabalha?</label>
            </div>
            {form.trabalha && (
              <div>
                <label className="label">Onde trabalha?</label>
                <input className="input-field" value={form.ondeTrabalha}
                  onChange={e => set('ondeTrabalha', e.target.value)} placeholder="Nome da empresa" />
              </div>
            )}
          </div>
        )}
        <Alert message={error} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <SaveButton saving={saving} onClick={handleSalvar} />
        </div>
      </div>
    </Modal>
  );
}

// ─── MODAL DE CADASTRO ────────────────────────────────────────────────────────
function CadastroModal({ onClose, onSucesso }: { onClose: () => void; onSucesso: () => void }) {
  const [form, setForm] = useState<CadastroForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof CadastroForm>(field: K, value: CadastroForm[K]) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const outroInfo: UsuarioOutroInfo | undefined = form.tipoUsuario === 'OUTRO'
        ? {
            ondeConheceu: form.ondeConheceu || undefined,
            trabalha: form.trabalha,
            ondeTrabalha: form.trabalha ? form.ondeTrabalha || undefined : undefined,
          }
        : undefined;
      await auth.cadastrar({
        nome: form.nome,
        email: form.email,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone ? form.telefone.replace(/\D/g, '') : undefined,
        senha: form.senha,
        tipoUsuario: form.tipoUsuario,
        outroInfo,
      });
      onSucesso();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar');
    } finally {
      setSaving(false);
    }
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
              value={form.telefone} onChange={e => set('telefone', maskTel(e.target.value))} maxLength={15} />
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
        <div>
          <label className="label">Tipo de usuário</label>
          <select className="input-field" value={form.tipoUsuario} required
            onChange={e => set('tipoUsuario', e.target.value as TipoUsuario)}>
            {(Object.keys(TIPO_USUARIO_LABELS) as TipoUsuario[]).map(tipo => (
              <option key={tipo} value={tipo}>{TIPO_USUARIO_LABELS[tipo]}</option>
            ))}
          </select>
        </div>
        {form.tipoUsuario === 'OUTRO' && (
          <div className="space-y-3 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
            <div>
              <label className="label">Onde conheceu a instituição?</label>
              <input className="input-field" value={form.ondeConheceu}
                onChange={e => set('ondeConheceu', e.target.value)} placeholder="Ex: indicação de amigo" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cadastro-trabalha" checked={form.trabalha}
                onChange={e => set('trabalha', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] accent-blue-700" />
              <label htmlFor="cadastro-trabalha" className="text-sm text-[var(--text-primary)]">Trabalha?</label>
            </div>
            {form.trabalha && (
              <div>
                <label className="label">Onde trabalha?</label>
                <input className="input-field" value={form.ondeTrabalha}
                  onChange={e => set('ondeTrabalha', e.target.value)} placeholder="Nome da empresa" />
              </div>
            )}
          </div>
        )}
        <Alert message={error} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <SaveButton saving={saving} type="submit" label="Cadastrar" />
        </div>
      </form>
    </Modal>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
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
  const [filtroTipo, setFiltroTipo] = useState<TipoUsuario | ''>('');
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('ativos');
  const [modal, setModal] = useState<ModalState>(null);
  const { openConfirm, confirmModal } = useConfirm();

  // Função encapsulada em useCallback para evitar loops de renderização
  const fetchUsuarios = useCallback(async (termoBusca: string) => {
    setLoading(true);
    try {
      // Se não houver termo, você pode chamar um usuariosApi.listarTodos() se o seu back-end aceitar
      const dados = termoBusca.trim() 
        ? await usuariosApi.buscarPorTermo(termoBusca.trim())
        : await usuariosApi.buscarPorTermo(""); // Ou api de listagem geral
      setList(dados);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega estatísticas iniciais
  useEffect(() => {
    usuariosApi.stats().then(setStats).catch(console.error);
    fetchUsuarios(''); // Busca inicial sem filtros ao montar o componente
  }, [fetchUsuarios]);

  // Efeito do Debounce para a barra de pesquisa
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsuarios(search);
    }, 350);

    return () => clearTimeout(timeout);
  }, [search, fetchUsuarios]);

  const handleDesativar = (u: Usuario) => {
    openConfirm({
      title: 'Desativar usuário',
      message: `Desativar "${u.email}"? O usuário não conseguirá mais acessar o sistema.`,
      confirmLabel: 'Desativar',
      confirmStyle: 'danger',
      onConfirm: async () => {
        await usuariosApi.deletar(u.id);
        await fetchUsuarios(search);
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
        await fetchUsuarios(search);
        setModal(null);
      },
    });
  };

  const subtitle = stats
    ? `${stats.total} total · ${stats.cadastradosNaSemana} esta semana`
    : '—';

  const listaFiltrada = list
    .filter(u => !filtroTipo || u.tipoUsuario === filtroTipo)
    .filter(u => filtroAtivo === 'todos' ? true : filtroAtivo === 'ativos' ? u.ativo : !u.ativo);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Gerenciar Usuários"
        subtitle={subtitle}
        buttonLabel="Novo Usuário"
        onButtonClick={() => setModal({ tipo: 'cadastro' })}
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome, email ou CPF..."
          />
        </div>
        <select
          className="input-field w-32 shrink-0 text-sm"
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value as TipoUsuario | '')}
        >
          <option value="">Todos</option>
          {(Object.keys(TIPO_USUARIO_LABELS) as TipoUsuario[]).map(tipo => (
            <option key={tipo} value={tipo}>{TIPO_USUARIO_LABELS[tipo]}</option>
          ))}
        </select>
        <select
          className="input-field w-28 shrink-0 text-sm"
          value={filtroAtivo}
          onChange={e => setFiltroAtivo(e.target.value as 'todos' | 'ativos' | 'inativos')}
        >
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {loading ? (
        <LoadingList items={3} />
      ) : listaFiltrada.length === 0 ? (
        <EmptyState message={search.trim() ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado no sistema"} />
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {listaFiltrada.map(u => (
            <div key={u.id} onClick={() => setModal({ tipo: 'detalhes', usuario: u })}
              className={`flex items-center justify-between px-5 py-4 gap-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors ${!u.ativo ? 'opacity-50' : ''}`}>

              <div className="flex items-start gap-8 min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[var(--text-muted)]">Nome</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] break-words leading-snug">
                    {u.nome}
                  </p>
                </div>
                {u.tipoUsuario && (
                  <div className="shrink-0 w-24 hidden sm:block">
                    <p className="text-xs text-[var(--text-muted)]">Tipo</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {TIPO_USUARIO_LABELS[u.tipoUsuario]}
                    </p>
                  </div>
                )}
                <div className="shrink-0 w-32 hidden sm:block">
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
            {listaFiltrada.length} resultado{listaFiltrada.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {modal?.tipo === 'cadastro' && (
        <CadastroModal
          onClose={() => setModal(null)}
          onSucesso={() => { fetchUsuarios(search); }}
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
          onSucesso={async (usuarioAtualizado) => {
            await fetchUsuarios(search);
            // Reabre o modal de detalhes já com as informações alteradas!
            setModal({ tipo: 'detalhes', usuario: usuarioAtualizado });
          }}
        />
      )}

      {confirmModal}
    </div>
  );
}