import React from 'react';
import {
  Filter,
  X,
  Layers,
  Share2,
  UserCheck,
  TrendingUp,
  DollarSign,
  Receipt,
  BookOpen,
  GraduationCap,
  FileCode,
  Users,
  Crown,
  Lock,
  Heart,
  Sparkles,
  Globe,
  ShoppingBag,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import { ProductCategoryFilter, OriginChannelFilter, UserSegmentFilter, Currency } from '../../types/monetization';
import {
  CATEGORY_OPTIONS,
  ORIGIN_OPTIONS,
  SEGMENT_OPTIONS,
} from '../../utils/transactionFilters';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface AdvancedFinancialFiltersCardProps {
  selectedCategory: ProductCategoryFilter;
  onSelectCategory: (cat: ProductCategoryFilter) => void;
  selectedOrigin: OriginChannelFilter;
  onSelectOrigin: (origin: OriginChannelFilter) => void;
  selectedSegment: UserSegmentFilter;
  onSelectSegment: (segment: UserSegmentFilter) => void;
  onResetFilters: () => void;
  filteredGross: number;
  filteredNet: number;
  filteredCount: number;
  filteredAvgTicket: number;
  totalGrossAll: number;
  currency: Currency;
  directGross: number;
  affiliateGross: number;
  subscriberGross: number;
  occasionalGross: number;
}

export const AdvancedFinancialFiltersCard: React.FC<AdvancedFinancialFiltersCardProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedOrigin,
  onSelectOrigin,
  selectedSegment,
  onSelectSegment,
  onResetFilters,
  filteredGross,
  filteredNet,
  filteredCount,
  filteredAvgTicket,
  totalGrossAll,
  currency,
  directGross,
  affiliateGross,
  subscriberGross,
  occasionalGross,
}) => {
  const isAnyFilterActive =
    selectedCategory !== 'all' || selectedOrigin !== 'all' || selectedSegment !== 'all';

  const filterSharePercent = totalGrossAll > 0 ? (filteredGross / totalGrossAll) * 100 : 0;

  const renderIcon = (name: string, className = 'w-3.5 h-3.5') => {
    switch (name) {
      case 'Layers':
        return <Layers className={className} />;
      case 'BookOpen':
        return <BookOpen className={className} />;
      case 'GraduationCap':
        return <GraduationCap className={className} />;
      case 'FileCode':
        return <FileCode className={className} />;
      case 'Users':
        return <Users className={className} />;
      case 'Crown':
        return <Crown className={className} />;
      case 'Lock':
        return <Lock className={className} />;
      case 'Heart':
        return <Heart className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Share2':
        return <Share2 className={className} />;
      case 'Globe':
        return <Globe className={className} />;
      case 'UserCheck':
        return <UserCheck className={className} />;
      case 'ShoppingBag':
        return <ShoppingBag className={className} />;
      default:
        return <Filter className={className} />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Filtros Avançados de Ganhos & Segmentação
              </h3>
              {isAnyFilterActive ? (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Filtros Personalizados Ativos</span>
                </span>
              ) : (
                <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-2 py-0.5 rounded-full border border-slate-700">
                  Visão Global Consolidada
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtre e audite receitas por categoria de produto, canal de aquisição e perfil do cliente.
            </p>
          </div>
        </div>

        {isAnyFilterActive && (
          <button
            type="button"
            onClick={onResetFilters}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-rose-500/20 text-xs font-semibold transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      {/* Dynamic Gains Summary Cards according to the active filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Faturamento Bruto Filtrado</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
          </span>
          <div className="text-base sm:text-lg font-black text-white font-mono">
            {formatCurrency(filteredGross, currency)}
          </div>
          <div className="text-[10px] text-slate-400">
            {filteredCount} transações aprovadas
          </div>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>Rendimento Líquido Filtrado</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
            {formatCurrency(filteredNet, currency)}
          </div>
          <div className="text-[10px] text-emerald-300/80">
            Taxas deduzidas: {formatCurrency(filteredGross - filteredNet, currency)}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Ticket Médio no Filtro</span>
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
            {formatCurrency(filteredAvgTicket, currency)}
          </div>
          <div className="text-[10px] text-slate-400">
            Média por conversão aprovada
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Participação nos Ganhos</span>
            <PieChart className="w-3.5 h-3.5 text-cyan-400" />
          </span>
          <div className="text-base sm:text-lg font-black text-cyan-400 font-mono">
            {formatPercentage(filterSharePercent)}
          </div>
          <div className="text-[10px] text-slate-400">
            Do total de {formatCurrency(totalGrossAll, currency)}
          </div>
        </div>
      </div>

      {/* FILTER DIMENSION 1: Categoria de Produto */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>1. Categoria de Produto:</span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {renderIcon(cat.iconName, 'w-3.5 h-3.5')}
                <span>{cat.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GRID: FILTER DIMENSION 2 & 3 (Canal de Origem e Segmento de Usuário) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1 border-t border-slate-800/60">
        {/* DIMENSION 2: Canal de Origem (Afiliados vs. Direto) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span>2. Canal de Origem:</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {ORIGIN_OPTIONS.find((o) => o.id === selectedOrigin)?.shortLabel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {ORIGIN_OPTIONS.map((org) => {
              const isSelected = selectedOrigin === org.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => onSelectOrigin(org.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-center ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25 ring-1 ring-sky-400'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {renderIcon(org.iconName, 'w-4 h-4 mb-1')}
                  <span className="text-[11px] leading-tight">{org.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Direct vs. Affiliate distribution bar */}
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-[10px] space-y-1">
            <div className="flex justify-between text-slate-400 font-mono">
              <span>Direto: {formatCurrency(directGross, currency)}</span>
              <span>Afiliados: {formatCurrency(affiliateGross, currency)}</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
              <div
                className="bg-sky-500 h-full transition-all"
                style={{
                  width: `${(directGross + affiliateGross) > 0 ? (directGross / (directGross + affiliateGross)) * 100 : 50}%`,
                }}
                title="Tráfego Direto"
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{
                  width: `${(directGross + affiliateGross) > 0 ? (affiliateGross / (directGross + affiliateGross)) * 100 : 50}%`,
                }}
                title="Afiliados"
              />
            </div>
          </div>
        </div>

        {/* DIMENSION 3: Segmento de Usuário (Assinantes vs. Compradores Ocasionais) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Segmento de Usuário:</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {SEGMENT_OPTIONS.find((s) => s.id === selectedSegment)?.shortLabel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {SEGMENT_OPTIONS.map((seg) => {
              const isSelected = selectedSegment === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => onSelectSegment(seg.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-center ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {renderIcon(seg.iconName, 'w-4 h-4 mb-1')}
                  <span className="text-[11px] leading-tight">{seg.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Subscriber vs Occasional distribution bar */}
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-[10px] space-y-1">
            <div className="flex justify-between text-slate-400 font-mono">
              <span>Assinantes VIP: {formatCurrency(subscriberGross, currency)}</span>
              <span>Ocasionais: {formatCurrency(occasionalGross, currency)}</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
              <div
                className="bg-indigo-500 h-full transition-all"
                style={{
                  width: `${(subscriberGross + occasionalGross) > 0 ? (subscriberGross / (subscriberGross + occasionalGross)) * 100 : 50}%`,
                }}
                title="Assinantes VIP"
              />
              <div
                className="bg-teal-500 h-full transition-all"
                style={{
                  width: `${(subscriberGross + occasionalGross) > 0 ? (occasionalGross / (subscriberGross + occasionalGross)) * 100 : 50}%`,
                }}
                title="Compradores Ocasionais"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
