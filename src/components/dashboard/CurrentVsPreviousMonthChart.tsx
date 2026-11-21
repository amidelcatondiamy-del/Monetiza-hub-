import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart2,
  DollarSign,
  ShoppingBag,
  Users,
  Sparkles,
  Heart,
  ChevronRight,
  Info,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';
import { Currency } from '../../types/monetization';

interface ComparisonDimension {
  id: string;
  label: string;
  category: 'revenue' | 'volume';
  prevMonthValue: number;
  currMonthValue: number;
  unit: string;
  description: string;
  colorPrev: string;
  colorCurr: string;
}

interface CurrentVsPreviousMonthChartProps {
  currency: Currency;
  onOpenInAppPurchases?: () => void;
  onOpenAppSubscription?: () => void;
}

export const CurrentVsPreviousMonthChart: React.FC<CurrentVsPreviousMonthChartProps> = ({
  currency,
  onOpenInAppPurchases,
  onOpenAppSubscription,
}) => {
  const [viewMode, setViewMode] = useState<'financial' | 'volume'>('financial');
  const [hoveredDimensionId, setHoveredDimensionId] = useState<string | null>(null);

  // Financial comparative data (Outubro vs. Novembro 2026)
  const financialDimensions: ComparisonDimension[] = [
    {
      id: 'total_revenue',
      label: 'Faturamento Bruto Total',
      category: 'revenue',
      prevMonthValue: 16800,
      currMonthValue: 21950,
      unit: 'currency',
      description: 'Crescimento consolidado de todas as fontes de monetização.',
      colorPrev: '#475569',
      colorCurr: '#10b981',
    },
    {
      id: 'digital_products',
      label: 'Produtos Digitais & Cursos',
      category: 'revenue',
      prevMonthValue: 10420,
      currMonthValue: 13680,
      unit: 'currency',
      description: 'Vendas de e-books, templates Notion e masterclasses avulsas.',
      colorPrev: '#475569',
      colorCurr: '#3b82f6',
    },
    {
      id: 'subscriptions_mrr',
      label: 'Assinaturas VIP (MRR)',
      category: 'revenue',
      prevMonthValue: 2450,
      currMonthValue: 3890,
      unit: 'currency',
      description: 'Receita recorrente gerada pelos membros do clube VIP.',
      colorPrev: '#475569',
      colorCurr: '#6366f1',
    },
    {
      id: 'in_app_purchases',
      label: 'Compras no Aplicativo (In-App)',
      category: 'revenue',
      prevMonthValue: 890,
      currMonthValue: 1480,
      unit: 'currency',
      description: 'Upgrades de produtividade, acelerador Visa/Express e selos VIP.',
      colorPrev: '#475569',
      colorCurr: '#f59e0b',
    },
    {
      id: 'in_app_ads',
      label: 'Anúncios In-App (eCPM / Ads)',
      category: 'revenue',
      prevMonthValue: 420,
      currMonthValue: 680,
      unit: 'currency',
      description: 'Receita de banners nativos e anúncios premiados assistidos.',
      colorPrev: '#475569',
      colorCurr: '#ec4899',
    },
    {
      id: 'tips_pix',
      label: 'Apoios & Gorjetas Pix',
      category: 'revenue',
      prevMonthValue: 1250,
      currMonthValue: 1740,
      unit: 'currency',
      description: 'Doações voluntárias da comunidade de seguidores.',
      colorPrev: '#475569',
      colorCurr: '#14b8a6',
    },
  ];

  // Volume comparative data (quantidade de transações / usuários)
  const volumeDimensions: ComparisonDimension[] = [
    {
      id: 'total_orders',
      label: 'Total de Compras & Pedidos',
      category: 'volume',
      prevMonthValue: 142,
      currMonthValue: 189,
      unit: 'pedidos',
      description: 'Transações de compras avulsas e pacotes aprovados.',
      colorPrev: '#475569',
      colorCurr: '#10b981',
    },
    {
      id: 'active_subscribers',
      label: 'Assinantes VIP Ativos',
      category: 'volume',
      prevMonthValue: 24,
      currMonthValue: 38,
      unit: 'membros',
      description: 'Membros pagantes recorrentes com assinatura ativa.',
      colorPrev: '#475569',
      colorCurr: '#6366f1',
    },
    {
      id: 'in_app_upgrades',
      label: 'Upgrades In-App Comprados',
      category: 'volume',
      prevMonthValue: 19,
      currMonthValue: 34,
      unit: 'compras',
      description: 'Recursos virtuais e complementos adquiridos dentro do app.',
      colorPrev: '#475569',
      colorCurr: '#f59e0b',
    },
    {
      id: 'paying_users',
      label: 'Total de Usuários Pagantes',
      category: 'volume',
      prevMonthValue: 156,
      currMonthValue: 218,
      unit: 'clientes',
      description: 'Clientes únicos que efetuaram pagamentos no período.',
      colorPrev: '#475569',
      colorCurr: '#3b82f6',
    },
    {
      id: 'arpu_value',
      label: 'ARPU (Receita / Visitante)',
      category: 'volume',
      prevMonthValue: 1.47,
      currMonthValue: 1.55,
      unit: 'R$',
      description: 'Receita média gerada por cada visitante único da vitrine.',
      colorPrev: '#475569',
      colorCurr: '#8b5cf6',
    },
  ];

  const activeDimensions = viewMode === 'financial' ? financialDimensions : volumeDimensions;

  // Max value for bar proportion scaling
  const maxBarValue = Math.max(
    ...activeDimensions.map((d) => Math.max(d.prevMonthValue, d.currMonthValue)),
    1
  );

  // Overall totals comparison
  const totalPrevRevenue = financialDimensions[0].prevMonthValue;
  const totalCurrRevenue = financialDimensions[0].currMonthValue;
  const revenueGrowthPct = ((totalCurrRevenue - totalPrevRevenue) / totalPrevRevenue) * 100;
  const absoluteGrowth = totalCurrRevenue - totalPrevRevenue;

  return (
    <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BarChart2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Gráfico Comparativo: Mês Atual vs. Mês Anterior
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+{revenueGrowthPct.toFixed(1)}% de Expansão</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Outubro 2026 (Mês Anterior) vs. Novembro 2026 (Mês Atual em Andamento).
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('financial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'financial'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Receita (R$)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('volume')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'volume'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Volume & Compras</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Summary Delta Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded bg-slate-600 shrink-0" />
          <div>
            <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
              Mês Anterior (Outubro 2026)
            </div>
            <div className="font-mono font-bold text-slate-300 text-sm">
              {formatCurrency(totalPrevRevenue, currency)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-sm shadow-emerald-500/50 shrink-0" />
          <div>
            <div className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wider">
              Mês Atual (Novembro 2026)
            </div>
            <div className="font-mono font-bold text-white text-sm">
              {formatCurrency(totalCurrRevenue, currency)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2 text-right">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
              Ganho Adicional Líquido
            </div>
            <div className="font-mono font-black text-emerald-400 text-sm flex items-center justify-end gap-1">
              <ArrowUpRight className="w-4 h-4" />
              <span>+{formatCurrency(absoluteGrowth, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Comparative Bar Chart */}
      <div className="space-y-4 pt-2">
        {activeDimensions.map((dim) => {
          const delta = dim.currMonthValue - dim.prevMonthValue;
          const deltaPct = dim.prevMonthValue > 0 ? (delta / dim.prevMonthValue) * 100 : 100;
          const isPositive = delta >= 0;

          const pctPrev = Math.max(4, Math.round((dim.prevMonthValue / maxBarValue) * 100));
          const pctCurr = Math.max(4, Math.round((dim.currMonthValue / maxBarValue) * 100));

          const formatVal = (v: number) => {
            if (dim.unit === 'currency' || dim.unit === 'R$') {
              return formatCurrency(v, currency);
            }
            return `${formatNumber(v)} ${dim.unit}`;
          };

          const isHovered = hoveredDimensionId === dim.id;

          return (
            <div
              key={dim.id}
              onMouseEnter={() => setHoveredDimensionId(dim.id)}
              onMouseLeave={() => setHoveredDimensionId(null)}
              className={`p-3.5 rounded-2xl border transition relative ${
                isHovered
                  ? 'bg-slate-950/80 border-slate-700 shadow-md'
                  : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-800'
              }`}
            >
              {/* Row Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs sm:text-sm">
                    {dim.label}
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline-block">
                    • {dim.description}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs self-start sm:self-auto">
                  <span
                    className={`font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] ${
                      isPositive
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                    }`}
                  >
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{isPositive ? '+' : ''}{deltaPct.toFixed(1)}%</span>
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    ({isPositive ? '+' : ''}{formatVal(delta)})
                  </span>
                </div>
              </div>

              {/* Grouped Bars Container */}
              <div className="space-y-1.5 pt-1">
                {/* Previous Month Bar (Outubro) */}
                <div className="flex items-center gap-3">
                  <span className="w-20 text-[10px] font-mono text-slate-400 text-right shrink-0">
                    Mês Anterior
                  </span>
                  <div className="flex-1 bg-slate-900 h-4 rounded-md overflow-hidden relative border border-slate-800/80">
                    <div
                      className="bg-slate-600 h-full rounded-md transition-all duration-500"
                      style={{ width: `${pctPrev}%` }}
                    />
                  </div>
                  <span className="w-24 text-[11px] font-mono font-semibold text-slate-400 text-right shrink-0">
                    {formatVal(dim.prevMonthValue)}
                  </span>
                </div>

                {/* Current Month Bar (Novembro) */}
                <div className="flex items-center gap-3">
                  <span className="w-20 text-[10px] font-mono font-bold text-emerald-400 text-right shrink-0">
                    Mês Atual
                  </span>
                  <div className="flex-1 bg-slate-900 h-4 rounded-md overflow-hidden relative border border-slate-800/80">
                    <div
                      className="h-full rounded-md transition-all duration-500 shadow-sm"
                      style={{
                        width: `${pctCurr}%`,
                        backgroundColor: dim.colorCurr,
                      }}
                    />
                  </div>
                  <span className="w-24 text-[11px] font-mono font-black text-white text-right shrink-0">
                    {formatVal(dim.currMonthValue)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Strategic Growth Takeaways */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
            <Users className="w-4 h-4" />
            <span>Maior Aceleração: Assinaturas</span>
          </div>
          <p className="text-slate-300 text-[11px]">
            As assinaturas recorrentes cresceram <strong>+58.8%</strong>, adicionando mais estabilidade e previsibilidade de fluxo de caixa (MRR).
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
            <Sparkles className="w-4 h-4" />
            <span>Compras In-App & Upgrades</span>
          </div>
          <p className="text-slate-300 text-[11px]">
            A venda de recursos virtuais subiu <strong>+66.3%</strong>, impulsionada pelo acelerador de liquidação instantânea Visa & Express.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Projeção para o Fim do Mês</span>
          </div>
          <p className="text-slate-300 text-[11px]">
            Com a velocidade diária atual, a projeção aponta para <strong>{formatCurrency(26400, currency)}</strong> ao término do ciclo mensal.
          </p>
        </div>
      </div>
    </div>
  );
};
