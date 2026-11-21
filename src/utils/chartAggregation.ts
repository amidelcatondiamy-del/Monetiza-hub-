import { Transaction } from '../types/monetization';

export type ChartDateGranularity = 'daily' | 'weekly' | 'monthly';
export type ChartRevenueTypeFilter = 'all' | 'sales' | 'tips' | 'subscriptions';

export interface ChartBucketDatum {
  bucketKey: string;
  shortLabel: string;
  fullDateLabel: string;
  approvedAmount: number;
  pendingAmount: number;
  approvedCount: number;
  pendingCount: number;
  refundedCount: number;
  totalAmount: number;
  totalCount: number;
}

export interface AggregatedChartSeries {
  series: ChartBucketDatum[];
  windowStart: Date;
  windowEnd: Date;
  totals: {
    approvedAmount: number;
    pendingAmount: number;
    approvedCount: number;
    pendingCount: number;
    totalAmount: number;
    totalCount: number;
    activeBuckets: number;
  };
}

const MONTH_SHORT_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const MONTH_FULL_PT = [
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

export const toLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

export function matchesChartRevenueType(
  tx: Transaction,
  revenueType: ChartRevenueTypeFilter
): boolean {
  if (revenueType === 'all') return true;
  if (revenueType === 'sales') {
    return (
      tx.type === 'product_sale' ||
      tx.type === 'paywall_unlock' ||
      tx.type === 'in_app_purchase'
    );
  }
  if (revenueType === 'tips') {
    return tx.type === 'tip';
  }
  if (revenueType === 'subscriptions') {
    return tx.type === 'subscription';
  }
  return true;
}

export function getRevenueTypeLabel(revenueType: ChartRevenueTypeFilter): string {
  switch (revenueType) {
    case 'sales':
      return 'Vendas';
    case 'tips':
      return 'Tips / Gorjetas';
    case 'subscriptions':
      return 'Assinaturas';
    default:
      return 'Todas as Receitas';
  }
}

export function getGranularityLabel(granularity: ChartDateGranularity): string {
  switch (granularity) {
    case 'weekly':
      return 'Semanal (12 Semanas)';
    case 'monthly':
      return 'Mensal (12 Meses)';
    default:
      return 'Diário (30 Dias)';
  }
}

export function filterTransactionsForChartWindow(
  transactions: Transaction[],
  granularity: ChartDateGranularity,
  revenueType: ChartRevenueTypeFilter,
  now: Date = new Date()
): Transaction[] {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (granularity === 'daily') {
    start.setDate(start.getDate() - 29);
  } else if (granularity === 'weekly') {
    const currentMonday = getMondayOfWeek(start);
    currentMonday.setDate(currentMonday.getDate() - 11 * 7);
    start.setTime(currentMonday.getTime());
  } else {
    start.setDate(1);
    start.setMonth(start.getMonth() - 11);
  }

  return transactions.filter((tx) => {
    if (!matchesChartRevenueType(tx, revenueType)) return false;
    if (!tx.createdAt) return false;
    const d = new Date(tx.createdAt);
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
  });
}

export function aggregateTransactionsForChart(
  transactions: Transaction[],
  granularity: ChartDateGranularity,
  revenueType: ChartRevenueTypeFilter,
  now: Date = new Date()
): AggregatedChartSeries {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const buckets = new Map<string, ChartBucketDatum>();
  const orderedKeys: string[] = [];
  let windowStart = new Date(today);
  const windowEnd = new Date(today);
  windowEnd.setHours(23, 59, 59, 999);

  if (granularity === 'daily') {
    windowStart.setDate(today.getDate() - 29);
    for (let offset = 29; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const key = toLocalDateKey(d);
      orderedKeys.push(key);
      buckets.set(key, {
        bucketKey: key,
        shortLabel: d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        fullDateLabel: d.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        approvedAmount: 0,
        pendingAmount: 0,
        approvedCount: 0,
        pendingCount: 0,
        refundedCount: 0,
        totalAmount: 0,
        totalCount: 0,
      });
    }
  } else if (granularity === 'weekly') {
    const currentMonday = getMondayOfWeek(today);
    windowStart = new Date(currentMonday);
    windowStart.setDate(currentMonday.getDate() - 11 * 7);

    for (let w = 11; w >= 0; w--) {
      const monday = new Date(currentMonday);
      monday.setDate(currentMonday.getDate() - w * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const key = toLocalDateKey(monday);
      orderedKeys.push(key);
      const startShort = monday.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      const endShort = sunday.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      buckets.set(key, {
        bucketKey: key,
        shortLabel: startShort,
        fullDateLabel: `Semana ${startShort} – ${endShort}/${sunday.getFullYear()}`,
        approvedAmount: 0,
        pendingAmount: 0,
        approvedCount: 0,
        pendingCount: 0,
        refundedCount: 0,
        totalAmount: 0,
        totalCount: 0,
      });
    }
  } else {
    const firstMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    windowStart = firstMonth;
    for (let mOffset = 11; mOffset >= 0; mOffset--) {
      const mDate = new Date(today.getFullYear(), today.getMonth() - mOffset, 1);
      const y = mDate.getFullYear();
      const mIdx = mDate.getMonth();
      const key = `${y}-${String(mIdx + 1).padStart(2, '0')}`;
      orderedKeys.push(key);
      buckets.set(key, {
        bucketKey: key,
        shortLabel: `${MONTH_SHORT_PT[mIdx]}/${String(y).slice(-2)}`,
        fullDateLabel: `${MONTH_FULL_PT[mIdx]} de ${y}`,
        approvedAmount: 0,
        pendingAmount: 0,
        approvedCount: 0,
        pendingCount: 0,
        refundedCount: 0,
        totalAmount: 0,
        totalCount: 0,
      });
    }
  }

  let approvedAmountSum = 0;
  let pendingAmountSum = 0;
  let approvedCountSum = 0;
  let pendingCountSum = 0;

  for (const tx of transactions) {
    if (!matchesChartRevenueType(tx, revenueType)) continue;
    if (!tx.createdAt) continue;
    const txDate = new Date(tx.createdAt);
    if (Number.isNaN(txDate.getTime())) continue;

    let key = '';
    if (granularity === 'daily') {
      key = toLocalDateKey(txDate);
    } else if (granularity === 'weekly') {
      key = toLocalDateKey(getMondayOfWeek(txDate));
    } else {
      key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
    }

    const bucket = buckets.get(key);
    if (!bucket) continue;

    if (tx.status === 'approved') {
      bucket.approvedAmount += tx.grossAmount;
      bucket.approvedCount += 1;
      approvedAmountSum += tx.grossAmount;
      approvedCountSum += 1;
    } else if (tx.status === 'pending') {
      bucket.pendingAmount += tx.grossAmount;
      bucket.pendingCount += 1;
      pendingAmountSum += tx.grossAmount;
      pendingCountSum += 1;
    } else if (tx.status === 'refunded') {
      bucket.refundedCount += 1;
    }
  }

  const series = orderedKeys.map((k) => {
    const b = buckets.get(k)!;
    b.totalAmount = Number((b.approvedAmount + b.pendingAmount).toFixed(2));
    b.totalCount = b.approvedCount + b.pendingCount;
    return b;
  });

  const activeBuckets = series.filter((d) => d.totalCount > 0).length;

  return {
    series,
    windowStart,
    windowEnd,
    totals: {
      approvedAmount: Number(approvedAmountSum.toFixed(2)),
      pendingAmount: Number(pendingAmountSum.toFixed(2)),
      approvedCount: approvedCountSum,
      pendingCount: pendingCountSum,
      totalAmount: Number((approvedAmountSum + pendingAmountSum).toFixed(2)),
      totalCount: approvedCountSum + pendingCountSum,
      activeBuckets,
    },
  };
}
