'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usuarios as usuariosApi } from '@/lib/api';
import { Usuario } from '@/types';

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

export default function PerfilPage() {
  const { user, logout } = useAuth();

  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Campos editáveis
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');

  // Troca de senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhas, setShowSenhas] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorPwd, setErrorPwd] = useState('');
  const [successPwd, setSuccessPwd] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const lista = await usuariosApi.listar();
        const me = lista.find((u: Usuario) => u.email === user?.email) ?? null;
        if (me) {
          setPerfil(me);
          setNome(me.nome ?? '');
          setEmail(me.email ?? '');
          setCpf(maskCpf(me.cpf ?? ''));
          setTelefone(maskTel(me.telefone ?? ''));
        }
      } catch (_) {}
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  const handleSalvar = async () => {
    if (!perfil) return;
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);
    try {
      await usuariosApi.atualizar(perfil.id, {
        nome,
        email,
        cpf: cpf.replace(/\D/g, ''),
        telefone: telefone ? telefone.replace(/\D/g, '') : undefined,
      });
      setSuccessMsg('Dados atualizados com sucesso!');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao salvar');
    }
    setSaving(false);
  };

  const handleSenha = async () => {
    setErrorPwd('');
    setSuccessPwd('');
    if (novaSenha.length < 6) {
      setErrorPwd('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErrorPwd('As senhas não coincidem.');
      return;
    }
    if (!perfil) return;
    setSavingPwd(true);
    try {
      await usuariosApi.atualizar(perfil.id, { senha: novaSenha } as never);
      setSuccessPwd('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setShowSenhas(false);
    } catch (e: unknown) {
      setErrorPwd(e instanceof Error ? e.message : 'Erro ao alterar senha');
    }
    setSavingPwd(false);
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="h-8 w-48 rounded-lg shimmer" />
      <div className="card p-6 space-y-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-10 rounded-lg shimmer" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="page-title">Meu Perfil</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Gerencie seus dados pessoais</p>
      </div>

      {/* Avatar + info rápida */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {(perfil?.nome ?? user?.email ?? '?')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate">{perfil?.nome ?? '—'}</p>
          <p className="text-sm text-[var(--text-muted)] truncate">{perfil?.email}</p>
          <span className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            user?.tipo === 'ADMIN'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
          }`}>
            {user?.tipo === 'ADMIN' ? 'Administrador' : 'Usuário'}
          </span>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Dados pessoais
        </h2>

        <div className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input
              className="input-field"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">CPF</label>
              <input
                className="input-field font-mono"
                value={cpf}
                onChange={e => setCpf(maskCpf(e.target.value))}
                maxLength={14}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                className="input-field"
                value={telefone}
                onChange={e => setTelefone(maskTel(e.target.value))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        {successMsg && (
          <div className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <p className="text-sm text-rose-600 dark:text-rose-400">{errorMsg}</p>
          </div>
        )}

        <button
          onClick={handleSalvar}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</>
            : 'Salvar alterações'}
        </button>
      </div>

      {/* Alterar senha */}
      <div className="card p-6 space-y-4">
        <button
          onClick={() => { setShowSenhas(v => !v); setErrorPwd(''); setSuccessPwd(''); }}
          className="w-full flex items-center justify-between group"
        >
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Alterar senha
          </h2>
          <svg
            className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showSenhas ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showSenhas && (
          <div className="space-y-4 pt-1">
            <div>
              <label className="label">Nova senha</label>
              <input
                type="password"
                className="input-field"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input
                type="password"
                className="input-field"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>

            {errorPwd && (
              <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <p className="text-sm text-rose-600 dark:text-rose-400">{errorPwd}</p>
              </div>
            )}
            {successPwd && (
              <div className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{successPwd}</p>
              </div>
            )}

            <button
              onClick={handleSenha}
              disabled={savingPwd}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {savingPwd
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</>
                : 'Alterar senha'}
            </button>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Encerrar sessão</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Você será redirecionado para o login</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </div>

    </div>
  );
}