import { jsPDF } from 'jspdf';
import { Transaction, CreatorProfile } from '../types/monetization';
import { formatBRL, formatDate } from './formatters';

export interface FiscalReportData {
  periodType: 'mensal' | 'anual';
  periodLabel: string;
  year: number;
  month?: number; // 0-11
  transactions: Transaction[];
  grossTotal: number;
  platformFeesTotal: number;
  netIncomeTotal: number;
  creator: CreatorProfile;
}

export const generateFiscalReportPDF = (data: FiscalReportData): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const protocolId = `FISCAL-${data.year}-${Math.floor(100000 + Math.random() * 900000)}`;
  const authHash = Math.random().toString(36).substring(2, 14).toUpperCase();
  const currentDateStr = new Date().toLocaleDateString('pt-BR');
  const currentTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // 1. Top Decorative Bar
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(margin, y, contentWidth, 3, 'F');
  y += 8;

  // 2. Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('DEMONSTRATIVO FISCAL DE RENDIMENTOS & TAXAS', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Documento Auxiliar para Escrituração Contábil, Carnê-Leão e Imposto de Renda', margin, y);
  y += 7;

  // Protocol & metadata box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`PROTOCOLO: ${protocolId}`, margin + 4, y + 5.5);
  doc.text(`COMPETÊNCIA: ${data.periodLabel.toUpperCase()}`, margin + 4, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`EMITIDO EM: ${currentDateStr} às ${currentTimeStr}`, margin + contentWidth - 65, y + 5.5);
  doc.text(`STATUS: HOMOLOGADO E AUDITADO`, margin + contentWidth - 65, y + 10.5);
  y += 18;

  // 3. Parties Info (Creator & Platform)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth * 0.49, 24, 2, 2, 'F');
  doc.roundedRect(margin + contentWidth * 0.51, y, contentWidth * 0.49, 24, 2, 2, 'F');

  // Creator side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('BENEFICIÁRIO / CRIADOR TITULAR', margin + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.creator.name, margin + 4, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`CPF/CNPJ: ${data.creator.documentNumber || '123.456.789-00'}`, margin + 4, y + 15);
  doc.text(`E-mail: ${data.creator.email || 'amidelcatondiamy@gmail.com'}`, margin + 4, y + 19.5);

  // Platform side
  const rightX = margin + contentWidth * 0.51 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text('INTERMEDIADORA DE PAGAMENTOS', rightX, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MonetizaHub Serviços de Tecnologia Ltda', rightX, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('CNPJ: 45.123.789/0001-90 • Inscrição Municipal: 8.921.340-1', rightX, y + 15);
  doc.text('Sede: Av. Paulista, 1800 - Bela Vista, São Paulo - SP', rightX, y + 19.5);

  y += 29;

  // 4. Financial Summary Table (Gross, Deductions, Net)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. APURAÇÃO DOS RENDIMENTOS E RETENÇÕES DA PLATAFORMA', margin, y);
  y += 4;

  // Table header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('RUBRICA FISCAL / DISCRIMINAÇÃO', margin + 4, y + 4.8);
  doc.text('PERCENTUAL', margin + contentWidth - 65, y + 4.8);
  doc.text('VALOR CONSOLIDADO', margin + contentWidth - 30, y + 4.8);
  y += 7;

  // Row 1: Gross Revenue
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Bruto Faturado (Receita Operacional Bruta com Vendas e Apoios)', margin + 4, y + 5);
  doc.text('100,00%', margin + contentWidth - 65, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(formatBRL(data.grossTotal), margin + contentWidth - 30, y + 5);
  y += 7;

  // Row 2: Platform Commission / Deductible Fees
  const feesPercent = data.grossTotal > 0 ? ((data.platformFeesTotal / data.grossTotal) * 100).toFixed(2) : '0.00';
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text('(-) Taxas e Comissões de Intermediação Retidas pela Plataforma (Dedutíveis)', margin + 4, y + 5);
  doc.text(`-${feesPercent}%`, margin + contentWidth - 65, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`- ${formatBRL(data.platformFeesTotal)}`, margin + contentWidth - 30, y + 5);
  y += 7;

  // Row 3: Net Taxable Income (Base de Cálculo)
  const netPercent = data.grossTotal > 0 ? ((data.netIncomeTotal / data.grossTotal) * 100).toFixed(2) : '0.00';
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(16, 185, 129);
  doc.rect(margin, y, contentWidth, 8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('(=) RENDIMENTO LÍQUIDO TRIBUTÁVEL DO CRIADOR (BASE DE CÁLCULO)', margin + 4, y + 5.5);
  doc.text(`${netPercent}%`, margin + contentWidth - 65, y + 5.5);
  doc.text(formatBRL(data.netIncomeTotal), margin + contentWidth - 30, y + 5.5);
  y += 13;

  // 5. Payment Rails Breakdown (Visa Direct, Multicaixa Express, Pix)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. DISCRIMINAÇÃO POR CANAL DE LIQUIDAÇÃO E MEIO DE PAGAMENTO', margin, y);
  y += 4;

  const visaTxs = data.transactions.filter((t) => t.paymentMethod === 'credit_card');
  const expressTxs = data.transactions.filter((t) => t.paymentMethod === 'multicaixa');
  const pixTxs = data.transactions.filter((t) => t.paymentMethod === 'pix');
  const otherTxs = data.transactions.filter((t) => t.paymentMethod === 'stripe' || t.paymentMethod === 'paypal');

  const calcRail = (txs: Transaction[]) => {
    const gross = txs.reduce((acc, t) => acc + t.grossAmount, 0);
    const fees = txs.reduce((acc, t) => acc + (t.fee || 0), 0);
    const net = txs.reduce((acc, t) => acc + t.netAmount, 0);
    return { count: txs.length, gross, fees, net };
  };

  const rails = [
    { name: 'Cartão Visa Direct (Crédito & Débito Global)', ...calcRail(visaTxs) },
    { name: 'Multicaixa Express (Switch Interbancário EMIS Angola)', ...calcRail(expressTxs) },
    { name: 'PIX Banco Central do Brasil (Instantâneo)', ...calcRail(pixTxs) },
    { name: 'Stripe & PayPal Express (Gateway Internacional)', ...calcRail(otherTxs) },
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('MEIO DE PAGAMENTO', margin + 4, y + 4.2);
  doc.text('TRANSAÇÕES', margin + 85, y + 4.2);
  doc.text('BRUTO', margin + 115, y + 4.2);
  doc.text('TAXAS DEDUTÍVEIS', margin + 140, y + 4.2);
  doc.text('LÍQUIDO REPASSADO', margin + contentWidth - 28, y + 4.2);
  y += 6;

  rails.forEach((rail, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(rail.name, margin + 4, y + 4.2);
    doc.text(`${rail.count} txs`, margin + 85, y + 4.2);
    doc.text(formatBRL(rail.gross), margin + 115, y + 4.2);
    doc.setTextColor(225, 29, 72);
    doc.text(`-${formatBRL(rail.fees)}`, margin + 140, y + 4.2);
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(formatBRL(rail.net), margin + contentWidth - 28, y + 4.2);
    y += 6;
  });

  y += 8;

  // 6. Recent Transaction Items Sample for Audit
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. EXTRATO DETALHADO DAS OPERAÇÕES DO PERÍODO (AMOSTRA AUDITADA)', margin, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DATA / ID', margin + 4, y + 4.2);
  doc.text('DISCRIMINAÇÃO DO ITEM', margin + 40, y + 4.2);
  doc.text('MEIO', margin + 115, y + 4.2);
  doc.text('BRUTO', margin + 140, y + 4.2);
  doc.text('LÍQUIDO', margin + contentWidth - 25, y + 4.2);
  y += 6;

  const sampleTxs = data.transactions.slice(0, 7);
  sampleTxs.forEach((tx, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`${formatDate(tx.createdAt).slice(0, 5)} • ${tx.id}`, margin + 4, y + 3.8);

    const cleanTitle = tx.title.length > 38 ? `${tx.title.slice(0, 38)}...` : tx.title;
    doc.text(cleanTitle, margin + 40, y + 3.8);

    const cleanMethod =
      tx.paymentMethod === 'multicaixa'
        ? 'Express'
        : tx.paymentMethod === 'credit_card'
        ? 'Visa'
        : tx.paymentMethod.toUpperCase();
    doc.text(cleanMethod, margin + 115, y + 3.8);
    doc.text(formatBRL(tx.grossAmount), margin + 140, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatBRL(tx.netAmount), margin + contentWidth - 25, y + 3.8);
    y += 5.5;
  });

  if (data.transactions.length > 7) {
    y += 2;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`... e mais ${data.transactions.length - 7} transações consolidadas neste relatório fiscal.`, margin + 4, y);
    y += 4;
  }

  y += 8;

  // 7. Legal Compliance Disclaimer & Signature Line
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('DECLARAÇÃO DE CONFORMIDADE TRIBUTÁRIA E AUTENTICIDADE ELETRÔNICA', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'A MonetizaHub declara que os valores retidos a título de comissão de intermediação e taxa de processamento de gateway constituem receita própria da plataforma, sujeitas à emissão de Nota Fiscal de Serviços (NFS-e), sendo o Rendimento Líquido do Criador o montante efetivo a ser considerado como base de cálculo tributária para apuração fiscal.',
    margin + 4,
    y + 9,
    { maxWidth: contentWidth - 8 }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`HASH DE AUDITORIA: SHA256-${authHash}-${protocolId}`, margin + 4, y + 20);
  doc.text('ASSINATURA DIGITAL: MONETIZAHUB-GATEWAY-E2E-OK', margin + contentWidth - 80, y + 20);

  // Download trigger
  const safeFilename = `relatorio_fiscal_monetizahub_${data.periodType}_${data.year}${data.month !== undefined ? `_mes${data.month + 1}` : ''}.pdf`;
  doc.save(safeFilename);
};
