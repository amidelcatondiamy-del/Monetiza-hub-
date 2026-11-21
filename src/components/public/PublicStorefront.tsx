import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Users,
  Heart,
  Lock,
  Star,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  CreditCard,
  Award,
  Search,
  Store,
  Tag,
  Clock,
  Gift,
  Play,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatDate, CURRENCY_SYMBOLS } from '../../utils/formatters';
import { DigitalProduct, SubscriptionTier, GatedPost } from '../../types/monetization';
import { NativeAdCard } from '../ads/NativeAdCard';
import { InlineBannerAd } from '../ads/InlineBannerAd';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

interface PublicStorefrontProps {
  onOpenCheckout: (item: {
    type: 'product_sale' | 'subscription' | 'tip' | 'paywall_unlock' | 'in_app_purchase';
    id?: string;
    title: string;
    price: number;
    description?: string;
    contentUrl?: string;
  }) => void;
  onOpenTerms: () => void;
  onOpenTrustModal?: () => void;
}

export const PublicStorefront: React.FC<PublicStorefrontProps> = ({
  onOpenCheckout,
  onOpenTerms,
  onOpenTrustModal,
}) => {
  const {
    creator,
    currentUser,
    products,
    tiers,
    tipGoal,
    posts,
    selectedCurrency,
    badges,
    monetizationModels,
    followerInAppItems,
    adSettings,
    showAdsInStorefront,
    visitorAdFreePreview,
    setVisitorAdFreePreview,
    triggerInterstitialAd,
    setRewardedOpen,
    platformAdminSettings,
    trackAnalyticsEvent,
  } = useMonetization();
  const [activeTab, setActiveTab] = useState<'products' | 'membership' | 'tip' | 'exclusive' | 'vitrine'>('products');
  const tabStartRef = useRef<number>(Date.now());
  const prevTabRef = useRef<string>('products');

  useEffect(() => {
    void trackAnalyticsEvent({
      category: 'monetization_funnel',
      eventType: 'storefront_visit',
      source: 'storefront',
      screenOrTab: 'storefront:products',
      channel: 'instagram_bio',
    });
  }, []);

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      const durationSec = Math.max(1, Math.round((Date.now() - tabStartRef.current) / 1000));
      void trackAnalyticsEvent({
        category: activeTab === 'exclusive' ? 'usage_pattern' : 'engagement',
        eventType: activeTab === 'exclusive' ? 'paywall_hit' : 'tab_switch',
        source: 'storefront',
        screenOrTab: `storefront:${activeTab}`,
        durationSec,
      });
      prevTabRef.current = activeTab;
      tabStartRef.current = Date.now();
    }
  }, [activeTab]);

  const handleOpenTrackedCheckout = (item: {
    type: 'product_sale' | 'subscription' | 'tip' | 'paywall_unlock' | 'in_app_purchase';
    id?: string;
    title: string;
    price: number;
    description?: string;
    contentUrl?: string;
  }) => {
    void trackAnalyticsEvent({
      category: 'monetization_funnel',
      eventType: item.type === 'paywall_unlock' ? 'paywall_hit' : 'checkout_opened',
      source: 'storefront',
      screenOrTab: `storefront:${activeTab}`,
      revenueSource: item.type,
      amountBRL: item.price,
      metadata: { itemTitle: item.title },
    });
    onOpenCheckout(item);
  };

  const publishedProducts = products.filter((p) => p.isPublished !== false);
  const publishedPosts = posts.filter((p) => p.isPublished !== false);

  const showMembershipTab = monetizationModels.subscriptionsEnabled;
  const showTipOrIapTab =
    monetizationModels.donationsEnabled || monetizationModels.followerInAppPurchasesEnabled;
  const showExclusiveTab = monetizationModels.exclusiveContentPaywallEnabled;

  const effectiveTab =
    (activeTab === 'membership' && !showMembershipTab) ||
    (activeTab === 'tip' && !showTipOrIapTab) ||
    (activeTab === 'exclusive' && !showExclusiveTab)
      ? 'products'
      : activeTab;

  const activeFollowerItems = followerInAppItems.filter((item) => item.enabled);

  // Initial tip preset based on currency & creator presets
  const getInitialTip = () => {
    const firstPreset = monetizationModels.presetDonationAmounts[1] || monetizationModels.presetDonationAmounts[0] || 25;
    if (selectedCurrency === 'USD' || selectedCurrency === 'EUR') return '5.00';
    if (selectedCurrency === 'AOA') return '3500.00';
    return firstPreset.toFixed(2);
  };
  const [customTip, setCustomTip] = useState(getInitialTip());

  const goalPercent = Math.min(
    100,
    Math.round((tipGoal.currentAmount / tipGoal.targetAmount) * 100)
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {platformAdminSettings.maintenanceMode && (
        <div className="bg-amber-950/60 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xs font-bold text-amber-200">
                Vitrine em Modo de Manutenção Programada
              </h2>
              <p className="text-xs text-amber-100/80 mt-0.5">
                Novos checkouts públicos podem estar temporariamente limitados. Dúvidas? Contate {platformAdminSettings.supportEmail}.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-amber-300 whitespace-nowrap shrink-0">
            MODO MANUTENÇÃO
          </span>
        </div>
      )}

      {/* Creator Public Hero Banner */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
        {/* Banner image */}
        <div className="h-44 sm:h-56 w-full relative overflow-hidden bg-gradient-to-r from-emerald-800 to-indigo-900">
          <img
            src={creator.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        </div>

        {/* Profile Details */}
        <div className="px-6 sm:px-8 pb-6 -mt-16 sm:-mt-20 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <img
              src={creator.avatarUrl}
              alt={creator.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-slate-900 shadow-xl"
            />
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {creator.name}
                </h1>
                {creator.verified && (
                  <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-400 font-mono">@{creator.handle}</p>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 font-mono flex items-center gap-2 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pagamentos Seguros com Visa & Pix</span>
            <ModalityFeeTooltip modality="all_summary" iconOnly tone="emerald" />
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-4 text-xs text-slate-300 max-w-2xl leading-relaxed">
          <p className="font-medium text-slate-200">{creator.tagline}</p>
          <p className="text-slate-400 mt-1">{creator.bio}</p>

          {/* Official Creator Badges & Recognition */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Conquistas Verificadas:
            </span>
            {badges.filter((b) => b.unlocked).slice(0, 4).map((b) => (
              <span
                key={b.id}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${b.gradient} text-white shadow-sm`}
                title={`${b.title}: ${b.description}`}
              >
                <Award className="w-3 h-3" />
                <span>{b.title}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-t border-slate-800 bg-slate-950/70 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              effectiveTab === 'products'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Produtos & Cursos ({publishedProducts.length})</span>
          </button>
          {showMembershipTab && (
            <button
              onClick={() => setActiveTab('membership')}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                effectiveTab === 'membership'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Clube de Assinantes VIP ({tiers.length})</span>
            </button>
          )}
          {showTipOrIapTab && (
            <button
              onClick={() => setActiveTab('tip')}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                effectiveTab === 'tip'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {monetizationModels.followerInAppPurchasesEnabled && monetizationModels.donationsEnabled
                  ? `Apoiar & In-App (${activeFollowerItems.length})`
                  : monetizationModels.followerInAppPurchasesEnabled
                  ? `Benefícios In-App (${activeFollowerItems.length})`
                  : 'Apoiar com Doação'}
              </span>
            </button>
          )}
          {showExclusiveTab && (
            <button
              onClick={() => setActiveTab('exclusive')}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                effectiveTab === 'exclusive'
                  ? 'border-rose-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Conteúdo Exclusivo ({publishedPosts.length})</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('vitrine')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              effectiveTab === 'vitrine'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-purple-400" />
            <span>Vitrine de Itens & Serviços ({currentUser?.showcaseItems?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* High-Trust & Customer Confidence Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                Página Oficial & Verificada de {creator.name}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                100% Confiável
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Garantia legal de 7 dias, entrega imediata e liquidação protegida via Visa Direct ({CURRENCY_SYMBOLS[selectedCurrency].flag} {selectedCurrency}).
            </p>
          </div>
        </div>

        {onOpenTrustModal && (
          <button
            onClick={onOpenTrustModal}
            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex-shrink-0 shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verificar Autenticidade / Comprovante</span>
          </button>
        )}
      </div>

      {/* Storefront Visitor Ad Delivery Bar */}
      {monetizationModels.adsEnabled && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0">
              {showAdsInStorefront ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-white">
                {showAdsInStorefront
                  ? 'Modo Visitante da Vitrine: Anúncios Ativos'
                  : 'Simulando Visitante Sem Anúncios (Pro / Ad-Free)'}
              </div>
              <p className="text-[11px] text-slate-400">
                {showAdsInStorefront
                  ? `Visitantes comuns visualizam banners, cards nativos e vídeos opt-in (${monetizationModels.adRevenueShareCreatorPct}% da receita vai para você).`
                  : 'Espaços publicitários ocultos nesta simulação de cliente sem anúncios.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setVisitorAdFreePreview(!visitorAdFreePreview)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap shrink-0 ${
              showAdsInStorefront
                ? 'bg-slate-950 border-slate-700 hover:border-purple-500 text-slate-200'
                : 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white'
            }`}
          >
            {showAdsInStorefront ? 'Simular Visitante Sem Ads' : 'Reativar Anúncios de Visitante'}
          </button>
        </div>
      )}

      {/* TAB CONTENT */}

      {/* Products Tab */}
      {effectiveTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              Catálogo de Materiais Digitais
            </h2>
            <span className="text-xs text-slate-400">Entrega imediata por download ou e-mail</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {publishedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition group shadow-lg"
              >
                <div>
                  <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                    <img
                      src={product.coverImage}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-200 border border-slate-700/60 uppercase">
                      {product.type}
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-300 text-xs font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-300" />
                        <span className="font-bold">{product.rating}</span>
                        <span className="text-slate-500">({product.ratingsCount})</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        {product.salesCount}+ vendidos
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    {product.originalPrice && (
                      <span className="text-[11px] text-slate-500 line-through font-mono block">
                        {formatCurrency(product.originalPrice, selectedCurrency)}
                      </span>
                    )}
                    <span className="text-base font-black text-white font-mono">
                      {formatCurrency(product.price, selectedCurrency)}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleOpenTrackedCheckout({
                        type: 'product_sale',
                        id: product.id,
                        title: product.title,
                        price: product.price,
                        description: product.description,
                        contentUrl: product.contentUrl,
                      })
                    }
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Comprar Agora</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Responsive Ad Banner (Leaderboard 728x90 / Mobile 320x50) */}
          <InlineBannerAd size="leaderboard" forceVisible={showAdsInStorefront} />

          {/* Seamless Native Sponsored Partner Card */}
          <NativeAdCard forceVisible={showAdsInStorefront} />

          {/* Opt-in Rewarded Video Slot */}
          {showAdsInStorefront && adSettings.rewardedEnabled && (
            <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    Ganhe +R$ 5,00 assistindo a um vídeo patrocinado de 15s
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Totalmente opcional (Opt-in). O valor é creditado na sua carteira após concluir os 15 segundos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRewardedOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Assistir Vídeo (+R$ 5,00)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Membership Tab */}
      {effectiveTab === 'membership' && showMembershipTab && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Planos do Clube de Assinaturas
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cancele a qualquer momento com 1 clique sem burocracia.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`bg-slate-900/90 rounded-2xl border p-6 flex flex-col justify-between space-y-5 transition ${
                  tier.popular
                    ? 'border-indigo-500/60 shadow-xl shadow-indigo-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                    {tier.badge}
                  </span>
                  <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                  <p className="text-xs text-slate-400">{tier.tagline}</p>

                  <div className="pt-2">
                    <div className="text-2xl font-black text-white font-mono">
                      {formatCurrency(tier.monthlyPrice, selectedCurrency)}
                      <span className="text-xs text-slate-400 font-normal"> /mês</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    {tier.perks.map((perk, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleOpenTrackedCheckout({
                      type: 'subscription',
                      id: tier.id,
                      title: `Assinatura: ${tier.name}`,
                      price: tier.monthlyPrice,
                      description: tier.tagline,
                    })
                  }
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer"
                >
                  Assinar {tier.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip & Follower In-App Purchases Tab */}
      {effectiveTab === 'tip' && showTipOrIapTab && (
        <div className="space-y-6">
          {/* Follower In-App Purchases Grid */}
          {monetizationModels.followerInAppPurchasesEnabled && activeFollowerItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Compras no Aplicativo & Benefícios de Fã</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Adquira emblemas de apoiador, prioridade nas lives ou passes exclusivos com ativação instantânea.
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {activeFollowerItems.length} itens ativos
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeFollowerItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {item.badgeLabel}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {item.salesCount} apoiadores
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-base font-black text-white font-mono tabular-nums">
                        {formatCurrency(item.price, selectedCurrency)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenTrackedCheckout({
                            type: 'in_app_purchase',
                            id: item.id,
                            title: item.title,
                            price: item.price,
                            description: item.description,
                          })
                        }
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Adquirir Benefício</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Donations & Community Goal */}
          {monetizationModels.donationsEnabled && (
            <div className="max-w-xl mx-auto bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <Heart className="w-6 h-6 fill-current" />
                </div>
                <h2 className="text-lg font-bold text-white">Apoie o Trabalho de {creator.name}</h2>
                <p className="text-xs text-slate-400">
                  Contribua com qualquer valor para incentivar as publicações e produções de {creator.name}.
                </p>
              </div>

              {/* Goal bar */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">{tipGoal.title}</span>
                  <span className="font-mono text-amber-400 font-bold tabular-nums">{goalPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                    style={{ width: `${goalPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {formatCurrency(tipGoal.currentAmount, selectedCurrency)} de {formatCurrency(tipGoal.targetAmount, selectedCurrency)} arrecadados
                </p>
              </div>

              {/* Quick value buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Escolha um valor sugerido ou digite ({CURRENCY_SYMBOLS[selectedCurrency].flag} {selectedCurrency}):
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {(selectedCurrency === 'AOA'
                    ? ['1500.00', '3500.00', '7500.00', '15000.00']
                    : selectedCurrency === 'USD' || selectedCurrency === 'EUR'
                    ? ['3.00', '5.00', '10.00', '25.00']
                    : monetizationModels.presetDonationAmounts.map((n) => n.toFixed(2))
                  ).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCustomTip(val)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition cursor-pointer tabular-nums ${
                        customTip === val
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {CURRENCY_SYMBOLS[selectedCurrency].symbol} {Number(val).toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {CURRENCY_SYMBOLS[selectedCurrency].symbol}
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  handleOpenTrackedCheckout({
                    type: 'tip',
                    title: `Apoio espontâneo para ${creator.name}`,
                    price: parseFloat(customTip) || 10,
                  })
                }
                className="w-full py-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Heart className="w-4 h-4 fill-current" />
                <span>Enviar Apoio de {CURRENCY_SYMBOLS[selectedCurrency].symbol} {customTip}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Exclusive Paywall Tab */}
      {effectiveTab === 'exclusive' && showExclusiveTab && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Artigos & Relatórios Exclusivos
              </h2>
              <span className="text-xs text-slate-400">
                Desbloqueio avulso imediato{showMembershipTab ? ' ou acesso liberado para assinantes do Clube VIP' : ''}
              </span>
            </div>
            {showMembershipTab && (
              <button
                type="button"
                onClick={() => setActiveTab('membership')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition cursor-pointer self-start sm:self-auto whitespace-nowrap"
              >
                Ver Planos VIP que Desbloqueiam Tudo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {publishedPosts.map((post) => {
              const linkedTier = tiers.find((t) => t.id === post.requiredTier);
              return (
                <div
                  key={post.id}
                  className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20 font-bold">
                        CONTEÚDO FECHADO
                      </span>
                      {showMembershipTab && (
                        <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold">
                          {linkedTier ? `Incluso: ${linkedTier.name}` : 'Incluso no Clube VIP'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{post.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{post.excerpt}</p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {formatDate(post.publishedAt)}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white font-mono tabular-nums">
                      {formatCurrency(post.unlockPrice, selectedCurrency)}
                    </span>
                    <button
                      onClick={() =>
                        handleOpenTrackedCheckout({
                          type: 'paywall_unlock',
                          id: post.id,
                          title: post.title,
                          price: post.unlockPrice,
                          description: post.excerpt,
                        })
                      }
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Desbloquear Post</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {showAdsInStorefront && monetizationModels.adPlacementMode !== 'minimal' && (
            <NativeAdCard forceVisible={showAdsInStorefront} />
          )}

          {showAdsInStorefront && monetizationModels.adPlacementMode === 'high_yield' && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => triggerInterstitialAd('exclusive_feed_prompt', { isStorefront: true })}
                className="text-[11px] text-slate-400 hover:text-purple-300 underline cursor-pointer"
              >
                Ver oferta patrocinada em tela cheia
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vitrine de Itens & Serviços Tab Content */}
      {effectiveTab === 'vitrine' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-400" />
                <span>Vitrine de Itens & Serviços à Venda</span>
              </h2>
              <p className="text-xs text-slate-400">
                Itens e serviços oferecidos diretamente pelo perfil de <strong className="text-white">{currentUser?.name || creator.name}</strong>.
              </p>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg self-start">
              {currentUser?.showcaseItems?.length || 0} disponíveis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {currentUser?.showcaseItems?.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden hover:border-purple-500/40 transition flex flex-col justify-between group shadow-lg"
              >
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  <img
                    src={item.coverImage || item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600/90 text-white backdrop-blur shadow">
                      {item.type === 'service' ? '🛠️ Serviço' : '📦 Item / Produto'}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-950/80 text-slate-300 border border-slate-700/60 backdrop-blur">
                      {item.category || item.deliveryFormat || 'Geral'}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5 bg-slate-950/90 text-amber-400 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border border-slate-800">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{(item.rating ?? 5.0).toFixed(1)}</span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Preço</div>
                      <div className="text-base font-extrabold text-white font-mono">
                        {formatCurrency(item.price, selectedCurrency)}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleOpenTrackedCheckout({
                          type: 'product_sale',
                          id: item.id,
                          title: item.title,
                          price: item.price,
                          description: item.description,
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-purple-600/25 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{item.type === 'service' ? 'Contratar Serviço' : 'Comprar Item'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Link to Security Terms & Compliance */}
      <footer className="pt-8 pb-4 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {onOpenTrustModal && (
            <button
              onClick={onOpenTrustModal}
              className="hover:text-emerald-400 underline transition cursor-pointer text-emerald-400/90 font-medium"
            >
              Consultar Comprovante / Autenticidade
            </button>
          )}
          <button
            onClick={onOpenTerms}
            className="hover:text-emerald-400 underline transition cursor-pointer"
          >
            Termos de Responsabilidade & Segurança
          </button>
          <span>•</span>
          <span>Proteção de Dados LGPD</span>
          <span>•</span>
          <span>Repasses Visa Direct & Banco Central</span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">
          © 2026 {creator.name} • Criadora Oficial • MonetizaHub Global
        </p>
      </footer>
    </div>
  );
};
