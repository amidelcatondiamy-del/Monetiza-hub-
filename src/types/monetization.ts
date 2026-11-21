export type Currency = 'BRL' | 'USD' | 'AOA' | 'EUR';

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto' | 'multicaixa' | 'paypal' | 'crypto' | 'stripe';

export type TransactionStatus = 'approved' | 'pending' | 'refunded';

export type TransactionType = 'product_sale' | 'subscription' | 'tip' | 'paywall_unlock' | 'in_app_purchase';

export type ProductCategoryFilter = 'all' | 'ebook' | 'course' | 'template' | 'mentorship' | 'subscription' | 'paywall' | 'tip' | 'in_app';

export type OriginChannelFilter = 'all' | 'direct' | 'affiliate';

export type UserSegmentFilter = 'all' | 'subscriber' | 'occasional';

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  customerName: string;
  customerEmail: string;
  grossAmount: number;
  netAmount: number;
  fee: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  createdAt: string; // ISO string
  cleared?: boolean; // When true or anticipated, immediately available for withdrawal
  message?: string; // Optional message (for tips/reviews)
  productId?: string;
  subscriptionTierId?: string;
  reviewSubmitted?: boolean;
  productCategory?: ProductCategoryFilter;
  originChannel?: 'direct' | 'affiliate';
  affiliateCode?: string;
  userSegment?: 'subscriber' | 'occasional';
}

export type ProductType = 'ebook' | 'course' | 'template' | 'mentorship' | 'software' | 'audio';

export interface DigitalProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  type: ProductType;
  coverImage: string;
  salesCount: number;
  viewsCount: number;
  rating: number;
  ratingsCount: number;
  isPublished: boolean;
  featured?: boolean;
  contentUrl?: string; // Download or access link
  contentSample?: string; // Text teaser or preview
  tags: string[];
}

export interface SubscriptionTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  color: string;
  perks: string[];
  activeMembers: number;
  popular?: boolean;
  badge: string;
}

export interface TipGoal {
  id: string;
  title: string;
  currentAmount: number;
  targetAmount: number;
  deadline?: string;
  rewardDescription: string;
  monthReference?: string;
  supportersCount?: number;
}

export interface GatedPost {
  id: string;
  title: string;
  excerpt: string;
  fullContent: string;
  unlockPrice: number;
  publishedAt: string;
  coverImage: string;
  requiredTier?: string; // 'free', 'basic', 'vip', or paywall unlock
  unlockedUserEmails: string[];
  likes: number;
  reads: number;
  isPublished?: boolean;
}

export interface AffiliatePartner {
  id: string;
  name: string;
  email: string;
  code: string;
  commissionRate: number; // e.g. 30%
  clicks: number;
  salesCount: number;
  totalEarned: number;
  status: 'active' | 'pending' | 'paused';
}

export interface DiscountCoupon {
  code: string;
  discountPercentage: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
  productId?: string;
  createdAt?: string;
}

export type NotificationChannelChoice = 'email' | 'push' | 'both';

export interface NotificationThresholdSettings {
  enabled: boolean;
  minWithdrawalThreshold: number; // e.g. 1000
  emailAlerts: boolean;
  pushAlerts: boolean;
  smsAlerts: boolean;
  destinationEmail: string;
  lastNotifiedAt?: string;
  // Alerta de Saldo Mínimo
  minBalanceAlertEnabled: boolean;
  minBalanceThreshold: number; // valor monetário de limite
  minBalanceChannel: NotificationChannelChoice;
  lastBalanceAlertAt?: string;
}

export interface BalanceAlertToastData {
  id: string;
  title: string;
  threshold: number;
  currentBalance: number;
  channel: NotificationChannelChoice;
  destinationEmail: string;
  timestamp: string;
}

export interface CreatorProfile {
  name: string;
  handle: string;
  tagline: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  verified: boolean;
  category: string;
  email?: string;
  phone?: string;
  documentNumber?: string; // CPF or CNPJ
  socials: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    twitter?: string;
    website?: string;
  };
  expressPhone?: string; // Telefone/ID associado ao Multicaixa Express / Rede Express
  expressBankName?: string;
  expressIban?: string;
  autoPayoutExpress?: boolean;
  preferredPayoutChannel?: 'express' | 'visa_card' | 'ted' | 'pix';
  autoFlowWithdrawals?: boolean; // Automatizar fluxo financeiro conforme método preferencial e alertas
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
  savedVisaCard?: {
    holderName: string;
    last4: string;
    expiryDate: string;
    cardBrand: 'Visa';
    fullCardNumber?: string;
  };
  autoPayoutVisa?: boolean; // When true, incoming earnings are automatically transferred directly to Visa card
  bankAccount?: {
    bankName: string;
    agency: string;
    accountNumber: string;
    accountType: 'corrente' | 'poupanca';
    documentNumber?: string;
  };
  averageRating?: number;
  totalReviews?: number;
  notificationSettings?: NotificationThresholdSettings;
}

export interface SentNotificationAudit {
  id: string;
  timestamp: string;
  displayTime: string;
  type: 'min_balance_reached' | 'min_balance_simulated' | 'sale_approved' | 'withdrawal_processed';
  channel: 'email' | 'push' | 'both';
  title: string;
  reason: string;
  destination: string;
  amount: number; // dinheiro real
  currency: string;
  status: 'delivered' | 'simulated';
  authCode: string;
}

export interface InAppFeature {
  id: string; // 'remove_ads' | 'advanced_suite' | 'verified_vip'
  title: string;
  subtitle: string;
  description: string;
  price: number;
  periodLabel: string;
  badge?: string;
  iconName: string;
  features: string[];
  isPurchased?: boolean;
  purchasedAt?: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  destinationType: 'pix' | 'ted' | 'paypal' | 'visa_card' | 'express';
  destinationKey: string;
  status: 'completed' | 'processing' | 'failed' | 'reversed';
  requestedAt: string;
  settledAt?: string;
  settlementSeconds?: number;
  failureReason?: string;
  receiptNumber: string;
  visaDetails?: {
    holderName: string;
    last4: string;
    authorizationCode: string;
    networkReference?: string;
    bankName?: string;
    settlementStatus?: 'processing' | 'authorized' | 'credited';
  };
  expressDetails?: {
    phoneOrId: string;
    network: string;
    bankName?: string;
    iban?: string;
    authorizationCode?: string;
    emisReference?: string;
    pspTransactionId?: string;
    pspProvider?: string;
    isLivePsp?: boolean;
    settlementStatus?: 'processing' | 'authorized' | 'credited';
  };
}

export interface TransactionReview {
  id: string;
  transactionId: string;
  targetUserId?: string;
  reviewerName: string;
  reviewerRole: 'buyer' | 'seller' | 'subscriber' | 'patron';
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  itemTitle?: string;
  verifiedPurchase: boolean;
}

export interface UserShowcaseItem {
  id: string;
  title: string;
  description: string;
  price: number;
  type: 'product' | 'service' | 'consultancy' | 'mentorship';
  coverImage: string;
  imageUrl?: string;
  category?: string;
  deliveryFormat?: string; // e.g. "Entrega Imediata via Download", "Sessão Online 60min via Google Meet"
  salesCount: number;
  rating?: number;
  isAvailable: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  handle: string;
  avatarUrl: string;
  bannerUrl?: string;
  tagline?: string;
  bio: string;
  category: string;
  role: 'creator' | 'client' | 'admin';
  status?: 'active' | 'suspended' | 'pending_kyc';
  kycVerified?: boolean;
  createdAt: string;
  rating?: number;
  phone?: string;
  socials?: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
  };
  showcaseItems: UserShowcaseItem[];
  purchasedProductIds?: string[];
  activeSubscriptions?: string[];
  loyaltyPoints?: number;
}

export type AdNetworkProviderId = 'google_admob' | 'meta_audience' | 'google_adsense' | 'unity_ads';
export type AdFormatType = 'banner' | 'interstitial' | 'rewarded_video' | 'native';
export type AdMediationStrategy = 'highest_ecpm' | 'waterfall';
export type AdBannerPosition = 'inline' | 'bottom' | 'both';

export interface AdNetworkFormatSlots {
  bannerPlacementId: string;
  interstitialPlacementId: string;
  rewardedPlacementId: string;
  nativePlacementId?: string;
}

export interface AdNetworkIntegration {
  id: AdNetworkProviderId;
  name: string;
  shortLabel: string;
  enabled: boolean;
  priority: number;
  appOrPublisherId: string;
  unitSlots: AdNetworkFormatSlots;
  ecpmFloor: number;
  fillRatePct: number;
  impressions: number;
  clicks: number;
  revenue: number;
  supportedFormats: AdFormatType[];
  docsUrl: string;
  placementIdHint: string;
}

export interface AdSettings {
  interstitialEnabled: boolean;
  rewardedEnabled: boolean;
  nativeEnabled: boolean;
  bottomBannerEnabled?: boolean;
  inlineBannerEnabled?: boolean;
  bannerPosition?: AdBannerPosition;
  bannerRefreshSeconds?: number;
  mediationStrategy?: AdMediationStrategy;
  frequencyMinutes: number;
}

export type AdPlacementMode = 'minimal' | 'balanced' | 'high_yield';

export interface MonetizationModelsConfig {
  adsEnabled: boolean;
  adRevenueShareCreatorPct: number; // e.g., 70, 80, 85 (% creator receives)
  adPlacementMode: AdPlacementMode;
  subscriptionsEnabled: boolean;
  exclusiveContentPaywallEnabled: boolean;
  donationsEnabled: boolean;
  followerInAppPurchasesEnabled: boolean;
  presetDonationAmounts: number[];
}

export type FollowerInAppCategory = 'badge' | 'qa_priority' | 'pass' | 'perk_pack';

export interface FollowerInAppItem {
  id: string;
  title: string;
  description: string;
  price: number;
  category: FollowerInAppCategory;
  badgeLabel: string;
  salesCount: number;
  enabled: boolean;
}

export type PriceExperimentStatus = 'running' | 'paused' | 'completed';

export interface PriceExperimentVariant {
  id: string;
  label: string;
  price: number;
  views: number;
  conversions: number;
  isControl?: boolean;
}

export interface PriceExperiment {
  id: string;
  productId: string;
  productTitle: string;
  status: PriceExperimentStatus;
  createdAt: string;
  trafficSplitLabel: string;
  variants: PriceExperimentVariant[];
  appliedVariantId?: string;
}

export interface AdFormatMetrics {
  impressions: number;
  clicks: number;
  revenue: number;
  ecpm: number;
}

export interface AdStats {
  impressions: number;
  clicks: number;
  rewardedCompleted: number;
  adRevenue: number;
  ecpm: number;
  byFormat?: Record<AdFormatType, AdFormatMetrics>;
}

export type AdCampaignFormat = 'native' | 'banner' | 'both';

export interface NativeAd {
  id: string;
  sponsorName: string;
  sponsorLogo: string;
  badge: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  bannerUrl: string;
  category: string;
  rating?: number;
  format?: AdCampaignFormat;
  active?: boolean;
  impressions?: number;
  clicks?: number;
  createdAt?: string;
}

export type AdCampaign = NativeAd;

export interface AdTelemetryEventRecord {
  id: string;
  timestamp: string;
  networkId: string;
  format: AdFormatType;
  eventType: 'impression' | 'click' | 'rewarded_complete';
  placementId?: string;
  adId?: string;
  revenue: number;
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  grossAmount: number;
  netAmount: number;
  transactionsCount: number;
  arpu: number;
  conversionRate: number;
  visitors: number;
  payingUsers: number;
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'revenue' | 'sales' | 'community' | 'reputation' | 'features';

export interface CreatorBadge {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  iconName: string;
  gradient: string;
  currentProgress: number;
  maxProgress: number;
  unit: string;
  unlocked: boolean;
  unlockedAt?: string;
  rewardPoints: number;
  perkDescription: string;
  claimed?: boolean;
}

// 1. Daily Goals
export interface DailyGoalHistoryPoint {
  date: string; // 'YYYY-MM-DD'
  dayLabel: string; // 'Seg', 'Ter', 'Qua', etc.
  targetAmount: number;
  actualAmount: number;
  reached: boolean;
}

export interface DailyGoal {
  targetAmount: number;
  presets: number[];
  history: DailyGoalHistoryPoint[];
}

export type MonthlyRevenueBasis = 'gross' | 'net' | 'balance';

export interface MonthlyRevenueGoal {
  id: string;
  monthKey: string; // 'YYYY-MM'
  title: string;
  targetAmount: number;
  basis: MonthlyRevenueBasis;
  updatedAt: string;
}

// 2. AI Conversion Tips & Settings
export type AITipCategory = 'pricing' | 'affiliates' | 'retention' | 'revenue' | 'storefront';
export type AITipFrequency = 'realtime' | 'daily' | 'weekly';

export interface AITipItem {
  id: string;
  title: string;
  description: string;
  category: AITipCategory;
  impact: 'high' | 'medium' | 'critical';
  metricImpactEstimate: string; // e.g. "+18% na conversão", "+R$ 1.450/mês"
  actionLabel: string;
  actionType: 'increase_price' | 'create_coupon' | 'boost_affiliate' | 'exclusive_offer' | 'bundle';
  targetEntityId?: string;
  isApplied?: boolean;
  isDismissed?: boolean;
  createdAt: string;
}

export interface AISettings {
  frequency: AITipFrequency;
  prioritizedTopics: AITipCategory[];
  autoApplyRecommendations: boolean;
  model: string;
}

// 3. Financial Expenses (Taxas, Marketing, Operacional)
export type ExpenseCategory = 'gateway_fee' | 'marketing' | 'operational';

export interface FinancialExpense {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  period: 'monthly' | 'one_time';
  date: string;
  notes?: string;
}

// 4. User Analytics (Engajamento, Retenção, Conversão, Pontos Ideais, Fontes de Receita)
export interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  dropoffPercentage: number;
  description: string;
}

export interface IdealTouchpoint {
  id: string;
  name: string;
  triggerEvent: string;
  bestTimeWindow: string;
  conversionRate: number;
  averageTicket: number;
  recommendation: string;
  efficacyScore: number; // 0 - 100
}

export interface RevenueSourceEfficacy {
  id: string;
  name: string;
  category: 'products' | 'subscriptions' | 'tips' | 'ads' | 'affiliates';
  grossRevenue: number;
  netMarginPercentage: number;
  roiMultiplier: number;
  conversionRate: number;
  effortLevel: 'baixo' | 'médio' | 'alto';
  rating: number; // 1 - 5
}

export interface UserAnalyticsData {
  engagement: {
    totalSessions: number;
    pageViews: number;
    avgSessionDurationMinutes: number;
    bounceRatePercentage: number;
    activeUsersCount: number;
    checkoutClickRate: number;
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
  funnel: FunnelStep[];
  idealTouchpoints: IdealTouchpoint[];
  revenueSourcesEfficacy: RevenueSourceEfficacy[];
}

// 5. MonetizaHub App Premium Subscription Model
export type AppSubscriptionTier = 'free' | 'pro' | 'ultra';
export type AppBillingCycle = 'monthly' | 'annual';
export type AppSubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'none';

export interface AppSubscriptionInvoice {
  id: string;
  date: string;
  amount: number;
  billingCycle: AppBillingCycle;
  planName: string;
  status: 'paid' | 'pending';
  receiptNumber: string;
  paymentMethod: PaymentMethod;
}

export interface AppSubscription {
  tier: AppSubscriptionTier;
  billingCycle: AppBillingCycle;
  status: AppSubscriptionStatus;
  monthlyPrice: number;
  annualPrice: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewsAutomatically: boolean;
  paymentMethod: PaymentMethod;
  savedCardLast4?: string;
  invoices: AppSubscriptionInvoice[];
}

// 6. Payment Gateway & Security Standards (Stripe, PayPal, Visa Direct & Express)
export type GatewayProvider = 'stripe' | 'paypal' | 'visa_direct' | 'multicaixa_express';

export interface GatewayConfigItem {
  provider: GatewayProvider;
  name: string;
  enabled: boolean;
  mode: 'sandbox' | 'live';
  publishableKey: string;
  secretKeyMasked: string;
  webhookSecretMasked: string;
  features: {
    tokenization: boolean;
    threeDSecure2: boolean;
    fraudRadar: boolean;
    instantPayout: boolean;
    walletsAppleGooglePay: boolean;
  };
  complianceLevel: string;
}

export interface SecurityComplianceItem {
  id: string;
  title: string;
  description: string;
  status: 'compliant' | 'warning' | 'pending';
  badge: string;
  standard: string;
}

export interface IntegrationStepGuide {
  step: number;
  title: string;
  subtitle: string;
  technicalDetails: string[];
  securityConsiderations: string[];
  userFlowExplanation: string;
  codeSnippet: string;
}

export interface PaymentGatewaySettings {
  defaultProvider: GatewayProvider;
  stripe: GatewayConfigItem;
  paypal: GatewayConfigItem;
  visaDirect: GatewayConfigItem;
  multicaixaExpress: GatewayConfigItem;
  pciCompliant: boolean;
  encryptionStandard: string;
  webhookSigningEnabled: boolean;
  fraudShieldActive: boolean;
}

export interface PlatformAdminSettings {
  platformName: string;
  platformFeePercent: number;
  pixFeePercent: number;
  proFeePercent: number;
  minWithdrawalAmount: number;
  maxDailyWithdrawalAmount: number;
  autoSettlementEnabled: boolean;
  kycRequiredForPayouts: boolean;
  maintenanceMode: boolean;
  newCreatorSignupsEnabled: boolean;
  contentAutoModeration: boolean;
  defaultCurrency: Currency;
  supportEmail: string;
}

export interface AdminAuditLogItem {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  target: string;
  category: 'users' | 'finance' | 'content' | 'settings';
  severity: 'info' | 'warning' | 'critical';
}

export interface Aes256EncryptedPayload {
  version: 1;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // base64url
  iv: string; // base64url (96-bit / 12 bytes)
  ciphertext: string; // base64url (includes 128-bit GCM authTag appended by Web Crypto)
  encryptedFields: string[];
  encryptedAt: string; // ISO string
  keyFingerprint: string; // SHA-256 fingerprint prefix
  requiresCustomPassphrase?: boolean;
}

export interface SensitiveCreatorVault {
  email?: string;
  phone?: string;
  documentNumber?: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
  expressPhone?: string;
  expressBankName?: string;
  expressIban?: string;
  savedVisaCard?: CreatorProfile['savedVisaCard'];
  bankAccount?: CreatorProfile['bankAccount'];
  notificationDestinationEmail?: string;
}

export interface StoredCreatorEnvelope {
  format: 'monetizahub_aes256_vault_v1';
  maskedProfile: CreatorProfile;
  encryptedVault: Aes256EncryptedPayload;
}

export interface StoredNotificationSettingsEnvelope {
  format: 'monetizahub_notif_aes256_v1';
  settings: NotificationThresholdSettings; // destinationEmail masked
  encryptedDestinationEmail: Aes256EncryptedPayload;
}

export interface ServerVaultStorageInfo {
  algorithm: 'AES-256-GCM';
  storedAt: string;
  ivHexPreview: string;
  authTagLengthBytes: number;
  payloadBytes: number;
}

export interface CreatorVaultSecurityStatus {
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  keyFingerprint: string;
  encryptedFields: string[];
  lastEncryptedAt: string | null;
  localEncrypted: boolean;
  databaseSynced: boolean;
  databaseStoredAt: string | null;
  serverStorageInfo: ServerVaultStorageInfo | null;
  hasCustomPassphrase: boolean;
  locked: boolean;
  lastError: string | null;
}

// 7. In-App Rewards System (Moeda Virtual MonetiCoins, Ações Recompensadas & Catálogo de Desbloqueios)
export type RewardTierLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

export type RewardActionId =
  | 'daily_checkin'
  | 'purchase_completed'
  | 'subscription_started'
  | 'review_submitted'
  | 'rewarded_video_watched'
  | 'product_published'
  | 'affiliate_referral'
  | 'badge_claimed'
  | 'voice_coach_session';

export type RewardBenefitType =
  | 'feature_unlock'
  | 'wallet_bonus'
  | 'coupon_perk'
  | 'visibility_boost'
  | 'vip_access'
  | 'fee_waiver';

export interface RewardActionRule {
  id: RewardActionId;
  title: string;
  description: string;
  category: 'engajamento' | 'monetizacao' | 'comunidade' | 'criacao';
  coinsReward: number;
  xpReward: number;
  cadence: string;
  eligibleTarget: 'Criador & Seguidor' | 'Seguidor / Comprador' | 'Criador';
}

export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  benefitType: RewardBenefitType;
  costCoins: number;
  valueHighlight: string;
  unlockFeatureId?: string;
  bonusCashBRL?: number;
  couponCodeToCreate?: string;
  couponDiscountPercent?: number;
  repeatable: boolean;
  minTier?: RewardTierLevel;
}

export interface RewardTransactionRecord {
  id: string;
  type: 'earn' | 'redeem';
  actionId?: RewardActionId;
  rewardId?: string;
  title: string;
  coinsDelta: number;
  xpDelta: number;
  timestamp: string;
  badgeLabel?: string;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
