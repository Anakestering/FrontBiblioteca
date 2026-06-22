import type {
  EstatisticasResumoDTO,
  EstatisticasStatusReservasDTO,
  EstatisticasOcupacaoDiaDTO,
  EstatisticasRecursoDTO,
  EstatisticasUsuariosDTO,
  EstatisticasHeatmapDTO,
} from '@/types';
import type { DadosLinear } from '../../AbaHistorico/Page';

// ─── Período ──────────────────────────────────────────────────────────────────

export interface ReportPeriodo {
  inicio: Date | null;
  fim: Date | null;
}

// ─── Dados do relatório geral (Relatorio Geral) ───────────────────────────────

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

// ─── Snapshot ao vivo (O que estou vendo / Seleção) ──────────────────────────
// Captura o estado atual de cada aba com seus filtros aplicados.

export interface SnapshotHistorico {
  periodo: ReportPeriodo;
  dadosLinear: DadosLinear | null;
  heatmap: EstatisticasHeatmapDTO[];
  picoHorario: string | null;
  ocupacaoDia: EstatisticasOcupacaoDiaDTO[];
}

export interface SnapshotRecursos {
  periodo: ReportPeriodo;
  salas: EstatisticasRecursoDTO[];
  computadores: EstatisticasRecursoDTO[];
  status: EstatisticasStatusReservasDTO | null;
  diasFuturo: number;
}

export interface SnapshotUsuarios {
  periodo: ReportPeriodo;
  data: EstatisticasUsuariosDTO | null;
}

export interface ExportSnapshot {
  capturedAt: Date;
  filtrosGlobais: ReportPeriodo;
  historico: SnapshotHistorico | null;
  recursos: SnapshotRecursos | null;
  usuarios: SnapshotUsuarios | null;
}

// ─── IDs de sub-componentes exportáveis ──────────────────────────────────────

export type ComponenteHistoricoId =
  | 'historico_resumo'
  | 'historico_linear'
  | 'historico_heatmap'
  | 'historico_ocupacao_dia';

export type ComponenteRecursosId =
  | 'recursos_resumo'
  | 'recursos_status'
  | 'recursos_salas'
  | 'recursos_pcs';

export type ComponenteUsuariosId =
  | 'usuarios_resumo'
  | 'usuarios_distribuicao'
  | 'usuarios_ranking'
  | 'usuarios_crescimento';

export type ComponenteId =
  | ComponenteHistoricoId
  | ComponenteRecursosId
  | ComponenteUsuariosId;

export interface ComponenteMeta {
  id: ComponenteId;
  label: string;
  descricao: string;
  aba: 'historico' | 'recursos' | 'usuarios';
  tipo: 'cards' | 'tabela' | 'grafico' | 'grafico_tabela';
}

export const COMPONENTES_META: ComponenteMeta[] = [
  // Histórico
  { id: 'historico_resumo',      aba: 'historico', tipo: 'cards',          label: 'Resumo',              descricao: 'Tendência de pedidos, taxa de abandono e pico horário' },
  { id: 'historico_linear',      aba: 'historico', tipo: 'grafico_tabela', label: 'Gráfico de Pedidos',  descricao: 'Evolução diária de pedidos e abandonos' },
  { id: 'historico_heatmap',     aba: 'historico', tipo: 'grafico_tabela', label: 'Mapa de Calor',       descricao: 'Intensidade de uso por hora e dia da semana' },
  { id: 'historico_ocupacao_dia',aba: 'historico', tipo: 'tabela',         label: 'Ocupação por Dia',    descricao: 'Taxa de ocupação por dia da semana' },
  // Recursos
  { id: 'recursos_resumo',       aba: 'recursos',  tipo: 'cards',          label: 'Resumo',              descricao: 'Total de reservas, no-show e próximas reservas' },
  { id: 'recursos_status',       aba: 'recursos',  tipo: 'grafico_tabela', label: 'Status das Reservas', descricao: 'Finalizadas, canceladas, atrasadas e rejeitadas' },
  { id: 'recursos_salas',        aba: 'recursos',  tipo: 'tabela',         label: 'Uso de Salas',        descricao: 'Reservas e ocupação por sala' },
  { id: 'recursos_pcs',          aba: 'recursos',  tipo: 'tabela',         label: 'Uso de PCs',          descricao: 'Reservas e ocupação por computador' },
  // Usuários
  { id: 'usuarios_resumo',       aba: 'usuarios',  tipo: 'cards',          label: 'Resumo',              descricao: 'Total cadastrados, ativos e crescimento' },
  { id: 'usuarios_distribuicao', aba: 'usuarios',  tipo: 'grafico_tabela', label: 'Distribuição por Tipo', descricao: 'Pedidos finalizados, cancelados e abandonos por tipo' },
  { id: 'usuarios_ranking',      aba: 'usuarios',  tipo: 'tabela',         label: 'Ranking de Usuários', descricao: 'Usuários com mais atividade no período' },
  { id: 'usuarios_crescimento',  aba: 'usuarios',  tipo: 'grafico_tabela', label: 'Crescimento Mensal',  descricao: 'Novos cadastros e primeiros acessos por mês' },
];

// Organizado por aba para facilitar renderização
export const COMPONENTES_POR_ABA = {
  historico: COMPONENTES_META.filter(c => c.aba === 'historico'),
  recursos:  COMPONENTES_META.filter(c => c.aba === 'recursos'),
  usuarios:  COMPONENTES_META.filter(c => c.aba === 'usuarios'),
} as const;

export const ABA_META = [
  { key: 'historico' as const, label: 'Histórico' },
  { key: 'recursos'  as const, label: 'PC / Sala' },
  { key: 'usuarios'  as const, label: 'Usuários' },
];

// ─── Seções relatório geral (mantido para compatibilidade) ────────────────────

export type SectionId =
  | 'resumo' | 'status' | 'ocupacao'
  | 'salas' | 'computadores' | 'usuarios';

export interface SectionMeta {
  id: SectionId;
  label: string;
  descricao: string;
}

export const SECTIONS: SectionMeta[] = [
  { id: 'resumo',       label: 'Visão Geral',         descricao: 'KPIs principais do período' },
  { id: 'status',       label: 'Status das Reservas', descricao: 'Finalizadas, canceladas, atrasadas e rejeitadas' },
  { id: 'ocupacao',     label: 'Ocupação por Dia',    descricao: 'Taxa de ocupação de segunda a sexta' },
  { id: 'salas',        label: 'Uso de Salas',        descricao: 'Ranking de uso por sala' },
  { id: 'computadores', label: 'Uso de Computadores', descricao: 'Ranking de uso por computador' },
  { id: 'usuarios',     label: 'Usuários',            descricao: 'Totais, distribuição por tipo e crescimento' },
];

// ─── Estado de geração ────────────────────────────────────────────────────────

export type GenerateStatus = 'idle' | 'loading' | 'ready' | 'error';
