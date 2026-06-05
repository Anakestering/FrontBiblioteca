'use client';

import { auth } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/app/components/ui/PasswordInput';
import { CodigoInput } from '@/app/components/ui/CodigoInput';

export default function RecuperarSenhaPage() {
    const [email, setEmail] = useState('');
    const [codigo, setCodigo] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [tempoRestante, setTempoRestante] = useState(0);
    const [tempoReenvio, setTempoReenvio] = useState(0);
    const [emailEnviado, setEmailEnviado] = useState('');

    const [loading, setLoading] = useState(false);
    const [mensagem, setMensagem] = useState('');
    const [erro, setErro] = useState('');
    const [mostrarEtapa2, setMostrarEtapa2] = useState(false);

    const router = useRouter();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const senhasNaoCoincidem =
        confirmarSenha.length > 0 && novaSenha !== confirmarSenha;

    // Gerenciador do cronômetro de reenvio e expiração
    useEffect(() => {
        if (tempoRestante <= 0 && tempoReenvio <= 0) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }
        if (intervalRef.current) return;
        intervalRef.current = setInterval(() => {
            setTempoRestante(prev => (prev > 0 ? prev - 1 : 0));
            setTempoReenvio(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [tempoRestante, tempoReenvio]);

    const formatarTempo = (segundos: number) => {
        const min = Math.floor(segundos / 60);
        const seg = segundos % 60;
        return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
    };

    const validarEmail = (value: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    // Etapa 1: Enviar código com Trava de Segurança de 2 segundos contra bugs
    const handleEnviarCodigo = async () => {
        setMensagem('');
        setErro('');
        const emailTrimmed = email.trim();
        
        if (!emailTrimmed) { setErro('Informe seu e-mail.'); return; }
        if (!validarEmail(emailTrimmed)) { setErro('E-mail inválido.'); return; }
        
        // Transição visual instantânea para a Etapa 2
        setEmailEnviado(emailTrimmed);
        setMostrarEtapa2(true);
        setTempoReenvio(60); 
        setTempoRestante(900); // 15 minutos estimados padrão

        setLoading(true); // Bloqueia e-mail e botão por segurança

        try {
            await auth.solicitarRecuperacao({ email: emailTrimmed });
        } catch (e: unknown) {
            console.error('Erro de conexão/servidor:', e);
            setErro('Não foi possível conectar ao servidor. Tente novamente.');
        } finally {
            // FORÇA O LOCKOUT DE 2 SEGUNDOS
            setTimeout(() => {
                setLoading(false); // Destrava o campo de e-mail após 2 segundos exatos
            }, 2000);
        }
    };

    // Etapa 2: Validar código e alterar senha
    const handleAlterarSenha = async () => {
        setMensagem('');
        setErro('');
        const codigoTrimmed = codigo.trim();
        const emailTrimmed = email.trim();
        
        if (codigoTrimmed.length !== 8) { setErro('Código inválido.'); return; }
        if (novaSenha.length < 8) { setErro('A senha deve ter no mínimo 8 caracteres.'); return; }
        if (novaSenha.length > 18) { setErro('A senha deve ter no máximo 18 caracteres.'); return; }
        if (novaSenha !== confirmarSenha) { setErro('As senhas não coincidem.'); return; }
        
        setLoading(true);
        try {
            await auth.alterarSenha({ email: emailTrimmed, codigo: codigoTrimmed, novaSenha });
            setMensagem('Senha alterada com sucesso! Redirecionando...');
            setTimeout(() => router.push('/login'), 2000);
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            setErro(error instanceof Error ? error.message : 'Erro ao alterar senha.');
        } finally {
            setLoading(false);
        }
    };

    const getLabelBotaoEnviar = () => {
        if (loading) return 'Enviando...';
        if (tempoReenvio > 0) return `Reenviar em ${tempoReenvio}s`;
        if (mostrarEtapa2) return 'Reenviar código';
        return 'Enviar código';
    };

    return (
        <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-800/6 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-[420px] slide-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-700 rounded-xl mb-4 shadow-lg shadow-blue-700/30">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Biblioteca</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Sistema de Reservas</p>
                </div>

                <div className="card p-8 space-y-5">
                    <div>
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Recuperar senha</h2>
                        
                        {/* CARD VERDE POSICIONADO NO TOPO DINAMICAMENTE */}
                        {mostrarEtapa2 ? (
                            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 animate-fade-in my-2">
                                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                                    Se o e-mail <strong>{emailEnviado}</strong> estiver cadastrado em nosso sistema, um código de verificação foi enviado para ele.
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                Informe seu e-mail institucional para receber o código de recuperação.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="label">E-mail institucional</label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                className="input-field flex-1 disabled:opacity-60 transition-all text-sm"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={e => {
                                    setEmail(e.target.value);
                                    if (mostrarEtapa2) {
                                        setMostrarEtapa2(false);
                                        setCodigo('');
                                        setNovaSenha('');
                                        setConfirmarSenha('');
                                        setTempoRestante(0);
                                        setTempoReenvio(0);
                                        setEmailEnviado('');
                                        setMensagem('');
                                        setErro('');
                                    }
                                }}
                                disabled={loading}
                            />
                            <button
                                onClick={handleEnviarCodigo}
                                disabled={tempoReenvio > 0 || loading}
                                className="btn-primary shrink-0 px-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {getLabelBotaoEnviar()}
                            </button>
                        </div>
                    </div>

                    {mostrarEtapa2 && (
                        <div className="space-y-4 pt-2 animate-fade-in">
                            <div>
                                <label className="label mb-2 block">Código de verificação</label>
                                <CodigoInput
                                    value={codigo}
                                    onChange={setCodigo}
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="label">Nova senha</label>
                                <PasswordInput
                                    placeholder="Entre 8 e 18 caracteres"
                                    value={novaSenha}
                                    onChange={setNovaSenha}
                                    disabled={loading}
                                    maxLength={18}
                                    hasError={novaSenha.length > 18}
                                />
                                {novaSenha.length > 18 && (
                                    <p className="text-xs text-rose-500 mt-1">A senha deve ter no máximo 18 caracteres.</p>
                                )}
                            </div>

                            <div>
                                <label className="label">Confirmar nova senha</label>
                                <PasswordInput
                                    placeholder="Repita a nova senha"
                                    value={confirmarSenha}
                                    onChange={setConfirmarSenha}
                                    hasError={senhasNaoCoincidem}
                                    disabled={loading}
                                    maxLength={18}
                                />
                                {senhasNaoCoincidem && (
                                    <p className="text-xs text-rose-500 mt-1">As senhas devem ser iguais.</p>
                                )}
                            </div>

                            {tempoRestante > 0 && (
                                <p className="text-xs text-[var(--text-muted)] text-center">
                                    Código expira em: <span className="font-mono">{formatarTempo(tempoRestante)}</span>
                                </p>
                            )}
                            {tempoRestante <= 0 && emailEnviado && (
                                <p className="text-xs text-rose-500 text-center">Código expirado. Solicite um novo.</p>
                            )}

                            <button
                                onClick={handleAlterarSenha}
                                disabled={loading || tempoRestante <= 0 || senhasNaoCoincidem || codigo.length !== 8}
                                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Alterando...
                                    </>
                                ) : (
                                    'Alterar senha'
                                )}
                            </button>
                        </div>
                    )}

                    {/* Mensagens de feedback gerais (Sucesso de alteração de senha e Erros críticos) */}
                    {mensagem && !mostrarEtapa2 && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">{mensagem}</p>
                        </div>
                    )}
                    {erro && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                            <svg className="w-4 h-4 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-rose-700 dark:text-rose-300">{erro}</p>
                        </div>
                    )}

                    <div className="pt-1 border-t border-[var(--border)]">
                        <a
                            href="/login"
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 transition-colors"
                        >
                            ← Voltar para o login
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}