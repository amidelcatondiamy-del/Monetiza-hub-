import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import {
  CreatorProfile,
  DigitalProduct,
  SubscriptionTier,
  TipGoal,
  GatedPost,
  AffiliatePartner,
  DiscountCoupon,
  Transaction,
  WithdrawalRequest,
  PaymentMethod,
  Currency,
  InAppFeature,
  TransactionReview,
  NotificationThresholdSettings,
  NotificationChannelChoice,
  BalanceAlertToastData,
  UserAccount,
  UserShowcaseItem,
  AdSettings,
  AdStats,
  NativeAd,
  CreatorBadge,
  DailyGoal,
  MonthlyRevenueBasis,
  MonthlyRevenueGoal,
  AITipItem,
  AISettings,
  FinancialExpense,
  UserAnalyticsData,
  AppSubscription,
  AppSubscriptionTier,
  AppBillingCycle,
  AppSubscriptionInvoice,
  SentNotificationAudit,
  PaymentGatewaySettings,
  GatewayProvider,
  GatewayConfigItem,
  MonetizationModelsConfig,
  FollowerInAppItem,
  PriceExperiment,
  PriceExperimentVariant,
  AdNetworkIntegration,
  AdNetworkProviderId,
  AdFormatType,
  AdCampaignFormat,
  AdTelemetryEventRecord,
  TransactionStatus,
  PlatformAdminSettings,
  AdminAuditLogItem,
  Aes256EncryptedPayload,
  CreatorVaultSecurityStatus,
  SensitiveCreatorVault,
  ServerVaultStorageInfo,
  StoredCreatorEnvelope,
  RewardTierLevel,
  RewardActionId,
  RewardActionRule,
  RewardCatalogItem,
  RewardTransactionRecord,
  ThemePreference,
  ResolvedTheme,
} from '../types/monetization';
import {
  getStoredThemePreference,
  saveThemePreference,
  getSystemPrefersDark,
  resolveThemePreference,
  applyThemeToDocument,
} from '../utils/themeManager';
import {
  initialCreatorProfile,
  initialProducts,
  initialSubscriptionTiers,
  initialTipGoal,
  initialGatedPosts,
  initialAffiliates,
  initialCoupons,
  initialTransactions,
  initialWithdrawals,
  initialInAppFeatures,
  initialReviews,
  initialUsers,
  initialAdSettings,
  initialAdStats,
  initialNativeAds,
  initialCreatorBadges,
  initialDailyGoal,
  initialAITips,
  initialAISettings,
  initialFinancialExpenses,
  initialUserAnalytics,
  initialAppSubscription,
  initialNotificationHistory,
  initialPaymentGatewaySettings,
  initialMonetizationModelsConfig,
  initialFollowerInAppItems,
  initialPriceExperiments,
  initialAdNetworks,
  initialPlatformAdminSettings,
  initialAdminAuditLogs,
} from '../data/mockData';
import { playCashSound, playSuccessSound, isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { subscribeExpressStream } from '../services/angolaPspClient';
import {
  RealSaleOrder,
  SalesGatewayReadiness,
  fetchSalesOrdersApi,
  fetchSalesStatusApi,
} from '../services/salesClient';
import {
  AnalyticsEventRecord,
  AnalyticsOverviewPayload,
  AnalyticsWindow,
  detectDeviceType,
  fetchAnalyticsOverview,
  getOrCreateSessionId,
  sendAnalyticsEvent,
} from '../services/analyticsClient';
import {
  ENCRYPTED_SENSITIVE_FIELD_LABELS,
  createEncryptedCreatorEnvelope,
  createEncryptedNotificationEnvelope,
  decryptJsonAes256,
  isStoredCreatorEnvelope,
  isStoredNotificationEnvelope,
  mergeCreatorWithVault,
  rotateDeviceVaultSecret,
} from '../utils/aes256Crypto';

export interface SalesToastNotification {
  id: string;
  title: string;
  amount: number;
  customerName: string;
  method: PaymentMethod;
  type: string;
}

interface MonetizationContextType {
  creator: CreatorProfile;
  products: DigitalProduct[];
  tiers: SubscriptionTier[];
  tipGoal: TipGoal;
  posts: GatedPost[];
  affiliates: AffiliatePartner[];
  coupons: DiscountCoupon[];
  transactions: Transaction[];
  withdrawals: WithdrawalRequest[];
  
  // Financial metrics
  totalGrossRevenue: number;
  totalNetRevenue: number;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  mrr: number;
  totalMembersCount: number;
  totalSalesCount: number;
  averageTicket: number;

  // Multi-currency support (BRL, USD, AOA, EUR)
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;

  // Real-time toast & sound
  activeToast: SalesToastNotification | null;
  clearActiveToast: () => void;
  soundActive: boolean;
  toggleSound: () => void;

  // Actions
  updateCreatorProfile: (profile: Partial<CreatorProfile>) => void;
  saveEncryptedCreatorSettings: (
    profileUpdates: Partial<CreatorProfile>,
    notifUpdates?: Partial<NotificationThresholdSettings>
  ) => Promise<{ success: boolean; error?: string }>;
  creatorVaultStatus: CreatorVaultSecurityStatus;
  encryptedCreatorEnvelope: StoredCreatorEnvelope | null;
  reencryptCreatorVault: (options?: {
    customPassphrase?: string;
    rotateDeviceKey?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  unlockCreatorVault: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
  lockCreatorVault: () => void;
  clearCustomVaultPassphrase: () => Promise<{ success: boolean; error?: string }>;
  syncCreatorVaultToDatabase: () => Promise<{ success: boolean; error?: string }>;
  addProduct: (product: Omit<DigitalProduct, 'id' | 'salesCount' | 'viewsCount' | 'rating' | 'ratingsCount'>) => void;
  updateProduct: (id: string, updates: Partial<DigitalProduct>) => void;
  deleteProduct: (id: string) => void;
  updateTier: (id: string, updates: Partial<SubscriptionTier>) => void;
  addTier: (tier: Omit<SubscriptionTier, 'id' | 'activeMembers'>) => void;
  deleteTier: (id: string) => void;
  updateTipGoal: (goal: Partial<TipGoal>) => void;
  contributeToGoal: (amount: number, supporterName?: string, message?: string) => void;
  addGatedPost: (post: Omit<GatedPost, 'id' | 'publishedAt' | 'likes' | 'reads' | 'unlockedUserEmails'>) => void;
  unlockPost: (postId: string, userEmail: string) => void;
  likePost: (postId: string) => void;
  addAffiliate: (partner: Omit<AffiliatePartner, 'id' | 'clicks' | 'salesCount' | 'totalEarned'>) => void;
  addCoupon: (coupon: DiscountCoupon) => void;
  updateCoupon: (originalCode: string, updates: Partial<DiscountCoupon>) => void;
  toggleCouponActive: (code: string) => void;
  deleteCoupon: (code: string) => void;
  validateCoupon: (code: string, productId?: string) => DiscountCoupon | null;

  // Transactions & Real Sales Checkout
  realOrders: RealSaleOrder[];
  gatewayReadiness: SalesGatewayReadiness | null;
  refreshSalesState: () => Promise<void>;
  syncRealOrderToLedger: (order: RealSaleOrder) => void;
  calculateCheckoutFee: (
    grossAmount: number,
    paymentMethod: PaymentMethod
  ) => { fee: number; netAmount: number };
  processCheckout: (params: {
    id?: string;
    type: 'product_sale' | 'subscription' | 'tip' | 'paywall_unlock' | 'in_app_purchase';
    itemId?: string;
    grossAmount: number;
    customerName: string;
    customerEmail: string;
    paymentMethod: PaymentMethod;
    status?: TransactionStatus;
    message?: string;
    affiliateCode?: string;
    couponCode?: string;
  }) => { success: boolean; transaction: Transaction };

  // Withdrawals
  requestWithdrawal: (params: {
    amount: number;
    destinationType: 'pix' | 'ted' | 'paypal' | 'visa_card' | 'express';
    destinationKey: string;
    visaDetails?: {
      holderName: string;
      last4: string;
    };
    expressDetails?: {
      phoneOrId: string;
      network?: string;
      bankName?: string;
      iban?: string;
      pspTransactionId?: string;
      pspProvider?: string;
      isLivePsp?: boolean;
      settlementStatus?: 'processing' | 'authorized' | 'credited';
    };
  }) => { success: boolean; error?: string; withdrawal?: WithdrawalRequest };

  reconcileExpressSettlement: (params: {
    pspTransactionId: string;
    reference?: string;
    status: 'pending' | 'credited' | 'failed';
  }) => void;

  // Live simulation
  simulateRandomSale: () => void;

  // Instant release / anticipation of pending balance
  releasePendingBalance: () => void;
  addInstantBalance: (amount?: number) => void;

  // In-App Purchases (Compras no Aplicativo)
  inAppFeatures: InAppFeature[];
  purchasedFeatureIds: string[];
  purchaseInAppFeature: (featureId: string, paymentMethod?: PaymentMethod) => { success: boolean; message: string };

  // Visa Direct Withdrawal Tracking & Real-Time Settlement
  settleVisaWithdrawalNow: (withdrawalId?: string) => { success: boolean; message: string };

  // Custom Balance Setter & Force Sync
  setCustomAvailableBalance: (targetAmount: number) => void;
  syncAndResetHealthyBalance: () => void;

  // Reviews & Feedback System
  reviews: TransactionReview[];
  addTransactionReview: (review: Omit<TransactionReview, 'id' | 'createdAt'>) => void;
  averageRating: number;
  totalReviewsCount: number;

  // Withdrawal & Minimum Balance Threshold Notification System
  notificationSettings: NotificationThresholdSettings;
  updateNotificationSettings: (settings: Partial<NotificationThresholdSettings>) => void;
  triggerNotificationTest: () => { success: boolean; message: string };
  activeBalanceAlert: BalanceAlertToastData | null;
  clearActiveBalanceAlert: () => void;
  triggerSimulatedBalanceAlert: (options?: {
    threshold?: number;
    channel?: NotificationChannelChoice;
    email?: string;
    force?: boolean;
  }) => { success: boolean; message: string; alertData: BalanceAlertToastData };

  // Notification History & Audit
  notificationHistory: SentNotificationAudit[];
  addNotificationAudit: (item: Omit<SentNotificationAudit, 'id' | 'timestamp' | 'displayTime' | 'authCode'>) => void;
  clearNotificationHistory: () => void;

  // Secure Payment Gateway Settings (Stripe & PayPal)
  gatewaySettings: PaymentGatewaySettings;
  updateGatewayConfig: (provider: GatewayProvider, updates: Partial<GatewayConfigItem>) => void;
  toggleGatewayMode: (provider: GatewayProvider) => void;
  isPaymentGatewayModalOpen: boolean;
  setIsPaymentGatewayModalOpen: (open: boolean) => void;
  simulateGatewayTransaction: (params: {
    provider: GatewayProvider;
    amount: number;
    cardEnding?: string;
    require3DS?: boolean;
  }) => { success: boolean; token: string; authCode: string; message: string };

  // Pending Transaction for Feedback Prompt
  pendingReviewTransaction: Transaction | null;
  setPendingReviewTransaction: (tx: Transaction | null) => void;

  // User Accounts & Showcase System
  currentUser: UserAccount;
  allUsers: UserAccount[];
  switchUser: (userId: string) => void;
  updateCurrentUserProfile: (updates: Partial<UserAccount>) => void;
  addShowcaseItemToUser: (userId: string, item: Omit<UserShowcaseItem, 'id' | 'salesCount'>) => void;
  updateShowcaseItem: (userId: string, itemId: string, updates: Partial<UserShowcaseItem>) => void;
  deleteShowcaseItem: (userId: string, itemId: string) => void;
  registerNewUserAccount: (data: { name: string; email: string; bio?: string; category?: string; role?: 'creator' | 'client' }) => UserAccount;

  // Advertising & Ads Management
  adSettings: AdSettings;
  updateAdSettings: (updates: Partial<AdSettings>) => void;
  adStats: AdStats;
  adNetworks: AdNetworkIntegration[];
  updateAdNetwork: (id: AdNetworkProviderId, updates: Partial<AdNetworkIntegration>) => void;
  toggleAdNetwork: (id: AdNetworkProviderId) => void;
  getWinningAdNetwork: (format: AdFormatType) => AdNetworkIntegration | null;
  recordAdEvent: (params: {
    networkId?: AdNetworkProviderId;
    format: AdFormatType;
    eventType: 'impression' | 'click' | 'rewarded_complete';
    placementId?: string;
    adId?: string;
    revenue?: number;
  }) => void;
  nativeAds: NativeAd[];
  adCampaigns: NativeAd[];
  addAdCampaign: (campaign: {
    sponsorName: string;
    badge?: string;
    title: string;
    description: string;
    ctaText: string;
    ctaUrl: string;
    category: string;
    format: AdCampaignFormat;
  }) => Promise<{ success: boolean; error?: string }>;
  updateAdCampaign: (id: string, updates: Partial<NativeAd>) => Promise<void>;
  toggleAdCampaignActive: (id: string) => Promise<void>;
  deleteAdCampaign: (id: string) => Promise<void>;
  adsTxtPreview: string;
  recentAdEvents: AdTelemetryEventRecord[];
  refreshAdsState: () => Promise<void>;
  saveAdConfigToServer: () => Promise<boolean>;
  isAdsRemoved: boolean;
  visitorAdFreePreview: boolean;
  setVisitorAdFreePreview: (val: boolean) => void;
  studioAdPreviewEnabled: boolean;
  setStudioAdPreviewEnabled: (val: boolean) => void;
  showAdsInStorefront: boolean;
  interstitialOpen: boolean;
  setInterstitialOpen: (open: boolean) => void;
  interstitialPreviewMode: boolean;
  setInterstitialPreviewMode: (val: boolean) => void;
  openInterstitialPreview: () => void;
  triggerInterstitialAd: (triggerReason?: string, options?: { isStorefront?: boolean }) => boolean;
  rewardedOpen: boolean;
  setRewardedOpen: (open: boolean) => void;
  claimRewardedAdReward: (rewardType?: 'balance' | 'vip_points', adId?: string) => { success: boolean; amount: number; message: string };
  recordAdClick: (adId: string, format?: AdFormatType, networkId?: AdNetworkProviderId) => void;

  // Multi-Model Monetization Config & Follower In-App Purchases
  monetizationModels: MonetizationModelsConfig;
  updateMonetizationModels: (updates: Partial<MonetizationModelsConfig>) => void;
  followerInAppItems: FollowerInAppItem[];
  addFollowerInAppItem: (item: Omit<FollowerInAppItem, 'id' | 'salesCount'>) => void;
  toggleFollowerInAppItem: (id: string) => void;
  deleteFollowerInAppItem: (id: string) => void;
  creatorAdRevenueShare: number;
  platformAdRevenueShare: number;

  // Price Point Experiments (A/B Pricing & Conversion Testing)
  priceExperiments: PriceExperiment[];
  createPriceExperiment: (params: {
    productId: string;
    variants: Array<{ label: string; price: number; isControl?: boolean }>;
  }) => { success: boolean; experiment?: PriceExperiment };
  togglePriceExperimentStatus: (experimentId: string) => void;
  simulatePriceExperimentTraffic: (experimentId: string, viewsPerVariant?: number) => void;
  applyExperimentWinningPrice: (experimentId: string, variantId: string) => { success: boolean; message: string };
  deletePriceExperiment: (experimentId: string) => void;

  // Badges & Conquistas do Criador
  badges: CreatorBadge[];
  claimBadgeReward: (badgeId: string) => { success: boolean; points: number; message: string };
  unlockedBadgesCount: number;
  totalBadgesCount: number;
  latestUnlockedBadge: CreatorBadge | null;
  isAchievementsModalOpen: boolean;
  setIsAchievementsModalOpen: (open: boolean) => void;

  // Onboarding Tour Guiado de Boas-Vindas
  isOnboardingTourOpen: boolean;
  setIsOnboardingTourOpen: (open: boolean) => void;
  startOnboardingTour: () => void;
  hasCompletedOnboarding: boolean;
  completeOnboardingTour: () => void;

  // 1. Metas Diárias (Daily Goals)
  dailyGoal: DailyGoal;
  updateDailyGoalTarget: (amount: number) => void;
  todayActualRevenue: number;

  // 1b. Metas Financeiras Mensais de Receita
  monthlyFinancialGoals: MonthlyRevenueGoal[];
  upsertMonthlyFinancialGoal: (goal: {
    id?: string;
    monthKey: string;
    title: string;
    targetAmount: number;
    basis: MonthlyRevenueBasis;
  }) => MonthlyRevenueGoal;
  deleteMonthlyFinancialGoal: (goalId: string) => void;

  // 2. Dicas de Inteligência Artificial (AI Conversion Advisor)
  aiTips: AITipItem[];
  aiSettings: AISettings;
  applyAITip: (tipId: string) => { success: boolean; message: string };
  dismissAITip: (tipId: string) => void;
  updateAISettings: (updates: Partial<AISettings>) => void;
  regenerateAITips: () => void;

  // 3. Despesas Financeiras & Receita Líquida Real (Expenses & Real Net Profit)
  expenses: FinancialExpense[];
  totalGatewayFees: number;
  totalMarketingExpenses: number;
  totalOperationalExpenses: number;
  realNetProfit: number;
  netProfitMargin: number;
  addExpense: (expense: Omit<FinancialExpense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  updateExpense: (id: string, updates: Partial<FinancialExpense>) => void;
  isExpensesModalOpen: boolean;
  setIsExpensesModalOpen: (open: boolean) => void;

  // 4. Análise de Usuário (Engajamento, Retenção, Conversão, Uso & Métricas ao Vivo)
  userAnalytics: UserAnalyticsData;
  analyticsOverview: AnalyticsOverviewPayload | null;
  analyticsWindow: AnalyticsWindow;
  setAnalyticsWindow: (win: AnalyticsWindow) => void;
  isAnalyticsLoading: boolean;
  refreshAnalyticsOverview: (overrideWin?: AnalyticsWindow) => Promise<void>;
  trackAnalyticsEvent: (event: Omit<Partial<AnalyticsEventRecord>, 'id' | 'timestamp'>) => Promise<void>;

  // 4b. Assistente de Voz em Tempo Real (Gemini Live API)
  isLiveVoiceOpen: boolean;
  setIsLiveVoiceOpen: (open: boolean) => void;

  // 4c. Sistema de Recompensas no Aplicativo (MonetiCoins, Ações Recompensadas & Catálogo)
  monetiCoins: number;
  rewardXp: number;
  rewardTier: RewardTierLevel;
  rewardStreakDays: number;
  lastDailyCheckinDate: string | null;
  rewardActions: RewardActionRule[];
  rewardCatalog: RewardCatalogItem[];
  rewardHistory: RewardTransactionRecord[];
  redeemedRewardIds: string[];
  unlockedRewardPerks: string[];
  performDailyCheckin: () => { success: boolean; coinsAwarded: number; message: string };
  awardActionReward: (
    actionId: RewardActionId,
    customLabel?: string
  ) => { success: boolean; coinsAwarded: number; xpAwarded: number };
  redeemRewardItem: (rewardId: string) => { success: boolean; message: string };

  // 4d. Preferência de Tema da Interface (Claro / Escuro / Sistema)
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setThemePreference: (pref: ThemePreference) => void;

  // 5. Modelo de Assinatura do Aplicativo (MonetizaHub Pro & Ultra Premium Subscription)
  appSubscription: AppSubscription;
  isAppSubscriptionModalOpen: boolean;
  setIsAppSubscriptionModalOpen: (open: boolean) => void;
  subscribeToAppPlan: (params: {
    tier: AppSubscriptionTier;
    billingCycle: AppBillingCycle;
    paymentMethod: PaymentMethod;
    cardLast4?: string;
  }) => { success: boolean; message: string };
  cancelAppSubscription: () => void;
  changeAppSubscriptionCycle: (cycle: AppBillingCycle) => void;

  // 6. Admin Control Panel & Platform Governance
  platformAdminSettings: PlatformAdminSettings;
  updatePlatformAdminSettings: (updates: Partial<PlatformAdminSettings>) => void;
  adminAuditLogs: AdminAuditLogItem[];
  addAdminAuditLog: (item: Omit<AdminAuditLogItem, 'id' | 'timestamp'>) => void;
  adminUpdateUser: (userId: string, updates: Partial<UserAccount>) => void;
  adminCreateUser: (data: {
    name: string;
    email: string;
    role: 'creator' | 'client' | 'admin';
    category?: string;
    kycVerified?: boolean;
  }) => UserAccount;
  adminDeleteUser: (userId: string) => void;
  adminUpdateTransactionStatus: (txId: string, status: TransactionStatus) => void;
  adminUpdateWithdrawalStatus: (
    wdId: string,
    status: WithdrawalRequest['status'],
    reason?: string
  ) => void;
  adminUpdateGatedPost: (postId: string, updates: Partial<GatedPost>) => void;
  adminDeleteGatedPost: (postId: string) => void;
  adminToggleProductVisibility: (productId: string) => void;
  adminToggleProductFeatured: (productId: string) => void;
}

const MonetizationContext = createContext<MonetizationContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'monetiza_hub_v1_';

export const MonetizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isCreatorVaultHydratedRef = useRef<boolean>(false);
  const pendingEncryptedEnvelopeRef = useRef<StoredCreatorEnvelope | null>(null);
  const customVaultPassphraseRef = useRef<string | undefined>(undefined);
  const isNotificationVaultHydratedRef = useRef<boolean>(false);
  const pendingNotificationEnvelopeRef = useRef<{
    encryptedDestinationEmail: Aes256EncryptedPayload;
  } | null>(null);

  // Creator Profile (loaded safely from encrypted envelope or legacy plaintext for migration)
  const [creator, setCreator] = useState<CreatorProfile>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}creator`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (isStoredCreatorEnvelope(parsed)) {
          pendingEncryptedEnvelopeRef.current = parsed;
          return parsed.maskedProfile;
        }
        if (parsed && typeof parsed === 'object' && parsed.name) {
          return parsed as CreatorProfile;
        }
      } catch {
        // Fallback
      }
    }
    return initialCreatorProfile;
  });

  const latestCreatorRef = useRef<CreatorProfile>(creator);
  useEffect(() => {
    latestCreatorRef.current = creator;
  }, [creator]);

  const [encryptedCreatorEnvelope, setEncryptedCreatorEnvelope] =
    useState<StoredCreatorEnvelope | null>(() => pendingEncryptedEnvelopeRef.current);

  const [creatorVaultStatus, setCreatorVaultStatus] = useState<CreatorVaultSecurityStatus>(() => ({
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    keyFingerprint: pendingEncryptedEnvelopeRef.current?.encryptedVault.keyFingerprint || 'SHA256:INICIAL',
    encryptedFields:
      pendingEncryptedEnvelopeRef.current?.encryptedVault.encryptedFields ||
      ENCRYPTED_SENSITIVE_FIELD_LABELS,
    lastEncryptedAt: pendingEncryptedEnvelopeRef.current?.encryptedVault.encryptedAt || null,
    localEncrypted: Boolean(pendingEncryptedEnvelopeRef.current),
    databaseSynced: false,
    databaseStoredAt: null,
    serverStorageInfo: null,
    hasCustomPassphrase: Boolean(
      pendingEncryptedEnvelopeRef.current?.encryptedVault.requiresCustomPassphrase
    ),
    locked: Boolean(pendingEncryptedEnvelopeRef.current?.encryptedVault.requiresCustomPassphrase),
    lastError: null,
  }));

  // Digital Products
  const [products, setProducts] = useState<DigitalProduct[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}products`);
    return saved ? JSON.parse(saved) : initialProducts;
  });

  // Subscription Tiers
  const [tiers, setTiers] = useState<SubscriptionTier[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}tiers`);
    return saved ? JSON.parse(saved) : initialSubscriptionTiers;
  });

  // Tip Goal
  const [tipGoal, setTipGoal] = useState<TipGoal>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}tipGoal`);
    return saved ? JSON.parse(saved) : initialTipGoal;
  });

  // Gated Content (Paywall)
  const [posts, setPosts] = useState<GatedPost[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}posts`);
    return saved ? JSON.parse(saved) : initialGatedPosts;
  });

  // Affiliates
  const [affiliates, setAffiliates] = useState<AffiliatePartner[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}affiliates`);
    return saved ? JSON.parse(saved) : initialAffiliates;
  });

  // Coupons
  const [coupons, setCoupons] = useState<DiscountCoupon[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}coupons`);
    return saved ? JSON.parse(saved) : initialCoupons;
  });

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}transactions`);
    if (saved) {
      try {
        const parsed: Transaction[] = JSON.parse(saved);
        // Sanity check: Ensure total net revenue is healthy and exceeds historical withdrawals
        const totalNet = parsed.reduce((sum, t) => sum + (t.status === 'approved' ? (t.netAmount || 0) : 0), 0);
        if (totalNet >= 10000) {
          return parsed;
        }
      } catch {
        // Fallback to initial
      }
    }
    return initialTransactions;
  });

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}withdrawals`);
    if (saved) {
      try {
        const parsed: WithdrawalRequest[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasAllStatuses =
            parsed.some((w) => w.status === 'failed' || w.status === 'reversed');
          if (!hasAllStatuses && parsed.every((w) => ['wd-001', 'wd-002', 'wd-003'].includes(w.id))) {
            return initialWithdrawals;
          }
          return parsed;
        }
      } catch {
        // Fallback to initialWithdrawals
      }
    }
    return initialWithdrawals;
  });

  // Selected Currency (BRL, USD, AOA, EUR)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}currency`);
    return (saved as Currency) || 'BRL';
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}currency`, selectedCurrency);
  }, [selectedCurrency]);

  // In-App Features & Purchased Upgrades
  const inAppFeatures: InAppFeature[] = initialInAppFeatures;
  const [purchasedFeatureIds, setPurchasedFeatureIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}purchased_features`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}purchased_features`, JSON.stringify(purchasedFeatureIds));
  }, [purchasedFeatureIds]);

  // Ads & Publicidade (Intersticiais, Recompensados, Nativos)
  const [adSettings, setAdSettings] = useState<AdSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}ad_settings`);
    return saved ? { ...initialAdSettings, ...JSON.parse(saved) } : initialAdSettings;
  });

  // Multi-Model Monetization Configuration & Follower In-App Purchases
  const [monetizationModels, setMonetizationModels] = useState<MonetizationModelsConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}models_config`);
    return saved ? { ...initialMonetizationModelsConfig, ...JSON.parse(saved) } : initialMonetizationModelsConfig;
  });

  const [followerInAppItems, setFollowerInAppItems] = useState<FollowerInAppItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}follower_iap`);
    return saved ? JSON.parse(saved) : initialFollowerInAppItems;
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}models_config`, JSON.stringify(monetizationModels));
  }, [monetizationModels]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}follower_iap`, JSON.stringify(followerInAppItems));
  }, [followerInAppItems]);

  const updateMonetizationModels = (updates: Partial<MonetizationModelsConfig>) => {
    setMonetizationModels((prev) => ({ ...prev, ...updates }));
  };

  const addFollowerInAppItem = (itemData: Omit<FollowerInAppItem, 'id' | 'salesCount'>) => {
    const newItem: FollowerInAppItem = {
      ...itemData,
      id: `fiap-${Date.now().toString().slice(-6)}`,
      salesCount: 0,
    };
    setFollowerInAppItems((prev) => [newItem, ...prev]);
    playSuccessSound();
  };

  const toggleFollowerInAppItem = (id: string) => {
    setFollowerInAppItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const deleteFollowerInAppItem = (id: string) => {
    setFollowerInAppItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Price Point Experiments (A/B Pricing & Conversion Comparison)
  const [priceExperiments, setPriceExperiments] = useState<PriceExperiment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}price_experiments`);
    return saved ? JSON.parse(saved) : initialPriceExperiments;
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}price_experiments`, JSON.stringify(priceExperiments));
  }, [priceExperiments]);

  const createPriceExperiment = ({
    productId,
    variants,
  }: {
    productId: string;
    variants: Array<{ label: string; price: number; isControl?: boolean }>;
  }) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || variants.length < 2) {
      return { success: false };
    }

    const baseRate = prod.viewsCount > 0 ? Math.min(0.25, Math.max(0.02, prod.salesCount / prod.viewsCount)) : 0.06;
    const controlPrice = prod.price || variants[0].price || 1;
    const splitPct = Math.round(100 / variants.length);
    const splitLabel =
      variants.length === 2
        ? '50% / 50%'
        : variants.map((_, idx) => `${idx === variants.length - 1 ? 100 - splitPct * (variants.length - 1) : splitPct}%`).join(' / ');

    const seededVariants: PriceExperimentVariant[] = variants.map((v, idx) => {
      const initialViews = 120 + Math.floor(Math.random() * 40);
      const priceRatio = controlPrice / Math.max(1, v.price);
      // Price elasticity model: lower price increases conversion moderately, higher price slightly reduces conversion
      const elasticityRate = Math.min(0.35, Math.max(0.015, baseRate * Math.pow(priceRatio, 0.72)));
      const initialConversions = Math.max(1, Math.round(initialViews * elasticityRate));
      return {
        id: `var-${Date.now().toString().slice(-5)}-${idx}`,
        label: v.label,
        price: Number(v.price.toFixed(2)),
        views: initialViews,
        conversions: initialConversions,
        isControl: v.isControl ?? idx === 0,
      };
    });

    const newExperiment: PriceExperiment = {
      id: `exp-${Date.now().toString().slice(-6)}`,
      productId: prod.id,
      productTitle: prod.title,
      status: 'running',
      createdAt: new Date().toISOString(),
      trafficSplitLabel: splitLabel,
      variants: seededVariants,
    };

    setPriceExperiments((prev) => [newExperiment, ...prev]);
    playSuccessSound();
    return { success: true, experiment: newExperiment };
  };

  const togglePriceExperimentStatus = (experimentId: string) => {
    setPriceExperiments((prev) =>
      prev.map((exp) =>
        exp.id === experimentId
          ? {
              ...exp,
              status: exp.status === 'running' ? 'paused' : 'running',
            }
          : exp
      )
    );
  };

  const simulatePriceExperimentTraffic = (experimentId: string, viewsPerVariant = 100) => {
    setPriceExperiments((prev) =>
      prev.map((exp) => {
        if (exp.id !== experimentId) return exp;
        const control = exp.variants.find((v) => v.isControl) || exp.variants[0];
        const controlRate =
          control && control.views > 0 ? control.conversions / control.views : 0.07;

        const updatedVariants = exp.variants.map((variant) => {
          const priceRatio = (control?.price || variant.price) / Math.max(1, variant.price);
          const expectedRate = Math.min(
            0.35,
            Math.max(0.01, controlRate * Math.pow(priceRatio, 0.75) * (0.94 + Math.random() * 0.14))
          );
          const addedViews = viewsPerVariant + Math.floor(Math.random() * 15);
          const addedConversions = Math.max(0, Math.round(addedViews * expectedRate));
          return {
            ...variant,
            views: variant.views + addedViews,
            conversions: variant.conversions + addedConversions,
          };
        });

        return {
          ...exp,
          variants: updatedVariants,
        };
      })
    );
    playCashSound();
  };

  const applyExperimentWinningPrice = (experimentId: string, variantId: string) => {
    const exp = priceExperiments.find((e) => e.id === experimentId);
    const variant = exp?.variants.find((v) => v.id === variantId);
    if (!exp || !variant) {
      return { success: false, message: 'Experimento ou variante não encontrada.' };
    }

    updateProduct(exp.productId, { price: variant.price });
    setPriceExperiments((prev) =>
      prev.map((item) =>
        item.id === experimentId
          ? { ...item, status: 'completed', appliedVariantId: variantId }
          : item
      )
    );
    playSuccessSound();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.65 } });
    return {
      success: true,
      message: `Novo preço (${variant.price.toFixed(2)}) aplicado ao produto "${exp.productTitle}"!`,
    };
  };

  const deletePriceExperiment = (experimentId: string) => {
    setPriceExperiments((prev) => prev.filter((exp) => exp.id !== experimentId));
  };

  const [adStats, setAdStats] = useState<AdStats>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}ad_stats`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AdStats;
        return {
          ...initialAdStats,
          ...parsed,
          byFormat: {
            banner: parsed.byFormat?.banner || initialAdStats.byFormat!.banner,
            interstitial: parsed.byFormat?.interstitial || initialAdStats.byFormat!.interstitial,
            rewarded_video: parsed.byFormat?.rewarded_video || initialAdStats.byFormat!.rewarded_video,
            native: parsed.byFormat?.native || initialAdStats.byFormat!.native,
          },
        };
      } catch {
        return initialAdStats;
      }
    }
    return initialAdStats;
  });

  const [adNetworks, setAdNetworks] = useState<AdNetworkIntegration[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}ad_networks`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AdNetworkIntegration[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback to initialAdNetworks
      }
    }
    return initialAdNetworks;
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}ad_networks`, JSON.stringify(adNetworks));
  }, [adNetworks]);

  const creatorAdRevenueShare = useMemo(() => {
    return Number(((adStats.adRevenue * monetizationModels.adRevenueShareCreatorPct) / 100).toFixed(2));
  }, [adStats.adRevenue, monetizationModels.adRevenueShareCreatorPct]);

  const platformAdRevenueShare = useMemo(() => {
    return Number(Math.max(0, adStats.adRevenue - creatorAdRevenueShare).toFixed(2));
  }, [adStats.adRevenue, creatorAdRevenueShare]);

  const [adCampaigns, setAdCampaigns] = useState<NativeAd[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}ad_campaigns`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as NativeAd[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback
      }
    }
    return initialNativeAds.map((ad) => ({
      ...ad,
      format: ad.format || 'both',
      active: ad.active !== false,
      impressions: ad.impressions ?? 0,
      clicks: ad.clicks ?? 0,
    }));
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}ad_campaigns`, JSON.stringify(adCampaigns));
  }, [adCampaigns]);

  const [adsTxtPreview, setAdsTxtPreview] = useState<string>(
    '# MonetizaHub Authorized Digital Sellers (ads.txt)\ngoogle.com, pub-7410293847561029, DIRECT, f08c47fec0942fa0\n'
  );
  const [recentAdEvents, setRecentAdEvents] = useState<AdTelemetryEventRecord[]>([]);
  const adsHydratedRef = useRef(false);

  const [visitorAdFreePreview, setVisitorAdFreePreview] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}visitor_ad_free`) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}visitor_ad_free`, String(visitorAdFreePreview));
  }, [visitorAdFreePreview]);

  const [studioAdPreviewEnabled, setStudioAdPreviewEnabled] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}studio_ad_preview`) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}studio_ad_preview`, String(studioAdPreviewEnabled));
  }, [studioAdPreviewEnabled]);

  const [interstitialOpen, setInterstitialOpen] = useState(false);
  const [interstitialPreviewMode, setInterstitialPreviewMode] = useState(false);
  const [rewardedOpen, setRewardedOpen] = useState(false);
  const [lastInterstitialTime, setLastInterstitialTime] = useState<number>(0);

  // MonetizaHub App Premium Subscription (Pro & Ultra)
  const [appSubscription, setAppSubscription] = useState<AppSubscription>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}app_subscription`);
    return saved ? JSON.parse(saved) : initialAppSubscription;
  });
  const [isAppSubscriptionModalOpen, setIsAppSubscriptionModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}app_subscription`, JSON.stringify(appSubscription));
  }, [appSubscription]);

  const isAdsRemoved = useMemo(() => {
    const hasInAppFeature = purchasedFeatureIds.includes('remove_ads');
    const hasActiveSubscription =
      appSubscription.status === 'active' && appSubscription.tier !== 'free';
    return hasInAppFeature || hasActiveSubscription;
  }, [purchasedFeatureIds, appSubscription]);

  const showAdsInStorefront = useMemo(() => {
    return monetizationModels.adsEnabled && !visitorAdFreePreview;
  }, [monetizationModels.adsEnabled, visitorAdFreePreview]);

  const refreshAdsState = async () => {
    try {
      const resp = await fetch('/api/ads/mediation');
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
        setAdCampaigns(data.campaigns);
      }
      if (typeof data.adsTxtPreview === 'string') {
        setAdsTxtPreview(data.adsTxtPreview);
      }
      if (Array.isArray(data.recentEvents)) {
        setRecentAdEvents(data.recentEvents);
      }
      if (data.byFormat) {
        const bf = data.byFormat as Record<AdFormatType, { impressions: number; clicks: number; revenue: number }>;
        const totalImpr = Object.values(bf).reduce((sum, item) => sum + (item?.impressions || 0), 0);
        const totalClicks = Object.values(bf).reduce((sum, item) => sum + (item?.clicks || 0), 0);
        const totalRev = Number(Object.values(bf).reduce((sum, item) => sum + (item?.revenue || 0), 0).toFixed(2));
        const rewardedImpr = bf.rewarded_video?.impressions || 0;
        const formatEcpm = (rev: number, impr: number) =>
          impr > 0 ? Number(((rev / impr) * 1000).toFixed(2)) : 0;

        setAdStats((prev) => ({
          impressions: Math.max(prev.impressions, totalImpr),
          clicks: Math.max(prev.clicks, totalClicks),
          rewardedCompleted: Math.max(prev.rewardedCompleted, Math.round(rewardedImpr * 0.11)),
          adRevenue: Math.max(prev.adRevenue, totalRev),
          ecpm:
            Math.max(prev.impressions, totalImpr) > 0
              ? Number(
                  (
                    (Math.max(prev.adRevenue, totalRev) / Math.max(prev.impressions, totalImpr)) *
                    1000
                  ).toFixed(2)
                )
              : prev.ecpm,
          byFormat: {
            banner: {
              ...(bf.banner || prev.byFormat!.banner),
              ecpm: formatEcpm(bf.banner?.revenue || 0, bf.banner?.impressions || 0),
            },
            interstitial: {
              ...(bf.interstitial || prev.byFormat!.interstitial),
              ecpm: formatEcpm(bf.interstitial?.revenue || 0, bf.interstitial?.impressions || 0),
            },
            rewarded_video: {
              ...(bf.rewarded_video || prev.byFormat!.rewarded_video),
              ecpm: formatEcpm(bf.rewarded_video?.revenue || 0, bf.rewarded_video?.impressions || 0),
            },
            native: {
              ...(bf.native || prev.byFormat!.native),
              ecpm: formatEcpm(bf.native?.revenue || 0, bf.native?.impressions || 0),
            },
          },
        }));
      }
      if (data.byNetwork) {
        const bn = data.byNetwork as Record<string, { impressions: number; clicks: number; revenue: number }>;
        setAdNetworks((prev) =>
          prev.map((net) => {
            const serverNet = data.config?.networks?.find((sn: AdNetworkIntegration) => sn.id === net.id);
            const metrics = bn[net.id];
            return {
              ...net,
              ...(serverNet
                ? {
                    enabled: serverNet.enabled,
                    appOrPublisherId: serverNet.appOrPublisherId,
                    unitSlots: serverNet.unitSlots,
                  }
                : {}),
              ...(metrics
                ? {
                    impressions: Math.max(net.impressions, metrics.impressions),
                    clicks: Math.max(net.clicks, metrics.clicks),
                    revenue: Math.max(net.revenue, metrics.revenue),
                  }
                : {}),
            };
          })
        );
      }
      adsHydratedRef.current = true;
    } catch {
      adsHydratedRef.current = true;
    }
  };

  useEffect(() => {
    refreshAdsState();
  }, []);

  const saveAdConfigToServer = async (): Promise<boolean> => {
    try {
      const resp = await fetch('/api/ads/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adsEnabled: monetizationModels.adsEnabled,
          adRevenueShareCreatorPct: monetizationModels.adRevenueShareCreatorPct,
          adPlacementMode: monetizationModels.adPlacementMode,
          adSettings,
          networks: adNetworks,
        }),
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      if (typeof data.adsTxtPreview === 'string') {
        setAdsTxtPreview(data.adsTxtPreview);
      }
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!adsHydratedRef.current) return;
    const timer = setTimeout(() => {
      saveAdConfigToServer();
    }, 600);
    return () => clearTimeout(timer);
  }, [
    adNetworks,
    adSettings,
    monetizationModels.adsEnabled,
    monetizationModels.adRevenueShareCreatorPct,
    monetizationModels.adPlacementMode,
  ]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}ad_settings`, JSON.stringify(adSettings));
  }, [adSettings]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}ad_stats`, JSON.stringify(adStats));
  }, [adStats]);

  const updateAdSettings = (updates: Partial<AdSettings>) => {
    setAdSettings((prev) => ({ ...prev, ...updates }));
  };

  const updateAdNetwork = (id: AdNetworkProviderId, updates: Partial<AdNetworkIntegration>) => {
    setAdNetworks((prev) =>
      prev.map((net) =>
        net.id === id
          ? {
              ...net,
              ...updates,
              unitSlots: updates.unitSlots ? { ...net.unitSlots, ...updates.unitSlots } : net.unitSlots,
            }
          : net
      )
    );
  };

  const toggleAdNetwork = (id: AdNetworkProviderId) => {
    setAdNetworks((prev) =>
      prev.map((net) => (net.id === id ? { ...net, enabled: !net.enabled } : net))
    );
  };

  const getWinningAdNetwork = (format: AdFormatType): AdNetworkIntegration | null => {
    const eligible = adNetworks.filter((net) => {
      if (!net.enabled || !net.supportedFormats.includes(format)) return false;
      if (format === 'banner') return Boolean(net.unitSlots.bannerPlacementId.trim());
      if (format === 'interstitial') return Boolean(net.unitSlots.interstitialPlacementId.trim());
      if (format === 'rewarded_video') return Boolean(net.unitSlots.rewardedPlacementId.trim());
      return Boolean(net.unitSlots.nativePlacementId?.trim() || net.unitSlots.bannerPlacementId.trim());
    });
    if (eligible.length === 0) return null;
    const strategy = adSettings.mediationStrategy || 'highest_ecpm';
    const sorted = [...eligible].sort((a, b) =>
      strategy === 'waterfall' ? a.priority - b.priority : b.ecpmFloor - a.ecpmFloor
    );
    return sorted[0];
  };

  const addAdCampaign = async (campaignData: {
    sponsorName: string;
    badge?: string;
    title: string;
    description: string;
    ctaText: string;
    ctaUrl: string;
    category: string;
    format: AdCampaignFormat;
  }): Promise<{ success: boolean; error?: string }> => {
    const sponsorName = campaignData.sponsorName.trim();
    const title = campaignData.title.trim();
    if (!sponsorName || !title) {
      return { success: false, error: 'Informe patrocinador e título do anúncio.' };
    }
    try {
      const resp = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        return { success: false, error: data.error || 'Erro ao criar campanha.' };
      }
      if (Array.isArray(data.campaigns)) {
        setAdCampaigns(data.campaigns);
      } else if (data.campaign) {
        setAdCampaigns((prev) => [data.campaign, ...prev]);
      }
      playSuccessSound();
      return { success: true };
    } catch {
      const fallbackCampaign: NativeAd = {
        id: `ad-${Date.now()}`,
        sponsorName,
        sponsorLogo: '',
        badge: campaignData.badge || 'Patrocinado',
        title,
        description: campaignData.description.trim(),
        ctaText: campaignData.ctaText.trim() || 'Saiba Mais',
        ctaUrl: campaignData.ctaUrl.trim() || 'https://monetizahub.app',
        bannerUrl: '',
        category: campaignData.category.trim() || 'Patrocinador Direto',
        rating: 4.9,
        format: campaignData.format,
        active: true,
        impressions: 0,
        clicks: 0,
        createdAt: new Date().toISOString(),
      };
      setAdCampaigns((prev) => [fallbackCampaign, ...prev]);
      return { success: true };
    }
  };

  const updateAdCampaign = async (id: string, updates: Partial<NativeAd>) => {
    setAdCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    try {
      const resp = await fetch(`/api/ads/campaigns/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.campaigns)) {
        setAdCampaigns(data.campaigns);
      }
    } catch {
      // Local state already updated
    }
  };

  const toggleAdCampaignActive = async (id: string) => {
    const current = adCampaigns.find((c) => c.id === id);
    if (!current) return;
    const nextActive = current.active === false;
    await updateAdCampaign(id, { active: nextActive });
  };

  const deleteAdCampaign = async (id: string) => {
    setAdCampaigns((prev) => prev.filter((c) => c.id !== id));
    try {
      const resp = await fetch(`/api/ads/campaigns/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.campaigns)) {
        setAdCampaigns(data.campaigns);
      }
    } catch {
      // Local state already updated
    }
  };

  const recordAdEvent = (params: {
    networkId?: AdNetworkProviderId;
    format: AdFormatType;
    eventType: 'impression' | 'click' | 'rewarded_complete';
    placementId?: string;
    adId?: string;
    revenue?: number;
  }) => {
    const winning = params.networkId
      ? adNetworks.find((n) => n.id === params.networkId) || getWinningAdNetwork(params.format)
      : getWinningAdNetwork(params.format);
    const activeNetworkId: AdNetworkProviderId = winning?.id || 'google_admob';

    const defaultRev: Record<string, number> = {
      'banner:impression': 0.015,
      'banner:click': 0.22,
      'interstitial:impression': 0.15,
      'interstitial:click': 0.35,
      'rewarded_video:impression': 0.12,
      'rewarded_video:rewarded_complete': 0.45,
      'rewarded_video:click': 0.4,
      'native:impression': 0.04,
      'native:click': 0.3,
    };

    const revenueDelta =
      typeof params.revenue === 'number' && Number.isFinite(params.revenue)
        ? params.revenue
        : defaultRev[`${params.format}:${params.eventType}`] ?? 0.05;

    setAdStats((prev) => {
      const nextImpressions =
        prev.impressions + (params.eventType === 'impression' || params.eventType === 'rewarded_complete' ? 1 : 0);
      const nextClicks = prev.clicks + (params.eventType === 'click' ? 1 : 0);
      const nextRewarded =
        prev.rewardedCompleted + (params.eventType === 'rewarded_complete' ? 1 : 0);
      const nextRevenue = Number((prev.adRevenue + revenueDelta).toFixed(2));
      const nextEcpm =
        nextImpressions > 0 ? Number(((nextRevenue / nextImpressions) * 1000).toFixed(2)) : prev.ecpm;

      const currentByFormat = prev.byFormat || initialAdStats.byFormat!;
      const prevFmt = currentByFormat[params.format];
      const nextFmtImpr =
        prevFmt.impressions + (params.eventType === 'impression' || params.eventType === 'rewarded_complete' ? 1 : 0);
      const nextFmtClicks = prevFmt.clicks + (params.eventType === 'click' ? 1 : 0);
      const nextFmtRev = Number((prevFmt.revenue + revenueDelta).toFixed(2));
      const nextFmtEcpm =
        nextFmtImpr > 0 ? Number(((nextFmtRev / nextFmtImpr) * 1000).toFixed(2)) : prevFmt.ecpm;

      return {
        impressions: nextImpressions,
        clicks: nextClicks,
        rewardedCompleted: nextRewarded,
        adRevenue: nextRevenue,
        ecpm: nextEcpm,
        byFormat: {
          ...currentByFormat,
          [params.format]: {
            impressions: nextFmtImpr,
            clicks: nextFmtClicks,
            revenue: nextFmtRev,
            ecpm: nextFmtEcpm,
          },
        },
      };
    });

    setAdNetworks((prev) =>
      prev.map((net) => {
        if (net.id !== activeNetworkId) return net;
        const imprDelta = params.eventType === 'impression' || params.eventType === 'rewarded_complete' ? 1 : 0;
        const clickDelta = params.eventType === 'click' ? 1 : 0;
        return {
          ...net,
          impressions: net.impressions + imprDelta,
          clicks: net.clicks + clickDelta,
          revenue: Number((net.revenue + revenueDelta).toFixed(2)),
        };
      })
    );

    if (params.adId) {
      setAdCampaigns((prev) =>
        prev.map((camp) => {
          if (camp.id !== params.adId) return camp;
          return {
            ...camp,
            impressions: (camp.impressions || 0) + (params.eventType === 'impression' ? 1 : 0),
            clicks: (camp.clicks || 0) + (params.eventType === 'click' ? 1 : 0),
          };
        })
      );
    }

    const optimisticEvent: AdTelemetryEventRecord = {
      id: `adev-local-${Date.now()}`,
      timestamp: new Date().toISOString(),
      networkId: activeNetworkId,
      format: params.format,
      eventType: params.eventType,
      placementId: params.placementId,
      adId: params.adId,
      revenue: revenueDelta,
    };
    setRecentAdEvents((prev) => [optimisticEvent, ...prev].slice(0, 40));

    fetch('/api/ads/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        networkId: activeNetworkId,
        format: params.format,
        eventType: params.eventType,
        placementId: params.placementId,
        adId: params.adId,
        revenue: revenueDelta,
      }),
    }).catch(() => {
      // Offline / dev safeguard: local state already updated
    });

    void trackAnalyticsEvent({
      category: params.eventType === 'impression' ? 'engagement' : 'revenue',
      eventType:
        params.eventType === 'click'
          ? 'ad_click'
          : params.eventType === 'rewarded_complete'
          ? 'rewarded_complete'
          : 'ad_impression',
      source: 'ads',
      screenOrTab: params.placementId || 'ads',
      revenueSource: 'ads',
      amountBRL: revenueDelta,
      metadata: {
        format: params.format,
        networkId: activeNetworkId,
      },
    });
  };

  const openInterstitialPreview = () => {
    setInterstitialPreviewMode(true);
    setInterstitialOpen(true);
    const winner = getWinningAdNetwork('interstitial');
    recordAdEvent({
      networkId: winner?.id,
      format: 'interstitial',
      eventType: 'impression',
      placementId: winner?.unitSlots.interstitialPlacementId,
      revenue: 0.15,
    });
  };

  const triggerInterstitialAd = (
    _triggerReason?: string,
    options?: { isStorefront?: boolean }
  ): boolean => {
    const canShowHere = options?.isStorefront
      ? showAdsInStorefront
      : !isAdsRemoved || studioAdPreviewEnabled;
    if (!canShowHere || !monetizationModels.adsEnabled || !adSettings.interstitialEnabled) {
      return false;
    }
    const now = Date.now();
    const cooldownMs = Math.max(20, (adSettings.frequencyMinutes || 1) * 20) * 1000;
    if (now - lastInterstitialTime < cooldownMs) return false;
    setLastInterstitialTime(now);
    setInterstitialPreviewMode(Boolean(options?.isStorefront));
    setInterstitialOpen(true);
    const winner = getWinningAdNetwork('interstitial');
    recordAdEvent({
      networkId: winner?.id,
      format: 'interstitial',
      eventType: 'impression',
      placementId: winner?.unitSlots.interstitialPlacementId,
      revenue: 0.15,
    });
    return true;
  };

  const claimRewardedAdReward = (_rewardType: 'balance' | 'vip_points' = 'balance', adId?: string) => {
    const rewardCash = 5.0; // R$ 5,00 reward
    const winner = getWinningAdNetwork('rewarded_video');
    const networkLabel = winner?.name || 'Google AdMob';

    const rewardTx: Transaction = {
      id: `tx-reward-${Date.now()}`,
      type: 'tip',
      title: 'Recompensa por Vídeo Premiado',
      customerName: networkLabel,
      customerEmail: 'ad-rewards@monetizahub.io',
      grossAmount: rewardCash,
      fee: 0,
      netAmount: rewardCash,
      paymentMethod: 'pix',
      status: 'approved',
      cleared: true,
      createdAt: new Date().toISOString(),
      message: `Recompensa creditada via ${networkLabel} no Saldo Disponível para saque.`,
    };
    setTransactions((prev) => [rewardTx, ...prev]);

    recordAdEvent({
      networkId: winner?.id,
      format: 'rewarded_video',
      eventType: 'rewarded_complete',
      placementId: winner?.unitSlots.rewardedPlacementId,
      adId,
      revenue: 0.45,
    });

    confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    playSuccessSound();

    setActiveToast({
      id: `toast-${Date.now()}`,
      title: 'Recompensa de Vídeo Resgatada!',
      amount: rewardCash,
      customerName: networkLabel,
      method: 'pix',
      type: 'Recompensa em Saldo Real',
    });

    awardActionReward('rewarded_video_watched', `Vídeo Premiado (${networkLabel})`);

    return {
      success: true,
      amount: rewardCash,
      message: `Você recebeu R$ ${rewardCash.toFixed(2)} direto no seu Saldo Disponível e +40 MonetiCoins!`,
    };
  };

  const recordAdClick = (adId: string, format: AdFormatType = 'native', networkId?: AdNetworkProviderId) => {
    const winner = networkId
      ? adNetworks.find((n) => n.id === networkId)
      : getWinningAdNetwork(format);
    recordAdEvent({
      networkId: winner?.id,
      format,
      eventType: 'click',
      adId,
      revenue: 0.3,
    });
  };

  // User Accounts & Showcase System
  const [allUsers, setAllUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_users`);
    if (saved) {
      try {
        const parsed: UserAccount[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((u) => ({
            ...u,
            status: u.status || 'active',
            kycVerified: u.kycVerified ?? true,
          }));
          const existingIds = new Set(normalized.map((u) => u.id));
          if (
            normalized.every((u) => ['usr-amidel', 'usr-lucas', 'usr-carla'].includes(u.id))
          ) {
            const extra = initialUsers.filter((u) => !existingIds.has(u.id));
            return [...normalized, ...extra];
          }
          return normalized;
        }
      } catch {
        // Fallback
      }
    }
    return initialUsers;
  });

  // Global Platform Admin Settings & Governance Logs
  const [platformAdminSettings, setPlatformAdminSettings] = useState<PlatformAdminSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}platform_admin_settings`);
    if (saved) {
      try {
        return { ...initialPlatformAdminSettings, ...JSON.parse(saved) };
      } catch {
        // Fallback
      }
    }
    return initialPlatformAdminSettings;
  });

  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLogItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}admin_audit_logs`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback
      }
    }
    return initialAdminAuditLogs;
  });

  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}platform_admin_settings`,
      JSON.stringify(platformAdminSettings)
    );
  }, [platformAdminSettings]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}admin_audit_logs`, JSON.stringify(adminAuditLogs));
  }, [adminAuditLogs]);

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`) || 'usr-amidel';
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_users`, JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user_id`, currentUserId);
  }, [currentUserId]);

  const currentUser = useMemo(() => {
    return allUsers.find((u) => u.id === currentUserId) || allUsers[0];
  }, [allUsers, currentUserId]);

  const switchUser = (userId: string) => {
    const found = allUsers.find((u) => u.id === userId);
    if (found) {
      setCurrentUserId(userId);
      if (found.role === 'creator') {
        setCreator((prev) => ({
          ...prev,
          name: found.name,
          email: found.email,
          handle: found.handle,
          bio: found.bio,
          avatarUrl: found.avatarUrl,
          category: found.category,
        }));
      }
      playSuccessSound();
      setActiveToast({
        id: `toast-user-${Date.now()}`,
        title: `Perfil alternado para: ${found.name}`,
        amount: 0,
        customerName: found.name,
        method: 'pix',
        type: 'perfil',
      });
    }
  };

  const updateCurrentUserProfile = (updates: Partial<UserAccount>) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === currentUserId ? { ...u, ...updates } : u))
    );
    if (currentUser.role === 'creator') {
      setCreator((prev) => ({
        ...prev,
        name: updates.name || prev.name,
        email: updates.email || prev.email,
        handle: updates.handle || prev.handle,
        bio: updates.bio || prev.bio,
        category: updates.category || prev.category,
        avatarUrl: updates.avatarUrl || prev.avatarUrl,
        bannerUrl: updates.bannerUrl || prev.bannerUrl,
        tagline: updates.tagline || prev.tagline,
        phone: updates.phone || prev.phone,
      }));
    }
    playSuccessSound();
  };

  const addShowcaseItemToUser = (userId: string, itemData: Omit<UserShowcaseItem, 'id' | 'salesCount'>) => {
    const newItem: UserShowcaseItem = {
      ...itemData,
      id: `showcase-${Date.now().toString().slice(-6)}`,
      salesCount: 0,
    };
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, showcaseItems: [newItem, ...(u.showcaseItems || [])] }
          : u
      )
    );
    playSuccessSound();
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
  };

  const updateShowcaseItem = (userId: string, itemId: string, updates: Partial<UserShowcaseItem>) => {
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              showcaseItems: (u.showcaseItems || []).map((it) =>
                it.id === itemId ? { ...it, ...updates } : it
              ),
            }
          : u
      )
    );
    playSuccessSound();
  };

  const deleteShowcaseItem = (userId: string, itemId: string) => {
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              showcaseItems: (u.showcaseItems || []).filter((it) => it.id !== itemId),
            }
          : u
      )
    );
  };

  const registerNewUserAccount = (data: {
    name: string;
    email: string;
    bio?: string;
    category?: string;
    role?: 'creator' | 'client';
  }) => {
    const cleanHandle = data.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const newUser: UserAccount = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      name: data.name,
      email: data.email,
      handle: cleanHandle || `user${Date.now().toString().slice(-4)}`,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
      bannerUrl: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80`,
      tagline: 'Criador em crescimento na comunidade MonetizaHub',
      bio: data.bio || 'Criador de conteúdo e infoprodutor. Bem-vindo(a) à minha vitrine oficial!',
      category: data.category || 'Geral & Negócios',
      role: data.role || 'creator',
      createdAt: new Date().toISOString(),
      showcaseItems: [],
      purchasedProductIds: [],
      activeSubscriptions: [],
      loyaltyPoints: 100,
    };
    setAllUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    playSuccessSound();
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    return newUser;
  };

  // Reviews & Feedback
  const [reviews, setReviews] = useState<TransactionReview[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reviews`);
    return saved ? JSON.parse(saved) : initialReviews;
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}reviews`, JSON.stringify(reviews));
  }, [reviews]);

  const [pendingReviewTransaction, setPendingReviewTransaction] = useState<Transaction | null>(null);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 5.0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews]);

  const totalReviewsCount = reviews.length;

  const addTransactionReview = (reviewData: Omit<TransactionReview, 'id' | 'createdAt'>) => {
    const newReview: TransactionReview = {
      ...reviewData,
      id: `rev-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };
    setReviews((prev) => [newReview, ...prev]);
    setTransactions((prev) =>
      prev.map((t) => (t.id === reviewData.transactionId ? { ...t, reviewSubmitted: true } : t))
    );
    setCreator((prev) => {
      const newCount = reviews.length + 1;
      const newAvg = Number(((reviews.reduce((acc, r) => acc + r.rating, 0) + reviewData.rating) / newCount).toFixed(1));
      return {
        ...prev,
        averageRating: newAvg,
        totalReviews: newCount,
      };
    });
    awardActionReward('review_submitted', 'Avaliação Verificada 5★');
    playSuccessSound();
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
  };

  // Notification Threshold Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationThresholdSettings>(() => {
    const defaultSettings: NotificationThresholdSettings = {
      enabled: true,
      minWithdrawalThreshold: 1000,
      emailAlerts: true,
      pushAlerts: true,
      smsAlerts: false,
      destinationEmail: creator.email || 'amidelcatondiamy@gmail.com',
      minBalanceAlertEnabled: true,
      minBalanceThreshold: 1000,
      minBalanceChannel: 'both',
    };

    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}notification_settings`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (isStoredNotificationEnvelope(parsed)) {
          pendingNotificationEnvelopeRef.current = {
            encryptedDestinationEmail: parsed.encryptedDestinationEmail,
          };
          return {
            ...defaultSettings,
            ...parsed.settings,
          };
        }
        return {
          ...defaultSettings,
          ...parsed,
          minBalanceAlertEnabled: parsed.minBalanceAlertEnabled ?? parsed.enabled ?? true,
          minBalanceThreshold: parsed.minBalanceThreshold ?? parsed.minWithdrawalThreshold ?? 1000,
          minBalanceChannel:
            parsed.minBalanceChannel ??
            (parsed.emailAlerts && parsed.pushAlerts ? 'both' : parsed.emailAlerts ? 'email' : 'push'),
        };
      } catch {
        // Fallback
      }
    }
    return creator.notificationSettings
      ? { ...defaultSettings, ...creator.notificationSettings }
      : defaultSettings;
  });

  const latestNotificationSettingsRef = useRef<NotificationThresholdSettings>(notificationSettings);
  useEffect(() => {
    latestNotificationSettingsRef.current = notificationSettings;
  }, [notificationSettings]);

  const persistNotificationVaultNow = async (
    nextSettings: NotificationThresholdSettings,
    passphraseOverride?: string
  ) => {
    try {
      const envelope = await createEncryptedNotificationEnvelope(
        nextSettings,
        passphraseOverride ?? customVaultPassphraseRef.current
      );
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}notification_settings`,
        JSON.stringify(envelope)
      );
    } catch {
      // Non-fatal fallback prevented from writing plaintext email
    }
  };

  useEffect(() => {
    if (!isNotificationVaultHydratedRef.current || creatorVaultStatus.locked) return;
    void persistNotificationVaultNow(notificationSettings);
  }, [notificationSettings, creatorVaultStatus.locked]);

  const updateNotificationSettings = (settings: Partial<NotificationThresholdSettings>) => {
    setNotificationSettings((prev) => {
      const updated = { ...prev, ...settings };
      latestNotificationSettingsRef.current = updated;
      setCreator((c) => ({
        ...c,
        notificationSettings: updated,
      }));
      return updated;
    });
  };

  // Sound & Toasts
  const [soundActive, setSoundActiveState] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<SalesToastNotification | null>(null);

  const persistCreatorVaultNow = async (
    targetCreator: CreatorProfile,
    options?: {
      customPassphrase?: string;
      notificationDestinationEmail?: string;
      skipServerSync?: boolean;
    }
  ): Promise<{ success: boolean; error?: string; envelope?: StoredCreatorEnvelope }> => {
    try {
      const effectivePassphrase =
        options?.customPassphrase !== undefined
          ? options.customPassphrase
          : customVaultPassphraseRef.current;
      const envelope = await createEncryptedCreatorEnvelope(targetCreator, {
        customPassphrase: effectivePassphrase,
        notificationDestinationEmail:
          options?.notificationDestinationEmail ??
          latestNotificationSettingsRef.current.destinationEmail,
      });

      localStorage.setItem(`${STORAGE_KEY_PREFIX}creator`, JSON.stringify(envelope));
      setEncryptedCreatorEnvelope(envelope);
      pendingEncryptedEnvelopeRef.current = envelope;

      let databaseSynced = false;
      let serverStorageInfo: ServerVaultStorageInfo | null = null;
      let syncError: string | null = null;

      if (!options?.skipServerSync) {
        try {
          const response = await fetch('/api/creator/vault', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              maskedProfile: envelope.maskedProfile,
              clientEncryptedVault: envelope.encryptedVault,
            }),
          });
          const data = (await response.json()) as {
            ok?: boolean;
            error?: string;
            serverStorageInfo?: ServerVaultStorageInfo;
          };
          if (response.ok && data.ok && data.serverStorageInfo) {
            databaseSynced = true;
            serverStorageInfo = data.serverStorageInfo;
          } else {
            syncError = data.error || 'Falha ao sincronizar cofre AES-256 no banco de dados.';
          }
        } catch {
          syncError = 'Banco de dados indisponível no momento; dados salvos criptografados localmente.';
        }
      }

      setCreatorVaultStatus((prev) => ({
        ...prev,
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        keyFingerprint: envelope.encryptedVault.keyFingerprint,
        encryptedFields: envelope.encryptedVault.encryptedFields,
        lastEncryptedAt: envelope.encryptedVault.encryptedAt,
        localEncrypted: true,
        databaseSynced: databaseSynced || prev.databaseSynced,
        databaseStoredAt: serverStorageInfo?.storedAt ?? prev.databaseStoredAt,
        serverStorageInfo: serverStorageInfo ?? prev.serverStorageInfo,
        hasCustomPassphrase: Boolean(envelope.encryptedVault.requiresCustomPassphrase),
        locked: false,
        lastError: syncError,
      }));

      return { success: true, envelope };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao criptografar dados em AES-256-GCM.';
      setCreatorVaultStatus((prev) => ({ ...prev, lastError: msg }));
      return { success: false, error: msg };
    }
  };

  // Async safe hydration of AES-256 Creator Vault & Notification Vault on mount
  useEffect(() => {
    let cancelled = false;

    const hydrateVault = async () => {
      let serverEnvelope: StoredCreatorEnvelope | null = null;
      let serverStorageInfo: ServerVaultStorageInfo | null = null;

      try {
        const res = await fetch('/api/creator/vault');
        if (res.ok) {
          const data = (await res.json()) as {
            ok?: boolean;
            exists?: boolean;
            maskedProfile?: CreatorProfile;
            clientEncryptedVault?: Aes256EncryptedPayload;
            serverStorageInfo?: ServerVaultStorageInfo;
          };
          if (data.ok && data.exists && data.maskedProfile && data.clientEncryptedVault) {
            serverStorageInfo = data.serverStorageInfo || null;
            serverEnvelope = {
              format: 'monetizahub_aes256_vault_v1',
              maskedProfile: data.maskedProfile,
              encryptedVault: data.clientEncryptedVault,
            };
          }
        }
      } catch {
        // Offline or dev server restarting; rely on localStorage
      }

      if (cancelled) return;

      const sourceEnvelope = pendingEncryptedEnvelopeRef.current || serverEnvelope;

      if (sourceEnvelope) {
        setEncryptedCreatorEnvelope(sourceEnvelope);
        pendingEncryptedEnvelopeRef.current = sourceEnvelope;

        if (sourceEnvelope.encryptedVault.requiresCustomPassphrase) {
          isCreatorVaultHydratedRef.current = false;
          isNotificationVaultHydratedRef.current = false;
          setCreatorVaultStatus((prev) => ({
            ...prev,
            keyFingerprint: sourceEnvelope.encryptedVault.keyFingerprint,
            encryptedFields: sourceEnvelope.encryptedVault.encryptedFields,
            lastEncryptedAt: sourceEnvelope.encryptedVault.encryptedAt,
            localEncrypted: Boolean(localStorage.getItem(`${STORAGE_KEY_PREFIX}creator`)),
            databaseSynced: Boolean(serverStorageInfo),
            databaseStoredAt: serverStorageInfo?.storedAt ?? null,
            serverStorageInfo,
            hasCustomPassphrase: true,
            locked: true,
            lastError: null,
          }));
          return;
        }

        try {
          const decryptedVault = await decryptJsonAes256<SensitiveCreatorVault>(
            sourceEnvelope.encryptedVault
          );
          if (cancelled) return;

          const restoredCreator = mergeCreatorWithVault(
            sourceEnvelope.maskedProfile,
            decryptedVault
          );
          latestCreatorRef.current = restoredCreator;
          setCreator(restoredCreator);

          // Ensure localStorage holds encrypted envelope (in case restored from DB)
          localStorage.setItem(`${STORAGE_KEY_PREFIX}creator`, JSON.stringify(sourceEnvelope));

          if (decryptedVault.notificationDestinationEmail) {
            setNotificationSettings((prev) => ({
              ...prev,
              destinationEmail: decryptedVault.notificationDestinationEmail!,
            }));
          } else if (pendingNotificationEnvelopeRef.current) {
            try {
              const decEmail = await decryptJsonAes256<{ destinationEmail: string }>(
                pendingNotificationEnvelopeRef.current.encryptedDestinationEmail
              );
              if (!cancelled && decEmail.destinationEmail) {
                setNotificationSettings((prev) => ({
                  ...prev,
                  destinationEmail: decEmail.destinationEmail,
                }));
              }
            } catch {
              // Ignore if notification email decryption fails
            }
          }

          isCreatorVaultHydratedRef.current = true;
          isNotificationVaultHydratedRef.current = true;

          setCreatorVaultStatus((prev) => ({
            ...prev,
            keyFingerprint: sourceEnvelope.encryptedVault.keyFingerprint,
            encryptedFields: sourceEnvelope.encryptedVault.encryptedFields,
            lastEncryptedAt: sourceEnvelope.encryptedVault.encryptedAt,
            localEncrypted: true,
            databaseSynced: Boolean(serverStorageInfo),
            databaseStoredAt: serverStorageInfo?.storedAt ?? null,
            serverStorageInfo,
            hasCustomPassphrase: false,
            locked: false,
            lastError: null,
          }));

          // If local envelope exists but database didn't have it yet, sync immediately
          if (!serverStorageInfo) {
            await persistCreatorVaultNow(restoredCreator);
          }
          return;
        } catch (err) {
          if (cancelled) return;
          isCreatorVaultHydratedRef.current = true;
          isNotificationVaultHydratedRef.current = true;
          setCreatorVaultStatus((prev) => ({
            ...prev,
            localEncrypted: true,
            databaseSynced: Boolean(serverStorageInfo),
            databaseStoredAt: serverStorageInfo?.storedAt ?? null,
            serverStorageInfo,
            locked: false,
            lastError:
              err instanceof Error
                ? err.message
                : 'Não foi possível descriptografar os dados salvos anteriormente.',
          }));
          return;
        }
      }

      // First run or legacy plaintext migration: encrypt immediately!
      isCreatorVaultHydratedRef.current = true;
      isNotificationVaultHydratedRef.current = true;
      await persistCreatorVaultNow(latestCreatorRef.current);
      await persistNotificationVaultNow(latestNotificationSettingsRef.current);
    };

    void hydrateVault();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep LocalStorage & DB encrypted whenever creator updates after hydration
  useEffect(() => {
    if (!isCreatorVaultHydratedRef.current || creatorVaultStatus.locked) return;
    void persistCreatorVaultNow(creator);
  }, [creator, creatorVaultStatus.locked]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}tiers`, JSON.stringify(tiers));
  }, [tiers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}tipGoal`, JSON.stringify(tipGoal));
  }, [tipGoal]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}posts`, JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}affiliates`, JSON.stringify(affiliates));
  }, [affiliates]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}coupons`, JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}transactions`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}withdrawals`, JSON.stringify(withdrawals));
  }, [withdrawals]);

  // Real Server-Backed Sales Orders & Gateway Readiness
  const [realOrders, setRealOrders] = useState<RealSaleOrder[]>([]);
  const [gatewayReadiness, setGatewayReadiness] = useState<SalesGatewayReadiness | null>(null);
  const creditedOrderIdsRef = useRef<Set<string>>(new Set());

  const refreshSalesState = async () => {
    const [statusData, ordersData] = await Promise.all([
      fetchSalesStatusApi(),
      fetchSalesOrdersApi(),
    ]);
    if (statusData) setGatewayReadiness(statusData);
    if (ordersData) {
      setRealOrders(ordersData);
    }
  };

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActiveState(next);
    setSoundEnabled(next);
  };

  const clearActiveToast = () => setActiveToast(null);

  // Financial Calculations
  const {
    totalGrossRevenue,
    totalNetRevenue,
    totalWithdrawn,
    availableBalance,
    pendingBalance,
    totalSalesCount,
    averageTicket,
  } = useMemo(() => {
    const approvedTxs = transactions.filter((t) => t.status === 'approved');
    const gross = approvedTxs.reduce((sum, t) => sum + t.grossAmount, 0);
    const net = approvedTxs.reduce((sum, t) => sum + t.netAmount, 0);
    const withdrawn = withdrawals
      .filter((w) => w.status === 'completed' || w.status === 'processing')
      .reduce((sum, w) => sum + w.amount, 0);

    // Sales in the last 24h count as "pending" clearing (unless explicitly cleared/anticipated)
    const oneDayAgo = Date.now() - 1000 * 60 * 60 * 24;
    const pendingAmount = approvedTxs
      .filter((t) => !t.cleared && new Date(t.createdAt).getTime() > oneDayAgo)
      .reduce((sum, t) => sum + t.netAmount * 0.3, 0); // 30% held briefly for guarantee

    const avail = Math.max(0, net - withdrawn - pendingAmount);
    const count = approvedTxs.length;
    const avg = count > 0 ? gross / count : 0;

    return {
      totalGrossRevenue: gross,
      totalNetRevenue: net,
      totalWithdrawn: withdrawn,
      availableBalance: avail,
      pendingBalance: pendingAmount,
      totalSalesCount: count,
      averageTicket: avg,
    };
  }, [transactions, withdrawals]);

  // MRR (Monthly Recurring Revenue) & Members
  const { mrr, totalMembersCount } = useMemo(() => {
    let monthlySum = 0;
    let totalMembers = 0;
    tiers.forEach((t) => {
      monthlySum += t.monthlyPrice * t.activeMembers;
      totalMembers += t.activeMembers;
    });
    return { mrr: monthlySum, totalMembersCount: totalMembers };
  }, [tiers]);

  // Minimum Balance Alert Simulation & Auto-Monitoring System
  const [activeBalanceAlert, setActiveBalanceAlert] = useState<BalanceAlertToastData | null>(null);
  const clearActiveBalanceAlert = () => setActiveBalanceAlert(null);

  // Notification History & Audit (Últimas 10+ Notificações com Dinheiro Real)
  const [notificationHistory, setNotificationHistory] = useState<SentNotificationAudit[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}notification_history`);
    return saved ? JSON.parse(saved) : initialNotificationHistory;
  });

  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}notification_history`,
      JSON.stringify(notificationHistory)
    );
  }, [notificationHistory]);

  const addNotificationAudit = (
    item: Omit<SentNotificationAudit, 'id' | 'timestamp' | 'displayTime' | 'authCode'>
  ) => {
    const now = new Date();
    const newRecord: SentNotificationAudit = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now.toISOString(),
      displayTime: `Hoje às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
      authCode: `AUTH-NTF-${Math.floor(100000 + Math.random() * 900000)}`,
      ...item,
    };
    setNotificationHistory((prev) => [newRecord, ...prev].slice(0, 30));
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
  };

  const triggerSimulatedBalanceAlert = (options?: {
    threshold?: number;
    channel?: NotificationChannelChoice;
    email?: string;
    force?: boolean;
  }) => {
    const targetThreshold = options?.threshold ?? notificationSettings.minBalanceThreshold ?? 1000;
    const targetChannel = options?.channel ?? notificationSettings.minBalanceChannel ?? 'both';
    const targetEmail =
      options?.email || notificationSettings.destinationEmail || creator.email || 'amidelcatondiamy@gmail.com';

    playCashSound();

    const alertData: BalanceAlertToastData = {
      id: `bal-alert-${Date.now()}`,
      title: 'Alerta de Saldo Mínimo Atingido!',
      threshold: targetThreshold,
      currentBalance: availableBalance,
      channel: targetChannel,
      destinationEmail: targetEmail,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setActiveBalanceAlert(alertData);

    // Registrar no Histórico de Auditoria
    addNotificationAudit({
      type: options?.force ? 'min_balance_simulated' : 'min_balance_reached',
      channel: targetChannel,
      title: options?.force ? 'Simulação de Saldo Mínimo Disparada' : 'Alerta de Saldo Mínimo Atingido',
      reason: options?.force
        ? `Disparo manual de teste executado para auditar entrega via ${targetChannel === 'both' ? 'E-mail e Push' : targetChannel === 'email' ? 'E-mail' : 'Push'}. Meta: R$ ${targetThreshold.toFixed(2)}.`
        : `Saldo disponível em conta atingiu R$ ${availableBalance.toFixed(2)}, ultrapassando o limite configurado de R$ ${targetThreshold.toFixed(2)}.`,
      destination:
        targetChannel === 'both'
          ? `${targetEmail} + Push Navegador`
          : targetChannel === 'email'
          ? targetEmail
          : 'Navegador Web / Dispositivo',
      amount: availableBalance,
      currency: 'BRL',
      status: 'delivered',
    });

    // Browser Notification API simulation if supported
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      (targetChannel === 'push' || targetChannel === 'both')
    ) {
      if (Notification.permission === 'granted') {
        try {
          new Notification('MonetizaHub: Saldo Mínimo Atingido!', {
            body: `Seu saldo atingiu R$ ${availableBalance.toFixed(2)}, atingindo o limite configurado de R$ ${targetThreshold.toFixed(2)}.`,
            icon: '/icon-192.svg',
          });
        } catch {
          // Ignore if in iframe or blocked
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }

    const channelDesc =
      targetChannel === 'both'
        ? `e-mail (${targetEmail}) e notificação push`
        : targetChannel === 'email'
        ? `e-mail para ${targetEmail}`
        : 'notificação push no dispositivo';

    return {
      success: true,
      message: `Notificação simulada de saldo mínimo disparada via ${channelDesc}! Saldo: R$ ${availableBalance.toFixed(2)} (Limite: R$ ${targetThreshold.toFixed(2)}).`,
      alertData,
    };
  };

  const triggerNotificationTest = () => {
    return triggerSimulatedBalanceAlert({
      threshold:
        notificationSettings.minBalanceThreshold ||
        notificationSettings.minWithdrawalThreshold ||
        1000,
      channel: notificationSettings.minBalanceChannel || 'both',
      email: notificationSettings.destinationEmail,
      force: true,
    });
  };

  // Monitor availableBalance against minBalanceThreshold
  const lastAlertedThresholdRef = useRef<number | null>(null);

  useEffect(() => {
    const isAlertActive =
      notificationSettings.minBalanceAlertEnabled ?? notificationSettings.enabled ?? true;
    const threshold = Number(
      notificationSettings.minBalanceThreshold ?? notificationSettings.minWithdrawalThreshold ?? 1000
    );

    if (isAlertActive && threshold > 0) {
      // Trigger if balance reached or exceeded the threshold and haven't alerted for this threshold
      if (availableBalance >= threshold && lastAlertedThresholdRef.current !== threshold) {
        lastAlertedThresholdRef.current = threshold;
        triggerSimulatedBalanceAlert({
          threshold,
          channel: notificationSettings.minBalanceChannel || 'both',
          email: notificationSettings.destinationEmail,
        });
      } else if (availableBalance < threshold) {
        // Reset so if balance climbs back up again, it can re-alert
        lastAlertedThresholdRef.current = null;
      }
    }
  }, [
    availableBalance,
    notificationSettings.minBalanceAlertEnabled,
    notificationSettings.minBalanceThreshold,
    notificationSettings.minBalanceChannel,
    notificationSettings.destinationEmail,
    notificationSettings.enabled,
    notificationSettings.minWithdrawalThreshold,
  ]);

  // Secure Payment Gateway Settings & Configurations (Stripe & PayPal)
  const [gatewaySettings, setGatewaySettings] = useState<PaymentGatewaySettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}gateway_settings`);
    return saved ? JSON.parse(saved) : initialPaymentGatewaySettings;
  });

  const [isPaymentGatewayModalOpen, setIsPaymentGatewayModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}gateway_settings`, JSON.stringify(gatewaySettings));
  }, [gatewaySettings]);

  const updateGatewayConfig = (provider: GatewayProvider, updates: Partial<GatewayConfigItem>) => {
    setGatewaySettings((prev) => {
      if (provider === 'stripe') {
        return { ...prev, stripe: { ...prev.stripe, ...updates } };
      }
      if (provider === 'paypal') {
        return { ...prev, paypal: { ...prev.paypal, ...updates } };
      }
      if (provider === 'visa_direct') {
        return { ...prev, visaDirect: { ...prev.visaDirect, ...updates } };
      }
      return { ...prev, multicaixaExpress: { ...prev.multicaixaExpress, ...updates } };
    });
  };

  const toggleGatewayMode = (provider: GatewayProvider) => {
    setGatewaySettings((prev) => {
      const currentConfig =
        provider === 'stripe'
          ? prev.stripe
          : provider === 'paypal'
          ? prev.paypal
          : provider === 'visa_direct'
          ? prev.visaDirect
          : prev.multicaixaExpress;

      const newMode = currentConfig.mode === 'live' ? 'sandbox' : 'live';

      if (provider === 'stripe') {
        return {
          ...prev,
          stripe: {
            ...prev.stripe,
            mode: newMode,
            publishableKey: newMode === 'live' ? 'pk_live_51MHubProd_89324021798321' : 'pk_test_51MHubTest_54981028392184',
          },
        };
      }
      if (provider === 'paypal') {
        return {
          ...prev,
          paypal: {
            ...prev.paypal,
            mode: newMode,
            publishableKey: newMode === 'live' ? 'CLIENT_ID_live_AW409218730198273' : 'CLIENT_ID_sb_TEST849201948201',
          },
        };
      }
      return prev;
    });
  };

  const simulateGatewayTransaction = ({
    provider,
    amount,
    cardEnding = '4242',
    require3DS = false,
  }: {
    provider: GatewayProvider;
    amount: number;
    cardEnding?: string;
    require3DS?: boolean;
  }) => {
    playSuccessSound();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

    const authCode = `AUTH-${provider.toUpperCase().slice(0, 3)}-${Math.floor(100000 + Math.random() * 900000)}`;
    const token = `tok_${provider}_${Math.random().toString(36).substring(2, 14)}`;

    addNotificationAudit({
      type: 'sale_approved',
      channel: 'both',
      title: `Pagamento Seguro via ${provider === 'stripe' ? 'Stripe (3DS2 SCA)' : provider === 'paypal' ? 'PayPal Checkout' : 'Gateway Seguro'}`,
      reason: `Transação em dinheiro real de R$ ${amount.toFixed(2)} confirmada e tokenizada com conformidade PCI-DSS (Final ${cardEnding}).`,
      destination: `${notificationSettings.destinationEmail} + Push Navegador`,
      amount,
      currency: 'BRL',
      status: 'delivered',
    });

    return {
      success: true,
      token,
      authCode,
      message: `Transação aprovada com sucesso via ${provider === 'stripe' ? 'Stripe' : 'PayPal'}! Token PCI gerado: ${token} • Código de Autorização: ${authCode}.`,
    };
  };

  // Badges & Conquistas do Criador
  const [badges, setBadges] = useState<CreatorBadge[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}creator_badges`);
    return saved ? JSON.parse(saved) : initialCreatorBadges;
  });

  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  // Onboarding Tour State
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}onboarding_completed`) === 'true';
  });

  const [isOnboardingTourOpen, setIsOnboardingTourOpen] = useState<boolean>(() => {
    const completed = localStorage.getItem(`${STORAGE_KEY_PREFIX}onboarding_completed`) === 'true';
    return !completed;
  });

  const startOnboardingTour = () => {
    setIsOnboardingTourOpen(true);
  };

  const completeOnboardingTour = () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}onboarding_completed`, 'true');
    setHasCompletedOnboarding(true);
    setIsOnboardingTourOpen(false);
  };

  // Theme Preference State (Claro / Escuro / Sistema)
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() =>
    getStoredThemePreference()
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    getSystemPrefersDark()
  );

  const systemTheme: ResolvedTheme = systemPrefersDark ? 'dark' : 'light';
  const resolvedTheme: ResolvedTheme = resolveThemePreference(
    themePreference,
    systemPrefersDark
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    applyThemeToDocument(themePreference, resolvedTheme);
  }, [themePreference, resolvedTheme]);

  const setThemePreference = (nextPref: ThemePreference) => {
    setThemePreferenceState(nextPref);
    saveThemePreference(nextPref);
    const nextResolved = resolveThemePreference(nextPref, systemPrefersDark);
    applyThemeToDocument(nextPref, nextResolved);
    void trackAnalyticsEvent({
      category: 'engagement',
      eventType: 'feature_used',
      source: 'studio',
      screenOrTab: 'settings',
      metadata: {
        feature: 'theme_selector',
        themePreference: nextPref,
        resolvedTheme: nextResolved,
      },
    });
  };

  // Dynamic Badges Evaluation & Sync based on real metrics
  useEffect(() => {
    setBadges((prevBadges) => {
      let changed = false;
      const updated = prevBadges.map((badge) => {
        let progress = badge.currentProgress;
        let shouldUnlock = badge.unlocked;

        switch (badge.id) {
          case 'badge-primeira-venda':
            progress = Math.min(1, totalSalesCount);
            if (totalSalesCount >= 1) shouldUnlock = true;
            break;
          case 'badge-primeiros-mil':
            progress = Math.min(1000, Math.round(totalGrossRevenue));
            if (totalGrossRevenue >= 1000) shouldUnlock = true;
            break;
          case 'badge-assiduo-vendas':
            progress = Math.min(20, totalSalesCount);
            if (totalSalesCount >= 20) shouldUnlock = true;
            break;
          case 'badge-clube-10k':
            progress = Math.min(10000, Math.round(totalGrossRevenue));
            if (totalGrossRevenue >= 10000) shouldUnlock = true;
            break;
          case 'badge-mestre-mrr':
            progress = Math.min(15, totalMembersCount);
            if (totalMembersCount >= 15) shouldUnlock = true;
            break;
          case 'badge-saque-visa':
            const hasVisaWithdrawal = withdrawals.some(
              (w) => w.destinationType === 'visa_card' && w.status === 'completed'
            );
            progress = hasVisaWithdrawal ? 1 : 0;
            if (hasVisaWithdrawal) shouldUnlock = true;
            break;
          case 'badge-reputacao-5estrelas':
            progress = Math.min(5, reviews.length);
            if (averageRating >= 4.9 && reviews.length >= 3) shouldUnlock = true;
            break;
          case 'badge-vitrine-pro':
            const showcaseCount = currentUser?.showcaseItems?.length || 0;
            progress = Math.min(3, showcaseCount);
            if (showcaseCount >= 3) shouldUnlock = true;
            break;
          case 'badge-clube-50k':
            progress = Math.min(50000, Math.round(totalGrossRevenue));
            if (totalGrossRevenue >= 50000) shouldUnlock = true;
            break;
          default:
            break;
        }

        if (progress !== badge.currentProgress || shouldUnlock !== badge.unlocked) {
          changed = true;
          return {
            ...badge,
            currentProgress: progress,
            unlocked: shouldUnlock,
            unlockedAt: shouldUnlock && !badge.unlockedAt ? new Date().toISOString() : badge.unlockedAt,
          };
        }
        return badge;
      });

      return changed ? updated : prevBadges;
    });
  }, [totalGrossRevenue, totalSalesCount, totalMembersCount, totalWithdrawn, withdrawals, reviews, averageRating, currentUser]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}creator_badges`, JSON.stringify(badges));
  }, [badges]);

  const claimBadgeReward = (badgeId: string) => {
    const badge = badges.find((b) => b.id === badgeId);
    if (!badge || !badge.unlocked || badge.claimed) {
      return { success: false, points: 0, message: 'Recompensa não disponível para resgate.' };
    }

    setBadges((prev) =>
      prev.map((b) => (b.id === badgeId ? { ...b, claimed: true } : b))
    );

    // Credit loyalty points to current user
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === currentUserId
          ? { ...u, loyaltyPoints: (u.loyaltyPoints || 0) + badge.rewardPoints }
          : u
      )
    );

    awardActionReward('badge_claimed', `Conquista "${badge.title}"`);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    playSuccessSound();

    return {
      success: true,
      points: badge.rewardPoints,
      message: `Você resgatou +${badge.rewardPoints} Pontos VIP e +60 MonetiCoins com a conquista "${badge.title}"!`,
    };
  };

  const unlockedBadgesCount = useMemo(() => {
    return badges.filter((b) => b.unlocked).length;
  }, [badges]);

  const totalBadgesCount = badges.length;

  const latestUnlockedBadge = useMemo(() => {
    const unlocked = badges.filter((b) => b.unlocked);
    return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
  }, [badges]);

  // 1. Daily Goals State & Calculations
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}daily_goal`);
    return saved ? JSON.parse(saved) : initialDailyGoal;
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}daily_goal`, JSON.stringify(dailyGoal));
  }, [dailyGoal]);

  const todayActualRevenue = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayApprovedTxs = transactions.filter(
      (t) => t.status === 'approved' && t.createdAt.startsWith(todayStr)
    );
    const sum = todayApprovedTxs.reduce((acc, t) => acc + t.grossAmount, 0);
    // If no transactions generated today yet, return sample history value (640)
    return sum > 0 ? sum : (dailyGoal.history[0]?.actualAmount || 640);
  }, [transactions, dailyGoal]);

  const updateDailyGoalTarget = (amount: number) => {
    setDailyGoal((prev) => {
      const updatedHistory = prev.history.map((h, idx) => {
        if (idx === 0 || h.dayLabel === 'Hoje') {
          return {
            ...h,
            targetAmount: amount,
            reached: (h.actualAmount || todayActualRevenue) >= amount,
          };
        }
        return h;
      });
      return {
        ...prev,
        targetAmount: amount,
        history: updatedHistory,
      };
    });
    playSuccessSound();
    if (todayActualRevenue >= amount) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
    }
  };

  // 1b. Monthly Financial Revenue Goals State & Persistence
  const [monthlyFinancialGoals, setMonthlyFinancialGoals] = useState<MonthlyRevenueGoal[]>(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}monthly_financial_goals`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback below
      }
    }
    return [
      {
        id: `mfg-${currentMonthKey}`,
        monthKey: currentMonthKey,
        title: 'Meta Mensal de Receita Total',
        targetAmount: 10000,
        basis: 'gross',
        updatedAt: now.toISOString(),
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}monthly_financial_goals`,
      JSON.stringify(monthlyFinancialGoals)
    );
  }, [monthlyFinancialGoals]);

  const upsertMonthlyFinancialGoal = (goalInput: {
    id?: string;
    monthKey: string;
    title: string;
    targetAmount: number;
    basis: MonthlyRevenueBasis;
  }): MonthlyRevenueGoal => {
    const cleanTarget = Math.max(100, Number(goalInput.targetAmount) || 1000);
    const nowIso = new Date().toISOString();
    const savedGoal: MonthlyRevenueGoal = {
      id: goalInput.id || `mfg-${goalInput.monthKey}-${Date.now()}`,
      monthKey: goalInput.monthKey,
      title: goalInput.title.trim() || 'Meta Mensal de Receita',
      targetAmount: cleanTarget,
      basis: goalInput.basis,
      updatedAt: nowIso,
    };

    setMonthlyFinancialGoals((prev) => {
      const idx = prev.findIndex((g) => g.id === savedGoal.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedGoal;
        return next;
      }
      return [savedGoal, ...prev];
    });
    playSuccessSound();
    return savedGoal;
  };

  const deleteMonthlyFinancialGoal = (goalId: string) => {
    setMonthlyFinancialGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  // 2. AI Conversion Tips & Settings
  const [aiTips, setAiTips] = useState<AITipItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}ai_tips`);
    return saved ? JSON.parse(saved) : initialAITips;
  });

  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}ai_settings`);
    return saved ? JSON.parse(saved) : initialAISettings;
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}ai_tips`, JSON.stringify(aiTips));
  }, [aiTips]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}ai_settings`, JSON.stringify(aiSettings));
  }, [aiSettings]);

  const applyAITip = (tipId: string): { success: boolean; message: string } => {
    const tip = aiTips.find((t) => t.id === tipId);
    if (!tip) return { success: false, message: 'Dica não encontrada.' };

    if (tip.actionType === 'increase_price') {
      // Reajusta preço do produto prod-5 para 890
      updateProduct('prod-5', { price: 890.0 });
    } else if (tip.actionType === 'create_coupon') {
      // Adiciona cupom relâmpago de 15%
      const newCoupon: DiscountCoupon = {
        code: 'RELAMPAGO15',
        discountPercentage: 15,
        maxUses: 150,
        usedCount: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        active: true,
      };
      addCoupon(newCoupon);
    } else if (tip.actionType === 'boost_affiliate') {
      // Bonifica top afiliados para 40% de comissão
      setAffiliates((prev) =>
        prev.map((a, idx) => (idx < 2 ? { ...a, commissionRate: 40 } : a))
      );
    }

    setAiTips((prev) =>
      prev.map((t) => (t.id === tipId ? { ...t, isApplied: true } : t))
    );
    confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
    playCashSound();
    return {
      success: true,
      message: `Ação recomendada pela IA aplicada com sucesso! (${tip.actionLabel})`,
    };
  };

  const dismissAITip = (tipId: string) => {
    setAiTips((prev) =>
      prev.map((t) => (t.id === tipId ? { ...t, isDismissed: true } : t))
    );
  };

  const updateAISettings = (updates: Partial<AISettings>) => {
    setAiSettings((prev) => ({ ...prev, ...updates }));
    playSuccessSound();
  };

  const regenerateAITips = () => {
    const dynamicTips: AITipItem[] = [
      {
        id: `ai-tip-${Date.now()}-1`,
        title: 'Criar Oferta Combo (Bundle) com Ticket Médio Otimizado',
        description: `Seu ticket médio atual está em R$ ${averageTicket.toFixed(2)}. Unir o "Template Notion" e o "Pack de Prompts" em um Combo Especial de R$ 97,00 tem probabilidade de elevar a conversão em 26%.`,
        category: 'pricing',
        impact: 'high',
        metricImpactEstimate: '+R$ 2.400/mês de faturamento adicional',
        actionLabel: 'Criar Pacote Promocional de R$ 97',
        actionType: 'bundle',
        createdAt: new Date().toISOString(),
      },
      {
        id: `ai-tip-${Date.now()}-2`,
        title: 'Concentrar Campanhas nos Fins de Semana',
        description: 'Os dados de retenção e faturamento indicam que 44% das vendas ocorrem entre sexta-feira e domingo. Concentrar 60% do orçamento de marketing nos fins de semana maximiza o ROAS.',
        category: 'revenue',
        impact: 'medium',
        metricImpactEstimate: 'Aumento de 1.8x no Retorno sobre Investimento (ROI)',
        actionLabel: 'Otimizar Janela de Fim de Semana',
        actionType: 'exclusive_offer',
        createdAt: new Date().toISOString(),
      },
      {
        id: `ai-tip-${Date.now()}-3`,
        title: 'Campanha de Reativação para Membros Inativos',
        description: '32 membros VIP expiraram nos últimos 60 dias. Um e-mail com 1 mês bônus na renovação anual tem potencial de reativar até 14 membros.',
        category: 'retention',
        impact: 'high',
        metricImpactEstimate: '+R$ 1.386/mês em receita recorrente (MRR)',
        actionLabel: 'Disparar Oferta de Reativação VIP',
        actionType: 'create_coupon',
        createdAt: new Date().toISOString(),
      },
    ];
    setAiTips((prev) => [...dynamicTips, ...prev.filter((t) => !t.isDismissed)]);
    playCashSound();
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.5 } });
  };

  // 3. Financial Expenses & Real Net Profit
  const [expenses, setExpenses] = useState<FinancialExpense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}expenses`);
    return saved ? JSON.parse(saved) : initialFinancialExpenses;
  });
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}expenses`, JSON.stringify(expenses));
  }, [expenses]);

  const totalGatewayFees = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (t.fee || 0), 0);
  }, [transactions]);

  const totalMarketingExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.category === 'marketing')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const totalOperationalExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.category === 'operational')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const realNetProfit = useMemo(() => {
    const gross = totalGrossRevenue;
    const net = gross - totalGatewayFees - totalMarketingExpenses - totalOperationalExpenses;
    return Number(net.toFixed(2));
  }, [totalGrossRevenue, totalGatewayFees, totalMarketingExpenses, totalOperationalExpenses]);

  const netProfitMargin = useMemo(() => {
    if (totalGrossRevenue <= 0) return 0;
    return Number(((realNetProfit / totalGrossRevenue) * 100).toFixed(1));
  }, [totalGrossRevenue, realNetProfit]);

  const addExpense = (newExp: Omit<FinancialExpense, 'id'>) => {
    const expItem: FinancialExpense = {
      ...newExp,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [expItem, ...prev]);
    playSuccessSound();
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    playSuccessSound();
  };

  const updateExpense = (id: string, updates: Partial<FinancialExpense>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    playSuccessSound();
  };

  // 4. User Analytics (Live Server Tracking + Usage Patterns + Key Decisions)
  const [analyticsWindow, setAnalyticsWindow] = useState<AnalyticsWindow>('30d');
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverviewPayload | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);

  const refreshAnalyticsOverview = async (overrideWin?: AnalyticsWindow) => {
    const targetWin = overrideWin || analyticsWindow;
    setIsAnalyticsLoading(true);
    try {
      const overview = await fetchAnalyticsOverview(targetWin);
      if (overview) {
        setAnalyticsOverview(overview);
      }
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    void refreshAnalyticsOverview(analyticsWindow);
  }, [analyticsWindow]);

  const trackAnalyticsEvent = async (
    event: Omit<Partial<AnalyticsEventRecord>, 'id' | 'timestamp'>
  ) => {
    const segment: 'visitor' | 'subscriber' | 'vip' | 'creator' =
      currentUser?.role === 'creator'
        ? 'creator'
        : appSubscription.tier === 'ultra'
        ? 'vip'
        : appSubscription.status === 'active'
        ? 'subscriber'
        : 'visitor';

    await sendAnalyticsEvent({
      sessionId: getOrCreateSessionId(),
      userId: currentUser?.id || 'usr-amidel',
      userSegment: segment,
      device: detectDeviceType(),
      channel: 'direct',
      ...event,
    });

    if (event.category === 'revenue' || event.eventType === 'checkout_completed') {
      void refreshAnalyticsOverview(analyticsWindow);
    }
  };

  const userAnalytics = useMemo<UserAnalyticsData>(() => {
    if (!analyticsOverview) return initialUserAnalytics;
    return {
      engagement: {
        totalSessions: analyticsOverview.engagement.totalSessions,
        pageViews: analyticsOverview.engagement.pageViews,
        avgSessionDurationMinutes: analyticsOverview.engagement.avgSessionDurationMinutes,
        bounceRatePercentage: analyticsOverview.engagement.bounceRatePercentage,
        activeUsersCount: analyticsOverview.engagement.activeUsersCount,
        checkoutClickRate: analyticsOverview.engagement.checkoutClickRate,
      },
      retention: analyticsOverview.retention,
      funnel: analyticsOverview.funnel,
      idealTouchpoints: analyticsOverview.idealTouchpoints,
      revenueSourcesEfficacy: analyticsOverview.revenueSources.map((src) => ({
        id: src.id,
        name: src.name,
        category:
          src.category === 'in_app' || src.category === 'paywall' ? 'products' : src.category,
        grossRevenue: src.grossRevenue,
        netMarginPercentage: src.netMarginPercentage,
        roiMultiplier: src.roiMultiplier,
        conversionRate: src.conversionRate,
        effortLevel: src.effortLevel,
        rating: src.rating,
      })),
    };
  }, [analyticsOverview]);

  // 4b. Gemini Live Voice Experience Modal
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);

  // 4c. In-App Rewards System (Moeda Virtual MonetiCoins, Ações Recompensadas & Catálogo)
  const rewardActions: RewardActionRule[] = useMemo(
    () => [
      {
        id: 'daily_checkin',
        title: 'Check-in Diário & Sequência',
        description: 'Acesse o MonetizaHub diariamente para manter sua ofensiva e ganhar multiplicador de moedas.',
        category: 'engajamento',
        coinsReward: 25,
        xpReward: 40,
        cadence: '1x por dia (+bônus de streak)',
        eligibleTarget: 'Criador & Seguidor',
      },
      {
        id: 'purchase_completed',
        title: 'Compra na Vitrine ou In-App',
        description: 'Cada aquisição de produto digital, desbloqueio ou item exclusivo gera cashback em MonetiCoins.',
        category: 'monetizacao',
        coinsReward: 80,
        xpReward: 120,
        cadence: 'Por transação aprovada',
        eligibleTarget: 'Seguidor / Comprador',
      },
      {
        id: 'subscription_started',
        title: 'Ativação de Assinatura VIP / MRR',
        description: 'Assinantes recorrentes recebem bônus reforçado de entrada no Clube de Recompensas.',
        category: 'monetizacao',
        coinsReward: 150,
        xpReward: 250,
        cadence: 'Na assinatura ou renovação',
        eligibleTarget: 'Seguidor / Comprador',
      },
      {
        id: 'review_submitted',
        title: 'Avaliação & Prova Social',
        description: 'Enviar feedback com nota e comentário após concluir uma transação ajuda toda a comunidade.',
        category: 'comunidade',
        coinsReward: 35,
        xpReward: 50,
        cadence: 'Por avaliação verificada',
        eligibleTarget: 'Seguidor / Comprador',
      },
      {
        id: 'rewarded_video_watched',
        title: 'Vídeo Premiado (Opt-in)',
        description: 'Assistir anúncios premiados completos rende saldo real na carteira e moedas virtuais extras.',
        category: 'engajamento',
        coinsReward: 40,
        xpReward: 35,
        cadence: 'Ilimitado (opt-in)',
        eligibleTarget: 'Criador & Seguidor',
      },
      {
        id: 'product_published',
        title: 'Publicar Produto ou Oferta',
        description: 'Expanda seu catálogo digital criando um novo curso, e-book, pack ou template na vitrine.',
        category: 'criacao',
        coinsReward: 100,
        xpReward: 160,
        cadence: 'Por novo item publicado',
        eligibleTarget: 'Criador',
      },
      {
        id: 'affiliate_referral',
        title: 'Indicação de Afiliado Convertida',
        description: 'Traga novos compradores via link de parceiro e ganhe comissão em dinheiro + moedas.',
        category: 'comunidade',
        coinsReward: 120,
        xpReward: 180,
        cadence: 'Por venda com código de afiliado',
        eligibleTarget: 'Criador & Seguidor',
      },
      {
        id: 'badge_claimed',
        title: 'Resgate de Conquista Oficial',
        description: 'Ao atingir marcos de faturamento ou vendas e resgatar sua badge, você ganha bônus em MC.',
        category: 'criacao',
        coinsReward: 60,
        xpReward: 90,
        cadence: 'Por conquista desbloqueada',
        eligibleTarget: 'Criador',
      },
      {
        id: 'voice_coach_session',
        title: 'Consultoria Gemini Live por Voz',
        description: 'Converse em tempo real com a consultora de voz para otimizar preços, métricas ou funil.',
        category: 'engajamento',
        coinsReward: 30,
        xpReward: 45,
        cadence: 'Por sessão iniciada',
        eligibleTarget: 'Criador',
      },
    ],
    []
  );

  const rewardCatalog: RewardCatalogItem[] = useMemo(
    () => [
      {
        id: 'rew-remove-ads',
        title: 'Modo Sem Anúncios (Desbloqueio Permanente)',
        description:
          'Desbloqueia o recurso oficial "Experiência Livre de Anúncios" nas Compras no App usando apenas suas moedas.',
        benefitType: 'feature_unlock',
        costCoins: 280,
        valueHighlight: 'Recurso Premium Desbloqueado',
        unlockFeatureId: 'remove_ads',
        repeatable: false,
        minTier: 'bronze',
      },
      {
        id: 'rew-vip-coupon',
        title: 'Cupom VIP 20% OFF (VIPREWARD20)',
        description:
          'Gera imediatamente um cupom ativo de 20% de desconto para compartilhar com seguidores ou usar na vitrine.',
        benefitType: 'coupon_perk',
        costCoins: 180,
        valueHighlight: 'Cupom Ativo na Vitrine',
        couponCodeToCreate: 'VIPREWARD20',
        couponDiscountPercent: 20,
        repeatable: true,
        minTier: 'bronze',
      },
      {
        id: 'rew-featured-boost',
        title: 'Impulsionamento Destaque na Vitrine',
        description:
          'Marca seu principal produto digital como Destaque Oficial na Vitrine Pública e aplica o selo de visibilidade.',
        benefitType: 'visibility_boost',
        costCoins: 220,
        valueHighlight: '+35% Visibilidade no Catálogo',
        repeatable: true,
        minTier: 'silver',
      },
      {
        id: 'rew-wallet-bonus',
        title: 'Conversão em Saldo na Carteira (+R$ 25,00)',
        description:
          'Converte suas MonetiCoins acumuladas em R$ 25,00 aprovados diretamente no Saldo Disponível para saque.',
        benefitType: 'wallet_bonus',
        costCoins: 350,
        valueHighlight: 'R$ 25,00 em Saldo Disponível',
        bonusCashBRL: 25,
        repeatable: true,
        minTier: 'silver',
      },
      {
        id: 'rew-zero-fee-express',
        title: 'Isenção Taxa Zero Saque Express (Selo VIP)',
        description:
          'Desbloqueia prioridade de liquidação instantânea e selo "Parceiro Taxa Zero" para repasses Visa & Express.',
        benefitType: 'fee_waiver',
        costCoins: 420,
        valueHighlight: 'Prioridade Instantânea',
        unlockFeatureId: 'analytics_pro',
        repeatable: false,
        minTier: 'gold',
      },
      {
        id: 'rew-pro-pass',
        title: 'Passe MonetizaHub Pro (30 Dias)',
        description:
          'Ativa assinatura MonetizaHub Pro sem custos por 1 ciclo mensal com taxa de plataforma reduzida e zero anúncios.',
        benefitType: 'vip_access',
        costCoins: 600,
        valueHighlight: 'Plano Pro Ativo',
        repeatable: false,
        minTier: 'gold',
      },
    ],
    []
  );

  const [monetiCoins, setMonetiCoins] = useState<number>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}moneti_coins`);
    if (saved !== null) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 450;
  });

  const [rewardXp, setRewardXp] = useState<number>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reward_xp`);
    if (saved !== null) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 620;
  });

  const [rewardStreakDays, setRewardStreakDays] = useState<number>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reward_streak`);
    if (saved !== null) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed) && parsed >= 1) return parsed;
    }
    return 4;
  });

  const [lastDailyCheckinDate, setLastDailyCheckinDate] = useState<string | null>(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}last_checkin_date`);
  });

  const [redeemedRewardIds, setRedeemedRewardIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}redeemed_rewards`);
    return saved ? JSON.parse(saved) : [];
  });

  const [unlockedRewardPerks, setUnlockedRewardPerks] = useState<string[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}unlocked_reward_perks`);
    return saved ? JSON.parse(saved) : [];
  });

  const [rewardHistory, setRewardHistory] = useState<RewardTransactionRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reward_history`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback
      }
    }
    const now = Date.now();
    return [
      {
        id: 'rew-tx-seed-1',
        type: 'earn',
        actionId: 'daily_checkin',
        title: 'Sequência de Acesso (4 dias consecutivos)',
        coinsDelta: 100,
        xpDelta: 160,
        timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
        badgeLabel: 'Streak 1.25x',
      },
      {
        id: 'rew-tx-seed-2',
        type: 'earn',
        actionId: 'purchase_completed',
        title: 'Bônus de Monetização: Venda Confirmada na Vitrine',
        coinsDelta: 150,
        xpDelta: 220,
        timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        badgeLabel: 'Monetização',
      },
      {
        id: 'rew-tx-seed-3',
        type: 'earn',
        actionId: 'badge_claimed',
        title: 'Conquista Desbloqueada: Primeiros R$ 1.000',
        coinsDelta: 200,
        xpDelta: 240,
        timestamp: new Date(now - 1000 * 60 * 60 * 22).toISOString(),
        badgeLabel: 'Conquista',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}moneti_coins`, String(monetiCoins));
  }, [monetiCoins]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}reward_xp`, String(rewardXp));
  }, [rewardXp]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}reward_streak`, String(rewardStreakDays));
  }, [rewardStreakDays]);

  useEffect(() => {
    if (lastDailyCheckinDate) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}last_checkin_date`, lastDailyCheckinDate);
    }
  }, [lastDailyCheckinDate]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}redeemed_rewards`, JSON.stringify(redeemedRewardIds));
  }, [redeemedRewardIds]);

  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}unlocked_reward_perks`,
      JSON.stringify(unlockedRewardPerks)
    );
  }, [unlockedRewardPerks]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}reward_history`, JSON.stringify(rewardHistory));
  }, [rewardHistory]);

  const rewardTier = useMemo<RewardTierLevel>(() => {
    if (rewardXp >= 3000) return 'diamond';
    if (rewardXp >= 1500) return 'gold';
    if (rewardXp >= 500) return 'silver';
    return 'bronze';
  }, [rewardXp]);

  const awardActionReward = (actionId: RewardActionId, customLabel?: string) => {
    const rule = rewardActions.find((r) => r.id === actionId);
    if (!rule) return { success: false, coinsAwarded: 0, xpAwarded: 0 };

    const tierMultiplier =
      rewardTier === 'diamond' ? 1.5 : rewardTier === 'gold' ? 1.25 : rewardTier === 'silver' ? 1.1 : 1;
    const coinsAwarded = Math.round(rule.coinsReward * tierMultiplier);
    const xpAwarded = rule.xpReward;

    setMonetiCoins((prev) => prev + coinsAwarded);
    setRewardXp((prev) => prev + xpAwarded);
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === currentUserId
          ? { ...u, loyaltyPoints: (u.loyaltyPoints || 0) + coinsAwarded }
          : u
      )
    );

    const record: RewardTransactionRecord = {
      id: `rew-tx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: 'earn',
      actionId,
      title: customLabel ? `${rule.title}: ${customLabel}` : rule.title,
      coinsDelta: coinsAwarded,
      xpDelta: xpAwarded,
      timestamp: new Date().toISOString(),
      badgeLabel: tierMultiplier > 1 ? `Bônus ${tierMultiplier}x` : 'Recompensa',
    };
    setRewardHistory((prev) => [record, ...prev].slice(0, 50));

    void trackAnalyticsEvent({
      category: 'engagement',
      eventType: 'feature_used',
      source: 'studio',
      screenOrTab: 'rewards',
      metadata: {
        rewardAction: actionId,
        coinsAwarded,
      },
    });

    return { success: true, coinsAwarded, xpAwarded };
  };

  const performDailyCheckin = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (lastDailyCheckinDate === todayStr) {
      return {
        success: false,
        coinsAwarded: 0,
        message: 'Check-in de hoje já foi resgatado! Volte amanhã para aumentar sua sequência.',
      };
    }

    const nextStreak = rewardStreakDays + 1;
    const streakBonus = Math.min(50, nextStreak * 5);
    const totalCoins = 25 + streakBonus;
    const xpGain = 40 + nextStreak * 5;

    setLastDailyCheckinDate(todayStr);
    setRewardStreakDays(nextStreak);
    setMonetiCoins((prev) => prev + totalCoins);
    setRewardXp((prev) => prev + xpGain);
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === currentUserId
          ? { ...u, loyaltyPoints: (u.loyaltyPoints || 0) + totalCoins }
          : u
      )
    );

    const record: RewardTransactionRecord = {
      id: `rew-checkin-${Date.now()}`,
      type: 'earn',
      actionId: 'daily_checkin',
      title: `Check-in Diário (${nextStreak} dias seguidos)`,
      coinsDelta: totalCoins,
      xpDelta: xpGain,
      timestamp: new Date().toISOString(),
      badgeLabel: `Streak ${nextStreak}d`,
    };
    setRewardHistory((prev) => [record, ...prev].slice(0, 50));

    playSuccessSound();
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 } });

    return {
      success: true,
      coinsAwarded: totalCoins,
      message: `Check-in confirmado! Você ganhou +${totalCoins} MonetiCoins (Sequência de ${nextStreak} dias).`,
    };
  };

  const redeemRewardItem = (rewardId: string) => {
    const item = rewardCatalog.find((r) => r.id === rewardId);
    if (!item) {
      return { success: false, message: 'Recompensa não encontrada no catálogo.' };
    }
    if (!item.repeatable && redeemedRewardIds.includes(rewardId)) {
      return { success: false, message: 'Você já desbloqueou esta recompensa exclusiva.' };
    }
    if (monetiCoins < item.costCoins) {
      return {
        success: false,
        message: `Saldo insuficiente: faltam ${item.costCoins - monetiCoins} MonetiCoins.`,
      };
    }

    setMonetiCoins((prev) => prev - item.costCoins);
    setRedeemedRewardIds((prev) => (prev.includes(rewardId) ? prev : [...prev, rewardId]));
    setUnlockedRewardPerks((prev) => (prev.includes(rewardId) ? prev : [...prev, rewardId]));

    // Execute real in-app benefit based on benefitType
    if (item.unlockFeatureId) {
      setPurchasedFeatureIds((prev) =>
        prev.includes(item.unlockFeatureId!) ? prev : [...prev, item.unlockFeatureId!]
      );
    }

    if (item.benefitType === 'coupon_perk' && item.couponCodeToCreate) {
      const code = `${item.couponCodeToCreate}`;
      const existing = coupons.some((c) => c.code.toUpperCase() === code.toUpperCase());
      if (!existing) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 30);
        setCoupons((prev) => [
          {
            code,
            discountPercentage: item.couponDiscountPercent || 20,
            maxUses: 100,
            usedCount: 0,
            expiresAt: expDate.toISOString().slice(0, 10),
            active: true,
          },
          ...prev,
        ]);
      }
    }

    if (item.benefitType === 'visibility_boost') {
      const targetProd = products.find((p) => !p.featured) || products[0];
      if (targetProd) {
        setProducts((prev) =>
          prev.map((p) => (p.id === targetProd.id ? { ...p, featured: true } : p))
        );
      }
    }

    if (item.benefitType === 'wallet_bonus' && (item.bonusCashBRL || 0) > 0) {
      const bonus = item.bonusCashBRL || 25;
      const bonusTx: Transaction = {
        id: `tx-rew-${Date.now().toString().slice(-6)}`,
        type: 'tip',
        title: 'Resgate de Recompensa: Bônus em Carteira',
        customerName: 'Clube MonetiCoins',
        customerEmail: currentUser?.email || creator.email || 'criador@monetizahub.io',
        grossAmount: bonus,
        fee: 0,
        netAmount: bonus,
        paymentMethod: 'pix',
        status: 'approved',
        cleared: true,
        createdAt: new Date().toISOString(),
        message: `Conversão de ${item.costCoins} MonetiCoins em saldo real.`,
      };
      setTransactions((prev) => [bonusTx, ...prev]);
    }

    if (item.benefitType === 'vip_access') {
      const nextEnd = new Date();
      nextEnd.setDate(nextEnd.getDate() + 30);
      setAppSubscription((prev) => ({
        ...prev,
        tier: prev.tier === 'ultra' ? 'ultra' : 'pro',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: nextEnd.toISOString(),
      }));
    }

    const record: RewardTransactionRecord = {
      id: `rew-redeem-${Date.now()}`,
      type: 'redeem',
      rewardId: item.id,
      title: `Resgate: ${item.title}`,
      coinsDelta: -item.costCoins,
      xpDelta: 0,
      timestamp: new Date().toISOString(),
      badgeLabel: item.valueHighlight,
    };
    setRewardHistory((prev) => [record, ...prev].slice(0, 50));

    playSuccessSound();
    confetti({ particleCount: 95, spread: 80, origin: { y: 0.6 } });

    return {
      success: true,
      message: `"${item.title}" resgatado e ativado na sua conta!`,
    };
  };

  // 5. App Premium Subscription Actions
  const subscribeToAppPlan = ({
    tier,
    billingCycle,
    paymentMethod,
    cardLast4,
  }: {
    tier: AppSubscriptionTier;
    billingCycle: AppBillingCycle;
    paymentMethod: PaymentMethod;
    cardLast4?: string;
  }) => {
    const monthlyRate = tier === 'ultra' ? 89.0 : 49.0;
    const annualRate = tier === 'ultra' ? 749.0 : 399.0;
    const chargedAmount = billingCycle === 'annual' ? annualRate : monthlyRate;

    const newInvoice: AppSubscriptionInvoice = {
      id: `inv-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      amount: chargedAmount,
      billingCycle,
      planName: `MonetizaHub ${tier === 'ultra' ? 'Ultra VIP' : 'Pro'} (${billingCycle === 'annual' ? 'Anual' : 'Mensal'})`,
      status: 'paid',
      receiptNumber: `REC-MHUB-${Date.now().toString().slice(-6)}`,
      paymentMethod,
    };

    const nextEnd = new Date();
    if (billingCycle === 'annual') {
      nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    } else {
      nextEnd.setMonth(nextEnd.getMonth() + 1);
    }

    setAppSubscription({
      tier,
      billingCycle,
      status: 'active',
      monthlyPrice: monthlyRate,
      annualPrice: annualRate,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: nextEnd.toISOString(),
      renewsAutomatically: true,
      paymentMethod,
      savedCardLast4: cardLast4 || '4829',
      invoices: [newInvoice, ...(appSubscription?.invoices || [])],
    });

    playSuccessSound();
    confetti({ particleCount: 110, spread: 85, origin: { y: 0.5 } });

    return {
      success: true,
      message: `Parabéns! Sua assinatura do MonetizaHub ${tier === 'ultra' ? 'Ultra VIP' : 'Pro'} está ativa com experiência 100% sem anúncios e taxa de plataforma zero!`,
    };
  };

  const cancelAppSubscription = () => {
    setAppSubscription((prev) => ({
      ...prev,
      renewsAutomatically: false,
      status: 'canceled',
    }));
    playSuccessSound();
  };

  const changeAppSubscriptionCycle = (cycle: AppBillingCycle) => {
    setAppSubscription((prev) => ({
      ...prev,
      billingCycle: cycle,
    }));
    playSuccessSound();
  };

  // Coupon validator
  const validateCoupon = (code: string, productId?: string): DiscountCoupon | null => {
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    const found = coupons.find(
      (c) => c.active && c.code.toUpperCase() === normalized
    );
    if (!found) return null;
    if (found.usedCount >= found.maxUses) return null;
    const expiryTimestamp = found.expiresAt.includes('T')
      ? new Date(found.expiresAt).getTime()
      : new Date(`${found.expiresAt}T23:59:59`).getTime();
    if (expiryTimestamp < Date.now()) return null;
    if (found.productId && found.productId !== 'all' && productId && found.productId !== productId) {
      return null;
    }
    return found;
  };

  const calculateCheckoutFee = (grossAmount: number, paymentMethod: PaymentMethod) => {
    const isProActive = appSubscription.status === 'active' && appSubscription.tier !== 'free';
    const feeRatePct = isProActive
      ? platformAdminSettings.proFeePercent
      : paymentMethod === 'pix'
      ? platformAdminSettings.pixFeePercent
      : platformAdminSettings.platformFeePercent;
    const feeRate = Math.max(0, feeRatePct) / 100;
    const feeFixed = paymentMethod === 'pix' || isProActive ? 0 : 0.5;
    const fee = Number((grossAmount * feeRate + feeFixed).toFixed(2));
    const netAmount = Number(Math.max(0, grossAmount - fee).toFixed(2));
    return { fee, netAmount };
  };

  // Process Checkout (supports real order IDs and pending/approved lifecycle)
  const processCheckout = ({
    id: customTxId,
    type,
    itemId,
    grossAmount,
    customerName,
    customerEmail,
    paymentMethod,
    status: requestedStatus = 'approved',
    message,
    affiliateCode,
    couponCode,
  }: {
    id?: string;
    type: 'product_sale' | 'subscription' | 'tip' | 'paywall_unlock' | 'in_app_purchase';
    itemId?: string;
    grossAmount: number;
    customerName: string;
    customerEmail: string;
    paymentMethod: PaymentMethod;
    status?: TransactionStatus;
    message?: string;
    affiliateCode?: string;
    couponCode?: string;
  }) => {
    const { fee, netAmount } = calculateCheckoutFee(grossAmount, paymentMethod);

    let title = 'Venda Realizada';
    if (type === 'product_sale') {
      const prod = products.find((p) => p.id === itemId);
      title = prod ? `Venda: ${prod.title}` : 'Venda de Produto Digital';
    } else if (type === 'subscription') {
      const tier = tiers.find((t) => t.id === itemId);
      title = tier ? `Assinatura: ${tier.name}` : 'Nova Assinatura Recorrente';
    } else if (type === 'tip') {
      title = `Apoio / Gorjeta Pix de ${customerName}`;
    } else if (type === 'paywall_unlock') {
      const post = posts.find((p) => p.id === itemId);
      title = post ? `Desbloqueio: ${post.title.slice(0, 35)}...` : 'Desbloqueio de Post VIP';
    } else if (type === 'in_app_purchase') {
      const iapItem = followerInAppItems.find((i) => i.id === itemId);
      title = iapItem ? `Compra In-App: ${iapItem.title}` : 'Compra In-App de Seguidor';
    }

    const txId = customTxId || `tx-${Date.now().toString().slice(-6)}`;
    const newTransaction: Transaction = {
      id: txId,
      type,
      title,
      customerName: customerName || 'Apoiador Anônimo',
      customerEmail: customerEmail || 'cliente@exemplo.com',
      grossAmount,
      fee,
      netAmount,
      paymentMethod,
      status: requestedStatus,
      createdAt: new Date().toISOString(),
      message,
      productId: type === 'product_sale' || type === 'in_app_purchase' ? itemId : undefined,
      subscriptionTierId: type === 'subscription' ? itemId : undefined,
      productCategory: type === 'in_app_purchase' ? 'in_app' : undefined,
    };

    setTransactions((prev) => {
      const exists = prev.some((t) => t.id === txId);
      if (exists) {
        return prev.map((t) => (t.id === txId ? { ...t, ...newTransaction } : t));
      }
      return [newTransaction, ...prev];
    });

    if (requestedStatus !== 'approved') {
      return { success: true, transaction: newTransaction };
    }

    creditedOrderIdsRef.current.add(txId);

    // Update item specific counters
    if (type === 'product_sale' && itemId) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === itemId ? { ...p, salesCount: p.salesCount + 1 } : p
        )
      );
    } else if (type === 'in_app_purchase' && itemId) {
      setFollowerInAppItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, salesCount: item.salesCount + 1 } : item
        )
      );
    } else if (type === 'subscription' && itemId) {
      setTiers((prev) =>
        prev.map((t) =>
          t.id === itemId ? { ...t, activeMembers: t.activeMembers + 1 } : t
        )
      );
    } else if (type === 'tip') {
      setTipGoal((prev) => ({
        ...prev,
        currentAmount: Number((prev.currentAmount + grossAmount).toFixed(2)),
      }));
    } else if (type === 'paywall_unlock' && itemId) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === itemId && !p.unlockedUserEmails.includes(customerEmail)
            ? { ...p, unlockedUserEmails: [...p.unlockedUserEmails, customerEmail], reads: p.reads + 1 }
            : p
        )
      );
    }

    // Update affiliate if applicable
    if (affiliateCode) {
      setAffiliates((prev) =>
        prev.map((aff) => {
          if (aff.code.toUpperCase() === affiliateCode.trim().toUpperCase()) {
            const commission = Number(((grossAmount * aff.commissionRate) / 100).toFixed(2));
            return {
              ...aff,
              salesCount: aff.salesCount + 1,
              totalEarned: aff.totalEarned + commission,
            };
          }
          return aff;
        })
      );
    }

    // Update coupon usage if applicable
    if (couponCode) {
      setCoupons((prev) =>
        prev.map((c) =>
          c.code.toUpperCase() === couponCode.trim().toUpperCase()
            ? { ...c, usedCount: c.usedCount + 1 }
            : c
        )
      );
    }

    // Play sound & celebratory fireworks/toast
    playCashSound();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // Ignored if confetti fails
    }

    // Instant Auto-Payout: Honor preferredPayoutChannel & autoFlowWithdrawals (Express, Visa Direct, or Transferência Bancária)
    const preferred = creator.preferredPayoutChannel;
    const autoFlow = creator.autoFlowWithdrawals ?? true;
    const isAutoExpress =
      preferred === 'express'
        ? Boolean(creator.autoPayoutExpress ?? autoFlow)
        : Boolean(creator.autoPayoutExpress && preferred !== 'ted' && preferred !== 'visa_card');
    const isAutoVisa =
      !isAutoExpress &&
      preferred === 'visa_card' &&
      Boolean(creator.autoPayoutVisa ?? autoFlow);
    const isAutoBankTransfer =
      !isAutoExpress &&
      !isAutoVisa &&
      preferred === 'ted' &&
      Boolean(autoFlow && creator.bankAccount?.bankName && creator.bankAccount?.accountNumber);

    if (isAutoExpress && netAmount > 0) {
      const expPhone = creator.expressPhone || creator.phone || '+244 923 456 789';
      const expBank = creator.expressBankName || 'Banco BAI Angola';
      const authCode = `AUTH-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
      const emisRef = `EMIS-AO-${Date.now().toString().slice(-8)}`;

      const autoExpressWithdrawal: WithdrawalRequest = {
        id: `wd-${Date.now().toString().slice(-6)}`,
        amount: netAmount,
        fee: 0,
        netAmount,
        destinationType: 'express',
        destinationKey: expPhone,
        status: 'completed',
        requestedAt: new Date().toISOString(),
        settledAt: new Date().toISOString(),
        receiptNumber: `EXP-AUTO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`,
        expressDetails: {
          phoneOrId: expPhone,
          network: 'Multicaixa Express / EMIS Angola',
          bankName: expBank,
          authorizationCode: authCode,
          emisReference: emisRef,
          settlementStatus: 'credited',
        },
      };

      setWithdrawals((prev) => [autoExpressWithdrawal, ...prev]);
    } else if (isAutoVisa && netAmount > 0) {
      const last4 = creator.savedVisaCard?.last4 || '4829';
      const holder = creator.savedVisaCard?.holderName || creator.name.toUpperCase();
      const authCode = `AUTH-VISA-${Math.floor(100000 + Math.random() * 900000)}`;

      const autoWithdrawal: WithdrawalRequest = {
        id: `wd-${Date.now().toString().slice(-6)}`,
        amount: netAmount,
        fee: 0,
        netAmount: netAmount,
        destinationType: 'visa_card',
        destinationKey: `•••• •••• •••• ${last4}`,
        status: 'completed',
        requestedAt: new Date().toISOString(),
        settledAt: new Date().toISOString(),
        receiptNumber: `VISA-AUTO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`,
        visaDetails: {
          holderName: holder,
          last4,
          authorizationCode: authCode,
        },
      };

      setWithdrawals((prev) => [autoWithdrawal, ...prev]);
    } else if (isAutoBankTransfer && netAmount > 0 && creator.bankAccount) {
      const bankKey = `${creator.bankAccount.bankName} / Ag: ${creator.bankAccount.agency} / CC: ${creator.bankAccount.accountNumber}`;
      const autoTedWithdrawal: WithdrawalRequest = {
        id: `wd-${Date.now().toString().slice(-6)}`,
        amount: netAmount,
        fee: 0,
        netAmount,
        destinationType: 'ted',
        destinationKey: bankKey,
        status: 'completed',
        requestedAt: new Date().toISOString(),
        settledAt: new Date().toISOString(),
        receiptNumber: `TED-AUTO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`,
      };

      setWithdrawals((prev) => [autoTedWithdrawal, ...prev]);
    }

    setActiveToast({
      id: newTransaction.id,
      title: isAutoExpress
        ? `${title} (Caiu na hora no Multicaixa Express ${creator.expressPhone || '+244 923 456 789'})`
        : isAutoVisa
        ? `${title} (Creditado no Visa •••• ${creator.savedVisaCard?.last4 || '4829'})`
        : isAutoBankTransfer
        ? `${title} (Agendado via Transferência Bancária ${creator.bankAccount?.bankName || ''})`
        : title,
      amount: grossAmount,
      customerName: newTransaction.customerName,
      method: paymentMethod,
      type,
    });

    setPendingReviewTransaction(newTransaction);

    void trackAnalyticsEvent({
      category: 'revenue',
      eventType: 'checkout_completed',
      source: 'checkout',
      screenOrTab: `checkout:${type}`,
      revenueSource: type,
      amountBRL: grossAmount,
      metadata: {
        paymentMethod,
        hasAffiliate: Boolean(affiliateCode),
      },
    });

    awardActionReward(
      type === 'subscription' ? 'subscription_started' : 'purchase_completed',
      title
    );

    if (affiliateCode) {
      awardActionReward('affiliate_referral', affiliateCode.toUpperCase());
    }

    return { success: true, transaction: newTransaction };
  };

  // Withdrawals (Levantamentos Visa Direct, Express, Pix & TED)
  const requestWithdrawal = ({
    amount,
    destinationType,
    destinationKey,
    visaDetails,
    expressDetails,
  }: {
    amount: number;
    destinationType: 'pix' | 'ted' | 'paypal' | 'visa_card' | 'express';
    destinationKey: string;
    visaDetails?: {
      holderName: string;
      last4: string;
    };
    expressDetails?: {
      phoneOrId: string;
      network?: string;
      bankName?: string;
      iban?: string;
      pspTransactionId?: string;
      pspProvider?: string;
      isLivePsp?: boolean;
      settlementStatus?: 'processing' | 'authorized' | 'credited';
    };
  }) => {
    if (currentUser?.status === 'suspended') {
      return {
        success: false,
        error: 'Conta suspensa pela administração. Entre em contato com o suporte para reativação.',
      };
    }
    if (platformAdminSettings.kycRequiredForPayouts && currentUser?.kycVerified === false) {
      return {
        success: false,
        error: 'Verificação KYC pendente. Aprove o KYC no Painel Administrativo antes de sacar.',
      };
    }
    if (amount <= 0) {
      return { success: false, error: 'O valor do saque deve ser maior que zero.' };
    }
    if (amount < platformAdminSettings.minWithdrawalAmount && availableBalance >= platformAdminSettings.minWithdrawalAmount) {
      return {
        success: false,
        error: `O valor mínimo para saque configurado na plataforma é R$ ${platformAdminSettings.minWithdrawalAmount.toFixed(2)}.`,
      };
    }
    if (amount > availableBalance) {
      return {
        success: false,
        error: `Saldo insuficiente. Disponível para saque: R$ ${availableBalance.toFixed(2)}`,
      };
    }
    if (!destinationKey.trim()) {
      return { success: false, error: 'Informe os dados de destino do saque.' };
    }

    const isVisa = destinationType === 'visa_card';
    const isExpress = destinationType === 'express';
    const receiptPrefix = isVisa ? 'VISA-DIR' : isExpress ? 'EXP-AO' : 'PIX-BR';
    const authCode = isVisa
      ? `AUTH-VISA-${Math.floor(100000 + Math.random() * 900000)}`
      : isExpress
      ? `AUTH-EXP-${Math.floor(100000 + Math.random() * 900000)}`
      : undefined;
    const emisRef = isExpress
      ? expressDetails?.pspTransactionId || `EMIS-AO-${Date.now().toString().slice(-8)}`
      : undefined;
    const settledNow = new Date().toISOString();
    const expressStatus =
      expressDetails?.settlementStatus || (expressDetails?.isLivePsp ? 'processing' : 'credited');

    const newWd: WithdrawalRequest = {
      id: `wd-${Date.now().toString().slice(-6)}`,
      amount,
      fee: 0,
      netAmount: amount,
      destinationType,
      destinationKey,
      status: expressStatus === 'processing' ? 'processing' : 'completed',
      requestedAt: settledNow,
      settledAt: expressStatus === 'processing' ? undefined : settledNow,
      receiptNumber: `${receiptPrefix}-${settledNow.slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`,
      visaDetails: isVisa
        ? {
            holderName: visaDetails?.holderName || 'TITULAR DO CARTAO',
            last4: visaDetails?.last4 || destinationKey.slice(-4),
            authorizationCode: authCode || 'AUTH-VISA-OK',
          }
        : undefined,
      expressDetails: isExpress
        ? {
            phoneOrId: expressDetails?.phoneOrId || destinationKey,
            network: expressDetails?.network || 'Multicaixa Express / Switch EMIS Angola',
            bankName: expressDetails?.bankName || creator.expressBankName || 'Banco BAI Angola',
            iban: expressDetails?.iban || creator.expressIban,
            authorizationCode: authCode || 'AUTH-EXP-OK',
            emisReference: emisRef,
            pspTransactionId: expressDetails?.pspTransactionId,
            pspProvider: expressDetails?.pspProvider,
            isLivePsp: expressDetails?.isLivePsp,
            settlementStatus: expressStatus,
          }
        : undefined,
    };

    setWithdrawals((prev) => [newWd, ...prev]);
    playCashSound();
    try {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 } });
    } catch {
      // Ignore confetti errors
    }

    setActiveToast({
      id: `toast-${newWd.id}`,
      title: isExpress
        ? `Multicaixa Express: ${destinationKey} creditado na hora!`
        : isVisa
        ? `Visa Direct: Saque liquidado no cartão ${destinationKey}`
        : `Saque via ${destinationType.toUpperCase()} concluído`,
      amount,
      customerName: creator.name,
      method: isExpress ? 'multicaixa' : 'pix',
      type: 'withdrawal',
    });

    // Log notification audit for withdrawal
    addNotificationAudit({
      type: 'withdrawal_processed',
      channel: notificationSettings.minBalanceChannel || 'both',
      title: isVisa
        ? 'Levantamento no Cartão Visa Autorizado'
        : isExpress
        ? 'Saque Multicaixa Express Creditado na Hora'
        : 'Levantamento Bancário Processado',
      reason: isVisa
        ? `Levantamento de R$ ${amount.toFixed(2)} transferido via Visa Direct para o cartão Visa (${destinationKey}).`
        : isExpress
        ? `Levantamento em tempo real de R$ ${amount.toFixed(2)} liquidado via switch EMIS Angola para ${destinationKey} (${expressDetails?.bankName || creator.expressBankName || 'Banco BAI Angola'}).`
        : `Transferência de R$ ${amount.toFixed(2)} liquidada com sucesso via ${destinationType.toUpperCase()}.`,
      destination: isVisa
        ? `Cartão Visa ${destinationKey}`
        : isExpress
        ? `Multicaixa Express ${destinationKey}`
        : destinationKey,
      amount,
      currency: 'BRL',
      status: 'delivered',
    });

    return { success: true, withdrawal: newWd };
  };

  const reconcileExpressSettlement = ({
    pspTransactionId,
    reference,
    status,
  }: {
    pspTransactionId: string;
    reference?: string;
    status: 'pending' | 'credited' | 'failed';
  }) => {
    if (status === 'pending') return;
    setWithdrawals((prev) => {
      let changed = false;
      const next = prev.map((wd) => {
        if (wd.destinationType !== 'express') return wd;
        const matchesTx =
          wd.expressDetails?.pspTransactionId === pspTransactionId ||
          wd.expressDetails?.emisReference === pspTransactionId ||
          (reference ? wd.expressDetails?.emisReference === reference : false);
        if (!matchesTx) return wd;
        const targetWdStatus: 'completed' | 'failed' =
          status === 'credited' ? 'completed' : 'failed';
        if (wd.status === targetWdStatus) {
          return wd;
        }
        changed = true;
        return {
          ...wd,
          status: targetWdStatus,
          settledAt: status === 'credited' ? new Date().toISOString() : wd.settledAt,
          failureReason:
            status === 'failed'
              ? 'Liquidação recusada pelo provedor PSP / rede EMIS.'
              : undefined,
          expressDetails: {
            ...wd.expressDetails!,
            settlementStatus: status === 'credited' ? ('credited' as const) : ('authorized' as const),
          },
        };
      });
      return changed ? next : prev;
    });
  };

  const syncRealOrderToLedger = (order: RealSaleOrder) => {
    setRealOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx === -1) return [order, ...prev];
      const next = [...prev];
      next[idx] = order;
      return next;
    });

    if (order.status === 'failed') {
      setTransactions((prev) => prev.filter((t) => t.id !== order.id));
      return;
    }

    const mappedStatus: TransactionStatus =
      order.status === 'approved'
        ? 'approved'
        : order.status === 'refunded'
        ? 'refunded'
        : 'pending';

    const existingTx = transactions.find((t) => t.id === order.id);
    if (mappedStatus === 'approved' && existingTx?.status === 'approved') {
      return;
    }
    if (mappedStatus === 'approved' && creditedOrderIdsRef.current.has(order.id)) {
      return;
    }

    processCheckout({
      id: order.id,
      type: order.type,
      itemId: order.itemId,
      grossAmount: order.grossAmount,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      paymentMethod: order.paymentMethod,
      status: mappedStatus,
      message: order.message,
      affiliateCode: order.affiliateCode,
      couponCode: order.couponCode,
    });
  };

  useEffect(() => {
    refreshSalesState();
    const unsubscribe = subscribeExpressStream((eventName, payload) => {
      if (eventName === 'ledger_snapshot' && Array.isArray(payload.orders)) {
        setRealOrders(payload.orders as RealSaleOrder[]);
      } else if (
        (eventName === 'sale_created' || eventName === 'sale_updated') &&
        payload.order
      ) {
        syncRealOrderToLedger(payload.order as RealSaleOrder);
      }
    });
    return unsubscribe;
  }, []);

  // Simulates a live sale (great for demonstrating the engine)
  const simulateRandomSale = () => {
    const firstNames = ['Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gustavo', 'Helena', 'Igor', 'Juliana', 'Larissa', 'Matheus', 'Patricia', 'Renan', 'Sofia'];
    const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins'];
    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomName = `${randomFirstName} ${randomLastName}`;
    const randomEmail = `${randomFirstName.toLowerCase()}.${randomLastName.toLowerCase()}@exemplo.com`;

    const saleTypes: Array<'product_sale' | 'subscription' | 'tip' | 'paywall_unlock'> = [
      'product_sale',
      'product_sale',
      'subscription',
      'tip',
      'paywall_unlock',
    ];
    const pickedType = saleTypes[Math.floor(Math.random() * saleTypes.length)];
    const paymentMethods: PaymentMethod[] = ['pix', 'pix', 'credit_card', 'credit_card'];
    const pickedMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    if (pickedType === 'product_sale') {
      const prod = products[Math.floor(Math.random() * products.length)];
      processCheckout({
        type: 'product_sale',
        itemId: prod.id,
        grossAmount: prod.price,
        customerName: randomName,
        customerEmail: randomEmail,
        paymentMethod: pickedMethod,
      });
    } else if (pickedType === 'subscription') {
      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      processCheckout({
        type: 'subscription',
        itemId: tier.id,
        grossAmount: tier.monthlyPrice,
        customerName: randomName,
        customerEmail: randomEmail,
        paymentMethod: pickedMethod,
      });
    } else if (pickedType === 'tip') {
      const tipValues = [15, 25, 50, 100];
      const tipAmount = tipValues[Math.floor(Math.random() * tipValues.length)];
      const sampleMessages = [
        'Excelente conteúdo, continue assim!',
        'Seus insights mudaram minha visão sobre negócios.',
        'Apoio merecido! Forte abraço.',
        'Ajudando a bater a meta do canal!',
      ];
      processCheckout({
        type: 'tip',
        grossAmount: tipAmount,
        customerName: randomName,
        customerEmail: randomEmail,
        paymentMethod: 'pix',
        message: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
      });
    } else {
      const post = posts[Math.floor(Math.random() * posts.length)];
      processCheckout({
        type: 'paywall_unlock',
        itemId: post.id,
        grossAmount: post.unlockPrice,
        customerName: randomName,
        customerEmail: randomEmail,
        paymentMethod: pickedMethod,
      });
    }
  };

  // Add / Edit Product
  const addProduct = (productData: Omit<DigitalProduct, 'id' | 'salesCount' | 'viewsCount' | 'rating' | 'ratingsCount'>) => {
    const newProduct: DigitalProduct = {
      ...productData,
      id: `prod-${Date.now().toString().slice(-6)}`,
      salesCount: 0,
      viewsCount: 1,
      rating: 5.0,
      ratingsCount: 1,
    };
    setProducts((prev) => [newProduct, ...prev]);
    awardActionReward('product_published', newProduct.title);
    void trackAnalyticsEvent({
      category: 'usage_pattern',
      eventType: 'feature_used',
      source: 'studio',
      screenOrTab: 'products',
      metadata: { action: 'product_created' },
    });
  };

  const updateProduct = (id: string, updates: Partial<DigitalProduct>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Subscription tiers management
  const updateTier = (id: string, updates: Partial<SubscriptionTier>) => {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const addTier = (tierData: Omit<SubscriptionTier, 'id' | 'activeMembers'>) => {
    const newTier: SubscriptionTier = {
      ...tierData,
      id: `tier-${Date.now().toString().slice(-6)}`,
      activeMembers: 0,
    };
    setTiers((prev) => [...prev, newTier]);
  };

  const deleteTier = (id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
  };

  // Tip goal update
  const updateTipGoal = (updates: Partial<TipGoal>) => {
    setTipGoal((prev) => ({ ...prev, ...updates }));
    playSuccessSound();
  };

  // Contribute directly to goal (from follower donation or simulated pledge)
  const contributeToGoal = (amount: number, supporterName?: string, message?: string) => {
    if (amount <= 0) return;
    const name = supporterName || 'Seguidor Apoiador';
    const newCurrent = Number((tipGoal.currentAmount + amount).toFixed(2));
    const newSupporters = (tipGoal.supportersCount || 0) + 1;

    setTipGoal((prev) => ({
      ...prev,
      currentAmount: newCurrent,
      supportersCount: newSupporters,
    }));

    const newTx: Transaction = {
      id: `tx-goal-${Date.now().toString().slice(-6)}`,
      type: 'tip',
      title: `Apoio para a Meta: ${tipGoal.title}`,
      customerName: name,
      customerEmail: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@gmail.com`,
      grossAmount: amount,
      netAmount: amount,
      fee: 0,
      paymentMethod: 'pix',
      status: 'approved',
      cleared: true,
      createdAt: new Date().toISOString(),
      message: message || 'Contribuindo para a meta de arrecadação mensal!',
    };

    setTransactions((prev) => [newTx, ...prev]);

    setActiveToast({
      id: newTx.id,
      title: `Nova Contribuição de R$ ${amount.toFixed(2)} para a Meta!`,
      amount,
      customerName: name,
      method: 'pix',
      type: 'tip',
    });

    playCashSound();
    if (newCurrent >= tipGoal.targetAmount) {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
    } else {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  // Gated posts management
  const addGatedPost = (postData: Omit<GatedPost, 'id' | 'publishedAt' | 'likes' | 'reads' | 'unlockedUserEmails'>) => {
    const newPost: GatedPost = {
      ...postData,
      id: `post-${Date.now().toString().slice(-6)}`,
      publishedAt: new Date().toISOString(),
      likes: 1,
      reads: 0,
      unlockedUserEmails: [],
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  const unlockPost = (postId: string, userEmail: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId && !p.unlockedUserEmails.includes(userEmail)
          ? { ...p, unlockedUserEmails: [...p.unlockedUserEmails, userEmail] }
          : p
      )
    );
  };

  const likePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );
  };

  // Affiliates management
  const addAffiliate = (partnerData: Omit<AffiliatePartner, 'id' | 'clicks' | 'salesCount' | 'totalEarned'>) => {
    const newAffiliate: AffiliatePartner = {
      ...partnerData,
      id: `aff-${Date.now().toString().slice(-6)}`,
      clicks: 0,
      salesCount: 0,
      totalEarned: 0,
    };
    setAffiliates((prev) => [newAffiliate, ...prev]);
  };

  // Coupons
  const addCoupon = (coupon: DiscountCoupon) => {
    const normalizedCode = coupon.code.trim().toUpperCase();
    setCoupons((prev) => {
      const filtered = prev.filter((c) => c.code.toUpperCase() !== normalizedCode);
      return [
        {
          ...coupon,
          code: normalizedCode,
          createdAt: coupon.createdAt || new Date().toISOString(),
        },
        ...filtered,
      ];
    });
  };

  const updateCoupon = (originalCode: string, updates: Partial<DiscountCoupon>) => {
    const targetUpper = originalCode.trim().toUpperCase();
    const nextUpper = updates.code ? updates.code.trim().toUpperCase() : targetUpper;
    setCoupons((prev) =>
      prev
        .filter((c) => c.code.toUpperCase() === targetUpper || c.code.toUpperCase() !== nextUpper)
        .map((c) =>
          c.code.toUpperCase() === targetUpper
            ? {
                ...c,
                ...updates,
                code: nextUpper,
              }
            : c
        )
    );
  };

  const toggleCouponActive = (code: string) => {
    const targetUpper = code.trim().toUpperCase();
    setCoupons((prev) =>
      prev.map((c) =>
        c.code.toUpperCase() === targetUpper ? { ...c, active: !c.active } : c
      )
    );
  };

  const deleteCoupon = (code: string) => {
    const targetUpper = code.trim().toUpperCase();
    setCoupons((prev) => prev.filter((c) => c.code.toUpperCase() !== targetUpper));
  };

  // Creator Profile
  const updateCreatorProfile = (updates: Partial<CreatorProfile>) => {
    setCreator((prev) => {
      const next = { ...prev, ...updates };
      latestCreatorRef.current = next;
      return next;
    });
  };

  const saveEncryptedCreatorSettings = async (
    profileUpdates: Partial<CreatorProfile>,
    notifUpdates?: Partial<NotificationThresholdSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    const nextCreator: CreatorProfile = {
      ...latestCreatorRef.current,
      ...profileUpdates,
    };
    const nextNotif: NotificationThresholdSettings = notifUpdates
      ? { ...latestNotificationSettingsRef.current, ...notifUpdates }
      : latestNotificationSettingsRef.current;

    if (notifUpdates) {
      nextCreator.notificationSettings = nextNotif;
      latestNotificationSettingsRef.current = nextNotif;
      setNotificationSettings(nextNotif);
      isNotificationVaultHydratedRef.current = true;
    }

    latestCreatorRef.current = nextCreator;
    isCreatorVaultHydratedRef.current = true;
    setCreator(nextCreator);

    const [creatorResult] = await Promise.all([
      persistCreatorVaultNow(nextCreator, {
        notificationDestinationEmail: nextNotif.destinationEmail,
      }),
      persistNotificationVaultNow(nextNotif),
    ]);

    return {
      success: creatorResult.success,
      error: creatorResult.error,
    };
  };

  const reencryptCreatorVault = async (options?: {
    customPassphrase?: string;
    rotateDeviceKey?: boolean;
  }): Promise<{ success: boolean; error?: string }> => {
    if (creatorVaultStatus.locked) {
      return {
        success: false,
        error: 'Desbloqueie o cofre com sua frase-senha atual antes de rotacionar as chaves.',
      };
    }

    if (options?.rotateDeviceKey) {
      rotateDeviceVaultSecret();
    }
    if (options?.customPassphrase !== undefined) {
      const trimmed = options.customPassphrase.trim();
      customVaultPassphraseRef.current = trimmed.length > 0 ? trimmed : undefined;
    }

    isCreatorVaultHydratedRef.current = true;
    isNotificationVaultHydratedRef.current = true;

    const result = await persistCreatorVaultNow(latestCreatorRef.current, {
      customPassphrase: customVaultPassphraseRef.current,
      notificationDestinationEmail: latestNotificationSettingsRef.current.destinationEmail,
    });
    await persistNotificationVaultNow(
      latestNotificationSettingsRef.current,
      customVaultPassphraseRef.current
    );

    return { success: result.success, error: result.error };
  };

  const unlockCreatorVault = async (
    passphrase: string
  ): Promise<{ success: boolean; error?: string }> => {
    const envelope = pendingEncryptedEnvelopeRef.current || encryptedCreatorEnvelope;
    if (!envelope) {
      return { success: false, error: 'Nenhum envelope criptografado encontrado para desbloquear.' };
    }
    const trimmed = passphrase.trim();
    if (!trimmed) {
      return { success: false, error: 'Informe a frase-senha do cofre AES-256.' };
    }

    try {
      const vault = await decryptJsonAes256<SensitiveCreatorVault>(
        envelope.encryptedVault,
        trimmed
      );
      customVaultPassphraseRef.current = trimmed;
      const restored = mergeCreatorWithVault(envelope.maskedProfile, vault);
      latestCreatorRef.current = restored;
      setCreator(restored);

      if (vault.notificationDestinationEmail) {
        const nextNotif = {
          ...latestNotificationSettingsRef.current,
          destinationEmail: vault.notificationDestinationEmail,
        };
        latestNotificationSettingsRef.current = nextNotif;
        setNotificationSettings(nextNotif);
      }

      isCreatorVaultHydratedRef.current = true;
      isNotificationVaultHydratedRef.current = true;

      setCreatorVaultStatus((prev) => ({
        ...prev,
        locked: false,
        hasCustomPassphrase: true,
        lastError: null,
      }));
      return { success: true };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Frase-senha incorreta para o cofre AES-256-GCM.';
      setCreatorVaultStatus((prev) => ({ ...prev, lastError: msg }));
      return { success: false, error: msg };
    }
  };

  const lockCreatorVault = () => {
    if (!creatorVaultStatus.hasCustomPassphrase) return;
    customVaultPassphraseRef.current = undefined;
    isCreatorVaultHydratedRef.current = false;
    isNotificationVaultHydratedRef.current = false;
    if (encryptedCreatorEnvelope) {
      setCreator(encryptedCreatorEnvelope.maskedProfile);
    }
    setCreatorVaultStatus((prev) => ({
      ...prev,
      locked: true,
      lastError: null,
    }));
  };

  const clearCustomVaultPassphrase = async (): Promise<{ success: boolean; error?: string }> => {
    if (creatorVaultStatus.locked) {
      return {
        success: false,
        error: 'Desbloqueie o cofre antes de remover a frase-senha personalizada.',
      };
    }
    customVaultPassphraseRef.current = undefined;
    const result = await persistCreatorVaultNow(latestCreatorRef.current, {
      customPassphrase: '',
      notificationDestinationEmail: latestNotificationSettingsRef.current.destinationEmail,
    });
    await persistNotificationVaultNow(latestNotificationSettingsRef.current, '');
    return { success: result.success, error: result.error };
  };

  const syncCreatorVaultToDatabase = async (): Promise<{ success: boolean; error?: string }> => {
    if (creatorVaultStatus.locked) {
      return { success: false, error: 'Desbloqueie o cofre antes de sincronizar.' };
    }
    const result = await persistCreatorVaultNow(latestCreatorRef.current);
    return { success: result.success, error: result.error };
  };

  // Instant release / anticipation of pending balance
  const releasePendingBalance = () => {
    const oneDayAgo = Date.now() - 1000 * 60 * 60 * 24;
    const hasUncleared = transactions.some(
      (t) => t.status === 'approved' && !t.cleared && new Date(t.createdAt).getTime() > oneDayAgo
    );

    if (hasUncleared) {
      setTransactions((prev) =>
        prev.map((t) => ({ ...t, cleared: true }))
      );
    } else {
      // If there are no pending transactions, credit an instant advance sale of R$ 500,00 directly to available balance
      const bonusTx: Transaction = {
        id: `tx-inst-${Date.now().toString().slice(-6)}`,
        type: 'product_sale',
        title: 'Venda Aprovada Imediata: Cartão Visa',
        customerName: 'Cliente Apoiador Amidel',
        customerEmail: 'cliente.apoiador@exemplo.com',
        grossAmount: 500.0,
        fee: 25.0,
        netAmount: 475.0,
        paymentMethod: 'credit_card',
        status: 'approved',
        cleared: true,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [bonusTx, ...prev]);
    }

    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    playCashSound();
  };

  const addInstantBalance = (customGross = 500) => {
    const fee = Number((customGross * 0.05).toFixed(2));
    const net = customGross - fee;
    const bonusTx: Transaction = {
      id: `tx-inst-${Date.now().toString().slice(-6)}`,
      type: 'product_sale',
      title: 'Venda Aprovada Imediata: Cartão Visa',
      customerName: 'Cliente VIP Aprovado',
      customerEmail: 'cliente.vip@exemplo.com',
      grossAmount: customGross,
      fee,
      netAmount: net,
      paymentMethod: 'credit_card',
      status: 'approved',
      cleared: true,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [bonusTx, ...prev]);
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    playCashSound();
  };

  // In-App Purchase function
  const purchaseInAppFeature = (featureId: string, paymentMethod: PaymentMethod = 'credit_card') => {
    const item = inAppFeatures.find((f) => f.id === featureId);
    if (!item) return { success: false, message: 'Item de compra não encontrado.' };

    if (purchasedFeatureIds.includes(featureId)) {
      return { success: false, message: 'Este recurso já foi adquirido e está ativo no seu aplicativo!' };
    }

    setPurchasedFeatureIds((prev) => [...prev, featureId]);

    const newTx: Transaction = {
      id: `tx-iap-${Date.now().toString().slice(-6)}`,
      type: 'product_sale',
      title: `Compra no App: ${item.title}`,
      customerName: creator.name,
      customerEmail: creator.email || 'amidelcatondiamy@gmail.com',
      grossAmount: item.price,
      fee: 0,
      netAmount: item.price,
      paymentMethod,
      status: 'approved',
      cleared: true,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    setPendingReviewTransaction(newTx);

    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    playSuccessSound();

    return {
      success: true,
      message: `Recurso "${item.title}" desbloqueado com sucesso no seu aplicativo!`,
    };
  };

  // Visa Settlement Accelerator
  const settleVisaWithdrawalNow = (withdrawalId?: string) => {
    setWithdrawals((prev) =>
      prev.map((w) => {
        if (!withdrawalId || w.id === withdrawalId || w.destinationType === 'visa_card') {
          return {
            ...w,
            status: 'completed',
            settledAt: new Date().toISOString(),
            visaDetails: {
              holderName: w.visaDetails?.holderName || 'AMIDEL CATONDI',
              last4: w.visaDetails?.last4 || '4829',
              authorizationCode: w.visaDetails?.authorizationCode || `AUTH-VISA-${Math.floor(100000 + Math.random() * 900000)}`,
              networkReference: w.visaDetails?.networkReference || `ARN-VISA-${Date.now().toString().slice(-8)}`,
              bankName: w.visaDetails?.bankName || 'Banco Emissor do Cartão Visa',
              settlementStatus: 'credited',
            },
          };
        }
        return w;
      })
    );
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    playSuccessSound();
    return {
      success: true,
      message: 'Depósito liquidado com sucesso! Valor creditado no seu Cartão Visa final 4829.',
    };
  };

  // Custom Available Balance Setter
  const setCustomAvailableBalance = (targetAmount: number) => {
    if (isNaN(targetAmount) || targetAmount < 0) return;
    const diff = targetAmount - availableBalance;
    if (Math.abs(diff) < 0.01) return;

    if (diff > 0) {
      const adjTx: Transaction = {
        id: `tx-adj-${Date.now().toString().slice(-6)}`,
        type: 'product_sale',
        title: 'Ajuste de Saldo / Faturamento Confirmado',
        customerName: 'Ajuste Oficial da Criadora',
        customerEmail: 'amidelcatondiamy@gmail.com',
        grossAmount: diff,
        fee: 0,
        netAmount: diff,
        paymentMethod: 'pix',
        status: 'approved',
        cleared: true,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [adjTx, ...prev]);
    } else {
      const deductAmount = Math.abs(diff);
      const adjWd: WithdrawalRequest = {
        id: `wd-adj-${Date.now().toString().slice(-6)}`,
        amount: deductAmount,
        fee: 0,
        netAmount: deductAmount,
        destinationType: 'visa_card',
        destinationKey: '•••• •••• •••• 4829',
        status: 'completed',
        requestedAt: new Date().toISOString(),
        settledAt: new Date().toISOString(),
        receiptNumber: `VISA-ADJ-${Date.now().toString().slice(-8)}`,
        visaDetails: {
          holderName: 'AMIDEL CATONDI',
          last4: '4829',
          authorizationCode: 'AUTH-VISA-ADJ',
          settlementStatus: 'credited',
        },
      };
      setWithdrawals((prev) => [adjWd, ...prev]);
    }

    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    playCashSound();
  };

  // Force clean sync of transactions & withdrawals
  const syncAndResetHealthyBalance = () => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}transactions`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}withdrawals`);
    setTransactions(initialTransactions);
    setWithdrawals(initialWithdrawals);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    playSuccessSound();
  };

  // 6. Admin Governance Actions
  const addAdminAuditLog = (item: Omit<AdminAuditLogItem, 'id' | 'timestamp'>) => {
    const newEntry: AdminAuditLogItem = {
      ...item,
      id: `adm-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    setAdminAuditLogs((prev) => [newEntry, ...prev].slice(0, 50));
  };

  const updatePlatformAdminSettings = (updates: Partial<PlatformAdminSettings>) => {
    setPlatformAdminSettings((prev) => ({ ...prev, ...updates }));
    addAdminAuditLog({
      actorName: currentUser?.name || 'Admin',
      action: 'Configurações globais da plataforma atualizadas',
      target: Object.keys(updates).join(', '),
      category: 'settings',
      severity: updates.maintenanceMode ? 'warning' : 'info',
    });
    playSuccessSound();
  };

  const adminUpdateUser = (userId: string, updates: Partial<UserAccount>) => {
    const targetUser = allUsers.find((u) => u.id === userId);
    setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    if (targetUser) {
      const desc =
        updates.status === 'suspended'
          ? 'Conta de usuário suspensa'
          : updates.status === 'active' && targetUser.status === 'suspended'
          ? 'Conta de usuário reativada'
          : updates.kycVerified === true && !targetUser.kycVerified
          ? 'Verificação KYC aprovada'
          : updates.role && updates.role !== targetUser.role
          ? `Perfil alterado para ${updates.role}`
          : 'Dados de usuário atualizados';
      addAdminAuditLog({
        actorName: currentUser?.name || 'Admin',
        action: desc,
        target: `${targetUser.name} (@${targetUser.handle})`,
        category: 'users',
        severity: updates.status === 'suspended' ? 'warning' : 'info',
      });
    }
    playSuccessSound();
  };

  const adminCreateUser = (data: {
    name: string;
    email: string;
    role: 'creator' | 'client' | 'admin';
    category?: string;
    kycVerified?: boolean;
  }): UserAccount => {
    const cleanHandle = data.name.toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Date.now().toString().slice(-4)}`;
    const verified = data.kycVerified ?? data.role === 'admin';
    const newUser: UserAccount = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      name: data.name.trim(),
      email: data.email.trim(),
      handle: cleanHandle,
      avatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      tagline:
        data.role === 'admin'
          ? 'Administrador da plataforma MonetizaHub'
          : data.role === 'creator'
          ? 'Criador verificado na plataforma'
          : 'Membro e comprador verificado',
      bio: 'Conta provisionada via Painel Administrativo.',
      category: data.category || 'Geral & Negócios',
      role: data.role,
      status: verified ? 'active' : 'pending_kyc',
      kycVerified: verified,
      createdAt: new Date().toISOString(),
      showcaseItems: [],
      purchasedProductIds: [],
      activeSubscriptions: [],
      loyaltyPoints: 0,
    };
    setAllUsers((prev) => [newUser, ...prev]);
    addAdminAuditLog({
      actorName: currentUser?.name || 'Admin',
      action: `Novo usuário criado (${data.role})`,
      target: `${newUser.name} (${newUser.email})`,
      category: 'users',
      severity: 'info',
    });
    playSuccessSound();
    return newUser;
  };

  const adminDeleteUser = (userId: string) => {
    if (userId === currentUserId) return;
    const targetUser = allUsers.find((u) => u.id === userId);
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    if (targetUser) {
      addAdminAuditLog({
        actorName: currentUser?.name || 'Admin',
        action: 'Usuário removido da plataforma',
        target: `${targetUser.name} (${targetUser.email})`,
        category: 'users',
        severity: 'critical',
      });
    }
  };

  const adminUpdateTransactionStatus = (txId: string, status: TransactionStatus) => {
    const targetTx = transactions.find((t) => t.id === txId);
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === txId
          ? {
              ...tx,
              status,
              cleared: status === 'approved' ? true : tx.cleared,
            }
          : tx
      )
    );
    if (targetTx) {
      addAdminAuditLog({
        actorName: currentUser?.name || 'Admin',
        action: `Status da transação alterado para ${
          status === 'approved' ? 'Aprovada' : status === 'pending' ? 'Pendente' : 'Estornada'
        }`,
        target: `${targetTx.id} (${targetTx.customerName})`,
        category: 'finance',
        severity: status === 'refunded' ? 'warning' : 'info',
      });
    }
    playSuccessSound();
  };

  const adminUpdateWithdrawalStatus = (
    wdId: string,
    status: WithdrawalRequest['status'],
    reason?: string
  ) => {
    const targetWd = withdrawals.find((w) => w.id === wdId);
    const nowIso = new Date().toISOString();
    setWithdrawals((prev) =>
      prev.map((wd) => {
        if (wd.id !== wdId) return wd;
        const reqMs = new Date(wd.requestedAt).getTime();
        const durSec =
          status === 'completed' && Number.isFinite(reqMs)
            ? Math.max(1, Math.round((Date.now() - reqMs) / 1000))
            : wd.settlementSeconds;
        return {
          ...wd,
          status,
          settledAt: status === 'completed' || status === 'reversed' ? nowIso : undefined,
          settlementSeconds: durSec,
          failureReason:
            status === 'failed'
              ? reason || 'Saque recusado na validação administrativa.'
              : status === 'reversed'
              ? reason || 'Saque estornado ao saldo disponível pela administração.'
              : undefined,
          visaDetails: wd.visaDetails
            ? {
                ...wd.visaDetails,
                settlementStatus: status === 'completed' ? 'credited' : 'processing',
              }
            : undefined,
          expressDetails: wd.expressDetails
            ? {
                ...wd.expressDetails,
                settlementStatus: status === 'completed' ? 'credited' : 'processing',
              }
            : undefined,
        };
      })
    );
    if (targetWd) {
      const label =
        status === 'completed'
          ? 'Sucesso'
          : status === 'processing'
          ? 'Processando'
          : status === 'failed'
          ? 'Falha'
          : 'Estornado';
      addAdminAuditLog({
        actorName: currentUser?.name || 'Admin',
        action: `Status do saque atualizado para ${label}`,
        target: `${targetWd.receiptNumber} (R$ ${targetWd.amount.toFixed(2)})`,
        category: 'finance',
        severity: status === 'failed' || status === 'reversed' ? 'warning' : 'info',
      });
    }
    playSuccessSound();
  };

  const adminUpdateGatedPost = (postId: string, updates: Partial<GatedPost>) => {
    const targetPost = posts.find((p) => p.id === postId);
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)));
    if (targetPost) {
      addAdminAuditLog({
        actorName: currentUser?.name || 'Admin',
        action:
          updates.isPublished === false
            ? 'Artigo paywall ocultado pela moderação'
            : updates.isPublished === true
            ? 'Artigo paywall publicado pela moderação'
            : 'Artigo paywall atualizado pelo admin',
        target: targetPost.title,
        category: 'content',
        severity: updates.isPublished === false ? 'warning' : 'info',
      });
    }
    playSuccessSound();
  };

  const adminDeleteGatedPost = (postId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (targetPost) {
      addAdminAuditLog({
        actorName: currentUser?.name || 'Admin',
        action: 'Artigo paywall excluído pela moderação',
        target: targetPost.title,
        category: 'content',
        severity: 'critical',
      });
    }
  };

  const adminToggleProductVisibility = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const nextPublished = !prod.isPublished;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isPublished: nextPublished } : p))
    );
    addAdminAuditLog({
      actorName: currentUser?.name || 'Admin',
      action: nextPublished ? 'Produto digital publicado' : 'Produto digital pausado/ocultado',
      target: prod.title,
      category: 'content',
      severity: nextPublished ? 'info' : 'warning',
    });
    playSuccessSound();
  };

  const adminToggleProductFeatured = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const nextFeatured = !prod.featured;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, featured: nextFeatured } : p))
    );
    addAdminAuditLog({
      actorName: currentUser?.name || 'Admin',
      action: nextFeatured ? 'Produto marcado como destaque' : 'Destaque removido do produto',
      target: prod.title,
      category: 'content',
      severity: 'info',
    });
    playSuccessSound();
  };

  return (
    <MonetizationContext.Provider
      value={{
        creator,
        products,
        tiers,
        tipGoal,
        posts,
        affiliates,
        coupons,
        transactions,
        withdrawals,
        totalGrossRevenue,
        totalNetRevenue,
        availableBalance,
        pendingBalance,
        totalWithdrawn,
        mrr,
        totalMembersCount,
        totalSalesCount,
        averageTicket,
        selectedCurrency,
        setSelectedCurrency,
        activeToast,
        clearActiveToast,
        soundActive,
        toggleSound,
        updateCreatorProfile,
        saveEncryptedCreatorSettings,
        creatorVaultStatus,
        encryptedCreatorEnvelope,
        reencryptCreatorVault,
        unlockCreatorVault,
        lockCreatorVault,
        clearCustomVaultPassphrase,
        syncCreatorVaultToDatabase,
        addProduct,
        updateProduct,
        deleteProduct,
        updateTier,
        addTier,
        deleteTier,
        updateTipGoal,
        contributeToGoal,
        addGatedPost,
        unlockPost,
        likePost,
        addAffiliate,
        addCoupon,
        updateCoupon,
        toggleCouponActive,
        deleteCoupon,
        validateCoupon,
        realOrders,
        gatewayReadiness,
        refreshSalesState,
        syncRealOrderToLedger,
        calculateCheckoutFee,
        processCheckout,
        requestWithdrawal,
        reconcileExpressSettlement,
        simulateRandomSale,
        releasePendingBalance,
        addInstantBalance,
        inAppFeatures,
        purchasedFeatureIds,
        purchaseInAppFeature,
        settleVisaWithdrawalNow,
        setCustomAvailableBalance,
        syncAndResetHealthyBalance,
        reviews,
        addTransactionReview,
        averageRating,
        totalReviewsCount,
        notificationSettings,
        updateNotificationSettings,
        triggerNotificationTest,
        activeBalanceAlert,
        clearActiveBalanceAlert,
        triggerSimulatedBalanceAlert,
        notificationHistory,
        addNotificationAudit,
        clearNotificationHistory,
        gatewaySettings,
        updateGatewayConfig,
        toggleGatewayMode,
        isPaymentGatewayModalOpen,
        setIsPaymentGatewayModalOpen,
        simulateGatewayTransaction,
        pendingReviewTransaction,
        setPendingReviewTransaction,
        currentUser,
        allUsers,
        switchUser,
        updateCurrentUserProfile,
        addShowcaseItemToUser,
        updateShowcaseItem,
        deleteShowcaseItem,
        registerNewUserAccount,
        adSettings,
        updateAdSettings,
        adStats,
        adNetworks,
        updateAdNetwork,
        toggleAdNetwork,
        getWinningAdNetwork,
        recordAdEvent,
        nativeAds: adCampaigns,
        adCampaigns,
        addAdCampaign,
        updateAdCampaign,
        toggleAdCampaignActive,
        deleteAdCampaign,
        adsTxtPreview,
        recentAdEvents,
        refreshAdsState,
        saveAdConfigToServer,
        isAdsRemoved,
        visitorAdFreePreview,
        setVisitorAdFreePreview,
        studioAdPreviewEnabled,
        setStudioAdPreviewEnabled,
        showAdsInStorefront,
        interstitialOpen,
        setInterstitialOpen,
        interstitialPreviewMode,
        setInterstitialPreviewMode,
        openInterstitialPreview,
        triggerInterstitialAd,
        rewardedOpen,
        setRewardedOpen,
        claimRewardedAdReward,
        recordAdClick,
        monetizationModels,
        updateMonetizationModels,
        followerInAppItems,
        addFollowerInAppItem,
        toggleFollowerInAppItem,
        deleteFollowerInAppItem,
        creatorAdRevenueShare,
        platformAdRevenueShare,
        priceExperiments,
        createPriceExperiment,
        togglePriceExperimentStatus,
        simulatePriceExperimentTraffic,
        applyExperimentWinningPrice,
        deletePriceExperiment,
        badges,
        claimBadgeReward,
        unlockedBadgesCount,
        totalBadgesCount,
        latestUnlockedBadge,
        isAchievementsModalOpen,
        setIsAchievementsModalOpen,

        // Onboarding Tour Guiado
        isOnboardingTourOpen,
        setIsOnboardingTourOpen,
        startOnboardingTour,
        hasCompletedOnboarding,
        completeOnboardingTour,

        // 1. Daily Goals
        dailyGoal,
        updateDailyGoalTarget,
        todayActualRevenue,

        // 1b. Monthly Financial Goals
        monthlyFinancialGoals,
        upsertMonthlyFinancialGoal,
        deleteMonthlyFinancialGoal,

        // 2. AI Conversion Tips
        aiTips,
        aiSettings,
        applyAITip,
        dismissAITip,
        updateAISettings,
        regenerateAITips,

        // 3. Financial Expenses & Net Profit
        expenses,
        totalGatewayFees,
        totalMarketingExpenses,
        totalOperationalExpenses,
        realNetProfit,
        netProfitMargin,
        addExpense,
        deleteExpense,
        updateExpense,
        isExpensesModalOpen,
        setIsExpensesModalOpen,

        // 4. User Analytics
        userAnalytics,
        analyticsOverview,
        analyticsWindow,
        setAnalyticsWindow,
        isAnalyticsLoading,
        refreshAnalyticsOverview,
        trackAnalyticsEvent,

        // 4b. Gemini Live Voice
        isLiveVoiceOpen,
        setIsLiveVoiceOpen,

        // 4c. In-App Rewards System
        monetiCoins,
        rewardXp,
        rewardTier,
        rewardStreakDays,
        lastDailyCheckinDate,
        rewardActions,
        rewardCatalog,
        rewardHistory,
        redeemedRewardIds,
        unlockedRewardPerks,
        performDailyCheckin,
        awardActionReward,
        redeemRewardItem,

        // 4d. Theme Preference
        themePreference,
        resolvedTheme,
        systemTheme,
        setThemePreference,

        // 5. App Premium Subscription Model
        appSubscription,
        isAppSubscriptionModalOpen,
        setIsAppSubscriptionModalOpen,
        subscribeToAppPlan,
        cancelAppSubscription,
        changeAppSubscriptionCycle,

        // 6. Admin Control Panel & Platform Governance
        platformAdminSettings,
        updatePlatformAdminSettings,
        adminAuditLogs,
        addAdminAuditLog,
        adminUpdateUser,
        adminCreateUser,
        adminDeleteUser,
        adminUpdateTransactionStatus,
        adminUpdateWithdrawalStatus,
        adminUpdateGatedPost,
        adminDeleteGatedPost,
        adminToggleProductVisibility,
        adminToggleProductFeatured,
      }}
    >
      {children}
    </MonetizationContext.Provider>
  );
};

export const useMonetization = () => {
  const context = useContext(MonetizationContext);
  if (!context) {
    throw new Error('useMonetization must be used within a MonetizationProvider');
  }
  return context;
};
