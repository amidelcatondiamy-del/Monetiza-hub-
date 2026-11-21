import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Globe,
  TrendingUp,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';

interface InterstitialAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInAppPurchases?: () => void;
  previewMode?: boolean;
}

const sponsorBanners = [
  {
    id: 'ad-nubank-pj',
    sponsor: 'Nubank Empresas',
    tagline: 'A conta PJ sem burocracia para criadores de conteúdo',
    description:
      'Emita cobranças instantâneas, receba pagamentos dos seus infoprodutos e gerencie seu fluxo financeiro com liquidez diária.',
    cta: 'Conhecer Conta PJ',
    url: 'https://nubank.com.br/pj',
    badge: 'Patrocinado',
    accentBg: 'from-purple-900/90 via-indigo-950 to-slate-950',
    buttonColor: 'bg-purple-600 hover:bg-purple-500',
  },
  {
    id: 'ad-google-cloud',
    sponsor: 'Google Cloud for Startups',
    tagline: 'Infraestrutura global para escalar sua audiência e vídeos',
    description:
      'Armazenamento rápido para suas aulas, streaming seguro e créditos iniciais para criadores e infoprodutores.',
    cta: 'Resgatar Créditos',
    url: 'https://cloud.google.com/innovators',
    badge: 'Anúncio Parceiro',
    accentBg: 'from-blue-900/90 via-slate-900 to-slate-950',
    buttonColor: 'bg-blue-600 hover:bg-blue-500',
  },
  {
    id: 'ad-stripe-atlas',
    sponsor: 'Stripe Atlas',
    tagline: 'Expanda seu negócio digital e receba em múltiplas moedas',
    description:
      'Estruture operações internacionais com proteção antifraude nativa e relatórios de conformidade fiscal.',
    cta: 'Começar com Stripe',
    url: 'https://stripe.com/atlas',
    badge: 'Destaque Global',
    accentBg: 'from-emerald-900/90 via-slate-900 to-slate-950',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-500',
  },
];

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  isOpen,
  onClose,
  onOpenInAppPurchases,
  previewMode = false,
}) => {
  const {
    isAdsRemoved,
    studioAdPreviewEnabled,
    adCampaigns,
    recordAdClick,
    getWinningAdNetwork,
  } = useMonetization();
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [randomSponsor, setRandomSponsor] = useState(sponsorBanners[0]);

  const winningNetwork = getWinningAdNetwork('interstitial');

  useEffect(() => {
    if (isOpen) {
      const activeCampaigns = adCampaigns.filter((c) => c.active !== false);
      const dynamicPool =
        activeCampaigns.length > 0
          ? activeCampaigns.map((c, idx) => ({
              id: c.id,
              sponsor: c.sponsorName,
              tagline: c.title,
              description: c.description,
              cta: c.ctaText,
              url: c.ctaUrl,
              badge: c.badge || 'Patrocinado',
              accentBg: sponsorBanners[idx % sponsorBanners.length].accentBg,
              buttonColor: sponsorBanners[idx % sponsorBanners.length].buttonColor,
            }))
          : sponsorBanners;
      const randomIdx = Math.floor(Math.random() * dynamicPool.length);
      setRandomSponsor(dynamicPool[randomIdx]);
      setSecondsRemaining(5);
      setCanSkip(false);

      const interval = setInterval(() => {
        setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, adCampaigns]);

  useEffect(() => {
    if (isOpen && secondsRemaining === 0) {
      setCanSkip(true);
    }
  }, [isOpen, secondsRemaining]);

  if (!isOpen || (!previewMode && !studioAdPreviewEnabled && isAdsRemoved)) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Bar */}
        <div className="bg-slate-950/95 px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-200">
              {randomSponsor.badge}
            </span>
            <span className="truncate">
              Anúncio Intersticial · {winningNetwork?.shortLabel || 'AdMob'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canSkip ? (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <span>Fechar</span>
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 text-slate-300 text-xs font-mono tabular-nums border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pular em {secondsRemaining}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Clean Vector/Gradient Creative Canvas (No External Unverified Image Dependencies) */}
        <div className={`relative h-48 sm:h-52 overflow-hidden bg-gradient-to-br ${randomSponsor.accentBg} p-6 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-xs text-white/80">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-white">{randomSponsor.sponsor}</div>
                <div className="text-[11px] text-slate-300">Parceiro Verificado</div>
              </div>
            </div>
            <Globe className="w-5 h-5 text-white/40" />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {randomSponsor.tagline}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {randomSponsor.description}
          </p>

          <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
            <a
              href={randomSponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordAdClick(randomSponsor.id, 'interstitial', winningNetwork?.id)}
              className={`w-full sm:flex-1 py-3 px-5 rounded-2xl ${randomSponsor.buttonColor} text-white font-bold text-sm transition flex items-center justify-center gap-2`}
            >
              <span>{randomSponsor.cta}</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {canSkip && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                Continuar no App
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                {winningNetwork ? `${winningNetwork.name} (${winningNetwork.unitSlots.interstitialPlacementId})` : 'Google AdMob Network'}
              </span>
            </div>

            {onOpenInAppPurchases && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInAppPurchases();
                }}
                className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-2 transition cursor-pointer shrink-0 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Remover Anúncios</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
