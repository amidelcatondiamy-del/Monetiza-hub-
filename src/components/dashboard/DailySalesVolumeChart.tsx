import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import {
  CheckCircle2,
  Clock,
  BarChart3,
  Layers,
  Columns2,
  DollarSign,
  Hash,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Currency, Transaction } from '../../types/monetization';
import { convertFromBRL, formatCurrency, formatNumber } from '../../utils/formatters';
import {
  aggregateTransactionsForChart,
  ChartBucketDatum,
  ChartDateGranularity,
  ChartRevenueTypeFilter,
  getGranularityLabel,
  getRevenueTypeLabel,
} from '../../utils/chartAggregation';

interface DailySalesVolumeChartProps {
  transactions: Transaction[];
  currency: Currency;
  granularity?: ChartDateGranularity;
  onGranularityChange?: (granularity: ChartDateGranularity) => void;
  revenueType?: ChartRevenueTypeFilter;
  onRevenueTypeChange?: (revenueType: ChartRevenueTypeFilter) => void;
  onFilterByStatus?: (status: 'all' | 'approved' | 'pending') => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

type MetricMode = 'amount' | 'count';
type LayoutMode = 'stacked' | 'grouped';
type FocusFilter = 'both' | 'approved' | 'pending';

export const DailySalesVolumeChart: React.FC<DailySalesVolumeChartProps> = ({
  transactions,
  currency,
  granularity: controlledGranularity,
  onGranularityChange,
  revenueType: controlledRevenueType,
  onRevenueTypeChange,
  onFilterByStatus,
  isFocusMode = false,
  onToggleFocusMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(760);
  const [metricMode, setMetricMode] = useState<MetricMode>('amount');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('stacked');
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('both');
  const [internalGranularity, setInternalGranularity] =
    useState<ChartDateGranularity>('daily');
  const [internalRevenueType, setInternalRevenueType] =
    useState<ChartRevenueTypeFilter>('all');
  const [hoveredDatum, setHoveredDatum] = useState<{
    datum: ChartBucketDatum;
    xPos: number;
  } | null>(null);

  const granularity = controlledGranularity ?? internalGranularity;
  const revenueType = controlledRevenueType ?? internalRevenueType;

  const setGranularity = (next: ChartDateGranularity) => {
    if (onGranularityChange) onGranularityChange(next);
    else setInternalGranularity(next);
  };

  const setRevenueType = (next: ChartRevenueTypeFilter) => {
    if (onRevenueTypeChange) onRevenueTypeChange(next);
    else setInternalRevenueType(next);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const nextWidth = Math.max(320, Math.floor(el.clientWidth));
      setChartWidth(nextWidth);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { series, totals } = useMemo(
    () => aggregateTransactionsForChart(transactions, granularity, revenueType),
    [transactions, granularity, revenueType]
  );

  // D3 geometry & scales (expanded vertically in Modo Foco for detailed analysis)
  const chartHeight = isFocusMode ? 430 : 250;
  const margin = {
    top: 18,
    right: 16,
    bottom: 32,
    left: metricMode === 'amount' ? 66 : 42,
  };
  const innerWidth = Math.max(200, chartWidth - margin.left - margin.right);
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const getApprovedVal = (d: ChartBucketDatum) =>
    focusFilter === 'pending'
      ? 0
      : metricMode === 'amount'
      ? convertFromBRL(d.approvedAmount, currency)
      : d.approvedCount;

  const getPendingVal = (d: ChartBucketDatum) =>
    focusFilter === 'approved'
      ? 0
      : metricMode === 'amount'
      ? convertFromBRL(d.pendingAmount, currency)
      : d.pendingCount;

  const xScale = useMemo(
    () =>
      d3
        .scaleBand<string>()
        .domain(series.map((d) => d.bucketKey))
        .range([0, innerWidth])
        .paddingInner(granularity === 'daily' ? 0.24 : 0.28)
        .paddingOuter(0.08),
    [series, innerWidth, granularity]
  );

  const subGroupScale = useMemo(
    () =>
      d3
        .scaleBand<'approved' | 'pending'>()
        .domain(['approved', 'pending'])
        .range([0, xScale.bandwidth()])
        .padding(0.14),
    [xScale]
  );

  const maxY = useMemo(() => {
    const computedMax =
      d3.max(series, (d) => {
        const a = getApprovedVal(d);
        const p = getPendingVal(d);
        return layoutMode === 'stacked' ? a + p : Math.max(a, p);
      }) ?? 0;
    if (computedMax <= 0) {
      return metricMode === 'amount' ? 100 : 4;
    }
    return computedMax * 1.12;
  }, [series, layoutMode, metricMode, focusFilter, currency]);

  const yScale = useMemo(
    () => d3.scaleLinear().domain([0, maxY]).nice().range([innerHeight, 0]),
    [maxY, innerHeight]
  );

  const yTicks = useMemo(
    () => yScale.ticks(isFocusMode ? 6 : 4),
    [yScale, isFocusMode]
  );

  const xTickKeys = useMemo(() => {
    if (granularity === 'daily') {
      const step = isFocusMode && chartWidth >= 900 ? 2 : 5;
      return series
        .filter((_, idx) => idx % step === 0 || idx === series.length - 1)
        .map((d) => d.bucketKey);
    }
    if (granularity === 'weekly') {
      const step = isFocusMode || chartWidth >= 820 ? 1 : 2;
      return series
        .filter((_, idx) => idx % step === 0 || idx === series.length - 1)
        .map((d) => d.bucketKey);
    }
    return series
      .filter(
        (_, idx) =>
          isFocusMode || chartWidth >= 560 || idx % 2 === 0 || idx === series.length - 1
      )
      .map((d) => d.bucketKey);
  }, [series, granularity, chartWidth, isFocusMode]);

  const formatYAxisLabel = (val: number): string => {
    if (metricMode === 'count') {
      return Number.isInteger(val) ? String(val) : '';
    }
    if (val === 0) return '0';
    if (val >= 1000) {
      const k = val / 1000;
      return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return String(Math.round(val));
  };

  const hasAnySales = totals.totalCount > 0;

  const handleToggleFocus = (target: 'approved' | 'pending') => {
    setFocusFilter((prev) => (prev === target ? 'both' : target));
  };

  const chartTitle =
    granularity === 'weekly'
      ? 'Volume de Receita Semanal (12 Semanas)'
      : granularity === 'monthly'
      ? 'Volume de Receita Mensal (12 Meses)'
      : 'Volume de Vendas Diárias (Últimos 30 Dias)';

  const periodBadgeLabel =
    granularity === 'weekly'
      ? '12 sem'
      : granularity === 'monthly'
      ? '12m'
      : '30d';

  const bucketUnitPlural =
    granularity === 'weekly'
      ? 'semanas ativas'
      : granularity === 'monthly'
      ? 'meses ativos'
      : 'dias ativos';

  const tooltipTotalLabel =
    granularity === 'weekly'
      ? 'Total da semana'
      : granularity === 'monthly'
      ? 'Total do mês'
      : 'Total do dia';

  return (
    <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>{chartTitle}</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              D3 · {series[0]?.shortLabel} — {series[series.length - 1]?.shortLabel} ·{' '}
              {getRevenueTypeLabel(revenueType)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Comparativo entre transações concluídas e pendentes com agrupamento{' '}
            {getGranularityLabel(granularity).toLowerCase()}.
          </p>
        </div>

        {/* Interactive Chart Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Switcher: Valor vs Quantidade */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMetricMode('amount')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                metricMode === 'amount'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Volume ({currency})</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('count')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                metricMode === 'count'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="w-3.5 h-3.5 text-indigo-400" />
              <span>Qtd. Vendas</span>
            </button>
          </div>

          {/* Layout Switcher: Empilhado vs Lado a Lado */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setLayoutMode('stacked')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                layoutMode === 'stacked'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Empilhar transações concluídas e pendentes"
            >
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>Empilhado</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('grouped')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                layoutMode === 'grouped'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Exibir barras separadas lado a lado"
            >
              <Columns2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Lado a Lado</span>
            </button>
          </div>

          {onToggleFocusMode && (
            <button
              type="button"
              onClick={onToggleFocusMode}
              aria-pressed={isFocusMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                isFocusMode
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
              }`}
              title={
                isFocusMode
                  ? 'Sair do Modo Foco (Esc)'
                  : 'Expandir gráfico em tela inteira (Modo Foco)'
              }
            >
              {isFocusMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Sair do Modo Foco</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Modo Foco</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Inline Fallback Date & Revenue Filters when rendered standalone */}
      {(!onGranularityChange || !onRevenueTypeChange) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {!onGranularityChange && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'daily', label: 'Diário' },
                  { id: 'weekly', label: 'Semanal' },
                  { id: 'monthly', label: 'Mensal' },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGranularity(g.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    granularity === g.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {!onRevenueTypeChange && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'sales', label: 'Vendas' },
                  { id: 'tips', label: 'Tips' },
                  { id: 'subscriptions', label: 'Assinaturas' },
                ] as const
              ).map((rt) => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setRevenueType(rt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    revenueType === rt.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Strip + Interactive Status Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleToggleFocus('approved')}
          className={`text-left p-3.5 rounded-xl border transition cursor-pointer ${
            focusFilter === 'pending'
              ? 'bg-slate-950/60 border-slate-800/70 opacity-60'
              : 'bg-slate-950 border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2 font-semibold text-emerald-400">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block shrink-0" />
              <span>Concluídas ({periodBadgeLabel})</span>
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              {formatNumber(totals.approvedCount)}{' '}
              {totals.approvedCount === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <div className="mt-1.5 text-lg font-bold text-white font-mono tabular-nums">
            {formatCurrency(totals.approvedAmount, currency)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleToggleFocus('pending')}
          className={`text-left p-3.5 rounded-xl border transition cursor-pointer ${
            focusFilter === 'approved'
              ? 'bg-slate-950/60 border-slate-800/70 opacity-60'
              : 'bg-slate-950 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2 font-semibold text-amber-400">
              <span
                className="w-3 h-3 rounded-sm border border-amber-400 inline-block shrink-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(-45deg, rgba(245, 158, 11, 0.85), rgba(245, 158, 11, 0.85) 2px, rgba(120, 53, 15, 0.45) 2px, rgba(120, 53, 15, 0.45) 4px)',
                }}
              />
              <span>Pendentes ({periodBadgeLabel})</span>
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              {formatNumber(totals.pendingCount)}{' '}
              {totals.pendingCount === 1 ? 'pend.' : 'pends.'}
            </span>
          </div>
          <div className="mt-1.5 text-lg font-bold text-amber-300 font-mono tabular-nums">
            {formatCurrency(totals.pendingAmount, currency)}
          </div>
        </button>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">
              Total Movimentado ({periodBadgeLabel})
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              {totals.activeBuckets}/{series.length} {bucketUnitPlural}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold text-white font-mono tabular-nums">
              {formatCurrency(totals.totalAmount, currency)}
            </span>
            {onFilterByStatus && totals.pendingCount > 0 && (
              <button
                type="button"
                onClick={() => onFilterByStatus('pending')}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline cursor-pointer whitespace-nowrap"
              >
                Filtrar pendentes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* D3 SVG Bar Chart Container */}
      <div ref={containerRef} className="relative w-full select-none">
        {!hasAnySales ? (
          <div
            className={`${
              isFocusMode ? 'h-[430px]' : 'h-[250px]'
            } flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/60 text-center px-4`}
          >
            <BarChart3 className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">
              Nenhuma movimentação encontrada para {getRevenueTypeLabel(revenueType)} neste período
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Ajuste o agrupamento de data (diário, semanal ou mensal) ou selecione outro tipo de receita acima.
            </p>
          </div>
        ) : (
          <svg
            width={chartWidth}
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label={`Gráfico de barras D3 (${getGranularityLabel(granularity)}) filtrado por ${getRevenueTypeLabel(revenueType)}`}
            className="w-full overflow-visible"
            onMouseLeave={() => setHoveredDatum(null)}
          >
            <defs>
              <pattern
                id="pending-diagonal-hatch"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill="#d97706" fillOpacity="0.45" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#fbbf24" strokeWidth="2.4" />
              </pattern>
            </defs>

            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Horizontal Y gridlines & ticks */}
              {yTicks.map((tick) => {
                const y = yScale(tick);
                return (
                  <g key={`y-tick-${tick}`} transform={`translate(0, ${y})`}>
                    <line
                      x1={0}
                      x2={innerWidth}
                      y1={0}
                      y2={0}
                      stroke="#1e293b"
                      strokeDasharray={tick === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={-10}
                      y={3}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono tabular-nums"
                    >
                      {formatYAxisLabel(tick)}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Y axis baseline */}
              <line x1={0} x2={0} y1={0} y2={innerHeight} stroke="#1e293b" />

              {/* Period Bars */}
              {series.map((d) => {
                const bandX = xScale(d.bucketKey) ?? 0;
                const bandW = xScale.bandwidth();
                const approvedVal = getApprovedVal(d);
                const pendingVal = getPendingVal(d);
                const isHovered = hoveredDatum?.datum.bucketKey === d.bucketKey;

                let approvedX = bandX;
                let approvedW = bandW;
                let approvedY = yScale(approvedVal);
                let approvedH = Math.max(0, innerHeight - approvedY);

                let pendingX = bandX;
                let pendingW = bandW;
                let pendingY = yScale(pendingVal);
                let pendingH = Math.max(0, innerHeight - pendingY);

                if (layoutMode === 'stacked') {
                  const totalStackedY = yScale(approvedVal + pendingVal);
                  pendingY = totalStackedY;
                  pendingH = Math.max(0, approvedY - totalStackedY);
                  if (pendingVal > 0 && pendingH < 3) {
                    pendingH = 3;
                    pendingY = Math.max(0, approvedY - 3);
                  }
                } else {
                  const subA = subGroupScale('approved') ?? 0;
                  const subP = subGroupScale('pending') ?? bandW * 0.5;
                  const subW = Math.max(2, subGroupScale.bandwidth());
                  approvedX = bandX + subA;
                  approvedW = subW;
                  pendingX = bandX + subP;
                  pendingW = subW;
                }

                if (approvedVal > 0 && approvedH < 3) {
                  approvedH = 3;
                  approvedY = innerHeight - 3;
                }
                if (layoutMode === 'grouped' && pendingVal > 0 && pendingH < 3) {
                  pendingH = 3;
                  pendingY = innerHeight - 3;
                }

                return (
                  <g
                    key={d.bucketKey}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredDatum({
                        datum: d,
                        xPos: margin.left + bandX + bandW / 2,
                      })
                    }
                  >
                    <rect
                      x={bandX - 2}
                      y={0}
                      width={bandW + 4}
                      height={innerHeight}
                      rx={4}
                      fill={isHovered ? '#1e293b' : 'transparent'}
                      fillOpacity={isHovered ? 0.55 : 0}
                    />

                    {approvedVal === 0 && pendingVal === 0 && (
                      <line
                        x1={bandX + 1}
                        x2={bandX + bandW - 1}
                        y1={innerHeight - 1}
                        y2={innerHeight - 1}
                        stroke="#334155"
                        strokeWidth={1.5}
                      />
                    )}

                    {approvedVal > 0 && (
                      <rect
                        x={approvedX}
                        y={approvedY}
                        width={approvedW}
                        height={approvedH}
                        rx={layoutMode === 'stacked' && pendingVal > 0 ? 0 : 3}
                        fill={isHovered ? '#34d399' : '#10b981'}
                        className="transition-opacity duration-150"
                      />
                    )}

                    {pendingVal > 0 && (
                      <g>
                        <rect
                          x={pendingX}
                          y={pendingY}
                          width={pendingW}
                          height={pendingH}
                          rx={3}
                          fill="url(#pending-diagonal-hatch)"
                          stroke={isHovered ? '#fde68a' : '#fbbf24'}
                          strokeWidth={1.2}
                          strokeDasharray="3 2"
                        />
                      </g>
                    )}

                    <rect
                      x={bandX - 2}
                      y={0}
                      width={bandW + 4}
                      height={innerHeight}
                      fill="transparent"
                    />
                  </g>
                );
              })}

              {/* X Axis Date Ticks */}
              {xTickKeys.map((key) => {
                const datum = series.find((d) => d.bucketKey === key);
                if (!datum) return null;
                const cx = (xScale(key) ?? 0) + xScale.bandwidth() / 2;
                return (
                  <g key={`x-tick-${key}`} transform={`translate(${cx}, ${innerHeight})`}>
                    <line y1={0} y2={4} stroke="#334155" />
                    <text
                      y={17}
                      textAnchor="middle"
                      className="fill-slate-400 text-[10px] font-mono tabular-nums"
                    >
                      {datum.shortLabel}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Interactive D3 Hover Tooltip */}
        {hoveredDatum && (
          <div
            className="pointer-events-none absolute top-2 z-20 w-64 rounded-xl bg-slate-950 border border-slate-700 p-3 shadow-xl text-xs space-y-2"
            style={{
              left: `${Math.min(
                Math.max(8, hoveredDatum.xPos - 128),
                Math.max(8, chartWidth - 264)
              )}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-semibold text-white capitalize">
                {hoveredDatum.datum.fullDateLabel}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {hoveredDatum.datum.totalCount}{' '}
                {hoveredDatum.datum.totalCount === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Concluídas ({hoveredDatum.datum.approvedCount})</span>
                </span>
                <span className="font-mono font-bold text-white tabular-nums">
                  {formatCurrency(hoveredDatum.datum.approvedAmount, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Pendentes ({hoveredDatum.datum.pendingCount})</span>
                </span>
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  {formatCurrency(hoveredDatum.datum.pendingAmount, currency)}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{tooltipTotalLabel}</span>
              <span className="font-mono font-bold text-white tabular-nums">
                {formatCurrency(hoveredDatum.datum.totalAmount, currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Legend Note */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
            <span>Barra sólida verde: Transações Concluídas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm border border-amber-400 inline-block"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(-45deg, rgba(245, 158, 11, 0.85), rgba(245, 158, 11, 0.85) 2px, rgba(120, 53, 15, 0.45) 2px, rgba(120, 53, 15, 0.45) 4px)',
              }}
            />
            <span>Barra hachurada âmbar: Transações Pendentes</span>
          </span>
        </div>
        {focusFilter !== 'both' && (
          <button
            type="button"
            onClick={() => setFocusFilter('both')}
            className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
          >
            Mostrar todos os status
          </button>
        )}
      </div>
    </div>
  );
};
