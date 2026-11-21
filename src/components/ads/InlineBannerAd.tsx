import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';

interface InlineBannerAdProps {
  size?: 'leaderboard' | 'rectangle';
  previewMode?: boolean;
  forceVisible?: boolean;
  onDismiss?: () => void;
}

const ACCENT_PALETTES = [
  {
    accentBg: 'from-slate-900 via-indigo-950/70 to-slate-900',
    ctaClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  },
  {
    accentBg: 'from-slate-900 via-emerald-950/60 to-slate-900',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  {
    accentBg: 'from-slate-900 via-sky-950/60 to-slate-900',
    ctaClass: 'bg-sky-600 hover:bg-sky-500 text-white',
  },
];

const FALLBACK_BANNER_CREATIVES = [
  {
    id: 'bn-visa-direct',
    sponsor: 'Visa Direct Business',
    headline: 'Liquidação imediata em cartão e conta bancária para criadores globais',
    cta: 'Explorar Solução',
    url: 'https://www.visa.com.br/pt_br/visa-direct',
    category: 'Pagamentos',
  },
  {
    id: 'bn-cloud-scale',
    sponsor: 'CloudScale Hosting',
    headline: 'CDN global e streaming de baixa latência para infoprodutos e comunidades',
    cta: 'Testar Grátis',
    url: 'https://cloud.google.com/innovators',
    category: 'Infraestrutura',
  },
  {
    id: 'bn-stripe-global',
    sponsor: 'Stripe Atlas',
    headline: 'Receba em USD, EUR e AOA com conversão automática e proteção antifraude',
    cta: 'Abrir Conta',
    url: 'https://stripe.com/atlas',
    category: 'Finanças',
  },
];

export const InlineBannerAd: React.FC<InlineBannerAdProps> = ({
  size = 'leaderboard',
  previewMode = false,
  forceVisible = false,
  onDismiss,
}) => {
  const {
    isAdsRemoved,
    studioAdPreviewEnabled,
    adCampaigns,
    monetizationModels,
    adSettings,
    getWinningAdNetwork,
    recordAdEvent,
    recordAdClick,
  } = useMonetization();

  const [creativeIdx, setCreativeIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const recordedSlotRef = useRef<string | null>(null);

  const creatives = useMemo(() => {
    const campaignBanners = adCampaigns
      .filter((c) => c.active !== false && (c.format === 'banner' || c.format === 'both' || !c.format))
      .map((c, idx) => ({
        id: c.id,
        sponsor: c.sponsorName,
        headline: c.title,
        cta: c.ctaText,
        url: c.ctaUrl,
        category: c.category,
        ...ACCENT_PALETTES[idx % ACCENT_PALETTES.length],
      }));

    if (campaignBanners.length > 0) return campaignBanners;
    return FALLBACK_BANNER_CREATIVES.map((b, idx) => ({
      ...b,
      ...ACCENT_PALETTES[idx % ACCENT_PALETTES.length],
    }));
  }, [adCampaigns]);

  const winningNetwork = getWinningAdNetwork('banner');
  const creative = creatives[creativeIdx % creatives.length];
  const refreshSec = Math.max(15, adSettings.bannerRefreshSeconds || 30);

  const hiddenForCreator = !forceVisible && !studioAdPreviewEnabled && isAdsRemoved;

  const shouldShow =
    previewMode ||
    (!hiddenForCreator &&
      !dismissed &&
      monetizationModels.adsEnabled &&
      adSettings.inlineBannerEnabled !== false &&
      adSettings.bannerPosition !== 'bottom' &&
      Boolean(winningNetwork));

  useEffect(() => {
    if (!shouldShow || previewMode || !winningNetwork || !creative) return;
    const key = `${winningNetwork.id}:${creative.id}`;
    if (recordedSlotRef.current !== key) {
      recordedSlotRef.current = key;
      recordAdEvent({
        networkId: winningNetwork.id,
        format: 'banner',
        eventType: 'impression',
        placementId: winningNetwork.unitSlots.bannerPlacementId,
        adId: creative.id,
        revenue: 0.02,
      });
    }
  }, [shouldShow, previewMode, winningNetwork, creative]);

  useEffect(() => {
    if (!shouldShow || creatives.length <= 1) return;
    const timer = setInterval(() => {
      setCreativeIdx((prev) => (prev + 1) % creatives.length);
    }, refreshSec * 1000);
    return () => clearInterval(timer);
  }, [shouldShow, refreshSec, creatives.length]);

  if (!shouldShow || !winningNetwork || !creative) return null;

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-gradient-to-r ${creative.accentBg} overflow-hidden`}
      aria-label="Espaço de anúncio banner"
    >
      {/* Top Disclosure Bar */}
      <div className="px-4 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="font-bold uppercase tracking-wider text-slate-300">Anúncio</span>
          <span>·</span>
          <span className="text-slate-300 font-medium truncate">
            {winningNetwork.name}
          </span>
          <span className="hidden sm:inline text-slate-500 font-mono truncate">
            · {size === 'leaderboard' ? '728×90 / 320×50' : '300×250'} · Bloco{' '}
            {winningNetwork.unitSlots.bannerPlacementId}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCreativeIdx((prev) => (prev + 1) % creatives.length)}
            className="text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Rotacionar criativo do banner"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Trocar</span>
          </button>
          {!previewMode && (
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                onDismiss?.();
              }}
              className="text-slate-500 hover:text-white transition cursor-pointer"
              title="Ocultar banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Responsive Banner Content */}
      <div
        className={`px-4 py-3.5 flex ${
          size === 'rectangle'
            ? 'flex-col items-start gap-3'
            : 'flex-col sm:flex-row sm:items-center justify-between gap-3'
        }`}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-bold text-white truncate">{creative.sponsor}</span>
            <span className="text-slate-400 hidden sm:inline">· {creative.category}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
            {creative.headline}
          </p>
        </div>

        <a
          href={creative.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => recordAdClick(creative.id, 'banner', winningNetwork.id)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${creative.ctaClass}`}
        >
          <span>{creative.cta}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
