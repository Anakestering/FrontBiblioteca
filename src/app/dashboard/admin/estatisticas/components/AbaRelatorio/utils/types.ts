import type {
  EstatisticasResumoDTO,
  EstatisticasStatusReservasDTO,
  EstatisticasOcupacaoDiaDTO,
  EstatisticasRecursoDTO,
  EstatisticasUsuariosDTO,
} from '@/types';

// ─── Período ──────────────────────────────────────────────────────────────────

export interface ReportPeriodo {
  inicio: Date | null;
  fim: Date | null;
}

// ─── Dados do relatório geral ─────────────────────────────────────────────────

export interface ReportData {
  periodo: ReportPeriodo;
  geradoEm: Date;
  resumo: EstatisticasResumoDTO | null;
  status: EstatisticasStatusReservasDTO | null;
  ocupacao: EstatisticasOcupacaoDiaDTO[];
  salas: EstatisticasRecursoDTO[];
  computadores: EstatisticasRecursoDTO[];
  usuarios: EstatisticasUsuariosDTO | null;
}

// ─── Seções disponíveis ───────────────────────────────────────────────────────

export type SectionId =
  | 'resumo'
  | 'status'
  | 'ocupacao'
  | 'salas'
  | 'computadores'
  | 'usuarios';

export interface SectionMeta {
  id: SectionId;
  label: string;
  descricao: string;
}

export const SECTIONS: SectionMeta[] = [
  { id: 'resumo',       label: 'Visão Geral',             descricao: 'KPIs principais do período' },
  { id: 'status',       label: 'Status das Reservas',     descricao: 'Finalizadas, canceladas, atrasadas e rejeitadas' },
  { id: 'ocupacao',     label: 'Ocupação por Dia',        descricao: 'Taxa de ocupação de segunda a sexta' },
  { id: 'salas',        label: 'Uso de Salas',            descricao: 'Ranking de uso por sala' },
  { id: 'computadores', label: 'Uso de Computadores',     descricao: 'Ranking de uso por computador' },
  { id: 'usuarios',     label: 'Usuários',                descricao: 'Totais, distribuição por tipo e crescimento' },
];

// ─── Estado de geração ────────────────────────────────────────────────────────

export type GenerateStatus = 'idle' | 'loading' | 'ready' | 'error';
