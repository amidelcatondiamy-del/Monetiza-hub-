import React, { useState } from 'react';
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Sparkles,
  Edit2,
  Check,
  Zap,
  ArrowUpRight,
  Flame,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface DailyGoalCardProps {
  className?: string;
  compact?: boolean;
}

export const DailyGoalCard: React.FC<DailyGoalCardProps> = ({ className = '', compact = false }) => {
  const {
    dailyGoal,
    updateDailyGoalTarget,
    todayActualRevenue,
    selectedCurrency,
  } = useMonetization();

  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customValue, setCustomValue] = useState(dailyGoal.targetAmount.toString());
  const [activeHoverDay, setActiveHoverDay] = useState<number | null>(null);

  const percentToday = Math.round((todayActualRevenue / (dailyGoal.targetAmount || 1)) * 100);
  const isGoalReached = todayActualRevenue >= dailyGoal.targetAmount;
  const remainingToday = Math.max(0, dailyGoal.targetAmount - todayActualRevenue);

  const handleSelectPreset = (amount: number) => {
    updateDailyGoalTarget(amount);
    setIsEditingCustom(false);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customValue.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      updateDailyGoalTarget(val);
      setIsEditingCustom(false);
    }
  };

  // Compute maximum amount for scaling bar chart heights
  const maxBarValue = Math.max(
    dailyGoal.targetAmount * 1.3,
    ...dailyGoal.history.map((h) => Math.max(h.actualAmount, h.targetAmount)),
    100
  );

  return (
    <div
      className={`bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 hover:border-slate-700/80 transition-all shadow-xl shadow-black/20 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner ${
              isGoalReached
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {isGoalReached ? (
              <Flame className="w-5 h-5 animate-pulse text-emerald-400" />
            ) : (
              <Target className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Meta Diária de Faturamento</span>
              </h3>
              {isGoalReached ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Meta Atingida! 🎉
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {percentToday}% do objetivo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina metas de curto prazo e compare a receita real versus o objetivo diário
            </p>
          </div>
        </div>

        {/* Quick Goal Selector Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden lg:inline">
            Ajustar Meta:
          </span>
          {dailyGoal.presets.map((preset) => {
            const isSelected = dailyGoal.targetAmount === preset && !isEditingCustom;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-extrabold scale-105'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {formatCurrency(preset, selectedCurrency)}
              </button>
            );
          })}

          {/* Custom Input Trigger */}
          {isEditingCustom ? (
            <form onSubmit={handleSaveCustom} className="flex items-center gap-1">
              <input
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                autoFocus
                placeholder="R$..."
                className="w-20 px-2 py-1 text-xs bg-slate-950 border border-amber-500 rounded-lg text-white font-mono focus:outline-none"
              />
              <button
                type="submit"
                className="p-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                title="Salvar meta personalizada"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCustomValue(dailyGoal.targetAmount.toString());
                setIsEditingCustom(true);
              }}
              className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition cursor-pointer"
              title="Definir valor personalizado"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Today's Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {/* Metric 1: Receita Real Hoje */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/90">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Receita Real de Hoje</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-1 font-mono">
            {formatCurrency(todayActualRevenue, selectedCurrency)}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <span>{isGoalReached ? '✓ Meta superada com sucesso' : `+${percentToday}% em direção à meta`}</span>
          </div>
        </div>

        {/* Metric 2: Meta do Dia */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/90">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Meta Diária Definida</span>
            <Target className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-300 mt-1 font-mono">
            {formatCurrency(dailyGoal.targetAmount, selectedCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isGoalReached ? (
              <span className="text-emerald-400 font-bold">100% cumprida!</span>
            ) : (
              <span>Faltam <strong>{formatCurrency(remainingToday, selectedCurrency)}</strong></span>
            )}
          </div>
        </div>

        {/* Metric 3: Desempenho dos Últimos 7 Dias */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/90">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Aderência à Meta</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-1 font-mono">
            {dailyGoal.history.filter((h) => h.actualAmount >= dailyGoal.targetAmount).length} de {dailyGoal.history.length} dias
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Taxa de sucesso:{' '}
            <strong className="text-indigo-400 font-bold">
              {Math.round(
                (dailyGoal.history.filter((h) => h.actualAmount >= dailyGoal.targetAmount).length /
                  dailyGoal.history.length) *
                  100
              )}%
            </strong>
          </div>
        </div>
      </div>

      {/* Progress Bar for Today */}
      <div className="space-y-1.5 mb-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Progresso da Meta Hoje</span>
          <span className="font-mono font-bold text-white">
            {formatCurrency(todayActualRevenue, selectedCurrency)} / {formatCurrency(dailyGoal.targetAmount, selectedCurrency)} ({percentToday}%)
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isGoalReached
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500'
            }`}
            style={{ width: `${Math.min(100, percentToday)}%` }}
          />
        </div>
      </div>

      {/* Bar Chart: Receita Real vs Meta Diária across last 7 days */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Comparativo Diário: Receita Real vs Meta</span>
            <span className="text-[10px] text-slate-400">(Últimos 7 dias)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-slate-300">Receita Real</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 rounded-sm bg-amber-400" />
              <span className="text-slate-300">Meta ({formatCurrency(dailyGoal.targetAmount, selectedCurrency)})</span>
            </div>
          </div>
        </div>

        {/* Vertical Bars Container */}
        <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 pt-4 px-2 pb-1 relative">
          {/* Target benchmark dashed line */}
          <div
            className="absolute left-2 right-2 border-b-2 border-dashed border-amber-400/50 pointer-events-none z-10 flex items-center justify-end"
            style={{
              bottom: `${Math.min(92, Math.max(10, Math.round((dailyGoal.targetAmount / maxBarValue) * 100)))}%`,
            }}
          >
            <span className="text-[9px] font-mono font-bold bg-slate-900/90 text-amber-300 px-1 py-0.2 rounded border border-amber-500/40 -translate-y-1/2">
              Meta {formatCurrency(dailyGoal.targetAmount, selectedCurrency)}
            </span>
          </div>

          {dailyGoal.history.map((day, idx) => {
            const actual = idx === 0 ? todayActualRevenue : day.actualAmount;
            const reached = actual >= dailyGoal.targetAmount;
            const barHeightPct = Math.min(100, Math.max(14, Math.round((actual / maxBarValue) * 100)));
            const isHovered = activeHoverDay === idx;

            return (
              <div
                key={day.date}
                onMouseEnter={() => setActiveHoverDay(idx)}
                onMouseLeave={() => setActiveHoverDay(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
              >
                {/* Hover Tooltip Card */}
                {isHovered && (
                  <div className="absolute -top-14 z-30 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl shadow-xl text-center whitespace-nowrap pointer-events-none animate-fadeIn">
                    <div className="text-[10px] text-slate-400 font-bold">{day.dayLabel} ({day.date})</div>
                    <div className="text-xs font-mono font-extrabold text-white">
                      {formatCurrency(actual, selectedCurrency)}
                    </div>
                    <div className={`text-[9px] font-bold ${reached ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {reached ? '✓ Meta Atingida' : `Faltaram ${formatCurrency(dailyGoal.targetAmount - actual, selectedCurrency)}`}
                    </div>
                  </div>
                )}

                {/* Real Revenue Bar */}
                <div
                  className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 relative group-hover:brightness-110 ${
                    reached
                      ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20'
                      : 'bg-gradient-to-t from-slate-700 via-amber-600/70 to-amber-500'
                  }`}
                  style={{ height: `${barHeightPct}%` }}
                >
                  {/* Reached Crown / Check Icon on top of bar */}
                  {reached && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[9px] font-bold shadow-sm">
                      ✓
                    </div>
                  )}
                </div>

                {/* Day label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-[11px] font-bold block ${
                      idx === 0 ? 'text-amber-400 font-extrabold underline underline-offset-2' : 'text-slate-400'
                    }`}
                  >
                    {day.dayLabel}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 block">
                    {formatCurrency(actual, selectedCurrency, true)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
