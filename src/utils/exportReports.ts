import { Transaction, CreatorProfile } from '../types/monetization';
import { formatBRL, formatDate } from './formatters';

export const exportTransactionsToCSV = (
  transactions: Transaction[],
  creator: CreatorProfile,
  summary: {
    totalGross: number;
    totalNet: number;
    availableBalance: number;
    totalWithdrawn: number;
  }
) => {
  // UTF-8 BOM so Excel opens accents and symbols correctly
  const BOM = '\uFEFF';

  const headers = [
    'ID Transacao',
    'Data/Hora',
    'Tipo de Venda',
    'Titulo do Item',
    'Nome do Cliente',
    'Email do Cliente',
    'Metodo de Pagamento',
    'Status',
    'Valor Bruto (R$)',
    'Taxa da Plataforma (R$)',
    'Valor Liquido (R$)',
    'Mensagem/Observacao',
  ];

  const escapeCSV = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = transactions.map((tx) => [
    escapeCSV(tx.id),
    escapeCSV(formatDate(tx.createdAt)),
    escapeCSV(
      tx.type === 'product_sale'
        ? 'Produto Digital'
        : tx.type === 'subscription'
        ? 'Assinatura VIP'
        : tx.type === 'tip'
        ? 'Gorjeta / Apoio Pix'
        : 'Conteúdo Paywall'
    ),
    escapeCSV(tx.title),
    escapeCSV(tx.customerName),
    escapeCSV(tx.customerEmail),
    escapeCSV(tx.paymentMethod.toUpperCase()),
    escapeCSV(tx.status === 'approved' ? 'Aprovado' : 'Pendente'),
    escapeCSV(tx.grossAmount.toFixed(2).replace('.', ',')),
    escapeCSV(tx.fee.toFixed(2).replace('.', ',')),
    escapeCSV(tx.netAmount.toFixed(2).replace('.', ',')),
    escapeCSV(tx.message || ''),
  ]);

  // Add summary header at the top
  const summaryLines = [
    `"RELATORIO FINANCEIRO CONSOLIDADO - MONETIZA HUB"`,
    `"Criador:";${escapeCSV(creator.name)};"Documento:";${escapeCSV(creator.documentNumber || 'Nao informado')}`,
    `"Data de Emissao:";${escapeCSV(new Date().toLocaleDateString('pt-BR'))};"Chave Pix:";${escapeCSV(creator.pixKey)}`,
    `"Faturamento Total Bruto:";${escapeCSV(formatBRL(summary.totalGross))};"Faturamento Liquido:";${escapeCSV(formatBRL(summary.totalNet))}`,
    `"Saldo Disponivel:";${escapeCSV(formatBRL(summary.availableBalance))};"Total Sacado (Visa/Pix):";${escapeCSV(formatBRL(summary.totalWithdrawn))}`,
    `""`, // empty spacer line
  ];

  const csvContent =
    BOM +
    summaryLines.join('\n') +
    '\n' +
    headers.join(';') +
    '\n' +
    rows.map((r) => r.join(';')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nowStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `extrato_financeiro_monetizahub_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
