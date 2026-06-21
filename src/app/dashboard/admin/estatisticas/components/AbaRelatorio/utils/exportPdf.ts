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

function row(cells: (string | number)[], isHeader = false): string {
  const tag = isHeader ? 'th' : 'td';
  return '<tr>' + cells.map(c => `<${tag}>${c ?? '-'}</${tag}>`).join('') + '</tr>';
}

function table(headers: string[], rows: (string | number)[][]): string {
  return (
    '<table>' +
    '<thead>' + row(headers, true) + '</thead>' +
    '<tbody>' + rows.map(r => row(r)).join('') + '</tbody>' +
    '</table>'
  );
}

function kv(pairs: [string, string | number][]): string {
  return (
    '<table class="kv">' +
    pairs.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v ?? '-'}</td></tr>`).join('') +
    '</table>'
  );
}

function section(title: string, body: string): string {
  return `<section><h2>${title}</h2>${body}</section>`;
}

function buildHtml(data: ReportData, filename: string): string {
  const periodo = fmtPeriodo(data);
  const geradoEm = data.geradoEm.toLocaleString('pt-BR');
  const sections: string[] = [];

  const salaMaisUsada = data.salas.length > 0
    ? [...data.salas].sort((a, b) => b.totalReservasFinalizadas - a.totalReservasFinalizadas)[0].nome
    : '-';
  const pcMaisUsado = data.computadores.length > 0
    ? [...data.computadores].sort((a, b) => b.totalReservasFinalizadas - a.totalReservasFinalizadas)[0].nome
    : '-';

  if (data.resumo) {
    const r = data.resumo;
    sections.push(section('Visao Geral', kv([
      ['Total de Pedidos',       r.totalPedidos],
      ['Total de Reservas',      r.totalReservas],
      ['Taxa de Ocupacao Media', `${r.taxaOcupacaoMedia.toFixed(1)}%`],
      ['Taxa de No-Show',        `${r.taxaNoShow.toFixed(1)}%`],
      ['Sala Mais Usada',        salaMaisUsada],
      ['PC Mais Usado',          pcMaisUsado],
    ])));
  }

  if (data.status) {
    const s = data.status;
    const total = s.total || 1;
    sections.push(section('Status das Reservas', table(
      ['Status', 'Quantidade', '%'],
      [
        ['Finalizadas', s.finalizadas, pct(s.finalizadas, total)],
        ['Canceladas',  s.canceladas,  pct(s.canceladas,  total)],
        ['Atrasadas',   s.atrasadas,   pct(s.atrasadas,   total)],
        ['Rejeitadas',  s.rejeitadas,  pct(s.rejeitadas,  total)],
        ['Total',       s.total,       '100%'],
      ],
    )));
  }

  if (data.ocupacao.length > 0) {
    sections.push(section('Ocupacao por Dia da Semana', table(
      ['Dia', 'Taxa de Ocupacao'],
      data.ocupacao.map(o => [o.nome, `${o.taxaOcupacao.toFixed(1)}%`]),
    )));
  }

  if (data.salas.length > 0) {
    sections.push(section('Uso de Salas', table(
      ['Sala', 'Reservas', 'Tempo Usado', 'Ocupacao'],
      data.salas.map(s => [
        s.nome, s.totalReservasFinalizadas, minToHoras(s.totalMinutosUsados),
        s.minutosDisponiveis > 0 ? pct(s.totalMinutosUsados, s.minutosDisponiveis) : '-',
      ]),
    )));
  }

  if (data.computadores.length > 0) {
    sections.push(section('Uso de Computadores', table(
      ['Computador', 'Reservas', 'Tempo Usado', 'Ocupacao'],
      data.computadores.map(c => [
        c.nome, c.totalReservasFinalizadas, minToHoras(c.totalMinutosUsados),
        c.minutosDisponiveis > 0 ? pct(c.totalMinutosUsados, c.minutosDisponiveis) : '-',
      ]),
    )));
  }

  if (data.usuarios) {
    const u = data.usuarios;
    sections.push(section('Usuarios', kv([
      ['Total Cadastrados', u.totalCadastrados],
      ['Total Ativos',      u.totalAtivos],
    ])));
    if (u.distribuicao.length > 0) {
      sections.push(section('Distribuicao por Tipo', table(
        ['Tipo', 'Finalizadas', 'Abandonos', 'Cancelamentos', '% Fin.'],
        u.distribuicao.map(d => {
          const tot = d.pedidosFinalizados + d.totalAbandonos + d.totalCancelamentos;
          return [d.tipo, d.pedidosFinalizados, d.totalAbandonos, d.totalCancelamentos,
            tot > 0 ? pct(d.pedidosFinalizados, tot) : '-'];
        }),
      )));
    }
    if (u.crescimento.length > 0) {
      sections.push(section('Crescimento Mensal', table(
        ['Mes', 'Novos Cadastros', 'Primeiro Uso'],
        u.crescimento.map(c => [c.mes, c.novosCadastros, c.primeiroUso]),
      )));
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const pdfFilename = `${filename}_${date}.pdf`;

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; background: #f3f4f6; }
    #toolbar {
      position: sticky; top: 0; z-index: 100;
      background: #1e293b; padding: 10px 24px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    #toolbar span { color: #94a3b8; font-size: 11px; flex: 1; }
    .btn {
      display: inline-flex; align-items: center; gap-6px;
      padding: 7px 16px; border-radius: 8px; border: none;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-pdf { background: #dc2626; color: white; }
    .btn-print { background: #374151; color: white; }
    #loading-bar {
      display: none; position: fixed; top: 0; left: 0; right: 0;
      height: 3px; background: #dc2626;
      animation: progress 2s ease-in-out infinite;
    }
    @keyframes progress {
      0% { width: 0; } 50% { width: 70%; } 100% { width: 100%; }
    }
    #content { max-width: 860px; margin: 0 auto; padding: 64px 24px 48px; scroll-padding-top: 52px; }
    header { background: #2563eb; color: white; padding: 20px 28px; border-radius: 12px; margin-bottom: 24px; }
    header h1 { font-size: 20px; margin-bottom: 4px; }
    header p { font-size: 10px; opacity: .75; }
    section { margin-bottom: 28px; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    h2 { font-size: 13px; font-weight: 700; border-left: 3px solid #2563eb; padding-left: 8px; margin-bottom: 12px; color: #1e3a8a; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f8fafc; text-align: left; padding: 7px 10px; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; border-bottom: 2px solid #e2e8f0; color: #64748b; }
    td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #f8fafc; }
    table.kv td.k { font-weight: 600; color: #6b7280; width: 220px; }
    table.kv td.v { font-weight: 500; color: #111827; }
    @media print {
      body { background: white; }
      #toolbar { display: none; }
      #loading-bar { display: none; }
      #content { margin: 0; padding: 16px; max-width: 100%; }
      section { box-shadow: none; border: 1px solid #e2e8f0; }
    }
  `;

  const script = `
    async function downloadPdf() {
      const btn = document.getElementById('btn-pdf');
      const bar = document.getElementById('loading-bar');
      btn.disabled = true;
      btn.textContent = 'Gerando...';
      bar.style.display = 'block';
      try {
        await Promise.all([
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        ]);
        const content = document.getElementById('content');
        const toolbar = document.getElementById('toolbar');
        toolbar.style.display = 'none';
        const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: '#f3f4f6' });
        toolbar.style.display = '';
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * pageW) / canvas.width;
        let y = 0;
        let page = 0;
        while (y < imgH) {
          if (page > 0) pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, -y, imgW, imgH);
          y += pageH;
          page++;
        }
        // Salva via blob para evitar navegação file://
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = '${pdfFilename}';
        link.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      } catch(e) {
        alert('Erro ao gerar PDF. Tente usar o botao Imprimir e salvar como PDF.');
        console.error(e);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Baixar PDF';
        bar.style.display = 'none';
      }
    }

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
  `;

  return (
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
    '<title>Relatorio Biblioteca</title>' +
    `<style>${css}</style>` +
    '</head><body>' +
    '<div id="loading-bar"></div>' +
    '<div id="toolbar">' +
    `<span>Relatorio Geral &nbsp;•&nbsp; ${periodo}</span>` +
    '<button id="btn-pdf" class="btn btn-pdf" onclick="downloadPdf()">Baixar PDF</button>' +
    '<button class="btn btn-print" onclick="window.print()">Imprimir</button>' +
    '</div>' +
    '<div id="content">' +
    '<header>' +
    '<h1>Relatorio Geral — Biblioteca</h1>' +
    `<p>Periodo: ${periodo} &nbsp;|&nbsp; Gerado em: ${geradoEm}</p>` +
    '</header>' +
    sections.join('\n') +
    '</div>' +
    `<script>${script}<\/script>` +
    '</body></html>'
  );
}

export function exportToPdf(data: ReportData, filename = 'relatorio'): void {
  const html = buildHtml(data, filename);
  const win = window.open('', '_blank');
  if (!win) {
    alert('Permita pop-ups para visualizar o relatorio.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
