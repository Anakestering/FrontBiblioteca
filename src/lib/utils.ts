import { StatusReserva, StatusAprovacao } from '@/types';

// Mascaras cpf e numero
export function maskCpf(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

export function maskTel(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

// ─── Status Labels ────────────────────────────────────────────────────────────

export const statusReservaLabel: Record<StatusReserva, string> = {
  PENDENTE_APROVACAO: 'Aguardando Aprovação',
  APROVADA: 'Aprovada',
  CANCELADA: 'Cancelada',
  ATRASADO: 'Atrasado',
  EM_ANDAMENTO: 'Em Andamento',
  FINALIZADA: 'Finalizada',
  REJEITADA: 'Rejeitada',
};

export const statusReservaColor: Record<StatusReserva, string> = {
  PENDENTE_APROVACAO: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APROVADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  CANCELADA: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  ATRASADO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  EM_ANDAMENTO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  FINALIZADA: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  REJEITADA: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

export const statusAprovacaoLabel: Record<StatusAprovacao, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
};

// ─── Date/Time Utilities ──────────────────────────────────────────────────────

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Business Rules ───────────────────────────────────────────────────────────

/** Can the user cancel this reservation? (up to 1h before start) */
export function canCancel(inicioPrevisto: string): boolean {
  const start = new Date(inicioPrevisto);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  return diffMs > 60 * 60 * 1000; // > 1 hour
}

/** Can checkin be done now? (5min before to 15min after start) */
export function canCheckin(inicioPrevisto: string): boolean {
  const start = new Date(inicioPrevisto);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return diffMs >= -5 * 60 * 1000 && diffMs <= 15 * 60 * 1000;
}

/** Format duration in "tempos" (each = 45 min) */
export function formatTempos(inicio: string, fim: string): string {
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  const tempos = Math.round(ms / (45 * 60 * 1000));
  return `${tempos} tempo${tempos !== 1 ? 's' : ''} (${tempos * 45}min)`;
}

/** Build a datetime-local input value from a Date */
export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


export const DURACAO = 45;
export const HORA_INICIO = 7;
export const HORA_FIM = 22;

export function addMin(date: Date, min: number) {
  return new Date(date.getTime() + min * 60000);
}

export function formatHora(date: Date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Serializa um Date para o formato ISO local sem fuso (yyyy-MM-ddTHH:mm:ss).
 * - endOfDay=false (padrão) → zera a hora para 00:00:00 (início do dia)
 * - endOfDay=true           → seta 23:59:59.999 (fim do dia)
 * Usado por todos os endpoints de estatísticas.
 */
export function toISOLocal(d: Date, endOfDay = false): string {
  const date = new Date(d);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 19);
}

// ─── Período helpers (compartilhado por FiltroPeriodoInline e FiltrosBarras) ──

export interface PeriodoFiltro {
  inicio: Date | null;
  fim: Date | null;
}

export type PeriodoPreset = 'semana' | 'mes' | 'ano' | 'personalizado';

export function calcularDatas(periodo: PeriodoPreset): PeriodoFiltro {
  const hoje = new Date();
  if (periodo === 'semana') {
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - hoje.getDay() + 1);
    seg.setHours(0, 0, 0, 0);
    return { inicio: seg, fim: hoje };
  }
  if (periodo === 'mes') return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1), fim: hoje };
  if (periodo === 'ano') return { inicio: new Date(hoje.getFullYear(), 0, 1), fim: hoje };
  return { inicio: null, fim: null };
}

export function detectarPeriodo(valor: PeriodoFiltro): PeriodoPreset {
  if (!valor.inicio || !valor.fim) return 'personalizado';
  const fmt = (d: Date) => d.toDateString();
  if (fmt(valor.inicio) === fmt(calcularDatas('semana').inicio!)) return 'semana';
  if (fmt(valor.inicio) === fmt(calcularDatas('mes').inicio!))    return 'mes';
  if (fmt(valor.inicio) === fmt(calcularDatas('ano').inicio!))    return 'ano';
  return 'personalizado';
}

export function gerarBlocos(dia: Date): Date[] {
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

export function agruparConsecutivos(blocos: Date[]): { inicio: Date; fim: Date; qtd: number }[] {
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

export function maiorSequencia(blocos: Date[]): number {
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

export function saoConsecutivos(blocos: Date[]): boolean {
  if (blocos.length <= 1) return true;
  const grupos = agruparConsecutivos(blocos);
  return grupos.length === 1;
}