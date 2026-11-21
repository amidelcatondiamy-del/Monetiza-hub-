import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  MoreVertical,
  X,
  Info,
  Sparkles,
  Star,
  RefreshCw,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { NativeAd } from '../../types/monetization';

interface NativeAdCardProps {
  ad?: NativeAd;
  variant?: 'card' | 'compact' | 'feed';
  forceVisible?: boolean;
  previewMode?: boolean;
  onOpenInAppPurchases?: () => void;
}

export const NativeAdCard: React.FC<NativeAdCardProps> = ({
  ad,
  forceVisible = false,
  previewMode = false,
  onOpenInAppPurchases,
}) => {
  const {
    adCampaigns,
    isAdsRemoved,
    studioAdPreviewEnabled,
    recordAdClick,
    recordAdEvent,
    monetizationModels,
    adSettings,
    creator,
    getWinningAdNetwork,
  } = useMonetization();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const recordedImpressionRef = useRef<string | null>(null);

  const winningNetwork = getWinningAdNetwork('native');

  const eligibleAds = useMemo(() => {
    const activeNative = adCampaigns.filter(
      (c) => c.active !== false && (!c.format || c.format === 'native' || c.format === 'both')
    );
    return activeNative.length > 0 ? activeNative : adCampaigns;
  }, [adCampaigns]);

  const currentAd = ad || eligibleAds[activeIndex % Math.max(1, eligibleAds.length)];

  const hiddenForCreator =
    !forceVisible && !previewMode && !studioAdPreviewEnabled && isAdsRemoved;
  const shouldRender =
    Boolean(currentAd) &&
    (previewMode ||
      (!hiddenForCreator &&
        !isDismissed &&
        monetizationModels.adsEnabled &&
        adSettings.nativeEnabled));

  useEffect(() => {
    if (!shouldRender || previewMode || !currentAd) return;
    const key = `${currentAd.id}:${winningNetwork?.id || 'default'}`;
    if (recordedImpressionRef.current !== key) {
      recordedImpressionRef.current = key;
      recordAdEvent({
        networkId: winningNetwork?.id,
        format: 'native',
        eventType: 'impression',
        placementId: winningNetwork?.unitSlots.nativePlacementId || winningNetwork?.unitSlots.bannerPlacementId,
        adId: currentAd.id,
        revenue: 0.04,
      });
    }
  }, [shouldRender, previewMode, currentAd, winningNetwork]);

  if (!shouldRender || !currentAd) {
    return null;
  }

  return (
    <>
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 transition overflow-hidden relative group">
        {/* Header Badge & Sponsor Disclosures */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
              {currentAd.badge || 'Patrocinado'}
            </span>
            <span className="text-slate-300 font-medium text-[11px] hidden sm:inline">
              {currentAd.sponsorName}
            </span>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              · {winningNetwork?.shortLabel || 'AdMob'}
            </span>
            <span className="text-[10px] text-emerald-400/90 hidden lg:inline font-mono">
              · {monetizationModels.adRevenueShareCreatorPct}% apoia {creator.name}
            </span>
            {currentAd.rating && (
              <span className="flex items-center gap-0.5 text-amber-400 text-[11px] font-bold font-mono tabular-nums">
                <Star className="w-3 h-3 fill-amber-400" />
                {currentAd.rating}
              </span>
            )}
            {previewMode && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  monetizationModels.adsEnabled && adSettings.nativeEnabled
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {monetizationModels.adsEnabled && adSettings.nativeEnabled
                  ? 'Preview · Ativo na Vitrine'
                  : 'Preview · Pausado na Vitrine'}
              </span>
            )}
          </div>

          <div className="relative flex items-center gap-1 shrink-0">
            {!ad && eligibleAds.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev + 1) % eligibleAds.length)}
                className="px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                title="Alternar campanha patrocinada"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Próximo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              title="Opções do anúncio"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-7 w-48 bg-slate-950 rounded-xl border border-slate-800 shadow-xl py-1 z-30 text-xs text-slate-300 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowWhyModal(true);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Por que este anúncio?</span>
                </button>
                {!previewMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setIsDismissed(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-rose-400 flex items-center gap-2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Ocultar este anúncio</span>
                  </button>
                )}
                {onOpenInAppPurchases && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenInAppPurchases();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-purple-400 flex items-center gap-2 border-t border-slate-800 cursor-pointer font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Remover Anúncios</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Layout */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/70 flex items-center justify-center shrink-0 text-sm font-black text-emerald-400">
              {currentAd.sponsorName.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] text-emerald-400 font-semibold">
                  {currentAd.category}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-xs text-slate-400 font-medium truncate">
                  {currentAd.sponsorName}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                {currentAd.title}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2">
                {currentAd.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <a
              href={currentAd.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordAdClick(currentAd.id, 'native', winningNetwork?.id)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-2 whitespace-nowrap group-hover:border-emerald-500/50"
            >
              <span>{currentAd.ctaText}</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Why This Ad Modal */}
      {showWhyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400" />
                <span>Sobre Anúncios Nativos</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Este anúncio é veiculado através da mediação conectada ({winningNetwork?.name || 'Google AdMob'}). Os anúncios ajudam criadores a monetizar sem comprometer a leitura do conteúdo.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-200">Privacidade Garantida</div>
              <div>Nenhum dado financeiro ou sensível é compartilhado com anunciantes.</div>
            </div>
            <button
              type="button"
              onClick={() => setShowWhyModal(false)}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
