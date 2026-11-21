import React from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Receipt,
  PieChart,
  Sliders,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Percent,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

interface FinancialExpensesCardProps {
  onOpenExpensesModal: () => void;
}

export const FinancialExpensesCard: React.FC<FinancialExpensesCardProps> = ({
  onOpenExpensesModal,
}) => {
  const {
    totalGrossRevenue,
    totalGatewayFees,
    totalMarketingExpenses,
    totalOperationalExpenses,
    realNetProfit,
    netProfitMargin,
    expenses,
    selectedCurrency,
  } = useMonetization();

  const totalDeductions = totalGatewayFees + totalMarketingExpenses + totalOperationalExpenses;

  // Percentage breakdown
  const feePct = totalGrossRevenue > 0 ? (totalGatewayFees / totalGrossRevenue) * 100 : 0;
  const mktPct = totalGrossRevenue > 0 ? (totalMarketingExpenses / totalGrossRevenue) * 100 : 0;
  const opsPct = totalGrossRevenue > 0 ? (totalOperationalExpenses / totalGrossRevenue) * 100 : 0;
  const netPct = Math.max(0, netProfitMargin);

  return (
    <div className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 hover:border-slate-700/80 transition shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Receipt className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Demonstrativo de Receita Líquida Real
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Margem Líquida: {netProfitMargin}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Subtração automática de taxas de gateway, custos de marketing e despesas operacionais
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenExpensesModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Gerenciar Custos & Despesas ({expenses.length})</span>
        </button>
      </div>

      {/* Waterfall Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 my-4">
        {/* Card 1: Receita Bruta */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            1. Receita Bruta
          </div>
          <div className="text-lg font-extrabold text-white mt-1 font-mono">
            {formatCurrency(totalGrossRevenue, selectedCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">100% de entradas</div>
        </div>

        {/* Card 2: Taxas de Gateway */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-rose-500/20">
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center justify-between gap-1">
            <span className="flex items-center gap-1">
              <span>- Taxas Gateway</span>
              <ModalityFeeTooltip modality="all_summary" iconOnly tone="rose" />
            </span>
            <span className="text-[10px] font-mono">({feePct.toFixed(1)}%)</span>
          </div>
          <div className="text-lg font-extrabold text-rose-400 mt-1 font-mono">
            -{formatCurrency(totalGatewayFees, selectedCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Pix, Cartão, Stripe</div>
        </div>

        {/* Card 3: Custos de Marketing */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-amber-500/20">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>- Custos Marketing</span>
            <span className="text-[10px] font-mono">({mktPct.toFixed(1)}%)</span>
          </div>
          <div className="text-lg font-extrabold text-amber-400 mt-1 font-mono">
            -{formatCurrency(totalMarketingExpenses, selectedCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Meta Ads, Google, Parcerias</div>
        </div>

        {/* Card 4: Despesas Operacionais */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-indigo-500/20">
          <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
            <span>- Despesas Operacionais</span>
            <span className="text-[10px] font-mono">({opsPct.toFixed(1)}%)</span>
          </div>
          <div className="text-lg font-extrabold text-indigo-400 mt-1 font-mono">
            -{formatCurrency(totalOperationalExpenses, selectedCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Nuvem, CRM, Softwares</div>
        </div>

        {/* Card 5: Lucro Líquido Real */}
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-950 p-3.5 rounded-xl border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
          <div className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>= Lucro Líquido</span>
            <span className="text-[10px] font-mono font-black">{netProfitMargin}%</span>
          </div>
          <div className="text-lg font-black text-emerald-300 mt-1 font-mono">
            {formatCurrency(realNetProfit, selectedCurrency)}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
            Livre no bolso para saque
          </div>
        </div>
      </div>

      {/* Visual Composition / Waterfall Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Composição Percentual da Receita Bruta</span>
          <span className="font-mono text-[11px]">
            Deduções Totais: <strong className="text-rose-400">{formatCurrency(totalDeductions, selectedCurrency)}</strong>
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
          {/* Net Profit segment */}
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${netPct}%` }}
            title={`Lucro Líquido: ${netPct.toFixed(1)}%`}
          />
          {/* Gateway fee segment */}
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${feePct}%` }}
            title={`Taxas Gateway: ${feePct.toFixed(1)}%`}
          />
          {/* Marketing segment */}
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${mktPct}%` }}
            title={`Marketing: ${mktPct.toFixed(1)}%`}
          />
          {/* Operational segment */}
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${opsPct}%` }}
            title={`Operacional: ${opsPct.toFixed(1)}%`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Lucro Líquido ({netProfitMargin}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Taxas Gateway ({feePct.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Marketing ({mktPct.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Operacional ({opsPct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
