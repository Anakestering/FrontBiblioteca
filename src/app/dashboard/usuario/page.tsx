'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computadores as computadoresApi, salas as salasApi, reservasComputador, reservasSala, usuarios as usuariosApi } from '@/lib/api';
import { Computador, Sala, Usuario } from '@/types';
import { useAuth } from '@/lib/auth-context';

type Tipo = 'computador' | 'sala';

const DURACAO = 45; 

function addMin(date: Date, min: number) {
  return new Date(date.getTime() + min * 60000);
}

function formatHora(date: Date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Gera blocos de 45min das 7h às 22h
function gerarBlocos(dia: Date): Date[] {
  const blocos: Date[] = [];
  const cursor = new Date(dia);
  cursor.setHours(7, 0, 0, 0);
  const limite = new Date(dia);
  limite.setHours(22, 0, 0, 0);
  while (addMin(cursor, DURACAO) <= limite) {
    blocos.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + DURACAO);
  }
  return blocos;
}

function agruparConsecutivos(blocos: Date[]): { inicio: Date; fim: Date; blocos: Date[] }[] {
  if (!blocos.length) return [];
  const sorted = [...blocos].sort((a, b) => a.getTime() - b.getTime());
  const grupos: { inicio: Date; fim: Date; blocos: Date[] }[] = [];
  for (const bloco of sorted) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && bloco.getTime() === ultimo.fim.getTime()) {
      ultimo.fim = addMin(bloco, DURACAO);
      ultimo.blocos.push(bloco);
    } else {
      grupos.push({ inicio: bloco, fim: addMin(bloco, DURACAO), blocos: [bloco] });
    }
  }
  return grupos;
}

function maiorSequencia(blocos: Date[]): number {
  if (!blocos.length) return 0;
  const sorted = [...blocos].sort((a, b) => a.getTime() - b.getTime());
  let max = 1, atual = 1;
  for (let i = 1; i < sorted.length; i++) {
    if ((sorted[i].getTime() - sorted[i - 1].getTime()) / 60000 === DURACAO) {
      max = Math.max(max, ++atual);
    } else {
      atual = 1;
    }
  }
  return max;
}

function toISOLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export default function ReservarPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [tipo, setTipo] = useState<Tipo>('sala');
  const [pcs, setPcs] = useState<Computador[]>([]);
  const [sls, setSls] = useState<Sala[]>([]);
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<number | null>(null);

  const [loadingDados, setLoadingDados] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [itensSelecionados, setItensSelecionados] = useState<number[]>([]);
  const [blocosSelecionados, setBlocosSelecionados] = useState<Date[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState('');
  const [qtdePessoas, setQtdePessoas] = useState(1);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      computadoresApi.listar().then(setPcs),
      salasApi.listar().then(setSls),
    ];
    if (isAdmin) {
      fetches.push(usuariosApi.listar().then(setTodosUsuarios));
    }
    Promise.all(fetches).finally(() => setLoadingDados(false));
  }, [isAdmin]);

  const trocarTipo = (t: Tipo) => {
    setTipo(t);
    setItensSelecionados([]);
    setBlocosSelecionados([]);
    setQtdePessoas(1);
  };

  const toggleItem = (id: number) => {
    if (tipo === 'sala') {
      setItensSelecionados(prev => prev.includes(id) ? [] : [id]);
    } else {
      setItensSelecionados(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    }
  };

  const toggleBloco = (bloco: Date) => {
    setBlocosSelecionados(prev => {
      const exists = prev.find(b => b.getTime() === bloco.getTime());
      return exists ? prev.filter(b => b.getTime() !== bloco.getTime()) : [...prev, bloco];
    });
  };

  const itens = tipo === 'computador' ? pcs.filter(p => p.ativo) : sls.filter(s => s.ativo);
  const maxPessoas = tipo === 'computador'
    ? itensSelecionados.length * 2
    : 5;

  const diasDisponiveis = Array.from({ length: 31 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const blocos = diaSelecionado
    ? gerarBlocos(new Date(diaSelecionado + 'T00:00:00'))
    : [];

  const agora = new Date();
  const grupos = agruparConsecutivos(blocosSelecionados);

  const precisaAprovacao =
    (tipo === 'computador' && itensSelecionados.length > 3) ||
    maiorSequencia(blocosSelecionados) > 4;

  const totalBlocos = blocosSelecionados.length;
  const totalRequisicoes = totalBlocos * itensSelecionados.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (itensSelecionados.length === 0) { setError('Selecione pelo menos um item.'); return; }
    if (blocosSelecionados.length === 0) { setError('Selecione pelo menos um horário.'); return; }
    if (isAdmin && !usuarioSelecionado) { setError('Selecione o usuário responsável pela reserva.'); return; }

    setSubmitting(true);
    try {
      // Envia UM bloco de 45min por requisição — o back end une pelo checkin em cadeia
      const sorted = [...blocosSelecionados].sort((a, b) => a.getTime() - b.getTime());

      for (const itemId of itensSelecionados) {
        // Envia blocos em sequência (não paralelo) para evitar conflito de sobreposição
        for (const bloco of sorted) {
          if (tipo === 'computador') {
            await reservasComputador.criar({
              computadorId: itemId,
              inicioPrevisto: toISOLocal(bloco),
              qtdePessoas: Math.min(qtdePessoas, 2),
              observacao: observacao || undefined,
              ...(isAdmin && usuarioSelecionado ? { usuarioId: usuarioSelecionado } : {}),
            });
          } else {
            await reservasSala.criar({
              salaId: itemId,
              inicioPrevisto: toISOLocal(bloco),
              qtdePessoas: Math.min(qtdePessoas, 5),
              observacao: observacao || undefined,
              ...(isAdmin && usuarioSelecionado ? { usuarioId: usuarioSelecionado } : {}),
            });
          }
        }
      }

      setSuccess(
        `${totalRequisicoes} reserva${totalRequisicoes !== 1 ? 's' : ''} criada${totalRequisicoes !== 1 ? 's' : ''} com sucesso!` +
        (precisaAprovacao ? ' Aguardando aprovação do admin.' : '')
      );
      setTimeout(() => router.push(isAdmin ? '/dashboard/admin' : '/dashboard/usuario'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar reserva');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Nova Reserva</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Cada tempo equivale a 45 minutos · das 07:00 às 22:00</p>
      </div>

      {/* Aviso de aprovação */}
      {precisaAprovacao && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Aprovação necessária</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {tipo === 'computador' && itensSelecionados.length > 3 && 'Mais de 3 computadores. '}
              {maiorSequencia(blocosSelecionados) > 4 && 'Mais de 4 tempos consecutivos. '}
              Esta reserva ficará pendente até aprovação do administrador.
            </p>
          </div>
        </div>
      )}

      {/* Regras */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Computadores: mais de 2 ao mesmo tempo ou duração superior a 2h15min requer aprovação da secretaria</li>
          <li>• Salas: mais de 1 sala ou duração superior a 2h15min requer aprovação da secretaria</li>
          <li>• Check-in: permitido a partir de 5 minutos antes do início e até 15 minutos após — após esse prazo a reserva é cancelada automaticamente</li>
          <li>• Cancelamento: permitido até 1 hora antes do horário de início</li>
          <li>• Check-out: ao encerrar o uso antes do horário previsto, realize o check-out para liberar o espaço para outros usuários</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ADMIN — Selecionar usuário responsável */}
        {isAdmin && (
          <div className="card p-5 space-y-3 border-2 border-amber-200 dark:border-amber-800">
            <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <span className="text-amber-500">★</span> Usuário responsável pela reserva
            </p>
            {loadingDados ? (
              <div className="h-11 rounded-lg shimmer" />
            ) : (
              <select
                value={usuarioSelecionado ?? ''}
                onChange={e => setUsuarioSelecionado(Number(e.target.value) || null)}
                className="input-field"
                required={isAdmin}
              >
                <option value="">Selecione o usuário...</option>
                {todosUsuarios.filter(u => u.ativo && u.nivelAcesso === 'PADRAO').map(u => (
                  <option key={u.id} value={u.id}>{u.nome} — {u.email}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* 1 — Tipo */}
        <div className="card p-5 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">1. O que deseja reservar?</p>
          <div className="grid grid-cols-2 gap-3">
            {(['sala', 'computador'] as Tipo[]).map(t => (
              <button key={t} type="button" onClick={() => trocarTipo(t)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${tipo === t ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-[var(--border)] hover:border-blue-300'}`}>
                <span className="text-2xl">{t === 'computador' ? '💻' : '🏫'}</span>
                <p className={`text-sm font-semibold mt-2 ${tipo === t ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--text-primary)]'}`}>
                  {t === 'computador' ? 'Computador' : 'Sala de Estudos'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {t === 'computador' ? 'Até 2 pessoas por PC' : 'Até 5 pessoas'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 2 — Itens */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              2. Selecione {tipo === 'computador' ? 'o(s) computador(es)' : 'a sala'}
            </p>
            {itensSelecionados.length > 0 && (
              <span className="text-xs font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                {itensSelecionados.length} selecionado{itensSelecionados.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {loadingDados ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 rounded-lg shimmer" />)}
            </div>
          ) : itens.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Nenhum {tipo} disponível.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {itens.map(item => {
                const sel = itensSelecionados.includes(item.id);
                const nome = tipo === 'computador' ? (item as Computador).codigo : (item as Sala).nome;
                const cap = tipo === 'computador' ? (item as Computador).capacidadePessoas : (item as Sala).capacidadePessoas;
                return (
                  <button key={item.id} type="button" onClick={() => toggleItem(item.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all relative ${sel ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-[var(--border)] hover:border-blue-300'}`}>
                    {sel && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <p className={`text-sm font-semibold ${tipo === 'computador' ? 'font-mono' : ''} ${sel ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--text-primary)]'}`}>{nome}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">até {cap} pessoa{cap !== 1 ? 's' : ''}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3 — Pessoas */}
        {itensSelecionados.length > 0 && (
          <div className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">3. Quantidade de pessoas</p>
            <div className="flex items-center gap-4">
              <input type="range" min={1} max={maxPessoas}
                value={Math.min(qtdePessoas, maxPessoas)}
                onChange={e => setQtdePessoas(Number(e.target.value))}
                className="flex-1 accent-blue-600" />
              <span className="w-10 text-center font-bold text-xl text-[var(--text-primary)]">
                {Math.min(qtdePessoas, maxPessoas)}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Máximo {maxPessoas} pessoa{maxPessoas !== 1 ? 's' : ''}</p>
          </div>
        )}

        {/* 4 — Dia */}
        {itensSelecionados.length > 0 && (
          <div className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">4. Escolha o dia</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {diasDisponiveis.map(dia => {
                const key = `${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,'0')}-${String(dia.getDate()).padStart(2,'0')}`;
                const sel = diaSelecionado === key;
                const isHoje = dia.toDateString() === new Date().toDateString();
                return (
                  <button key={key} type="button"
                    onClick={() => { setDiaSelecionado(key); setBlocosSelecionados([]); }}
                    className={`shrink-0 px-3 py-2 rounded-xl border-2 text-center transition-all min-w-[60px] ${sel ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-[var(--border)] hover:border-blue-300'}`}>
                    <p className={`text-xs font-medium ${sel ? 'text-blue-600' : 'text-[var(--text-muted)]'}`}>
                      {isHoje ? 'Hoje' : dia.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </p>
                    <p className={`text-sm font-bold ${sel ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--text-primary)]'}`}>{dia.getDate()}</p>
                    <p className={`text-xs ${sel ? 'text-blue-500' : 'text-[var(--text-muted)]'}`}>
                      {dia.toLocaleDateString('pt-BR', { month: 'short' })}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5 — Horários */}
        {diaSelecionado && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">5. Escolha os horários</p>
              {blocosSelecionados.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    {blocosSelecionados.length} bloco{blocosSelecionados.length !== 1 ? 's' : ''} · {blocosSelecionados.length * 45}min
                  </span>
                  <button type="button" onClick={() => setBlocosSelecionados([])} className="text-xs text-rose-500 hover:underline">
                    Limpar
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Clique nos horários desejados. Blocos consecutivos são agrupados automaticamente.</p>
            <div className="flex flex-wrap gap-2">
              {blocos.map(bloco => {
                const sel = !!blocosSelecionados.find(b => b.getTime() === bloco.getTime());
                const disponivel = bloco > agora;
                return (
                  <button
                    key={bloco.getTime()}
                    type="button"
                    onClick={() => disponivel && toggleBloco(bloco)}
                    disabled={!disponivel}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      !disponivel
                        ? 'opacity-25 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)]'
                        : sel
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {formatHora(bloco)}
                  </button>
                );
              })}
            </div>

            {/* Resumo agrupado */}
            {grupos.length > 0 && (
              <div className="mt-2 pt-3 border-t border-[var(--border)] space-y-2">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Resumo das reservas</p>
                {grupos.map((g, i) => {
                  const minutos = (g.fim.getTime() - g.inicio.getTime()) / 60000;
                  const tempos = minutos / 45;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs bg-[var(--surface-2)] rounded-lg px-3 py-2">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {formatHora(g.inicio)} → {formatHora(g.fim)}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        {tempos} tempo{tempos !== 1 ? 's' : ''} · {minutos}min
                      </span>
                    </div>
                  );
                })}
                {itensSelecionados.length > 0 && (
                  <p className="text-xs text-blue-600 font-medium">
                    {totalRequisicoes} reserva{totalRequisicoes !== 1 ? 's' : ''} serão criadas
                    {precisaAprovacao ? ' (aguardam aprovação)' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6 — Observação */}
        {blocosSelecionados.length > 0 && (
          <div className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">6. Observação <span className="font-normal text-[var(--text-muted)]">(opcional)</span></p>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)}
              rows={2} placeholder="Ex: Trabalho em grupo de programação..."
              className="input-field h-auto py-3 resize-none" />
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Voltar</button>
          <button type="submit"
            disabled={submitting || itensSelecionados.length === 0 || blocosSelecionados.length === 0 || (isAdmin && !usuarioSelecionado)}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {submitting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Criando...</>
              : precisaAprovacao ? 'Solicitar aprovação' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </div>
  );
}