// ─── Funcionamento da biblioteca ─────────────────────────────────────────────
export const HORA_ABERTURA = 7;
export const HORA_FECHAMENTO = 22;
export const HORAS_DIA = HORA_FECHAMENTO - HORA_ABERTURA; // 15h = 900min
export const MINUTOS_DIA = HORAS_DIA * 60; // 900min

// ─── Dias úteis ───────────────────────────────────────────────────────────────
export function contarDiasUteis(inicio: Date | null, fim: Date | null): number {
  if (!inicio || !fim) return 0;
  let count = 0;
  const cursor = new Date(inicio);
  cursor.setHours(0, 0, 0, 0);
  const fimDia = new Date(fim);
  fimDia.setHours(23, 59, 59, 999);
  while (cursor <= fimDia) {
    const dia = cursor.getDay();
    if (dia !== 0 && dia !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

// ─── Total de minutos disponíveis num período ─────────────────────────────────
export function minutosDisponiveisPeriodo(inicio: Date | null, fim: Date | null): number {
  return contarDiasUteis(inicio, fim) * MINUTOS_DIA;
}