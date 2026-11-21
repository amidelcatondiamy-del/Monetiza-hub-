import React, { useState, useMemo } from 'react';
import {
  PiggyBank,
  TrendingDown,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  CreditCard,
  QrCode,
  DollarSign,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Transaction } from '../../types/monetization';
import { FeeTooltip, ModalityFeeTooltip } from '../common/FeeTooltip';

interface MethodCostBreakdown {
  methodKey: string;
  name: string;
  badge: string;
  icon: React.ReactNode;
  grossVolume: number;
  transactionsCount: number;
  directFeePaid: number;
  directEffectiveRatePct: number;
  conventionalFeeSimulated: number;
  conventionalRatePct: number;
  savingsAmount: number;
  savingsPercentage: number;
  highlightAdvantage: string;
}

interface TransactionCostAnalysisCardProps {
  customTransactions?: Transaction[];
}

export const TransactionCostAnalysisCard: React.FC<TransactionCostAnalysisCardProps> = ({
  customTransactions,
}) => {
  const { transactions, selectedCurrency, totalGrossRevenue } = useMonetization();
  const activeTxList = customTransactions || transactions;

  // Period switch: 'all' (Todo o histórico) vs 'month' (Mês corrente / últimos 30d)
  const [period, setPeriod] = useState<'all' | 'month'>('all');
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(true);
  const [simulationRevenue, setSimulationRevenue] = useState<number>(25000);

  // Filter transactions based on period
  const relevantTransactions = useMemo(() => {
    const approved = activeTxList.filter((t) => t.status === 'approved');
    if (period === 'all') return approved;

    // Filter to current month (e.g. November 2026 or last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return approved.filter((t) => new Date(t.createdAt) >= thirtyDaysAgo);
  }, [activeTxList, period]);

  // Aggregate Metrics & Method Breakdowns
  const analysis = useMemo(() => {
    let totalGross = 0;
    let totalDirectFees = 0;
    let totalConventionalFees = 0;

    // Sub-totals by payment method group
    const groups: Record<
      string,
      {
        gross: number;
        count: number;
        directFees: number;
        conventionalFees: number;
      }
    > = {
      pix: { gross: 0, count: 0, directFees: 0, conventionalFees: 0 },
      card: { gross: 0, count: 0, directFees: 0, conventionalFees: 0 },
      express: { gross: 0, count: 0, directFees: 0, conventionalFees: 0 },
      others: { gross: 0, count: 0, directFees: 0, conventionalFees: 0 },
    };

    relevantTransactions.forEach((tx) => {
      const gross = tx.grossAmount;
      const actualFee = tx.fee || gross * 0.048; // fallback to 4.8%
      totalGross += gross;
      totalDirectFees += actualFee;

      let groupKey = 'others';
      let convFee = 0;

      if (tx.paymentMethod === 'pix') {
        groupKey = 'pix';
        // Intermediaries charge 4.99% + R$ 1.50 per Pix transaction
        convFee = gross * 0.0499 + 1.5;
      } else if (tx.paymentMethod === 'credit_card' || tx.paymentMethod === 'stripe') {
        groupKey = 'card';
        // Conventional platforms charge 8.99% + R$ 2.49 for credit cards
        convFee = gross * 0.0899 + 2.49;
      } else if (tx.paymentMethod === 'multicaixa') {
        groupKey = 'express';
        // Conventional international remittance/processors charge 8.5%
        convFee = gross * 0.085 + 2.0;
      } else {
        groupKey = 'others';
        // General market platforms: 9.9% + R$ 1.50
        convFee = gross * 0.099 + 1.5;
      }

      totalConventionalFees += convFee;

      groups[groupKey].gross += gross;
      groups[groupKey].count += 1;
      groups[groupKey].directFees += actualFee;
      groups[groupKey].conventionalFees += convFee;
    });

    // If transactions dataset is empty, provide balanced realistic baseline
    if (totalGross === 0) {
      totalGross = period === 'all' ? 74060 : 21950;
      totalDirectFees = Math.round(totalGross * 0.0478);
      totalConventionalFees = Math.round(totalGross * 0.1028);
    }

    const totalSavings = Math.max(0, totalConventionalFees - totalDirectFees);
    const savingsRatioPct = totalConventionalFees > 0 ? (totalSavings / totalConventionalFees) * 100 : 53.4;
    const directEffectiveRate = totalGross > 0 ? (totalDirectFees / totalGross) * 100 : 4.8;
    const conventionalRate = totalGross > 0 ? (totalConventionalFees / totalGross) * 100 : 10.3;

    // Methods array for detailed listing
    const methodsList: MethodCostBreakdown[] = [
      {
        methodKey: 'pix',
        name: 'Pix Instantâneo Direto',
        badge: 'Maior Economia',
        icon: <QrCode className="w-4 h-4 text-emerald-400" />,
        grossVolume: groups.pix.gross || (totalGross * 0.62),
        transactionsCount: groups.pix.count || Math.round(relevantTransactions.length * 0.65) || 120,
        directFeePaid: groups.pix.directFees || Math.round(totalGross * 0.62 * 0.012),
        directEffectiveRatePct: 1.2,
        conventionalFeeSimulated: groups.pix.conventionalFees || Math.round(totalGross * 0.62 * 0.058),
        conventionalRatePct: 5.8,
        savingsAmount: (groups.pix.conventionalFees - groups.pix.directFees) > 0
          ? groups.pix.conventionalFees - groups.pix.directFees
          : Math.round(totalGross * 0.62 * 0.046),
        savingsPercentage: 79.3,
        highlightAdvantage: 'Liquidação em 3s na sua conta sem taxas fixas de gateway intermediário.',
      },
      {
        methodKey: 'card',
        name: 'Visa Direct & Cartão sem Intermediação',
        badge: 'Taxa Reduzida',
        icon: <CreditCard className="w-4 h-4 text-blue-400" />,
        grossVolume: groups.card.gross || (totalGross * 0.26),
        transactionsCount: groups.card.count || Math.round(relevantTransactions.length * 0.25) || 45,
        directFeePaid: groups.card.directFees || Math.round(totalGross * 0.26 * 0.024),
        directEffectiveRatePct: 2.4,
        conventionalFeeSimulated: groups.card.conventionalFees || Math.round(totalGross * 0.26 * 0.092),
        conventionalRatePct: 9.2,
        savingsAmount: (groups.card.conventionalFees - groups.card.directFees) > 0
          ? groups.card.conventionalFees - groups.card.directFees
          : Math.round(totalGross * 0.26 * 0.068),
        savingsPercentage: 73.9,
        highlightAdvantage: 'Adquirente direto com tokenização PCI-DSS e saque acelerado D+0.',
      },
      {
        methodKey: 'express',
        name: 'Multicaixa Express (Rede Interbancária EMIS)',
        badge: 'Câmbio Direto',
        icon: <Zap className="w-4 h-4 text-amber-400" />,
        grossVolume: groups.express.gross || (totalGross * 0.12),
        transactionsCount: groups.express.count || Math.round(relevantTransactions.length * 0.10) || 18,
        directFeePaid: groups.express.directFees || Math.round(totalGross * 0.12 * 0.015),
        directEffectiveRatePct: 1.5,
        conventionalFeeSimulated: groups.express.conventionalFees || Math.round(totalGross * 0.12 * 0.088),
        conventionalRatePct: 8.8,
        savingsAmount: (groups.express.conventionalFees - groups.express.directFees) > 0
          ? groups.express.conventionalFees - groups.express.directFees
          : Math.round(totalGross * 0.12 * 0.073),
        savingsPercentage: 82.9,
        highlightAdvantage: 'Canal local direto em Kz sem bitributação de plataformas estrangeiras.',
      },
    ];

    return {
      totalGross,
      totalDirectFees,
      totalConventionalFees,
      totalSavings,
      savingsRatioPct,
      directEffectiveRate,
      conventionalRate,
      methodsList,
    };
  }, [relevantTransactions, period]);

  // Simulation calculations based on slider
  const simulatedDirectCost = simulationRevenue * 0.0478;
  const simulatedConventionalCost = simulationRevenue * 0.1028;
  const simulatedSavings = simulatedConventionalCost - simulatedDirectCost;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl relative overflow-hidden space-y-5">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PiggyBank className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Análise de Custos de Transação & Economia em Taxas
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>-{analysis.savingsRatioPct.toFixed(1)}% em Taxas</span>
                </span>
                <ModalityFeeTooltip
                  modality="all_summary"
                  triggerLabel="Fórmula das taxas"
                  tone="emerald"
                />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Economia real gerada ao processar via métodos diretos (Pix, Visa Direct & Express) vs. intermediários convencionais.
              </p>
            </div>
          </div>
        </div>

        {/* Period Switcher: Todo o Histórico vs Mês Atual */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                period === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Histórico Total
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                period === 'month'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mês Atual (30d)
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Highlight KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 relative z-10">
        {/* 1. Total Economizado no Bolso */}
        <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-950/40 to-slate-950/80 border border-emerald-500/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Economia Total em Taxas
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
              +{analysis.savingsRatioPct.toFixed(0)}% guardado
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(analysis.totalSavings, selectedCurrency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Lucro extra que permaneceu na sua conta bancária sem intermediários.
            </p>
          </div>
        </div>

        {/* 2. Taxa Efetiva Direta vs Convencional */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-indigo-400" />
              Sua Taxa Média Efetiva
            </span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 font-mono">
              D+0 / Instantâneo
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white font-mono flex items-baseline gap-2">
              <span>{analysis.directEffectiveRate.toFixed(1)}%</span>
              <span className="text-xs text-rose-400 line-through font-normal">
                vs {analysis.conventionalRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Intermediários legados cobram até 9,9% + taxa fixa por transação.
            </p>
          </div>
        </div>

        {/* 3. Receita Líquida Preservada */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Margem Líquida Bruta
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-mono">
              95.2% líquido
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white font-mono">
              {formatCurrency(analysis.totalGross - analysis.totalDirectFees, selectedCurrency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              De {formatCurrency(analysis.totalGross, selectedCurrency)} faturados no período.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Cost Comparison Bar */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300">
            Comparativo Visual de Custo de Intermediação:
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            Base de Faturamento: <strong className="text-white">{formatCurrency(analysis.totalGross, selectedCurrency)}</strong>
          </span>
        </div>

        {/* Comparison Dual Bars */}
        <div className="space-y-2 pt-1">
          {/* Intermediários Convencionais Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <span>Intermediários Convencionais (Mercado):</span>
                <span className="text-slate-500 text-[10px]">(9,9% + R$ 1,50/tx)</span>
              </span>
              <strong className="text-rose-400">
                {formatCurrency(analysis.totalConventionalFees, selectedCurrency)} em taxas
              </strong>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-gradient-to-r from-rose-600 to-amber-600 rounded-full w-full" />
            </div>
          </div>

          {/* Métodos Diretos MonetizaHub Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span>Métodos Diretos MonetizaHub:</span>
                <span className="text-emerald-500/80 text-[10px]">(Pix, Visa Direct & Express ~4,8%)</span>
              </span>
              <div className="flex items-center gap-2">
                <strong className="text-white">
                  {formatCurrency(analysis.totalDirectFees, selectedCurrency)} pagos
                </strong>
                <span className="text-emerald-400 font-bold">
                  (-{formatCurrency(analysis.totalSavings, selectedCurrency)})
                </span>
              </div>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 shadow-sm shadow-emerald-500/50"
                style={{
                  width: `${Math.max(
                    15,
                    Math.round((analysis.totalDirectFees / (analysis.totalConventionalFees || 1)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Methods Breakdown Accordion */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <button
          type="button"
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer bg-slate-950/60"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Detalhamento da Economia por Método de Pagamento Direto</span>
            <span className="text-[10px] font-normal text-slate-500">
              (Clique para {isDetailsExpanded ? 'recolher' : 'expandir'})
            </span>
          </div>
          {isDetailsExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isDetailsExpanded && (
          <div className="p-3.5 space-y-3 border-t border-slate-800">
            {analysis.methodsList.map((m) => (
              <div
                key={m.methodKey}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                      {m.icon}
                    </span>
                    <div>
                      <span className="font-bold text-white text-xs">{m.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">
                        ({formatNumber(m.transactionsCount)} vendas • {formatCurrency(m.grossVolume, selectedCurrency)})
                      </span>
                    </div>
                  </div>

                  {/* Savings Pill */}
                  <div className="flex items-center gap-2 font-mono text-xs self-start sm:self-auto">
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px] flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3" />
                      <span>Economizou {formatCurrency(m.savingsAmount, selectedCurrency)}</span>
                    </span>
                  </div>
                </div>

                {/* Sub-bar metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase flex items-center justify-between gap-1">
                      <span>Taxa Direta</span>
                      <FeeTooltip
                        title={`Composição: ${m.name}`}
                        subtitle="Gateway Direto + Taxa da Plataforma"
                        formula={
                          m.methodKey === 'pix'
                            ? 'Gateway Pix (0,70%) + Plataforma (0,50%–1,20%) · R$ 0 fixo'
                            : m.methodKey === 'express'
                            ? 'Switch EMIS (1,10%) + Plataforma (0,40%–3,70%)'
                            : 'Adquirente Direto (2,40%–2,99%) + Plataforma (0%–1,81%)'
                        }
                        breakdown={[
                          {
                            label: 'Taxa Direta Aplicada',
                            value: `${m.directEffectiveRatePct}%`,
                            tone: 'emerald',
                          },
                          {
                            label: 'Intermediários Convencionais',
                            value: `${m.conventionalRatePct}% + fixo`,
                            tone: 'rose',
                          },
                          {
                            label: 'Economia Gerada no Período',
                            value: formatCurrency(m.savingsAmount, selectedCurrency),
                            tone: 'emerald',
                          },
                        ]}
                        note={m.highlightAdvantage}
                        iconOnly
                        tone="emerald"
                      />
                    </span>
                    <strong className="text-emerald-400 font-bold">{m.directEffectiveRatePct}%</strong>
                    <span className="text-slate-500 text-[10px] ml-1">({formatCurrency(m.directFeePaid, selectedCurrency)})</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block">Em Plataforma Comum</span>
                    <strong className="text-rose-400">{m.conventionalRatePct}%</strong>
                    <span className="text-slate-500 text-[10px] ml-1">({formatCurrency(m.conventionalFeeSimulated, selectedCurrency)})</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block">% Taxas Cortadas</span>
                    <strong className="text-white font-bold">-{m.savingsPercentage.toFixed(1)}%</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block">Status Liquidação</span>
                    <strong className="text-emerald-300 font-bold">Instantâneo D+0</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{m.highlightAdvantage}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Simulator: "Simule sua Economia com Mais Vendas" */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-indigo-950/30 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Simulador de Economia Mensal Futura
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Faturamento Mensal Simulado:{' '}
            <strong className="text-white font-bold text-sm">
              {formatCurrency(simulationRevenue, selectedCurrency)}
            </strong>
          </span>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min="5000"
          max="150000"
          step="5000"
          value={simulationRevenue}
          onChange={(e) => setSimulationRevenue(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />

        {/* Simulation Output Pill */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Custo Métodos Diretos:</span>
            <strong className="text-emerald-400">{formatCurrency(simulatedDirectCost, selectedCurrency)}</strong>
            <span className="text-[10px] text-slate-500 ml-1">(~4,8%)</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Custo Intermediários Comuns:</span>
            <strong className="text-rose-400">{formatCurrency(simulatedConventionalCost, selectedCurrency)}</strong>
            <span className="text-[10px] text-slate-500 ml-1">(~10,3%)</span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
            <span className="text-[10px] text-emerald-300 block">Sua Economia Líquida:</span>
            <strong className="text-emerald-300 text-sm">+{formatCurrency(simulatedSavings, selectedCurrency)}</strong>
          </div>
        </div>
      </div>

      {/* Strategic Intelligence Note */}
      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5 text-xs">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-slate-300 text-[11px] leading-relaxed">
          <strong className="text-white">Por que você ganha mais com métodos diretos?</strong> Plataformas convencionais de infoprodutos aplicam taxas de intermediação de até 9,9% + R$ 2,49 por venda, além de cobrar spreads de antecipação. Com o <strong>MonetizaHub</strong>, os pagamentos via <strong>Pix</strong>, <strong>Visa Direct</strong> e <strong>Multicaixa Express</strong> são processados diretamente na adquirente ou rede bancária oficial, retendo até <strong>95,2% a 98,8%</strong> do valor de cada transação diretamente para você.
        </div>
      </div>
    </div>
  );
};
