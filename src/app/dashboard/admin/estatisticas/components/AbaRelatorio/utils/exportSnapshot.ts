import { buildLineChartXml, buildBarChartXml, buildDonutChartXml, drawingInline } from './wordCharts';
/**
 * Converte ExportSnapshot (dados ao vivo das abas) para Word/Excel.
 * Usa as mesmas funções base de exportWord.ts e exportExcel.ts.
 */
import { zipSync, strToU8 } from 'fflate';
import type { ExportSnapshot, ComponenteId } from './types';

// ─── Helpers compartilhados ───────────────────────────────────────────────────

function esc(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtData(d: Date | null | undefined, fallback = '-') {
  return d ? d.toLocaleDateString('pt-BR') : fallback;
}

function fmtPeriodo(inicio: Date | null | undefined, fim: Date | null | undefined) {
  const i = fmtData(inicio, null as unknown as string);
  const f = fmtData(fim, null as unknown as string);
  if (!i && !f) return 'Todo o período';
  if (!i) return `Até ${f}`;
  if (!f) return `A partir de ${i}`;
  return `${i} a ${f}`;
}

function minToHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
}

function pct(val: number, total: number): string {
  return total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '-';
}

// ─────────────────────────────────────────────────────────────────────────────
// WORD
// ─────────────────────────────────────────────────────────────────────────────

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

function para(content: string, spacing?: { before?: number; after?: number }, jc?: string): string {
  const pPrParts: string[] = [];
  if (spacing) pPrParts.push(`<w:spacing${spacing.before ? ` w:before="${spacing.before}"` : ''}${spacing.after !== undefined ? ` w:after="${spacing.after}"` : ''}/>`);
  if (jc) pPrParts.push(`<w:jc w:val="${jc}"/>`);
  const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join('')}</w:pPr>` : '';
  return `<w:p>${pPr}${content}</w:p>`;
}

function wCell(content: string, opts: { bgColor?: string; width?: number; bold?: boolean; align?: string } = {}): string {
  const shd = opts.bgColor ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.bgColor}"/>` : '';
  const jc  = opts.align   ? `<w:jc w:val="${opts.align}"/>` : '';
  const tcW = opts.width   ? `<w:tcW w:w="${opts.width}" w:type="dxa"/>` : '';
  return `<w:tc><w:tcPr>${tcW}${shd}</w:tcPr><w:p><w:pPr>${jc}</w:pPr>${run(content, { bold: opts.bold })}</w:p></w:tc>`;
}

function tableRow(cells: string[]): string { return `<w:tr>${cells.join('')}</w:tr>`; }

function headerRow(headers: string[], bgColor = '1E40AF'): string {
  return tableRow(headers.map(h => wCell(h, { bgColor, bold: true, align: 'center' })));
}

function dataRow(vals: (string | number | null)[], zebra: boolean): string {
  const bg = zebra ? 'EFF6FF' : 'FFFFFF';
  return tableRow(vals.map(v => wCell(String(v ?? '-'), { bgColor: bg })));
}

function tbl(rows: string[]): string {
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D1D5DB"/><w:left w:val="single" w:sz="4" w:color="D1D5DB"/><w:bottom w:val="single" w:sz="4" w:color="D1D5DB"/><w:right w:val="single" w:sz="4" w:color="D1D5DB"/><w:insideH w:val="single" w:sz="4" w:color="D1D5DB"/><w:insideV w:val="single" w:sz="4" w:color="D1D5DB"/></w:tblBorders></w:tblPr>${rows.join('')}</w:tbl>`;
}

function docTitle(title: string, subtitle: string): string {
  return `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/><w:spacing w:before="0" w:after="0"/></w:pPr>${run(title, { bold: true, color: 'FFFFFF', sz: 32 })}</w:p><w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/><w:spacing w:before="0" w:after="200"/></w:pPr>${run(subtitle, { color: 'BFDBFE', sz: 20 })}</w:p>`;
}

function sectionTitle(title: string): string {
  return para(run(title, { bold: true, color: '1E3A8A', sz: 26 }), { before: 240, after: 120 });
}

function subTitle(title: string): string {
  return para(run(title, { bold: true, color: '374151', sz: 22 }), { before: 160, after: 80 });
}

function kvTable(pairs: [string, string][]): string {
  const rows = pairs.map(([k, v], i) =>
    tableRow([
      wCell(k, { bgColor: i % 2 === 0 ? 'EFF6FF' : 'F8FAFF', bold: true }),
      wCell(v, { bgColor: i % 2 === 0 ? 'EFF6FF' : 'F8FAFF' }),
    ])
  );
  return tbl(rows);
}

/** Linha de dados para tabela com gráfico embutido (linha do tempo como barras de texto) */
function sparkBar(values: number[], labels: string[], color = '1D4ED8'): string {
  if (values.length === 0) return para(run('Sem dados'), { before: 80, after: 80 });
  const max = Math.max(1, ...values);
  const BAR = '█';
  const rows = values.slice(-20).map((v, i) => {
    const bars = Math.round((v / max) * 15);
    const barStr = BAR.repeat(Math.max(bars, v > 0 ? 1 : 0));
    return tableRow([
      wCell(labels[i] ?? '', { bgColor: 'F8FAFF' }),
      wCell(barStr, { bgColor: 'F8FAFF', bold: true }),
      wCell(String(v), { bgColor: 'F8FAFF', align: 'right' }),
    ]);
  });
  return tbl([headerRow(['Data/Dia', 'Volume', 'Valor'], '1E40AF'), ...rows]);
}

interface WordBuildResult {
  bodyXml: string;
  charts: { id: string; xml: string }[];  // id = rId1, rId2, ...
}

let _chartCounter = 0;
function nextRId(): string { return `rId${++_chartCounter}`; }
function resetChartCounter() { _chartCounter = 0; }

function buildWordDoc(snapshot: ExportSnapshot, selected: Set<ComponenteId>): WordBuildResult {
  _chartCounter = 0;
  const charts: { id: string; xml: string }[] = [];
  const body: string[] = [];

  function addChart(title: string, xml: string): void {
    const rId = nextRId();
    const docPrId = _chartCounter; // unique per drawing (already incremented by nextRId)
    charts.push({ id: rId, xml });
    // <w:drawing> must be inside <w:r>; all namespaces declared on <w:document> root
    body.push(`<w:p><w:r>${drawingInline(rId, docPrId)}</w:r></w:p>`);
  }
  const periodo = fmtPeriodo(snapshot.filtrosGlobais.inicio, snapshot.filtrosGlobais.fim);
  const geradoEm = snapshot.capturedAt.toLocaleString('pt-BR');

  body.push(docTitle('Biblioteca — Exportação', `Período: ${periodo}  |  Gerado em: ${geradoEm}`));

  // ─── Histórico ──────────────────────────────────────────────────────────
  const hist = snapshot.historico;
  const hasHist = hist && (
    selected.has('historico_resumo') || selected.has('historico_linear') ||
    selected.has('historico_heatmap') || selected.has('historico_ocupacao_dia')
  );

  if (hasHist && hist) {
    body.push(sectionTitle('Histórico'));
    const periodoHist = fmtPeriodo(hist.periodo.inicio, hist.periodo.fim);

    if (selected.has('historico_resumo') && hist.dadosLinear) {
      body.push(subTitle('Resumo'));
      const dl = hist.dadosLinear;
      const tendStr = dl.tendencia
        ? `${dl.tendencia.subindo ? '▲' : '▼'} ${dl.tendencia.pct.toFixed(1)}%`
        : '-';
      const tendAba = dl.tendenciaAbandono
        ? `${dl.tendenciaAbandono.subindo ? '▲' : '▼'} ${dl.tendenciaAbandono.pct.toFixed(1)}%`
        : '-';
      body.push(kvTable([
        ['Período', periodoHist],
        ['Tendência de pedidos', tendStr],
        ['Média de pedidos / dia', dl.mediaPessoasDia.toFixed(1)],
        ['Taxa de abandono', `${dl.taxaAbandono.toFixed(1)}%`],
        ['Tendência de abandonos', tendAba],
        ['Pico horário', hist.picoHorario ?? '-'],
      ]));
    }

    if (selected.has('historico_linear') && hist.dadosLinear) {
      body.push(subTitle('Evolução de pedidos e abandonos'));
      const seriesPedidos = {
        name: 'Pedidos',
        color: '1D4ED8',
        labels: hist.dadosLinear.pontos.map(p => p.data),
        values: hist.dadosLinear.pontos.map(p => p.total),
      };
      const seriesAba = hist.dadosLinear.abandonos.length > 0 ? [{
        name: 'Abandonos',
        color: 'DC2626',
        labels: hist.dadosLinear.abandonos.map(p => p.data),
        values: hist.dadosLinear.abandonos.map(p => p.total),
        dashed: true,
      }] : [];
      addChart('Pedidos ao longo do tempo', buildLineChartXml('Pedidos ao longo do tempo', [seriesPedidos, ...seriesAba]));
    }

    if (selected.has('historico_ocupacao_dia') && hist.ocupacaoDia.length > 0) {
      body.push(subTitle('Ocupação por dia da semana'));
      const rows = hist.ocupacaoDia.map((o, i) =>
        dataRow([o.nome, `${o.taxaOcupacao.toFixed(1)}%`], i % 2 === 0)
      );
      body.push(tbl([headerRow(['Dia', 'Ocupação']), ...rows]));
    }

    if (selected.has('historico_heatmap') && hist.heatmap.length > 0) {
      body.push(subTitle('Mapa de calor (hora × dia)'));
      const DIAS = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
      const horas = [...new Set(hist.heatmap.map(h => h.hora))].sort((a, b) => a - b);
      const dias  = [1, 2, 3, 4, 5];
      const headerCells = [wCell('Hora', { bgColor: '1E40AF', bold: true })];
      dias.forEach(d => headerCells.push(wCell(DIAS[d] ?? String(d), { bgColor: '1E40AF', bold: true, align: 'center' })));
      const heatRows: string[] = [tableRow(headerCells)];
      const maxVal = Math.max(1, ...hist.heatmap.map(h => h.valorParaCor));
      horas.forEach(hora => {
        const cells = [wCell(`${hora}h`, { bold: true, bgColor: 'F8FAFF' })];
        dias.forEach(dia => {
          const h = hist.heatmap.find(x => x.hora === hora && x.diaSemana === dia);
          const v = h?.valorParaCor ?? 0;
          const intensity = Math.round((v / maxVal) * 255);
          const r = Math.round(30 + (intensity / 255) * (239 - 30)).toString(16).padStart(2, '0');
          const g = Math.round(58 + (intensity / 255) * (68 - 58)).toString(16).padStart(2, '0');
          const b = Math.round(138 + (intensity / 255) * (139 - 138)).toString(16).padStart(2, '0');
          const bg = `${r}${g}${b}`.toUpperCase();
          const textColor = intensity > 180 ? '000000' : 'FFFFFF';
          cells.push(wCell(String(v), { bgColor: bg, align: 'center' }));
        });
        heatRows.push(tableRow(cells));
      });
      body.push(tbl(heatRows));
    }
  }

  // ─── Recursos ───────────────────────────────────────────────────────────
  const rec = snapshot.recursos;
  const hasRec = rec && (
    selected.has('recursos_resumo') || selected.has('recursos_status') ||
    selected.has('recursos_salas')  || selected.has('recursos_pcs')
  );

  if (hasRec && rec) {
    body.push(sectionTitle('PC / Sala'));
    const periodoRec = fmtPeriodo(rec.periodo.inicio, rec.periodo.fim);

    if (selected.has('recursos_status') && rec.status) {
      const st = rec.status;
      const total = st.total || 1;
      body.push(subTitle('Status das Reservas'));
      const rows = [
        dataRow(['Finalizadas', st.finalizadas, pct(st.finalizadas, total)], true),
        dataRow(['Canceladas',  st.canceladas,  pct(st.canceladas,  total)], false),
        dataRow(['Atrasadas',   st.atrasadas,   pct(st.atrasadas,   total)], true),
        dataRow(['Rejeitadas',  st.rejeitadas,  pct(st.rejeitadas,  total)], false),
        tableRow([
          wCell('Total', { bgColor: 'DBEAFE', bold: true }),
          wCell(String(st.total), { bgColor: 'DBEAFE', bold: true }),
          wCell('100%', { bgColor: 'DBEAFE', bold: true }),
        ]),
      ];
      body.push(tbl([headerRow(['Status', 'Quantidade', '%']), ...rows]));
    }

    if (selected.has('recursos_salas') && rec.salas.length > 0) {
      body.push(subTitle('Uso de Salas'));
      const rows = rec.salas.map((s, i) =>
        dataRow([s.nome, s.totalReservasFinalizadas, minToHoras(s.totalMinutosUsados),
          s.minutosDisponiveis > 0 ? pct(s.totalMinutosUsados, s.minutosDisponiveis) : '-'], i % 2 === 0)
      );
      body.push(tbl([headerRow(['Sala', 'Reservas', 'Tempo Usado', 'Ocupação']), ...rows]));
    }

    if (selected.has('recursos_pcs') && rec.computadores.length > 0) {
      body.push(subTitle('Uso de Computadores'));
      const rows = rec.computadores.map((c, i) =>
        dataRow([c.nome, c.totalReservasFinalizadas, minToHoras(c.totalMinutosUsados),
          c.minutosDisponiveis > 0 ? pct(c.totalMinutosUsados, c.minutosDisponiveis) : '-'], i % 2 === 0)
      );
      body.push(tbl([headerRow(['Computador', 'Reservas', 'Tempo Usado', 'Ocupação']), ...rows]));
    }
  }

  // ─── Usuários ────────────────────────────────────────────────────────────
  const usr = snapshot.usuarios;
  const hasUsr = usr && (
    selected.has('usuarios_resumo') || selected.has('usuarios_distribuicao') ||
    selected.has('usuarios_ranking') || selected.has('usuarios_crescimento')
  );

  if (hasUsr && usr?.data) {
    body.push(sectionTitle('Usuários'));
    const d = usr.data;
    const periodoUsr = fmtPeriodo(usr.periodo.inicio, usr.periodo.fim);

    if (selected.has('usuarios_resumo')) {
      body.push(subTitle('Resumo'));
      body.push(kvTable([
        ['Período', periodoUsr],
        ['Total cadastrados', String(d.totalCadastrados)],
        ['Total ativos', String(d.totalAtivos)],
      ]));
    }

    if (selected.has('usuarios_distribuicao') && d.distribuicao.length > 0) {
      body.push(subTitle('Distribuição por tipo — Finalizadas'));
      addChart('Distribuição por tipo (Finalizadas)', buildDonutChartXml('Finalizadas', d.distribuicao
        .filter(dist => dist.pedidosFinalizados > 0)
        .map(dist => ({ label: dist.tipo, value: dist.pedidosFinalizados, color: '1D4ED8' }))
        .map((s, i, arr) => ({ ...s, color: ['1D4ED8','7C3AED','10B981','F59E0B','EF4444'][i % 5] }))
      ));
      body.push(subTitle('Distribuição por tipo — Tabela detalhada'));
      const rows = d.distribuicao.map((dist, i) => {
        const tot = dist.pedidosFinalizados + dist.totalAbandonos + dist.totalCancelamentos;
        return dataRow([
          dist.tipo,
          dist.pedidosFinalizados,
          dist.totalAbandonos,
          dist.totalCancelamentos,
          tot > 0 ? pct(dist.pedidosFinalizados, tot) : '-',
        ], i % 2 === 0);
      });
      body.push(tbl([headerRow(['Tipo', 'Finalizadas', 'Abandonos', 'Canceladas', '% Fin.']), ...rows]));
    }

    if (selected.has('usuarios_ranking') && d.ranking.length > 0) {
      body.push(subTitle('Ranking de usuários'));
      const top20 = d.ranking.slice(0, 20);
      const rows = top20.map((u, i) =>
        dataRow([u.nome, u.tipoUsuario ?? '-', u.pedidosFinalizados, u.pedidosCancelados, u.pedidosAbandono], i % 2 === 0)
      );
      body.push(tbl([headerRow(['Nome', 'Tipo', 'Finalizadas', 'Canceladas', 'Abandonos']), ...rows]));
    }

    if (selected.has('usuarios_crescimento') && d.crescimento.length > 0) {
      body.push(subTitle('Crescimento mensal'));
      addChart('Crescimento mensal', buildBarChartXml('Crescimento mensal', [
        {
          name: 'Novos Cadastros',
          color: '7C3AED',
          labels: d.crescimento.map(cr => cr.mes),
          values: d.crescimento.map(cr => cr.novosCadastros),
        },
        {
          name: 'Primeiro Uso',
          color: '10B981',
          labels: d.crescimento.map(cr => cr.mes),
          values: d.crescimento.map(cr => cr.primeiroUso),
        },
      ]));
    }
  }

  const XML_NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"';
  const bodyXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${XML_NS}><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  return { bodyXml, charts };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL
// ─────────────────────────────────────────────────────────────────────────────

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="13"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E40AF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFBFDBFE"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0E7FF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/></cellXfs></styleSheet>`;

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

function xlCell(col: number, row: number, value: string | number | null, style: CellStyle = 0): string {
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
    const cells = data.map((v, ci) => { this.maxCol = Math.max(this.maxCol, ci + 1); return xlCell(ci, this.rowIdx, v, style); }).join('');
    this.rows.push(`<row r="${this.rowIdx}"${h}>${cells}</row>`);
    this.rowIdx++;
  }

  addMerged(value: string | number | null, style: CellStyle, colspan: number, height?: number) {
    const h = height ? ` ht="${height}" customHeight="1"` : '';
    this.maxCol = Math.max(this.maxCol, colspan);
    this.rows.push(`<row r="${this.rowIdx}"${h}>${xlCell(0, this.rowIdx, value, style)}</row>`);
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

function buildExcelSheet(snapshot: ExportSnapshot, selected: Set<ComponenteId>): string {
  const s = new SheetBuilder();
  const periodo = fmtPeriodo(snapshot.filtrosGlobais.inicio, snapshot.filtrosGlobais.fim);
  const COLS = 5;

  s.addMerged('Biblioteca — Exportação', 4, COLS, 22);
  s.addRow([`Período: ${periodo}`, '', '', `Gerado em: ${snapshot.capturedAt.toLocaleString('pt-BR')}`, ''], 0);
  s.addEmpty();

  const hist = snapshot.historico;
  if (hist) {
    if (selected.has('historico_linear') && hist.dadosLinear) {
      s.addMerged('Histórico — Pedidos por dia', 2, COLS, 16);
      s.addRow(['Data', 'Pedidos', 'Média Móvel'], 1);
      hist.dadosLinear.pontos.forEach((p, i) =>
        s.addRow([p.data, p.total, p.mm ?? null], i % 2 === 0 ? 5 : 6)
      );
      s.addEmpty();
    }

    if (selected.has('historico_ocupacao_dia') && hist.ocupacaoDia.length > 0) {
      s.addMerged('Histórico — Ocupação por dia da semana', 2, COLS, 16);
      s.addRow(['Dia', 'Taxa de Ocupação'], 1);
      hist.ocupacaoDia.forEach((o, i) =>
        s.addRow([o.nome, `${o.taxaOcupacao.toFixed(1)}%`], i % 2 === 0 ? 5 : 6)
      );
      s.addEmpty();
    }
  }

  const rec = snapshot.recursos;
  if (rec) {
    if (selected.has('recursos_status') && rec.status) {
      const st = rec.status;
      const total = st.total || 1;
      s.addMerged('Recursos — Status das Reservas', 2, COLS, 16);
      s.addRow(['Status', 'Quantidade', '%'], 1);
      [
        ['Finalizadas', st.finalizadas, pct(st.finalizadas, total)],
        ['Canceladas',  st.canceladas,  pct(st.canceladas,  total)],
        ['Atrasadas',   st.atrasadas,   pct(st.atrasadas,   total)],
        ['Rejeitadas',  st.rejeitadas,  pct(st.rejeitadas,  total)],
      ].forEach((row, i) => s.addRow(row as (string | number)[], i % 2 === 0 ? 5 : 6));
      s.addRow(['Total', st.total, '100%'], 3);
      s.addEmpty();
    }

    if (selected.has('recursos_salas') && rec.salas.length > 0) {
      s.addMerged('Recursos — Salas', 2, COLS, 16);
      s.addRow(['Sala', 'Reservas', 'Tempo Usado', 'Ocupação'], 1);
      rec.salas.forEach((sl, i) =>
        s.addRow([sl.nome, sl.totalReservasFinalizadas, minToHoras(sl.totalMinutosUsados),
          sl.minutosDisponiveis > 0 ? pct(sl.totalMinutosUsados, sl.minutosDisponiveis) : '-'], i % 2 === 0 ? 5 : 6)
      );
      s.addEmpty();
    }

    if (selected.has('recursos_pcs') && rec.computadores.length > 0) {
      s.addMerged('Recursos — Computadores', 2, COLS, 16);
      s.addRow(['PC', 'Reservas', 'Tempo Usado', 'Ocupação'], 1);
      rec.computadores.forEach((c, i) =>
        s.addRow([c.nome, c.totalReservasFinalizadas, minToHoras(c.totalMinutosUsados),
          c.minutosDisponiveis > 0 ? pct(c.totalMinutosUsados, c.minutosDisponiveis) : '-'], i % 2 === 0 ? 5 : 6)
      );
      s.addEmpty();
    }
  }

  const usr = snapshot.usuarios;
  if (usr?.data) {
    const d = usr.data;

    if (selected.has('usuarios_distribuicao') && d.distribuicao.length > 0) {
      s.addMerged('Usuários — Distribuição por tipo', 2, COLS, 16);
      s.addRow(['Tipo', 'Finalizadas', 'Abandonos', 'Cancelamentos', '% Fin.'], 1);
      d.distribuicao.forEach((dist, i) => {
        const tot = dist.pedidosFinalizados + dist.totalAbandonos + dist.totalCancelamentos;
        s.addRow([dist.tipo, dist.pedidosFinalizados, dist.totalAbandonos, dist.totalCancelamentos,
          tot > 0 ? pct(dist.pedidosFinalizados, tot) : '-'], i % 2 === 0 ? 5 : 6);
      });
      s.addEmpty();
    }

    if (selected.has('usuarios_ranking') && d.ranking.length > 0) {
      s.addMerged('Usuários — Ranking', 2, COLS, 16);
      s.addRow(['Nome', 'Tipo', 'Finalizadas', 'Canceladas', 'Abandonos'], 1);
      d.ranking.slice(0, 50).forEach((u, i) =>
        s.addRow([u.nome, u.tipoUsuario ?? '-', u.pedidosFinalizados, u.pedidosCancelados, u.pedidosAbandono], i % 2 === 0 ? 5 : 6)
      );
      s.addEmpty();
    }

    if (selected.has('usuarios_crescimento') && d.crescimento.length > 0) {
      s.addMerged('Usuários — Crescimento mensal', 2, COLS, 16);
      s.addRow(['Mês', 'Novos Cadastros', 'Primeiro Uso'], 1);
      d.crescimento.forEach((c, i) =>
        s.addRow([c.mes, c.novosCadastros, c.primeiroUso], i % 2 === 0 ? 5 : 6)
      );
    }
  }

  return s.build([34, 16, 16, 16, 16]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ZIP helpers
// ─────────────────────────────────────────────────────────────────────────────

const WORD_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`;
const WORD_ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const WORD_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>`;
const WORD_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:left w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:right w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/></w:tblBorders></w:tblPr></w:style></w:styles>`;
const WORD_SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;

const XL_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
const XL_ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const XL_WORKBOOK  = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Exportação" sheetId="1" r:id="rId1"/></sheets></workbook>`;
const XL_WB_RELS   = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports públicos
// ─────────────────────────────────────────────────────────────────────────────

function buildWordRels(charts: { id: string; xml: string }[]): string {
  const rels = charts.map((ch, i) =>
    `<Relationship Id="${ch.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="charts/chart${i + 1}.xml"/>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${rels}</Relationships>`;
}

function buildChartContentTypes(charts: { id: string }[]): string {
  const overrides = charts.map((_, i) =>
    `<Override PartName="/word/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>${overrides}</Types>`;
}

export function exportSnapshotToWord(snapshot: ExportSnapshot, selected: Set<ComponenteId>, filename = 'exportacao'): void {
  const { bodyXml, charts } = buildWordDoc(snapshot, selected);
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml':         strToU8(buildChartContentTypes(charts)),
    '_rels/.rels':                 strToU8(WORD_ROOT_RELS),
    'word/document.xml':           strToU8(bodyXml),
    'word/_rels/document.xml.rels':strToU8(buildWordRels(charts)),
    'word/styles.xml':             strToU8(WORD_STYLES),
    'word/settings.xml':           strToU8(WORD_SETTINGS),
  };
  // Adiciona cada arquivo de gráfico
  charts.forEach((ch, i) => {
    files[`word/charts/chart${i + 1}.xml`] = strToU8(ch.xml);
  });
  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  download(blob, `${filename}_${new Date().toISOString().slice(0,16).replace('T','_').replace(':','-')}.docx`);
}

export function exportSnapshotToExcel(snapshot: ExportSnapshot, selected: Set<ComponenteId>, filename = 'exportacao'): void {
  const sheetXml = buildExcelSheet(snapshot, selected);
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml':        strToU8(XL_CONTENT_TYPES),
    '_rels/.rels':                strToU8(XL_ROOT_RELS),
    'xl/workbook.xml':            strToU8(XL_WORKBOOK),
    'xl/_rels/workbook.xml.rels': strToU8(XL_WB_RELS),
    'xl/styles.xml':              strToU8(STYLES_XML),
    'xl/worksheets/sheet1.xml':   strToU8(sheetXml),
  };
  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  download(blob, `${filename}_${new Date().toISOString().slice(0,16).replace('T','_').replace(':','-')}.xlsx`);
}
