'use client';

import { useEffect, useState } from 'react';
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

  // Estados Agrupados (Evita pulverização de estados e melhora performance)
  const [dadosForm, setDadosForm] = useState({ nome: '', email: '', cpf: '', telefone: '' });
  const [senhaForm, setSenhaForm] = useState({ atual: '', nova: '', confirmar: '' });
  const [recuperarForm, setRecuperarForm] = useState({ codigo: '', nova: '', confirmar: '' });

  const [showSenhas, setShowSenhas] = useState(false);
  const [modoRecuperacao, setModoRecuperacao] = useState(false);

  // Timers
  const [tempoRestante, setTempoRestante] = useState(0);
  const [tempoReenvio, setTempoReenvio] = useState(0);
  const [emailCodigoEnviado, setEmailCodigoEnviado] = useState('');

  // Estados de Carregamento
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Feedbacks unificados por contexto
  const [feedbackDados, setFeedbackDados] = useState({ erro: '', sucesso: '' });
  const [feedbackSenha, setFeedbackSenha] = useState({ erro: '', sucesso: '' });

  const senhasNaoCoincidem = senhaForm.confirmar.length > 0 && senhaForm.nova !== senhaForm.confirmar;
  const senhasRecNaoCoincidem = recuperarForm.confirmar.length > 0 && recuperarForm.nova !== recuperarForm.confirmar;

  // Efeito do Timer
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

  // Carregamento de Perfil Inicial
  useEffect(() => {
    async function load() {
      try {
        const me = await usuariosApi.buscarMe();
        setPerfil(me);
        setDadosForm({
          nome: me.nome ?? '',
          email: me.email ?? '',
          cpf: maskCpf(me.cpf ?? ''),
          telefone: maskTel(me.telefone ?? ''),
        });
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        setFeedbackDados({ erro: 'Não foi possível carregar seus dados. Tente recarregar.', sucesso: '' });
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user]);

  const handleSalvarDados = async () => {
    if (!perfil) return;
    setFeedbackDados({ erro: '', sucesso: '' });
    setSaving(true);
    try {
      await usuariosApi.atualizar(perfil.id, {
        nome: dadosForm.nome,
        email: dadosForm.email,
        cpf: dadosForm.cpf.replace(/\D/g, ''),
        telefone: dadosForm.telefone ? dadosForm.telefone.replace(/\D/g, '') : undefined,
      });
      setFeedbackDados({ erro: '', sucesso: 'Dados atualizados com sucesso!' });
    } catch (e: unknown) {
      console.error(e);
      setFeedbackDados({ erro: e instanceof Error ? e.message : 'Erro ao salvar dados', sucesso: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleTrocarSenha = async () => {
    setFeedbackSenha({ erro: '', sucesso: '' });
    if (senhaForm.nova.length < 8) { setFeedbackSenha({ erro: 'A nova senha deve ter pelo menos 8 caracteres.', sucesso: '' }); return; }
    if (senhaForm.nova !== senhaForm.confirmar) { setFeedbackSenha({ erro: 'As senhas não coincidem.', sucesso: '' }); return; }
    
    setSavingPwd(true);
    try {
      await usuariosApi.trocarSenha({ senhaAtual: senhaForm.atual, novaSenha: senhaForm.nova });
      setFeedbackSenha({ erro: '', sucesso: 'Senha alterada com sucesso! Redirecionando...' });
      
      setSenhaForm({ atual: '', nova: '', confirmar: '' });
      setShowSenhas(false);
      setTimeout(() => { logout(); router.push('/login'); }, 2000);
    } catch (e: unknown) {
      console.error(e);
      setFeedbackSenha({ erro: e instanceof Error ? e.message : 'Erro ao alterar senha', sucesso: '' });
    } finally {
      setSavingPwd(false);
    }
  };

  const handleEsqueciSenha = async () => {
    if (!perfil?.email) return;
    setFeedbackSenha({ erro: '', sucesso: '' });
    try {
      const res = await authApi.solicitarRecuperacao({ email: perfil.email });
      setTempoRestante(Math.max(0, Math.floor((new Date(res.expiresAt).getTime() - Date.now()) / 1000)));
      setTempoReenvio(30);
      setEmailCodigoEnviado(perfil.email);
      setModoRecuperacao(true);
    } catch (e: unknown) {
      console.error(e);
      setFeedbackSenha({ erro: e instanceof Error ? e.message : 'Erro ao enviar código', sucesso: '' });
    }
  };

  const handleConfirmarRecuperacao = async () => {
    setFeedbackSenha({ erro: '', sucesso: '' });
    if (recuperarForm.codigo.length !== 8) { setFeedbackSenha({ erro: 'Código inválido.', sucesso: '' }); return; }
    if (recuperarForm.nova.length < 8) { setFeedbackSenha({ erro: 'A nova senha deve ter pelo menos 8 caracteres.', sucesso: '' }); return; }
    if (recuperarForm.nova !== recuperarForm.confirmar) { setFeedbackSenha({ erro: 'As senhas não coincidem.', sucesso: '' }); return; }
    if (!perfil?.email) return;

    setSavingPwd(true);
    try {
      await authApi.alterarSenha({
        email: perfil.email,
        codigo: recuperarForm.codigo,
        novaSenha: recuperarForm.nova,
      });
      setFeedbackSenha({ erro: '', sucesso: 'Senha alterada com sucesso! Redirecionando...' });
      setRecuperarForm({ codigo: '', nova: '', confirmar: '' });
      setModoRecuperacao(false);
      setShowSenhas(false);
      setTimeout(() => { logout(); router.push('/login'); }, 2000);
    } catch (e: unknown) {
      console.error(e);
      setFeedbackSenha({ erro: e instanceof Error ? e.message : 'Erro ao alterar senha', scenario: '' } as any);
    } finally {
      setSavingPwd(false);
    }
  };

  const resetSenhaState = () => {
    setModoRecuperacao(false);
    setSenhaForm({ atual: '', nova: '', confirmar: '' });
    setRecuperarForm({ codigo: '', nova: '', confirmar: '' });
    setFeedbackSenha({ erro: '', sucesso: '' });
    setTempoRestante(0);
    setTempoReenvio(0);
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

      {/* Header Perfil */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {((perfil?.nome || user?.email || '?')[0] ?? '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate">{perfil?.nome ?? '—'}</p>
          <p className="text-sm text-[var(--text-muted)] truncate">{perfil?.email}</p>
          <span className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            user?.tipo === 'ADMIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
          }`}>
            {user?.tipo === 'ADMIN' ? 'Administrador' : 'Usuário'}
          </span>
        </div>
      </div>

      {/* Seção Dados Pessoais */}
      <div className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Dados pessoais</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input 
              className="input-field" 
              value={dadosForm.nome} 
              onChange={e => setDadosForm(p => ({ ...p, nome: e.target.value }))} 
              placeholder="Seu nome" 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">CPF</label>
              <input 
                className="input-field font-mono" 
                value={dadosForm.cpf} 
                onChange={e => setDadosForm(p => ({ ...p, cpf: maskCpf(e.target.value) }))} 
                maxLength={14} 
                placeholder="000.000.000-00" 
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input 
                className="input-field" 
                value={dadosForm.telefone} 
                onChange={e => setDadosForm(p => ({ ...p, telefone: maskTel(e.target.value) }))} 
                maxLength={15} 
                placeholder="(00) 00000-0000" 
              />
            </div>
          </div>
          <div>
            <label className="label">E-mail</label>
            <input 
              type="email" 
              className="input-field opacity-70" 
              value={dadosForm.email} 
              onChange={e => setDadosForm(p => ({ ...p, email: e.target.value }))} 
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        {feedbackDados.sucesso && <div className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"><p className="text-sm text-emerald-600 dark:text-emerald-400">{feedbackDados.sucesso}</p></div>}
        {feedbackDados.erro && <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"><p className="text-sm text-rose-600 dark:text-rose-400">{feedbackDados.erro}</p></div>}
        
        <button onClick={handleSalvarDados} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : 'Salvar alterações'}
        </button>
      </div>

      {/* Seção Alterar Senha */}
      <div className="card p-6 space-y-4">
        <button type="button" onClick={() => { if (showSenhas) resetSenhaState(); setShowSenhas(v => !v); }} className="w-full flex items-center justify-between group">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Alterar senha</h2>
          <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showSenhas ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {showSenhas && (
          <div className="space-y-4 pt-1">
            {!modoRecuperacao ? (
              <>
                <div>
                  <label className="label">Senha atual</label>
                  <PasswordInput placeholder="Digite sua senha atual" value={senhaForm.atual} onChange={val => setSenhaForm(p => ({ ...p, atual: val }))} disabled={savingPwd} />
                </div>
                <div>
                  <label className="label">Nova senha</label>
                  <PasswordInput
                    placeholder="Entre 8 e 18 caracteres"
                    value={senhaForm.nova}
                    onChange={val => setSenhaForm(p => ({ ...p, nova: val }))}
                    disabled={savingPwd}
                    maxLength={18}
                    hasError={senhaForm.nova.length > 18}
                  />
                </div>
                <div>
                  <label className="label">Confirmar nova senha</label>
                  <PasswordInput placeholder="Repita a nova senha" value={senhaForm.confirmar} onChange={val => setSenhaForm(p => ({ ...p, confirmar: val }))} hasError={senhasNaoCoincidem} disabled={savingPwd} />
                  {senhasNaoCoincidem && <p className="text-xs text-rose-500 mt-1">As senhas devem ser iguais.</p>}
                </div>
                
                {feedbackSenha.erro && <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"><p className="text-sm text-rose-600 dark:text-rose-400">{feedbackSenha.erro}</p></div>}
                {feedbackSenha.sucesso && <div className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"><p className="text-sm text-emerald-600 dark:text-emerald-400">{feedbackSenha.sucesso}</p></div>}
                
                <button onClick={handleTrocarSenha} disabled={savingPwd || senhasNaoCoincidem} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingPwd ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</> : 'Alterar senha'}
                </button>
                <button type="button" onClick={handleEsqueciSenha} className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] text-center">Esqueci minha senha</button>
              </>
            ) : (
              <>
                {emailCodigoEnviado && <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"><p className="text-sm text-blue-600 dark:text-blue-400">Código enviado para <strong>{emailCodigoEnviado}</strong></p></div>}
                <div>
                  <label className="label mb-3 block">Código de verificação</label>
                  <CodigoInput value={recuperarForm.codigo} onChange={val => setRecuperarForm(p => ({ ...p, codigo: val }))} disabled={savingPwd} />
                </div>
                <div>
                  <label className="label">Nova senha</label>
                  <PasswordInput
                    placeholder="Entre 8 e 18 caracteres"
                    value={recuperarForm.nova}
                    onChange={val => setRecuperarForm(p => ({ ...p, nova: val }))}
                    disabled={savingPwd}
                    maxLength={18}
                  />
                </div>
                <div>
                  <label className="label">Confirmar nova senha</label>
                  <PasswordInput placeholder="Repita a nova senha" value={recuperarForm.confirmar} onChange={val => setRecuperarForm(p => ({ ...p, confirmar: val }))} hasError={senhasRecNaoCoincidem} disabled={savingPwd} />
                  {senhasRecNaoCoincidem && <p className="text-xs text-rose-500 mt-1">As senhas devem ser iguais.</p>}
                </div>

                {tempoRestante > 0 && <p className="text-xs text-[var(--text-muted)] text-center">Código expira em: <span className="font-mono">{formatarTempo(tempoRestante)}</span></p>}
                {tempoRestante <= 0 && emailCodigoEnviado && <p className="text-xs text-rose-500 text-center">Código expirado. Solicite um novo.</p>}
                
                {feedbackSenha.erro && <div className="px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"><p className="text-sm text-rose-600 dark:text-rose-400">{feedbackSenha.erro}</p></div>}
                
                <button onClick={handleConfirmarRecuperacao} disabled={savingPwd || tempoRestante <= 0 || senhasRecNaoCoincidem || recuperarForm.codigo.length !== 8} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingPwd ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Confirmando...</> : 'Confirmar'}
                </button>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={resetSenhaState} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Voltar</button>
                  <button type="button" onClick={handleEsqueciSenha} disabled={tempoReenvio > 0} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50">
                    {tempoReenvio > 0 ? `Reenviar em ${tempoReenvio}s` : 'Reenviar código'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Encerrar Sessão */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Encerrar sessão</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Você será redirecionado para o login</p>
          </div>
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20 transition-colors">Sair</button>
        </div>
      </div>
    </div>
  );
}