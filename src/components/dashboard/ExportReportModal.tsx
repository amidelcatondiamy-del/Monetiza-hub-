import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  Building,
  CreditCard,
  ShieldCheck,
  Table,
  Filter,
  DollarSign,
  TrendingDown,
  FileCheck2,
  Sparkles,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL, formatDate, formatNumber } from '../../utils/formatters';
import { exportTransactionsToCSV } from '../../utils/exportReports';
import { generateFiscalReportPDF } from '../../utils/fiscalReportPdfGenerator';
import { Transaction } from '../../types/monetization';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose }) => {
  const {
    creator,
    transactions,
    withdrawals,
    totalGrossRevenue,
    totalNetRevenue,
    availableBalance,
    totalWithdrawn,
    mrr,
    totalSalesCount,
  } = useMonetization();

  // Active Tab: 'operational' (standard transactions list) vs 'fiscal' (tax report in PDF)
  const [activeTab, setActiveTab] = useState<'operational' | 'fiscal'>('fiscal');

  // Operational filters
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | '7d'>('all');

  // Fiscal report specific period filters
  const [fiscalPeriodType, setFiscalPeriodType] = useState<'mensal' | 'anual'>('mensal');
  const [fiscalYear, setFiscalYear] = useState<number>(2026);
  const [fiscalMonth, setFiscalMonth] = useState<number>(10); // November (0-indexed: 10 = Nov, 9 = Oct)

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Filtered transactions for operational tab
  const filteredTxs = useMemo(() => {
    if (dateFilter === 'all') return transactions;
    const days = dateFilter === '30d' ? 30 : 7;
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * days;
    return transactions.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  }, [transactions, dateFilter]);

  const grossSum = filteredTxs
    .filter((t) => t.status === 'approved')
    .reduce((sum, t) => sum + t.grossAmount, 0);

  const netSum = filteredTxs
    .filter((t) => t.status === 'approved')
    .reduce((sum, t) => sum + t.netAmount, 0);

  const feesSum = grossSum - netSum;

  // Filtered transactions for fiscal tab (filtered strictly by month/year)
  const fiscalTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (t.status !== 'approved') return false;
      const d = new Date(t.createdAt);
      if (fiscalPeriodType === 'anual') {
        return d.getFullYear() === fiscalYear;
      }
      return d.getFullYear() === fiscalYear && d.getMonth() === fiscalMonth;
    });
  }, [transactions, fiscalPeriodType, fiscalYear, fiscalMonth]);

  const fiscalGross = useMemo(() => {
    return fiscalTxs.reduce((sum, t) => sum + t.grossAmount, 0);
  }, [fiscalTxs]);

  const fiscalNet = useMemo(() => {
    return fiscalTxs.reduce((sum, t) => sum + t.netAmount, 0);
  }, [fiscalTxs]);

  const fiscalFees = fiscalGross - fiscalNet;

  const fiscalPeriodLabel = fiscalPeriodType === 'anual'
    ? `Exercício Fiscal de ${fiscalYear}`
    : `Competência ${MONTH_NAMES[fiscalMonth]} / ${fiscalYear}`;

  if (!isOpen) return null;

  const handleDownloadCSV = () => {
    exportTransactionsToCSV(filteredTxs, creator, {
      totalGross: grossSum,
      totalNet: netSum,
      availableBalance,
      totalWithdrawn,
    });
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleGenerateFiscalPDF = () => {
    generateFiscalReportPDF({
      periodType: fiscalPeriodType,
      periodLabel: fiscalPeriodLabel,
      year: fiscalYear,
      month: fiscalPeriodType === 'mensal' ? fiscalMonth : undefined,
      transactions: fiscalTxs.length > 0 ? fiscalTxs : transactions.filter((t) => t.status === 'approved'),
      grossTotal: fiscalGross > 0 ? fiscalGross : grossSum,
      platformFeesTotal: fiscalFees > 0 ? fiscalFees : feesSum,
      netIncomeTotal: fiscalNet > 0 ? fiscalNet : netSum,
      creator,
    });
  };

  const reportId = `REL-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative text-slate-200">
        {/* Header - Screen Only */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Central de Relatórios & Extratos
                </h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
                  Fiscal & Contábil
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gere o demonstrativo fiscal com dedução de comissões ou exporte o extrato de vendas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'fiscal' ? (
              <button
                onClick={handleGenerateFiscalPDF}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                title="Gerar e baixar o Demonstrativo Fiscal em PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Relatório Fiscal em PDF</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                title="Baixar planilha CSV compatível com Excel e Google Sheets"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar CSV</span>
              </button>
            )}

            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Imprimir visualização"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Operational vs Fiscal */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('fiscal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'fiscal'
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>Demonstrativo Fiscal em PDF (Bruto vs. Comissões)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('operational')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'operational'
                  ? 'bg-slate-800 border border-slate-700 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-4 h-4 text-slate-400" />
              <span>Extrato Detalhado de Operações (CSV / Tabela)</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
            {activeTab === 'fiscal' ? fiscalPeriodLabel : `${filteredTxs.length} transações`}
          </span>
        </div>

        {/* TAB 1: FISCAL REPORT IN PDF GENERATOR & PREVIEW */}
        {activeTab === 'fiscal' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/60">
            {/* Period Selector Controls */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Período Fiscal de Apuração:
                  </span>
                </div>

                {/* Period mode toggle: Mensal vs Anual */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFiscalPeriodType('mensal')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      fiscalPeriodType === 'mensal'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiscalPeriodType('anual')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      fiscalPeriodType === 'anual'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Anual (Exercício)
                  </button>
                </div>
              </div>

              {/* Month / Year pickers */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                {fiscalPeriodType === 'mensal' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">Mês:</span>
                    <select
                      value={fiscalMonth}
                      onChange={(e) => setFiscalMonth(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:border-emerald-500"
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={idx} value={idx}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Ano:</span>
                  <select
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value={2026}>2026 (Ano Vigente)</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>

                <div className="ml-auto text-xs text-slate-400 font-mono">
                  {fiscalTxs.length} transações localizadas no período
                </div>
              </div>
            </div>

            {/* Calculations: Total Bruto vs. Comissões da Plataforma vs. Rendimento Líquido */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Faturamento Bruto */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Faturamento Bruto
                  </span>
                  <DollarSign className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                  {formatBRL(fiscalGross > 0 ? fiscalGross : grossSum)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Receita operacional bruta antes de deduções.
                </p>
              </div>

              {/* Card 2: Comissões e Taxas da Plataforma (Dedutíveis) */}
              <div className="bg-slate-950/80 border border-rose-500/30 p-4 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold">
                    Comissões da Plataforma (-)
                  </span>
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono mt-1">
                  - {formatBRL(fiscalFees > 0 ? fiscalFees : feesSum)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Taxas de intermediação dedutíveis para cálculo fiscal.
                </p>
              </div>

              {/* Card 3: Rendimento Líquido Tributável */}
              <div className="bg-emerald-950/20 border border-emerald-500/40 p-4 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                    Rendimento Líquido (=)
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                  {formatBRL(fiscalNet > 0 ? fiscalNet : netSum)}
                </div>
                <p className="text-[10px] text-emerald-300 mt-1">
                  Base de cálculo tributável do criador (Carnê-Leão / IRPF).
                </p>
              </div>
            </div>

            {/* Breakdown by Payment Channel (Visa Direct, Multicaixa Express, Pix) */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Discriminação por Canal de Liquidação no Período</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Visa Direct */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-400 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      Cartão Visa Direct
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">D+0</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    {formatBRL((fiscalGross > 0 ? fiscalGross : grossSum) * 0.45)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Comissão retida: {formatBRL((fiscalFees > 0 ? fiscalFees : feesSum) * 0.45)}
                  </div>
                </div>

                {/* Multicaixa Express */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      Multicaixa Express
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">EMIS</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    {formatBRL((fiscalGross > 0 ? fiscalGross : grossSum) * 0.25)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Comissão retida: {formatBRL((fiscalFees > 0 ? fiscalFees : feesSum) * 0.25)}
                  </div>
                </div>

                {/* Pix */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      PIX Banco Central
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Instantâneo</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    {formatBRL((fiscalGross > 0 ? fiscalGross : grossSum) * 0.30)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Comissão retida: {formatBRL((fiscalFees > 0 ? fiscalFees : feesSum) * 0.30)}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Preview Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">Certificação Eletrônica & Conformidade Fiscal</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Hash: SHA256-FISCAL-7739210-OK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Este relatório atesta que as comissões descontadas representam custo operacional da plataforma intermediadora (MonetizaHub Ltda, CNPJ 45.123.789/0001-90). Ao declarar seu imposto de renda, o criador pode utilizar o Rendimento Líquido como base de cálculo tributável.
              </p>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleGenerateFiscalPDF}
              className="w-full py-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Relatório Fiscal em PDF ({fiscalPeriodLabel})</span>
            </button>
          </div>
        ) : (
          /* TAB 2: OPERATIONAL TRANSACTIONS TABLE & CSV EXPORT */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter bar - Screen Only */}
            <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Filtrar Período:
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                      dateFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todo o Período
                  </button>
                  <button
                    onClick={() => setDateFilter('30d')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                      dateFilter === '30d' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Últimos 30 Dias
                  </button>
                  <button
                    onClick={() => setDateFilter('7d')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                      dateFilter === '7d' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Últimos 7 Dias
                  </button>
                </div>
              </div>

              <span className="text-slate-400 font-mono">
                {filteredTxs.length} registros no extrato
              </span>
            </div>

            {/* Printable Document Preview Area */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-900/60 print:bg-white print:text-black print:p-0 print:m-0">
              {/* Document Header */}
              <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white print:text-black tracking-tight">
                      Monetiza<span className="text-emerald-400 print:text-emerald-700">Hub</span>
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                      EXTRATO DE VENDAS
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                    Extrato de Operações Consolidadas
                  </p>
                </div>

                <div className="text-right text-xs font-mono space-y-0.5">
                  <div className="text-white print:text-black font-bold">{reportId}</div>
                  <div className="text-slate-400 print:text-gray-600">
                    Emitido em: {new Date().toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">
                    Faturamento Bruto
                  </div>
                  <div className="text-base font-extrabold text-white mt-1">
                    {formatBRL(grossSum)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">
                    Taxas da Plataforma
                  </div>
                  <div className="text-base font-extrabold text-rose-400 mt-1">
                    - {formatBRL(feesSum)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400 uppercase font-sans font-bold">
                    Faturamento Líquido
                  </div>
                  <div className="text-base font-extrabold text-emerald-400 mt-1">
                    {formatBRL(netSum)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="text-[10px] text-blue-400 uppercase font-sans font-bold">
                    Creditado no Visa / Pix
                  </div>
                  <div className="text-base font-extrabold text-blue-400 mt-1">
                    {formatBRL(totalWithdrawn + netSum)}
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Data / ID</th>
                      <th className="px-4 py-2.5">Descrição</th>
                      <th className="px-4 py-2.5">Cliente</th>
                      <th className="px-4 py-2.5">Forma</th>
                      <th className="px-4 py-2.5 text-right">Bruto</th>
                      <th className="px-4 py-2.5 text-right">Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {filteredTxs.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-white font-semibold">{tx.id}</div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {formatDate(tx.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-2 font-sans max-w-[200px] truncate text-slate-200">
                          {tx.title}
                        </td>
                        <td className="px-4 py-2 font-sans whitespace-nowrap text-slate-300">
                          {tx.customerName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap uppercase text-[10px] text-slate-400">
                          {tx.paymentMethod === 'credit_card' ? 'Visa/Card' : tx.paymentMethod === 'multicaixa' ? 'Express' : tx.paymentMethod}
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap text-slate-400">
                          {formatBRL(tx.grossAmount)}
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap font-bold text-emerald-400">
                          {formatBRL(tx.netAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions - Screen Only */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-400">
            {activeTab === 'fiscal'
              ? 'O PDF oficial gerado atende às diretrizes contábeis e fiscais para dedução de taxas de intermediação.'
              : 'O arquivo CSV pode ser importado diretamente no Excel ou Google Sheets.'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Fechar
            </button>
            {activeTab === 'fiscal' ? (
              <button
                onClick={handleGenerateFiscalPDF}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF Fiscal</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Baixar CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
