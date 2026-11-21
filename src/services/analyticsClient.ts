export type AnalyticsWindow = '24h' | '7d' | '30d';

export type AnalyticsEventCategory =
  | 'engagement'
  | 'revenue'
  | 'usage_pattern'
  | 'monetization_funnel';

export type AnalyticsEventType =
  | 'page_view'
  | 'tab_switch'
  | 'view_switch'
  | 'storefront_visit'
  | 'product_preview'
  | 'paywall_hit'
  | 'checkout_opened'
  | 'checkout_completed'
  | 'ad_impression'
  | 'ad_click'
  | 'rewarded_complete'
  | 'feature_used';

export type AnalyticsDevice = 'desktop' | 'mobile' | 'tablet';
export type AnalyticsChannel = 'direct' | 'instagram_bio' | 'youtube' | 'affiliate' | 'ads_organic';
export type AnalyticsRevenueSource =
  | 'product_sale'
  | 'subscription'
  | 'tip'
  | 'paywall_unlock'
  | 'in_app_purchase'
  | 'ads';

export interface AnalyticsEventRecord {
  id: string;
  sessionId: string;
  userId: string;
  userSegment: 'visitor' | 'subscriber' | 'vip' | 'creator';
  category: AnalyticsEventCategory;
  eventType: AnalyticsEventType;
  source: 'studio' | 'storefront' | 'checkout' | 'ads' | 'api';
  screenOrTab: string;
  device: AnalyticsDevice;
  channel: AnalyticsChannel;
  revenueSource?: AnalyticsRevenueSource;
  amountBRL?: number;
  durationSec?: number;
  metadata?: Record<string, string | number | boolean>;
  timestamp: string;
}

export interface AnalyticsHeatmapCell {
  dayIndex: number;
  dayLabel: string;
  slotIndex: number;
  slotLabel: string;
  sessions: number;
  conversions: number;
  intensity: number;
}

export interface AnalyticsFeatureUsageItem {
  id: string;
  label: string;
  screenKey: string;
  views: number;
  avgDwellSec: number;
  sharePct: number;
  conversionCorrelationPct: number;
}

export interface AnalyticsRevenueSourceItem {
  id: string;
  name: string;
  category: 'products' | 'subscriptions' | 'in_app' | 'ads' | 'tips' | 'paywall' | 'affiliates';
  grossRevenue: number;
  netRevenue: number;
  netMarginPercentage: number;
  sharePct: number;
  roiMultiplier: number;
  conversionRate: number;
  transactionsCount: number;
  trendPct: number;
  effortLevel: 'baixo' | 'médio' | 'alto';
  rating: number;
}

export interface AnalyticsKeyMetricDecision {
  id: string;
  metricName: string;
  category: 'Engajamento' | 'Receita' | 'Uso & Padrões' | 'Retenção';
  formula: string;
  currentValue: string;
  benchmarkTarget: string;
  status: 'healthy' | 'attention' | 'opportunity';
  insight: string;
  monetizationDecision: string;
  recommendedAction: string;
}

export interface AnalyticsOverviewPayload {
  window: AnalyticsWindow;
  generatedAt: string;
  liveEventsCount: number;
  engagement: {
    totalSessions: number;
    dau: number;
    mau: number;
    stickinessPct: number;
    pageViews: number;
    pagesPerSession: number;
    avgSessionDurationMinutes: number;
    bounceRatePercentage: number;
    activeUsersCount: number;
    checkoutClickRate: number;
    overallConversionRate: number;
  };
  revenueSummary: {
    totalGross: number;
    totalNet: number;
    arpu: number;
    arppu: number;
    payingUsers: number;
    adsRevenue: number;
    adEcpm: number;
  };
  retention: {
    monthlyChurnRate: number;
    annualRetentionRate: number;
    averageLtv: number;
    cohorts: {
      cohortMonth: string;
      initialUsers: number;
      m1Retention: number;
      m2Retention: number;
      m3Retention: number;
      m6Retention: number;
    }[];
  };
  funnel: {
    name: string;
    count: number;
    percentage: number;
    dropoffPercentage: number;
    description: string;
  }[];
  revenueSources: AnalyticsRevenueSourceItem[];
  usagePatterns: {
    peakWindowLabel: string;
    peakDayLabel: string;
    heatmap: AnalyticsHeatmapCell[];
    featureAdoption: AnalyticsFeatureUsageItem[];
    devices: { device: string; sessions: number; sharePct: number; conversionRate: number }[];
    channels: { channel: string; sessions: number; sharePct: number; conversionRate: number; arpu: number }[];
  };
  idealTouchpoints: {
    id: string;
    name: string;
    triggerEvent: string;
    bestTimeWindow: string;
    conversionRate: number;
    averageTicket: number;
    recommendation: string;
    efficacyScore: number;
  }[];
  keyMetricsDecisions: AnalyticsKeyMetricDecision[];
  recentEvents: AnalyticsEventRecord[];
}

const SESSION_KEY = 'monetizahub_analytics_session_id';

export function getOrCreateSessionId(): string {
  try {
    let existing = sessionStorage.getItem(SESSION_KEY);
    if (!existing) {
      existing = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem(SESSION_KEY, existing);
    }
    return existing;
  } catch {
    return `sess-${Date.now().toString(36)}`;
  }
}

export function detectDeviceType(): AnalyticsDevice {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export async function fetchAnalyticsOverview(
  windowPeriod: AnalyticsWindow = '30d'
): Promise<AnalyticsOverviewPayload | null> {
  try {
    const resp = await fetch(`/api/analytics/overview?window=${encodeURIComponent(windowPeriod)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.overview ?? null;
  } catch {
    return null;
  }
}

export async function sendAnalyticsEvent(
  payload: Omit<Partial<AnalyticsEventRecord>, 'id' | 'timestamp'>
): Promise<boolean> {
  try {
    const resp = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        sessionId: payload.sessionId || getOrCreateSessionId(),
        device: payload.device || detectDeviceType(),
        ...payload,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
