import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Heart,
  Lock,
  Share2,
  Calculator,
  ShieldCheck,
  CreditCard,
  Settings,
  HelpCircle,
  ArrowUpRight,
  Zap,
  CheckCircle2,
  Sparkles,
  Star,
  User,
  TrendingUp,
  Gift,
  BarChart3,
  Trophy,
  Award,
  Crown,
  Activity,
  KeyRound,
  Building,
  Coins,
  Radio,
} from 'lucide-react';
import { MonetizationProvider, useMonetization } from './context/MonetizationContext';
import { Header } from './components/common/Header';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { RevenueAnalyticsDashboard } from './components/dashboard/RevenueAnalyticsDashboard';
import { UserAnalyticsDashboard } from './components/dashboard/UserAnalyticsDashboard';
import { ProductsManager } from './components/dashboard/ProductsManager';
import { SubscriptionsManager } from './components/dashboard/SubscriptionsManager';
import { TippingManager } from './components/dashboard/TippingManager';
import { PaywallManager } from './components/dashboard/PaywallManager';
import { AffiliatesManager } from './components/dashboard/AffiliatesManager';
import { AdsManagerTab } from './components/dashboard/AdsManagerTab';
import { MonetizationModelsHub } from './components/dashboard/MonetizationModelsHub';
import { MonetizationCalculator } from './components/dashboard/MonetizationCalculator';
import { WithdrawModal } from './components/dashboard/WithdrawModal';
import { SettingsModal, SettingsTabId } from './components/dashboard/SettingsModal';
import { SupportModal } from './components/dashboard/SupportModal';
import { SecurityTermsModal } from './components/common/SecurityTermsModal';
import { ExportReportModal } from './components/dashboard/ExportReportModal';
import { PlayStoreModal } from './components/common/PlayStoreModal';
import { TrustVerificationModal } from './components/common/TrustVerificationModal';
import { PublicStorefront } from './components/public/PublicStorefront';
import { CheckoutModal } from './components/public/CheckoutModal';
import { SalesNotificationToast } from './components/common/SalesNotificationToast';
import { BalanceAlertToast } from './components/common/BalanceAlertToast';
import { VisaPayoutTrackerModal } from './components/dashboard/VisaPayoutTrackerModal';
import { InAppPurchasesModal } from './components/dashboard/InAppPurchasesModal';
import { TransactionFeedbackModal } from './components/dashboard/TransactionFeedbackModal';
import { UserProfileShowcaseModal } from './components/dashboard/UserProfileShowcaseModal';
import { CreatorAchievementsModal } from './components/dashboard/CreatorAchievementsModal';
import { AppSubscriptionModal } from './components/subscription/AppSubscriptionModal';
import { PaymentGatewayModal } from './components/dashboard/PaymentGatewayModal';
import { PspConfigurationWizard } from './components/dashboard/PspConfigurationWizard';
import { OnboardingTour } from './components/common/OnboardingTour';
import { InterstitialAdModal } from './components/ads/InterstitialAdModal';
import { RewardedAdModal } from './components/ads/RewardedAdModal';
import { BottomBannerAd } from './components/ads/BottomBannerAd';
import { RewardsSystemTab } from './components/dashboard/RewardsSystemTab';
import { LiveVoiceStudioModal } from './components/voice/LiveVoiceStudioModal';
import { DigitalProduct, SubscriptionTier, GatedPost, Transaction } from './types/monetization';

const MainAppContent: React.FC = () => {
  const {
    creator,
    products,
    currentUser,
    availableBalance,
    pendingReviewTransaction,
    setPendingReviewTransaction,
    interstitialOpen,
    setInterstitialOpen,
    interstitialPreviewMode,
    setInterstitialPreviewMode,
    triggerInterstitialAd,
    rewardedOpen,
    setRewardedOpen,
    badges,
    unlockedBadgesCount,
    totalBadgesCount,
    isAchievementsModalOpen,
    setIsAchievementsModalOpen,
    isAppSubscriptionModalOpen,
    setIsAppSubscriptionModalOpen,
    isPaymentGatewayModalOpen,
    setIsPaymentGatewayModalOpen,
    isOnboardingTourOpen,
    setIsOnboardingTourOpen,
    startOnboardingTour,
    monetiCoins,
    isLiveVoiceOpen,
    setIsLiveVoiceOpen,
    trackAnalyticsEvent,
  } = useMonetization();

  const [currentView, setCurrentView] = useState<'studio' | 'storefront' | 'admin'>('studio');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const dwellStartRef = useRef<number>(Date.now());

  const isOverviewFocusActive =
    isFocusMode && currentView === 'studio' && activeTab === 'overview';

  useEffect(() => {
    if (currentView !== 'studio' || activeTab !== 'overview') {
      setIsFocusMode(false);
    }
  }, [currentView, activeTab]);

  useEffect(() => {
    if (!isOverviewFocusActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOverviewFocusActive]);

  const handleSetCurrentView = (view: 'studio' | 'storefront' | 'admin') => {
    if (view !== currentView) {
      const durationSec = Math.max(1, Math.round((Date.now() - dwellStartRef.current) / 1000));
      dwellStartRef.current = Date.now();
      void trackAnalyticsEvent({
        category: 'usage_pattern',
        eventType: 'view_switch',
        source: 'studio',
        screenOrTab: `${view}:${activeTab}`,
        durationSec,
      });
      triggerInterstitialAd('view_transition', { isStorefront: view === 'storefront' });
    }
    setCurrentView(view);
  };

  const handleSetActiveTab = (tab: string) => {
    if (tab !== activeTab) {
      const durationSec = Math.max(1, Math.round((Date.now() - dwellStartRef.current) / 1000));
      dwellStartRef.current = Date.now();
      void trackAnalyticsEvent({
        category: 'usage_pattern',
        eventType: 'tab_switch',
        source: 'studio',
        screenOrTab: tab,
        durationSec,
      });
      triggerInterstitialAd('tab_switch');
    }
    setActiveTab(tab);
  };

  // Modals state
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId>('payouts');
  const [isProfileShowcaseOpen, setIsProfileShowcaseOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPlayStoreOpen, setIsPlayStoreOpen] = useState(false);
  const [isTrustOpen, setIsTrustOpen] = useState(false);
  const [isVisaTrackerOpen, setIsVisaTrackerOpen] = useState(false);
  const [isInAppPurchasesOpen, setIsInAppPurchasesOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isPspWizardOpen, setIsPspWizardOpen] = useState(false);
  const [feedbackTargetTx, setFeedbackTargetTx] = useState<Transaction | null>(null);

  // Auto-open feedback modal when a transaction is completed
  useEffect(() => {
    if (pendingReviewTransaction) {
      setFeedbackTargetTx(pendingReviewTransaction);
      setIsFeedbackOpen(true);
      setPendingReviewTransaction(null);
    }
  }, [pendingReviewTransaction, setPendingReviewTransaction]);

  // Checkout modal state
  const [checkoutItem, setCheckoutItem] = useState<{
    type: 'product_sale' | 'subscription' | 'tip' | 'paywall_unlock' | 'in_app_purchase';
    id?: string;
    title: string;
    price: number;
    description?: string;
    contentUrl?: string;
  } | null>(null);

  const handleTestProduct = (product: DigitalProduct) => {
    setCheckoutItem({
      type: 'product_sale',
      id: product.id,
      title: product.title,
      price: product.price,
      description: product.description,
      contentUrl: product.contentUrl,
    });
  };

  const handleTestSubscription = (tier: SubscriptionTier) => {
    setCheckoutItem({
      type: 'subscription',
      id: tier.id,
      title: `Assinatura: ${tier.name}`,
      price: tier.monthlyPrice,
      description: tier.tagline,
    });
  };

  const handleTestTip = () => {
    setCheckoutItem({
      type: 'tip',
      title: `Apoio / Gorjeta Pix para ${creator.name}`,
      price: 25.0,
      description: 'Apoio espontâneo para o criador',
    });
  };

  const handleTestUnlock = (post: GatedPost) => {
    setCheckoutItem({
      type: 'paywall_unlock',
      id: post.id,
      title: post.title,
      price: post.unlockPrice,
      description: post.excerpt,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header (ocultado no Modo Foco para expandir análise) */}
      {!isOverviewFocusActive && (
        <Header
          currentView={currentView}
          setCurrentView={handleSetCurrentView}
          onOpenWithdraw={() => setIsWithdrawOpen(true)}
          onOpenProfileModal={() => {
            setSettingsInitialTab('payouts');
            setIsSettingsOpen(true);
          }}
          onOpenAppearanceSettings={() => {
            setSettingsInitialTab('appearance');
            setIsSettingsOpen(true);
          }}
          onOpenPlayStore={() => setIsPlayStoreOpen(true)}
          onOpenUserProfileShowcase={() => setIsProfileShowcaseOpen(true)}
          onOpenRealCheckout={() => {
            const firstProduct = products.find((p) => p.isPublished) || products[0];
            if (firstProduct) {
              setCheckoutItem({
                type: 'product_sale',
                id: firstProduct.id,
                title: firstProduct.title,
                price: firstProduct.price,
                description: firstProduct.description,
                contentUrl: firstProduct.contentUrl,
              });
            } else {
              handleSetCurrentView('storefront');
            }
          }}
        />
      )}

      {/* Auto Instant Payout Highlight Banner (Multicaixa Express, Visa Direct, or Transferência Bancária) */}
      {!isOverviewFocusActive && currentView !== 'admin' && (() => {
        const isBankTransferPreferred = creator.preferredPayoutChannel === 'ted';
        const isExpressAuto =
          !isBankTransferPreferred &&
          (creator.preferredPayoutChannel === 'express' ||
            (!creator.preferredPayoutChannel && Boolean(creator.autoPayoutExpress)));
        return (
          <div
            className={`border-b px-4 py-2.5 ${
              isExpressAuto
                ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border-amber-500/20'
                : isBankTransferPreferred
                ? 'bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-950 border-purple-500/20'
                : 'bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 border-blue-500/20'
            }`}
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <span
                  className={`p-1 rounded ${
                    isExpressAuto
                      ? 'bg-amber-500/20 text-amber-400'
                      : isBankTransferPreferred
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {isExpressAuto ? (
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  ) : isBankTransferPreferred ? (
                    <Building className="w-3.5 h-3.5" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5" />
                  )}
                </span>
                {isExpressAuto ? (
                  <span>
                    <strong>Multicaixa Express (Modo Sandbox):</strong> Repasse configurado para{' '}
                    <span className="font-mono text-amber-400 font-bold">
                      {creator.expressPhone || '+244 923 456 789'}
                    </span>{' '}
                    ({creator.expressBankName || 'Banco BAI Angola'}) — requer API oficial EMIS/PSP para envios reais.
                  </span>
                ) : isBankTransferPreferred ? (
                  <span>
                    <strong>Transferência Bancária Preferencial Ativa:</strong> Repasses direcionados para{' '}
                    <span className="text-purple-300 font-bold">
                      {creator.bankAccount?.bankName || 'Conta Bancária Principal'}
                    </span>{' '}
                    <span className="font-mono text-purple-400 font-bold">
                      Ag {creator.bankAccount?.agency || '0001'} • CC {creator.bankAccount?.accountNumber || '1234567-8'}
                    </span>
                    .
                  </span>
                ) : (
                  <span>
                    <strong>Repasse Direto para Cartão Visa Ativo:</strong> Os ganhos caem diretamente no cartão de{' '}
                    <span className="text-emerald-400 font-bold">{creator.name}</span>{' '}
                    <span className="font-mono text-blue-400 font-bold">
                      •••• {creator.savedVisaCard?.last4 || '4829'}
                    </span>{' '}
                    ({creator.savedVisaCard?.holderName || 'AMIDEL CATONDI'}) via Visa Direct.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsPspWizardOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Assistente PSP (AppyPay • ProxyPay • EMIS)</span>
                </button>
                <button
                  onClick={() => setIsWithdrawOpen(true)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    isExpressAuto
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : isBankTransferPreferred
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Sacar na Hora</span>
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={`flex items-center gap-1 text-[11px] font-bold underline underline-offset-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                    isExpressAuto
                      ? 'text-amber-400 hover:text-amber-300'
                      : isBankTransferPreferred
                      ? 'text-purple-400 hover:text-purple-300'
                      : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  <span>Configurar Repasse</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Body */}
      <main
        className={`flex-1 w-full mx-auto ${
          isOverviewFocusActive
            ? 'max-w-none px-4 sm:px-6 lg:px-8 py-4'
            : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-6'
        }`}
      >
        {currentView === 'admin' ? (
          <AdminDashboard
            onNavigateToStudio={() => handleSetCurrentView('studio')}
            onNavigateToStore={() => handleSetCurrentView('storefront')}
          />
        ) : currentView === 'storefront' ? (
          /* Public Storefront View */
          <PublicStorefront
            onOpenCheckout={(item) => setCheckoutItem(item)}
            onOpenTerms={() => setIsTermsOpen(true)}
            onOpenTrustModal={() => setIsTrustOpen(true)}
          />
        ) : (
          /* Studio Creator View */
          <div className="space-y-6">
            {/* Studio Navigation Tabs (ocultadas no Modo Foco) */}
            {!isOverviewFocusActive && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
              <button
                onClick={() => handleSetActiveTab('overview')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Painel Financeiro</span>
              </button>

              <button
                onClick={() => handleSetActiveTab('models')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  activeTab === 'models'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Modelos de Monetização</span>
              </button>

              <button
                onClick={() => handleSetActiveTab('analytics')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Análise de Receita (ARPU)</span>
              </button>

              <button
                onClick={() => handleSetActiveTab('user_analytics')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'user_analytics'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Análise de Usuário</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  Funil & LTV
                </span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Produtos Digitais</span>
              </button>

              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'subscriptions'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Assinaturas VIP</span>
              </button>

              <button
                onClick={() => setActiveTab('tipping')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'tipping'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Heart className="w-4 h-4" />
                <span>Gorjetas & Metas</span>
              </button>

              <button
                onClick={() => setActiveTab('paywall')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'paywall'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Paywall Fechado</span>
              </button>

              <button
                onClick={() => setActiveTab('affiliates')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'affiliates'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Afiliados</span>
              </button>

              <button
                onClick={() => setActiveTab('ads')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'ads'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Anúncios & Ads</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  Novo
                </span>
              </button>

              <button
                onClick={() => handleSetActiveTab('rewards')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  activeTab === 'rewards'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Coins className={`w-4 h-4 ${activeTab === 'rewards' ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>Recompensas ({monetiCoins} MC)</span>
              </button>

              <button
                onClick={() => handleSetActiveTab('calculator')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'calculator'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Simulador</span>
              </button>

              {/* Action Cluster */}
              <button
                onClick={() => setIsLiveVoiceOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition cursor-pointer ml-auto"
                title="Abrir Assistente de Voz em Tempo Real (Gemini Live API)"
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Voz Gemini Live</span>
              </button>

              <button
                onClick={() => setIsAchievementsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                title="Ver Conquistas, Badges Oficiais e Pontos de Fidelidade"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Badges ({unlockedBadgesCount}/{totalBadgesCount})</span>
              </button>

              <button
                onClick={() => setRewardedOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                title="Assistir anúncio de 15s para ganhar R$ 5,00 direto na carteira"
              >
                <Gift className="w-4 h-4 text-amber-400" />
                <span>Ganhar +R$ 5</span>
              </button>

              <button
                onClick={() => setIsProfileShowcaseOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition cursor-pointer"
                title="Meu Perfil, Biografia e Vitrine de Vendas de Itens ou Serviços"
              >
                <User className="w-4 h-4 text-purple-400" />
                <span>Perfil & Vitrine ({currentUser?.showcaseItems?.length || 0})</span>
              </button>

              <button
                onClick={() => setIsAppSubscriptionModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                title="Assinar MonetizaHub Pro ou Ultra VIP (Sem Anúncios + Taxa Zero de Saque)"
              >
                <Crown className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Assinar Pro (Sem Ads)</span>
              </button>

              <button
                onClick={() => setIsInAppPurchasesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                title="Desbloquear recursos avançados e remover anúncios"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Compras no App</span>
              </button>
            </div>
            )}

            {/* Active Tab View */}
            {activeTab === 'overview' && (
              <OverviewDashboard
                onOpenWithdraw={() => setIsWithdrawOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenSupport={() => setIsSupportOpen(true)}
                onNavigateTab={(tab) => handleSetActiveTab(tab)}
                onOpenExportReport={() => {
                  triggerInterstitialAd('export_report');
                  setIsExportOpen(true);
                }}
                onOpenVisaTracker={() => setIsVisaTrackerOpen(true)}
                onOpenInAppPurchases={() => setIsInAppPurchasesOpen(true)}
                onOpenUserProfileShowcase={() => setIsProfileShowcaseOpen(true)}
                onOpenFeedback={(tx) => {
                  setFeedbackTargetTx(tx || null);
                  setIsFeedbackOpen(true);
                }}
                isFocusMode={isFocusMode}
                onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
              />
            )}

            {activeTab === 'models' && (
              <MonetizationModelsHub
                onNavigateTab={(tab) => handleSetActiveTab(tab)}
                onSwitchToStorefront={() => handleSetCurrentView('storefront')}
              />
            )}

            {activeTab === 'analytics' && (
              <RevenueAnalyticsDashboard
                onOpenInAppPurchases={() => setIsInAppPurchasesOpen(true)}
                onOpenAppSubscription={() => setIsAppSubscriptionModalOpen(true)}
                onNavigateTab={(tab) => handleSetActiveTab(tab)}
              />
            )}

            {activeTab === 'user_analytics' && <UserAnalyticsDashboard />}

            {activeTab === 'products' && (
              <ProductsManager onTestProductCheckout={handleTestProduct} />
            )}

            {activeTab === 'subscriptions' && (
              <SubscriptionsManager onTestSubscriptionCheckout={handleTestSubscription} />
            )}

            {activeTab === 'tipping' && (
              <TippingManager onTestTipCheckout={handleTestTip} />
            )}

            {activeTab === 'paywall' && (
              <PaywallManager onTestUnlockCheckout={handleTestUnlock} />
            )}

            {activeTab === 'affiliates' && <AffiliatesManager />}

            {activeTab === 'ads' && (
              <AdsManagerTab
                onOpenInAppPurchases={() => setIsInAppPurchasesOpen(true)}
              />
            )}

            {activeTab === 'rewards' && (
              <RewardsSystemTab onNavigateTab={(tab) => handleSetActiveTab(tab)} />
            )}

            {activeTab === 'calculator' && <MonetizationCalculator />}
          </div>
        )}
      </main>

      {/* Footer (ocultado no Modo Foco) */}
      {!isOverviewFocusActive && (
        <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">MonetizaHub</span>
            <span>•</span>
            <span>Plataforma de Monetização Digital do Criador</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setIsTrustOpen(true)}
              className="hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verificação de Confiança & Garantia</span>
            </button>
            <button
              onClick={() => setIsTermsOpen(true)}
              className="hover:text-emerald-400 underline underline-offset-4 transition cursor-pointer"
            >
              Termos de Responsabilidade & Segurança
            </button>
            <button
              onClick={() => setIsSupportOpen(true)}
              className="hover:text-slate-300 transition cursor-pointer"
            >
              Suporte & Atendimento
            </button>
            <button
              onClick={() => handleSetCurrentView('admin')}
              className="hover:text-amber-300 text-amber-400/90 font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Painel Administrativo</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-slate-300 transition cursor-pointer"
            >
              Configurar Meus Dados
            </button>
          </div>
        </div>
        </footer>
      )}

      {/* Modals */}
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onOpenVisaTracker={() => setIsVisaTrackerOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsInitialTab}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <SecurityTermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <PlayStoreModal
        isOpen={isPlayStoreOpen}
        onClose={() => setIsPlayStoreOpen(false)}
      />

      <TrustVerificationModal
        isOpen={isTrustOpen}
        onClose={() => setIsTrustOpen(false)}
      />

      <CheckoutModal
        isOpen={!!checkoutItem}
        onClose={() => setCheckoutItem(null)}
        onOpenGatewaySetup={() => setIsPspWizardOpen(true)}
        checkoutItem={checkoutItem}
      />

      <VisaPayoutTrackerModal
        isOpen={isVisaTrackerOpen}
        onClose={() => setIsVisaTrackerOpen(false)}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      <PspConfigurationWizard
        isOpen={isPspWizardOpen}
        onClose={() => setIsPspWizardOpen(false)}
      />

      <InAppPurchasesModal
        isOpen={isInAppPurchasesOpen}
        onClose={() => setIsInAppPurchasesOpen(false)}
      />

      <TransactionFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => {
          setIsFeedbackOpen(false);
          setFeedbackTargetTx(null);
        }}
        transaction={feedbackTargetTx}
      />

      <UserProfileShowcaseModal
        isOpen={isProfileShowcaseOpen}
        onClose={() => setIsProfileShowcaseOpen(false)}
        onOpenCheckout={(item) => {
          setIsProfileShowcaseOpen(false);
          setCheckoutItem(item);
        }}
      />

      {/* Creator Achievements & Badges Modal */}
      <CreatorAchievementsModal
        isOpen={isAchievementsModalOpen}
        onClose={() => setIsAchievementsModalOpen(false)}
      />

      {/* MonetizaHub Pro & Ultra Premium Subscription Modal */}
      <AppSubscriptionModal
        isOpen={isAppSubscriptionModalOpen}
        onClose={() => setIsAppSubscriptionModalOpen(false)}
      />

      {/* Gateway de Pagamento Seguro (Stripe, PayPal, Visa Direct & Express) */}
      <PaymentGatewayModal
        isOpen={isPaymentGatewayModalOpen}
        onClose={() => setIsPaymentGatewayModalOpen(false)}
      />

      {/* Advertising Modals (Intersticial e Recompensado) */}
      <InterstitialAdModal
        isOpen={interstitialOpen}
        previewMode={interstitialPreviewMode}
        onClose={() => {
          setInterstitialOpen(false);
          setInterstitialPreviewMode(false);
        }}
        onOpenInAppPurchases={() => setIsInAppPurchasesOpen(true)}
      />

      <RewardedAdModal
        isOpen={rewardedOpen}
        onClose={() => setRewardedOpen(false)}
      />

      {/* Bottom Sticky Banner Ad (oculto no Modo Foco; ativo na Vitrine para visitantes) */}
      {!isOverviewFocusActive && (
        <BottomBannerAd
          isStorefrontView={currentView === 'storefront'}
          onOpenSubscription={() => setIsAppSubscriptionModalOpen(true)}
          onOpenInAppPurchases={() => setIsInAppPurchasesOpen(true)}
        />
      )}

      {/* Gemini Live API Conversational Voice Modal */}
      <LiveVoiceStudioModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        currentView={currentView}
        activeTab={activeTab}
        onNavigateApp={(view, tab) => {
          setCurrentView(view);
          if (view === 'studio' && tab) {
            setActiveTab(tab);
          }
          setIsLiveVoiceOpen(false);
        }}
      />

      {/* Tour Guiado de Boas-Vindas ('Onboarding') com Tooltips */}
      <OnboardingTour
        isOpen={isOnboardingTourOpen}
        onClose={() => setIsOnboardingTourOpen(false)}
        onOpenVisaSettings={() => {
          setIsSettingsOpen(true);
        }}
        onOpenCreateShowcase={() => {
          setIsProfileShowcaseOpen(true);
        }}
        onNavigateTab={(tab) => {
          handleSetActiveTab(tab);
        }}
      />

      {/* Real-time Sales Toast */}
      <SalesNotificationToast />

      {/* Minimum Balance Alert Simulated Toast */}
      <BalanceAlertToast
        onOpenWithdraw={() => setIsWithdrawOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  );
};

export default function App() {
  return (
    <MonetizationProvider>
      <MainAppContent />
    </MonetizationProvider>
  );
}
