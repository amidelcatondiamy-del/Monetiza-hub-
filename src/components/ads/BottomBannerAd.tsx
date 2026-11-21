import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ExternalLink, CreditCard, Crown } from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';

interface BottomBannerAdProps {
  isStorefrontView?: boolean;
  onOpenSubscription?: () => void;
  onOpenInAppPurchases?: () => void;
}

const FALLBACK_BOTTOM_BANNERS = [
  {
    id: 'bn-visa-direct',
    sponsor: 'Visa Direct para Criadores',
    tagline: 'Receba seus ganhos diretamente no seu Cartão Visa em minutos',
    ctaText: 'Ver Como Funciona',
    url: 'https://www.visa.com.br/pt_br/visa-direct',
    badge: 'Patrocinador Oficial',
    btnColor: 'bg-blue-500 hover:bg-blue-400 text-white',
  },
  {
    id: 'ad-nubank-pj',
    sponsor: 'Nubank PJ',
    tagline: 'Conta jurídica sem tarifa mensal e Pix gratuito para infoprodutores',
    ctaText: 'Abrir Conta Grátis',
    url: 'https://nubank.com.br/pj',
    badge: 'Parceiro Recomendado',
    btnColor: 'bg-purple-600 hover:bg-purple-500 text-white',
  },
  {
    id: 'ad-stripe-atlas',
    sponsor: 'Stripe Payments',
    tagline: 'Venda infoprodutos em 135+ moedas com checkout ultra-rápido',
    ctaText: 'Conectar Stripe',
    url: 'https://stripe.com/br',
    badge: 'Infraestrutura Global',
    btnColor: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black',
  },
];

const BTN_COLORS = [
  'bg-blue-500 hover:bg-blue-400 text-white',
  'bg-purple-600 hover:bg-purple-500 text-white',
  'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black',
];

export const BottomBannerAd: React.FC<BottomBannerAdProps> = ({
  isStorefrontView = false,
  onOpenSubscription,
  onOpenInAppPurchases,
}) => {
  const {
    isAdsRemoved,
    showAdsInStorefront,
    studioAdPreviewEnabled,
    adCampaigns,
    recordAdClick,
    recordAdEvent,
    setIsAppSubscriptionModalOpen,
    monetizationModels,
    adSettings,
    getWinningAdNetwork,
  } = useMonetization();
  const [isDismissed, setIsDismissed] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const recordedKeyRef = useRef<string | null>(null);

  const bannerList = useMemo(() => {
    const active = adCampaigns
      .filter((c) => c.active !== false && (c.format === 'banner' || c.format === 'both' || !c.format))
      .map((c, idx) => ({
        id: c.id,
        sponsor: c.sponsorName,
        tagline: c.title,
        ctaText: c.ctaText,
        url: c.ctaUrl,
        badge: c.badge || 'Patrocinador',
        btnColor: BTN_COLORS[idx % BTN_COLORS.length],
      }));
    return active.length > 0 ? active : FALLBACK_BOTTOM_BANNERS;
  }, [adCampaigns]);

  const winningNetwork = getWinningAdNetwork('banner');
  const currentAd = bannerList[currentAdIndex % bannerList.length];
  const refreshSec = Math.max(15, adSettings.bannerRefreshSeconds || 30);

  const canShowOnSurface = isStorefrontView
    ? showAdsInStorefront
    : !isAdsRemoved || studioAdPreviewEnabled;

  const isVisible =
    canShowOnSurface &&
    !isDismissed &&
    monetizationModels.adsEnabled &&
    adSettings.bottomBannerEnabled !== false &&
    adSettings.bannerPosition !== 'inline' &&
    Boolean(winningNetwork) &&
    Boolean(currentAd);

  useEffect(() => {
    if (!isVisible || !winningNetwork || !currentAd) return;
    const key = `${winningNetwork.id}:${currentAd.id}`;
    if (recordedKeyRef.current !== key) {
      recordedKeyRef.current = key;
      recordAdEvent({
        networkId: winningNetwork.id,
        format: 'banner',
        eventType: 'impression',
        placementId: winningNetwork.unitSlots.bannerPlacementId,
        adId: currentAd.id,
        revenue: 0.015,
      });
    }
  }, [isVisible, winningNetwork, currentAd]);

  useEffect(() => {
    if (!isVisible || bannerList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % bannerList.length);
    }, refreshSec * 1000);
    return () => clearInterval(timer);
  }, [isVisible, refreshSec, bannerList.length]);

  if (!isVisible || !winningNetwork || !currentAd) {
    return null;
  }

  const handleUpgradeNoAds = () => {
    if (isStorefrontView && onOpenInAppPurchases) {
      onOpenInAppPurchases();
    } else if (onOpenSubscription) {
      onOpenSubscription();
    } else {
      setIsAppSubscriptionModalOpen(true);
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-auto animate-slideUp">
      <div className="bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 shadow-2xl px-4 py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700/80 shrink-0">
              {winningNetwork.shortLabel}
            </span>

            <a
              href={currentAd.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordAdClick(currentAd.id, 'banner', winningNetwork.id)}
              className="flex items-center gap-2 group truncate"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-blue-300 transition leading-tight">
                  <span>{currentAd.sponsor}</span>
                  <span className="text-[10px] text-slate-400 font-normal hidden md:inline">
                    · {currentAd.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate hidden sm:block">
                  {currentAd.tagline}
                </p>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <a
              href={currentAd.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordAdClick(currentAd.id, 'banner', winningNetwork.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${currentAd.btnColor}`}
            >
              <span>{currentAd.ctaText}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={handleUpgradeNoAds}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Assinar plano sem anúncios ou comprar remoção permanente"
            >
              <Crown className="w-3 h-3 text-amber-400" />
              <span className="hidden md:inline">Sem Anúncios</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar anúncio"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
