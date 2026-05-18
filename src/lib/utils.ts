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
