import {
  Currency,
  DigitalProduct,
  DiscountCoupon,
  Transaction,
} from '../types/monetization';

export interface WeeklyProductMetric {
  id: string;
  title: string;
  type: string;
  price: number;
  salesCount: number;
  viewsCount: number;
  conversionRatePct: number;
  estimatedRevenue: number;
  tags: string[];
}

export interface WeeklyPerformanceSnapshot {
  creatorName: string;
  currency: Currency;
  weeklyMetrics: {
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
    tipsTotalWeek: number;
    subscriptionsTotalWeek: number;
    productsTotalWeek: number;
    topPaymentMethods: Array<{ method: string; count: number; total: number }>;
  };
  topProducts: WeeklyProductMetric[];
  activeCoupons: Array<{
    code: string;
    discountPercentage: number;
    usedCount: number;
    maxUses: number;
  }>;
  monthlyGoalTarget?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatShortBrDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function buildWeeklyPerformanceSnapshot(params: {
  creatorName: string;
  currency: Currency;
  transactions: Transaction[];
  products: DigitalProduct[];
  coupons: DiscountCoupon[];
  mrr: number;
  monthlyGoalTarget?: number;
  referenceDate?: Date;
}): WeeklyPerformanceSnapshot {
  const now = params.referenceDate ?? new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  const currentWeekStart = endOfToday - 7 * MS_PER_DAY + 1;
  const previousWeekStart = currentWeekStart - 7 * MS_PER_DAY;

  const currentWeekTxs: Transaction[] = [];
  const previousWeekTxs: Transaction[] = [];

  for (const tx of params.transactions) {
    const t = new Date(tx.createdAt).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= currentWeekStart && t <= endOfToday) {
      currentWeekTxs.push(tx);
    } else if (t >= previousWeekStart && t < currentWeekStart) {
      previousWeekTxs.push(tx);
    }
  }

  const approvedCurrent = currentWeekTxs.filter((t) => t.status === 'approved');
  const pendingCurrent = currentWeekTxs.filter((t) => t.status === 'pending');
  const approvedPrevious = previousWeekTxs.filter((t) => t.status === 'approved');

  const currentWeekGross = approvedCurrent.reduce(
    (sum, t) => sum + t.grossAmount,
    0
  );
  const currentWeekNet = approvedCurrent.reduce(
    (sum, t) => sum + t.netAmount,
    0
  );
  const previousWeekGross = approvedPrevious.reduce(
    (sum, t) => sum + t.grossAmount,
    0
  );

  const weekOverWeekGrowthPct =
    previousWeekGross > 0
      ? ((currentWeekGross - previousWeekGross) / previousWeekGross) * 100
      : currentWeekGross > 0
      ? 100
      : 0;

  const pendingAmount = pendingCurrent.reduce(
    (sum, t) => sum + t.grossAmount,
    0
  );
  const averageTicket =
    approvedCurrent.length > 0 ? currentWeekGross / approvedCurrent.length : 0;

  const tipsTotalWeek = approvedCurrent
    .filter((t) => t.type === 'tip')
    .reduce((sum, t) => sum + t.grossAmount, 0);
  const subscriptionsTotalWeek = approvedCurrent
    .filter((t) => t.type === 'subscription')
    .reduce((sum, t) => sum + t.grossAmount, 0);
  const productsTotalWeek = approvedCurrent
    .filter(
      (t) =>
        t.type === 'product_sale' ||
        t.type === 'paywall_unlock' ||
        t.type === 'in_app_purchase'
    )
    .reduce((sum, t) => sum + t.grossAmount, 0);

  const methodMap = new Map<string, { count: number; total: number }>();
  for (const tx of approvedCurrent) {
    const prev = methodMap.get(tx.paymentMethod) ?? { count: 0, total: 0 };
    methodMap.set(tx.paymentMethod, {
      count: prev.count + 1,
      total: prev.total + tx.grossAmount,
    });
  }
  const topPaymentMethods = Array.from(methodMap.entries())
    .map(([method, stats]) => ({
      method,
      count: stats.count,
      total: Number(stats.total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total);

  const topProducts: WeeklyProductMetric[] = [...params.products]
    .filter((p) => p.isPublished)
    .map((p) => {
      const views = Math.max(1, p.viewsCount);
      const conversionRatePct = Number(((p.salesCount / views) * 100).toFixed(2));
      const estimatedRevenue = Number((p.price * p.salesCount).toFixed(2));
      return {
        id: p.id,
        title: p.title,
        type: p.type,
        price: p.price,
        salesCount: p.salesCount,
        viewsCount: p.viewsCount,
        conversionRatePct,
        estimatedRevenue,
        tags: p.tags,
      };
    })
    .sort((a, b) => b.salesCount - a.salesCount || b.estimatedRevenue - a.estimatedRevenue)
    .slice(0, 6);

  const startDateObj = new Date(currentWeekStart);
  const endDateObj = new Date(endOfToday);
  const periodLabel = `Últimos 7 dias (${formatShortBrDate(startDateObj)} – ${formatShortBrDate(endDateObj)})`;

  return {
    creatorName: params.creatorName,
    currency: params.currency,
    weeklyMetrics: {
      periodLabel,
      currentWeekGross: Number(currentWeekGross.toFixed(2)),
      currentWeekNet: Number(currentWeekNet.toFixed(2)),
      previousWeekGross: Number(previousWeekGross.toFixed(2)),
      weekOverWeekGrowthPct: Number(weekOverWeekGrowthPct.toFixed(1)),
      approvedTransactionsCount: approvedCurrent.length,
      pendingTransactionsCount: pendingCurrent.length,
      pendingAmount: Number(pendingAmount.toFixed(2)),
      averageTicket: Number(averageTicket.toFixed(2)),
      mrr: Number(params.mrr.toFixed(2)),
      tipsTotalWeek: Number(tipsTotalWeek.toFixed(2)),
      subscriptionsTotalWeek: Number(subscriptionsTotalWeek.toFixed(2)),
      productsTotalWeek: Number(productsTotalWeek.toFixed(2)),
      topPaymentMethods,
    },
    topProducts,
    activeCoupons: params.coupons
      .filter((c) => c.active)
      .slice(0, 8)
      .map((c) => ({
        code: c.code,
        discountPercentage: c.discountPercentage,
        usedCount: c.usedCount,
        maxUses: c.maxUses,
      })),
    monthlyGoalTarget: params.monthlyGoalTarget,
  };
}
