import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Megaphone,
  History,
  Tag,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatDate, formatPercentage } from '../../utils/formatters';
import { buildWeeklyPerformanceSnapshot } from '../../utils/weeklyPerformanceSnapshot';

interface SmartWeeklyTopProductHighlight {
  productTitle: string;
  performanceSummary: string;
  conversionDiagnosis: string;
}

interface SmartWeeklyMarketingAction {
  title: string;
  targetProduct: string;
  channel: string;
  tactic: string;
  expectedImpact: string;
  suggestedCouponCode?: string;
  suggestedDiscountPct?: number;
}

interface SmartWeeklySummaryResult {
  id: string;
  generatedAt: string;
  model: string;
  periodLabel: string;
  headline: string;
  weeklyNarrative: string;
  topProducts: SmartWeeklyTopProductHighlight[];
  marketingActions: SmartWeeklyMarketingAction[];
  closingTakeaway: string;
  metricsSnapshot: {
    periodLabel: string;
    currentWeekGross: number;
    currentWeekNet: number;
    previousWeekGross: number;
    weekOverWeekGrowthPct: number;
    approvedTransactionsCount: number;
    pendingTransactionsCount: number;
    pendingAmount: number;
    averageTicket: number;
    mrr: number;
  };
}

export const SmartWeeklySummaryCard: React.FC = () => {
  const {
    creator,
    selectedCurrency,
    transactions,
    products,
    coupons,
    mrr,
    monthlyFinancialGoals,
    addCoupon,
  } = useMonetization();

  const [latestSummary, setLatestSummary] =
    useState<SmartWeeklySummaryResult | null>(null);
  const [history, setHistory] = useState<SmartWeeklySummaryResult[]>([]);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [createdCouponCodes, setCreatedCouponCodes] = useState<Record<string, boolean>>({});

  const currentSnapshot = useMemo(
    () =>
      buildWeeklyPerformanceSnapshot({
        creatorName: creator.name,
        currency: selectedCurrency,
        transactions,
        products,
        coupons,
        mrr,
        monthlyGoalTarget: monthlyFinancialGoals[0]?.targetAmount,
      }),
    [
      creator.name,
      selectedCurrency,
      transactions,
      products,
      coupons,
      mrr,
      monthlyFinancialGoals,
    ]
  );

  const loadLatestSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/smart-summary/latest');
      const data = await res.json();
      if (data?.ok) {
        if (data.latest) {
          setLatestSummary(data.latest as SmartWeeklySummaryResult);
          setSelectedSummaryId(data.latest.id);
        }
        if (Array.isArray(data.history)) {
          setHistory(data.history as SmartWeeklySummaryResult[]);
        }
      }
    } catch {
      // Non-blocking on initial mount
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLatestSummary();
  }, [loadLatestSummary]);

  const activeSummary = useMemo(() => {
    if (!selectedSummaryId) return latestSummary;
    return (
      history.find((item) => item.id === selectedSummaryId) ?? latestSummary
    );
  }, [history, latestSummary, selectedSummaryId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/smart-summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSnapshot),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data.summary) {
        setErrorMessage(
          data?.error ||
            'Não foi possível gerar o Resumo Inteligente semanal com a API Gemini.'
        );
        return;
      }
      const nextSummary = data.summary as SmartWeeklySummaryResult;
      setLatestSummary(nextSummary);
      setSelectedSummaryId(nextSummary.id);
      if (Array.isArray(data.history)) {
        setHistory(data.history as SmartWeeklySummaryResult[]);
      }
    } catch {
      setErrorMessage(
        'Erro de rede ao consultar o servidor para gerar o Resumo Inteligente.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySummary = async () => {
    if (!activeSummary) return;
    const lines = [
      `RESUMO INTELIGENTE SEMANAL — ${activeSummary.periodLabel}`,
      activeSummary.headline,
      '',
      activeSummary.weeklyNarrative,
      '',
      'PRODUTOS MAIS VENDIDOS:',
      ...activeSummary.topProducts.map(
        (p) => `- ${p.productTitle}: ${p.performanceSummary} (${p.conversionDiagnosis})`
      ),
      '',
      'AÇÕES DE MARKETING RECOMENDADAS:',
      ...activeSummary.marketingActions.map(
        (a, idx) =>
          `${idx + 1}. ${a.title} [${a.channel} · ${a.targetProduct}]: ${a.tactic} (Impacto: ${a.expectedImpact})`
      ),
      '',
      `Prioridade da semana: ${activeSummary.closingTakeaway}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleCreateSuggestedCoupon = (action: SmartWeeklyMarketingAction) => {
    if (!action.suggestedCouponCode) return;
    const code = action.suggestedCouponCode.toUpperCase();
    const exists = coupons.some((c) => c.code.toUpperCase() === code);
    if (!exists) {
      const exp = new Date();
      exp.setDate(exp.getDate() + 7);
      addCoupon({
        code,
        discountPercentage: action.suggestedDiscountPct || 15,
        maxUses: 100,
        usedCount: 0,
        expiresAt: exp.toISOString().slice(0, 10),
        active: true,
      });
    }
    setCreatedCouponCodes((prev) => ({ ...prev, [code]: true }));
  };

  const narrativeParagraphs = useMemo(() => {
    if (!activeSummary?.weeklyNarrative) return [];
    return activeSummary.weeklyNarrative
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [activeSummary]);

  const weekly = currentSnapshot.weeklyMetrics;
  const topLeader = currentSnapshot.topProducts[0];
  const isPositiveGrowth = weekly.weekOverWeekGrowthPct >= 0;

  return (
    <section
      id="smart-weekly-summary-section"
      aria-labelledby="smart-weekly-summary-heading"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span className="font-semibold text-emerald-400">Resumo Inteligente</span>
              <span aria-hidden="true">·</span>
              <span>{weekly.periodLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Gemini</span>
            </div>
            <h3
              id="smart-weekly-summary-heading"
              className="text-base font-bold text-white tracking-tight mt-0.5"
            >
              Relatório Descritivo Semanal &amp; Plano de Conversão
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Analisa o desempenho financeiro da semana, destaca os produtos líderes e sugere ações de marketing orientadas à conversão.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {activeSummary && (
            <button
              type="button"
              onClick={() => void handleCopySummary()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Texto Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>
          )}

          {history.length > 1 && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Edições ({history.length})</span>
            </button>
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleGenerate()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`}
            />
            <span>
              {isGenerating
                ? 'Gerando Análise...'
                : activeSummary
                ? 'Atualizar Resumo Semanal'
                : 'Gerar Resumo Inteligente'}
            </span>
          </button>
        </div>
      </div>

      {/* Real-Time Weekly Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/40 text-xs">
        <div className="p-4">
          <span className="text-[11px] font-medium text-slate-400 block">
            Receita Bruta (7 dias)
          </span>
          <div className="mt-1.5 text-lg font-bold text-white font-mono tabular-nums">
            {formatCurrency(weekly.currentWeekGross, selectedCurrency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            Líquido: {formatCurrency(weekly.currentWeekNet, selectedCurrency)}
          </div>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-medium text-slate-400 block">
            Variação vs. Semana Anterior
          </span>
          <div
            className={`mt-1.5 text-lg font-bold font-mono tabular-nums flex items-center gap-1.5 ${
              isPositiveGrowth ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {isPositiveGrowth ? (
              <TrendingUp className="w-4 h-4 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 shrink-0" />
            )}
            <span>
              {isPositiveGrowth ? '+' : ''}
              {formatPercentage(weekly.weekOverWeekGrowthPct)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            Anterior: {formatCurrency(weekly.previousWeekGross, selectedCurrency)}
          </div>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-medium text-slate-400 block">
            Produto Líder em Vendas
          </span>
          <div className="mt-1.5 text-sm font-bold text-white truncate">
            {topLeader ? topLeader.title : 'Sem produtos publicados'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            {topLeader
              ? `${topLeader.salesCount} vendas · Conv. ${topLeader.conversionRatePct.toFixed(1)}%`
              : '—'}
          </div>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-medium text-slate-400 block">
            Volume &amp; Ticket da Semana
          </span>
          <div className="mt-1.5 text-lg font-bold text-white font-mono tabular-nums">
            {weekly.approvedTransactionsCount}{' '}
            <span className="text-xs font-normal text-slate-400">aprovadas</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            Ticket médio: {formatCurrency(weekly.averageTicket, selectedCurrency)}
          </div>
        </div>
      </div>

      {/* History Switcher */}
      {showHistory && history.length > 0 && (
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium mr-1">Edições salvas:</span>
          {history.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedSummaryId(entry.id)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition cursor-pointer ${
                activeSummary?.id === entry.id
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
              }`}
            >
              {formatDate(entry.generatedAt)}
            </button>
          ))}
        </div>
      )}

      {/* Error State */}
      {errorMessage && (
        <div className="px-6 py-3.5 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleGenerate()}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold border border-rose-500/30 transition cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="p-6">
        {isInitialLoading || isGenerating ? (
          <div className="space-y-4" aria-busy="true" aria-label="Carregando resumo semanal">
            <div className="h-5 w-2/3 bg-slate-800 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-800/80 rounded animate-pulse" />
              <div className="h-3.5 w-11/12 bg-slate-800/80 rounded animate-pulse" />
              <div className="h-3.5 w-4/5 bg-slate-800/80 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
              <div className="h-24 bg-slate-950/60 border border-slate-800 rounded-xl animate-pulse" />
              <div className="h-24 bg-slate-950/60 border border-slate-800 rounded-xl animate-pulse" />
            </div>
          </div>
        ) : !activeSummary ? (
          <div className="py-6 px-4 text-center space-y-3 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <p className="text-sm font-semibold text-white">
              Nenhum Resumo Inteligente semanal gerado ainda
            </p>
            <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
              Clique em <strong>Gerar Resumo Inteligente</strong> para a API Gemini redigir uma análise semanal completa do seu faturamento, destacar os produtos campeões de venda e recomendar campanhas de marketing focadas em conversão.
            </p>
            <div>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Gerar Resumo Inteligente Agora</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Descriptive Narrative */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  Gerado em{' '}
                  <span className="font-mono text-slate-300 tabular-nums">
                    {formatDate(activeSummary.generatedAt)}
                  </span>
                </span>
                <span className="font-mono text-slate-500">
                  {activeSummary.model}
                </span>
              </div>

              <h4 className="text-base font-bold text-white leading-snug max-w-3xl">
                {activeSummary.headline}
              </h4>

              <div className="space-y-3 text-sm text-slate-300 leading-relaxed max-w-4xl">
                {narrativeParagraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Two-column breakdown: Top Products + Specific Marketing Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 border-t border-slate-800">
              {/* Left 5 cols: Top Selling Products */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Produtos Mais Vendidos na Análise</span>
                </div>

                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/40">
                  {activeSummary.topProducts.map((item, idx) => (
                    <div key={`${item.productTitle}-${idx}`} className="p-3.5 space-y-1">
                      <div className="text-xs font-bold text-white">
                        {idx + 1}. {item.productTitle}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item.performanceSummary}
                      </p>
                      <p className="text-[11px] text-emerald-400 leading-snug">
                        {item.conversionDiagnosis}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 7 cols: Actionable Marketing Recommendations */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Ações de Marketing para Elevar Conversões</span>
                </div>

                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/40">
                  {activeSummary.marketingActions.map((action, idx) => {
                    const couponCode = action.suggestedCouponCode?.toUpperCase();
                    const couponAlreadyCreated = Boolean(
                      couponCode &&
                        (createdCouponCodes[couponCode] ||
                          coupons.some((c) => c.code.toUpperCase() === couponCode))
                    );

                    return (
                      <div
                        key={`${action.title}-${idx}`}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                            <span className="font-semibold text-amber-300">
                              {action.channel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-300">
                              {action.targetProduct}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-emerald-400">
                              {action.expectedImpact}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-white">
                            {action.title}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {action.tactic}
                          </p>
                        </div>

                        {couponCode && (
                          <div className="shrink-0 sm:self-center">
                            {couponAlreadyCreated ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 font-mono">
                                <Check className="w-3.5 h-3.5" />
                                <span>Cupom {couponCode} ativo</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCreateSuggestedCoupon(action)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                              >
                                <Tag className="w-3 h-3 text-emerald-400" />
                                <span>
                                  Criar {couponCode} ({action.suggestedDiscountPct || 15}%)
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Closing Takeaway */}
            {activeSummary.closingTakeaway && (
              <div className="pt-4 border-t border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                <span className="font-semibold text-emerald-400 shrink-0">
                  Prioridade da semana:
                </span>
                <span>{activeSummary.closingTakeaway}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
