import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Clock,
  Download,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Smartphone,
  Monitor,
  Tablet,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { AnalyticsWindow } from '../../services/analyticsClient';

type AnalyticsSubTab = 'overview' | 'patterns' | 'revenue' | 'decisions' | 'events';

export const UserAnalyticsDashboard: React.FC = () => {
  const {
    userAnalytics,
    analyticsOverview,
    analyticsWindow,
    setAnalyticsWindow,
    isAnalyticsLoading,
    refreshAnalyticsOverview,
    trackAnalyticsEvent,
    selectedCurrency,
  } = useMonetization();

  const [subTab, setSubTab] = useState<AnalyticsSubTab>('overview');
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);
  const [simNotice, setSimNotice] = useState<string | null>(null);

  const engagement = analyticsOverview?.engagement || {
    ...userAnalytics.engagement,
    dau: 365,
    mau: 1240,
    stickinessPct: 29.4,
    pagesPerSession: 3.1,
    overallConversionRate: 12.0,
  };

  const revenueSummary = analyticsOverview?.revenueSummary || {
    totalGross: userAnalytics.revenueSourcesEfficacy.reduce((s, r) => s + r.grossRevenue, 0),
    totalNet: userAnalytics.revenueSourcesEfficacy.reduce(
      (s, r) => s + r.grossRevenue * (r.netMarginPercentage / 100),
      0
    ),
    arpu: 6.45,
    arppu: 53.6,
    payingUsers: 580,
    adsRevenue: 386.4,
    adEcpm: 26.07,
  };

  const retention = analyticsOverview?.retention || userAnalytics.retention;
  const funnel = analyticsOverview?.funnel || userAnalytics.funnel;
  const idealTouchpoints = analyticsOverview?.idealTouchpoints || userAnalytics.idealTouchpoints;
  const revenueSources =
    analyticsOverview?.revenueSources ||
    userAnalytics.revenueSourcesEfficacy.map((r) => ({
      ...r,
      netRevenue: Number((r.grossRevenue * (r.netMarginPercentage / 100)).toFixed(2)),
      sharePct: 0,
      transactionsCount: 0,
      trendPct: 12.0,
    }));

  const usagePatterns = analyticsOverview?.usagePatterns;
  const keyMetricsDecisions = analyticsOverview?.keyMetricsDecisions || [];
  const recentEvents = analyticsOverview?.recentEvents || [];

  const handleSimulateTrackedEvent = async (
    kind: 'visit' | 'preview' | 'checkout' | 'ad_click'
  ) => {
    if (kind === 'visit') {
      await trackAnalyticsEvent({
        category: 'monetization_funnel',
        eventType: 'storefront_visit',
        source: 'storefront',
        screenOrTab: 'storefront:products',
        channel: 'instagram_bio',
        durationSec: 45,
      });
      setSimNotice('Evento real registrado: Visita na Vitrine via Instagram Bio.');
    } else if (kind === 'preview') {
      await trackAnalyticsEvent({
        category: 'usage_pattern',
        eventType: 'product_preview',
        source: 'storefront',
        screenOrTab: 'storefront:exclusive',
        channel: 'youtube',
        durationSec: 92,
      });
      setSimNotice('Evento real registrado: Leitura / Preview de oferta exclusiva.');
    } else if (kind === 'checkout') {
      await trackAnalyticsEvent({
        category: 'revenue',
        eventType: 'checkout_completed',
        source: 'checkout',
        screenOrTab: 'checkout:subscription',
        revenueSource: 'subscription',
        amountBRL: 97,
        channel: 'direct',
        durationSec: 36,
      });
      setSimNotice('Evento real registrado: Assinatura VIP concluída (+R$ 97,00).');
    } else {
      await trackAnalyticsEvent({
        category: 'revenue',
        eventType: 'ad_click',
        source: 'ads',
        screenOrTab: 'storefront:products',
        revenueSource: 'ads',
        amountBRL: 0.35,
        channel: 'ads_organic',
      });
      setSimNotice('Evento real registrado: Clique em anúncio nativo (+R$ 0,35).');
    }
    await refreshAnalyticsOverview(analyticsWindow);
  };

  const handleExportCsv = () => {
    const rows = [
      ['Metrica', 'Valor Atual', 'Meta Benchmark', 'Decisao Monetizacao', 'Acao Recomendada'],
      ...keyMetricsDecisions.map((k) => [
        k.metricName,
        k.currentValue,
        k.benchmarkTarget,
        k.monetizationDecision,
        k.recommendedAction,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monetizahub-analytics-${analyticsWindow}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const heatmap = usagePatterns?.heatmap || [];
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const slots = ['00h-04h', '04h-08h', '08h-12h', '12h-16h', '16h-20h', '20h-24h'];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Control Bar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Sistema de Análise de Engajamento, Receita & Padrões de Uso
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Telemetria real persistida no servidor ({analyticsOverview?.liveEventsCount ?? 0} eventos na janela) • Use as métricas chave abaixo para calibrar preços, paywall, assinaturas e anúncios.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Period Window */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['24h', '7d', '30d'] as AnalyticsWindow[]).map((win) => (
                <button
                  key={win}
                  type="button"
                  onClick={() => setAnalyticsWindow(win)}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    analyticsWindow === win
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {win.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void refreshAnalyticsOverview(analyticsWindow)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyticsLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Sub-tab & Event Tester Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            {[
              { id: 'overview', label: 'Visão Geral & Funil' },
              { id: 'patterns', label: 'Padrões de Uso (Mapa de Calor)' },
              { id: 'revenue', label: 'Fontes de Receita' },
              { id: 'decisions', label: 'Métricas Chave & Decisões' },
              { id: 'events', label: `Eventos ao Vivo (${recentEvents.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as AnalyticsSubTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  subTab === t.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-400 font-semibold mr-1">Registrar evento teste:</span>
            <button
              type="button"
              onClick={() => void handleSimulateTrackedEvent('visit')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-slate-300 font-semibold transition cursor-pointer"
            >
              + Visita Vitrine
            </button>
            <button
              type="button"
              onClick={() => void handleSimulateTrackedEvent('preview')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-slate-300 font-semibold transition cursor-pointer"
            >
              + Leitura Paywall
            </button>
            <button
              type="button"
              onClick={() => void handleSimulateTrackedEvent('checkout')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-emerald-500/30 hover:bg-emerald-950/40 text-emerald-300 font-semibold transition cursor-pointer"
            >
              + Assinatura R$ 97
            </button>
            <button
              type="button"
              onClick={() => void handleSimulateTrackedEvent('ad_click')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-purple-300 font-semibold transition cursor-pointer"
            >
              + Clique Anúncio
            </button>
          </div>
        </div>
      </div>

      {simNotice && (
        <div className="p-3 rounded-xl bg-indigo-950/50 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between">
          <span>{simNotice}</span>
          <button
            type="button"
            onClick={() => setSimNotice(null)}
            className="text-slate-400 hover:text-white font-bold cursor-pointer"
          >
            Ok
          </button>
        </div>
      )}

      {/* 6 CORE KPIS (ALWAYS VISIBLE AT TOP) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Sessões / DAU
          </span>
          <div className="text-xl font-extrabold text-white mt-1 font-mono tabular-nums">
            {formatNumber(engagement.totalSessions)}
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold block mt-1 tabular-nums">
            {formatNumber(engagement.dau)} ativos hoje
          </span>
        </div>

        <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Stickiness (DAU/MAU)
          </span>
          <div className="text-xl font-extrabold text-indigo-300 mt-1 font-mono tabular-nums">
            {engagement.stickinessPct.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 tabular-nums">
            MAU: {formatNumber(engagement.mau)}
          </span>
        </div>

        <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Duração & Profundidade
          </span>
          <div className="text-xl font-extrabold text-amber-300 mt-1 font-mono tabular-nums">
            {engagement.avgSessionDurationMinutes} min
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 tabular-nums">
            {engagement.pagesPerSession} telas / sessão
          </span>
        </div>

        <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Cliques Checkout & Bounce
          </span>
          <div className="text-xl font-extrabold text-white mt-1 font-mono tabular-nums">
            {engagement.checkoutClickRate}%
          </div>
          <span className="text-[10px] text-emerald-400 block mt-1 tabular-nums">
            Rejeição: {engagement.bounceRatePercentage}%
          </span>
        </div>

        <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            ARPU / ARPPU
          </span>
          <div className="text-xl font-extrabold text-emerald-300 mt-1 font-mono tabular-nums">
            {formatCurrency(revenueSummary.arpu, selectedCurrency)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 tabular-nums">
            Pagante: {formatCurrency(revenueSummary.arppu, selectedCurrency)}
          </span>
        </div>

        <div className="bg-slate-900/95 p-4 rounded-xl border border-emerald-500/30">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            LTV Médio & Churn
          </span>
          <div className="text-xl font-black text-white mt-1 font-mono tabular-nums">
            {formatCurrency(retention.averageLtv, selectedCurrency)}
          </div>
          <span className="text-[10px] text-amber-300 font-semibold block mt-1 tabular-nums">
            Churn: {retention.monthlyChurnRate}% / mês
          </span>
        </div>
      </div>

      {/* OVERVIEW & FUNNEL */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Funnel */}
          <div className="bg-slate-900/95 p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span>Funil de Conversão Ponta a Ponta</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conversão do primeiro acesso até pagamento aprovado na janela selecionada ({analyticsWindow})
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                Conversão Geral: {engagement.overallConversionRate}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {funnel.map((step, idx) => (
                <div
                  key={step.name}
                  className="bg-slate-950/80 p-4 rounded-xl border border-slate-800"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-mono font-bold text-slate-500">Etapa 0{idx + 1}</span>
                    <span className="font-mono font-extrabold text-white tabular-nums">
                      {step.percentage}%
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">{step.name}</div>
                  <div className="text-lg font-mono font-extrabold text-indigo-400 mt-1 tabular-nums">
                    {formatNumber(step.count)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    {step.description}
                  </p>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, step.percentage)}%` }}
                    />
                  </div>
                  {idx > 0 && (
                    <div className="text-[10px] text-rose-400 mt-2 font-mono tabular-nums">
                      Queda na etapa: -{step.dropoffPercentage}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ideal Behavioral Touchpoints */}
          <div className="bg-slate-900/95 p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Gatilhos & Pontos Ideais de Oferta</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Momentos de maior propensão a compra detectados pelos padrões de navegação
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {idealTouchpoints.map((tp) => (
                <div
                  key={tp.id}
                  className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">{tp.name}</h4>
                      <span className="text-[11px] text-slate-400">
                        Gatilho: {tp.triggerEvent}
                      </span>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div className="text-base font-extrabold text-emerald-400 font-mono">
                        {tp.conversionRate}%
                      </div>
                      <span className="text-[10px] text-slate-400">Conversão</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div><strong>Janela:</strong> {tp.bestTimeWindow}</div>
                    <div className="mt-1"><strong>Ação:</strong> {tp.recommendation}</div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                    <span>Ticket Esperado: <strong className="text-white font-mono">{formatCurrency(tp.averageTicket, selectedCurrency)}</strong></span>
                    <span className="font-bold text-emerald-400">Eficácia: {tp.efficacyScore}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PATTERNS & USAGE HEATMAP */}
      {subTab === 'patterns' && usagePatterns && (
        <div className="space-y-6">
          <div className="bg-slate-900/95 p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Mapa de Calor de Uso (Dia da Semana × Faixa Horária)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pico identificado: <strong className="text-amber-300">{usagePatterns.peakDayLabel} • {usagePatterns.peakWindowLabel}</strong>
                </p>
              </div>
              <div className="text-xs text-slate-400">
                Passe o cursor sobre um bloco para ver sessões e conversões
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[560px] space-y-2">
                <div className="grid grid-cols-7 gap-2 text-[11px] font-bold text-slate-400">
                  <div>Dia / Horário</div>
                  {slots.map((s) => (
                    <div key={s} className="text-center font-mono">{s}</div>
                  ))}
                </div>
                {days.map((dayLabel, dayIdx) => (
                  <div key={dayLabel} className="grid grid-cols-7 gap-2 items-center">
                    <div className="text-xs font-bold text-slate-300">{dayLabel}</div>
                    {slots.map((slotLabel, slotIdx) => {
                      const cell = heatmap.find(
                        (c) => c.dayIndex === dayIdx && c.slotIndex === slotIdx
                      );
                      const intensity = cell?.intensity ?? 20;
                      const cellKey = `${dayIdx}-${slotIdx}`;
                      const bgClass =
                        intensity >= 85
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : intensity >= 65
                          ? 'bg-emerald-600/75 text-white font-bold'
                          : intensity >= 40
                          ? 'bg-indigo-600/55 text-slate-100'
                          : 'bg-slate-950 text-slate-400 border border-slate-800';

                      return (
                        <div
                          key={cellKey}
                          onMouseEnter={() => setHoveredCellKey(cellKey)}
                          onMouseLeave={() => setHoveredCellKey(null)}
                          className={`relative rounded-lg py-2.5 text-center text-xs font-mono tabular-nums transition cursor-default ${bgClass}`}
                          title={`${dayLabel} ${slotLabel}: ${cell?.sessions || 0} sessões, ${cell?.conversions || 0} vendas`}
                        >
                          {cell?.sessions ?? 0}
                          {hoveredCellKey === cellKey && cell && (
                            <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[10px] text-white whitespace-nowrap shadow-xl pointer-events-none">
                              {cell.dayLabel} {cell.slotLabel}: {cell.sessions} sessões • {cell.conversions} conversões
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Adoption */}
            <div className="bg-slate-900/95 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Adoção por Recurso & Tempo de Permanência
              </h3>
              <div className="space-y-3">
                {usagePatterns.featureAdoption.map((feat) => (
                  <div key={feat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{feat.label}</span>
                      <span className="font-mono text-slate-300 tabular-nums">
                        {formatNumber(feat.views)} acessos • {feat.avgDwellSec}s médio
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, feat.sharePct * 2.5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Devices & Channels */}
            <div className="space-y-4">
              <div className="bg-slate-900/95 p-5 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Uso por Dispositivo
                </h3>
                <div className="space-y-2.5">
                  {usagePatterns.devices.map((d) => (
                    <div
                      key={d.device}
                      className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-xl border border-slate-800"
                    >
                      <div className="flex items-center gap-2 font-semibold text-white">
                        {d.device.includes('Mobile') ? (
                          <Smartphone className="w-4 h-4 text-emerald-400" />
                        ) : d.device.includes('Tablet') ? (
                          <Tablet className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Monitor className="w-4 h-4 text-amber-400" />
                        )}
                        <span>{d.device}</span>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-white font-bold">{d.sharePct}%</span>
                        <span className="text-slate-400 ml-2">({d.conversionRate}% conv.)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/95 p-5 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Canais de Aquisição & ARPU
                </h3>
                <div className="space-y-2">
                  {usagePatterns.channels.map((ch) => (
                    <div
                      key={ch.channel}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/70 last:border-0"
                    >
                      <span className="text-slate-200 font-medium">{ch.channel}</span>
                      <span className="font-mono text-emerald-400 font-bold tabular-nums">
                        {ch.sharePct}% • ARPU {formatCurrency(ch.arpu, selectedCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVENUE SOURCES */}
      {subTab === 'revenue' && (
        <div className="bg-slate-900/95 p-6 rounded-2xl border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Desempenho & Margem por Fonte de Receita</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Correlação entre faturamento bruto, margem líquida, transações e retorno sobre esforço
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
              Total Bruto: {formatCurrency(revenueSummary.totalGross, selectedCurrency)} • Líquido: {formatCurrency(revenueSummary.totalNet, selectedCurrency)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Fonte de Receita</th>
                  <th className="py-3 px-4 font-bold text-right">Faturamento Bruto</th>
                  <th className="py-3 px-4 font-bold text-right">Receita Líquida</th>
                  <th className="py-3 px-4 font-bold text-right">Margem</th>
                  <th className="py-3 px-4 font-bold text-right">ROI</th>
                  <th className="py-3 px-4 font-bold text-right">Conversão</th>
                  <th className="py-3 px-4 font-bold text-right">Tendência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {revenueSources.map((src) => (
                  <tr key={src.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white">{src.name}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white tabular-nums">
                      {formatCurrency(src.grossRevenue, selectedCurrency)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold tabular-nums">
                      {formatCurrency(src.netRevenue, selectedCurrency)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-200 tabular-nums">
                      {src.netMarginPercentage}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-300 font-bold tabular-nums">
                      {src.roiMultiplier}x
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-200 tabular-nums">
                      {src.conversionRate}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold tabular-nums">
                      +{src.trendPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KEY METRICS & MONETIZATION DECISIONS MATRIX */}
      {subTab === 'decisions' && (
        <div className="space-y-4">
          <div className="bg-slate-900/95 p-5 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Métricas Chave Recomendadas & Como Elas Guiam Decisões de Monetização</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Cada indicador abaixo conecta telemetria de comportamento diretamente a uma alavanca prática de receita (Preços, Assinaturas, Paywall, IAP e Anúncios).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keyMetricsDecisions.map((km) => (
              <div
                key={km.id}
                className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                      {km.category}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{km.metricName}</h4>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border shrink-0 ${
                      km.status === 'healthy'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : km.status === 'attention'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {km.status === 'healthy'
                      ? 'Saudável'
                      : km.status === 'attention'
                      ? 'Atenção'
                      : 'Oportunidade'}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div><strong>Fórmula:</strong> {km.formula}</div>
                  <div className="mt-1 flex flex-wrap justify-between gap-2 text-slate-200">
                    <span>Atual: <strong className="text-emerald-400">{km.currentValue}</strong></span>
                    <span>Alvo: <strong>{km.benchmarkTarget}</strong></span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{km.insight}</p>

                <div className="pt-2 border-t border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-amber-300">
                    Decisão de Monetização: {km.monetizationDecision}
                  </div>
                  <div className="text-slate-300">{km.recommendedAction}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIVE CAPTURED EVENTS FEED */}
      {subTab === 'events' && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Feed de Eventos Capturados no Servidor</h3>
              <p className="text-xs text-slate-400">
                Persistidos em disco para recalcular funil, heatmap e receitas em tempo real
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {recentEvents.length} registros recentes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Horário</th>
                  <th className="py-2.5 px-4">Evento</th>
                  <th className="py-2.5 px-4">Tela / Origem</th>
                  <th className="py-2.5 px-4">Canal & Dispositivo</th>
                  <th className="py-2.5 px-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {recentEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-mono text-slate-400 whitespace-nowrap tabular-nums">
                      {new Date(ev.timestamp).toLocaleTimeString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-white whitespace-nowrap">
                      {ev.eventType}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-mono">
                      {ev.screenOrTab} ({ev.source})
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {ev.channel} • {ev.device}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums">
                      {typeof ev.amountBRL === 'number'
                        ? formatCurrency(ev.amountBRL, selectedCurrency)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
