'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/api';
import { PasswordInput } from '@/app/components/ui/PasswordInput';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.login({ email, senha });
      login(res.token, res.tipo, email);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center p-4">
      {/* Background accent */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-800/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] slide-in">
        {/* Logo / Brand */}
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

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Bem-vindo de volta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail institucional</label>
              <input
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <PasswordInput
                placeholder="••••••••"
                value={senha}
                onChange={setSenha}
                disabled={loading}
              />
            </div>

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
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Entrando...</>
              ) : 'Acessar'}
            </button>
          </form>

          <div className="flex justify-between items-center mt-5 pt-5 border-t border-[var(--border)]">
            <Link href="/cadastro" className="text-sm text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 transition-colors">
              Não é cadastrado?
            </Link>
            <Link href="/recuperar-senha" className="text-sm text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 transition-colors">
              Esqueceu sua senha?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
