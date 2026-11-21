import React, { useState } from 'react';
import {
  Sparkles,
  Store,
  LayoutDashboard,
  Volume2,
  VolumeX,
  Zap,
  ArrowUpRight,
  Wallet,
  ShieldCheck,
  TrendingUp,
  Smartphone,
  Globe,
  ChevronDown,
  Settings,
  User,
  Crown,
  Compass,
  Radio,
  Sun,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, CURRENCY_SYMBOLS } from '../../utils/formatters';
import { Currency, ThemePreference } from '../../types/monetization';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface HeaderProps {
  currentView: 'studio' | 'storefront' | 'admin';
  setCurrentView: (view: 'studio' | 'storefront' | 'admin') => void;
  onOpenWithdraw: () => void;
  onOpenProfileModal: () => void;
  onOpenAppearanceSettings?: () => void;
  onOpenPlayStore: () => void;
  onOpenUserProfileShowcase?: () => void;
  onOpenRealCheckout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  onOpenWithdraw,
  onOpenProfileModal,
  onOpenAppearanceSettings,
  onOpenPlayStore,
  onOpenUserProfileShowcase,
  onOpenRealCheckout,
}) => {
  const {
    creator,
    currentUser,
    availableBalance,
    totalGrossRevenue,
    gatewayReadiness,
    soundActive,
    toggleSound,
    selectedCurrency,
    setSelectedCurrency,
    appSubscription,
    setIsAppSubscriptionModalOpen,
    startOnboardingTour,
    setIsLiveVoiceOpen,
    themePreference,
    resolvedTheme,
    systemTheme,
    setThemePreference,
  } = useMonetization();

  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const currencyOptions: Currency[] = ['BRL', 'USD', 'AOA', 'EUR'];
  const anyGatewayActive = Boolean(
    gatewayReadiness?.brGateway.configured || gatewayReadiness?.angolaPsp.configured
  );

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Banner Notice with Active Currency Conversion */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-4 py-1.5 text-xs text-white flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
          <span
            className={`h-2 w-2 rounded-full ${
              anyGatewayActive ? 'bg-emerald-300' : 'bg-amber-300'
            }`}
          />
          <span>
            {anyGatewayActive
              ? 'Gateway de Vendas Reais Conectado'
              : 'Motor de Monetização Multi-Moeda'}
          </span>
          <span className="hidden sm:inline text-white/80">•</span>
          <span className="hidden sm:inline text-white/90 font-mono tabular-nums">
            Faturamento: <strong>{formatCurrency(totalGrossRevenue, selectedCurrency)}</strong>
          </span>
          <span className="hidden md:inline text-white/70">
            ({CURRENCY_SYMBOLS[selectedCurrency].flag} {selectedCurrency})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onOpenRealCheckout) {
                onOpenRealCheckout();
              } else {
                setCurrentView('storefront');
              }
            }}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
            title="Iniciar um checkout real processado pelo gateway configurado no servidor"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Nova Venda Real</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-xl">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  Monetiza<span className="text-emerald-400">Hub</span>
                </span>
                <span className="hidden md:inline-block bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Global
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Infoprodutos, VIP & Repasse Visa
              </p>
            </div>
          </div>

          {/* Navigation Mode Switcher: Studio vs Public Store vs Admin */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 flex-shrink-0">
            <button
              onClick={() => setCurrentView('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                currentView === 'studio'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Painel</span>
              <span className="sm:hidden">Studio</span>
            </button>
            <button
              onClick={() => setCurrentView('storefront')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                currentView === 'storefront'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Vitrine</span>
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                currentView === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
              title="Painel Administrativo Global (Usuários, Financeiro, Conteúdo e Regras)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Right Section: Currency Selector, Play Store, Balance, Sound & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Currency Selector (BRL, USD, AOA, EUR) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white transition cursor-pointer"
                title="Mudar moeda de exibição (Real, Dólar, Kwanza, Euro)"
              >
                <span>{CURRENCY_SYMBOLS[selectedCurrency].flag}</span>
                <span className="font-mono">{selectedCurrency}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isCurrencyDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 uppercase font-semibold border-b border-slate-800">
                    Selecione a Moeda
                  </div>
                  {currencyOptions.map((curr) => {
                    const info = CURRENCY_SYMBOLS[curr];
                    return (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => {
                          setSelectedCurrency(curr);
                          setIsCurrencyDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800 transition cursor-pointer ${
                          selectedCurrency === curr
                            ? 'text-emerald-400 font-bold bg-slate-800/50'
                            : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{info.flag}</span>
                          <span>{curr}</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">{info.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gemini Live Voice Assistant Button */}
            <button
              type="button"
              onClick={() => setIsLiveVoiceOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0"
              title="Conversar por voz em tempo real (Gemini Live API)"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Voz Live</span>
            </button>

            {/* Tour Guiado de Boas-Vindas */}
            <button
              onClick={startOnboardingTour}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/35 transition cursor-pointer shadow-sm active:scale-95"
              title="Iniciar Tour Guiado de Boas-Vindas (Configurar Visa e Vitrine)"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">Tour Guiado</span>
            </button>

            {/* MonetizaHub Pro / Ultra Subscription Button */}
            <button
              onClick={() => setIsAppSubscriptionModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm ${
                appSubscription && appSubscription.status === 'active'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
              }`}
              title="Assinatura MonetizaHub Pro & Ultra (Sem Anúncios + Taxa Zero)"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {appSubscription && appSubscription.status === 'active' ? 'Pro Ativo' : 'Assinar Pro'}
              </span>
            </button>

            {/* Direct In-App PWA Install Prompt when supported by browser */}
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={() => install()}
                className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                title="Instalar MonetizaHub como aplicativo no dispositivo"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instalar App</span>
              </button>
            )}

            {/* Google Play Store / PWA Install Button */}
            <button
              type="button"
              onClick={onOpenPlayStore}
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm whitespace-nowrap shrink-0"
              title="Publicar na Google Play Store (.AAB) ou Instalar no Celular"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Google Play</span>
            </button>

            {/* Theme Switcher Quick Menu (Claro / Escuro / Sistema) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsThemeDropdownOpen((prev) => !prev);
                  setIsCurrencyDropdownOpen(false);
                }}
                className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                title={`Tema da interface: ${
                  themePreference === 'system'
                    ? `Sistema (${systemTheme === 'light' ? 'Claro' : 'Escuro'})`
                    : themePreference === 'light'
                    ? 'Claro'
                    : 'Escuro'
                }`}
              >
                {themePreference === 'system' ? (
                  <Monitor className="w-4 h-4 text-indigo-400" />
                ) : resolvedTheme === 'light' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
              </button>

              {isThemeDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 uppercase font-semibold border-b border-slate-800 flex items-center justify-between">
                    <span>Tema da Interface</span>
                    <span className="font-mono text-emerald-400">
                      {resolvedTheme === 'light' ? 'Claro' : 'Escuro'}
                    </span>
                  </div>
                  {(
                    [
                      { id: 'light' as ThemePreference, label: 'Claro', Icon: Sun },
                      { id: 'dark' as ThemePreference, label: 'Escuro', Icon: Moon },
                      {
                        id: 'system' as ThemePreference,
                        label: `Sistema (${systemTheme === 'light' ? 'Claro' : 'Escuro'})`,
                        Icon: Monitor,
                      },
                    ]
                  ).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setThemePreference(id);
                        setIsThemeDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800 transition cursor-pointer ${
                        themePreference === id
                          ? 'text-emerald-400 font-bold bg-slate-800/50'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </span>
                      {themePreference === id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                  {onOpenAppearanceSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsThemeDropdownOpen(false);
                        onOpenAppearanceSettings();
                      }}
                      className="w-full px-3 py-2 text-left border-t border-slate-800 text-[11px] font-semibold text-indigo-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      Abrir em Configurações →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                soundActive
                  ? 'bg-slate-800/80 border-slate-700 text-emerald-400 hover:bg-slate-700'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title={soundActive ? 'Som ativado' : 'Som desativado'}
            >
              {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Available Balance Box */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Saldo Disponível
                </div>
                <div className="text-sm font-bold text-white tracking-tight font-mono tabular-nums">
                  {formatCurrency(availableBalance, selectedCurrency)}
                </div>
              </div>
            </div>

            {/* Withdraw Quick Button */}
            <button
              onClick={onOpenWithdraw}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span className="hidden sm:inline">Sacar</span>
            </button>

            {/* User Profile & Showcase Quick Button */}
            <button
              onClick={onOpenUserProfileShowcase || onOpenProfileModal}
              className="flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 transition cursor-pointer group"
              title="Meu Perfil, Biografia e Vitrine de Vendas"
            >
              <div className="relative">
                <img
                  src={currentUser?.avatarUrl || creator.avatarUrl}
                  alt={currentUser?.name || creator.name}
                  className="w-8 h-8 rounded-full object-cover border border-purple-500/50 group-hover:border-purple-400 transition"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-white group-hover:text-purple-300 transition leading-tight flex items-center gap-1">
                  <span>{currentUser?.name || creator.name}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-normal">
                    {currentUser?.showcaseItems?.length || 0} na vitrine
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {currentUser?.handle || '@amidel'}
                </div>
              </div>
            </button>

            {/* Payout & Notification Settings Button */}
            <button
              onClick={onOpenProfileModal}
              className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Configurações de Repasse Visa e Notificações"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
