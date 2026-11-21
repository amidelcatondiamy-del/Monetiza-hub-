import { jsPDF } from 'jspdf';
import { AITipItem, AISettings, CreatorProfile } from '../types/monetization';
import { formatBRL } from './formatters';

export interface AITipsReportContext {
  tips: AITipItem[];
  creator: CreatorProfile;
  aiSettings: AISettings;
  stats: {
    totalGrossRevenue: number;
    averageTicket: number;
    activeProductsCount: number;
    activeAffiliatesCount: number;
    availableBalance: number;
  };
}

export const generateAITipsPDF = (context: AITipsReportContext): jsPDF => {
  const { tips, creator, aiSettings, stats } = context;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin - 15) {
      doc.addPage();
      currentY = margin;
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = () => {
    doc.setFillColor(30, 27, 75); // Deep Indigo
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('MONETIZAHUB • RESUMO ESTRATÉGICO DE IA (REVISÃO OFFLINE)', margin + 3, currentY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Criador: ${creator.name} (@${creator.handle})`, pageWidth - margin - 3, currentY + 5.5, { align: 'right' });
    currentY += 12;
  };

  // --- COVER / MAIN HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(margin, currentY, contentWidth, 38, 3, 3, 'F');

  // Decorative Accent bar on left
  doc.setFillColor(99, 102, 241); // Indigo 500
  doc.roundedRect(margin, currentY, 3, 38, 1, 1, 'F');

  // Brand & Document Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MONETIZAHUB • COPILOTO DE INTELIGÊNCIA ARTIFICIAL', margin + 6, currentY + 8);

  doc.setFontSize(10);
  doc.setTextColor(199, 210, 254); // Indigo 200
  doc.text('Resumo Estratégico de Sugestões de Conversão para Revisão Offline', margin + 6, currentY + 15);

  // Metadata Grid inside banner
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate 400

  const reportId = `REL-IA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.text(`Protocolo: ${reportId}`, margin + 6, currentY + 23);
  doc.text(`Data de Emissão: ${dateStr}`, margin + 6, currentY + 28);
  doc.text(`Modelo Utilizado: ${aiSettings.model}`, margin + 6, currentY + 33);

  const freqLabel =
    aiSettings.frequency === 'daily'
      ? 'Diária (Recomendada)'
      : aiSettings.frequency === 'weekly'
      ? 'Semanal'
      : 'Em Tempo Real';

  doc.text(`Criador: ${creator.name} (@${creator.handle})`, margin + 85, currentY + 23);
  doc.text(`Frequência de Análise: ${freqLabel}`, margin + 85, currentY + 28);
  doc.text(`Finalidade: Auditoria & Revisão de Negócios Offline`, margin + 85, currentY + 33);

  currentY += 43;

  // --- SECTION: BUSINESS CONTEXT & METRICS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('1. CONTEXTO OPERACIONAL DO NEGÓCIO NO MOMENTO DA ANÁLISE', margin, currentY);
  currentY += 4;

  const boxW = (contentWidth - 9) / 4;
  const metrics = [
    { label: 'RECEITA BRUTA TOTAL', val: formatBRL(stats.totalGrossRevenue), color: [16, 185, 129] },
    { label: 'TICKET MÉDIO', val: formatBRL(stats.averageTicket), color: [59, 130, 246] },
    { label: 'PRODUTOS ATIVOS', val: `${stats.activeProductsCount} itens`, color: [139, 92, 246] },
    { label: 'PARCEIROS AFILIADOS', val: `${stats.activeAffiliatesCount} ativos`, color: [245, 158, 11] },
  ];

  metrics.forEach((m, i) => {
    const x = margin + i * (boxW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, boxW, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3, currentY + 4.5);

    doc.setFontSize(9);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, x + 3, currentY + 10.5);
  });

  currentY += 19;

  // --- SECTION: STRATEGIC RECOMMENDATIONS LIST ---
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`2. RECOMENDAÇÕES DA IA SELECIONADAS (${tips.length} SUGESTÕES ATIVAS)`, margin, currentY);
  currentY += 4;

  tips.forEach((tip, idx) => {
    // Estimate card height: header (10) + desc (16-24) + checklist (16) + offline review box (14) = ~60mm
    const descLines = doc.splitTextToSize(tip.description, contentWidth - 10);
    const estimatedHeight = 36 + descLines.length * 3.5;

    checkPageBreak(estimatedHeight);

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.roundedRect(margin, currentY, contentWidth, estimatedHeight, 2, 2, 'FD');

    // Category top strip
    let stripColor = [99, 102, 241]; // Indigo
    let catName = 'Preços & Combos';
    if (tip.category === 'pricing') {
      stripColor = [16, 185, 129];
      catName = 'Preços & Combos';
    } else if (tip.category === 'affiliates') {
      stripColor = [6, 182, 212];
      catName = 'Afiliados & Parcerias';
    } else if (tip.category === 'retention') {
      stripColor = [99, 102, 241];
      catName = 'Retenção & Membros';
    } else if (tip.category === 'revenue') {
      stripColor = [245, 158, 11];
      catName = 'Receita & Faturamento';
    } else if (tip.category === 'storefront') {
      stripColor = [168, 85, 247];
      catName = 'Vitrine & Carrinho';
    }

    doc.setFillColor(stripColor[0], stripColor[1], stripColor[2]);
    doc.roundedRect(margin, currentY, 3, estimatedHeight, 1, 1, 'F');

    // Badge category & impact
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(stripColor[0], stripColor[1], stripColor[2]);
    doc.text(`SUGESTÃO #${idx + 1} • ${catName.toUpperCase()}`, margin + 6, currentY + 6);

    const impactLabel =
      tip.impact === 'critical'
        ? 'IMPACTO IMEDIATO'
        : tip.impact === 'high'
        ? 'ALTO IMPACTO'
        : 'MÉDIO IMPACTO';

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 75, currentY + 2.5, 32, 5, 1, 1, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(6.5);
    doc.text(impactLabel, margin + 77, currentY + 6);

    // Projected Metric Impact
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`Estimativa: ${tip.metricImpactEstimate}`, pageWidth - margin - 4, currentY + 6, {
      align: 'right',
    });

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(tip.title, margin + 6, currentY + 12);

    // Description (Diagnostic)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(descLines, margin + 6, currentY + 17);

    let nextY = currentY + 17 + descLines.length * 3.5 + 2;

    // Action implementation steps
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin + 6, nextY, contentWidth - 12, 10, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`AÇÃO SUGERIDA: ${tip.actionLabel}`, margin + 8, nextY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Passos recomendados: 1. Revisar margem no painel • 2. Notificar compradores cadastrados • 3. Acompanhar métricas de retenção.', margin + 8, nextY + 7.5);

    nextY += 12;

    // Offline decision checklist boxes
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin + 6, nextY, 3, 3);
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('[ ] Aprovado para aplicar imediatamente', margin + 11, nextY + 2.5);

    doc.rect(margin + 65, nextY, 3, 3);
    doc.text('[ ] Ajustar parâmetros antes de executar', margin + 70, nextY + 2.5);

    doc.rect(margin + 125, nextY, 3, 3);
    doc.text('[ ] Descartar ou reavaliar no próximo ciclo', margin + 130, nextY + 2.5);

    currentY += estimatedHeight + 4;
  });

  // --- SECTION: OFFLINE REVIEW NOTES & SIGNATURE ---
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('3. ESPAÇO PARA ANOTAÇÕES DO CRIADOR & PLANO DE AÇÃO OFFLINE', margin, currentY);
  currentY += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 32, 2, 2, 'FD');

  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 5, currentY + 7, pageWidth - margin - 5, currentY + 7);
  doc.line(margin + 5, currentY + 14, pageWidth - margin - 5, currentY + 14);
  doc.line(margin + 5, currentY + 21, pageWidth - margin - 5, currentY + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Anotações manuais para reuniões de equipe, ajustes de catálogo ou estratégia de campanhas:', margin + 5, currentY + 4);

  // Signatures row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Revisado por (Criador): _______________________________', margin + 5, currentY + 28);
  doc.text('Data de Conclusão: _____ / _____ / 2026', margin + 110, currentY + 28);

  currentY += 38;

  // Page footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - margin - 5, pageWidth - margin, pageHeight - margin - 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Documento confidencial gerado pelo Copiloto de Inteligência Artificial do MonetizaHub para revisão estratégica.',
      margin,
      pageHeight - margin - 1.5
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - margin - 1.5, {
      align: 'right',
    });
  }

  return doc;
};

export const downloadAITipsPDF = (context: AITipsReportContext, filename?: string): void => {
  const doc = generateAITipsPDF(context);
  const cleanFilename =
    filename ||
    `resumo_estrategico_ia_${context.creator.handle || 'criador'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(cleanFilename);
};
