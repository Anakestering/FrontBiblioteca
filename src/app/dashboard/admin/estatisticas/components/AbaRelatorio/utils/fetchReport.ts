import { relatorios } from '@/lib/api';
import { toISOLocal } from '@/lib/utils';
import type { ReportData, ReportPeriodo } from './types';

// ─── Converte período para params de query ────────────────────────────────────

function toParams(periodo: ReportPeriodo) {
  return {
    inicio: periodo.inicio ? toISOLocal(periodo.inicio) : undefined,
    fim:    periodo.fim    ? toISOLocal(periodo.fim)    : undefined,
  };
}

// ─── Busca todos os dados do relatório geral em paralelo ─────────────────────

export async function fetchReportData(periodo: ReportPeriodo): Promise<ReportData> {
  const params = toParams(periodo);

  const [resumo, status, ocupacao, salas, computadores, usuarios] = await Promise.allSettled([
    relatorios.resumo(params),
    relatorios.status({ ...params, salaIds: [], computadorIds: [] }),
    relatorios.ocupacaoSemana(params),
    relatorios.salas({ ...params, salaIds: [] }),
    relatorios.computadores({ ...params, computadorIds: [] }),
    relatorios.usuarios(params),
  ]);

  // Extrai valor ou null em caso de erro (relatório continua mesmo com falha parcial)
  const get = <T>(result: PromiseSettledResult<T>): T | null =>
    result.status === 'fulfilled' ? result.value : null;

  const getArr = <T>(result: PromiseSettledResult<T[]>): T[] =>
    result.status === 'fulfilled' ? result.value : [];

  return {
    periodo,
    geradoEm: new Date(),
    resumo:       get(resumo),
    status:       get(status),
    ocupacao:     getArr(ocupacao as PromiseSettledResult<any[]>),
    salas:        getArr(salas as PromiseSettledResult<any[]>),
    computadores: getArr(computadores as PromiseSettledResult<any[]>),
    usuarios:     get(usuarios),
  };
}
