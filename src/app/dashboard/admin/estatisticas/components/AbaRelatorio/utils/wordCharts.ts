/**
 * Geradores de gráficos nativos Word (DrawingML / OOXML).
 * Cada função retorna { xml: string, rId: string } para ser incluído no ZIP.
 *
 * Os gráficos usam inline data (numLit/strLit) sem depender de embedded Excel,
 * o que os torna verdadeiramente dinâmicos dentro do Word.
 */

// ─── Helpers de serialização ──────────────────────────────────────────────────

function esc(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Gera <c:numLit> com array de valores numéricos */
function numLit(values: number[]): string {
  const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('');
  return `<c:numLit><c:ptCount val="${values.length}"/>${pts}</c:numLit>`;
}

/** Gera <c:strLit> com array de labels string */
function strLit(labels: string[]): string {
  const pts = labels.map((l, i) => `<c:pt idx="${i}"><c:v>${esc(l)}</c:v></c:pt>`).join('');
  return `<c:strLit><c:ptCount val="${labels.length}"/>${pts}</c:strLit>`;
}

/** Drawing inline que envolve um chart — embutido no corpo do documento */
export function drawingInline(rId: string, docPrId: number, cx = 5_486_400, cy = 3_200_400): string {
  // All namespaces (w, wp, a, c, r) must be declared on the root <w:document> element.
  // Re-declaring them here causes Word to reject the file.
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="Chart${docPrId}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="${rId}"/></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

// ─── Tema e cores padrão ──────────────────────────────────────────────────────

const CHART_NS = 'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function solidFill(color: string): string {
  return `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`;
}

function spPr(fillColor?: string, lineColor?: string): string {
  const fill = fillColor ? solidFill(fillColor) : '<a:noFill/>';
  const ln = lineColor ? `<a:ln>${solidFill(lineColor)}</a:ln>` : '';
  return `<c:spPr>${fill}${ln}</c:spPr>`;
}

function chartTitle(text: string): string {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" b="1"/><a:t>${esc(text)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
}

function legendRight(): string {
  return `<c:legend><c:legendPos val="r"/><c:overlay val="0"/></c:legend>`;
}

function plotAreaBorder(): string {
  return `<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>`;
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

export interface LineChartSeries {
  name: string;
  color: string;     // hex sem #
  labels: string[];
  values: number[];
  dashed?: boolean;
}

/**
 * Gera XML para gráfico de linha (pedidos ao longo do tempo).
 * Retorna o conteúdo do arquivo word/charts/chartN.xml
 */
export function buildLineChartXml(title: string, series: LineChartSeries[]): string {
  const seriesXml = series.map((s, idx) => {
    const marker = `<c:marker><c:symbol val="none"/></c:marker>`;
    const dash = s.dashed ? `<c:spPr><a:ln dashStyle="dash">${solidFill(s.color)}</a:ln></c:spPr>` : spPr(undefined, s.color);
    const labels = s.labels.length > 0
      ? `<c:cat><c:strRef><c:f>""</c:f>${strLit(s.labels)}</c:strRef></c:cat>`
      : '';
    return `<c:ser>
      <c:idx val="${idx}"/><c:order val="${idx}"/>
      <c:tx><c:strRef><c:f>""</c:f>${strLit([s.name])}</c:strRef></c:tx>
      ${dash}${marker}${labels}
      <c:val><c:numRef><c:f>""</c:f>${numLit(s.values)}</c:numRef></c:val>
      <c:smooth val="0"/>
    </c:ser>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace ${CHART_NS}>
  <c:lang val="pt-BR"/>
  <c:chart>
    ${chartTitle(title)}
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      ${plotAreaBorder()}
      <c:lineChart>
        <c:barDir val="col"/>
        <c:grouping val="standard"/>
        ${seriesXml}
        <c:marker><c:symbol val="none"/></c:marker>
        <c:smooth val="0"/>
      </c:lineChart>
      <c:catAx>
        <c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:axPos val="b"/><c:crossAx val="2"/>
        <c:tickLblSkip val="${Math.max(1, Math.floor((series[0]?.labels.length ?? 1) / 10))}"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:axPos val="l"/><c:crossAx val="1"/>
      </c:valAx>
    </c:plotArea>
    ${legendRight()}
    <c:plotVisOnly val="1"/>
  </c:chart>
  <c:spPr>${solidFill('F9FAFB')}</c:spPr>
</c:chartSpace>`;
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

export interface BarChartSeries {
  name: string;
  color: string;
  labels: string[];
  values: number[];
}

export function buildBarChartXml(title: string, series: BarChartSeries[]): string {
  const seriesXml = series.map((s, idx) => {
    return `<c:ser>
      <c:idx val="${idx}"/><c:order val="${idx}"/>
      <c:tx><c:strRef><c:f>""</c:f>${strLit([s.name])}</c:strRef></c:tx>
      ${spPr(s.color)}
      <c:cat><c:strRef><c:f>""</c:f>${strLit(s.labels)}</c:strRef></c:cat>
      <c:val><c:numRef><c:f>""</c:f>${numLit(s.values)}</c:numRef></c:val>
    </c:ser>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace ${CHART_NS}>
  <c:lang val="pt-BR"/>
  <c:chart>
    ${chartTitle(title)}
    <c:plotArea>
      ${plotAreaBorder()}
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        ${seriesXml}
      </c:barChart>
      <c:catAx>
        <c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:axPos val="b"/><c:crossAx val="2"/>
        <c:tickLblSkip val="${Math.max(1, Math.floor((series[0]?.labels.length ?? 1) / 8))}"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:axPos val="l"/><c:crossAx val="1"/>
      </c:valAx>
    </c:plotArea>
    ${legendRight()}
    <c:plotVisOnly val="1"/>
  </c:chart>
  <c:spPr>${solidFill('F9FAFB')}</c:spPr>
</c:chartSpace>`;
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

export interface DonutSlice {
  label: string;
  value: number;
  color: string;  // hex sem #
}

export function buildDonutChartXml(title: string, slices: DonutSlice[]): string {
  const labels = slices.map(s => s.label);
  const values = slices.map(s => s.value);

  const dataPoints = slices.map((s, i) =>
    `<c:dPt><c:idx val="${i}"/>${spPr(s.color)}</c:dPt>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace ${CHART_NS}>
  <c:lang val="pt-BR"/>
  <c:chart>
    ${chartTitle(title)}
    <c:plotArea>
      ${plotAreaBorder()}
      <c:doughnutChart>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:strRef><c:f>""</c:f>${strLit([title])}</c:strRef></c:tx>
          ${dataPoints}
          <c:cat><c:strRef><c:f>""</c:f>${strLit(labels)}</c:strRef></c:cat>
          <c:val><c:numRef><c:f>""</c:f>${numLit(values)}</c:numRef></c:val>
        </c:ser>
        <c:holeSize val="60"/>
      </c:doughnutChart>
    </c:plotArea>
    ${legendRight()}
    <c:plotVisOnly val="1"/>
  </c:chart>
  <c:spPr>${solidFill('F9FAFB')}</c:spPr>
</c:chartSpace>`;
}
