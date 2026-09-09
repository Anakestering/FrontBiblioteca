'use client';

import type { ReportData } from '../utils/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minToHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
}

function ocupacaoPct(usado: number, disponivel: number): string {
  if (disponivel <= 0) return '—';
  return `${((usado / disponivel) * 100).toFixed(1)}%`;
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] px-3 py-2 bg-[var(--surface-2)] ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={`px-3 py-2 text-sm text-[var(--text-primary)] border-t border-[var(--border)] ${right ? 'text-right tabular-nums' : ''}`}>
      {children}
    </td>
  );
}

interface TableProps {
  headers: { label: string; right?: boolean }[];
  children: React.ReactNode;
}

function Table({ headers, children }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr>{headers.map(h => <Th key={h.label} right={h.right}>{h.label}</Th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full bg-blue-500 shrink-0" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function NoPeriodoNote() {
  return (
    <p className="text-[11px] text-amber-400/70 mt-1">
      * Selecione um período para calcular a % de ocupação.
    </p>
  );
}

// ─── Preview do relatório ─────────────────────────────────────────────────────

export function SectionPreview({ data }: { data: ReportData }) {
  const salaMaisUsada = data.salas.length > 0
    ? [...data.salas].sort((a, b) => b.totalReservasFinalizadas - a.totalReservasFinalizadas)[0].nome
    : '—';
  const pcMaisUsado = data.computadores.length > 0
    ? [...data.computadores].sort((a, b) => b.totalReservasFinalizadas - a.totalReservasFinalizadas)[0].nome
    : '—';

  return (
    <div className="space-y-8">

      {/* Visão Geral */}
      {data.resumo && (
        <SectionBlock title="Visão Geral">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total de Pedidos',      value: data.resumo.totalPedidos },
              { label: 'Total de Reservas',      value: data.resumo.totalReservas },
              { label: 'Taxa de Ocupação Média', value: `${data.resumo.taxaOcupacaoMedia.toFixed(1)}%` },
              { label: 'Taxa de No-Show',        value: `${data.resumo.taxaNoShow.toFixed(1)}%` },
              { label: 'Sala Mais Usada',        value: salaMaisUsada },
              { label: 'PC Mais Usado',          value: pcMaisUsado },
            ].map(({ label, value }) => (
              <div key={label} className="card p-3">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{value ?? '—'}</p>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Status das Reservas */}
      {data.status && (
        <SectionBlock title="Status das Reservas">
          <Table headers={[
            { label: 'Status' },
            { label: 'Quantidade', right: true },
            { label: '%',          right: true },
          ]}>
            {([
              ['Finalizadas', data.status.finalizadas],
              ['Canceladas',  data.status.canceladas],
              ['Atrasadas',   data.status.atrasadas],
              ['Rejeitadas',  data.status.rejeitadas],
            ] as [string, number][]).map(([label, val]) => {
              const total = data.status!.total || 1;
              return (
                <tr key={label}>
                  <Td>{label}</Td>
                  <Td right>{val}</Td>
                  <Td right>{((val / total) * 100).toFixed(1)}%</Td>
                </tr>
              );
            })}
            <tr className="font-semibold bg-[var(--surface-2)]">
              <Td>Total</Td>
              <Td right>{data.status.total}</Td>
              <Td right>100%</Td>
            </tr>
          </Table>
        </SectionBlock>
      )}

      {/* Ocupação por Dia */}
      {data.ocupacao.length > 0 && (
        <SectionBlock title="Ocupação por Dia da Semana">
          <Table headers={[
            { label: 'Dia' },
            { label: 'Taxa de Ocupação', right: true },
          ]}>
            {data.ocupacao.map(o => (
              <tr key={o.nome}>
                <Td>{o.nome}</Td>
                <Td right>{o.taxaOcupacao.toFixed(1)}%</Td>
              </tr>
            ))}
          </Table>
        </SectionBlock>
      )}

      {/* Salas */}
      {data.salas.length > 0 && (
        <SectionBlock title="Uso de Salas">
          <Table headers={[
            { label: 'Sala' },
            { label: 'Reservas',    right: true },
            { label: 'Tempo Usado', right: true },
            { label: 'Ocupação',    right: true },
          ]}>
            {data.salas.map(s => (
              <tr key={s.id}>
                <Td>{s.nome}</Td>
                <Td right>{s.totalReservasFinalizadas}</Td>
                <Td right>{minToHoras(s.totalMinutosUsados)}</Td>
                <Td right>{ocupacaoPct(s.totalMinutosUsados, s.minutosDisponiveis)}</Td>
              </tr>
            ))}
          </Table>
          {data.salas.some(s => s.minutosDisponiveis === 0) && <NoPeriodoNote />}
        </SectionBlock>
      )}

      {/* Computadores */}
      {data.computadores.length > 0 && (
        <SectionBlock title="Uso de Computadores">
          <Table headers={[
            { label: 'Computador' },
            { label: 'Reservas',    right: true },
            { label: 'Tempo Usado', right: true },
            { label: 'Ocupação',    right: true },
          ]}>
            {data.computadores.map(c => (
              <tr key={c.id}>
                <Td>{c.nome}</Td>
                <Td right>{c.totalReservasFinalizadas}</Td>
                <Td right>{minToHoras(c.totalMinutosUsados)}</Td>
                <Td right>{ocupacaoPct(c.totalMinutosUsados, c.minutosDisponiveis)}</Td>
              </tr>
            ))}
          </Table>
          {data.computadores.some(c => c.minutosDisponiveis === 0) && <NoPeriodoNote />}
        </SectionBlock>
      )}

      {/* Usuários */}
      {data.usuarios && (
        <>
          <SectionBlock title="Usuários — Totais">
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Total Cadastrados</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{data.usuarios.totalCadastrados}</p>
              </div>
              <div className="card p-3">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Total Ativos</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{data.usuarios.totalAtivos}</p>
              </div>
            </div>
          </SectionBlock>

          {data.usuarios.distribuicao.length > 0 && (
            <SectionBlock title="Distribuição por Tipo">
              <Table headers={[
                { label: 'Tipo' },
                { label: 'Finalizadas',   right: true },
                { label: 'Abandonos',     right: true },
                { label: 'Cancelamentos', right: true },
                { label: '% Fin.',        right: true },
              ]}>
                {data.usuarios.distribuicao.map(d => {
                  const tot = d.pedidosFinalizados + d.totalAbandonos + d.totalCancelamentos;
                  return (
                    <tr key={d.tipo}>
                      <Td>{d.tipo}</Td>
                      <Td right>{d.pedidosFinalizados}</Td>
                      <Td right>{d.totalAbandonos}</Td>
                      <Td right>{d.totalCancelamentos}</Td>
                      <Td right>{tot > 0 ? `${((d.pedidosFinalizados / tot) * 100).toFixed(1)}%` : '—'}</Td>
                    </tr>
                  );
                })}
              </Table>
            </SectionBlock>
          )}

          {data.usuarios.crescimento.length > 0 && (
            <SectionBlock title="Crescimento Mensal">
              <Table headers={[
                { label: 'Mês' },
                { label: 'Novos Cadastros', right: true },
                { label: 'Primeiro Uso',    right: true },
              ]}>
                {data.usuarios.crescimento.map(c => (
                  <tr key={c.mes}>
                    <Td>{c.mes}</Td>
                    <Td right>{c.novosCadastros}</Td>
                    <Td right>{c.primeiroUso}</Td>
                  </tr>
                ))}
              </Table>
            </SectionBlock>
          )}
        </>
      )}

    </div>
  );
}
