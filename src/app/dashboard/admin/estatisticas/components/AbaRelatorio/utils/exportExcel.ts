import { zipSync, strToU8 } from 'fflate';
import type { ReportData } from './types';

function fmtPeriodo(data: ReportData): string {
  const fmt = (d: Date | null) => d ? d.toLocaleDateString('pt-BR') : null;
  const ini = fmt(data.periodo.inicio);
  const fim = fmt(data.periodo.fim);
  if (!ini && !fim) return 'Todo o periodo';
  if (!ini) return `Ate ${fim}`;
  if (!fim) return `A partir de ${ini}`;
  return `${ini} a ${fim}`;
}

function minToHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
}

function pct(val: number, total: number): string {
  return total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '-';
}

function esc(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="13"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E40AF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFBFDBFE"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE0E7FF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD1D5DB"/></left>
      <right style="thin"><color rgb="FFD1D5DB"/></right>
      <top style="thin"><color rgb="FFD1D5DB"/></top>
      <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;

type CellStyle = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function colToLetter(col: number): string {
  let s = '';
  col += 1;
  while (col > 0) {
    const rem = (col - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

function cell(col: number, row: number, value: string | number | null, style: CellStyle = 0): string {
  const ref = `${colToLetter(col)}${row}`;
  const s = style > 0 ? ` s="${style}"` : '';
  if (value == null || value === '') return `<c r="${ref}"${s}/>`;
  if (typeof value === 'number') return `<c r="${ref}"${s} t="n"><v>${value}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t>${esc(value)}</t></is></c>`;
}

class SheetBuilder {
  private rows: string[] = [];
  private merges: string[] = [];
  private rowIdx = 1;
  private maxCol = 0;

  addRow(data: (string | number | null)[], style: CellStyle, height?: number) {
    const h = height ? ` ht="${height}" customHeight="1"` : '';
    const cells = data.map((v, ci) => { this.maxCol = Math.max(this.maxCol, ci + 1); return cell(ci, this.rowIdx, v, style); }).join('');
    this.rows.push(`<row r="${this.rowIdx}"${h}>${cells}</row>`);
    this.rowIdx++;
  }

  addMerged(value: string | number | null, style: CellStyle, colspan: number, height?: number) {
    const h = height ? ` ht="${height}" customHeight="1"` : '';
    this.maxCol = Math.max(this.maxCol, colspan);
    this.rows.push(`<row r="${this.rowIdx}"${h}>${cell(0, this.rowIdx, value, style)}</row>`);
    this.merges.push(`<mergeCell ref="A${this.rowIdx}:${colToLetter(colspan - 1)}${this.rowIdx}"/>`);
    this.rowIdx++;
  }

  addEmpty() {
    this.rows.push(`<row r="${this.rowIdx}" ht="6" customHeight="1"/>`);
    this.rowIdx++;
  }

  build(colWidths: number[]): string {
    const cols = colWidths.map((w, i) => `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
    const mc = this.merges.length > 0 ? `<mergeCells count="${this.merges.length}">${this.merges.join('')}</mergeCells>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetView workbookViewId="0" showGridLines="0"/><cols>${cols}</cols><sheetData>${this.rows.join('')}</sheetData>${mc}</worksheet>`;
  }
}

function buildSheet(data: ReportData): string {
  const s = new SheetBuilder();
  const periodo = fmtPeriodo(data);
  const geradoEm = data.geradoEm.toLocaleString('pt-BR');
  const COLS = 5;

  const salaMaisUsada = data.salas.length > 0
    ? [...data.salas].sort((a, b) => b.totalReservasFinalizadas - a.totalReservasFinalizadas)[0].nome
    : '-';
  const pcMaisUsado = data.computadores.length > 0
    ? [...data.computadores].sort((a, b) => b.totalReservasFinalizadas - a.totalReservasFinalizadas)[0].nome
    : '-';

  s.addMerged('Relatorio Geral — Biblioteca', 4, COLS, 22);
  s.addRow([`Periodo: ${periodo}`, '', '', `Gerado em: ${geradoEm}`, ''], 0);
  s.addEmpty();

  if (data.resumo) {
    const r = data.resumo;
    s.addMerged('Visao Geral', 2, COLS, 16);
    s.addRow(['Metrica', 'Valor'], 1);
    ([
      ['Total de Pedidos', r.totalPedidos],
      ['Total de Reservas', r.totalReservas],
      ['Taxa de Ocupacao Media', `${r.taxaOcupacaoMedia.toFixed(1)}%`],
      ['Taxa de No-Show', `${r.taxaNoShow.toFixed(1)}%`],
      ['Sala Mais Usada', salaMaisUsada],
      ['PC Mais Usado', pcMaisUsado],
    ] as [string, string | number][]).forEach(([k, v], i) => s.addRow([k, v], i % 2 === 0 ? 5 : 6));
    s.addEmpty();
  }

  if (data.status) {
    const st = data.status;
    const total = st.total || 1;
    s.addMerged('Status das Reservas', 2, COLS, 16);
    s.addRow(['Status', 'Quantidade', 'Percentual'], 1);
    [
      ['Finalizadas', st.finalizadas, pct(st.finalizadas, total)],
      ['Canceladas',  st.canceladas,  pct(st.canceladas,  total)],
      ['Atrasadas',   st.atrasadas,   pct(st.atrasadas,   total)],
      ['Rejeitadas',  st.rejeitadas,  pct(st.rejeitadas,  total)],
    ].forEach((row, i) => s.addRow(row as (string | number)[], i % 2 === 0 ? 5 : 6));
    s.addRow(['Total', st.total, '100%'], 3);
    s.addEmpty();
  }

  if (data.ocupacao.length > 0) {
    s.addMerged('Ocupacao por Dia da Semana', 2, COLS, 16);
    s.addRow(['Dia', 'Taxa de Ocupacao'], 1);
    data.ocupacao.forEach((o, i) => s.addRow([o.nome, `${o.taxaOcupacao.toFixed(1)}%`], i % 2 === 0 ? 5 : 6));
    s.addEmpty();
  }

  if (data.salas.length > 0) {
    s.addMerged('Uso de Salas', 2, COLS, 16);
    s.addRow(['Sala', 'Reservas', 'Tempo Usado', 'Ocupacao'], 1);
    data.salas.forEach((sl, i) => s.addRow([
      sl.nome, sl.totalReservasFinalizadas, minToHoras(sl.totalMinutosUsados),
      sl.minutosDisponiveis > 0 ? pct(sl.totalMinutosUsados, sl.minutosDisponiveis) : '-',
    ], i % 2 === 0 ? 5 : 6));
    s.addEmpty();
  }

  if (data.computadores.length > 0) {
    s.addMerged('Uso de Computadores', 2, COLS, 16);
    s.addRow(['Computador', 'Reservas', 'Tempo Usado', 'Ocupacao'], 1);
    data.computadores.forEach((c, i) => s.addRow([
      c.nome, c.totalReservasFinalizadas, minToHoras(c.totalMinutosUsados),
      c.minutosDisponiveis > 0 ? pct(c.totalMinutosUsados, c.minutosDisponiveis) : '-',
    ], i % 2 === 0 ? 5 : 6));
    s.addEmpty();
  }

  if (data.usuarios) {
    const u = data.usuarios;
    s.addMerged('Usuarios', 2, COLS, 16);
    s.addRow(['Metrica', 'Valor'], 1);
    s.addRow(['Total Cadastrados', u.totalCadastrados], 5);
    s.addRow(['Total Ativos', u.totalAtivos], 6);
    s.addEmpty();

    if (u.distribuicao.length > 0) {
      s.addMerged('Distribuicao por Tipo', 2, COLS, 16);
      s.addRow(['Tipo', 'Finalizadas', 'Abandonos', 'Cancelamentos', '% Fin.'], 1);
      u.distribuicao.forEach((d, i) => {
        const tot = d.pedidosFinalizados + d.totalAbandonos + d.totalCancelamentos;
        s.addRow([d.tipo, d.pedidosFinalizados, d.totalAbandonos, d.totalCancelamentos,
          tot > 0 ? pct(d.pedidosFinalizados, tot) : '-'], i % 2 === 0 ? 5 : 6);
      });
      s.addEmpty();
    }

    if (u.crescimento.length > 0) {
      s.addMerged('Crescimento Mensal', 2, COLS, 16);
      s.addRow(['Mes', 'Novos Cadastros', 'Primeiro Uso'], 1);
      u.crescimento.forEach((c, i) => s.addRow([c.mes, c.novosCadastros, c.primeiroUso], i % 2 === 0 ? 5 : 6));
    }
  }

  return s.build([34, 16, 16, 16, 16]);
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatorio Geral" sheetId="1" r:id="rId1"/></sheets></workbook>`;
const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

export function exportToExcel(data: ReportData, filename = 'relatorio'): void {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml':        strToU8(CONTENT_TYPES),
    '_rels/.rels':                strToU8(ROOT_RELS),
    'xl/workbook.xml':            strToU8(WORKBOOK),
    'xl/_rels/workbook.xml.rels': strToU8(WORKBOOK_RELS),
    'xl/styles.xml':              strToU8(STYLES_XML),
    'xl/worksheets/sheet1.xml':   strToU8(buildSheet(data)),
  };
  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0,16).replace('T','_').replace(':','-');
  a.href = url;
  a.download = `${filename}_${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
