import { zipSync, strToU8 } from 'fflate';
import type { ReportData } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

// ─── Primitivos Word XML ───────────────────────────────────────────────────────

function rPr(opts: { bold?: boolean; color?: string; sz?: number; italic?: boolean } = {}): string {
  let s = '';
  if (opts.bold)   s += '<w:b/>';
  if (opts.italic) s += '<w:i/>';
  if (opts.color)  s += `<w:color w:val="${opts.color}"/>`;
  if (opts.sz)     s += `<w:sz w:val="${opts.sz}"/><w:szCs w:val="${opts.sz}"/>`;
  return s ? `<w:rPr>${s}</w:rPr>` : '';
}

function run(text: string, opts: Parameters<typeof rPr>[0] = {}): string {
  return `<w:r>${rPr(opts)}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function para(
  content: string,
  opts: { spacing?: number; indent?: number; shd?: string; jc?: string } = {}
): string {
  let pPr = '';
  const parts: string[] = [];
  if (opts.shd)     parts.push(`<w:shd w:val="clear" w:color="auto" w:fill="${opts.shd}"/>`);
  if (opts.spacing) parts.push(`<w:spacing w:before="${opts.spacing}" w:after="${opts.spacing}"/>`);
  if (opts.indent)  parts.push(`<w:ind w:left="${opts.indent}"/>`);
  if (opts.jc)      parts.push(`<w:jc w:val="${opts.jc}"/>`);
  if (parts.length) pPr = `<w:pPr>${parts.join('')}</w:pPr>`;
  return `<w:p>${pPr}${content}</w:p>`;
}

// ─── Células de tabela ─────────────────────────────────────────────────────────

interface CellOpts {
  bold?: boolean;
  color?: string;
  bgColor?: string;
  sz?: number;
  width?: number; // em twips (1/1440 inch). 1cm ≈ 567
  span?: number;
  vAlign?: 'center' | 'bottom';
}

function cell(text: string | number, opts: CellOpts = {}): string {
  const tcPrParts: string[] = [];
  if (opts.width) tcPrParts.push(`<w:tcW w:w="${opts.width}" w:type="dxa"/>`);
  if (opts.bgColor) tcPrParts.push(`<w:shd w:val="clear" w:color="auto" w:fill="${opts.bgColor}"/>`);
  if (opts.vAlign) tcPrParts.push(`<w:vAlign w:val="${opts.vAlign}"/>`);
  tcPrParts.push(`<w:tcBorders>
    <w:top    w:val="single" w:sz="4" w:color="D1D5DB"/>
    <w:left   w:val="single" w:sz="4" w:color="D1D5DB"/>
    <w:bottom w:val="single" w:sz="4" w:color="D1D5DB"/>
    <w:right  w:val="single" w:sz="4" w:color="D1D5DB"/>
  </w:tcBorders>`);
  const tcPr = `<w:tcPr>${tcPrParts.join('')}</w:tcPr>`;
  const content = run(String(text ?? '-'), { bold: opts.bold, color: opts.color, sz: opts.sz ?? 18 });
  return `<w:tc>${tcPr}${para(content, { spacing: 40 })}</w:tc>`;
}

function tableRow(cells: string[], shd?: string): string {
  const trPr = shd ? `<w:trPr><w:trHeight w:val="360"/></w:trPr>` : '';
  return `<w:tr>${trPr}${cells.join('')}</w:tr>`;
}

function headerRow(labels: string[], widths?: number[]): string {
  const cells = labels.map((l, i) => cell(l, {
    bold: true, color: 'FFFFFF', bgColor: '1E40AF',
    sz: 18, width: widths?.[i],
  }));
  return tableRow(cells);
}

function dataRow(values: (string | number)[], even: boolean, widths?: number[]): string {
  const bg = even ? 'EFF6FF' : 'FFFFFF';
  const cells = values.map((v, i) => cell(v, { bgColor: bg, sz: 18, width: widths?.[i] }));
  return tableRow(cells);
}

function totalRow(values: (string | number)[], widths?: number[]): string {
  const cells = values.map((v, i) => cell(v, { bold: true, bgColor: 'E0E7FF', sz: 18, width: widths?.[i] }));
  return tableRow(cells);
}

function tbl(rows: string[], totalW = 9072): string {
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${totalW}" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblCellMar>
        <w:left  w:w="80" w:type="dxa"/>
        <w:right w:w="80" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    ${rows.join('')}
  </w:tbl>`;
}

// ─── Elementos de alto nível ──────────────────────────────────────────────────

function docTitle(text: string, sub: string): string {
  return (
    `<w:p>
      <w:pPr><w:shd w:val="clear" w:color="auto" w:fill="1E40AF"/>
        <w:spacing w:before="0" w:after="0"/>
        <w:ind w:left="200" w:right="200"/>
      </w:pPr>
      ${run(text, { bold: true, color: 'FFFFFF', sz: 36 })}
    </w:p>` +
    `<w:p>
      <w:pPr><w:shd w:val="clear" w:color="auto" w:fill="1E40AF"/>
        <w:spacing w:before="0" w:after="200"/>
        <w:ind w:left="200" w:right="200"/>
      </w:pPr>
      ${run(sub, { color: 'BFDBFE', sz: 18 })}
    </w:p>`
  );
}

function sectionTitle(text: string): string {
  return (
    `<w:p><w:pPr><w:spacing w:before="320" w:after="80"/></w:pPr></w:p>` +
    `<w:p>
      <w:pPr>
        <w:pBdr><w:left w:val="single" w:sz="16" w:color="2563EB" w:space="8"/></w:pBdr>
        <w:spacing w:before="0" w:after="120"/>
        <w:ind w:left="160"/>
      </w:pPr>
      ${run(text, { bold: true, color: '1E3A8A', sz: 24 })}
    </w:p>`
  );
}

function kvTable(pairs: [string, string | number][]): string {
  const COL1 = 3500, COL2 = 5572;
  const rows = pairs.map(([k, v], i) =>
    dataRow([k, v ?? '-'], i % 2 === 0, [COL1, COL2])
  );
  return tbl(rows, COL1 + COL2);
}

function dataTable(headers: string[], rows: (string | number)[][], hasTotal = false): string {
  const W = 9072;
  const colW = Math.floor(W / headers.length);
  const widths = headers.map(() => colW);

  const tblRows: string[] = [headerRow(headers, widths)];
  const dataRows = hasTotal ? rows.slice(0, -1) : rows;
  dataRows.forEach((r, i) => tblRows.push(dataRow(r, i % 2 === 0, widths)));
  if (hasTotal && rows.length > 0) tblRows.push(totalRow(rows[rows.length - 1], widths));

  return tbl(tblRows, W);
}

// ─── Construtor do documento ──────────────────────────────────────────────────

function buildDocument(data: ReportData): string {
  const periodo = fmtPeriodo(data);
  const geradoEm = data.geradoEm.toLocaleString('pt-BR');
  const parts: string[] = [];

  const salaMaisUsada = data.salas.length > 0
    ? [...data.salas].sort((a, b) => b.totalReservasFinalizadas - a.totalReservasFinalizadas)[0].nome
    : '-';
  const pcMaisUsado = data.computadores.length > 0
    ? [...data.computadores].sort((a, b) => b.totalReservasFinalizadas - a.totalReservasFinalizadas)[0].nome
    : '-';

  parts.push(docTitle('Relatorio Geral — Biblioteca', `Periodo: ${periodo}   |   Gerado em: ${geradoEm}`));

  // 1. Visao Geral
  if (data.resumo) {
    const r = data.resumo;
    parts.push(sectionTitle('Visao Geral'));
    parts.push(kvTable([
      ['Total de Pedidos',       r.totalPedidos],
      ['Total de Reservas',      r.totalReservas],
      ['Taxa de Ocupacao Media', `${r.taxaOcupacaoMedia.toFixed(1)}%`],
      ['Taxa de No-Show',        `${r.taxaNoShow.toFixed(1)}%`],
      ['Sala Mais Usada',        salaMaisUsada],
      ['PC Mais Usado',          pcMaisUsado],
    ]));
  }

  // 2. Status das Reservas
  if (data.status) {
    const s = data.status;
    const total = s.total || 1;
    parts.push(sectionTitle('Status das Reservas'));
    parts.push(dataTable(
      ['Status', 'Quantidade', 'Percentual'],
      [
        ['Finalizadas', s.finalizadas, pct(s.finalizadas, total)],
        ['Canceladas',  s.canceladas,  pct(s.canceladas,  total)],
        ['Atrasadas',   s.atrasadas,   pct(s.atrasadas,   total)],
        ['Rejeitadas',  s.rejeitadas,  pct(s.rejeitadas,  total)],
        ['Total',       s.total,       '100%'],
      ],
      true,
    ));
  }

  // 3. Ocupacao por Dia
  if (data.ocupacao.length > 0) {
    parts.push(sectionTitle('Ocupacao por Dia da Semana'));
    parts.push(dataTable(
      ['Dia', 'Taxa de Ocupacao'],
      data.ocupacao.map(o => [o.nome, `${o.taxaOcupacao.toFixed(1)}%`]),
    ));
  }

  // 4. Salas
  if (data.salas.length > 0) {
    parts.push(sectionTitle('Uso de Salas'));
    parts.push(dataTable(
      ['Sala', 'Reservas', 'Tempo Usado', 'Ocupacao'],
      data.salas.map(s => [
        s.nome, s.totalReservasFinalizadas, minToHoras(s.totalMinutosUsados),
        s.minutosDisponiveis > 0 ? pct(s.totalMinutosUsados, s.minutosDisponiveis) : '-',
      ]),
    ));
  }

  // 5. Computadores
  if (data.computadores.length > 0) {
    parts.push(sectionTitle('Uso de Computadores'));
    parts.push(dataTable(
      ['Computador', 'Reservas', 'Tempo Usado', 'Ocupacao'],
      data.computadores.map(c => [
        c.nome, c.totalReservasFinalizadas, minToHoras(c.totalMinutosUsados),
        c.minutosDisponiveis > 0 ? pct(c.totalMinutosUsados, c.minutosDisponiveis) : '-',
      ]),
    ));
  }

  // 6. Usuarios
  if (data.usuarios) {
    const u = data.usuarios;
    parts.push(sectionTitle('Usuarios'));
    parts.push(kvTable([
      ['Total Cadastrados', u.totalCadastrados],
      ['Total Ativos',      u.totalAtivos],
    ]));

    if (u.distribuicao.length > 0) {
      parts.push(sectionTitle('Distribuicao por Tipo de Usuario'));
      parts.push(dataTable(
        ['Tipo', 'Finalizadas', 'Abandonos', 'Cancelamentos', '% Fin.'],
        u.distribuicao.map(d => {
          const tot = d.pedidosFinalizados + d.totalAbandonos + d.totalCancelamentos;
          return [d.tipo, d.pedidosFinalizados, d.totalAbandonos, d.totalCancelamentos,
            tot > 0 ? pct(d.pedidosFinalizados, tot) : '-'];
        }),
      ));
    }

    if (u.crescimento.length > 0) {
      parts.push(sectionTitle('Crescimento Mensal'));
      parts.push(dataTable(
        ['Mes', 'Novos Cadastros', 'Primeiro Uso'],
        u.crescimento.map(c => [c.mes, c.novosCadastros, c.primeiroUso]),
      ));
    }
  }

  // Paragrafo final vazio
  parts.push('<w:p/>');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${parts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

// ─── XMLs estáticos ────────────────────────────────────────────────────────────

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`;

const WORD_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
  <Relationship Id="rId2"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings"
    Target="settings.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/><w:szCs w:val="22"/>
        <w:lang w:val="pt-BR"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="709"/>
</w:settings>`;

// ─── Exportador principal ──────────────────────────────────────────────────────

export function exportToWord(data: ReportData, filename = 'relatorio'): void {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml':          strToU8(CONTENT_TYPES),
    '_rels/.rels':                  strToU8(ROOT_RELS),
    'word/document.xml':            strToU8(buildDocument(data)),
    'word/_rels/document.xml.rels': strToU8(WORD_RELS),
    'word/styles.xml':              strToU8(STYLES),
    'word/settings.xml':            strToU8(SETTINGS),
  };

  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0,16).replace('T','_').replace(':','-');
  a.href = url;
  a.download = `${filename}_${date}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
