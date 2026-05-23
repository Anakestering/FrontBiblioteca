'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { usuarios as usuariosApi, auth as authApi } from '@/lib/api';
import { Usuario } from '@/types';
import { PasswordInput } from '@/app/components/ui/PasswordInput';
import { CodigoInput } from '@/app/components/ui/CodigoInput';
import { maskCpf, maskTel } from '@/lib/utils';



export default function PerfilPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');

  const [showSenhas, setShowSenhas] = useState(false);
  const [modoRecuperacao, setModoRecuperacao] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [codigo, setCodigo] = useState('');
  const [novaSenhaRec, setNovaSenhaRec] = useState('');
  const [confirmarSenhaRec, setConfirmarSenhaRec] = useState('');
  const [tempoRestante, setTempoRestante] = useState(0);
  const [tempoReenvio, setTempoReenvio] = useState(0);
  const [emailCodigoEnviado, setEmailCodigoEnviado] = useState('');

  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorPwd, setErrorPwd] = useState('');
  const [successPwd, setSuccessPwd] = useState('');

  const senhasNaoCoincidem = confirmarSenha.length > 0 && novaSenha !== confirmarSenha;
  const senhasRecNaoCoincidem = confirmarSenhaRec.length > 0 && novaSenhaRec !== confirmarSenhaRec;

  useEffect(() => {
    if (tempoRestante <= 0 && tempoReenvio <= 0) return;
    const interval = setInterval(() => {
      setTempoRestante(p => (p > 0 ? p - 1 : 0));
      setTempoReenvio(p => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [tempoRestante, tempoReenvio]);

  const formatarTempo = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    async function load() {
      try {
        const me = await usuariosApi.buscarMe();
        setPerfil(me);
        setNome(me.nome ?? '');
        setEmail(me.email ?? '');
        setCpf(maskCpf(me.cpf ?? ''));
        setTelefone(maskTel(me.telefone ?? ''));
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        setErrorMsg('Não foi possível carregar seus dados. Tente recarregar a página.');
      }
      finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user]);

  const handleSalvar = async () => {
    if (!perfil) return;
    setErrorMsg(''); setSuccessMsg('');
    setSaving(true);
    try {
      await usuariosApi.atualizar(perfil.id, {
        nome, email,
        cpf: cpf.replace(/\D/g, ''),
        telefone: telefone ? telefone.replace(/\D/g, '') : undefined,
      });
      setSuccessMsg('Dados atualizados com sucesso!');
    } catch (e: unknown) {
      console.error('Erro ao salvar:', e);
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao salvar');
    }
    setSaving(false);
  };

  const handleTrocarSenha = async () => {
    setErrorPwd(''); setSuccessPwd('');
    if (novaSenha.length < 8) { setErrorPwd('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (novaSenha !== confirmarSenha) { setErrorPwd('As senhas não coincidem.'); return; }
    setSavingPwd(true);
    try {
      await usuariosApi.trocarSenha({ senhaAtual, novaSenha });
      setSuccessPwd('Senha alterada com sucesso! Redirecionando...');
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha(''); setShowSenhas(false);
      setTimeout(() => { logout(); router.push('/login'); }, 2000);
    } catch (e: unknown) { 
      console.error('Erro ao alterar senha:', e);
      setErrorPwd(e instanceof Error ? e.message : 'Erro ao alterar senha'); }
    setSavingPwd(false);
  };

  const handleEsqueciSenha = async () => {
    if (!perfil?.email) return;
    setErrorPwd(''); setSuccessPwd('');
    try {
      const res = await authApi.solicitarRecuperacao({ email: perfil.email });
      setTempoRestante(Math.max(0, Math.floor((new Date(res.expiresAt).getTime() - Date.now()) / 1000)));

      setTempoReenvio(30);
      setEmailCodigoEnviado(perfil.email);
      setModoRecuperacao(true);
    } catch (e: unknown) { 
      console.error('Erro ao enviar codigo:', e);
      setErrorPwd(e instanceof Error ? e.message : 'Erro ao enviar código'); }
  };

  const handleConfirmarRecuperacao = async () => {
    setErrorPwd(''); setSuccessPwd('');
    if (codigo.length !== 8) { setErrorPwd('Código inválido.'); return; }
    if (novaSenhaRec.length < 8) { setErrorPwd('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (novaSenhaRec !== confirmarSenhaRec) { setErrorPwd('As senhas não coincidem.'); return; }
    if (!perfil?.email) return;
    setSavingPwd(true);
    try {
      await authApi.alterarSenha({ email: perfil.email, codigo, novaSenha: novaSenhaRec });
      setSuccessPwd('Senha alterada com sucesso! Redirecionando...');
      setCodigo(''); setNovaSenhaRec(''); setConfirmarSenhaRec(''); setModoRecuperacao(false); setShowSenhas(false);
      setTimeout(() => { logout(); router.push('/login'); }, 2000);
    } catch (e: unknown) { 
      console.error('Erro ao alterar senha:', e);
      setErrorPwd(e instanceof Error ? e.message : 'Erro ao alterar senha'); }
    setSavingPwd(false);
  };

  const resetSenhaState = () => {
    setModoRecuperacao(false);
    setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
    setCodigo(''); setNovaSenhaRec(''); setConfirmarSenhaRec('');
    setErrorPwd(''); setSuccessPwd(''); setTempoRestante(0); setTempoReenvio(0);
    setEmailCodigoEnviado('');
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
      <div>
        <h1 className="page-title">Meu Perfil</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Gerencie seus dados pessoais</p>
      </div>

      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {((perfil?.nome || user?.email || '?')[0] ?? '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate">{perfil?.nome ?? '—'}</p>
          <p className="text-sm text-[var(--text-muted)] truncate">{perfil?.email}</p>
          <span className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${user?.tipo === 'ADMIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
            }`}>
            {user?.tipo === 'ADMIN' ? 'Administrador' : 'Usuário'}
          </span>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Dados pessoais</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input className="input-field" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">CPF</label>
              <input className="input-field font-mono" value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} maxLength={14} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input-field" value={telefone} onChange={e => setTelefone(maskTel(e.target.value))} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div>
            <label className="label">E-mail</label>
            <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
        </div>
        {successMsg && <div className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"><p className="text-sm text-emerald-600 dark:text-emerald-400">{successMsg}</p></div>}
        {errorMsg && <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"><p className="text-sm text-rose-600 dark:text-rose-400">{errorMsg}</p></div>}
        <button onClick={handleSalvar} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">{saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : 'Salvar alterações'}</button>
      </div>

      <div className="card p-6 space-y-4">
        <button onClick={() => { if (showSenhas) resetSenhaState(); setShowSenhas(v => !v); }} className="w-full flex items-center justify-between group">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Alterar senha</h2>
          <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showSenhas ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {showSenhas && (
          <div className="space-y-4 pt-1">
            {!modoRecuperacao && (
              <>
                <div><label className="label">Senha atual</label><PasswordInput placeholder="Digite sua senha atual" value={senhaAtual} onChange={setSenhaAtual} disabled={savingPwd} /></div>
                <div>
                  <label className="label">Nova senha</label>
                  <PasswordInput
                    placeholder="Entre 8 e 18 caracteres"
                    value={novaSenha}
                    onChange={setNovaSenha}
                    disabled={savingPwd}
                    maxLength={18}
                    hasError={novaSenha.length > 18}
                  />
                  {novaSenha.length > 18 && (
                    <p className="text-xs text-rose-500 mt-1">A senha deve ter no máximo 18 caracteres.</p>
                  )}
                </div>
                <div><label className="label">Confirmar nova senha</label><PasswordInput placeholder="Repita a nova senha" value={confirmarSenha} onChange={setConfirmarSenha} hasError={senhasNaoCoincidem} disabled={savingPwd} />{senhasNaoCoincidem && <p className="text-xs text-rose-500 mt-1">As senhas devem ser iguais.</p>}</div>
                {errorPwd && <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"><p className="text-sm text-rose-600 dark:text-rose-400">{errorPwd}</p></div>}
                {successPwd && <div className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"><p className="text-sm text-emerald-600 dark:text-emerald-400">{successPwd}</p></div>}
                <button onClick={handleTrocarSenha} disabled={savingPwd || senhasNaoCoincidem} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{savingPwd ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : 'Alterar senha'}</button>
                <button onClick={handleEsqueciSenha} className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-center">Esqueci minha senha</button>
              </>
            )}

            {modoRecuperacao && (
              <>
                {emailCodigoEnviado && <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"><svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg><p className="text-sm text-blue-600 dark:text-blue-400">Código enviado para <strong>{emailCodigoEnviado}</strong></p></div>}
                <div>
                  <label className="label mb-3 block">Código de verificação</label>
                  {/* ESTÉTICA DO INPUT ALTERADA AQUI */}
                  <CodigoInput value={codigo} onChange={setCodigo} disabled={savingPwd} />
                </div>
                <div>
                  <label className="label">Nova senha</label>
                  <PasswordInput
                    placeholder="Entre 8 e 18 caracteres"
                    value={novaSenhaRec}
                    onChange={setNovaSenhaRec}
                    disabled={savingPwd}
                    maxLength={18}
                    hasError={novaSenhaRec.length > 18}
                  />
                  {novaSenhaRec.length > 18 && (
                    <p className="text-xs text-rose-500 mt-1">A senha deve ter no máximo 18 caracteres.</p>
                  )}
                </div>
                <div><label className="label">Confirmar nova senha</label><PasswordInput placeholder="Repita a nova senha" value={confirmarSenhaRec} onChange={setConfirmarSenhaRec} hasError={senhasRecNaoCoincidem} disabled={savingPwd} />{senhasRecNaoCoincidem && <p className="text-xs text-rose-500 mt-1">As senhas devem ser iguais.</p>}</div>
                {tempoRestante > 0 && <p className="text-xs text-[var(--text-muted)] text-center">Código expira em: <span className="font-mono">{formatarTempo(tempoRestante)}</span></p>}
                {tempoRestante <= 0 && emailCodigoEnviado && <p className="text-xs text-rose-500 text-center">Código expirado. Solicite um novo.</p>}
                {errorPwd && <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"><p className="text-sm text-rose-600 dark:text-rose-400">{errorPwd}</p></div>}
                {successPwd && <div className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"><p className="text-sm text-emerald-600 dark:text-emerald-400">{successPwd}</p></div>}
                <button onClick={handleConfirmarRecuperacao} disabled={savingPwd || tempoRestante <= 0 || senhasRecNaoCoincidem || codigo.length !== 8} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{savingPwd ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : 'Confirmar'}</button>
                <div className="flex items-center justify-between"><button onClick={resetSenhaState} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">← Voltar</button><button onClick={handleEsqueciSenha} disabled={tempoReenvio > 0} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{tempoReenvio > 0 ? `Reenviar em ${tempoReenvio}s` : 'Reenviar código'}</button></div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-[var(--text-primary)]">Encerrar sessão</p><p className="text-xs text-[var(--text-muted)] mt-0.5">Você será redirecionado para o login</p></div>
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>Sair</button>
        </div>
      </div>
    </div>
  );
}