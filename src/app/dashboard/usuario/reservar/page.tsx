'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  computadores as computadoresApi,
  salas as salasApi,
  reservasComputador,
  reservasSala,
  pedidos as pedidosApi,
  usuarios as usuariosApi,
} from '@/lib/api';
import { Computador, Sala, Usuario } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Alert } from '@/app/components/ui/ErrorAlert';
import { LoadingList } from '@/app/components/ui/LoadingList';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { maskCpf } from '@/lib/utils';

// ─── Constantes ───────────────────────────────────────────────────────────────

type Tipo = 'computador' | 'sala';
const DURACAO = 45;
const HORA_INICIO = 7;
const HORA_FIM = 22;

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MESES_ABREV = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];
const SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Utilitários de data ──────────────────────────────────────────────────────

function addMin(date: Date, min: number) {
  return new Date(date.getTime() + min * 60000);
}

function formatHora(date: Date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function toISOLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function gerarBlocos(dia: Date): Date[] {
  const blocos: Date[] = [];
  const cursor = new Date(dia);
  cursor.setHours(HORA_INICIO, 0, 0, 0);
  const limite = new Date(dia);
  limite.setHours(HORA_FIM, 0, 0, 0);
  while (addMin(cursor, DURACAO) <= limite) {
    blocos.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + DURACAO);
  }
  return blocos;
}

function agruparConsecutivos(blocos: Date[]): { inicio: Date; fim: Date; qtd: number }[] {
  if (!blocos.length) return [];
  const sorted = [...blocos].sort((a, b) => a.getTime() - b.getTime());
  const grupos: { inicio: Date; fim: Date; qtd: number }[] = [];
  for (const bloco of sorted) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && bloco.getTime() === ultimo.fim.getTime()) {
      ultimo.fim = addMin(bloco, DURACAO);
      ultimo.qtd++;
    } else {
      grupos.push({ inicio: bloco, fim: addMin(bloco, DURACAO), qtd: 1 });
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

function saoConsecutivos(blocos: Date[]): boolean {
  if (blocos.length <= 1) return true;
  return agruparConsecutivos(blocos).length === 1;
}

// ─── Helpers de data para o seletor de mês ───────────────────────────────────

function isMesAnterior(mes: Date, hoje: Date): boolean {
  return (
    mes.getFullYear() < hoje.getFullYear() ||
    (mes.getFullYear() === hoje.getFullYear() && mes.getMonth() < hoje.getMonth())
  );
}

function diasDoMes(mes: Date, hoje: Date): Date[] {
  const ano = mes.getFullYear();
  const m = mes.getMonth();
  const totalDias = new Date(ano, m + 1, 0).getDate();
  const isMesAtual =
    mes.getFullYear() === hoje.getFullYear() && mes.getMonth() === hoje.getMonth();
  const diaInicio = isMesAtual ? hoje.getDate() : 1;
  const dias: Date[] = [];
  for (let d = diaInicio; d <= totalDias; d++) {
    dias.push(new Date(ano, m, d));
  }
  return dias;
}

// ─── Componente de busca de usuário (admin) ───────────────────────────────────

function BuscaUsuario({ onSelecionar }: { onSelecionar: (u: Usuario) => void }) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Usuario[]>([]);

  useEffect(() => {
    if (busca.length < 2) { setResultados([]); return; }
    const timeout = setTimeout(async () => {
      try { setResultados(await usuariosApi.buscarPorTermo(busca)); }
      catch { setResultados([]); }
    }, 350);
    return () => clearTimeout(timeout);
  }, [busca]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        className="input-field"
        placeholder="Buscar por nome, CPF ou e-mail..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        autoComplete="off"
      />
      {busca.length >= 1 && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          {resultados.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] px-4 py-3 text-center">Nenhum usuário encontrado</p>
          ) : (
            resultados.map(u => (
              <div key={u.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-2)] border-b border-[var(--border)] last:border-0 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{u.nome}</p>
                  <p className="text-xs text-[var(--text-muted)]">CPF: {maskCpf(u.cpf)} · {u.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { onSelecionar(u); setBusca(''); }}
                  className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  Vincular
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Seção numerada ───────────────────────────────────────────────────────────

function Secao({ numero, titulo, children }: {
  numero: number;
  titulo: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 space-y-4">
      <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0 font-bold">
          {numero}
        </span>
        {titulo}
      </p>
      {children}
    </div>
  );
}

// ─── Seletor de dia com navegação por mês ────────────────────────────────────

function SeletorDia({
  diaSelecionado,
  onSelecionar,
}: {
  diaSelecionado: string;
  onSelecionar: (key: string) => void;
}) {
  const hoje = useMemo(() => new Date(), []);
  const [mesAtual, setMesAtual] = useState(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  );

  const dias = useMemo(() => diasDoMes(mesAtual, hoje), [mesAtual, hoje]);

  const podePrevMes = !isMesAnterior(
    new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1),
    hoje
  ) || (
    mesAtual.getFullYear() === hoje.getFullYear() &&
    mesAtual.getMonth() === hoje.getMonth()
  );

  const irParaMes = (dir: -1 | 1) => {
    const novo = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + dir, 1);
    if (dir === -1 && isMesAnterior(novo, hoje)) return;
    setMesAtual(novo);
  };

  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-3">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => irParaMes(-1)}
          disabled={
            mesAtual.getFullYear() === hoje.getFullYear() &&
            mesAtual.getMonth() === hoje.getMonth()
          }
          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
        </span>

        <button
          type="button"
          onClick={() => irParaMes(1)}
          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Barra de dias com scroll horizontal */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {dias.map(dia => {
          const key = toKey(dia);
          const sel = diaSelecionado === key;
          const isHoje = dia.toDateString() === hoje.toDateString();

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelecionar(key)}
              className={`shrink-0 w-[52px] py-2 rounded-xl border-2 text-center transition-all ${
                sel
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-[var(--border)] hover:border-blue-300'
              }`}
            >
              <p className={`text-[10px] font-medium ${sel ? 'text-blue-600' : 'text-[var(--text-muted)]'}`}>
                {isHoje ? 'Hoje' : SEMANA_ABREV[dia.getDay()]}
              </p>
              <p className={`text-base font-bold leading-tight ${
                sel ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--text-primary)]'
              } ${isHoje && !sel ? 'text-blue-600' : ''}`}>
                {dia.getDate()}
              </p>
              <p className={`text-[10px] ${sel ? 'text-blue-500' : 'text-[var(--text-muted)]'}`}>
                {MESES_ABREV[dia.getMonth()]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReservarPage() {
  const router = useRouter();
  const { isAdmin, user } = useAuth();

  const [pcs, setPcs] = useState<Computador[]>([]);
  const [sls, setSls] = useState<Sala[]>([]);
  const [loadingDados, setLoadingDados] = useState(true);

  const [tipo, setTipo] = useState<Tipo>('computador');
  const [usuarioVinculado, setUsuarioVinculado] = useState<Usuario | null>(null);
  const [itensSelecionados, setItensSelecionados] = useState<number[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState('');
  const [blocosSelecionados, setBlocosSelecionados] = useState<Date[]>([]);
  const [qtdePessoas, setQtdePessoas] = useState(1);
  const [observacao, setObservacao] = useState('');

  const [ocupados, setOcupados] = useState<Record<number, Set<string>>>({});
  const [loadingOcupados, setLoadingOcupados] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Carrega dados iniciais ──────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      computadoresApi.listar().then(setPcs),
      salasApi.listar().then(setSls),
    ])
      .catch(() => setError('Não foi possível carregar os dados. Recarregue a página.'))
      .finally(() => setLoadingDados(false));
  }, []);

  // ── Busca horários ocupados ─────────────────────────────────────────────────

  const buscarOcupados = useCallback(async () => {
    if (!diaSelecionado || itensSelecionados.length === 0) {
      setOcupados({});
      return;
    }
    setLoadingOcupados(true);
    try {
      const resultados = await Promise.all(
        itensSelecionados.map(async (id) => {
          const dados: Array<{ inicio?: string; fim?: string } | string> =
            tipo === 'computador'
              ? await reservasComputador.ocupados(id, diaSelecionado)
              : await reservasSala.ocupados(id, diaSelecionado);

          const ocupadosSet = new Set<string>();
          dados.forEach(entrada => {
            let inicioISO: string;
            let fimISO: string | undefined;
            if (typeof entrada === 'string') {
              inicioISO = entrada;
            } else {
              inicioISO = entrada.inicio ?? '';
              fimISO = entrada.fim;
            }
            if (!inicioISO) return;
            const inicio = new Date(inicioISO);
            if (fimISO) {
              const fim = new Date(fimISO);
              const cursor = new Date(inicio);
              while (cursor < fim) {
                ocupadosSet.add(formatHora(cursor));
                cursor.setMinutes(cursor.getMinutes() + DURACAO);
              }
            } else {
              ocupadosSet.add(inicioISO.substring(11, 16));
            }
          });
          return { id, ocupadosSet };
        })
      );
      const mapa: Record<number, Set<string>> = {};
      resultados.forEach(({ id, ocupadosSet }) => { mapa[id] = ocupadosSet; });
      setOcupados(mapa);
      setBlocosSelecionados(prev =>
        prev.filter(bloco => {
          const horaBloco = formatHora(bloco);
          return !resultados.some(({ ocupadosSet }) => ocupadosSet.has(horaBloco));
        })
      );
    } catch {
      // silencioso
    } finally {
      setLoadingOcupados(false);
    }
  }, [diaSelecionado, itensSelecionados, tipo]);

  useEffect(() => { buscarOcupados(); }, [buscarOcupados]);

  // ── Helpers de estado ───────────────────────────────────────────────────────

  const trocarTipo = (t: Tipo) => {
    setTipo(t);
    setItensSelecionados([]);
    setBlocosSelecionados([]);
    setOcupados({});
    setQtdePessoas(1);
  };

  const toggleItem = (id: number) => {
    setItensSelecionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setBlocosSelecionados([]);
  };

  const toggleBloco = (bloco: Date) => {
    setBlocosSelecionados(prev => {
      const existe = prev.find(b => b.getTime() === bloco.getTime());
      return existe
        ? prev.filter(b => b.getTime() !== bloco.getTime())
        : [...prev, bloco];
    });
  };

  const handleDiaSelecionado = (key: string) => {
    setDiaSelecionado(key);
    setBlocosSelecionados([]);
  };

  // ── Dados derivados ─────────────────────────────────────────────────────────

  const itensDisponiveis = tipo === 'computador'
    ? pcs.filter(p => p.ativo)
    : sls.filter(s => s.ativo);

  const maxPessoas = (() => {
    if (itensSelecionados.length === 0) return 1;
    if (tipo === 'computador') {
      return pcs.filter(p => itensSelecionados.includes(p.id))
        .reduce((acc, p) => acc + p.capacidadePessoas, 0);
    }
    return sls.filter(s => itensSelecionados.includes(s.id))
      .reduce((acc, s) => acc + s.capacidadePessoas, 0);
  })();

  const blocos = diaSelecionado ? gerarBlocos(new Date(diaSelecionado + 'T00:00:00')) : [];
  const agora = new Date();
  const grupos = agruparConsecutivos(blocosSelecionados);
  const totalRequisicoes = blocosSelecionados.length * itensSelecionados.length;

  const blocoEstaOcupado = (bloco: Date): boolean => {
    const hora = formatHora(bloco);
    return itensSelecionados.some(id => ocupados[id]?.has(hora));
  };

  const BLOCOS_MAX_SEM_APROVACAO = 3;

  const precisaAprovacao = (() => {
    if (isAdmin) return false;
    if (tipo === 'computador') {
        return itensSelecionados.length > 2 || maiorSequencia(blocosSelecionados) > BLOCOS_MAX_SEM_APROVACAO;
    } else {
        return itensSelecionados.length > 1 || maiorSequencia(blocosSelecionados) > BLOCOS_MAX_SEM_APROVACAO;
    }
})();
  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isAdmin && !usuarioVinculado) { setError('Vincule um usuário à reserva.'); return; }
    if (itensSelecionados.length === 0) {
      setError(`Selecione pelo menos ${tipo === 'computador' ? 'um computador' : 'uma sala'}.`);
      return;
    }
    if (blocosSelecionados.length === 0) { setError('Selecione pelo menos um horário.'); return; }
    if (!saoConsecutivos(blocosSelecionados)) {
      setError('Os horários selecionados precisam ser consecutivos. Selecione blocos em sequência, sem intervalos entre eles.');
      return;
    }

    setSubmitting(true);
    try {
      const gruposOrdenados = agruparConsecutivos(blocosSelecionados);
      for (const grupo of gruposOrdenados) {
        await pedidosApi.criar({
          tipo: tipo === 'computador' ? 'COMPUTADOR' : 'SALA',
          itemIds: itensSelecionados,
          inicioPrevisto: toISOLocal(grupo.inicio),
          fimPrevisto: toISOLocal(grupo.fim),
          qtdePessoas: Math.min(qtdePessoas, maxPessoas),
          observacao: observacao || undefined,
          ...(isAdmin && usuarioVinculado ? { usuarioId: usuarioVinculado.id } : {}),
        });
      }
      const total = gruposOrdenados.length;
      setSuccess(
        `${total} pedido${total !== 1 ? 's' : ''} criado${total !== 1 ? 's' : ''} com sucesso!` +
        (precisaAprovacao ? ' Aguardando aprovação.' : '')
      );
      setTimeout(() => router.push(isAdmin ? '/dashboard/admin' : '/dashboard/usuario'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar reserva');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div>
        <h1 className="page-title">Nova Reserva</h1>
      </div>

      {precisaAprovacao && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Aprovação necessária</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {tipo === 'computador' && itensSelecionados.length > 2 && 'Mais de 2 computadores selecionados. '}
              {tipo === 'sala' && itensSelecionados.length > 1 && 'Mais de 1 sala selecionada. '}
              {maiorSequencia(blocosSelecionados) > BLOCOS_MAX_SEM_APROVACAO && 'Duração superior a 2h25min. '}
              Esta reserva ficará pendente até aprovação.
            </p>
          </div>
        </div>
      )}

      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Computadores: mais de 2 ao mesmo tempo ou duração superior a 2h15min requer aprovação</li>
          <li>• Salas: mais de 1 sala ou duração superior a 2h15min requer aprovação</li>
          <li>• Check-in: permitido a partir de 5 minutos antes do início e até 15 minutos após — após esse prazo a reserva é cancelada automaticamente</li>
          <li>• Cancelamento: permitido até 1 hora antes do horário de início</li>
          <li>• Check-out: ao encerrar o uso antes do horário previsto, realize o check-out para liberar o espaço para outros usuários</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ADMIN — Vincular usuário */}
        {isAdmin && (
          <div className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Usuário responsável pela reserva</p>
            {usuarioVinculado ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                <div>
                  <p className="font-semibold text-sm text-blue-800 dark:text-blue-300">{usuarioVinculado.nome}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    CPF: {maskCpf(usuarioVinculado.cpf)} · {usuarioVinculado.email}
                  </p>
                </div>
                <button type="button" onClick={() => setUsuarioVinculado(null)}
                  className="ml-3 shrink-0 text-xs text-blue-600 hover:underline underline-offset-2 font-medium">
                  Trocar
                </button>
              </div>
            ) : <BuscaUsuario onSelecionar={setUsuarioVinculado} />}
          </div>
        )}

        {/* Usuário comum */}
        {!isAdmin && user && (
          <div className="card p-4 bg-[var(--surface-2)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{user.email[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{user.email}</p>
              <p className="text-xs text-[var(--text-muted)]">Reserva será vinculada à sua conta</p>
            </div>
          </div>
        )}

        {/* 1 — Tipo */}
        <Secao numero={1} titulo="O que deseja reservar?">
          <div className="grid grid-cols-2 gap-3">
            {(['computador', 'sala'] as Tipo[]).map(t => (
              <button key={t} type="button" onClick={() => trocarTipo(t)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${tipo === t
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-[var(--border)] hover:border-blue-300'}`}>
                <p className={`text-sm font-semibold ${tipo === t ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--text-primary)]'}`}>
                  {t === 'computador' ? 'Computador' : 'Sala de Estudos'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {t === 'computador' ? 'Até 2 pessoas por PC' : 'Até 5 pessoas por sala'}
                </p>
              </button>
            ))}
          </div>
        </Secao>

        {/* 2 — Itens */}
        <Secao
          numero={2}
          titulo={tipo === 'computador'
            ? `Selecione o(s) computador(es)${itensSelecionados.length > 0 ? ` — ${itensSelecionados.length} selecionado${itensSelecionados.length !== 1 ? 's' : ''}` : ''}`
            : `Selecione a(s) sala(s)${itensSelecionados.length > 0 ? ` — ${itensSelecionados.length} selecionada${itensSelecionados.length !== 1 ? 's' : ''}` : ''}`}
        >
          {loadingDados ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-16 rounded-lg shimmer" />)}
            </div>
          ) : itensDisponiveis.length === 0 ? (
            <EmptyState message={`Nenhum ${tipo === 'computador' ? 'computador' : 'sala'} disponível no momento.`} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {itensDisponiveis.map(item => {
                const sel = itensSelecionados.includes(item.id);
                const nome = tipo === 'computador' ? (item as Computador).codigo : (item as Sala).nome;
                const cap = tipo === 'computador'
                  ? (item as Computador).capacidadePessoas
                  : (item as Sala).capacidadePessoas;
                return (
                  <button key={item.id} type="button" onClick={() => toggleItem(item.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all relative ${sel
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-[var(--border)] hover:border-blue-300'}`}>
                    {sel && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <p className={`text-sm font-semibold ${tipo === 'computador' ? 'font-mono' : ''} ${sel ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--text-primary)]'}`}>
                      {nome}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      até {cap} pessoa{cap !== 1 ? 's' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </Secao>

        {/* 3 — Quantidade de pessoas */}
        {itensSelecionados.length > 0 && (
          <Secao numero={3} titulo="Quantidade de pessoas">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={maxPessoas}
                value={Math.min(qtdePessoas, maxPessoas)}
                onChange={e => setQtdePessoas(Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <span className="w-10 text-center font-bold text-xl text-[var(--text-primary)]">
                {Math.min(qtdePessoas, maxPessoas)}
              </span>
            </div>
          </Secao>
        )}

        {/* 4 — Dia com navegação por mês */}
        {itensSelecionados.length > 0 && (
          <Secao numero={4} titulo="Escolha o dia">
            <SeletorDia
              diaSelecionado={diaSelecionado}
              onSelecionar={handleDiaSelecionado}
            />
          </Secao>
        )}

        {/* 5 — Horários */}
        {diaSelecionado && (
          <Secao numero={5} titulo="Escolha os horários">
            {loadingOcupados ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-8 w-16 rounded-lg shimmer" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Selecionado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border border-[var(--border)] inline-block" /> Disponível
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[var(--border)] inline-block opacity-40" /> Indisponível
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {blocos.map(bloco => {
                    const sel = !!blocosSelecionados.find(b => b.getTime() === bloco.getTime());
                    const passado = bloco <= agora;
                    const ocupado = blocoEstaOcupado(bloco);
                    const desabilitado = passado || ocupado;
                    return (
                      <button
                        key={bloco.getTime()}
                        type="button"
                        onClick={() => !desabilitado && toggleBloco(bloco)}
                        disabled={desabilitado}
                        title={ocupado ? 'Horário já reservado' : passado ? 'Horário passado' : undefined}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${desabilitado
                          ? 'opacity-25 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)] bg-[var(--surface-2)]'
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

                {blocosSelecionados.length > 1 && !saoConsecutivos(blocosSelecionados) && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                    Os horários selecionados não são consecutivos. Selecione blocos em sequência para continuar.
                  </div>
                )}

                {grupos.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-[var(--border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Resumo</p>
                      <button type="button" onClick={() => setBlocosSelecionados([])}
                        className="text-xs text-rose-500 hover:underline">
                        Limpar
                      </button>
                    </div>
                    {grupos.map((g, i) => {
                      const minutos = (g.fim.getTime() - g.inicio.getTime()) / 60000;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs bg-[var(--surface-2)] rounded-lg px-3 py-2">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {formatHora(g.inicio)} → {formatHora(g.fim)}
                          </span>
                          <span className="text-[var(--text-muted)]">
                            {g.qtd} bloco{g.qtd !== 1 ? 's' : ''} · {minutos}min
                          </span>
                        </div>
                      );
                    })}
                    {itensSelecionados.length > 0 && (
                      <p className="text-xs text-blue-600 font-medium">
                        {totalRequisicoes} reserva{totalRequisicoes !== 1 ? 's' : ''} serão criadas
                        {precisaAprovacao ? ' — aguardam aprovação' : ''}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </Secao>
        )}

        {/* 6 — Observação */}
        {blocosSelecionados.length > 0 && (
          <Secao numero={6} titulo={<>Observação <span className="font-normal text-[var(--text-muted)]">(opcional)</span></>}>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={2}
              placeholder="Ex: Trabalho em grupo de programação..."
              className="input-field h-auto py-3 resize-none"
            />
          </Secao>
        )}

        <Alert message={error} />
        <Alert message={success} type="success" />

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
            Voltar
          </button>
          <button
            type="submit"
            disabled={
              submitting ||
              itensSelecionados.length === 0 ||
              blocosSelecionados.length === 0 ||
              (isAdmin && !usuarioVinculado)
            }
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : precisaAprovacao ? 'Solicitar aprovação' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </div>
  );
}