import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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
  dayIndex: number; // 0 = Seg .. 6 = Dom
  dayLabel: string;
  slotIndex: number; // 0..5
  slotLabel: string;
  sessions: number;
  conversions: number;
  intensity: number; // 0..100
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

const DAYS_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const SLOTS_PT = ['00h-04h', '04h-08h', '08h-12h', '12h-16h', '16h-20h', '20h-24h'];

const WINDOW_SCALE: Record<AnalyticsWindow, number> = {
  '24h': 0.08,
  '7d': 0.34,
  '30d': 1,
};

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function mapJsDayToMonIdx(jsDay: number): number {
  // JS getDay(): 0=Sun..6=Sat -> 0=Mon..6=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

export class AnalyticsTrackerService {
  private readonly eventsFile: string;
  private events: AnalyticsEventRecord[];

  constructor(dataDir: string) {
    this.eventsFile = path.join(dataDir, 'analytics-events.json');
    this.events = this.loadEvents();
  }

  private ensureDir() {
    const dir = path.dirname(this.eventsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadEvents(): AnalyticsEventRecord[] {
    try {
      if (!fs.existsSync(this.eventsFile)) {
        const seeded = this.buildInitialLiveEvents();
        this.ensureDir();
        fs.writeFileSync(this.eventsFile, JSON.stringify(seeded, null, 2), 'utf8');
        return seeded;
      }
      const raw = fs.readFileSync(this.eventsFile, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as AnalyticsEventRecord[]) : [];
    } catch {
      return this.buildInitialLiveEvents();
    }
  }

  private saveEvents() {
    try {
      this.ensureDir();
      fs.writeFileSync(this.eventsFile, JSON.stringify(this.events, null, 2), 'utf8');
    } catch {
      // Ignore write failures in read-only environments
    }
  }

  private buildInitialLiveEvents(): AnalyticsEventRecord[] {
    const now = Date.now();
    return [
      {
        id: 'evt-seed-1',
        sessionId: 'sess-demo-901',
        userId: 'visitor-842',
        userSegment: 'visitor',
        category: 'monetization_funnel',
        eventType: 'storefront_visit',
        source: 'storefront',
        screenOrTab: 'storefront:products',
        device: 'mobile',
        channel: 'instagram_bio',
        durationSec: 42,
        timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
      },
      {
        id: 'evt-seed-2',
        sessionId: 'sess-demo-901',
        userId: 'visitor-842',
        userSegment: 'visitor',
        category: 'monetization_funnel',
        eventType: 'product_preview',
        source: 'storefront',
        screenOrTab: 'storefront:products',
        device: 'mobile',
        channel: 'instagram_bio',
        durationSec: 65,
        metadata: { productTitle: 'Curso Completo de Monetização' },
        timestamp: new Date(now - 1000 * 60 * 16).toISOString(),
      },
      {
        id: 'evt-seed-3',
        sessionId: 'sess-demo-901',
        userId: 'visitor-842',
        userSegment: 'subscriber',
        category: 'revenue',
        eventType: 'checkout_completed',
        source: 'checkout',
        screenOrTab: 'storefront:products',
        device: 'mobile',
        channel: 'instagram_bio',
        revenueSource: 'product_sale',
        amountBRL: 197,
        durationSec: 38,
        metadata: { paymentMethod: 'pix' },
        timestamp: new Date(now - 1000 * 60 * 14).toISOString(),
      },
      {
        id: 'evt-seed-4',
        sessionId: 'sess-demo-902',
        userId: 'visitor-517',
        userSegment: 'visitor',
        category: 'usage_pattern',
        eventType: 'paywall_hit',
        source: 'storefront',
        screenOrTab: 'storefront:exclusive',
        device: 'desktop',
        channel: 'youtube',
        durationSec: 54,
        timestamp: new Date(now - 1000 * 60 * 9).toISOString(),
      },
      {
        id: 'evt-seed-5',
        sessionId: 'sess-demo-903',
        userId: 'usr-amidel',
        userSegment: 'creator',
        category: 'engagement',
        eventType: 'ad_impression',
        source: 'ads',
        screenOrTab: 'storefront:products',
        device: 'mobile',
        channel: 'direct',
        revenueSource: 'ads',
        amountBRL: 0.15,
        timestamp: new Date(now - 1000 * 60 * 4).toISOString(),
      },
    ];
  }

  public recordEvent(input: Partial<AnalyticsEventRecord>): AnalyticsEventRecord {
    const allowedCategories: AnalyticsEventCategory[] = [
      'engagement',
      'revenue',
      'usage_pattern',
      'monetization_funnel',
    ];
    const allowedDevices: AnalyticsDevice[] = ['desktop', 'mobile', 'tablet'];
    const allowedChannels: AnalyticsChannel[] = [
      'direct',
      'instagram_bio',
      'youtube',
      'affiliate',
      'ads_organic',
    ];

    const record: AnalyticsEventRecord = {
      id: `evt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      sessionId: String(input.sessionId || `sess-${Date.now()}`).slice(0, 64),
      userId: String(input.userId || 'anon-visitor').slice(0, 64),
      userSegment:
        input.userSegment === 'subscriber' ||
        input.userSegment === 'vip' ||
        input.userSegment === 'creator'
          ? input.userSegment
          : 'visitor',
      category: allowedCategories.includes(input.category as AnalyticsEventCategory)
        ? (input.category as AnalyticsEventCategory)
        : 'engagement',
      eventType: (input.eventType || 'page_view') as AnalyticsEventType,
      source:
        input.source === 'storefront' ||
        input.source === 'checkout' ||
        input.source === 'ads' ||
        input.source === 'api'
          ? input.source
          : 'studio',
      screenOrTab: String(input.screenOrTab || 'overview').slice(0, 80),
      device: allowedDevices.includes(input.device as AnalyticsDevice)
        ? (input.device as AnalyticsDevice)
        : 'desktop',
      channel: allowedChannels.includes(input.channel as AnalyticsChannel)
        ? (input.channel as AnalyticsChannel)
        : 'direct',
      revenueSource: input.revenueSource,
      amountBRL:
        typeof input.amountBRL === 'number' && Number.isFinite(input.amountBRL)
          ? round2(Math.max(0, input.amountBRL))
          : undefined,
      durationSec:
        typeof input.durationSec === 'number' && Number.isFinite(input.durationSec)
          ? Math.min(3600, Math.max(0, Math.round(input.durationSec)))
          : undefined,
      metadata:
        input.metadata && typeof input.metadata === 'object' ? input.metadata : undefined,
      timestamp:
        input.timestamp && !Number.isNaN(Date.parse(input.timestamp))
          ? input.timestamp
          : new Date().toISOString(),
    };

    this.events.unshift(record);
    if (this.events.length > 500) {
      this.events.length = 500;
    }
    this.saveEvents();
    return record;
  }

  public getOverview(
    window: AnalyticsWindow = '30d',
    contextOverrides?: { adRevenue?: number; adImpressions?: number; adEcpm?: number }
  ): AnalyticsOverviewPayload {
    const scale = WINDOW_SCALE[window] ?? 1;
    const nowMs = Date.now();
    const cutoffMs =
      window === '24h'
        ? nowMs - 24 * 3600 * 1000
        : window === '7d'
        ? nowMs - 7 * 24 * 3600 * 1000
        : nowMs - 30 * 24 * 3600 * 1000;

    const liveWindowEvents = this.events.filter((e) => {
      const ts = Date.parse(e.timestamp);
      return Number.isFinite(ts) && ts >= cutoffMs;
    });

    // Live deltas from real user interactions
    const liveSessionsSet = new Set(liveWindowEvents.map((e) => e.sessionId));
    const liveUsersSet = new Set(liveWindowEvents.map((e) => e.userId));
    const livePageViews = liveWindowEvents.filter((e) =>
      ['page_view', 'tab_switch', 'view_switch', 'storefront_visit'].includes(e.eventType)
    ).length;
    const liveStoreVisits = liveWindowEvents.filter(
      (e) => e.eventType === 'storefront_visit'
    ).length;
    const livePreviews = liveWindowEvents.filter(
      (e) => e.eventType === 'product_preview' || e.eventType === 'paywall_hit'
    ).length;
    const liveCheckoutOpens = liveWindowEvents.filter(
      (e) => e.eventType === 'checkout_opened'
    ).length;
    const liveCheckoutCompletes = liveWindowEvents.filter(
      (e) => e.eventType === 'checkout_completed'
    ).length;

    const dwellSamples = liveWindowEvents
      .map((e) => e.durationSec)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    const avgLiveDwellMin =
      dwellSamples.length > 0
        ? dwellSamples.reduce((a, b) => a + b, 0) / dwellSamples.length / 60
        : 4.8;

    // Combine baseline realistic traffic + live captured delta
    const baseSessions = Math.round(4820 * scale);
    const totalSessions = baseSessions + liveSessionsSet.size;
    const pageViews = Math.round(14950 * scale) + livePageViews;
    const pagesPerSession = round2(pageViews / Math.max(1, totalSessions));
    const dau = Math.round(365 + liveSessionsSet.size * 0.8);
    const mau = Math.max(dau, 1240 + liveUsersSet.size);
    const stickinessPct = round2((dau / Math.max(1, mau)) * 100);
    const avgSessionDurationMinutes = round2(
      dwellSamples.length >= 3 ? (4.8 * 0.7 + avgLiveDwellMin * 0.3) : 4.8
    );

    const fVisitors = totalSessions;
    const fExplored = Math.round(3280 * scale) + livePreviews + liveStoreVisits;
    const fCheckout = Math.round(1160 * scale) + liveCheckoutOpens;
    const fPurchased = Math.round(580 * scale) + liveCheckoutCompletes;

    const checkoutClickRate = round2((fCheckout / Math.max(1, fVisitors)) * 100);
    const overallConversionRate = round2((fPurchased / Math.max(1, fVisitors)) * 100);
    const bounceRatePercentage = round2(
      Math.max(14, Math.min(48, 28.4 - livePreviews * 0.15))
    );

    // Live revenue additions by source
    const liveRevBySource: Record<string, { gross: number; count: number }> = {
      products: { gross: 0, count: 0 },
      subscriptions: { gross: 0, count: 0 },
      in_app: { gross: 0, count: 0 },
      ads: { gross: 0, count: 0 },
      tips: { gross: 0, count: 0 },
      paywall: { gross: 0, count: 0 },
      affiliates: { gross: 0, count: 0 },
    };

    for (const ev of liveWindowEvents) {
      if (ev.eventType === 'checkout_completed' && (ev.amountBRL || 0) > 0) {
        const amt = ev.amountBRL || 0;
        if (ev.revenueSource === 'subscription') {
          liveRevBySource.subscriptions.gross += amt;
          liveRevBySource.subscriptions.count += 1;
        } else if (ev.revenueSource === 'in_app_purchase') {
          liveRevBySource.in_app.gross += amt;
          liveRevBySource.in_app.count += 1;
        } else if (ev.revenueSource === 'tip') {
          liveRevBySource.tips.gross += amt;
          liveRevBySource.tips.count += 1;
        } else if (ev.revenueSource === 'paywall_unlock') {
          liveRevBySource.paywall.gross += amt;
          liveRevBySource.paywall.count += 1;
        } else {
          liveRevBySource.products.gross += amt;
          liveRevBySource.products.count += 1;
        }
        if (ev.channel === 'affiliate') {
          liveRevBySource.affiliates.gross += round2(amt * 0.25);
          liveRevBySource.affiliates.count += 1;
        }
      } else if (
        ['ad_impression', 'ad_click', 'rewarded_complete'].includes(ev.eventType) &&
        (ev.amountBRL || 0) > 0
      ) {
        liveRevBySource.ads.gross += ev.amountBRL || 0;
        liveRevBySource.ads.count += 1;
      }
    }

    const rawSources = [
      {
        id: 'src-products',
        name: 'Produtos Digitais & Cursos',
        category: 'products' as const,
        grossRevenue: round2(14850 * scale + liveRevBySource.products.gross),
        netMarginPercentage: 88.5,
        roiMultiplier: 4.8,
        conversionRate: 14.2,
        transactionsCount: Math.round(142 * scale) + liveRevBySource.products.count,
        trendPct: 18.4,
        effortLevel: 'baixo' as const,
        rating: 5,
      },
      {
        id: 'src-subscriptions',
        name: 'Assinaturas & Clube VIP (MRR)',
        category: 'subscriptions' as const,
        grossRevenue: round2(6940 * scale + liveRevBySource.subscriptions.gross),
        netMarginPercentage: 92.1,
        roiMultiplier: 5.4,
        conversionRate: 8.6,
        transactionsCount: Math.round(98 * scale) + liveRevBySource.subscriptions.count,
        trendPct: 24.1,
        effortLevel: 'médio' as const,
        rating: 5,
      },
      {
        id: 'src-in-app',
        name: 'Compras Únicas & Recursos In-App',
        category: 'in_app' as const,
        grossRevenue: round2(2840 * scale + liveRevBySource.in_app.gross),
        netMarginPercentage: 94.0,
        roiMultiplier: 5.8,
        conversionRate: 6.4,
        transactionsCount: Math.round(64 * scale) + liveRevBySource.in_app.count,
        trendPct: 31.2,
        effortLevel: 'baixo' as const,
        rating: 5,
      },
      {
        id: 'src-paywall',
        name: 'Paywall & Artigos Fechados',
        category: 'paywall' as const,
        grossRevenue: round2(2150 * scale + liveRevBySource.paywall.gross),
        netMarginPercentage: 93.4,
        roiMultiplier: 4.5,
        conversionRate: 9.1,
        transactionsCount: Math.round(52 * scale) + liveRevBySource.paywall.count,
        trendPct: 12.6,
        effortLevel: 'médio' as const,
        rating: 4,
      },
      {
        id: 'src-tips',
        name: 'Apoios & Gorjetas Pix',
        category: 'tips' as const,
        grossRevenue: round2(1250 * scale + liveRevBySource.tips.gross),
        netMarginPercentage: 97.5,
        roiMultiplier: 3.2,
        conversionRate: 4.5,
        transactionsCount: Math.round(45 * scale) + liveRevBySource.tips.count,
        trendPct: 9.8,
        effortLevel: 'baixo' as const,
        rating: 4,
      },
      {
        id: 'src-ads',
        name: 'Anúncios (Banners, Intersticiais & Vídeos)',
        category: 'ads' as const,
        grossRevenue: round2(
          (contextOverrides?.adRevenue ?? 386.4) * scale + liveRevBySource.ads.gross
        ),
        netMarginPercentage: 70.0,
        roiMultiplier: 3.6,
        conversionRate: 3.4,
        transactionsCount: Math.round(14820 * scale) + liveRevBySource.ads.count,
        trendPct: 14.9,
        effortLevel: 'baixo' as const,
        rating: 4,
      },
      {
        id: 'src-affiliates',
        name: 'Programa de Afiliados & Parceiros',
        category: 'affiliates' as const,
        grossRevenue: round2(2450 * scale + liveRevBySource.affiliates.gross),
        netMarginPercentage: 72.0,
        roiMultiplier: 3.9,
        conversionRate: 7.8,
        transactionsCount: Math.round(31 * scale) + liveRevBySource.affiliates.count,
        trendPct: 16.5,
        effortLevel: 'baixo' as const,
        rating: 4,
      },
    ];

    const totalGross = round2(rawSources.reduce((s, r) => s + r.grossRevenue, 0));
    const revenueSources: AnalyticsRevenueSourceItem[] = rawSources.map((src) => {
      const netRevenue = round2(src.grossRevenue * (src.netMarginPercentage / 100));
      const sharePct = totalGross > 0 ? round2((src.grossRevenue / totalGross) * 100) : 0;
      return {
        ...src,
        netRevenue,
        sharePct,
      };
    });

    const totalNet = round2(revenueSources.reduce((s, r) => s + r.netRevenue, 0));
    const arpu = round2(totalGross / Math.max(1, totalSessions));
    const arppu = round2(totalGross / Math.max(1, fPurchased));

    // Build Usage Patterns Heatmap (7 days x 6 time blocks)
    const baseWeights = [
      [12, 10, 38, 52, 64, 72], // Seg
      [11, 14, 44, 58, 69, 76], // Ter
      [14, 15, 48, 62, 74, 80], // Qua
      [15, 16, 50, 65, 78, 84], // Qui
      [18, 17, 54, 72, 88, 92], // Sex
      [26, 20, 46, 68, 90, 100], // Sáb (peak)
      [24, 18, 42, 66, 86, 95], // Dom
    ];

    const liveHeatmapBoost: Record<string, { sessions: number; conv: number }> = {};
    for (const ev of liveWindowEvents) {
      const d = new Date(ev.timestamp);
      const dayIdx = mapJsDayToMonIdx(d.getDay());
      const slotIdx = Math.min(5, Math.floor(d.getHours() / 4));
      const key = `${dayIdx}-${slotIdx}`;
      if (!liveHeatmapBoost[key]) liveHeatmapBoost[key] = { sessions: 0, conv: 0 };
      liveHeatmapBoost[key].sessions += 1;
      if (ev.eventType === 'checkout_completed') liveHeatmapBoost[key].conv += 1;
    }

    const heatmap: AnalyticsHeatmapCell[] = [];
    let peakCell: AnalyticsHeatmapCell | null = null;
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
        const weight = baseWeights[dayIdx][slotIdx];
        const boost = liveHeatmapBoost[`${dayIdx}-${slotIdx}`] || { sessions: 0, conv: 0 };
        const sessions = Math.max(1, Math.round(weight * 2.1 * scale) + boost.sessions);
        const conversions = Math.max(0, Math.round(sessions * (0.08 + weight * 0.0008)) + boost.conv);
        const cell: AnalyticsHeatmapCell = {
          dayIndex: dayIdx,
          dayLabel: DAYS_PT[dayIdx],
          slotIndex: slotIdx,
          slotLabel: SLOTS_PT[slotIdx],
          sessions,
          conversions,
          intensity: Math.min(100, weight + boost.sessions * 2),
        };
        heatmap.push(cell);
        if (!peakCell || cell.intensity > peakCell.intensity) {
          peakCell = cell;
        }
      }
    }

    // Feature adoption & screen dwell aggregation
    const liveFeatureCounts: Record<string, { views: number; dwellSum: number; dwellN: number }> = {};
    for (const ev of liveWindowEvents) {
      const k = ev.screenOrTab || 'overview';
      if (!liveFeatureCounts[k]) liveFeatureCounts[k] = { views: 0, dwellSum: 0, dwellN: 0 };
      liveFeatureCounts[k].views += 1;
      if (ev.durationSec && ev.durationSec > 0) {
        liveFeatureCounts[k].dwellSum += ev.durationSec;
        liveFeatureCounts[k].dwellN += 1;
      }
    }

    const baseFeatures = [
      { id: 'f-store-products', label: 'Vitrine: Produtos Digitais', screenKey: 'storefront:products', views: Math.round(3120 * scale), avgDwellSec: 168, conversionCorrelationPct: 14.2 },
      { id: 'f-store-membership', label: 'Clube VIP & Assinaturas', screenKey: 'storefront:membership', views: Math.round(1840 * scale), avgDwellSec: 142, conversionCorrelationPct: 18.6 },
      { id: 'f-store-paywall', label: 'Feed Exclusivo (Paywall)', screenKey: 'storefront:exclusive', views: Math.round(1490 * scale), avgDwellSec: 194, conversionCorrelationPct: 11.4 },
      { id: 'f-studio-overview', label: 'Painel Financeiro & Gráficos', screenKey: 'overview', views: Math.round(1120 * scale), avgDwellSec: 215, conversionCorrelationPct: 9.2 },
      { id: 'f-ads', label: 'Anúncios & Recompensados', screenKey: 'ads', views: Math.round(980 * scale), avgDwellSec: 64, conversionCorrelationPct: 7.5 },
      { id: 'f-iap', label: 'Compras Únicas & Upgrades', screenKey: 'in_app_purchases', views: Math.round(740 * scale), avgDwellSec: 88, conversionCorrelationPct: 12.8 },
      { id: 'f-tips', label: 'Apoios & Gorjetas Pix', screenKey: 'storefront:tip', views: Math.round(620 * scale), avgDwellSec: 72, conversionCorrelationPct: 6.1 },
    ];

    const totalFeatureViews = baseFeatures.reduce(
      (s, f) => s + f.views + (liveFeatureCounts[f.screenKey]?.views || 0),
      0
    );

    const featureAdoption: AnalyticsFeatureUsageItem[] = baseFeatures
      .map((f) => {
        const live = liveFeatureCounts[f.screenKey];
        const views = f.views + (live?.views || 0);
        const avgDwellSec =
          live && live.dwellN > 0
            ? Math.round((f.avgDwellSec * 4 + live.dwellSum / live.dwellN) / 5)
            : f.avgDwellSec;
        return {
          id: f.id,
          label: f.label,
          screenKey: f.screenKey,
          views,
          avgDwellSec,
          sharePct: totalFeatureViews > 0 ? round2((views / totalFeatureViews) * 100) : 0,
          conversionCorrelationPct: f.conversionCorrelationPct,
        };
      })
      .sort((a, b) => b.views - a.views);

    // Device & Channel Breakdown
    const liveDevices = { mobile: 0, desktop: 0, tablet: 0 };
    const liveChannels: Record<AnalyticsChannel, number> = {
      direct: 0,
      instagram_bio: 0,
      youtube: 0,
      affiliate: 0,
      ads_organic: 0,
    };
    for (const ev of liveWindowEvents) {
      liveDevices[ev.device] = (liveDevices[ev.device] || 0) + 1;
      liveChannels[ev.channel] = (liveChannels[ev.channel] || 0) + 1;
    }

    const mobileSess = Math.round(totalSessions * 0.62) + liveDevices.mobile;
    const desktopSess = Math.round(totalSessions * 0.31) + liveDevices.desktop;
    const tabletSess = Math.max(1, totalSessions - mobileSess - desktopSess + liveDevices.tablet);
    const devSum = mobileSess + desktopSess + tabletSess;

    const devices = [
      { device: 'Mobile (Smartphone)', sessions: mobileSess, sharePct: round2((mobileSess / devSum) * 100), conversionRate: 11.4 },
      { device: 'Desktop (Web)', sessions: desktopSess, sharePct: round2((desktopSess / devSum) * 100), conversionRate: 14.8 },
      { device: 'Tablet', sessions: tabletSess, sharePct: round2((tabletSess / devSum) * 100), conversionRate: 9.6 },
    ];

    const chanBase = [
      { key: 'instagram_bio' as const, channel: 'Link na Bio (Instagram/TikTok)', sessions: Math.round(totalSessions * 0.41) + liveChannels.instagram_bio, conversionRate: 13.6, arpu: 7.4 },
      { key: 'direct' as const, channel: 'Acesso Direto & Recorrente', sessions: Math.round(totalSessions * 0.27) + liveChannels.direct, conversionRate: 16.2, arpu: 9.8 },
      { key: 'youtube' as const, channel: 'YouTube / Conteúdo Longo', sessions: Math.round(totalSessions * 0.16) + liveChannels.youtube, conversionRate: 10.9, arpu: 6.9 },
      { key: 'affiliate' as const, channel: 'Rede de Afiliados', sessions: Math.round(totalSessions * 0.1) + liveChannels.affiliate, conversionRate: 15.1, arpu: 8.6 },
      { key: 'ads_organic' as const, channel: 'Tráfego Orgânico & Ads', sessions: Math.round(totalSessions * 0.06) + liveChannels.ads_organic, conversionRate: 5.4, arpu: 3.1 },
    ];
    const chanTotal = chanBase.reduce((s, c) => s + c.sessions, 0) || 1;
    const channels = chanBase.map((c) => ({
      channel: c.channel,
      sessions: c.sessions,
      sharePct: round2((c.sessions / chanTotal) * 100),
      conversionRate: c.conversionRate,
      arpu: c.arpu,
    }));

    // Key Metrics & Monetization Decisions Matrix (dynamic based on live data)
    const checkoutCompletionPct = round2((fPurchased / Math.max(1, fCheckout)) * 100);
    const adsRev = contextOverrides?.adRevenue ?? 386.4;
    const adEcpm = contextOverrides?.adEcpm ?? 26.07;

    const keyMetricsDecisions: AnalyticsKeyMetricDecision[] = [
      {
        id: 'km-stickiness',
        metricName: 'Stickiness (DAU / MAU) & Duração da Sessão',
        category: 'Engajamento',
        formula: '(Usuários Ativos Diários ÷ Usuários Ativos Mensais) × 100',
        currentValue: `${stickinessPct.toFixed(1)}% · ${avgSessionDurationMinutes.toFixed(1)} min`,
        benchmarkTarget: '>= 25% · >= 4.0 min',
        status: stickinessPct >= 25 ? 'healthy' : 'attention',
        insight:
          stickinessPct >= 25
            ? 'Usuários retornam com frequência elevada e permanecem tempo suficiente para consumir múltiplas ofertas.'
            : 'Recorrência abaixo de 25%; faltam gatilhos de retorno semanal.',
        monetizationDecision: 'Modelos de Assinatura & Paywall Recorrente',
        recommendedAction:
          'Converter leitores com >= 3 sessões semanais em assinantes VIP usando desconto progressivo no 1º mês ou série exclusiva semanal.',
      },
      {
        id: 'km-arpu-arppu',
        metricName: 'ARPU vs. ARPPU (Receita Média por Usuário / Pagante)',
        category: 'Receita',
        formula: 'ARPU = Receita Total ÷ Sessões · ARPPU = Receita ÷ Pagantes',
        currentValue: `ARPU R$ ${arpu.toFixed(2)} · ARPPU R$ ${arppu.toFixed(2)}`,
        benchmarkTarget: 'ARPU >= R$ 5,50 · ARPPU >= R$ 48,00',
        status: arpu >= 5.5 ? 'healthy' : 'opportunity',
        insight:
          'A distância entre ARPU e ARPPU mostra quanto valor fica concentrado nos compradores vs. tráfego gratuito.',
        monetizationDecision: 'Precificação, Bundles & Compras Únicas (IAP)',
        recommendedAction:
          'Se ARPU estiver baixo com tráfego alto, insira micro-compras de R$ 19–R$ 49 (templates/acesso rápido); se ARPPU for alto, lance pacotes Pro anuais.',
      },
      {
        id: 'km-funnel-abandon',
        metricName: 'Taxa de Conversão do Funil & Fechamento de Checkout',
        category: 'Receita',
        formula: 'Compras Aprovadas ÷ Checkouts Iniciados × 100',
        currentValue: `${checkoutCompletionPct.toFixed(1)}% no checkout (${overallConversionRate.toFixed(1)}% geral)`,
        benchmarkTarget: '>= 52% no checkout',
        status: checkoutCompletionPct >= 50 ? 'healthy' : 'attention',
        insight:
          checkoutCompletionPct < 50
            ? 'Mais da metade dos usuários que abrem o pagamento não concluem a transação.'
            : 'Conversão saudável no modal de pagamento, com espaço para upsell pós-compra.',
        monetizationDecision: 'Otimização de Checkout & Ofertas de Recuperação',
        recommendedAction:
          'Ativar Pix instantâneo como padrão no Mobile, exibir garantia de 7 dias e disparar cupom de 10% após 45s de inatividade no checkout.',
      },
      {
        id: 'km-ltv-churn',
        metricName: 'LTV Médio vs. Churn Mensal de Assinantes',
        category: 'Retenção',
        formula: 'LTV = Ticket Médio Mensal ÷ Taxa de Cancelamento (Churn %)',
        currentValue: 'LTV R$ 395,00 · Churn 6,8%/mês',
        benchmarkTarget: 'Churn <= 5,0%/mês',
        status: 'attention',
        insight:
          'Reduzir o churn de 6,8% para 4,5% eleva o LTV em +51% sem gastar nada extra em aquisição.',
        monetizationDecision: 'Planos Anuais & Benefícios de Fidelidade',
        recommendedAction:
          'Migrar assinantes mensais ativos no 2º mês para plano anual com 2 meses grátis (economia imediata + retenção de longo prazo).',
      },
      {
        id: 'km-ads-yield',
        metricName: 'eCPM Efetivo, CTR & Fadiga de Anúncios',
        category: 'Uso & Padrões',
        formula: '(Receita de Ads ÷ Impressões) × 1.000',
        currentValue: `eCPM R$ ${adEcpm.toFixed(2)} · Receita R$ ${adsRev.toFixed(2)}`,
        benchmarkTarget: 'eCPM >= R$ 22,00 · Bounce < 32%',
        status: 'healthy',
        insight:
          'Usuários gratuitos toleram banners de rodapé e vídeos premiados opt-in sem elevar a taxa de rejeição.',
        monetizationDecision: 'Segmentação Anúncios vs. Upgrade "Sem Anúncios"',
        recommendedAction:
          'Manter Rewarded Video opt-in para não-pagantes e oferecer o recurso único "Remover Anúncios" para usuários com alta frequência.',
      },
      {
        id: 'km-peak-patterns',
        metricName: 'Janelas de Pico & Adoção por Dispositivo',
        category: 'Uso & Padrões',
        formula: 'Distribuição Horária × Conversão por Tela/Dispositivo',
        currentValue: `${peakCell?.dayLabel || 'Sáb'} ${peakCell?.slotLabel || '20h-24h'} · ${devices[0].sharePct.toFixed(0)}% Mobile`,
        benchmarkTarget: 'Campanhas sincronizadas com janela nobre',
        status: 'opportunity',
        insight:
          `O pico de uso ocorre em ${peakCell?.dayLabel || 'Sáb'} (${peakCell?.slotLabel || '20h-24h'}) com maioria em Mobile.`,
        monetizationDecision: 'Agendamento de Ofertas & Fluxo Mobile-First',
        recommendedAction:
          'Programar lançamentos de paywall e avisos de desconto nas noites de sexta a domingo e simplificar formulários para tela mobile.',
      },
    ];

    return {
      window,
      generatedAt: new Date().toISOString(),
      liveEventsCount: liveWindowEvents.length,
      engagement: {
        totalSessions,
        dau,
        mau,
        stickinessPct,
        pageViews,
        pagesPerSession,
        avgSessionDurationMinutes,
        bounceRatePercentage,
        activeUsersCount: mau,
        checkoutClickRate,
        overallConversionRate,
      },
      revenueSummary: {
        totalGross,
        totalNet,
        arpu,
        arppu,
        payingUsers: fPurchased,
        adsRevenue: round2(adsRev + liveRevBySource.ads.gross),
        adEcpm: round2(adEcpm),
      },
      retention: {
        monthlyChurnRate: 6.8,
        annualRetentionRate: 93.2,
        averageLtv: 395.0,
        cohorts: [
          { cohortMonth: 'Nov 2026', initialUsers: 340, m1Retention: 94, m2Retention: 89, m3Retention: 85, m6Retention: 80 },
          { cohortMonth: 'Out 2026', initialUsers: 310, m1Retention: 92, m2Retention: 87, m3Retention: 83, m6Retention: 78 },
          { cohortMonth: 'Set 2026', initialUsers: 285, m1Retention: 90, m2Retention: 86, m3Retention: 81, m6Retention: 76 },
          { cohortMonth: 'Ago 2026', initialUsers: 260, m1Retention: 91, m2Retention: 85, m3Retention: 80, m6Retention: 75 },
        ],
      },
      funnel: [
        {
          name: 'Visitantes Únicos',
          count: fVisitors,
          percentage: 100,
          dropoffPercentage: 0,
          description: 'Usuários que acessaram a vitrine ou link da bio.',
        },
        {
          name: 'Exploraram Vitrine & Ofertas',
          count: fExplored,
          percentage: round2(Math.min(100, (fExplored / Math.max(1, fVisitors)) * 100)),
          dropoffPercentage: round2(Math.max(0, 100 - (fExplored / Math.max(1, fVisitors)) * 100)),
          description: 'Visualizaram produtos, paywall ou planos VIP.',
        },
        {
          name: 'Iniciaram Checkout',
          count: fCheckout,
          percentage: round2(Math.min(100, (fCheckout / Math.max(1, fVisitors)) * 100)),
          dropoffPercentage: round2(Math.max(0, ((fExplored - fCheckout) / Math.max(1, fVisitors)) * 100)),
          description: 'Abriram o modal de pagamento Pix, Cartão ou Multicaixa.',
        },
        {
          name: 'Compra Concluída',
          count: fPurchased,
          percentage: overallConversionRate,
          dropoffPercentage: round2(Math.max(0, ((fCheckout - fPurchased) / Math.max(1, fVisitors)) * 100)),
          description: 'Pagamentos aprovados com receita liquidada.',
        },
      ],
      revenueSources,
      usagePatterns: {
        peakDayLabel: peakCell?.dayLabel || 'Sáb',
        peakWindowLabel: peakCell?.slotLabel || '20h-24h',
        heatmap,
        featureAdoption,
        devices,
        channels,
      },
      idealTouchpoints: [
        {
          id: 'touch-1',
          name: 'Pós-Download de Amostra Gratuita',
          triggerEvent: 'product_preview concluído em item gratuito',
          bestTimeWindow: 'Primeiros 3 minutos após acesso',
          conversionRate: 19.4,
          averageTicket: 67.0,
          recommendation: 'Apresentar oferta de entrada (upsell instantâneo de R$ 47 a R$ 67).',
          efficacyScore: 94,
        },
        {
          id: 'touch-2',
          name: '3ª Leitura no Feed Exclusivo (Paywall)',
          triggerEvent: '3 eventos paywall_hit na mesma semana',
          bestTimeWindow: 'Ao atingir o limite gratuito',
          conversionRate: 28.2,
          averageTicket: 89.0,
          recommendation: 'Oferecer 30% de desconto no 1º mês da Assinatura VIP com acesso irrestrito.',
          efficacyScore: 98,
        },
        {
          id: 'touch-3',
          name: `Horário Nobre (${peakCell?.dayLabel || 'Sáb'} · ${peakCell?.slotLabel || '20h-24h'})`,
          triggerEvent: 'Sessões ativas de alta intenção noturna',
          bestTimeWindow: `${peakCell?.dayLabel || 'Sáb'} ${peakCell?.slotLabel || '20h-24h'}`,
          conversionRate: 22.8,
          averageTicket: 195.0,
          recommendation: 'Destacar mentorias e pacotes anuais com urgência transparente.',
          efficacyScore: 91,
        },
        {
          id: 'touch-4',
          name: 'Retenção no Checkout (> 45s)',
          triggerEvent: 'checkout_opened sem conclusão em 45 segundos',
          bestTimeWindow: 'Tela de pagamento Pix / Cartão',
          conversionRate: 31.5,
          averageTicket: 145.0,
          recommendation: 'Reforçar garantia de 7 dias e liberação instantânea via Pix.',
          efficacyScore: 89,
        },
      ],
      keyMetricsDecisions,
      recentEvents: this.events.slice(0, 60),
    };
  }
}
