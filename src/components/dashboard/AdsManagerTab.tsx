import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Play,
  Layers,
  ShieldCheck,
  Gift,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Zap,
  LayoutGrid,
  Radio,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Copy,
  Activity,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { NativeAdCard } from '../ads/NativeAdCard';
import { InlineBannerAd } from '../ads/InlineBannerAd';
import { ModalityFeeTooltip } from '../common/FeeTooltip';
import {
  AdBannerPosition,
  AdCampaignFormat,
  AdFormatType,
  AdMediationStrategy,
  AdNetworkProviderId,
} from '../../types/monetization';

interface AdsManagerTabProps {
  onOpenInAppPurchases?: () => void;
}

const FORMAT_LABELS: Record<AdFormatType, string> = {
  banner: 'Banner (728×90 / 320×50)',
  interstitial: 'Intersticial',
  rewarded_video: 'Vídeo Recompensado',
  native: 'Nativo',
};

function validatePublicSlotId(networkId: AdNetworkProviderId, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/\s/.test(trimmed)) return 'O ID público não deve conter espaços.';
  if (networkId === 'google_admob' && !trimmed.startsWith('ca-app-pub-')) {
    return 'AdMob espera o prefixo ca-app-pub-';
  }
  return null;
}

export const AdsManagerTab: React.FC<AdsManagerTabProps> = ({
  onOpenInAppPurchases,
}) => {
  const {
    adSettings,
    updateAdSettings,
    adStats,
    adNetworks,
    updateAdNetwork,
    toggleAdNetwork,
    getWinningAdNetwork,
    recordAdEvent,
    adCampaigns,
    addAdCampaign,
    toggleAdCampaignActive,
    deleteAdCampaign,
    adsTxtPreview,
    recentAdEvents,
    saveAdConfigToServer,
    isAdsRemoved,
    showAdsInStorefront,
    studioAdPreviewEnabled,
    setStudioAdPreviewEnabled,
    openInterstitialPreview,
    setRewardedOpen,
    selectedCurrency,
    monetizationModels,
    updateMonetizationModels,
    creatorAdRevenueShare,
    platformAdRevenueShare,
  } = useMonetization();

  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [campSponsor, setCampSponsor] = useState('');
  const [campBadge, setCampBadge] = useState('Patrocinado');
  const [campTitle, setCampTitle] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campCategory, setCampCategory] = useState('Ferramentas para Criadores');
  const [campCtaText, setCampCtaText] = useState('Conhecer Oferta');
  const [campCtaUrl, setCampCtaUrl] = useState('https://');
  const [campFormat, setCampFormat] = useState<AdCampaignFormat>('both');
  const [campError, setCampError] = useState<string | null>(null);
  const [campSaving, setCampSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedAdsTxt, setCopiedAdsTxt] = useState(false);
  const [syncingConfig, setSyncingConfig] = useState(false);

  const connectedNetworksCount = useMemo(
    () => adNetworks.filter((n) => n.enabled).length,
    [adNetworks]
  );

  const ctrPct = useMemo(() => {
    if (!adStats.impressions) return '0.0';
    return ((adStats.clicks / adStats.impressions) * 100).toFixed(1);
  }, [adStats.clicks, adStats.impressions]);

  const winningBanner = getWinningAdNetwork('banner');
  const winningInterstitial = getWinningAdNetwork('interstitial');
  const winningRewarded = getWinningAdNetwork('rewarded_video');

  const handleSimulateBannerImpression = () => {
    const winner = winningBanner;
    const activeBanner = adCampaigns.find(
      (c) => c.active !== false && (c.format === 'banner' || c.format === 'both' || !c.format)
    );
    recordAdEvent({
      networkId: winner?.id,
      format: 'banner',
      eventType: 'impression',
      placementId: winner?.unitSlots.bannerPlacementId,
      adId: activeBanner?.id,
      revenue: 0.04,
    });
    setBannerFeedback(
      `Impressão de banner registrada via ${winner?.name || 'Google AdMob'} (${winner?.unitSlots.bannerPlacementId || 'slot padrão'}).`
    );
    setTimeout(() => setBannerFeedback(null), 4000);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampError(null);
    setCampSaving(true);
    const res = await addAdCampaign({
      sponsorName: campSponsor,
      badge: campBadge,
      title: campTitle,
      description: campDesc,
      ctaText: campCtaText,
      ctaUrl: campCtaUrl,
      category: campCategory,
      format: campFormat,
    });
    setCampSaving(false);
    if (!res.success) {
      setCampError(res.error || 'Não foi possível criar a campanha.');
      return;
    }
    setCampSponsor('');
    setCampTitle('');
    setCampDesc('');
    setCampCtaUrl('https://');
    setShowNewCampaignForm(false);
    setBannerFeedback('Nova campanha patrocinada publicada e persistida na vitrine.');
    setTimeout(() => setBannerFeedback(null), 4000);
  };

  const handleCopyAdsTxt = async () => {
    try {
      await navigator.clipboard.writeText(adsTxtPreview);
      setCopiedAdsTxt(true);
      setTimeout(() => setCopiedAdsTxt(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  const handleManualSyncConfig = async () => {
    setSyncingConfig(true);
    const ok = await saveAdConfigToServer();
    setSyncingConfig(false);
    setBannerFeedback(
      ok
        ? 'Configurações de mediação e /ads.txt sincronizadas com o servidor.'
        : 'Não foi possível sincronizar agora; alterações salvas localmente.'
    );
    setTimeout(() => setBannerFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Overview */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Central de Publicidade & Mediação de Anúncios
                </h2>
                <ModalityFeeTooltip
                  modality="ads"
                  triggerLabel="Taxas & Divisão Ads"
                  tone="indigo"
                />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {connectedNetworksCount} plataformas ativas · Google AdMob, Meta Audience Network, Google AdSense & Unity Ads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleSimulateBannerImpression}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
              <span>Testar Banner</span>
            </button>

            <button
              type="button"
              onClick={openInterstitialPreview}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Testar Intersticial</span>
            </button>

            <button
              type="button"
              onClick={() => setRewardedOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer whitespace-nowrap"
            >
              <Gift className="w-4 h-4" />
              <span>Assistir Recompensado (+R$ 5,00)</span>
            </button>
          </div>
        </div>

        {/* Account Pro vs Storefront Visitor Delivery Banner */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25 shrink-0">
              {showAdsInStorefront ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </span>
            <div className="space-y-0.5">
              <div className="font-bold text-white">
                {isAdsRemoved
                  ? 'Conta do Criador: Modo Sem Anúncios (Pro) · Visitantes da Vitrine: Anúncios Ativos'
                  : 'Exibição Pública e no Painel: Anúncios Ativos'}
              </div>
              <p className="text-slate-400">
                {showAdsInStorefront
                  ? 'Visitantes comuns da vitrine visualizam banners, cards nativos, intersticiais e vídeos recompensados configurados abaixo.'
                  : 'A exibição pública de anúncios está pausada no momento.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isAdsRemoved && (
              <button
                type="button"
                onClick={() => setStudioAdPreviewEnabled(!studioAdPreviewEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                  studioAdPreviewEnabled
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-purple-500'
                }`}
              >
                {studioAdPreviewEnabled ? 'Preview no Studio: Ligado' : 'Pré-visualizar no Studio'}
              </button>
            )}
            <button
              type="button"
              onClick={handleManualSyncConfig}
              disabled={syncingConfig}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {syncingConfig ? 'Sincronizando...' : 'Salvar Rede & /ads.txt'}
            </button>
          </div>
        </div>

        {bannerFeedback && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bannerFeedback}</span>
          </div>
        )}

        {/* Primary KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between gap-1">
              <span>Sua Parte ({monetizationModels.adRevenueShareCreatorPct}%)</span>
              <ModalityFeeTooltip modality="ads" sampleAmountBRL={adStats.adRevenue} iconOnly tone="indigo" />
            </span>
            <div className="text-xl font-black text-emerald-400 font-mono tabular-nums mt-1">
              {formatCurrency(creatorAdRevenueShare, selectedCurrency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
              Bruto: {formatCurrency(adStats.adRevenue, selectedCurrency)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              eCPM Médio
            </span>
            <div className="text-xl font-black text-indigo-400 font-mono tabular-nums mt-1">
              {formatCurrency(adStats.ecpm, selectedCurrency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Por 1.000 impressões</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Impressões Totais
            </span>
            <div className="text-xl font-black text-white font-mono tabular-nums mt-1">
              {formatNumber(adStats.impressions)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">4 formatos integrados</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Cliques em Anúncios
            </span>
            <div className="text-xl font-black text-amber-400 font-mono tabular-nums mt-1">
              {formatNumber(adStats.clicks)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
              CTR médio: {ctrPct}%
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Vídeos Completos
            </span>
            <div className="text-xl font-black text-purple-400 font-mono tabular-nums mt-1">
              {formatNumber(adStats.rewardedCompleted)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Recompensados 100% opt-in</div>
          </div>
        </div>

        {/* Performance Breakdown by Ad Format */}
        {adStats.byFormat && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            {(['banner', 'interstitial', 'rewarded_video', 'native'] as AdFormatType[]).map((fmt) => {
              const metrics = adStats.byFormat![fmt];
              return (
                <div
                  key={fmt}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {FORMAT_LABELS[fmt]}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {formatNumber(metrics.impressions)} impr · {formatNumber(metrics.clicks)} cliques
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-emerald-400 font-mono tabular-nums">
                      {formatCurrency(metrics.revenue, selectedCurrency)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                      eCPM {formatCurrency(metrics.ecpm, selectedCurrency)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Advertising Platforms & Mediation Console */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <Radio className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Plataformas de Publicidade Conectadas (Mediação)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure seus IDs públicos de bloco/posicionamento (App ID & Placement ID). Nenhuma chave secreta é solicitada nesta interface.
              </p>
            </div>
          </div>

          {/* Mediation Strategy Switch */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className="text-xs text-slate-400">Estratégia:</span>
            {([
              { id: 'highest_ecpm', label: 'Maior eCPM' },
              { id: 'waterfall', label: 'Cascata (Prioridade)' },
            ] as { id: AdMediationStrategy; label: string }[]).map((strategy) => {
              const active = (adSettings.mediationStrategy || 'highest_ecpm') === strategy.id;
              return (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => updateAdSettings({ mediationStrategy: strategy.id })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {strategy.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Network Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {adNetworks.map((net) => {
            const appIdError = validatePublicSlotId(net.id, net.appOrPublisherId);
            return (
              <div
                key={net.id}
                className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">#{net.priority}</span>
                      <h4 className="text-sm font-bold text-white truncate">{net.name}</h4>
                      <span
                        className={`text-[11px] font-semibold ${
                          net.enabled ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        · {net.enabled ? 'Conectada' : 'Pausada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                      eCPM Floor {formatCurrency(net.ecpmFloor, selectedCurrency)} · Fill {net.fillRatePct}% · Receita {formatCurrency(net.revenue, selectedCurrency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={net.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 whitespace-nowrap"
                      title={`Portal ${net.name}`}
                    >
                      <span>Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => toggleAdNetwork(net.id)}
                      className="cursor-pointer"
                      title={net.enabled ? `Pausar ${net.name}` : `Ativar ${net.name}`}
                    >
                      {net.enabled ? (
                        <ToggleRight className="w-7 h-7 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Public IDs Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      App / Publisher ID Público
                    </label>
                    <input
                      type="text"
                      value={net.appOrPublisherId}
                      onChange={(e) => updateAdNetwork(net.id, { appOrPublisherId: e.target.value })}
                      placeholder={net.placementIdHint}
                      className={`w-full px-3 py-1.5 rounded-lg bg-slate-900 border text-slate-200 font-mono text-[11px] focus:outline-none ${
                        appIdError ? 'border-amber-500' : 'border-slate-800 focus:border-sky-500'
                      }`}
                    />
                    {appIdError && (
                      <p className="text-[11px] text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{appIdError}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Banner Placement ID
                    </label>
                    <input
                      type="text"
                      value={net.unitSlots.bannerPlacementId}
                      onChange={(e) =>
                        updateAdNetwork(net.id, {
                          unitSlots: { ...net.unitSlots, bannerPlacementId: e.target.value },
                        })
                      }
                      placeholder="ID público do bloco Banner"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Interstitial Placement ID
                    </label>
                    <input
                      type="text"
                      value={net.unitSlots.interstitialPlacementId}
                      onChange={(e) =>
                        updateAdNetwork(net.id, {
                          unitSlots: { ...net.unitSlots, interstitialPlacementId: e.target.value },
                        })
                      }
                      placeholder="ID público do bloco Intersticial"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Rewarded Video Placement ID
                    </label>
                    <input
                      type="text"
                      value={net.unitSlots.rewardedPlacementId}
                      onChange={(e) =>
                        updateAdNetwork(net.id, {
                          unitSlots: { ...net.unitSlots, rewardedPlacementId: e.target.value },
                        })
                      }
                      placeholder={
                        net.supportedFormats.includes('rewarded_video')
                          ? 'ID público do vídeo recompensado'
                          : 'Não suportado nesta rede'
                      }
                      disabled={!net.supportedFormats.includes('rewarded_video')}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500 disabled:opacity-45"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue Sharing Split Configuration Card */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-white">
              Divisão de Receita de Anúncios (Revenue Sharing)
            </h3>
            <button
              type="button"
              onClick={() => updateMonetizationModels({ adsEnabled: !monetizationModels.adsEnabled })}
              className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 hover:border-slate-500 cursor-pointer whitespace-nowrap"
            >
              {monetizationModels.adsEnabled ? 'Exibição Ativa' : 'Exibição Pausada'}
            </button>
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            Você recebe <strong className="text-emerald-400">{monetizationModels.adRevenueShareCreatorPct}%</strong> ({formatCurrency(creatorAdRevenueShare, selectedCurrency)}) · Rede ({100 - monetizationModels.adRevenueShareCreatorPct}%): {formatCurrency(platformAdRevenueShare, selectedCurrency)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[70, 80, 85].map((pct) => {
            const selected = monetizationModels.adRevenueShareCreatorPct === pct;
            return (
              <button
                key={pct}
                type="button"
                onClick={() => updateMonetizationModels({ adRevenueShareCreatorPct: pct })}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap font-mono tabular-nums ${
                  selected
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {pct}% Criador / {100 - pct}% Rede
              </button>
            );
          })}
        </div>
      </div>

      {/* Ad Formats Configuration Grid (Banner, Interstitial, Rewarded Video, Native) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Format 1: Banner Ads */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <LayoutGrid className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Banner Ads (728×90 / 320×50)</h3>
                  <p className="text-[11px] text-slate-400">
                    Rede vencedora: <strong className="text-sky-300">{winningBanner?.name || 'Nenhuma ativa'}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateAdSettings({
                    inlineBannerEnabled: adSettings.inlineBannerEnabled === false,
                  })
                }
                className="cursor-pointer"
                title="Ativar/Desativar banner inline"
              >
                {adSettings.inlineBannerEnabled !== false ? (
                  <ToggleRight className="w-7 h-7 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-slate-600" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5">Posicionamento</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {([
                    { id: 'inline', label: 'Inline' },
                    { id: 'bottom', label: 'Rodapé' },
                    { id: 'both', label: 'Ambos' },
                  ] as { id: AdBannerPosition; label: string }[]).map((pos) => {
                    const active = (adSettings.bannerPosition || 'both') === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() =>
                          updateAdSettings({
                            bannerPosition: pos.id,
                            inlineBannerEnabled: pos.id !== 'bottom',
                            bottomBannerEnabled: pos.id !== 'inline',
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5">Auto-Refresh</span>
                <div className="flex items-center gap-1.5">
                  {[15, 30, 60].map((sec) => {
                    const active = (adSettings.bannerRefreshSeconds || 30) === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => updateAdSettings({ bannerRefreshSeconds: sec })}
                        className={`px-2.5 py-1 rounded-lg border font-mono font-semibold cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {sec}s
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <InlineBannerAd previewMode size="leaderboard" />
          </div>

          <button
            type="button"
            onClick={handleSimulateBannerImpression}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
            <span>Simular Impressão de Banner</span>
          </button>
        </div>

        {/* Format 2: Interstitial Ads */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Anúncios Intersticiais</h3>
                  <p className="text-[11px] text-slate-400">
                    Rede vencedora: <strong className="text-blue-300">{winningInterstitial?.name || 'Nenhuma ativa'}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateAdSettings({
                    interstitialEnabled: !adSettings.interstitialEnabled,
                  })
                }
                className="cursor-pointer"
                title="Ativar/Desativar anúncios intersticiais"
              >
                {adSettings.interstitialEnabled ? (
                  <ToggleRight className="w-7 h-7 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-slate-600" />
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Exibidos em transições naturais entre abas e após ações concluídas, com botão pular visível após 5 segundos.
            </p>

            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-300">
              <div className="flex items-center justify-between">
                <span>Intervalo de frequência:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 3, 5].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => updateAdSettings({ frequencyMinutes: min })}
                      className={`px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer ${
                        adSettings.frequencyMinutes === min
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Bloco ativo:</span>
                <span className="font-mono text-[11px] text-slate-200 truncate max-w-[210px]">
                  {winningInterstitial?.unitSlots.interstitialPlacementId || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estado:</span>
                <span className={adSettings.interstitialEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {adSettings.interstitialEnabled ? 'Ativo' : 'Pausado'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openInterstitialPreview}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 text-blue-400" />
            <span>Visualizar Demonstração</span>
          </button>
        </div>

        {/* Format 3: Rewarded Video Ads */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Gift className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Vídeos Recompensados</h3>
                  <p className="text-[11px] text-slate-400">
                    Rede vencedora: <strong className="text-amber-300">{winningRewarded?.name || 'Nenhuma ativa'}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateAdSettings({
                    rewardedEnabled: !adSettings.rewardedEnabled,
                  })
                }
                className="cursor-pointer"
                title="Ativar/Desativar anúncios recompensados"
              >
                {adSettings.rewardedEnabled ? (
                  <ToggleRight className="w-7 h-7 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-slate-600" />
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Formato 100% opt-in: o usuário escolhe assistir a um vídeo de 15 segundos para desbloquear +R$ 5,00 na carteira enquanto gera o maior eCPM da rede.
            </p>

            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span>Recompensa ao usuário:</span>
                <span className="font-bold text-amber-400 font-mono">+R$ 5,00 no Saldo</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bloco ativo:</span>
                <span className="font-mono text-[11px] text-slate-200 truncate max-w-[210px]">
                  {winningRewarded?.unitSlots.rewardedPlacementId || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estado:</span>
                <span className={adSettings.rewardedEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {adSettings.rewardedEnabled ? 'Ativo na Vitrine' : 'Pausado'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRewardedOpen(true)}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Assistir e Resgatar +R$ 5,00</span>
          </button>
        </div>

        {/* Format 4: Native Ads */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Anúncios Nativos</h3>
                  <p className="text-[11px] text-slate-400">
                    Feed da vitrine pública com selo Patrocinado
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateAdSettings({
                    nativeEnabled: !adSettings.nativeEnabled,
                  })
                }
                className="cursor-pointer"
                title="Ativar/Desativar anúncios nativos"
              >
                {adSettings.nativeEnabled ? (
                  <ToggleRight className="w-7 h-7 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-slate-600" />
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Cards integrados naturalmente ao catálogo digital da vitrine, respeitando contraste, leitura e controle do usuário para ocultar.
            </p>

            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span>Transparência:</span>
                <span className="font-mono text-slate-200">Rótulo "Patrocinado"</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Controle:</span>
                <span className="text-emerald-400 font-semibold">Ocultar / Feedback</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estado:</span>
                <span className={adSettings.nativeEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {adSettings.nativeEnabled ? 'Ativo' : 'Pausado'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center">
            Preview ao vivo do card nativo exibido abaixo
          </div>
        </div>
      </div>

      {/* Sponsored Campaigns & Direct Ads CRUD */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Campanhas Patrocinadas & Anúncios Diretos ({adCampaigns.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Crie, pause ou remova anúncios exibidos na rotação da vitrine pública com rastreamento real de impressões e cliques.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowNewCampaignForm((prev) => !prev)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showNewCampaignForm ? 'Fechar Formulário' : 'Nova Campanha Patrocinada'}</span>
          </button>
        </div>

        {showNewCampaignForm && (
          <form
            onSubmit={handleCreateCampaign}
            className="p-5 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Patrocinador / Marca *
                </label>
                <input
                  type="text"
                  required
                  value={campSponsor}
                  onChange={(e) => setCampSponsor(e.target.value)}
                  placeholder="Ex: Hotmart Partner ou Banco BAI"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Selo de Transparência
                </label>
                <input
                  type="text"
                  value={campBadge}
                  onChange={(e) => setCampBadge(e.target.value)}
                  placeholder="Patrocinado"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Formato de Veiculação
                </label>
                <select
                  value={campFormat}
                  onChange={(e) => setCampFormat(e.target.value as AdCampaignFormat)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="both">Banner + Card Nativo</option>
                  <option value="native">Apenas Card Nativo</option>
                  <option value="banner">Apenas Banner</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Título da Chamada *
                </label>
                <input
                  type="text"
                  required
                  value={campTitle}
                  onChange={(e) => setCampTitle(e.target.value)}
                  placeholder="Ex: Conta Global em Dólar e Euro com Taxa Zero no 1º Mês"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Categoria
                </label>
                <input
                  type="text"
                  value={campCategory}
                  onChange={(e) => setCampCategory(e.target.value)}
                  placeholder="Finanças & Negócios"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Descrição Curta
                </label>
                <input
                  type="text"
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                  placeholder="Resumo dos benefícios exibido no card nativo e intersticial."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Texto do Botão (CTA)
                </label>
                <input
                  type="text"
                  value={campCtaText}
                  onChange={(e) => setCampCtaText(e.target.value)}
                  placeholder="Conhecer Oferta"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  URL de Destino *
                </label>
                <input
                  type="url"
                  required
                  value={campCtaUrl}
                  onChange={(e) => setCampCtaUrl(e.target.value)}
                  placeholder="https://parceiro.com/oferta"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {campError && (
              <div className="text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{campError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewCampaignForm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={campSaving}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {campSaving ? 'Publicando...' : 'Publicar Campanha na Vitrine'}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {adCampaigns.map((camp) => {
            const isActive = camp.active !== false;
            const impr = camp.impressions ?? 0;
            const clicks = camp.clicks ?? 0;
            const campCtr = impr > 0 ? ((clicks / impr) * 100).toFixed(1) : '0.0';
            return (
              <div
                key={camp.id}
                className={`p-4 rounded-2xl bg-slate-950/70 border transition flex flex-col justify-between gap-3 ${
                  isActive ? 'border-slate-800' : 'border-slate-800/50 opacity-65'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {camp.format === 'banner'
                          ? 'Banner'
                          : camp.format === 'native'
                          ? 'Nativo'
                          : 'Banner + Nativo'}
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        {camp.sponsorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleAdCampaignActive(camp.id)}
                        className="cursor-pointer"
                        title={isActive ? 'Pausar campanha' : 'Ativar campanha'}
                      >
                        {isActive ? (
                          <ToggleRight className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-600" />
                        )}
                      </button>

                      {confirmDeleteId === camp.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            deleteAdCampaign(camp.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Confirmar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(camp.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                          title="Remover campanha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {camp.title}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{camp.description}</p>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                  <span>
                    {formatNumber(impr)} impr · {formatNumber(clicks)} cliques · CTR {campCtr}%
                  </span>
                  <span className={isActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {isActive ? 'Ativa' : 'Pausada'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Preview of Native Ad */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Preview de Anúncio Nativo na Vitrine</span>
          </h4>
          <span className="text-xs text-slate-400">
            Integrado ao feed com alternância entre campanhas ativas
          </span>
        </div>

        <NativeAdCard
          previewMode
          forceVisible
          onOpenInAppPurchases={onOpenInAppPurchases}
        />
      </div>

      {/* /ads.txt Verification & Live Event Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Arquivo IAB /ads.txt Dinâmico</span>
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAdsTxt}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedAdsTxt ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <a
                href="/ads.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-300 text-[11px] font-semibold flex items-center gap-1"
              >
                <span>Abrir /ads.txt</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
            {adsTxtPreview}
          </pre>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Eventos Recentes de Anúncios</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {recentAdEvents.length} registros
            </span>
          </div>

          {recentAdEvents.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
              Interaja com banners, cards nativos, intersticiais ou vídeos recompensados para visualizar a telemetria persistida no servidor em tempo real.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {recentAdEvents.slice(0, 8).map((ev) => (
                <div
                  key={ev.id}
                  className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[11px] font-mono tabular-nums"
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <span className="text-sky-400 uppercase font-bold">{ev.format}</span>
                    <span className="text-slate-300">{ev.eventType}</span>
                    <span className="text-slate-500 truncate">· {ev.networkId}</span>
                  </div>
                  <span className="text-emerald-400 font-bold shrink-0">
                    +{formatCurrency(ev.revenue, selectedCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ad Removal Box */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {isAdsRemoved ? 'Sua Conta: Modo Sem Anúncios Ativado' : 'Opção de Remoção de Anúncios para Clientes'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdsRemoved
                ? 'Os anúncios estão ocultos na sua navegação privada de criador. Visitantes comuns da vitrine continuam vendo os anúncios ativos e gerando receita.'
                : 'Seus clientes podem adquirir o pacote "Remover Anúncios" na vitrine para navegar sem espaços publicitários.'}
            </p>
          </div>
        </div>

        {onOpenInAppPurchases && !isAdsRemoved && (
          <button
            type="button"
            onClick={onOpenInAppPurchases}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ver Compras no App</span>
          </button>
        )}
      </div>
    </div>
  );
};
