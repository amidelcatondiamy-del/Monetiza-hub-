import { jsPDF } from 'jspdf';
import {
  CreatorProfile,
  Currency,
  Transaction,
  WithdrawalRequest,
} from '../types/monetization';
import { formatCurrency, formatDate } from './formatters';

export type FiscalPeriodPreset = 'all' | 'month' | '30d' | '7d';

export interface FiscalLineItem {
  count: number;
  grossAmount: number;
  fee: number;
  netAmount: number;
}

export interface FiscalSummaryData {
  periodPreset: FiscalPeriodPreset;
  periodLabel: string;
  year: number;
  month: number; // 0-11
  protocolId: string;
  generatedAt: string;
  inflows: {
    productSales: FiscalLineItem;
    subscriptions: FiscalLineItem;
    paywallUnlocks: FiscalLineItem;
    inAppPurchases: FiscalLineItem;
    salesSubtotal: FiscalLineItem;
    tips: FiscalLineItem;
    totalGrossInflows: number;
    totalNetInflows: number;
    totalInflowCount: number;
    pendingGross: number;
    pendingCount: number;
  };
  outflows: {
    transactionProcessingFees: {
      count: number;
      amount: number;
    };
    withdrawalFees: {
      count: number;
      amount: number;
    };
    totalProcessingFees: number;
    completedRepasses: {
      count: number;
      grossRequested: number;
      netTransferred: number;
    };
    processingRepasses: {
      count: number;
      amount: number;
    };
    totalEffectiveOutflows: number; // Taxas de processamento + Repasses concluídos
  };
  balance: {
    netRevenueAfterFees: number; // Entradas Brutas - Taxas de Processamento
    consolidatedBalance: number; // Entradas Brutas - (Taxas de Processamento + Repasses Efetuados)
    effectiveFeeRatePct: number;
  };
  filteredInflows: Transaction[];
  filteredWithdrawals: WithdrawalRequest[];
}

export interface GeneratedFiscalPdfResult {
  filename: string;
  blob: Blob;
  sizeBytes: number;
  protocolId: string;
  generatedAt: string;
}

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function summarizeTransactions(txs: Transaction[]): FiscalLineItem {
  return txs.reduce<FiscalLineItem>(
    (acc, tx) => ({
      count: acc.count + 1,
      grossAmount: Number((acc.grossAmount + (tx.grossAmount || 0)).toFixed(2)),
      fee: Number((acc.fee + (tx.fee || 0)).toFixed(2)),
      netAmount: Number((acc.netAmount + (tx.netAmount || 0)).toFixed(2)),
    }),
    { count: 0, grossAmount: 0, fee: 0, netAmount: 0 }
  );
}

function isWithinPeriod(
  isoDate: string | undefined,
  periodPreset: FiscalPeriodPreset,
  year: number,
  month: number,
  nowMs: number
): boolean {
  if (periodPreset === 'all') return true;
  if (!isoDate) return false;
  const parsedMs = new Date(isoDate).getTime();
  if (Number.isNaN(parsedMs)) return false;

  if (periodPreset === '30d') {
    return nowMs - parsedMs <= 30 * 24 * 60 * 60 * 1000;
  }
  if (periodPreset === '7d') {
    return nowMs - parsedMs <= 7 * 24 * 60 * 60 * 1000;
  }
  const d = new Date(parsedMs);
  return d.getFullYear() === year && d.getMonth() === month;
}

export function buildPeriodLabel(
  periodPreset: FiscalPeriodPreset,
  year: number,
  month: number
): string {
  if (periodPreset === 'all') return 'Todo o Período Histórico';
  if (periodPreset === '30d') return 'Últimos 30 Dias';
  if (periodPreset === '7d') return 'Últimos 7 Dias';
  return `${MONTH_NAMES_PT[month] || 'Mês'} / ${year}`;
}

export function computeFiscalBalanceSummary(params: {
  transactions: Transaction[];
  withdrawals: WithdrawalRequest[];
  periodPreset: FiscalPeriodPreset;
  year: number;
  month: number;
  now?: Date;
}): FiscalSummaryData {
  const nowDate = params.now || new Date();
  const nowMs = nowDate.getTime();
  const periodLabel = buildPeriodLabel(params.periodPreset, params.year, params.month);

  const periodTxs = params.transactions.filter((tx) =>
    isWithinPeriod(tx.createdAt, params.periodPreset, params.year, params.month, nowMs)
  );

  const approvedTxs = periodTxs.filter((tx) => tx.status === 'approved');
  const pendingTxs = periodTxs.filter((tx) => tx.status === 'pending');

  const productSales = summarizeTransactions(
    approvedTxs.filter((t) => t.type === 'product_sale')
  );
  const subscriptions = summarizeTransactions(
    approvedTxs.filter((t) => t.type === 'subscription')
  );
  const paywallUnlocks = summarizeTransactions(
    approvedTxs.filter((t) => t.type === 'paywall_unlock')
  );
  const inAppPurchases = summarizeTransactions(
    approvedTxs.filter((t) => t.type === 'in_app_purchase')
  );
  const tips = summarizeTransactions(approvedTxs.filter((t) => t.type === 'tip'));

  const salesSubtotal: FiscalLineItem = {
    count:
      productSales.count +
      subscriptions.count +
      paywallUnlocks.count +
      inAppPurchases.count,
    grossAmount: Number(
      (
        productSales.grossAmount +
        subscriptions.grossAmount +
        paywallUnlocks.grossAmount +
        inAppPurchases.grossAmount
      ).toFixed(2)
    ),
    fee: Number(
      (
        productSales.fee +
        subscriptions.fee +
        paywallUnlocks.fee +
        inAppPurchases.fee
      ).toFixed(2)
    ),
    netAmount: Number(
      (
        productSales.netAmount +
        subscriptions.netAmount +
        paywallUnlocks.netAmount +
        inAppPurchases.netAmount
      ).toFixed(2)
    ),
  };

  const totalGrossInflows = Number(
    (salesSubtotal.grossAmount + tips.grossAmount).toFixed(2)
  );
  const totalNetInflows = Number(
    (salesSubtotal.netAmount + tips.netAmount).toFixed(2)
  );
  const totalInflowCount = salesSubtotal.count + tips.count;
  const pendingGross = Number(
    pendingTxs.reduce((acc, tx) => acc + (tx.grossAmount || 0), 0).toFixed(2)
  );

  const periodWithdrawals = params.withdrawals.filter((wd) =>
    isWithinPeriod(
      wd.settledAt || wd.requestedAt,
      params.periodPreset,
      params.year,
      params.month,
      nowMs
    )
  );

  const validWithdrawals = periodWithdrawals.filter(
    (wd) => wd.status === 'completed' || wd.status === 'processing'
  );
  const completedWds = periodWithdrawals.filter((wd) => wd.status === 'completed');
  const processingWds = periodWithdrawals.filter((wd) => wd.status === 'processing');

  const txFeeAmount = Number((salesSubtotal.fee + tips.fee).toFixed(2));
  const wdFeeAmount = Number(
    validWithdrawals.reduce((acc, wd) => acc + (wd.fee || 0), 0).toFixed(2)
  );
  const totalProcessingFees = Number((txFeeAmount + wdFeeAmount).toFixed(2));

  const completedRepassesGross = Number(
    completedWds.reduce((acc, wd) => acc + (wd.amount || 0), 0).toFixed(2)
  );
  const completedRepassesNet = Number(
    completedWds.reduce((acc, wd) => acc + (wd.netAmount || 0), 0).toFixed(2)
  );
  const processingRepassesAmount = Number(
    processingWds.reduce((acc, wd) => acc + (wd.netAmount || 0), 0).toFixed(2)
  );

  const totalEffectiveOutflows = Number(
    (totalProcessingFees + completedRepassesNet).toFixed(2)
  );
  const netRevenueAfterFees = Number(
    (totalGrossInflows - totalProcessingFees).toFixed(2)
  );
  const consolidatedBalance = Number(
    (totalGrossInflows - totalEffectiveOutflows).toFixed(2)
  );
  const effectiveFeeRatePct =
    totalGrossInflows > 0
      ? Number(((totalProcessingFees / totalGrossInflows) * 100).toFixed(2))
      : 0;

  const yyyymmdd = `${nowDate.getFullYear()}${String(nowDate.getMonth() + 1).padStart(
    2,
    '0'
  )}${String(nowDate.getDate()).padStart(2, '0')}`;
  const deterministicSuffix = String(
    Math.abs(
      Math.round(totalGrossInflows * 100) +
        totalInflowCount * 37 +
        completedWds.length * 19 +
        params.month * 13
    ) % 9000 +
      1000
  );

  return {
    periodPreset: params.periodPreset,
    periodLabel,
    year: params.year,
    month: params.month,
    protocolId: `RF-${yyyymmdd}-${deterministicSuffix}`,
    generatedAt: nowDate.toISOString(),
    inflows: {
      productSales,
      subscriptions,
      paywallUnlocks,
      inAppPurchases,
      salesSubtotal,
      tips,
      totalGrossInflows,
      totalNetInflows,
      totalInflowCount,
      pendingGross,
      pendingCount: pendingTxs.length,
    },
    outflows: {
      transactionProcessingFees: {
        count: totalInflowCount,
        amount: txFeeAmount,
      },
      withdrawalFees: {
        count: validWithdrawals.length,
        amount: wdFeeAmount,
      },
      totalProcessingFees,
      completedRepasses: {
        count: completedWds.length,
        grossRequested: completedRepassesGross,
        netTransferred: completedRepassesNet,
      },
      processingRepasses: {
        count: processingWds.length,
        amount: processingRepassesAmount,
      },
      totalEffectiveOutflows,
    },
    balance: {
      netRevenueAfterFees,
      consolidatedBalance,
      effectiveFeeRatePct,
    },
    filteredInflows: [...approvedTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    filteredWithdrawals: [...periodWithdrawals].sort(
      (a, b) =>
        new Date(b.settledAt || b.requestedAt).getTime() -
        new Date(a.settledAt || a.requestedAt).getTime()
    ),
  };
}

function maskDocumentForPdf(doc?: string): string {
  if (!doc) return 'Não informado';
  const trimmed = doc.trim();
  if (trimmed.length <= 5) return trimmed;
  return `${trimmed.slice(0, 3)}.***.***-${trimmed.slice(-2)}`;
}

function getWithdrawalChannelLabel(type: WithdrawalRequest['destinationType']): string {
  switch (type) {
    case 'pix':
      return 'PIX Instantâneo';
    case 'visa_card':
      return 'Cartão Visa Direct';
    case 'express':
      return 'Multicaixa Express';
    case 'ted':
      return 'TED Bancária';
    case 'paypal':
      return 'PayPal Express';
    default:
      return String(type).toUpperCase();
  }
}

export function generateFiscalSummaryPdf(
  summary: FiscalSummaryData,
  creator: CreatorProfile,
  currency: Currency = 'BRL',
  options: { autoDownload?: boolean } = { autoDownload: true }
): GeneratedFiscalPdfResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fmt = (amountInBRL: number) => formatCurrency(amountInBRL, currency, true);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  // Header Accent Bar
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(margin, y, contentWidth, 2.5, 'F');
  y += 7;

  // Title & Simulated Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('RESUMO FISCAL CONSOLIDADO', margin, y);

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth - margin - 46, y - 4.5, 46, 6, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('PDF SIMULADO DE CONFERÊNCIA', pageWidth - margin - 43.5, y - 0.5);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Balanço consolidado de entradas (vendas e tips) e saídas (taxas de processamento e repasses)',
    margin,
    y
  );
  y += 6;

  // Protocol & Creator Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`CRIADOR: ${creator.name} (@${creator.handle})`, margin + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CPF/CNPJ: ${maskDocumentForPdf(creator.documentNumber)}   •   MOEDA DE EXIBIÇÃO: ${currency}`,
    margin + 4,
    y + 10.5
  );
  doc.text(`PERÍODO: ${summary.periodLabel}`, margin + 4, y + 15.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`PROTOCOLO: ${summary.protocolId}`, margin + contentWidth - 62, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `EMISSÃO: ${formatDate(summary.generatedAt)}`,
    margin + contentWidth - 62,
    y + 10.5
  );
  doc.text('NATUREZA: Documento Simulado', margin + contentWidth - 62, y + 15.5);
  y += 26;

  // Executive KPI Cards (3 boxes)
  const cardGap = 4;
  const cardW = (contentWidth - cardGap * 2) / 3;

  // Card 1: Total Entradas
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, cardW, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70);
  doc.text('TOTAL DE ENTRADAS BRUTAS', margin + 3.5, y + 5.5);
  doc.setFontSize(11.5);
  doc.text(fmt(summary.inflows.totalGrossInflows), margin + 3.5, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${summary.inflows.totalInflowCount} lançamentos aprovados`, margin + 3.5, y + 15.8);

  // Card 2: Total Saídas
  const card2X = margin + cardW + cardGap;
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(card2X, y, cardW, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(159, 18, 57);
  doc.text('TOTAL DE SAÍDAS (TAXAS + REPASSES)', card2X + 3.5, y + 5.5);
  doc.setFontSize(11.5);
  doc.text(fmt(summary.outflows.totalEffectiveOutflows), card2X + 3.5, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `Taxas ${fmt(summary.outflows.totalProcessingFees)} • Repasses ${fmt(
      summary.outflows.completedRepasses.netTransferred
    )}`,
    card2X + 3.5,
    y + 15.8
  );

  // Card 3: Saldo Consolidado
  const card3X = margin + (cardW + cardGap) * 2;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(card3X, y, cardW, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('SALDO CONSOLIDADO (ENTRADAS - SAÍDAS)', card3X + 3.5, y + 5.5);
  doc.setFontSize(11.5);
  doc.text(fmt(summary.balance.consolidatedBalance), card3X + 3.5, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `Taxa efetiva média: ${summary.balance.effectiveFeeRatePct.toFixed(2)}%`,
    card3X + 3.5,
    y + 15.8
  );
  y += 24;

  // Section 1: ENTRADAS (VENDAS E TIPS)
  ensureSpace(46);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. BALANÇO DE ENTRADAS (VENDAS E TIPS)', margin, y);
  y += 4;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ORIGEM DA RECEITA', margin + 3, y + 4.4);
  doc.text('QTD', margin + 96, y + 4.4);
  doc.text('VALOR BRUTO', margin + 114, y + 4.4);
  doc.text('TAXAS RETIDAS', margin + 142, y + 4.4);
  doc.text('LÍQUIDO', margin + contentWidth - 22, y + 4.4);
  y += 6.5;

  const inflowRows = [
    { label: 'Vendas — Produtos Digitais', item: summary.inflows.productSales },
    { label: 'Vendas — Assinaturas Recorrentes', item: summary.inflows.subscriptions },
    { label: 'Vendas — Desbloqueios Paywall', item: summary.inflows.paywallUnlocks },
    { label: 'Vendas — Compras In-App', item: summary.inflows.inAppPurchases },
    { label: 'Tips — Gorjetas e Apoios Pix', item: summary.inflows.tips },
  ];

  inflowRows.forEach((row, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(row.label, margin + 3, y + 4.2);
    doc.text(String(row.item.count), margin + 96, y + 4.2);
    doc.text(fmt(row.item.grossAmount), margin + 114, y + 4.2);
    doc.setTextColor(190, 18, 60);
    doc.text(`- ${fmt(row.item.fee)}`, margin + 142, y + 4.2);
    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt(row.item.netAmount), margin + contentWidth - 22, y + 4.2);
    y += 6;
  });

  // Subtotal Entradas
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.rect(margin, y, contentWidth, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70);
  doc.text('TOTAL CONSOLIDADO DE ENTRADAS', margin + 3, y + 4.8);
  doc.text(String(summary.inflows.totalInflowCount), margin + 96, y + 4.8);
  doc.text(fmt(summary.inflows.totalGrossInflows), margin + 114, y + 4.8);
  doc.text(
    `- ${fmt(summary.outflows.transactionProcessingFees.amount)}`,
    margin + 142,
    y + 4.8
  );
  doc.text(fmt(summary.inflows.totalNetInflows), margin + contentWidth - 22, y + 4.8);
  y += 12;

  // Section 2: SAÍDAS (TAXAS DE PROCESSAMENTO E REPASSES)
  ensureSpace(42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. BALANÇO DE SAÍDAS (TAXAS DE PROCESSAMENTO E REPASSES)', margin, y);
  y += 4;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NATUREZA DA SAÍDA / DEDUÇÃO', margin + 3, y + 4.4);
  doc.text('OCORRÊNCIAS', margin + 106, y + 4.4);
  doc.text('STATUS', margin + 132, y + 4.4);
  doc.text('VALOR', margin + contentWidth - 24, y + 4.4);
  y += 6.5;

  const outflowRows = [
    {
      label: 'Taxas de Processamento de Vendas & Tips (Gateway + Plataforma)',
      count: `${summary.outflows.transactionProcessingFees.count} txs`,
      status: 'Retido',
      amount: summary.outflows.transactionProcessingFees.amount,
      included: true,
    },
    {
      label: 'Taxas Administrativas de Repasse / Saque',
      count: `${summary.outflows.withdrawalFees.count} saques`,
      status: 'Retido',
      amount: summary.outflows.withdrawalFees.amount,
      included: true,
    },
    {
      label: 'Repasses Liquidados ao Criador (Pix / Visa Direct / Express / TED)',
      count: `${summary.outflows.completedRepasses.count} repasses`,
      status: 'Liquidado',
      amount: summary.outflows.completedRepasses.netTransferred,
      included: true,
    },
    {
      label: 'Repasses em Processamento (Aguardando Liquidação Bancária)',
      count: `${summary.outflows.processingRepasses.count} pendentes`,
      status: 'Informativo',
      amount: summary.outflows.processingRepasses.amount,
      included: false,
    },
  ];

  outflowRows.forEach((row, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(row.included ? 30 : 100, row.included ? 41 : 116, row.included ? 59 : 139);
    doc.text(row.label, margin + 3, y + 4.2);
    doc.text(row.count, margin + 106, y + 4.2);
    doc.text(row.status, margin + 132, y + 4.2);
    doc.setFont('helvetica', row.included ? 'bold' : 'normal');
    doc.setTextColor(row.included ? 190 : 148, row.included ? 18 : 163, row.included ? 60 : 184);
    doc.text(
      row.included ? `- ${fmt(row.amount)}` : fmt(row.amount),
      margin + contentWidth - 24,
      y + 4.2
    );
    y += 6;
  });

  // Subtotal Saídas
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(244, 63, 94);
  doc.rect(margin, y, contentWidth, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(159, 18, 57);
  doc.text('TOTAL EFETIVO DE SAÍDAS NO PERÍODO', margin + 3, y + 4.8);
  doc.text(
    `- ${fmt(summary.outflows.totalEffectiveOutflows)}`,
    margin + contentWidth - 24,
    y + 4.8
  );
  y += 12;

  // Section 3: FECHAMENTO DO BALANÇO CONSOLIDADO
  ensureSpace(34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. FECHAMENTO DO BALANÇO CONSOLIDADO', margin, y);
  y += 4;

  const closingLines = [
    {
      label: '(+) Entradas Brutas Consolidadas (Vendas + Tips)',
      val: fmt(summary.inflows.totalGrossInflows),
      bold: false,
    },
    {
      label: '(-) Taxas de Processamento e Intermediação Totais',
      val: `- ${fmt(summary.outflows.totalProcessingFees)}`,
      bold: false,
    },
    {
      label: '(=) Receita Líquida Gerada após Taxas',
      val: fmt(summary.balance.netRevenueAfterFees),
      bold: true,
    },
    {
      label: '(-) Repasses / Saques Efetivamente Liquidados',
      val: `- ${fmt(summary.outflows.completedRepasses.netTransferred)}`,
      bold: false,
    },
    {
      label: '(=) SALDO CONSOLIDADO FINAL DO PERÍODO',
      val: fmt(summary.balance.consolidatedBalance),
      bold: true,
      highlight: true,
    },
  ];

  closingLines.forEach((line) => {
    if (line.highlight) {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(100, 116, 139);
      doc.rect(margin, y, contentWidth, 7.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(line.label, margin + 3, y + 5);
      doc.text(line.val, margin + contentWidth - 26, y + 5);
      y += 7.5;
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(line.label, margin + 3, y + 4.2);
      doc.text(line.val, margin + contentWidth - 26, y + 4.2);
      y += 6;
    }
  });
  y += 8;

  // Section 4: Extrato Consolidado de Repasses e Movimentações
  ensureSpace(26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('4. EXTRATO RECENTE DE REPASSES E ENTRADAS DO PERÍODO', margin, y);
  y += 4;

  const sampleMovements = [
    ...summary.filteredWithdrawals.slice(0, 5).map((wd) => ({
      date: wd.settledAt || wd.requestedAt,
      desc: `Repasse ${getWithdrawalChannelLabel(wd.destinationType)} (${wd.receiptNumber})`,
      kind: wd.status === 'completed' ? 'Saída / Repasse' : `Repasse (${wd.status})`,
      amountText: `- ${fmt(wd.netAmount)}`,
      isOutflow: true,
    })),
    ...summary.filteredInflows.slice(0, 7).map((tx) => ({
      date: tx.createdAt,
      desc: tx.title,
      kind: tx.type === 'tip' ? 'Entrada / Tip' : 'Entrada / Venda',
      amountText: `+ ${fmt(tx.grossAmount)}`,
      isOutflow: false,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DATA', margin + 3, y + 4.2);
  doc.text('DESCRIÇÃO DO LANÇAMENTO', margin + 34, y + 4.2);
  doc.text('TIPO', margin + 126, y + 4.2);
  doc.text('VALOR', margin + contentWidth - 24, y + 4.2);
  y += 6;

  if (sampleMovements.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma movimentação registrada no período selecionado.', margin + 3, y + 5);
    y += 8;
  } else {
    sampleMovements.slice(0, 12).forEach((mov, idx) => {
      ensureSpace(7);
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, contentWidth, 5.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(formatDate(mov.date).slice(0, 12), margin + 3, y + 3.8);
      const cleanDesc = mov.desc.length > 48 ? `${mov.desc.slice(0, 48)}...` : mov.desc;
      doc.setTextColor(15, 23, 42);
      doc.text(cleanDesc, margin + 34, y + 3.8);
      doc.setTextColor(100, 116, 139);
      doc.text(mov.kind, margin + 126, y + 3.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(mov.isOutflow ? 190 : 5, mov.isOutflow ? 18 : 150, mov.isOutflow ? 60 : 105);
      doc.text(mov.amountText, margin + contentWidth - 24, y + 3.8);
      y += 5.5;
    });
  }

  y += 6;
  ensureSpace(20);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('NOTA DE CARÁTER SIMULADO E CONFERÊNCIA CONTÁBIL', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Este arquivo PDF simulado consolida as entradas brutas (vendas de produtos, assinaturas, paywall, in-app e tips) e saídas (taxas de processamento e repasses efetuados) registradas no Painel Financeiro para conferência rápida e apoio contábil.',
    margin + 4,
    y + 9.2,
    { maxWidth: contentWidth - 8 }
  );

  const safePeriodSlug =
    summary.periodPreset === 'month'
      ? `${summary.year}_${String(summary.month + 1).padStart(2, '0')}`
      : summary.periodPreset;
  const filename = `resumo_fiscal_${safePeriodSlug}_${summary.protocolId.toLowerCase()}.pdf`;

  const blob = doc.output('blob');
  if (options.autoDownload !== false) {
    doc.save(filename);
  }

  return {
    filename,
    blob,
    sizeBytes: blob.size,
    protocolId: summary.protocolId,
    generatedAt: summary.generatedAt,
  };
}
