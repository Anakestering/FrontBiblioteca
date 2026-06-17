'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { maskCpf } from '@/lib/utils';
import { TipoUsuario, UsuarioOutroInfo } from '@/types';

const TIPO_USUARIO_LABELS: Record<TipoUsuario, string> = {
  SENAI: 'Senai',
  SESI: 'Sesi',
  COLABORADOR: 'Colaborador',
  RESPONSAVEL: 'Responsável',
  OUTRO: 'Outro',
};

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: '', cpf: '', email: '',
    tipoUsuario: '' as TipoUsuario | '',
    ondeConheceu: '',
    trabalha: false,
    ondeTrabalha: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.tipoUsuario) { setError('Selecione o tipo de usuário.'); return; }
    setLoading(true);
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
        cpf: form.cpf.replace(/\D/g, ''),
        email: form.email,
        tipoUsuario: form.tipoUsuario as TipoUsuario,
        outroInfo,
      });
      router.push('/login?cadastro=ok');
    } catch (err: unknown) {
      console.error('Erro ao cadastrar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-800/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[460px] slide-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-700 rounded-xl mb-4 shadow-lg shadow-blue-700/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Biblioteca</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Crie sua conta</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Novo cadastro</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input name="nome" type="text" className="input-field" placeholder="Seu nome"
                value={form.nome} onChange={handleChange} required />
            </div>

            <div>
              <label className="label">CPF</label>
              <input
                name="cpf"
                type="text"
                className="input-field font-mono"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={e => setForm(f => ({ ...f, cpf: maskCpf(e.target.value) }))}
                required
                inputMode="numeric"
                maxLength={14}
              />
            </div>

            <div>
              <label className="label">E-mail</label>
              <input name="email" type="email" className="input-field" placeholder="seu@email.com"
                value={form.email} onChange={handleChange} required />
            </div>

            {form.email && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Após o cadastro, um email será enviado para <span className="font-medium">{form.email}</span> com as instruções para criar sua senha.
                </p>
              </div>
            )}

            <div>
              <label className="label">Tipo de usuário</label>
              <select
                className="input-field"
                value={form.tipoUsuario}
                onChange={e => setForm(f => ({ ...f, tipoUsuario: e.target.value as TipoUsuario }))}
                required
              >
                <option value="">Selecione...</option>
                {(Object.keys(TIPO_USUARIO_LABELS) as TipoUsuario[]).map(tipo => (
                  <option key={tipo} value={tipo}>{TIPO_USUARIO_LABELS[tipo]}</option>
                ))}
              </select>
            </div>

            {form.tipoUsuario === 'OUTRO' && (
              <div className="space-y-3 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <label className="label">Onde conheceu a instituição?</label>
                  <input
                    name="ondeConheceu"
                    type="text"
                    className="input-field"
                    placeholder="Ex: indicação de amigo"
                    value={form.ondeConheceu}
                    onChange={handleChange}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="trabalha"
                    checked={form.trabalha}
                    onChange={e => setForm(f => ({ ...f, trabalha: e.target.checked, ondeTrabalha: e.target.checked ? f.ondeTrabalha : '' }))}
                    className="w-4 h-4 rounded border-[var(--border)] accent-blue-700"
                  />
                  <label htmlFor="trabalha" className="text-sm text-[var(--text-primary)]">Trabalha?</label>
                </div>
                {form.trabalha && (
                  <div>
                    <label className="label">Onde trabalha?</label>
                    <input
                      name="ondeTrabalha"
                      type="text"
                      className="input-field"
                      placeholder="Nome da empresa"
                      value={form.ondeTrabalha}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                <svg className="w-4 h-4 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cadastrando...</>
              ) : 'Criar conta'}
            </button>
          </form>

          <div className="text-center mt-5 pt-5 border-t border-[var(--border)]">
            <span className="text-sm text-[var(--text-muted)]">Já tem conta? </span>
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
