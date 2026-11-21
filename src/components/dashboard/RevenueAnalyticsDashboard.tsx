import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Percent,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  DollarSign,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
  Activity,
  Flame,
  Crown,
  Megaphone,
  Smartphone,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';
import { TimeSeriesPoint } from '../../types/monetization';
import { CurrentVsPreviousMonthChart } from './CurrentVsPreviousMonthChart';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

type TimeFilter = 'dia' | 'semana' | 'mes';

export interface RevenueAnalyticsDashboardProps {
  onOpenInAppPurchases?: () => void;
  onOpenAppSubscription?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const RevenueAnalyticsDashboard: React.FC<RevenueAnalyticsDashboardProps> = ({
  onOpenInAppPurchases,
  onOpenAppSubscription,
  onNavigateTab,
}) => {
  const {
    transactions,
    totalGrossRevenue,
    totalNetRevenue,
    totalSalesCount,
    selectedCurrency,
    mrr,
    tiers,
    products,
    creator,
    inAppFeatures,
    purchasedFeatureIds,
    adStats,
    adSettings,
    appSubscription,
    triggerInterstitialAd,
    setRewardedOpen,
  } = useMonetization();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('mes');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'arpu' | 'conversion' | 'in_app' | 'subscribers'>('revenue');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Generate dynamic, coherent time-series data based on timeFilter ('dia', 'semana', 'mes')
  const timeSeriesData: TimeSeriesPoint[] = useMemo(() => {
    if (timeFilter === 'dia') {
      // 24-hour breakdown (today / last 24h in 3-hour slices)
      const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
      return hours.map((hour, idx) => {
        const factor = idx === 4 || idx === 6 ? 2.4 : idx === 5 ? 1.9 : 0.8;
        const gross = Math.round(180 * factor + (idx % 2 === 0 ? 60 : 20));
        const net = Math.round(gross * 0.95);
        const visitors = Math.round(140 * factor + 50);
        const payingUsers = Math.max(1, Math.round(visitors * 0.038));
        const arpu = Number((gross / visitors).toFixed(2));
        const conversionRate = Number(((payingUsers / visitors) * 100).toFixed(2));

        return {
          date: `Hoje, ${hour}`,
          label: hour,
          grossAmount: gross,
          netAmount: net,
          transactionsCount: Math.max(1, Math.round(payingUsers * 1.2)),
          arpu,
          conversionRate,
          visitors,
          payingUsers,
        };
      });
    }

    if (timeFilter === 'semana') {
      // 7-day breakdown (Segunda a Domingo)
      const days = [
        { label: 'Seg', name: '27 Out' },
        { label: 'Ter', name: '28 Out' },
        { label: 'Qua', name: '29 Out' },
        { label: 'Qui', name: '30 Out' },
        { label: 'Sex', name: '31 Out' },
        { label: 'Sáb', name: '01 Nov' },
        { label: 'Dom', name: '02 Nov' },
      ];

      return days.map((day, idx) => {
        const factor = idx === 4 || idx === 5 ? 1.8 : idx === 3 ? 1.5 : 1.1;
        const gross = Math.round(850 * factor + (idx * 40));
        const net = Math.round(gross * 0.952);
        const visitors = Math.round(780 * factor);
        const payingUsers = Math.max(5, Math.round(visitors * 0.034));
        const arpu = Number((gross / visitors).toFixed(2));
        const conversionRate = Number(((payingUsers / visitors) * 100).toFixed(2));

        return {
          date: `${day.label}, ${day.name}`,
          label: day.label,
          grossAmount: gross,
          netAmount: net,
          transactionsCount: Math.max(3, Math.round(payingUsers * 1.15)),
          arpu,
          conversionRate,
          visitors,
          payingUsers,
        };
      });
    }

    // Monthly breakdown (Últimos 6 meses)
    const months = [
      { label: 'Jun', name: 'Junho 2026' },
      { label: 'Jul', name: 'Julho 2026' },
      { label: 'Ago', name: 'Agosto 2026' },
      { label: 'Set', name: 'Setembro 2026' },
      { label: 'Out', name: 'Outubro 2026' },
      { label: 'Nov', name: 'Novembro 2026 (Atual)' },
    ];

    const monthlyGrossValues = [5420, 7890, 9400, 12600, 16800, 21950];
    const monthlyVisitors = [4200, 5600, 6800, 8900, 11400, 14200];

    return months.map((month, idx) => {
      const gross = monthlyGrossValues[idx];
      const net = Math.round(gross * 0.955);
      const visitors = monthlyVisitors[idx];
      const payingUsers = Math.round(visitors * (0.026 + idx * 0.002));
      const arpu = Number((gross / visitors).toFixed(2));
      const conversionRate = Number(((payingUsers / visitors) * 100).toFixed(2));

      return {
        date: month.name,
        label: month.label,
        grossAmount: gross,
        netAmount: net,
        transactionsCount: Math.round(payingUsers * 1.25),
        arpu,
        conversionRate,
        visitors,
        payingUsers,
      };
    });
  }, [timeFilter]);

  // Aggregate Metrics for Active Period
  const aggregateStats = useMemo(() => {
    const totalGross = timeSeriesData.reduce((acc, p) => acc + p.grossAmount, 0);
    const totalNet = timeSeriesData.reduce((acc, p) => acc + p.netAmount, 0);
    const totalVisitors = timeSeriesData.reduce((acc, p) => acc + p.visitors, 0);
    const totalPaying = timeSeriesData.reduce((acc, p) => acc + p.payingUsers, 0);
    const avgArpu = totalVisitors > 0 ? Number((totalGross / totalVisitors).toFixed(2)) : 0;
    const avgConversion = totalVisitors > 0 ? Number(((totalPaying / totalVisitors) * 100).toFixed(2)) : 0;
    const arppu = totalPaying > 0 ? Number((totalGross / totalPaying).toFixed(2)) : 0; // Average Revenue Per Paying User

    return {
      totalGross,
      totalNet,
      totalVisitors,
      totalPaying,
      avgArpu,
      avgConversion,
      arppu,
      projectedLtv: Number((arppu * 3.4).toFixed(2)),
    };
  }, [timeSeriesData]);

  // SVG Chart Dimensions & Computations
  const chartHeight = 240;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 30;

  const currentValues = useMemo(() => {
    if (selectedMetric === 'revenue') {
      return timeSeriesData.map((d) => d.grossAmount);
    }
    if (selectedMetric === 'arpu') {
      return timeSeriesData.map((d) => d.arpu);
    }
    if (selectedMetric === 'in_app') {
      return timeSeriesData.map((d) => d.transactionsCount);
    }
    if (selectedMetric === 'subscribers') {
      return timeSeriesData.map((d) => d.payingUsers);
    }
    return timeSeriesData.map((d) => d.conversionRate);
  }, [timeSeriesData, selectedMetric]);

  const activeColor = useMemo(() => {
    switch (selectedMetric) {
      case 'revenue':
        return '#10b981';
      case 'arpu':
        return '#6366f1';
      case 'in_app':
        return '#f59e0b';
      case 'subscribers':
        return '#a855f7';
      default:
        return '#10b981';
    }
  }, [selectedMetric]);

  const maxValue = Math.max(...currentValues, 1);
  const minValue = 0;

  // Compute SVG Points
  const points = useMemo(() => {
    const effectiveWidth = chartWidth - paddingX * 2;
    const effectiveHeight = chartHeight - paddingY * 2;
    const step = timeSeriesData.length > 1 ? effectiveWidth / (timeSeriesData.length - 1) : 0;

    return currentValues.map((val, idx) => {
      const x = paddingX + idx * step;
      const normalizedY = (val - minValue) / (maxValue - minValue || 1);
      const y = chartHeight - paddingY - normalizedY * effectiveHeight;
      return { x, y, value: val, pointData: timeSeriesData[idx] };
    });
  }, [currentValues, maxValue, minValue, timeSeriesData]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return `${pathD} L ${last.x} ${chartHeight - paddingY} L ${first.x} ${chartHeight - paddingY} Z`;
  }, [pathD, points]);

  // Export Analytics Data
  const handleExportCSV = () => {
    const headers = 'Data,Receita_Bruta,Receita_Liquida,Visitantes,Pagantes,ARPU,Taxa_Conversao_Pct\n';
    const rows = timeSeriesData
      .map(
        (p) =>
          `"${p.date}",${p.grossAmount.toFixed(2)},${p.netAmount.toFixed(2)},${p.visitors},${p.payingUsers},${p.arpu.toFixed(2)},${p.conversionRate.toFixed(2)}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_analise_receita_${timeFilter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activePoint = hoveredPointIndex !== null ? points[hoveredPointIndex] : points[points.length - 1];

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Painel de Análise de Receita & Métricas Avançadas</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Ao Vivo
                  </span>
                  <ModalityFeeTooltip modality="all_summary" triggerLabel="Taxas por canal" tone="emerald" />
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acompanhamento aprofundado de faturamento, receita média por usuário (ARPU) e taxa de conversão de {creator.name}.
                </p>
              </div>
            </div>
          </div>

          {/* Time Filter Buttons and Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Toggle: Dia / Semana / Mês */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTimeFilter('dia')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeFilter === 'dia'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dia (24h)
              </button>
              <button
                onClick={() => setTimeFilter('semana')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeFilter === 'semana'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semana (7d)
              </button>
              <button
                onClick={() => setTimeFilter('mes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeFilter === 'mes'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mês (Mensal)
              </button>
            </div>

            {/* Export Report CSV Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Baixar planilha de métricas"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Dados</span>
            </button>
          </div>
        </div>

        {/* 4 Key Monetization Metrics Cards (+ In-App Ads) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* 1. Receita Total Card */}
          <div
            onClick={() => setSelectedMetric('revenue')}
            className={`p-4 rounded-2xl border cursor-pointer transition relative overflow-hidden ${
              selectedMetric === 'revenue'
                ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Receita Total
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ArrowUpRight className="w-3 h-3" />
                +24.8%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono">
                {formatCurrency(aggregateStats.totalGross, selectedCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between gap-2">
                <span>Líquido: <strong className="text-emerald-400">{formatCurrency(aggregateStats.totalNet, selectedCurrency)}</strong></span>
                <span className="text-slate-500 font-mono flex items-center gap-1">
                  <span>95.2% margem</span>
                  <ModalityFeeTooltip modality="all_summary" iconOnly tone="emerald" />
                </span>
              </div>
            </div>
          </div>

          {/* 2. Receita por Usuário (ARPU / ARPPU) Card */}
          <div
            onClick={() => setSelectedMetric('arpu')}
            className={`p-4 rounded-2xl border cursor-pointer transition relative overflow-hidden ${
              selectedMetric === 'arpu'
                ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-950/20 ring-1 ring-indigo-500/30'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Receita por Usuário (ARPU)
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                <ArrowUpRight className="w-3 h-3" />
                +14.2%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono">
                {formatCurrency(aggregateStats.avgArpu, selectedCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>ARPPU Pagante: <strong className="text-indigo-300 font-mono">{formatCurrency(aggregateStats.arppu, selectedCurrency)}</strong></span>
                <span className="text-slate-500 font-mono">LTV: {formatCurrency(aggregateStats.projectedLtv, selectedCurrency)}</span>
              </div>
            </div>
          </div>

          {/* 3. Número de Compras no Aplicativo Card */}
          <div
            onClick={() => setSelectedMetric('in_app')}
            className={`p-4 rounded-2xl border cursor-pointer transition relative overflow-hidden ${
              selectedMetric === 'in_app'
                ? 'bg-gradient-to-b from-amber-950/40 to-slate-900 border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                Compras no Aplicativo
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <ArrowUpRight className="w-3 h-3" />
                +33.1%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono">
                {formatNumber(totalSalesCount || 189)}
                <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">pedidos</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Upgrades ativos: <strong className="text-amber-300 font-mono">{purchasedFeatureIds.length} / {inAppFeatures.length}</strong></span>
                <span className="text-slate-500 font-mono">Ticket: {formatCurrency(totalGrossRevenue / (totalSalesCount || 1), selectedCurrency)}</span>
              </div>
            </div>
          </div>

          {/* 4. Assinantes Ativos & MRR Card */}
          <div
            onClick={() => setSelectedMetric('subscribers')}
            className={`p-4 rounded-2xl border cursor-pointer transition relative overflow-hidden ${
              selectedMetric === 'subscribers'
                ? 'bg-gradient-to-b from-purple-950/40 to-slate-900 border-purple-500/60 shadow-lg shadow-purple-950/20 ring-1 ring-purple-500/30'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-purple-400" />
                Assinantes Ativos
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                <ArrowUpRight className="w-3 h-3" />
                +58.8%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono">
                {tiers.reduce((s, t) => s + (t.activeMembers || 0), 0) + (appSubscription?.status === 'active' && appSubscription?.tier !== 'free' ? 1 : 0)}
                <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">membros VIP</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>MRR Mensal: <strong className="text-purple-300 font-mono">{formatCurrency(mrr, selectedCurrency)}</strong></span>
                <span className="text-emerald-400 font-mono">Retenção 98.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Supplementary Pill: Ad Revenue & In-App Ads Status */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Megaphone className="w-4 h-4" />
            </span>
            <div>
              <span className="text-slate-300 font-semibold">Monetização de Anúncios In-App: </span>
              <span className="font-mono font-bold text-white ml-1">
                {formatCurrency(adStats.adRevenue, selectedCurrency)} gerados
              </span>
              <span className="text-slate-400 text-[11px] ml-2">
                ({formatNumber(adStats.impressions)} impressões • eCPM R$ {adStats.ecpm.toFixed(2)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Status Pro:
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              appSubscription?.status === 'active' && appSubscription?.tier !== 'free'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {appSubscription?.status === 'active' && appSubscription?.tier !== 'free'
                ? `Plano ${appSubscription.tier.toUpperCase()} (Sem Anúncios)`
                : 'Versão Gratuita (Anúncios Ativos)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart View */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>
                {selectedMetric === 'revenue' && 'Evolução da Receita Total ao Longo do Tempo'}
                {selectedMetric === 'arpu' && 'Curva de Receita Média por Usuário (ARPU)'}
                {selectedMetric === 'in_app' && 'Volume de Compras no Aplicativo e Vendas Únicas'}
                {selectedMetric === 'subscribers' && 'Crescimento de Assinantes VIP e Clientes Ativos'}
                {selectedMetric === 'conversion' && 'Taxa de Conversão de Usuários Pagantes (%)'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Passe o cursor sobre os pontos para visualizar detalhes de cada intervalo ({timeFilter}).
            </p>
          </div>

          {/* Active Highlight Info Badge */}
          {activePoint && (
            <div className="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-3 text-xs self-start sm:self-auto font-mono">
              <span className="text-slate-400">{activePoint.pointData.date}:</span>
              <strong style={{ color: activeColor }}>
                {selectedMetric === 'revenue' && formatCurrency(activePoint.pointData.grossAmount, selectedCurrency)}
                {selectedMetric === 'arpu' && formatCurrency(activePoint.pointData.arpu, selectedCurrency)}
                {selectedMetric === 'in_app' && `${activePoint.pointData.transactionsCount} compras`}
                {selectedMetric === 'subscribers' && `${activePoint.pointData.payingUsers} membros`}
                {selectedMetric === 'conversion' && `${activePoint.pointData.conversionRate}%`}
              </strong>
              <span className="text-slate-500 text-[11px]">
                ({activePoint.pointData.payingUsers} vendas / {activePoint.pointData.visitors} visitas)
              </span>
            </div>
          )}
        </div>

        {/* SVG Curve Chart */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-64 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={activeColor}
                  stopOpacity="0.35"
                />
                <stop
                  offset="100%"
                  stopColor={activeColor}
                  stopOpacity="0.0"
                />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
              const val = minValue + ratio * (maxValue - minValue);
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {selectedMetric === 'revenue'
                      ? `R$ ${Math.round(val)}`
                      : selectedMetric === 'arpu'
                      ? `R$ ${val.toFixed(1)}`
                      : selectedMetric === 'in_app'
                      ? `${Math.round(val)} un`
                      : selectedMetric === 'subscribers'
                      ? `${Math.round(val)} mb`
                      : `${val.toFixed(1)}%`}
                  </text>
                </g>
              );
            })}

            {/* Gradient Area Fill */}
            <path d={areaD} fill="url(#chartGradient)" />

            {/* Line Stroke */}
            <path
              d={pathD}
              fill="none"
              stroke={activeColor}
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Interactive Data Points */}
            {points.map((pt, idx) => {
              const isHovered = hoveredPointIndex === idx;
              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredPointIndex(idx)}
                  className="cursor-pointer transition-all"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4}
                    fill="#0f172a"
                    stroke={activeColor}
                    strokeWidth={isHovered ? 3.5 : 2.5}
                  />
                  {/* Bottom X-axis label */}
                  <text
                    x={pt.x}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    fill={isHovered ? '#ffffff' : '#94a3b8'}
                    fontSize="11"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                  >
                    {pt.pointData.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detailed Breakdown Slices */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Ticket Médio por Pedido
            </span>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {formatCurrency(totalGrossRevenue / (totalSalesCount || 1), selectedCurrency)}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">+8.6% vs benchmark</div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Receita Recorrente (MRR)
            </span>
            <div className="text-base font-bold text-indigo-400 font-mono mt-0.5">
              {formatCurrency(mrr, selectedCurrency)}/mês
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{tiers.reduce((s, t) => s + t.activeMembers, 0)} assinantes VIP</div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Taxa de Retenção (Churn 1.8%)
            </span>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              98.2%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Excelente fidelidade</div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Taxa Média de Gateway
            </span>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              4.8%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Visa Direct & Pix Seguros</div>
          </div>
        </div>
      </div>

      {/* Comparative Grouped Bar Chart: Mês Atual vs. Mês Anterior */}
      <CurrentVsPreviousMonthChart
        currency={selectedCurrency}
        onOpenInAppPurchases={onOpenInAppPurchases}
        onOpenAppSubscription={onOpenAppSubscription}
      />

      {/* Sistema de Monetização Integrada: 3 Pilares Ativos */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Sistema de Monetização Integrada (3 Pilares de Receita)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Ativo & Operacional
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monetização híbrida combinando anúncios in-app, compras únicas/itens virtuais e modelo de assinatura mensal com recursos premium.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pilar 1: Anúncios In-App */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-pink-500/40 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  <Megaphone className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
                  Pilar 1: Anúncios
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Anúncios In-App</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Banners nativos, intersticiais em trocas de aba e anúncios premiados (Rewarded Ads) que recompensam os usuários com bônus e créditos VIP.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Receita Estimada:</span>
                  <strong className="text-pink-400">{formatCurrency(adStats.adRevenue, selectedCurrency)}</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Impressões Totais:</span>
                  <span>{formatNumber(adStats.impressions)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>eCPM Médio:</span>
                  <span>R$ {adStats.ecpm.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setRewardedOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/40 text-xs font-bold transition cursor-pointer"
              >
                <Zap className="w-4 h-4 text-pink-400" />
                <span>Testar Anúncio Premiado</span>
              </button>
            </div>
          </div>

          {/* Pilar 2: Compras Únicas & Recursos Virtuais In-App */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShoppingBag className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Pilar 2: Compras In-App
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Compras Únicas & Itens Virtuais</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Microtransações para recursos virtuais premium, acelerador de liquidação Visa & Express, copiloto IA de precificação e selos exclusivos.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Upgrades Desbloqueados:</span>
                  <strong className="text-amber-400">{purchasedFeatureIds.length} de {inAppFeatures.length}</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Vendas Registradas:</span>
                  <span>{formatNumber(totalSalesCount || 189)} transações</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Gateways Aceitos:</span>
                  <span className="text-emerald-400">Visa Direct, Express & Pix</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenInAppPurchases}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Explorar Compras no App</span>
              </button>
            </div>
          </div>

          {/* Pilar 3: Modelo de Assinatura Mensal com Recursos Premium */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Crown className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Pilar 3: Assinatura Mensal
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Assinatura Mensal & Recursos Pro</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Planos recorrentes (MonetizaHub Pro & Ultra VIP) com taxa zero de saque, remoção completa de anúncios e limites ampliados.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Plano Atual:</span>
                  <strong className="text-purple-300 uppercase">{appSubscription.tier} {appSubscription.status === 'active' && appSubscription.tier !== 'free' ? '(Ativo)' : '(Gratuito)'}</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Receita Recorrente (MRR):</span>
                  <span className="text-white font-bold">{formatCurrency(mrr, selectedCurrency)}/mês</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Vantagens:</span>
                  <span className="text-emerald-400">0% Taxa de Saque • Sem Ads</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenAppSubscription}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition cursor-pointer shadow-md shadow-purple-600/20"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Gerenciar Assinatura Pro</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel & Channel Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Funil de Conversão Visual */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span>Funil de Conversão de Compradores</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Jornada dos visitantes da vitrine até a conclusão da compra.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              {aggregateStats.avgConversion}% Geral
            </span>
          </div>

          {/* Funnel Steps */}
          <div className="space-y-3 pt-2">
            {[
              {
                step: '1. Visitantes Únicos da Vitrine',
                count: aggregateStats.totalVisitors,
                pct: '100%',
                color: 'bg-slate-700',
                note: 'Acessos pelo link da bio e redes',
              },
              {
                step: '2. Visualizou Produto ou Serviço',
                count: Math.round(aggregateStats.totalVisitors * 0.46),
                pct: '46.0%',
                color: 'bg-indigo-600',
                note: 'Engajamento com descrição e prévias',
              },
              {
                step: '3. Iniciou Checkout (Carrinho)',
                count: Math.round(aggregateStats.totalVisitors * 0.12),
                pct: '12.0%',
                color: 'bg-purple-600',
                note: 'Preencheu dados de pagamento',
              },
              {
                step: '4. Pagamento Aprovado (Pagantes)',
                count: aggregateStats.totalPaying,
                pct: `${aggregateStats.avgConversion}%`,
                color: 'bg-emerald-500',
                note: 'Transação liquidada com sucesso',
              },
            ].map((f, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{f.step}</span>
                  <span className="font-mono text-white font-bold">
                    {formatNumber(f.count)}{' '}
                    <span className="text-slate-400 font-normal">({f.pct})</span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${f.color} rounded-full transition-all duration-500`}
                    style={{ width: f.pct }}
                  />
                </div>
                <div className="text-[10px] text-slate-500">{f.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Breakdown por Canais & Métodos de Pagamento */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" />
                <span>Conversão por Origem & Meio de Pagamento</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Desempenho comparativo por canal de aquisição.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Canais de Tráfego:
              </div>
              <div className="space-y-2">
                {[
                  { channel: 'Instagram (Link na Bio & Stories)', conversion: '5.4%', revenue: '48%' },
                  { channel: 'WhatsApp & Direct (Atendimento 1:1)', conversion: '11.8%', revenue: '26%' },
                  { channel: 'YouTube & Vídeos Longos', conversion: '4.2%', revenue: '16%' },
                  { channel: 'Rede de Afiliados', conversion: '3.8%', revenue: '10%' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-300">{c.channel}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-amber-400 font-bold">{c.conversion} conv.</span>
                      <span className="text-slate-400">{c.revenue} faturamento</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Meios de Pagamento Utilizados:
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-emerald-400 font-black font-mono">68%</div>
                  <div className="text-[11px] text-slate-300 font-medium">Pix Instantâneo</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-blue-400 font-black font-mono">24%</div>
                  <div className="text-[11px] text-slate-300 font-medium">Cartão Visa / Direct</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-indigo-400 font-black font-mono">8%</div>
                  <div className="text-[11px] text-slate-300 font-medium">PayPal & Stripe</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
