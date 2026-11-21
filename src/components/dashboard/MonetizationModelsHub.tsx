import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Megaphone,
  Crown,
  Gift,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  Lock,
  Sparkles,
  Users,
  ArrowUpRight,
  Heart,
  ToggleLeft,
  ToggleRight,
  Award,
  MessageSquare,
  Ticket,
  Package,
  FlaskConical,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { AdPlacementMode, FollowerInAppCategory } from '../../types/monetization';
import { ExperimentsTab } from './ExperimentsTab';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

interface MonetizationModelsHubProps {
  onNavigateTab: (tab: string) => void;
  onSwitchToStorefront: () => void;
}

const REVENUE_SHARE_OPTIONS = [
  {
    pct: 70,
    label: '70% Criador / 30% Plataforma',
    tier: 'Padrão Aberto',
    summary: 'Ativação imediata para qualquer conta verificada, sem exigência de volume mínimo.',
  },
  {
    pct: 80,
    label: '80% Criador / 20% Plataforma',
    tier: 'Parceiro Verificado',
    summary: 'Maior margem líquida por impressão e eCPM otimizado com patrocinadores diretos.',
  },
  {
    pct: 85,
    label: '85% Criador / 15% Plataforma',
    tier: 'Rede Exclusiva',
    summary: 'Divisão máxima de receita para criadores exclusivos com alta recorrência.',
  },
];

const PLACEMENT_MODES: { id: AdPlacementMode; label: string; desc: string }[] = [
  { id: 'minimal', label: 'Discreto', desc: 'Apenas anúncios nativos e recompensados opcionais' },
  { id: 'balanced', label: 'Equilibrado', desc: 'Nativos na vitrine + rodapé + transições moderadas' },
  { id: 'high_yield', label: 'Máximo Alcance', desc: 'Todos os formatos ativos para maximizar eCPM' },
];

const CATEGORY_LABELS: Record<FollowerInAppCategory, { label: string; icon: React.ReactNode }> = {
  qa_priority: { label: 'Pergunta VIP', icon: <MessageSquare className="w-3.5 h-3.5 text-sky-400" /> },
  badge: { label: 'Emblema', icon: <Award className="w-3.5 h-3.5 text-amber-400" /> },
  pass: { label: 'Passe Acesso', icon: <Ticket className="w-3.5 h-3.5 text-indigo-400" /> },
  perk_pack: { label: 'Pack Digital', icon: <Package className="w-3.5 h-3.5 text-emerald-400" /> },
};

export const MonetizationModelsHub: React.FC<MonetizationModelsHubProps> = ({
  onNavigateTab,
  onSwitchToStorefront,
}) => {
  const {
    monetizationModels,
    updateMonetizationModels,
    adSettings,
    updateAdSettings,
    adStats,
    adNetworks,
    creatorAdRevenueShare,
    platformAdRevenueShare,
    tiers,
    addTier,
    posts,
    mrr,
    totalMembersCount,
    tipGoal,
    followerInAppItems,
    addFollowerInAppItem,
    toggleFollowerInAppItem,
    deleteFollowerInAppItem,
    selectedCurrency,
    isAdsRemoved,
    showAdsInStorefront,
    studioAdPreviewEnabled,
    setStudioAdPreviewEnabled,
    priceExperiments,
  } = useMonetization();

  const [hubSubTab, setHubSubTab] = useState<'models' | 'experiments'>('models');

  // Inline quick-add Subscription Tier form
  const [showQuickTierForm, setShowQuickTierForm] = useState(false);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('49.90');
  const [newTierTagline, setNewTierTagline] = useState('');
  const [newTierPerk, setNewTierPerk] = useState('Acesso a todos os posts e relatórios exclusivos');

  // Inline quick-add Follower In-App Item form
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('19.90');
  const [itemCategory, setItemCategory] = useState<FollowerInAppCategory>('qa_priority');

  // Donation preset editor
  const [newPresetAmount, setNewPresetAmount] = useState('');

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const notifySaved = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const activePillarsCount = useMemo(() => {
    let count = 0;
    if (monetizationModels.adsEnabled) count += 1;
    if (monetizationModels.subscriptionsEnabled || monetizationModels.exclusiveContentPaywallEnabled) count += 1;
    if (monetizationModels.donationsEnabled || monetizationModels.followerInAppPurchasesEnabled) count += 1;
    return count;
  }, [monetizationModels]);

  const followerIapRevenue = useMemo(() => {
    return followerInAppItems.reduce((sum, item) => sum + item.price * item.salesCount, 0);
  }, [followerInAppItems]);

  const activeFollowerItemsCount = useMemo(() => {
    return followerInAppItems.filter((i) => i.enabled).length;
  }, [followerInAppItems]);

  const handleSelectPlacementMode = (mode: AdPlacementMode) => {
    updateMonetizationModels({ adPlacementMode: mode });
    if (mode === 'minimal') {
      updateAdSettings({
        nativeEnabled: true,
        rewardedEnabled: true,
        interstitialEnabled: false,
        bottomBannerEnabled: false,
        inlineBannerEnabled: false,
      });
    } else if (mode === 'balanced') {
      updateAdSettings({
        nativeEnabled: true,
        rewardedEnabled: true,
        interstitialEnabled: true,
        bottomBannerEnabled: true,
        inlineBannerEnabled: true,
        bannerPosition: 'both',
        frequencyMinutes: 3,
      });
    } else {
      updateAdSettings({
        nativeEnabled: true,
        rewardedEnabled: true,
        interstitialEnabled: true,
        bottomBannerEnabled: true,
        inlineBannerEnabled: true,
        bannerPosition: 'both',
        frequencyMinutes: 1,
      });
    }
    notifySaved('Modo de exibição de anúncios atualizado.');
  };

  const handleQuickAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierName.trim()) return;
    const monthly = Math.max(5, parseFloat(newTierPrice) || 29.9);
    addTier({
      name: newTierName.trim(),
      tagline: newTierTagline.trim() || 'Acesso exclusivo para assinantes da comunidade',
      monthlyPrice: monthly,
      yearlyPrice: Number((monthly * 10).toFixed(2)),
      color: 'indigo',
      badge: 'VIP',
      perks: [newTierPerk.trim() || 'Conteúdo exclusivo semanal', 'Selo de membro na comunidade'],
    });
    setNewTierName('');
    setNewTierTagline('');
    setShowQuickTierForm(false);
    notifySaved('Novo nível de assinatura criado e publicado na vitrine.');
  };

  const handleAddFollowerItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;
    addFollowerInAppItem({
      title: itemTitle.trim(),
      description: itemDesc.trim() || 'Benefício exclusivo instantâneo para seguidores apoiadores.',
      price: Math.max(1, parseFloat(itemPrice) || 15),
      category: itemCategory,
      badgeLabel: CATEGORY_LABELS[itemCategory].label,
      enabled: true,
    });
    setItemTitle('');
    setItemDesc('');
    setShowNewItemForm(false);
    notifySaved('Item In-App adicionado para seus seguidores na vitrine.');
  };

  const handleAddDonationPreset = () => {
    const val = parseFloat(newPresetAmount);
    if (!val || val <= 0) return;
    if (!monetizationModels.presetDonationAmounts.includes(val)) {
      const next = [...monetizationModels.presetDonationAmounts, val].sort((a, b) => a - b);
      updateMonetizationModels({ presetDonationAmounts: next });
      notifySaved('Valor sugerido de doação adicionado.');
    }
    setNewPresetAmount('');
  };

  const handleRemoveDonationPreset = (val: number) => {
    if (monetizationModels.presetDonationAmounts.length <= 1) return;
    updateMonetizationModels({
      presetDonationAmounts: monetizationModels.presetDonationAmounts.filter((v) => v !== val),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Modelos de Monetização & Fontes de Receita
                </h2>
                <ModalityFeeTooltip
                  modality="all_summary"
                  triggerLabel="Taxas por modalidade"
                  tone="emerald"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Escolha e configure os modelos ativos para o seu perfil: anúncios com divisão de receita, níveis de assinatura para conteúdo exclusivo ou compras in-app e doações para seguidores.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {savedNotice && (
              <span className="text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{savedNotice}</span>
              </span>
            )}
            <button
              type="button"
              onClick={onSwitchToStorefront}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visualizar na Vitrine Pública</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sub-Tab Switcher: Modelos de Receita vs Experiments */}
        <div className="flex items-center gap-2 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => setHubSubTab('models')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              hubSubTab === 'models'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Modelos & Fontes ({activePillarsCount}/3)</span>
          </button>

          <button
            type="button"
            onClick={() => setHubSubTab('experiments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              hubSubTab === 'experiments'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Experiments ({priceExperiments.filter((e) => e.status === 'running').length})</span>
          </button>
        </div>

        {hubSubTab === 'models' && (
          <>
            {/* Tabular KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Modelos Ativos
            </span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
              {activePillarsCount} / 3
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Sincronizados em tempo real com a vitrine
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Sua Parte em Anúncios ({monetizationModels.adRevenueShareCreatorPct}%)
            </span>
            <div className="text-2xl font-bold text-purple-400 font-mono tabular-nums mt-1">
              {formatCurrency(creatorAdRevenueShare, selectedCurrency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
              Bruto: {formatCurrency(adStats.adRevenue, selectedCurrency)} • eCPM {formatCurrency(adStats.ecpm, selectedCurrency)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Assinaturas VIP (MRR)
            </span>
            <div className="text-2xl font-bold text-indigo-400 font-mono tabular-nums mt-1">
              {formatCurrency(mrr, selectedCurrency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
              {formatNumber(totalMembersCount)} assinantes • {tiers.length} níveis
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Doações & In-App Seguidores
            </span>
            <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1">
              {formatCurrency(tipGoal.currentAmount + followerIapRevenue, selectedCurrency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
              {activeFollowerItemsCount} itens ativos na vitrine
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      {hubSubTab === 'experiments' ? (
        <ExperimentsTab onNotify={notifySaved} />
      ) : (
        <>

      {/* 1. MODELO DE ANÚNCIOS COM DIVISÃO DE RECEITA */}
      <section className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  1. Exibição de Anúncios com Divisão de Receita (Revenue Sharing)
                </h3>
                <ModalityFeeTooltip modality="ads" triggerLabel="Como divide a receita" tone="indigo" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Habilite anúncios contextuais na sua vitrine e defina a porcentagem de divisão entre você e a rede anunciante.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('ads')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Abrir Central de Anúncios
            </button>
            <button
              type="button"
              onClick={() => {
                updateMonetizationModels({ adsEnabled: !monetizationModels.adsEnabled });
                notifySaved(
                  !monetizationModels.adsEnabled
                    ? 'Modelo de anúncios ativado.'
                    : 'Modelo de anúncios pausado.'
                );
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              {monetizationModels.adsEnabled ? (
                <>
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">Ativo</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-6 h-6 text-slate-500" />
                  <span className="text-xs font-bold text-slate-400">Desativado</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isAdsRemoved && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="space-y-0.5">
              <div className="font-bold text-amber-100">
                Sua própria conta está usando o modo sem anúncios (Pro / Remoção de Ads).
              </div>
              <p className="text-amber-200/90">
                Visitantes comuns da vitrine continuam vendo os anúncios configurados abaixo quando este modelo estiver ativo ({showAdsInStorefront ? 'Vitrine Pública: Visível para visitantes' : 'Vitrine Pública: Simulação sem anúncios ativa'}).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setStudioAdPreviewEnabled(!studioAdPreviewEnabled)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                  studioAdPreviewEnabled
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-950 border-amber-500/40 text-amber-200 hover:border-amber-400'
                }`}
              >
                {studioAdPreviewEnabled ? 'Preview no Studio: Ligado' : 'Pré-visualizar Anúncios no Studio'}
              </button>

              {onSwitchToStorefront && (
                <button
                  type="button"
                  onClick={onSwitchToStorefront}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
                >
                  Ver Anúncios na Vitrine
                </button>
              )}
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 ${!monetizationModels.adsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Revenue Share Split Selector */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Programa de Divisão de Receita
              </span>
              <span className="text-xs font-mono text-purple-400 font-semibold tabular-nums">
                Atual: {monetizationModels.adRevenueShareCreatorPct}% / {100 - monetizationModels.adRevenueShareCreatorPct}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REVENUE_SHARE_OPTIONS.map((opt) => {
                const isSelected = monetizationModels.adRevenueShareCreatorPct === opt.pct;
                return (
                  <button
                    key={opt.pct}
                    type="button"
                    onClick={() => {
                      updateMonetizationModels({ adRevenueShareCreatorPct: opt.pct });
                      notifySaved(`Divisão atualizada para ${opt.pct}% criador.`);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-purple-500/15 border-purple-500 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-purple-300">{opt.tier}</div>
                      <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                        {opt.pct}% <span className="text-xs font-normal text-slate-400">para você</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{opt.summary}</p>
                  </button>
                );
              })}
            </div>

            {/* Split Bar & Exact Breakdown */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">
                  Repasse Líquido do Criador ({monetizationModels.adRevenueShareCreatorPct}%)
                </span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(creatorAdRevenueShare, selectedCurrency)}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${monetizationModels.adRevenueShareCreatorPct}%` }}
                />
                <div
                  className="bg-slate-600 h-full transition-all duration-300"
                  style={{ width: `${100 - monetizationModels.adRevenueShareCreatorPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                <span>Receita Bruta: {formatCurrency(adStats.adRevenue, selectedCurrency)}</span>
                <span>
                  Rede/Plataforma ({100 - monetizationModels.adRevenueShareCreatorPct}%):{' '}
                  {formatCurrency(platformAdRevenueShare, selectedCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Placement & Formats */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
              Densidade & Formatos Habilitados
            </span>

            <div className="grid grid-cols-3 gap-2">
              {PLACEMENT_MODES.map((mode) => {
                const active = monetizationModels.adPlacementMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectPlacementMode(mode.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{mode.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{mode.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="text-[11px] text-slate-400 pb-1.5 border-b border-slate-800/80 flex items-center justify-between">
                <span>Plataformas de Anúncios Conectadas:</span>
                <span className="font-mono font-bold text-purple-300">
                  {adNetworks.filter((n) => n.enabled).length} / {adNetworks.length} ativas
                </span>
              </div>
              {[
                {
                  key: 'inlineBannerEnabled' as const,
                  label: 'Banner Responsivo na Vitrine (728×90 / 320×50)',
                  checked: adSettings.inlineBannerEnabled ?? true,
                },
                {
                  key: 'nativeEnabled' as const,
                  label: 'Anúncios Nativos na Vitrine',
                  checked: adSettings.nativeEnabled,
                },
                {
                  key: 'rewardedEnabled' as const,
                  label: 'Vídeos Recompensados (Opt-in)',
                  checked: adSettings.rewardedEnabled,
                },
                {
                  key: 'interstitialEnabled' as const,
                  label: 'Intersticiais entre Telas',
                  checked: adSettings.interstitialEnabled,
                },
                {
                  key: 'bottomBannerEnabled' as const,
                  label: 'Banner Discreto de Rodapé',
                  checked: adSettings.bottomBannerEnabled ?? true,
                },
              ].map((fmt) => (
                <label
                  key={fmt.key}
                  className="flex items-center justify-between text-xs text-slate-200 cursor-pointer"
                >
                  <span>{fmt.label}</span>
                  <input
                    type="checkbox"
                    checked={fmt.checked}
                    onChange={(e) => updateAdSettings({ [fmt.key]: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. ASSINATURAS VIP & CONTEÚDO EXCLUSIVO */}
      <section className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  2. Níveis de Assinatura & Conteúdo Exclusivo (Paywall VIP)
                </h3>
                <ModalityFeeTooltip modality="subscription" triggerLabel="Taxas VIP" tone="indigo" />
                <ModalityFeeTooltip modality="paywall_unlock" triggerLabel="Taxas Paywall" tone="rose" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ofereça planos mensais recorrentes com benefícios progressivos e vincule artigos ou arquivos exclusivos aos seus assinantes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('subscriptions')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Gerenciar Planos
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('paywall')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Gerenciar Paywall ({posts.length})
            </button>
            <button
              type="button"
              onClick={() => {
                updateMonetizationModels({
                  subscriptionsEnabled: !monetizationModels.subscriptionsEnabled,
                });
                notifySaved(
                  !monetizationModels.subscriptionsEnabled
                    ? 'Clube de Assinaturas VIP ativado na vitrine.'
                    : 'Clube de Assinaturas VIP pausado.'
                );
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              {monetizationModels.subscriptionsEnabled ? (
                <>
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">Ativo</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-6 h-6 text-slate-500" />
                  <span className="text-xs font-bold text-slate-400">Desativado</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Paywall sub-toggle + Quick Add Tier */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Permitir desbloqueio avulso e acesso liberado por nível de assinatura na aba <strong>Conteúdo Exclusivo</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={monetizationModels.exclusiveContentPaywallEnabled}
                onChange={(e) =>
                  updateMonetizationModels({ exclusiveContentPaywallEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
              <span>Paywall Ativo</span>
            </label>
            <button
              type="button"
              onClick={() => setShowQuickTierForm((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Nível VIP</span>
            </button>
          </div>
        </div>

        {/* Inline Quick Tier Creator */}
        {showQuickTierForm && (
          <form
            onSubmit={handleQuickAddTier}
            className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nome do Nível
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Clube Insider"
                value={newTierName}
                onChange={(e) => setNewTierName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Mensalidade ({selectedCurrency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={newTierPrice}
                onChange={(e) => setNewTierPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Benefício Principal
              </label>
              <input
                type="text"
                value={newTierPerk}
                onChange={(e) => setNewTierPerk(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
              >
                Criar Nível
              </button>
              <button
                type="button"
                onClick={() => setShowQuickTierForm(false)}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Active Tiers Summary Grid */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${
            !monetizationModels.subscriptionsEnabled ? 'opacity-50' : ''
          }`}
        >
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white truncate">{tier.name}</h4>
                  <span className="text-xs font-mono font-bold text-indigo-400 tabular-nums shrink-0">
                    {formatCurrency(tier.monthlyPrice, selectedCurrency)}/mês
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{tier.tagline}</p>
              </div>
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  {tier.activeMembers} membros
                </span>
                <span className="text-emerald-400 font-semibold">
                  {formatCurrency(tier.monthlyPrice * tier.activeMembers, selectedCurrency)} MRR
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. COMPRAS NO APP & DOAÇÕES PARA SEGUIDORES */}
      <section className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  3. Compras no Aplicativo & Doações para Seguidores
                </h3>
                <ModalityFeeTooltip modality="tip" paymentMethodHint="pix" triggerLabel="Taxas Doações" tone="amber" />
                <ModalityFeeTooltip modality="in_app_purchase" triggerLabel="Taxas In-App" tone="emerald" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Habilite gorjetas espontâneas com valores sugeridos e crie itens digitais in-app (emblemas, passes, perguntas VIP) para seus seguidores adquirirem.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                updateMonetizationModels({
                  donationsEnabled: !monetizationModels.donationsEnabled,
                });
                notifySaved(
                  !monetizationModels.donationsEnabled
                    ? 'Doações para seguidores ativadas.'
                    : 'Doações pausadas.'
                );
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              <Heart className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-300">Doações:</span>
              {monetizationModels.donationsEnabled ? (
                <span className="text-xs font-bold text-emerald-400">Ativo</span>
              ) : (
                <span className="text-xs font-bold text-slate-500">Desativado</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                updateMonetizationModels({
                  followerInAppPurchasesEnabled: !monetizationModels.followerInAppPurchasesEnabled,
                });
                notifySaved(
                  !monetizationModels.followerInAppPurchasesEnabled
                    ? 'Compras In-App de seguidores ativadas.'
                    : 'Compras In-App de seguidores pausadas.'
                );
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-slate-300">In-App Seguidores:</span>
              {monetizationModels.followerInAppPurchasesEnabled ? (
                <span className="text-xs font-bold text-emerald-400">Ativo</span>
              ) : (
                <span className="text-xs font-bold text-slate-500">Desativado</span>
              )}
            </button>
          </div>
        </div>

        {/* Preset Donation Values + Goal Summary */}
        <div
          className={`p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
            !monetizationModels.donationsEnabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Botões de Doação Rápida na Vitrine</span>
              <span className="text-[11px] font-mono text-amber-400 font-normal">
                Meta atual: {formatCurrency(tipGoal.currentAmount, selectedCurrency)} /{' '}
                {formatCurrency(tipGoal.targetAmount, selectedCurrency)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {monetizationModels.presetDonationAmounts.map((amt) => (
                <span
                  key={amt}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-amber-300"
                >
                  <span>{formatCurrency(amt, selectedCurrency)}</span>
                  {monetizationModels.presetDonationAmounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDonationPreset(amt)}
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Remover valor sugerido"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Novo valor"
              value={newPresetAmount}
              onChange={(e) => setNewPresetAmount(e.target.value)}
              className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddDonationPreset}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              + Sugestão
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('tipping')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Editar Meta
            </button>
          </div>
        </div>

        {/* Follower In-App Purchases Catalog */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Itens de Compra no Aplicativo para Seguidores ({followerInAppItems.length})
              </h4>
              <p className="text-[11px] text-slate-400">
                Benefícios e micro-compras digitais exibidos diretamente para seus fãs apoiarem e interagirem.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewItemForm((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Item In-App</span>
            </button>
          </div>

          {showNewItemForm && (
            <form
              onSubmit={handleAddFollowerItem}
              className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Título do Item
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Análise de Perfil em Vídeo"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value as FollowerInAppCategory)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="qa_priority">Pergunta VIP / Prioridade</option>
                  <option value="badge">Emblema de Apoiador</option>
                  <option value="pass">Passe de Bastidores</option>
                  <option value="perk_pack">Pack Digital / Stickers</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Preço ({selectedCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
                >
                  Salvar Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewItemForm(false)}
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
              <div className="sm:col-span-12">
                <input
                  type="text"
                  placeholder="Descrição curta do benefício entregue ao seguidor..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </form>
          )}

          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-3.5 ${
              !monetizationModels.followerInAppPurchasesEnabled ? 'opacity-50' : ''
            }`}
          >
            {followerInAppItems.map((item) => {
              const catInfo = CATEGORY_LABELS[item.category];
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {catInfo.icon}
                      <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {catInfo.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] font-mono tabular-nums">
                      <span className="text-emerald-400 font-bold">
                        {formatCurrency(item.price, selectedCurrency)}
                      </span>
                      <span className="text-slate-500">{item.salesCount} vendas</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleFollowerInAppItem(item.id)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer"
                      title={item.enabled ? 'Pausar na vitrine' : 'Ativar na vitrine'}
                    >
                      {item.enabled ? (
                        <ToggleRight className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFollowerInAppItem(item.id)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
        </>
      )}
    </div>
  );
};
