import React, { useMemo, useState } from 'react';
import {
  Target,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wallet,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import {
  Currency,
  MonthlyRevenueBasis,
  MonthlyRevenueGoal,
  Transaction,
} from '../../types/monetization';
import {
  convertFromBRL,
  convertToBRL,
  CURRENCY_SYMBOLS,
  formatCurrency,
} from '../../utils/formatters';
import {
  computeMonthlyGoalProgress,
  computeMonthlyRevenueBreakdown,
  formatMonthKeyLabel,
  getBasisLabel,
  getCurrentMonthKey,
} from '../../utils/financialGoals';

interface FinancialGoalsCardProps {
  transactions: Transaction[];
  currency: Currency;
  currentBalance?: number;
}

const TARGET_PRESETS_BRL = [5000, 10000, 20000, 50000];

export const FinancialGoalsCard: React.FC<FinancialGoalsCardProps> = ({
  transactions,
  currency,
  currentBalance,
}) => {
  const {
    monthlyFinancialGoals,
    upsertMonthlyFinancialGoal,
    deleteMonthlyFinancialGoal,
    availableBalance,
  } = useMonetization();

  const effectiveBalance =
    typeof currentBalance === 'number' ? currentBalance : availableBalance;

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingGoalId, setEditingGoalId] = useState<string | undefined>(undefined);

  // Form states
  const [formTitle, setFormTitle] = useState<string>('Meta Mensal de Receita Total');
  const [formMonthKey, setFormMonthKey] = useState<string>(currentMonthKey);
  const [formTargetDisplay, setFormTargetDisplay] = useState<string>('10000');
  const [formBasis, setFormBasis] = useState<MonthlyRevenueBasis>('gross');
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || 'R$';

  const breakdownByMonth = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof computeMonthlyRevenueBreakdown>>();
    const keys = new Set<string>([
      selectedMonthKey,
      ...monthlyFinancialGoals.map((g) => g.monthKey),
    ]);
    keys.forEach((mk) => {
      cache.set(mk, computeMonthlyRevenueBreakdown(transactions, mk));
    });
    return cache;
  }, [transactions, monthlyFinancialGoals, selectedMonthKey]);

  const monthGoals = useMemo(
    () => monthlyFinancialGoals.filter((g) => g.monthKey === selectedMonthKey),
    [monthlyFinancialGoals, selectedMonthKey]
  );

  const primaryGoal: MonthlyRevenueGoal | null =
    monthGoals[0] || monthlyFinancialGoals[0] || null;

  const activeBreakdown =
    breakdownByMonth.get(primaryGoal?.monthKey || selectedMonthKey) ||
    computeMonthlyRevenueBreakdown(
      transactions,
      primaryGoal?.monthKey || selectedMonthKey
    );

  const primaryProgress = useMemo(() => {
    if (!primaryGoal) return null;
    return computeMonthlyGoalProgress(
      primaryGoal,
      activeBreakdown,
      new Date(),
      effectiveBalance
    );
  }, [primaryGoal, activeBreakdown, effectiveBalance]);

  const allGoalsProgress = useMemo(() => {
    return monthlyFinancialGoals
      .map((goal) => {
        const bd =
          breakdownByMonth.get(goal.monthKey) ||
          computeMonthlyRevenueBreakdown(transactions, goal.monthKey);
        return computeMonthlyGoalProgress(goal, bd, new Date(), effectiveBalance);
      })
      .sort((a, b) => b.goal.monthKey.localeCompare(a.goal.monthKey));
  }, [monthlyFinancialGoals, breakdownByMonth, transactions, effectiveBalance]);

  const balanceTarget = primaryProgress ? primaryProgress.targetAmount : 10000;
  const balanceRawPercent = Number(
    ((Math.max(0, effectiveBalance) / Math.max(1, balanceTarget)) * 100).toFixed(1)
  );
  const balanceProgressPercent = Math.min(100, Math.max(0, balanceRawPercent));
  const balanceRemaining = Math.max(0, balanceTarget - effectiveBalance);
  const balanceSurplus = Math.max(0, effectiveBalance - balanceTarget);

  const openCreateForm = () => {
    setEditingGoalId(undefined);
    setFormTitle(`Meta de Arrecadação — ${formatMonthKeyLabel(selectedMonthKey)}`);
    setFormMonthKey(selectedMonthKey);
    const defaultInCurrency = convertFromBRL(10000, currency);
    setFormTargetDisplay(String(Math.round(defaultInCurrency)));
    setFormBasis('balance');
    setIsFormOpen(true);
  };

  const openEditForm = (goal: MonthlyRevenueGoal) => {
    setEditingGoalId(goal.id);
    setFormTitle(goal.title);
    setFormMonthKey(goal.monthKey);
    const converted = convertFromBRL(goal.targetAmount, currency);
    setFormTargetDisplay(String(Math.round(converted * 100) / 100));
    setFormBasis(goal.basis);
    setIsFormOpen(true);
  };

  const handleSwitchBasis = (nextBasis: MonthlyRevenueBasis) => {
    if (primaryGoal) {
      upsertMonthlyFinancialGoal({
        id: primaryGoal.id,
        monthKey: primaryGoal.monthKey,
        title: primaryGoal.title,
        targetAmount: primaryGoal.targetAmount,
        basis: nextBasis,
      });
      setSavedFeedback(`Comparativo alterado para ${getBasisLabel(nextBasis)}.`);
      setTimeout(() => setSavedFeedback(null), 2800);
    } else {
      upsertMonthlyFinancialGoal({
        monthKey: selectedMonthKey,
        title: `Meta de Arrecadação — ${formatMonthKeyLabel(selectedMonthKey)}`,
        targetAmount: 10000,
        basis: nextBasis,
      });
    }
  };

  const handleQuickPreset = (presetBRL: number) => {
    if (primaryGoal) {
      upsertMonthlyFinancialGoal({
        id: primaryGoal.id,
        monthKey: primaryGoal.monthKey,
        title: primaryGoal.title,
        targetAmount: presetBRL,
        basis: primaryGoal.basis,
      });
      setSavedFeedback(
        `Meta ajustada para ${formatCurrency(presetBRL, currency, true)}.`
      );
      setTimeout(() => setSavedFeedback(null), 3000);
    } else {
      upsertMonthlyFinancialGoal({
        monthKey: selectedMonthKey,
        title: `Meta de Receita — ${formatMonthKeyLabel(selectedMonthKey)}`,
        targetAmount: presetBRL,
        basis: 'gross',
      });
      setSavedFeedback(
        `Meta criada em ${formatCurrency(presetBRL, currency, true)}.`
      );
      setTimeout(() => setSavedFeedback(null), 3000);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDisplay = parseFloat(formTargetDisplay.replace(',', '.'));
    if (Number.isNaN(parsedDisplay) || parsedDisplay <= 0) return;

    const targetBRL = convertToBRL(parsedDisplay, currency);
    const saved = upsertMonthlyFinancialGoal({
      id: editingGoalId,
      monthKey: formMonthKey || selectedMonthKey,
      title: formTitle.trim() || `Meta — ${formatMonthKeyLabel(formMonthKey)}`,
      targetAmount: Math.max(100, targetBRL),
      basis: formBasis,
    });
    setSelectedMonthKey(saved.monthKey);
    setIsFormOpen(false);
    setEditingGoalId(undefined);
    setSavedFeedback(`Meta "${saved.title}" salva com sucesso.`);
    setTimeout(() => setSavedFeedback(null), 3500);
  };

  const renderStatusIcon = (
    statusLabel: 'Meta Atingida' | 'No Ritmo' | 'Atenção ao Ritmo' | 'Mês Encerrado'
  ) => {
    if (statusLabel === 'Meta Atingida') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (statusLabel === 'Atenção ao Ritmo') {
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (statusLabel === 'Mês Encerrado') {
      return <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
    return <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  };

  return (
    <section
      id="metas-financeiras-section"
      aria-labelledby="metas-financeiras-heading"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden"
    >
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="metas-financeiras-heading"
              className="text-base font-bold text-white tracking-tight"
            >
              Metas Financeiras
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina objetivos mensais de arrecadação e acompanhe o progresso visual do seu saldo atual e faturamento versus a meta definida.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 whitespace-nowrap">Mês:</span>
            <input
              type="month"
              aria-label="Selecionar mês de competência da meta"
              value={selectedMonthKey}
              onChange={(e) => {
                if (e.target.value) setSelectedMonthKey(e.target.value);
              }}
              className="bg-transparent text-white font-mono focus:outline-none cursor-pointer"
            />
          </label>

          <button
            type="button"
            onClick={openCreateForm}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Definir Meta Mensal</span>
          </button>
        </div>
      </div>

      {/* Save Confirmation Banner */}
      {savedFeedback && (
        <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedFeedback}</span>
        </div>
      )}

      {/* Expandable Form to Define / Edit Monthly Revenue Goal */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmitForm}
          className="p-6 border-b border-slate-800 bg-slate-950/60 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {editingGoalId ? 'Editar Meta Mensal de Receita' : 'Nova Meta Mensal de Receita'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingGoalId(undefined);
              }}
              aria-label="Fechar formulário de meta"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Descrição da Meta
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Receita Global de Novembro"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Mês de Competência
              </label>
              <input
                type="month"
                required
                value={formMonthKey}
                onChange={(e) => setFormMonthKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Base de Cálculo
              </label>
              <select
                value={formBasis}
                onChange={(e) => setFormBasis(e.target.value as MonthlyRevenueBasis)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="balance">Saldo Atual Disponível</option>
                <option value="gross">Receita Bruta do Mês</option>
                <option value="net">Receita Líquida do Mês</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="w-full sm:w-64">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Valor Alvo Mensal ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={formTargetDisplay}
                  onChange={(e) => setFormTargetDisplay(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingGoalId(undefined);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Meta</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Primary Active Month Goal Progress View */}
      {primaryProgress ? (
        <div className="p-6 space-y-5">
          {/* Top Title & Quick Target Presets */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{formatMonthKeyLabel(primaryProgress.goal.monthKey)}</span>
                <span aria-hidden="true">·</span>
                <span>{getBasisLabel(primaryProgress.goal.basis)}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                  {renderStatusIcon(primaryProgress.statusLabel)}
                  <span>{primaryProgress.statusLabel}</span>
                </span>
              </div>
              <h4 className="text-lg font-bold text-white tracking-tight mt-0.5">
                {primaryProgress.goal.title}
              </h4>
            </div>

            {/* Quick Presets Bar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 mr-1">Ajuste rápido:</span>
              {TARGET_PRESETS_BRL.map((presetBRL) => {
                const isActive = Math.abs(primaryProgress.targetAmount - presetBRL) < 1;
                return (
                  <button
                    key={presetBRL}
                    type="button"
                    onClick={() => handleQuickPreset(presetBRL)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {formatCurrency(presetBRL, currency, true)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => openEditForm(primaryProgress.goal)}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
                title="Editar valor ou título da meta"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Basis Selector & Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'balance', label: 'Saldo Atual' },
                  { id: 'gross', label: 'Receita Bruta' },
                  { id: 'net', label: 'Receita Líquida' },
                ] as Array<{ id: MonthlyRevenueBasis; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSwitchBasis(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                    primaryProgress.goal.basis === opt.id
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Comparando <strong className="text-white">{getBasisLabel(primaryProgress.goal.basis)}</strong> vs. Meta Definida
            </span>
          </div>

          {/* 4-Column Metric Row (Hairline Divided) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/50">
            <div className="p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {primaryProgress.goal.basis === 'balance'
                  ? 'Saldo Atual Disponível'
                  : 'Receita Realizada no Mês'}
              </span>
              <div className="mt-1.5 text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
                {formatCurrency(primaryProgress.actualAmount, currency, true)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                {primaryProgress.goal.basis === 'balance'
                  ? `Receita no mês: ${formatCurrency(activeBreakdown.grossTotal, currency, true)}`
                  : `${activeBreakdown.approvedCount} transações aprovadas`}
              </div>
            </div>

            <div className="p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Meta Mensal Definida
              </span>
              <div className="mt-1.5 text-xl font-extrabold text-white font-mono tabular-nums">
                {formatCurrency(primaryProgress.targetAmount, currency, true)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Base: {getBasisLabel(primaryProgress.goal.basis)}
              </div>
            </div>

            <div className="p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {primaryProgress.isReached ? 'Excedente Acima da Meta' : 'Falta para Atingir'}
              </span>
              <div
                className={`mt-1.5 text-xl font-extrabold font-mono tabular-nums ${
                  primaryProgress.isReached ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {primaryProgress.isReached
                  ? `+ ${formatCurrency(primaryProgress.surplusAmount, currency, true)}`
                  : formatCurrency(primaryProgress.remainingAmount, currency, true)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                {primaryProgress.daysRemaining} dias restantes no mês
              </div>
            </div>

            <div className="p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Ritmo Diário Necessário
              </span>
              <div className="mt-1.5 text-xl font-extrabold text-slate-100 font-mono tabular-nums">
                {primaryProgress.isReached
                  ? formatCurrency(0, currency, true)
                  : `${formatCurrency(primaryProgress.requiredDailyPace, currency, true)}/dia`}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                Progresso esperado hoje: {primaryProgress.expectedPacePercent.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Main Fill Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-white font-mono tabular-nums">
                  {primaryProgress.rawPercent.toFixed(1).replace('.', ',')}%
                </span>
                <span className="text-slate-400">
                  da meta mensal preenchida
                </span>
              </div>
              <span className="font-mono tabular-nums text-slate-300">
                {formatCurrency(primaryProgress.actualAmount, currency, true)} /{' '}
                {formatCurrency(primaryProgress.targetAmount, currency, true)}
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={Math.round(primaryProgress.progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso da meta ${primaryProgress.goal.title}`}
              className="relative h-4 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5"
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  primaryProgress.isReached
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                }`}
                style={{ width: `${primaryProgress.progressPercent}%` }}
              />
            </div>

            {/* Milestone Markers */}
            <div className="grid grid-cols-4 text-[11px] font-mono tabular-nums text-slate-500 pt-0.5">
              {[25, 50, 75, 100].map((mark) => {
                const reached = primaryProgress.rawPercent >= mark;
                return (
                  <div
                    key={mark}
                    className={`${
                      mark === 100 ? 'text-right' : mark === 25 ? 'text-left' : 'text-center'
                    } ${reached ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}
                  >
                    {mark}% {reached ? '✓' : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explicit Saldo Atual vs. Meta Mensal Visual Comparison Strip (when primary basis is Gross/Net) */}
          {primaryProgress.goal.basis !== 'balance' && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-white">
                    Progresso do Saldo Atual vs. Meta Definida
                  </span>
                </div>
                <span className="font-mono tabular-nums text-slate-300">
                  <strong className="text-emerald-400">
                    {formatCurrency(effectiveBalance, currency, true)}
                  </strong>{' '}
                  / {formatCurrency(balanceTarget, currency, true)} ({balanceRawPercent.toFixed(1).replace('.', ',')}%)
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(balanceProgressPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso do saldo atual versus meta mensal definida"
                className="relative h-2.5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden"
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    balanceRawPercent >= 100
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                  }`}
                  style={{ width: `${balanceProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>
                  {balanceSurplus > 0
                    ? `Meta superada em +${formatCurrency(balanceSurplus, currency, true)}`
                    : `Faltam ${formatCurrency(balanceRemaining, currency, true)} no saldo atual`}
                </span>
                <button
                  type="button"
                  onClick={() => handleSwitchBasis('balance')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold transition cursor-pointer"
                >
                  Usar Saldo Atual como métrica principal →
                </button>
              </div>
            </div>
          )}

          {/* Monthly Channel Composition */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center justify-between sm:block">
              <span className="text-slate-400 block">Produtos Digitais no Mês</span>
              <span className="font-mono font-bold text-white tabular-nums mt-0.5 block">
                {formatCurrency(activeBreakdown.productsGross, currency, true)}
              </span>
            </div>
            <div className="flex items-center justify-between sm:block">
              <span className="text-slate-400 block">Assinaturas no Mês</span>
              <span className="font-mono font-bold text-white tabular-nums mt-0.5 block">
                {formatCurrency(activeBreakdown.subscriptionsGross, currency, true)}
              </span>
            </div>
            <div className="flex items-center justify-between sm:block">
              <span className="text-slate-400 block">Tips, Paywall & In-App</span>
              <span className="font-mono font-bold text-white tabular-nums mt-0.5 block">
                {formatCurrency(activeBreakdown.tipsAndPaywallGross, currency, true)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-400 space-y-3">
          <p>Nenhuma meta mensal de receita configurada ainda.</p>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Definir Primeira Meta Mensal</span>
          </button>
        </div>
      )}

      {/* List of All Defined Monthly Financial Goals */}
      {allGoalsProgress.length > 0 && (
        <div className="border-t border-slate-800">
          <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Metas Mensais Configuradas ({allGoalsProgress.length})</span>
            <span>Progresso & Preenchimento</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {allGoalsProgress.map((item) => {
              const isSelected = primaryProgress?.goal.id === item.goal.id;
              return (
                <div
                  key={item.goal.id}
                  className={`px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                    isSelected ? 'bg-slate-950/60' : 'hover:bg-slate-950/30'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedMonthKey(item.goal.monthKey)}
                        className="font-semibold text-white hover:text-emerald-400 transition truncate text-left cursor-pointer"
                      >
                        {item.goal.title}
                      </button>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400 font-mono whitespace-nowrap">
                        {formatMonthKeyLabel(item.goal.monthKey)}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400 whitespace-nowrap">
                        {getBasisLabel(item.goal.basis)}
                      </span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden max-w-md">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.isReached ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {item.rawPercent.toFixed(1).replace('.', ',')}% (
                        {formatCurrency(item.actualAmount, currency, true)} /{' '}
                        {formatCurrency(item.targetAmount, currency, true)})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 mr-2">
                      {renderStatusIcon(item.statusLabel)}
                      <span>{item.statusLabel}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditForm(item.goal)}
                      aria-label={`Editar ${item.goal.title}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {allGoalsProgress.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteMonthlyFinancialGoal(item.goal.id)}
                        aria-label={`Remover ${item.goal.title}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
