import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Wallet,
  CreditCard,
  Target,
  ArrowUpRight,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  Users,
  Heart,
  FileText,
  ChevronRight,
  ShieldCheck,
  Layers,
  Settings,
  HelpCircle,
  Receipt,
  Download,
  Calendar,
  Zap,
  Star,
  Lock,
  User,
  Trophy,
  Award,
  Crown,
  Bot,
  Compass,
  Maximize2,
  Minimize2,
  Columns2,
  X,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL, formatCurrency, formatDate, formatNumber, formatPercentage } from '../../utils/formatters';
import { exportTransactionsToCSV } from '../../utils/exportReports';
import { PaymentMethod, Transaction, TransactionStatus, TransactionType } from '../../types/monetization';
import { BalanceAdjustModal } from './BalanceAdjustModal';
import { MonthlyGoalCard } from './MonthlyGoalCard';
import { NativeAdCard } from '../ads/NativeAdCard';
import { CreatorBadgesCard } from './CreatorBadgesCard';
import { DailyGoalCard } from './DailyGoalCard';
import { AIConversionTipsCard } from './AIConversionTipsCard';
import { FinancialExpensesCard } from './FinancialExpensesCard';
import { FinancialExpensesModal } from './FinancialExpensesModal';
import { ExpressSecurityChecklistCard } from './ExpressSecurityChecklistCard';
import { MulticaixaExpressRealtimeCard } from './MulticaixaExpressRealtimeCard';
import { AdvancedFinancialFiltersCard } from './AdvancedFinancialFiltersCard';
import { TransactionCostAnalysisCard } from './TransactionCostAnalysisCard';
import { useOfflineCache } from '../../hooks/useOfflineCache';
import { OfflineCacheStatusBanner } from './OfflineCacheStatusBanner';
import { ModalityFeeTooltip, MonetizationModality } from '../common/FeeTooltip';
import { DailySalesVolumeChart } from './DailySalesVolumeChart';
import { FiscalSummaryCard } from './FiscalSummaryCard';
import { FinancialGoalsCard } from './FinancialGoalsCard';
import { AIAutopilotPanel } from './AIAutopilotPanel';
import { SmartWeeklySummaryCard } from './SmartWeeklySummaryCard';
import {
  ChartDateGranularity,
  ChartRevenueTypeFilter,
  filterTransactionsForChartWindow,
  getGranularityLabel,
  getRevenueTypeLabel,
} from '../../utils/chartAggregation';
import {
  ProductCategoryFilter,
  OriginChannelFilter,
  UserSegmentFilter,
} from '../../types/monetization';
import {
  resolveTransactionCategory,
  resolveTransactionOrigin,
  resolveTransactionSegment,
  computeGainsMetrics,
  CATEGORY_OPTIONS,
} from '../../utils/transactionFilters';

interface OverviewDashboardProps {
  onOpenWithdraw: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onNavigateTab: (tabId: string) => void;
  onOpenExportReport: () => void;
  onOpenVisaTracker: () => void;
  onOpenInAppPurchases: () => void;
  onOpenFeedback?: (tx?: Transaction) => void;
  onOpenUserProfileShowcase?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onOpenWithdraw,
  onOpenSettings,
  onOpenSupport,
  onNavigateTab,
  onOpenExportReport,
  onOpenVisaTracker,
  onOpenInAppPurchases,
  onOpenFeedback,
  onOpenUserProfileShowcase,
  isFocusMode = false,
  onToggleFocusMode,
}) => {
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [showBreakdownInFocus, setShowBreakdownInFocus] = useState(false);
  const {
    creator,
    currentUser,
    transactions,
    withdrawals,
    totalGrossRevenue,
    totalNetRevenue,
    availableBalance,
    pendingBalance,
    averageRating,
    totalReviewsCount,
    totalWithdrawn,
    mrr,
    totalMembersCount,
    totalSalesCount,
    averageTicket,
    tipGoal,
    products,
    tiers,
    posts,
    selectedCurrency,
    releasePendingBalance,
    addInstantBalance,
    unlockedBadgesCount,
    totalBadgesCount,
    setIsAchievementsModalOpen,
    isExpensesModalOpen,
    setIsExpensesModalOpen,
    setIsAppSubscriptionModalOpen,
    setIsPaymentGatewayModalOpen,
    startOnboardingTour,
  } = useMonetization();

  // IndexedDB Local Offline Cache Service
  const offlineCache = useOfflineCache({
    transactions,
    totalGrossRevenue,
    totalNetRevenue,
    availableBalance,
    totalWithdrawn,
    totalSalesCount,
    mrr,
    averageTicket,
    selectedCurrency,
  });

  // Effective transactions: seamless fallback to IndexedDB cached records when offline
  const effectiveTransactions = offlineCache.effectiveOffline
    ? offlineCache.offlineTransactions
    : transactions;

  // Effective top financial metrics from IndexedDB cache when offline
  const effectiveGrossRevenue = offlineCache.effectiveOffline && offlineCache.cachedMetrics
    ? offlineCache.cachedMetrics.totalGrossRevenue
    : totalGrossRevenue;

  const effectiveNetRevenue = offlineCache.effectiveOffline && offlineCache.cachedMetrics
    ? offlineCache.cachedMetrics.totalNetRevenue
    : totalNetRevenue;

  const effectiveAvailableBalance = offlineCache.effectiveOffline && offlineCache.cachedMetrics
    ? offlineCache.cachedMetrics.availableBalance
    : availableBalance;

  const effectiveSalesCount = offlineCache.effectiveOffline && offlineCache.cachedMetrics
    ? offlineCache.cachedMetrics.totalSalesCount
    : totalSalesCount;

  // Filters for Transactions
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7d' | '30d' | 'month' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [releaseSuccessNotice, setReleaseSuccessNotice] = useState<string | null>(null);

  // Advanced Financial Filters: Categoria, Origem, Segmento
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryFilter>('all');
  const [selectedOrigin, setSelectedOrigin] = useState<OriginChannelFilter>('all');
  const [selectedSegment, setSelectedSegment] = useState<UserSegmentFilter>('all');

  // Chart Filters: Agrupamento por Data (Diário / Semanal / Mensal) & Tipo de Receita (Vendas / Tips / Assinaturas)
  const [chartGranularity, setChartGranularity] = useState<ChartDateGranularity>('daily');
  const [chartRevenueType, setChartRevenueType] = useState<ChartRevenueTypeFilter>('all');

  const handleResetAdvancedFilters = () => {
    setSelectedCategory('all');
    setSelectedOrigin('all');
    setSelectedSegment('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setPaymentMethodFilter('all');
    setSortOrder('newest');
    setSearchTerm('');
  };

  const hasActiveLedgerFilters =
    searchTerm.trim().length > 0 ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    datePreset !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    paymentMethodFilter !== 'all' ||
    selectedCategory !== 'all' ||
    selectedOrigin !== 'all' ||
    selectedSegment !== 'all';

  const handleReleaseBalance = () => {
    releasePendingBalance();
    setReleaseSuccessNotice('Saldo pendente liberado com sucesso! O valor já está no Saldo Disponível para saque.');
    setTimeout(() => setReleaseSuccessNotice(null), 5000);
  };

  const handleAddInstantBalance = () => {
    addInstantBalance(500);
    setReleaseSuccessNotice('Saldo adicionado com sucesso! O valor está pronto para saque imediato no seu Cartão Visa ou Pix.');
    setTimeout(() => setReleaseSuccessNotice(null), 5000);
  };

  // Goal Progress Calculation
  const goalPercent = Math.min(
    100,
    Math.round((tipGoal.currentAmount / tipGoal.targetAmount) * 100)
  );
  const goalRemaining = Math.max(0, tipGoal.targetAmount - tipGoal.currentAmount);

  // Filtered Transactions applying search + date + product type + payment method + status + advanced dimensions
  const filteredTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const fromBoundary = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toBoundary = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    const matched = effectiveTransactions.filter((tx) => {
      const matchesSearch =
        !query ||
        tx.title.toLowerCase().includes(query) ||
        tx.customerName.toLowerCase().includes(query) ||
        tx.customerEmail.toLowerCase().includes(query) ||
        tx.id.toLowerCase().includes(query) ||
        tx.paymentMethod.toLowerCase().includes(query) ||
        (tx.affiliateCode || '').toLowerCase().includes(query) ||
        (tx.message || '').toLowerCase().includes(query);

      const matchesType = typeFilter === 'all' || tx.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
      const matchesPaymentMethod =
        paymentMethodFilter === 'all' || tx.paymentMethod === paymentMethodFilter;

      // Date Range Filter
      let matchesDate = true;
      const txTime = new Date(tx.createdAt).getTime();
      if (!Number.isNaN(txTime)) {
        if (datePreset === 'today') {
          matchesDate = txTime >= startOfToday;
        } else if (datePreset === '7d') {
          matchesDate = txTime >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
        } else if (datePreset === '30d') {
          matchesDate = txTime >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
        } else if (datePreset === 'month') {
          matchesDate = txTime >= startOfMonth;
        } else if (datePreset === 'custom') {
          if (fromBoundary !== null && !Number.isNaN(fromBoundary) && txTime < fromBoundary) {
            matchesDate = false;
          }
          if (toBoundary !== null && !Number.isNaN(toBoundary) && txTime > toBoundary) {
            matchesDate = false;
          }
        }
      }

      // Advanced Dimension 1: Categoria / Tipo de Produto
      const txCategory = resolveTransactionCategory(tx);
      const matchesCategory = selectedCategory === 'all' || txCategory === selectedCategory;

      // Advanced Dimension 2: Canal de Origem (Afiliados vs. Direto)
      const txOrigin = resolveTransactionOrigin(tx);
      const matchesOrigin = selectedOrigin === 'all' || txOrigin === selectedOrigin;

      // Advanced Dimension 3: Segmento de Usuário (Assinantes vs. Ocasionais)
      const txSegment = resolveTransactionSegment(tx);
      const matchesSegment = selectedSegment === 'all' || txSegment === selectedSegment;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesPaymentMethod &&
        matchesDate &&
        matchesCategory &&
        matchesOrigin &&
        matchesSegment
      );
    });

    return matched.sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === 'highest') {
        return b.netAmount - a.netAmount;
      }
      if (sortOrder === 'lowest') {
        return a.netAmount - b.netAmount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    effectiveTransactions,
    searchTerm,
    typeFilter,
    statusFilter,
    paymentMethodFilter,
    datePreset,
    dateFrom,
    dateTo,
    sortOrder,
    selectedCategory,
    selectedOrigin,
    selectedSegment,
  ]);

  // Gains metrics calculated for current active filters vs all transactions
  const filteredGainsMetrics = useMemo(() => {
    return computeGainsMetrics(filteredTransactions);
  }, [filteredTransactions]);

  const allGainsMetrics = useMemo(() => {
    return computeGainsMetrics(effectiveTransactions);
  }, [effectiveTransactions]);


  // Breakdown by revenue stream synchronized with chart date & revenue type filters
  const { revenueStreams, filteredStreamsTotal } = useMemo(() => {
    const windowTxs = filterTransactionsForChartWindow(
      effectiveTransactions,
      chartGranularity,
      chartRevenueType
    );
    const approved = windowTxs.filter((t) => t.status === 'approved');
    const rawTotal = approved.reduce((sum, t) => sum + t.grossAmount, 0);
    const divisor = rawTotal || 1;

    const productsGross = approved
      .filter((t) => t.type === 'product_sale' || t.type === 'in_app_purchase')
      .reduce((sum, t) => sum + t.grossAmount, 0);
    const subscriptionsGross = approved
      .filter((t) => t.type === 'subscription')
      .reduce((sum, t) => sum + t.grossAmount, 0);
    const tipsGross = approved
      .filter((t) => t.type === 'tip')
      .reduce((sum, t) => sum + t.grossAmount, 0);
    const paywallGross = approved
      .filter((t) => t.type === 'paywall_unlock')
      .reduce((sum, t) => sum + t.grossAmount, 0);

    return {
      filteredStreamsTotal: rawTotal,
      revenueStreams: [
        {
          name: 'Produtos Digitais',
          amount: productsGross,
          percent: (productsGross / divisor) * 100,
          color: 'bg-emerald-500',
          count: products.length,
          tab: 'products',
          modality: 'product_sale' as MonetizationModality,
          matchesFilter: chartRevenueType === 'all' || chartRevenueType === 'sales',
        },
        {
          name: 'Assinaturas VIP (MRR)',
          amount: subscriptionsGross,
          percent: (subscriptionsGross / divisor) * 100,
          color: 'bg-indigo-500',
          count: totalMembersCount,
          tab: 'subscriptions',
          modality: 'subscription' as MonetizationModality,
          matchesFilter: chartRevenueType === 'all' || chartRevenueType === 'subscriptions',
        },
        {
          name: 'Apoios & Gorjetas Pix',
          amount: tipsGross,
          percent: (tipsGross / divisor) * 100,
          color: 'bg-amber-500',
          count: tipGoal.currentAmount,
          tab: 'tipping',
          modality: 'tip' as MonetizationModality,
          matchesFilter: chartRevenueType === 'all' || chartRevenueType === 'tips',
        },
        {
          name: 'Conteúdo Paywall',
          amount: paywallGross,
          percent: (paywallGross / divisor) * 100,
          color: 'bg-rose-500',
          count: posts.length,
          tab: 'paywall',
          modality: 'paywall_unlock' as MonetizationModality,
          matchesFilter: chartRevenueType === 'all' || chartRevenueType === 'sales',
        },
      ],
    };
  }, [
    effectiveTransactions,
    chartGranularity,
    chartRevenueType,
    products.length,
    totalMembersCount,
    tipGoal.currentAmount,
    posts.length,
  ]);

  return (
    <div className={isFocusMode ? 'space-y-4 pb-6' : 'space-y-8 pb-16'}>
      {/* Modo Foco: Barra superior minimalista para análise em tela inteira */}
      {isFocusMode && (
        <div className="bg-slate-900 rounded-2xl px-5 py-3.5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
              <Maximize2 className="w-4 h-4 text-emerald-400" />
              <span>Modo Foco · Análise de Receita em Tela Inteira</span>
            </span>
            <span className="text-xs text-slate-400">
              Pressione Esc ou clique no botão ao lado para restaurar os menus.
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowBreakdownInFocus((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                showBreakdownInFocus
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showBreakdownInFocus ? 'Ocultar Fontes' : 'Exibir Fontes'}</span>
            </button>
            {onToggleFocusMode && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Sair do Modo Foco (Esc)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Welcome & Quick Links */}
      {!isFocusMode && (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Painel Financeiro & Monetização
            </h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-md border border-emerald-500/20">
              Conta Verificada
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão consolidada de receitas, metas comunitárias, saques Visa/Pix e histórico de vendas de <strong className="text-white">{creator.name}</strong>.
          </p>
          <div className="flex items-center gap-2.5 mt-2 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => onOpenFeedback?.()}
              className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg transition cursor-pointer"
              title="Média de satisfação e depoimentos de compradores e vendedores"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{averageRating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({totalReviewsCount} avaliações)</span>
            </button>
            <button
              onClick={() => setIsPaymentGatewayModalOpen(true)}
              className="text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[11px] transition cursor-pointer"
              title="Ver detalhes de conformidade PCI-DSS, 3DS2 e integração Stripe & PayPal"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Stripe & PayPal Seguros (PCI-DSS Nível 1)</span>
            </button>
          </div>
        </div>

        {/* Quick action shortcuts */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsPaymentGatewayModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/35 transition cursor-pointer shadow-sm"
            title="Configurar gateway de pagamento seguro (Stripe & PayPal), conformidade PCI-DSS e 3DS2"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gateway Seguro (Stripe / PayPal)</span>
          </button>
          <button
            onClick={startOnboardingTour}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-300 border border-indigo-500/40 transition cursor-pointer shadow-sm active:scale-95"
            title="Iniciar Tour Guiado de Boas-Vindas (Como configurar Visa e Vitrine)"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tour de Boas-Vindas</span>
          </button>
          <button
            onClick={() => onOpenFeedback?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 transition cursor-pointer"
            title="Avaliar compradores e vendedores de transações concluídas"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Avaliar Transações</span>
          </button>
          <button
            onClick={() => onNavigateTab('analytics')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 transition cursor-pointer"
            title="Ver gráficos de ARPU, Receita no Tempo e Taxa de Conversão"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Análise de Receita (ARPU)</span>
          </button>
          <button
            onClick={() => onNavigateTab('ads')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/35 transition cursor-pointer"
            title="Gerenciar formatos de anúncios e ganhos publicitários"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Anúncios & Ads</span>
          </button>
          <button
            onClick={() => setIsAchievementsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer shadow-sm"
            title="Ver Conquistas, Badges Oficiais e Resgatar Pontos de Fidelidade"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Badges & Níveis ({unlockedBadgesCount}/{totalBadgesCount})</span>
          </button>
          <button
            onClick={() => setIsAppSubscriptionModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
            title="Assinar MonetizaHub Pro ou Ultra VIP (Sem Anúncios + Taxa Zero de Saque)"
          >
            <Crown className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>Assinar Pro (Sem Ads)</span>
          </button>
          <button
            onClick={() => setIsExpensesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 transition cursor-pointer"
            title="Monitorar taxas de gateway, custos de marketing e despesas operacionais"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            <span>Custos & Lucro Real</span>
          </button>
          <button
            onClick={onOpenInAppPurchases}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer shadow-sm"
            title="Ver e comprar recursos adicionais no aplicativo (Remover Anúncios, Recursos Avançados, Selo VIP)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Compras no App / Upgrades</span>
          </button>
          <button
            onClick={onOpenVisaTracker}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/40 transition cursor-pointer"
            title="Rastrear compensação e liquidação do saque no seu Cartão Visa"
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            <span>Rastrear Saque Visa</span>
          </button>
          <button
            onClick={onOpenExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/60 transition cursor-pointer"
            title="Exportar histórico e resumo de ganhos em CSV ou PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Ganhos (CSV / PDF)</span>
          </button>
          <button
            onClick={onOpenUserProfileShowcase}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/35 transition cursor-pointer"
            title="Gerenciar perfil pessoal, biografia e vitrine de itens e serviços à venda"
          >
            <User className="w-3.5 h-3.5 text-purple-400" />
            <span>Meu Perfil & Vitrine ({currentUser?.showcaseItems?.length || 0})</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Configurações</span>
          </button>
          <button
            onClick={onOpenSupport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Suporte 24/7</span>
          </button>
          {onToggleFocusMode && (
            <button
              type="button"
              onClick={() => {
                onToggleFocusMode();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/35 transition cursor-pointer whitespace-nowrap shrink-0"
              title="Ocultar barras de navegação e expandir os gráficos de receita em tela inteira"
            >
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modo Foco</span>
            </button>
          )}
          <button
            onClick={onOpenWithdraw}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Sacar Saldo (Visa / Pix)</span>
          </button>
        </div>
      </div>
      )}

      {!isFocusMode && (
        <>
      {/* IndexedDB Local Offline Cache & Network Status Banner */}
      <OfflineCacheStatusBanner offlineState={offlineCache} />

      {/* User Profile & Showcase Quick Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 rounded-2xl p-4 sm:p-5 border border-purple-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-purple-950/20">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative flex-shrink-0">
            <img
              src={currentUser?.avatarUrl || creator.avatarUrl}
              alt={currentUser?.name || creator.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500/50 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" title="Perfil ativo e verificado" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                {currentUser?.name || creator.name}
              </h3>
              <span className="text-xs text-purple-400 font-mono">
                {currentUser?.handle || '@amidel'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold uppercase tracking-wider border border-purple-500/30">
                {currentUser?.category || 'Criador Oficial'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-1 max-w-2xl">
              {currentUser?.bio || 'Criador de conteúdo, produtos digitais e mentorias exclusivas.'}
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
              <span className="text-purple-300 font-medium">
                🛍️ <strong>{currentUser?.showcaseItems?.length || 0}</strong> {currentUser?.showcaseItems?.length === 1 ? 'item à venda' : 'itens à venda na vitrine'}
              </span>
              <span>•</span>
              <span>⭐ {currentUser?.rating ? currentUser.rating.toFixed(1) : '5.0'} de reputação</span>
              <span>•</span>
              <span className="text-emerald-400">🛡️ Vitrine Segura</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onOpenUserProfileShowcase}
            className="w-full md:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Gerenciar Perfil & Vitrine</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Balance */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Disponível para Saque
              </span>
              <button
                type="button"
                onClick={() => setIsBalanceModalOpen(true)}
                className="px-1.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition cursor-pointer text-[10px] font-bold border border-slate-700/60"
                title="Ajustar ou sincronizar o saldo exato"
              >
                Ajustar
              </button>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-white tracking-tight font-mono tabular-nums">
              {formatCurrency(effectiveAvailableBalance, selectedCurrency)}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Pendente:{' '}
                  <strong className="text-amber-400 font-mono">
                    {formatCurrency(pendingBalance, selectedCurrency)}
                  </strong>
                </span>
                <button
                  onClick={onOpenWithdraw}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <span>Resgatar</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Success notification banner */}
              {releaseSuccessNotice && (
                <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-start gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{releaseSuccessNotice}</span>
                </div>
              )}

              {pendingBalance > 0 ? (
                <button
                  type="button"
                  onClick={handleReleaseBalance}
                  className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                  title="Liberar imediatamente o saldo pendente das últimas 24h para saque no seu Cartão Visa ou Pix"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950 animate-pulse" />
                  <span>Liberar / Adicionar Saldo Imediatamente ({formatCurrency(pendingBalance, selectedCurrency)})</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-semibold px-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Saldo 100% Liberado
                    </span>
                    <span className="text-slate-400">Pronto para saque</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInstantBalance}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                    title="Adicionar saldo imediato de teste (+R$ 475,00) para testar saque no Cartão Visa"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    <span>Adicionar Saldo Imediatamente (+{formatCurrency(500, selectedCurrency)})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Total Gross & Net */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Faturamento Total
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-white tracking-tight font-mono tabular-nums">
              {formatCurrency(effectiveGrossRevenue, selectedCurrency)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">
                Líquido:{' '}
                <strong className="text-emerald-400 font-mono">
                  {formatCurrency(effectiveNetRevenue, selectedCurrency)}
                </strong>
              </span>
              <span className="text-slate-400 font-mono flex items-center gap-1">
                <span>Taxa média: ~4.2%</span>
                <ModalityFeeTooltip modality="all_summary" iconOnly />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: MRR / Subscriptions */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receita Recorrente (MRR)
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-purple-300 tracking-tight font-mono tabular-nums">
              {formatCurrency(mrr, selectedCurrency)}
              <span className="text-xs text-slate-400 font-normal">/mês</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">
                Assinantes VIP:{' '}
                <strong className="text-white font-mono">{totalMembersCount}</strong>
              </span>
              <button
                onClick={() => onNavigateTab('subscriptions')}
                className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <span>Planos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Total Transactions & Average Ticket */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Vendas & Ticket Médio
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-white tracking-tight font-mono tabular-nums">
              {formatNumber(effectiveSalesCount)}{' '}
              <span className="text-xs text-slate-400 font-normal">transações</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">
                Ticket Médio:{' '}
                <strong className="text-white font-mono">
                  {formatCurrency(averageTicket, selectedCurrency)}
                </strong>
              </span>
              <span className="text-emerald-400 font-semibold font-mono">
                100% aprovado
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metas Financeiras: Metas Mensais de Receita & Barra de Progresso (Saldo Atual vs Meta) */}
      <FinancialGoalsCard
        transactions={effectiveTransactions}
        currency={selectedCurrency}
        currentBalance={effectiveAvailableBalance}
      />

      {/* 1. Daily Goals Selector & Real vs Target Bar Chart */}
      <DailyGoalCard />

      {/* 2. Financial Expenses & Automatic Net Revenue Waterfall */}
      <FinancialExpensesCard onOpenExpensesModal={() => setIsExpensesModalOpen(true)} />

      {/* Transaction Cost Analysis: Economia em Taxas (Métodos Diretos vs. Intermediários Convencionais) */}
      <TransactionCostAnalysisCard customTransactions={effectiveTransactions} />

      {/* Resumo Fiscal: Balanço consolidado (Entradas: vendas, tips | Saídas: taxas, repasses) + PDF simulado */}
      <FiscalSummaryCard
        transactions={effectiveTransactions}
        withdrawals={withdrawals}
        creator={creator}
        currency={selectedCurrency}
      />

      {/* Multicaixa Express Real-Time Withdrawals & Instant Account Settlement */}
      <MulticaixaExpressRealtimeCard onOpenFullWithdraw={onOpenWithdraw} />

      {/* Multicaixa Express Security Checklist & E2E Encryption Real-time Audit */}
      <ExpressSecurityChecklistCard />

      {/* Resumo Inteligente Semanal (Gemini) */}
      <SmartWeeklySummaryCard />

      {/* 3. Autonomous AI Autopilot (Away / Background Organizer) */}
      <AIAutopilotPanel />

      {/* 3b. AI Conversion Tips Module with Control Panel */}
      <AIConversionTipsCard />

      {/* Creator Badges, Gamification & Achievements Showcase */}
      <CreatorBadgesCard onOpenAchievements={() => setIsAchievementsModalOpen(true)} />

      {/* Monthly Fundraising Goal Component with Interactive Progress Bar and Follower Incentives */}
      <MonthlyGoalCard onNavigateTab={onNavigateTab} />

      {/* Seamless Native Sponsored Partner Card */}
      <NativeAdCard onOpenInAppPurchases={onOpenInAppPurchases} />
        </>
      )}

      {/* Charts Filter Toolbar: Data (Diário, Semanal, Mensal) & Tipo de Receita (Vendas, Tips, Assinaturas) */}
      <section id="revenue-charts-focus-section" aria-label="Filtros dos gráficos financeiros" className="space-y-4">
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-white">Filtros dos Gráficos</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              {getGranularityLabel(chartGranularity)} · {getRevenueTypeLabel(chartRevenueType)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro por Data: Diário, Semanal, Mensal */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Data:</span>
              <div
                role="group"
                aria-label="Filtrar gráficos por período"
                className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800"
              >
                {(
                  [
                    { id: 'daily', label: 'Diário' },
                    { id: 'weekly', label: 'Semanal' },
                    { id: 'monthly', label: 'Mensal' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setChartGranularity(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      chartGranularity === opt.id
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por Tipo de Receita: Todas, Vendas, Tips, Assinaturas */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Receita:</span>
              <div
                role="group"
                aria-label="Filtrar gráficos por tipo de receita"
                className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800"
              >
                {(
                  [
                    { id: 'all', label: 'Todas' },
                    { id: 'sales', label: 'Vendas' },
                    { id: 'tips', label: 'Tips' },
                    { id: 'subscriptions', label: 'Assinaturas' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setChartRevenueType(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      chartRevenueType === opt.id
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Botão Modo Foco na barra de filtros */}
            {onToggleFocusMode && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                aria-pressed={isFocusMode}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                  isFocusMode
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
                title={isFocusMode ? 'Sair do Modo Foco (Esc)' : 'Expandir gráficos em tela inteira'}
              >
                {isFocusMode ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Sair do Modo Foco</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Modo Foco</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Grid: D3 Sales Volume Chart & Revenue Streams Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols (or Full 3 Cols in Focus Mode when side panel hidden) */}
          <div className={isFocusMode && !showBreakdownInFocus ? 'lg:col-span-3' : 'lg:col-span-2'}>
            <DailySalesVolumeChart
              transactions={effectiveTransactions}
              currency={selectedCurrency}
              granularity={chartGranularity}
              onGranularityChange={setChartGranularity}
              revenueType={chartRevenueType}
              onRevenueTypeChange={setChartRevenueType}
              isFocusMode={isFocusMode}
              onToggleFocusMode={onToggleFocusMode}
              onFilterByStatus={(nextStatus) => {
                setStatusFilter(nextStatus);
                document.getElementById('transactions-ledger-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>

          {/* Right 1 Col: Revenue Streams Breakdown */}
          {(!isFocusMode || showBreakdownInFocus) && (
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Fontes de Monetização
                  </h3>
                  <ModalityFeeTooltip modality="all_summary" iconOnly />
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {chartGranularity === 'daily'
                    ? '30d'
                    : chartGranularity === 'weekly'
                    ? '12 sem'
                    : '12m'}
                </span>
              </div>

              <div className="space-y-4">
                {revenueStreams.map((stream) => (
                  <div
                    key={stream.name}
                    onClick={() => onNavigateTab(stream.tab)}
                    className={`p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer group ${
                      stream.matchesFilter ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-200 group-hover:text-emerald-400 transition flex items-center gap-1.5">
                        <span>{stream.name}</span>
                        <ModalityFeeTooltip
                          modality={stream.modality}
                          sampleAmountBRL={stream.amount > 0 ? stream.amount : undefined}
                          iconOnly
                        />
                      </span>
                      <span className="font-mono font-bold text-white tabular-nums">
                        {formatCurrency(stream.amount, selectedCurrency)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stream.color} rounded-full transition-all duration-300`}
                        style={{
                          width: `${stream.amount > 0 ? Math.max(5, stream.percent) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
                      <span>{formatPercentage(stream.percent)} no filtro</span>
                      <span className="text-slate-400 group-hover:text-slate-300 flex items-center gap-0.5">
                        Ver detalhes <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Receita no filtro:</span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(filteredStreamsTotal, selectedCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Sacado:</span>
                <span className="font-mono font-semibold text-slate-300 tabular-nums">
                  {formatCurrency(totalWithdrawn, selectedCurrency)}
                </span>
              </div>
            </div>
          </div>
          )}
        </div>
      </section>

      {!isFocusMode && (
        <>
      {/* Advanced Financial Filters: Categoria de Produto, Canal de Origem, Segmento de Usuário */}
      <AdvancedFinancialFiltersCard
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedOrigin={selectedOrigin}
        onSelectOrigin={setSelectedOrigin}
        selectedSegment={selectedSegment}
        onSelectSegment={setSelectedSegment}
        onResetFilters={handleResetAdvancedFilters}
        filteredGross={filteredGainsMetrics.gross}
        filteredNet={filteredGainsMetrics.net}
        filteredCount={filteredGainsMetrics.count}
        filteredAvgTicket={filteredGainsMetrics.avgTicket}
        totalGrossAll={allGainsMetrics.gross}
        currency={selectedCurrency}
        directGross={allGainsMetrics.direct.gross}
        affiliateGross={allGainsMetrics.affiliate.gross}
        subscriberGross={allGainsMetrics.subscriber.gross}
        occasionalGross={allGainsMetrics.occasional.gross}
      />

      {/* Transaction History Section (Audit & Real-Time Records) */}
      <div
        id="transactions-ledger-section"
        className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl"
      >
        {/* Header & Controls */}
        <div className="p-6 border-b border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Histórico de Transações & Vendas
                </h3>
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-md">
                  {filteredTransactions.length} registros
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Todas as movimentações financeiras auditáveis em tempo real.
              </p>
            </div>

            {/* Quick Export / Print Receipt */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => {
                  exportTransactionsToCSV(filteredTransactions, creator, {
                    totalGross: effectiveGrossRevenue,
                    totalNet: effectiveNetRevenue,
                    availableBalance: effectiveAvailableBalance,
                    totalWithdrawn,
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
                title="Baixar planilha CSV para Excel e Google Sheets"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={onOpenExportReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                title="Visualizar extrato consolidado e imprimir/salvar em PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Relatório PDF</span>
              </button>
            </div>
          </div>

          {/* Search & Advanced Audit Filter Bar */}
          <div className="space-y-3 pt-2">
            {/* Row 1: Search Input + Type of Product + Payment Status + Date Preset */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
              {/* Search Input */}
              <div className="relative lg:col-span-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  aria-label="Pesquisar transações por cliente, e-mail, produto, método ou ID"
                  placeholder="Buscar por cliente, produto, e-mail, ID ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Limpar pesquisa"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Range Preset Filter */}
              <div className="lg:col-span-3">
                <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0 mr-2" />
                  <select
                    aria-label="Filtrar transações por período"
                    value={datePreset}
                    onChange={(e) => {
                      const val = e.target.value as typeof datePreset;
                      setDatePreset(val);
                      if (val !== 'custom') {
                        setDateFrom('');
                        setDateTo('');
                      }
                    }}
                    className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900">Data: Todo o período</option>
                    <option value="today" className="bg-slate-900">Hoje</option>
                    <option value="7d" className="bg-slate-900">Últimos 7 dias</option>
                    <option value="30d" className="bg-slate-900">Últimos 30 dias</option>
                    <option value="month" className="bg-slate-900">Este mês</option>
                    <option value="custom" className="bg-slate-900">Intervalo personalizado...</option>
                  </select>
                </div>
              </div>

              {/* Product Type / Category Filter */}
              <div className="lg:col-span-3">
                <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0 mr-2" />
                  <select
                    aria-label="Filtrar transações por tipo de produto"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as ProductCategoryFilter)}
                    className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900">
                        {cat.id === 'all' ? 'Produto: Todos os tipos' : cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Status Filter */}
              <div className="lg:col-span-2">
                <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mr-2" />
                  <select
                    aria-label="Filtrar transações por status de pagamento"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | TransactionStatus)}
                    className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900">Status: Todos</option>
                    <option value="approved" className="bg-slate-900">Aprovado</option>
                    <option value="pending" className="bg-slate-900">Pendente</option>
                    <option value="refunded" className="bg-slate-900">Reembolsado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Date Inputs when "custom" selected */}
            {datePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Período Personalizado:</span>
                </span>
                <label className="flex items-center gap-1.5 text-slate-400">
                  <span>De:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-slate-400">
                  <span>Até:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </label>
              </div>
            )}

            {/* Row 2: Transaction Type Pills + Payment Method + Sort + Reset */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
                {(
                  [
                    { id: 'all', label: 'Todas', activeClass: 'bg-slate-800 text-white border border-slate-700' },
                    { id: 'product_sale', label: 'Produtos', activeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
                    { id: 'subscription', label: 'Assinaturas', activeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' },
                    { id: 'tip', label: 'Gorjetas Pix', activeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
                    { id: 'paywall_unlock', label: 'Paywall', activeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
                    { id: 'in_app_purchase', label: 'In-App', activeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
                  ] as Array<{ id: 'all' | TransactionType; label: string; activeClass: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTypeFilter(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      typeFilter === item.id ? item.activeClass : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Payment Method, Sort & Clear Filters */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <select
                    aria-label="Filtrar por método de pagamento"
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value as 'all' | PaymentMethod)}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900">Pagamento: Todos</option>
                    <option value="pix" className="bg-slate-900">PIX</option>
                    <option value="credit_card" className="bg-slate-900">Cartão Visa/Master</option>
                    <option value="multicaixa" className="bg-slate-900">Multicaixa Express</option>
                    <option value="stripe" className="bg-slate-900">Stripe</option>
                    <option value="paypal" className="bg-slate-900">PayPal</option>
                    <option value="boleto" className="bg-slate-900">Boleto</option>
                    <option value="crypto" className="bg-slate-900">Cripto</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    aria-label="Ordenar transações"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-slate-900">Mais recentes</option>
                    <option value="oldest" className="bg-slate-900">Mais antigas</option>
                    <option value="highest" className="bg-slate-900">Maior valor</option>
                    <option value="lowest" className="bg-slate-900">Menor valor</option>
                  </select>
                </div>

                {hasActiveLedgerFilters && (
                  <button
                    type="button"
                    onClick={handleResetAdvancedFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar Filtros</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Audit Strip for Filtered Subset */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px]">
              <div className="flex items-center gap-2 text-slate-400">
                <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Auditoria exibindo <strong className="text-white font-mono">{filteredTransactions.length}</strong> de{' '}
                  <strong className="text-slate-300 font-mono">{effectiveTransactions.length}</strong> transações
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                <span className="text-slate-400">
                  Bruto: <strong className="text-white">{formatCurrency(filteredGainsMetrics.gross, selectedCurrency)}</strong>
                </span>
                <span className="text-slate-400">
                  Taxas: <strong className="text-rose-400">-{formatCurrency(filteredGainsMetrics.fees, selectedCurrency)}</strong>
                </span>
                <span className="text-slate-400">
                  Líquido: <strong className="text-emerald-400">{formatCurrency(filteredGainsMetrics.net, selectedCurrency)}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Identificador & Data</th>
                <th className="px-6 py-3.5">Descrição do Item</th>
                <th className="px-6 py-3.5">Cliente / E-mail</th>
                <th className="px-6 py-3.5">Forma</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Valor Líquido</th>
                <th className="px-6 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-sans">
                    <Receipt className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-300">Nenhuma transação encontrada</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ajuste seus termos de busca ou filtros acima.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    {/* ID & Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-white text-xs">{tx.id}</div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {formatDate(tx.createdAt)}
                      </div>
                    </td>

                    {/* Title & Dimension Badges */}
                    <td className="px-6 py-4 font-sans">
                      <div className="font-medium text-slate-200 text-xs line-clamp-1">
                        {tx.title}
                      </div>
                      {tx.message && (
                        <div className="text-[11px] text-amber-400 italic line-clamp-1 mt-0.5">
                          "{tx.message}"
                        </div>
                      )}
                      {/* Advanced Dimension Tags: Categoria, Origem, Segmento */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {CATEGORY_OPTIONS.find((c) => c.id === resolveTransactionCategory(tx))?.shortLabel || 'Geral'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                          resolveTransactionOrigin(tx) === 'affiliate'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                        }`}>
                          {resolveTransactionOrigin(tx) === 'affiliate' ? 'Afiliado' : 'Direto'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                          resolveTransactionSegment(tx) === 'subscriber'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                        }`}>
                          {resolveTransactionSegment(tx) === 'subscriber' ? 'Assinante VIP' : 'Avulso'}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4 font-sans whitespace-nowrap">
                      <div className="font-semibold text-slate-200 text-xs">
                        {tx.customerName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {tx.customerEmail}
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-sans font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                        {tx.paymentMethod === 'pix' ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>PIX</span>
                          </>
                        ) : tx.paymentMethod === 'credit_card' ? (
                          <>
                            <CreditCard className="w-3 h-3 text-indigo-400" />
                            <span>Cartão Visa/Master</span>
                          </>
                        ) : (
                          <span>{tx.paymentMethod}</span>
                        )}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap font-sans">
                      {tx.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aprovado</span>
                        </span>
                      ) : tx.status === 'refunded' ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-semibold">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reembolsado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pendente</span>
                        </span>
                      )}
                    </td>

                    {/* Net Amount */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="font-bold text-emerald-400 text-xs tabular-nums">
                        {formatBRL(tx.netAmount)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        Bruto: {formatBRL(tx.grossAmount)}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right whitespace-nowrap font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenFeedback?.(tx)}
                          className="text-amber-400 hover:text-amber-300 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-amber-500/10 transition cursor-pointer flex items-center gap-1"
                          title="Avaliar a transação com estrelas e depoimento"
                        >
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{tx.reviewSubmitted ? 'Avaliado' : 'Avaliar'}</span>
                        </button>
                        <button
                          onClick={() => setSelectedTxForReceipt(tx)}
                          className="text-slate-400 hover:text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        >
                          Recibo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Modal: View Transaction Receipt */}
      {selectedTxForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl relative">
            <div className="text-center pb-4 border-b border-slate-800">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Comprovante de Transação</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                ID: {selectedTxForReceipt.id}
              </p>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Item / Oferta</span>
                <span className="font-semibold text-white text-right max-w-[200px]">
                  {selectedTxForReceipt.title}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Cliente</span>
                <span className="font-semibold text-slate-200">
                  {selectedTxForReceipt.customerName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">E-mail do Pagador</span>
                <span className="font-mono text-slate-300">
                  {selectedTxForReceipt.customerEmail}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Data e Hora</span>
                <span className="text-slate-300 font-mono">
                  {formatDate(selectedTxForReceipt.createdAt)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Forma de Pagamento</span>
                <span className="font-semibold text-white uppercase">
                  {selectedTxForReceipt.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Taxa de Processamento</span>
                <span className="text-rose-400 font-mono">
                  - {formatBRL(selectedTxForReceipt.fee)}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-bold">
                <span className="text-white">Valor Líquido Recebido</span>
                <span className="text-emerald-400 font-mono">
                  {formatBRL(selectedTxForReceipt.netAmount)}
                </span>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setSelectedTxForReceipt(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Adjuster Modal */}
      <BalanceAdjustModal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
      />

      {/* Financial Expenses & Cost Management Modal */}
      <FinancialExpensesModal
        isOpen={isExpensesModalOpen}
        onClose={() => setIsExpensesModalOpen(false)}
      />
    </div>
  );
};
