import React, { useMemo, useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Scale,
  Receipt,
} from 'lucide-react';
import {
  CreatorProfile,
  Currency,
  Transaction,
  WithdrawalRequest,
} from '../../types/monetization';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  computeFiscalBalanceSummary,
  FiscalPeriodPreset,
  GeneratedFiscalPdfResult,
  generateFiscalSummaryPdf,
} from '../../utils/fiscalSummaryPdf';

interface FiscalSummaryCardProps {
  transactions: Transaction[];
  withdrawals: WithdrawalRequest[];
  creator: CreatorProfile;
  currency: Currency;
}

const MONTH_OPTIONS = [
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

export const FiscalSummaryCard: React.FC<FiscalSummaryCardProps> = ({
  transactions,
  withdrawals,
  creator,
  currency,
}) => {
  const now = new Date();
  const [periodPreset, setPeriodPreset] = useState<FiscalPeriodPreset>('all');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastGeneratedPdf, setLastGeneratedPdf] =
    useState<GeneratedFiscalPdfResult | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>([now.getFullYear(), now.getFullYear() - 1]);
    transactions.forEach((tx) => {
      const y = new Date(tx.createdAt).getFullYear();
      if (!Number.isNaN(y)) years.add(y);
    });
    withdrawals.forEach((wd) => {
      const y = new Date(wd.settledAt || wd.requestedAt).getFullYear();
      if (!Number.isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, withdrawals, now]);

  const summary = useMemo(
    () =>
      computeFiscalBalanceSummary({
        transactions,
        withdrawals,
        periodPreset,
        year: selectedYear,
        month: selectedMonth,
      }),
    [transactions, withdrawals, periodPreset, selectedYear, selectedMonth]
  );

  const fmt = (amountInBRL: number) => formatCurrency(amountInBRL, currency, true);

  const handleGeneratePdf = () => {
    setIsGenerating(true);
    try {
      const result = generateFiscalSummaryPdf(summary, creator, currency, {
        autoDownload: true,
      });
      setLastGeneratedPdf(result);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section
      id="resumo-fiscal-section"
      aria-labelledby="resumo-fiscal-heading"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden"
    >
      {/* Top Header & Controls */}
      <div className="p-6 border-b border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3
                id="resumo-fiscal-heading"
                className="text-base font-bold text-white tracking-tight"
              >
                Resumo Fiscal
              </h3>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md">
                {summary.protocolId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Balanço consolidado de entradas (vendas e tips) e saídas (taxas de
              processamento e repasses) com geração de arquivo PDF simulado.
            </p>
          </div>
        </div>

        {/* Period Controls + Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Selecionar período do resumo fiscal"
            className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800"
          >
            {(
              [
                { id: 'all', label: 'Todo Período' },
                { id: '30d', label: '30 Dias' },
                { id: '7d', label: '7 Dias' },
                { id: 'month', label: 'Competência' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriodPreset(opt.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  periodPreset === opt.id
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {periodPreset === 'month' && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Mês de competência"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {MONTH_OPTIONS.map((name, idx) => (
                  <option key={name} value={idx} className="bg-slate-900 text-white">
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Ano de competência"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-mono focus:outline-none cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900 text-white">
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowPdfPreview((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            {showPdfPreview ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Ocultar Prévia</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-300" />
                <span>Pré-visualizar PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Gerando PDF...' : 'Gerar PDF Simulado'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Banner after generating PDF */}
      {lastGeneratedPdf && (
        <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              PDF simulado gerado:{' '}
              <strong className="font-mono text-white">{lastGeneratedPdf.filename}</strong>{' '}
              <span className="font-mono text-emerald-200/80">
                ({(lastGeneratedPdf.sizeBytes / 1024).toFixed(1)} KB • Protocolo{' '}
                {lastGeneratedPdf.protocolId})
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleGeneratePdf}
            className="text-emerald-300 hover:text-white font-semibold underline underline-offset-2 self-start sm:self-auto cursor-pointer"
          >
            Baixar novamente
          </button>
        </div>
      )}

      {/* 4-Column Consolidated KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/40">
        <div className="p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Entradas Brutas</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {fmt(summary.inflows.totalGrossInflows)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            Vendas ({summary.inflows.salesSubtotal.count}) + Tips ({summary.inflows.tips.count})
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Taxas de Processamento</span>
            <Receipt className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-rose-400 font-mono tabular-nums">
            - {fmt(summary.outflows.totalProcessingFees)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            Alíquota efetiva: {summary.balance.effectiveFeeRatePct.toFixed(2)}%
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Repasses Liquidados</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-amber-300 font-mono tabular-nums">
            - {fmt(summary.outflows.completedRepasses.netTransferred)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            {summary.outflows.completedRepasses.count} repasse(s) concluído(s)
            {summary.outflows.processingRepasses.count > 0
              ? ` • ${summary.outflows.processingRepasses.count} em análise`
              : ''}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Saldo Consolidado</span>
            <FileText className="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-white font-mono tabular-nums">
            {fmt(summary.balance.consolidatedBalance)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            Líquido após taxas: {fmt(summary.balance.netRevenueAfterFees)}
          </div>
        </div>
      </div>

      {/* Side-by-Side Ledger Breakdown: Entradas vs Saídas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* Left: ENTRADAS */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Entradas (Vendas & Tips)
            </h4>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {summary.inflows.totalInflowCount} aprovadas
              {summary.inflows.pendingCount > 0
                ? ` • ${summary.inflows.pendingCount} pendentes (${fmt(
                    summary.inflows.pendingGross
                  )})`
                : ''}
            </span>
          </div>

          <div className="divide-y divide-slate-800/70 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">
                  Vendas de Produtos Digitais
                </span>
                <span className="ml-2 text-[11px] font-mono text-slate-500">
                  ({summary.inflows.productSales.count})
                </span>
              </div>
              <span className="font-mono font-semibold text-white tabular-nums">
                {fmt(summary.inflows.productSales.grossAmount)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">
                  Assinaturas Recorrentes
                </span>
                <span className="ml-2 text-[11px] font-mono text-slate-500">
                  ({summary.inflows.subscriptions.count})
                </span>
              </div>
              <span className="font-mono font-semibold text-white tabular-nums">
                {fmt(summary.inflows.subscriptions.grossAmount)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">
                  Desbloqueios Paywall & In-App
                </span>
                <span className="ml-2 text-[11px] font-mono text-slate-500">
                  (
                  {summary.inflows.paywallUnlocks.count +
                    summary.inflows.inAppPurchases.count}
                  )
                </span>
              </div>
              <span className="font-mono font-semibold text-white tabular-nums">
                {fmt(
                  summary.inflows.paywallUnlocks.grossAmount +
                    summary.inflows.inAppPurchases.grossAmount
                )}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">
                  Tips / Gorjetas de Apoiadores
                </span>
                <span className="ml-2 text-[11px] font-mono text-slate-500">
                  ({summary.inflows.tips.count})
                </span>
              </div>
              <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                {fmt(summary.inflows.tips.grossAmount)}
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between font-bold text-sm">
              <span className="text-slate-100">Subtotal de Entradas Brutas</span>
              <span className="font-mono text-emerald-400 tabular-nums">
                + {fmt(summary.inflows.totalGrossInflows)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: SAÍDAS */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Saídas (Taxas de Processamento & Repasses)
            </h4>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {summary.periodLabel}
            </span>
          </div>

          <div className="divide-y divide-slate-800/70 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">
                  Taxas de Processamento de Vendas & Tips
                </span>
                <span className="ml-2 text-[11px] font-mono text-slate-500">
                  ({summary.outflows.transactionProcessingFees.count} txs)
                </span>
              </div>
              <span className="font-mono font-semibold text-rose-300 tabular-nums">
                - {fmt(summary.outflows.transactionProcessingFees.amount)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">
                  Taxas Administrativas de Repasse / Saque
                </span>
                <span className="ml-2 text-[11px] font-mono text-slate-500">
                  ({summary.outflows.withdrawalFees.count} saques)
                </span>
              </div>
              <span className="font-mono font-semibold text-rose-300 tabular-nums">
                - {fmt(summary.outflows.withdrawalFees.amount)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">
                  Repasses Liquidados ao Criador
                </span>
                <span className="ml-2 text-[11px] font-mono text-slate-500">
                  ({summary.outflows.completedRepasses.count} concluídos)
                </span>
              </div>
              <span className="font-mono font-semibold text-amber-300 tabular-nums">
                - {fmt(summary.outflows.completedRepasses.netTransferred)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="text-slate-400">
                  Repasses em Processamento (Informativo)
                </span>
                <span className="ml-2 text-[11px] font-mono text-slate-500">
                  ({summary.outflows.processingRepasses.count})
                </span>
              </div>
              <span className="font-mono text-slate-400 tabular-nums">
                {fmt(summary.outflows.processingRepasses.amount)}
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between font-bold text-sm">
              <span className="text-slate-100">Subtotal de Saídas Efetivas</span>
              <span className="font-mono text-rose-400 tabular-nums">
                - {fmt(summary.outflows.totalEffectiveOutflows)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline A4 Simulated PDF Document Preview */}
      {showPdfPreview && (
        <div className="p-6 border-t border-slate-800 bg-slate-950/80">
          <div className="max-w-3xl mx-auto bg-white text-slate-900 rounded-xl border border-slate-300 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="border-t-4 border-emerald-500 pt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h5 className="text-base font-extrabold tracking-tight text-slate-900">
                  RESUMO FISCAL CONSOLIDADO
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Balanço de entradas (vendas e tips) e saídas (taxas de
                  processamento e repasses)
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-700 self-start">
                PDF SIMULADO • {summary.protocolId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-[11px]">
              <div>
                <div className="font-bold text-slate-800">
                  Titular: {creator.name} (@{creator.handle})
                </div>
                <div className="text-slate-600 mt-0.5">
                  Período de Apuração: <strong>{summary.periodLabel}</strong>
                </div>
              </div>
              <div className="sm:text-right font-mono text-slate-600">
                <div>Emissão: {formatDate(summary.generatedAt)}</div>
                <div>Moeda: {currency}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-3">Rubrica do Balanço</th>
                    <th className="py-2 px-3 text-right">Qtd</th>
                    <th className="py-2 px-3 text-right">Valor Consolidado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  <tr>
                    <td className="py-2 px-3 font-sans text-slate-800">
                      (+) Entradas — Vendas (Produtos, Assinaturas, Paywall & In-App)
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {summary.inflows.salesSubtotal.count}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">
                      + {fmt(summary.inflows.salesSubtotal.grossAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans text-slate-800">
                      (+) Entradas — Tips / Gorjetas Recebidas
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {summary.inflows.tips.count}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">
                      + {fmt(summary.inflows.tips.grossAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans text-slate-800">
                      (-) Saídas — Taxas de Processamento (Gateway + Plataforma + Saque)
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {summary.outflows.transactionProcessingFees.count +
                        summary.outflows.withdrawalFees.count}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-rose-700">
                      - {fmt(summary.outflows.totalProcessingFees)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans text-slate-800">
                      (-) Saídas — Repasses Liquidados ao Titular
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {summary.outflows.completedRepasses.count}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-amber-700">
                      - {fmt(summary.outflows.completedRepasses.netTransferred)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <td className="py-2.5 px-3 font-sans">
                      (=) Saldo Consolidado Final (Entradas − Saídas)
                    </td>
                    <td className="py-2.5 px-3 text-right">—</td>
                    <td className="py-2.5 px-3 text-right">
                      {fmt(summary.balance.consolidatedBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              <span>
                Documento auxiliar simulado gerado a partir do histórico do Painel Financeiro.
              </span>
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Arquivo PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
