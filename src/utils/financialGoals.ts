import {
  MonthlyRevenueBasis,
  MonthlyRevenueGoal,
  Transaction,
} from '../types/monetization';

export interface MonthlyRevenueBreakdown {
  monthKey: string;
  approvedCount: number;
  grossTotal: number;
  netTotal: number;
  productsGross: number;
  subscriptionsGross: number;
  tipsAndPaywallGross: number;
}

export interface MonthlyGoalProgress {
  goal: MonthlyRevenueGoal;
  actualAmount: number;
  targetAmount: number;
  progressPercent: number; // clamped 0..100 for progress bar fill
  rawPercent: number; // uncapped % (e.g. 124.5%)
  remainingAmount: number;
  surplusAmount: number;
  isReached: boolean;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  expectedPacePercent: number;
  requiredDailyPace: number;
  statusLabel: 'Meta Atingida' | 'No Ritmo' | 'Atenção ao Ritmo' | 'Mês Encerrado';
}

const MONTH_LABELS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatMonthKeyLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  if (
    Number.isNaN(year) ||
    Number.isNaN(monthIdx) ||
    monthIdx < 0 ||
    monthIdx > 11
  ) {
    return monthKey;
  }
  return `${MONTH_LABELS_PT[monthIdx]} de ${year}`;
}

export function getCurrentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function computeMonthlyRevenueBreakdown(
  transactions: Transaction[],
  monthKey: string
): MonthlyRevenueBreakdown {
  const [targetYearStr, targetMonthStr] = monthKey.split('-');
  const targetYear = Number(targetYearStr);
  const targetMonthIdx = Number(targetMonthStr) - 1;

  let approvedCount = 0;
  let grossTotal = 0;
  let netTotal = 0;
  let productsGross = 0;
  let subscriptionsGross = 0;
  let tipsAndPaywallGross = 0;

  for (const tx of transactions) {
    if (tx.status !== 'approved') continue;
    const d = new Date(tx.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() !== targetYear || d.getMonth() !== targetMonthIdx) {
      continue;
    }

    approvedCount += 1;
    const gross = Number(tx.grossAmount) || 0;
    const net = Number(tx.netAmount) || 0;
    grossTotal += gross;
    netTotal += net;

    if (tx.type === 'product_sale') {
      productsGross += gross;
    } else if (tx.type === 'subscription') {
      subscriptionsGross += gross;
    } else {
      tipsAndPaywallGross += gross;
    }
  }

  return {
    monthKey,
    approvedCount,
    grossTotal: Number(grossTotal.toFixed(2)),
    netTotal: Number(netTotal.toFixed(2)),
    productsGross: Number(productsGross.toFixed(2)),
    subscriptionsGross: Number(subscriptionsGross.toFixed(2)),
    tipsAndPaywallGross: Number(tipsAndPaywallGross.toFixed(2)),
  };
}

export function computeMonthlyGoalProgress(
  goal: MonthlyRevenueGoal,
  breakdown: MonthlyRevenueBreakdown,
  now: Date = new Date(),
  currentBalance: number = 0
): MonthlyGoalProgress {
  const [yearStr, monthStr] = goal.monthKey.split('-');
  const year = Number(yearStr) || now.getFullYear();
  const monthIdx = (Number(monthStr) || now.getMonth() + 1) - 1;

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const currentMonthKey = getCurrentMonthKey(now);

  let daysElapsed = 0;
  let daysRemaining = daysInMonth;

  if (goal.monthKey === currentMonthKey) {
    daysElapsed = Math.max(1, now.getDate());
    daysRemaining = Math.max(0, daysInMonth - now.getDate());
  } else if (goal.monthKey < currentMonthKey) {
    daysElapsed = daysInMonth;
    daysRemaining = 0;
  } else {
    daysElapsed = 0;
    daysRemaining = daysInMonth;
  }

  const actualAmount =
    goal.basis === 'balance'
      ? Math.max(0, Number(currentBalance) || 0)
      : goal.basis === 'net'
      ? breakdown.netTotal
      : breakdown.grossTotal;
  const targetAmount = Math.max(1, goal.targetAmount);
  const rawPercent = Number(((actualAmount / targetAmount) * 100).toFixed(1));
  const progressPercent = Math.min(100, Math.max(0, rawPercent));
  const remainingAmount = Number(Math.max(0, targetAmount - actualAmount).toFixed(2));
  const surplusAmount = Number(Math.max(0, actualAmount - targetAmount).toFixed(2));
  const isReached = actualAmount >= targetAmount;

  const expectedPacePercent =
    daysInMonth > 0 ? Number(((daysElapsed / daysInMonth) * 100).toFixed(1)) : 0;

  const divisorDays = Math.max(1, daysRemaining);
  const requiredDailyPace =
    remainingAmount > 0 ? Number((remainingAmount / divisorDays).toFixed(2)) : 0;

  let statusLabel: MonthlyGoalProgress['statusLabel'] = 'No Ritmo';
  if (isReached) {
    statusLabel = 'Meta Atingida';
  } else if (goal.monthKey < currentMonthKey) {
    statusLabel = 'Mês Encerrado';
  } else if (rawPercent + 10 < expectedPacePercent && daysElapsed > 2) {
    statusLabel = 'Atenção ao Ritmo';
  }

  return {
    goal,
    actualAmount,
    targetAmount,
    progressPercent,
    rawPercent,
    remainingAmount,
    surplusAmount,
    isReached,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    expectedPacePercent,
    requiredDailyPace,
    statusLabel,
  };
}

export function getBasisLabel(basis: MonthlyRevenueBasis): string {
  if (basis === 'balance') return 'Saldo Atual';
  return basis === 'net' ? 'Receita Líquida' : 'Receita Bruta';
}
