import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  Zap,
  History,
  ListChecks,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatDate } from '../../utils/formatters';

type AutopilotFocusArea =
  | 'catalog'
  | 'pricing'
  | 'coupons'
  | 'pending_orders'
  | 'financial_summary';

interface AutopilotOrganizedTask {
  id: string;
  title: string;
  description: string;
  category: 'coupon' | 'pricing' | 'catalog' | 'retention' | 'finance';
  actionType:
    | 'create_coupon'
    | 'adjust_price'
    | 'optimize_tags'
    | 'review_pending'
    | 'general_organization';
  estimatedImpact: string;
  payload: {
    couponCode?: string;
    discountPercentage?: number;
    productId?: string;
    productTitle?: string;
    suggestedPrice?: number;
    suggestedTags?: string[];
  };
  status: 'pending' | 'applied' | 'dismissed';
  createdAt: string;
  appliedAt?: string;
}

interface AutopilotRunLog {
  id: string;
  timestamp: string;
  trigger: 'scheduled_away' | 'manual';
  outcome: 'success' | 'error';
  model: string;
  tasksCreated: number;
  summary: string;
  errorMessage?: string;
}

interface AutopilotBriefing {
  headline: string;
  awaySummary: string;
  organizedHighlights: string[];
  generatedAt: string;
}

interface AiAutopilotClientState {
  enabled: boolean;
  intervalMinutes: 5 | 15 | 30 | 60;
  focusAreas: AutopilotFocusArea[];
  autoApplySafeActions: boolean;
  status: 'idle' | 'running' | 'paused' | 'error';
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRuns: number;
  lastError: string | null;
  geminiConfigured: boolean;
  latestBriefing: AutopilotBriefing | null;
  organizedTasks: AutopilotOrganizedTask[];
  runsHistory: AutopilotRunLog[];
}

const FOCUS_AREA_OPTIONS: Array<{
  id: AutopilotFocusArea;
  label: string;
  desc: string;
}> = [
  {
    id: 'catalog',
    label: 'Catálogo & Tags',
    desc: 'Organizar títulos, descrições e tags dos produtos',
  },
  {
    id: 'pricing',
    label: 'Precificação',
    desc: 'Ajustes de preço por demanda e ticket médio',
  },
  {
    id: 'coupons',
    label: 'Cupons & Ofertas',
    desc: 'Criar códigos promocionais estratégicos',
  },
  {
    id: 'pending_orders',
    label: 'Conciliação Pendente',
    desc: 'Revisar transações aguardando liquidação',
  },
  {
    id: 'financial_summary',
    label: 'Resumo & Metas',
    desc: 'Alinhar entregas às metas financeiras do mês',
  },
];

export const AIAutopilotPanel: React.FC = () => {
  const {
    creator,
    selectedCurrency,
    totalGrossRevenue,
    totalNetRevenue,
    availableBalance,
    pendingBalance,
    mrr,
    products,
    coupons,
    transactions,
    monthlyFinancialGoals,
    addCoupon,
    updateProduct,
    releasePendingBalance,
  } = useMonetization();

  const [autopilotState, setAutopilotState] =
    useState<AiAutopilotClientState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningNow, setIsRunningNow] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showRunsHistory, setShowRunsHistory] = useState<boolean>(false);

  const buildSnapshot = useCallback(
    () => ({
      creatorName: creator.name,
      currency: selectedCurrency,
      totalGrossRevenue,
      totalNetRevenue,
      availableBalance,
      pendingBalance,
      mrr,
      products: products.slice(0, 15).map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        type: p.type,
        salesCount: p.salesCount,
        viewsCount: p.viewsCount,
        isPublished: p.isPublished,
        tags: p.tags,
      })),
      coupons: coupons.slice(0, 15).map((c) => ({
        code: c.code,
        discountPercentage: c.discountPercentage,
        usedCount: c.usedCount,
        maxUses: c.maxUses,
        active: c.active,
        expiresAt: c.expiresAt,
      })),
      recentTransactions: transactions.slice(0, 20).map((t) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        grossAmount: t.grossAmount,
        netAmount: t.netAmount,
        status: t.status,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
      })),
      monthlyGoalTarget: monthlyFinancialGoals[0]?.targetAmount,
      syncedAt: new Date().toISOString(),
    }),
    [
      creator.name,
      selectedCurrency,
      totalGrossRevenue,
      totalNetRevenue,
      availableBalance,
      pendingBalance,
      mrr,
      products,
      coupons,
      transactions,
      monthlyFinancialGoals,
    ]
  );

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-autopilot/state');
      const data = await res.json();
      if (data?.ok && data.state) {
        setAutopilotState(data.state);
      }
    } catch {
      // Keep silent if transient fetch fails on mount
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchState();
    const poll = setInterval(() => {
      void fetchState();
    }, 30_000);
    return () => clearInterval(poll);
  }, [fetchState]);

  // Keep server-side snapshot synced so scheduled runs work with up-to-date data while user is away
  useEffect(() => {
    if (!autopilotState?.enabled) return;
    void fetch('/api/ai-autopilot/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSnapshot()),
    }).catch(() => {});
  }, [autopilotState?.enabled, buildSnapshot]);

  const updateServerConfig = async (patch: {
    enabled?: boolean;
    intervalMinutes?: 5 | 15 | 30 | 60;
    focusAreas?: AutopilotFocusArea[];
    autoApplySafeActions?: boolean;
  }) => {
    setIsSavingConfig(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/ai-autopilot/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...patch,
          snapshot: buildSnapshot(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorBanner(data?.error || 'Falha ao salvar configuração da IA.');
        return;
      }
      setAutopilotState(data.state);
      if (typeof patch.enabled === 'boolean') {
        setActionNotice(
          patch.enabled
            ? 'IA ativada em segundo plano. Os ciclos continuarão rodando no servidor mesmo quando você sair do aplicativo.'
            : 'IA em segundo plano pausada.'
        );
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch {
      setErrorBanner('Erro de comunicação ao atualizar configuração da IA.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleRunNow = async () => {
    setIsRunningNow(true);
    setErrorBanner(null);
    setActionNotice(null);
    try {
      const res = await fetch('/api/ai-autopilot/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: buildSnapshot() }),
      });
      const data = await res.json();
      if (data?.state) {
        setAutopilotState(data.state);
      }
      if (!res.ok || !data?.ok) {
        setErrorBanner(
          data?.error || 'Não foi possível concluir o ciclo autônomo com o Gemini.'
        );
        return;
      }
      setActionNotice(
        'Ciclo autônomo concluído. A IA organizou novas prioridades e ações abaixo.'
      );
      setTimeout(() => setActionNotice(null), 5000);
    } catch {
      setErrorBanner('Erro de rede ao executar ciclo de organização da IA.');
    } finally {
      setIsRunningNow(false);
    }
  };

  const handleToggleFocusArea = (area: AutopilotFocusArea) => {
    if (!autopilotState) return;
    const current = autopilotState.focusAreas;
    const next = current.includes(area)
      ? current.length > 1
        ? current.filter((item) => item !== area)
        : current
      : [...current, area];
    void updateServerConfig({ focusAreas: next });
  };

  const handleApplyTask = async (task: AutopilotOrganizedTask) => {
    setErrorBanner(null);
    try {
      if (task.actionType === 'create_coupon' && task.payload.couponCode) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 14);
        addCoupon({
          code: task.payload.couponCode,
          discountPercentage: task.payload.discountPercentage || 15,
          maxUses: 100,
          usedCount: 0,
          expiresAt: expDate.toISOString().slice(0, 10),
          active: true,
          productId: task.payload.productId,
        });
      } else if (
        task.actionType === 'adjust_price' &&
        task.payload.productId &&
        task.payload.suggestedPrice
      ) {
        updateProduct(task.payload.productId, {
          price: task.payload.suggestedPrice,
        });
      } else if (
        task.actionType === 'optimize_tags' &&
        task.payload.productId &&
        task.payload.suggestedTags?.length
      ) {
        updateProduct(task.payload.productId, {
          tags: task.payload.suggestedTags,
        });
      } else if (task.actionType === 'review_pending' && pendingBalance > 0) {
        releasePendingBalance();
      }

      const res = await fetch(`/api/ai-autopilot/tasks/${task.id}/apply`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data?.ok && data.state) {
        setAutopilotState(data.state);
      }
      setActionNotice(`Ação "${task.title}" aplicada ao seu catálogo/painel.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch {
      setErrorBanner('Não foi possível registrar aplicação da tarefa no servidor.');
    }
  };

  const handleDismissTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/ai-autopilot/tasks/${taskId}/dismiss`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data?.ok && data.state) {
        setAutopilotState(data.state);
      }
    } catch {
      // Ignore transient error
    }
  };

  const pendingTasks = useMemo(
    () =>
      (autopilotState?.organizedTasks || []).filter((t) => t.status === 'pending'),
    [autopilotState?.organizedTasks]
  );

  const appliedTasksCount = useMemo(
    () =>
      (autopilotState?.organizedTasks || []).filter((t) => t.status === 'applied')
        .length,
    [autopilotState?.organizedTasks]
  );

  const statusText = useMemo(() => {
    if (!autopilotState) return 'Carregando';
    if (autopilotState.status === 'running' || isRunningNow) return 'Executando';
    if (autopilotState.enabled) return 'Ativo em Segundo Plano';
    return 'Pausado';
  }, [autopilotState, isRunningNow]);

  return (
    <section
      id="ai-autopilot-section"
      aria-labelledby="ai-autopilot-heading"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${
              autopilotState?.enabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3
                id="ai-autopilot-heading"
                className="text-base font-bold text-white tracking-tight"
              >
                Piloto Automático IA (Modo Ausente)
              </h3>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  autopilotState?.enabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                {statusText}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mantém a IA organizando catálogo, cupons promocionais, conciliação e
              prioridades no servidor enquanto você estiver fora do aplicativo.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isLoading || isSavingConfig}
            onClick={() =>
              void updateServerConfig({ enabled: !autopilotState?.enabled })
            }
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
              autopilotState?.enabled
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {autopilotState?.enabled ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar Modo Ausente</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Ativar Trabalho em Segundo Plano</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isRunningNow}
            onClick={() => void handleRunNow()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-emerald-400 ${
                isRunningNow ? 'animate-spin' : ''
              }`}
            />
            <span>
              {isRunningNow ? 'Organizando com IA...' : 'Executar Ciclo Agora'}
            </span>
          </button>
        </div>
      </div>

      {/* Feedback / Error Banners */}
      {actionNotice && (
        <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-300 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {(errorBanner || autopilotState?.lastError) && (
        <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner || autopilotState?.lastError}</span>
          </span>
          {errorBanner && (
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-300 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Schedule & Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/40 text-xs">
        <div className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Frequência em Segundo Plano
          </span>
          <div className="mt-2 flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 w-fit">
            {([5, 15, 30, 60] as const).map((mins) => (
              <button
                key={mins}
                type="button"
                disabled={isSavingConfig}
                onClick={() => void updateServerConfig({ intervalMinutes: mins })}
                className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition cursor-pointer ${
                  autopilotState?.intervalMinutes === mins
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Última Execução
          </span>
          <div className="mt-2 font-mono text-white font-semibold tabular-nums">
            {autopilotState?.lastRunAt
              ? formatDate(autopilotState.lastRunAt)
              : 'Nenhuma execução ainda'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            Total de ciclos: {autopilotState?.totalRuns ?? 0}
          </div>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Próximo Ciclo Agendado
          </span>
          <div className="mt-2 font-mono text-white font-semibold tabular-nums">
            {autopilotState?.enabled && autopilotState.nextRunAt
              ? formatDate(autopilotState.nextRunAt)
              : 'Agendamento pausado'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Executa no servidor mesmo com app fechado
          </div>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Pendências Organizadas
          </span>
          <div className="mt-2 font-mono text-white font-semibold tabular-nums">
            {pendingTasks.length} aguardando revisão
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 font-mono tabular-nums">
            {appliedTasksCount} aplicadas ao painel
          </div>
        </div>
      </div>

      {/* Focus Areas Selection */}
      <div className="p-6 border-b border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-300">
            Frentes de Organização Autônoma da IA
          </span>
          <span className="text-[11px] text-slate-400">
            Modelo servidor: <span className="font-mono text-slate-300">gemini-4-hydrogen</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {FOCUS_AREA_OPTIONS.map((opt) => {
            const active = autopilotState?.focusAreas.includes(opt.id) ?? true;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={isSavingConfig}
                onClick={() => handleToggleFocusArea(opt.id)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  active
                    ? 'bg-slate-950 border-emerald-500/40 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Away Briefing & Organized Tasks */}
      <div className="p-6 space-y-5">
        {autopilotState?.latestBriefing ? (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <ListChecks className="w-4 h-4 shrink-0" />
                <span>Resumo da Última Organização</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {formatDate(autopilotState.latestBriefing.generatedAt)}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">
              {autopilotState.latestBriefing.headline}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {autopilotState.latestBriefing.awaySummary}
            </p>
            {autopilotState.latestBriefing.organizedHighlights.length > 0 && (
              <ul className="pt-2 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                {autopilotState.latestBriefing.organizedHighlights.map(
                  (item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-xs text-slate-400 text-center space-y-2">
            <p>
              Ative o modo em segundo plano ou clique em <strong>Executar Ciclo Agora</strong> para a IA auditar e organizar seu catálogo, cupons e financeiro.
            </p>
            {autopilotState &&
              autopilotState.organizedTasks.length === 0 &&
              autopilotState.runsHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRunsHistory((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {showRunsHistory
                      ? 'Ocultar Histórico de Ciclos'
                      : `Histórico de Ciclos (${autopilotState.runsHistory.length})`}
                  </span>
                </button>
              )}
          </div>
        )}

        {/* Actionable Tasks Queue */}
        {autopilotState && autopilotState.organizedTasks.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Ações Organizadas Pela IA ({pendingTasks.length} pendentes)
              </h4>
              {autopilotState.runsHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRunsHistory((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {showRunsHistory
                      ? 'Ocultar Histórico de Ciclos'
                      : `Histórico de Ciclos (${autopilotState.runsHistory.length})`}
                  </span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              {autopilotState.organizedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      <span className="font-semibold text-slate-300 uppercase text-[10px]">
                        {task.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-emerald-400">
                        {task.estimatedImpact}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {task.title}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === 'applied' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aplicada</span>
                      </span>
                    ) : task.status === 'dismissed' ? (
                      <span className="text-xs text-slate-500">Descartada</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleApplyTask(task)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Aplicar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDismissTask(task.id)}
                          aria-label={`Descartar ${task.title}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Background Runs History Table */}
        {showRunsHistory && autopilotState && autopilotState.runsHistory.length > 0 && (
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Registro de Execuções em Segundo Plano
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Data / Hora</th>
                    <th className="px-4 py-2.5">Gatilho</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Resumo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {autopilotState.runsHistory.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-950/40">
                      <td className="px-4 py-2.5 font-mono text-slate-300 whitespace-nowrap tabular-nums">
                        {formatDate(run.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                        {run.trigger === 'scheduled_away'
                          ? 'Segundo Plano (Ausente)'
                          : 'Execução Manual'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {run.outcome === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sucesso ({run.tasksCreated})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Erro</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">
                        {run.errorMessage ? run.errorMessage : run.summary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
