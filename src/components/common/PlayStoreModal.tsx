import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  ShieldCheck,
  AlertCircle,
  Package,
  RefreshCw,
  FileDown,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PlayStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlayStoreTwaConfig {
  packageName: string;
  appName: string;
  launcherName: string;
  versionName: string;
  versionCode: number;
  sha256Fingerprints: string[];
  updatedAt: string;
}

interface PlayStoreStatusResponse {
  ok: boolean;
  origin: string;
  host: string;
  checks: {
    manifestFile: boolean;
    manifestJsonFile?: boolean;
    icon192Png: boolean;
    icon512Png: boolean;
    iconMaskablePng: boolean;
    appleTouchIconPng: boolean;
    assetLinksFile: boolean;
  };
  twaConfig: PlayStoreTwaConfig;
  readyForTwa: boolean;
}

interface LiveProbeResult {
  manifestWeb: { ok: boolean; status: number; detail: string };
  manifestJson: { ok: boolean; status: number; detail: string };
  assetLinks: { ok: boolean; status: number; detail: string };
  serviceWorker: { ok: boolean; detail: string };
  checkedAt: string;
}

export const PlayStoreModal: React.FC<PlayStoreModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, swRegistered, install } = usePWAInstall();

  const [activeSection, setActiveSection] = useState<'install' | 'playconsole'>('playconsole');
  const [copiedKey, setCopiedKey] = useState<'cmd' | 'sha' | null>(null);
  const [manualGuideExpanded, setManualGuideExpanded] = useState(false);

  const [statusData, setStatusData] = useState<PlayStoreStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Editable TWA config form
  const [packageName, setPackageName] = useState('com.monetizahub.creator');
  const [appName, setAppName] = useState('MonetizaHub - Plataforma do Criador');
  const [launcherName, setLauncherName] = useState('MonetizaHub');
  const [versionName, setVersionName] = useState('1.0.0');
  const [versionCode, setVersionCode] = useState('1');
  const [sha256Input, setSha256Input] = useState('');

  const [savingConfig, setSavingConfig] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [probingLive, setProbingLive] = useState(false);
  const [liveProbe, setLiveProbe] = useState<LiveProbeResult | null>(null);

  const liveOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://monetizahub.com.br';

  const runLiveEndpointProbe = async () => {
    setProbingLive(true);
    try {
      const checkJsonEndpoint = async (url: string) => {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          const text = await res.text();
          let validJson = false;
          try {
            JSON.parse(text);
            validJson = true;
          } catch {
            validJson = false;
          }
          return {
            ok: res.ok && validJson,
            status: res.status,
            detail: res.ok && validJson ? `HTTP ${res.status} · JSON válido` : `HTTP ${res.status}`,
          };
        } catch {
          return { ok: false, status: 0, detail: 'Falha na requisição' };
        }
      };

      const [manifestWeb, manifestJson, assetLinks] = await Promise.all([
        checkJsonEndpoint('/manifest.webmanifest'),
        checkJsonEndpoint('/manifest.json'),
        checkJsonEndpoint('/.well-known/assetlinks.json'),
      ]);

      let swOk = swRegistered;
      let swDetail = swRegistered ? 'Service Worker ativo' : 'Aguardando registro / build';
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          swOk = Boolean(reg);
          swDetail = reg?.active
            ? 'Service Worker ativo (pronto offline)'
            : reg
            ? 'Service Worker registrado'
            : 'Disponível no build (npm run build)';
        } catch {
          // keep fallback
        }
      }

      setLiveProbe({
        manifestWeb,
        manifestJson,
        assetLinks,
        serviceWorker: { ok: swOk, detail: swDetail },
        checkedAt: new Date().toLocaleTimeString('pt-BR'),
      });
    } finally {
      setProbingLive(false);
    }
  };

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/playstore/status');
      const data = (await res.json()) as PlayStoreStatusResponse;
      if (data.ok) {
        setStatusData(data);
        setPackageName(data.twaConfig.packageName);
        setAppName(data.twaConfig.appName);
        setLauncherName(data.twaConfig.launcherName);
        setVersionName(data.twaConfig.versionName);
        setVersionCode(String(data.twaConfig.versionCode));
        setSha256Input(data.twaConfig.sha256Fingerprints.join('\n'));
      }
    } catch {
      // Keep defaults if offline
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      runLiveEndpointProbe();
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setFeedback({
          type: 'success',
          text: 'Aplicativo instalado com sucesso na tela inicial do dispositivo.',
        });
      }
    } else {
      setManualGuideExpanded(true);
    }
  };

  const bubblewrapCommand = `npx @bubblewrap/cli init --manifest=${liveOrigin}/manifest.webmanifest\nnpx @bubblewrap/cli build`;

  const handleCopy = (text: string, target: 'cmd' | 'sha') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(target);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/playstore/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: packageName.trim(),
          appName: appName.trim(),
          launcherName: launcherName.trim().slice(0, 12),
          versionName: versionName.trim(),
          versionCode: Number(versionCode) || 1,
          sha256Text: sha256Input,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; twaConfig?: PlayStoreTwaConfig };
      if (!res.ok || !json.ok) {
        setFeedback({
          type: 'error',
          text: json.error || 'Não foi possível salvar os dados do pacote Android.',
        });
        return;
      }
      setFeedback({
        type: 'success',
        text: 'Identidade TWA e /.well-known/assetlinks.json atualizados no servidor.',
      });
      await loadStatus();
    } catch {
      setFeedback({
        type: 'error',
        text: 'Erro de conexão ao salvar configuração da Google Play.',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDownloadJsonFile = async (endpoint: string, filename: string) => {
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setFeedback({
        type: 'error',
        text: `Falha ao baixar ${filename}.`,
      });
    }
  };

  const checks = statusData?.checks;
  const allChecksReady = Boolean(statusData?.readyForTwa);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative text-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Google Play Store & Aplicativo Android (TWA / PWA)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Instalação direta no celular e geração de pacote oficial .AAB para a Google Play Console.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar janela Google Play Store"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="px-6 pt-4 flex items-center gap-2 border-b border-slate-800 pb-3 bg-slate-950/60">
          <button
            type="button"
            onClick={() => setActiveSection('playconsole')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'playconsole'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Publicar na Google Play (.AAB)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('install')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'install'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar Agora (Android / iOS)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {activeSection === 'install' ? (
            <div className="space-y-4">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    Instalação Instantânea no Dispositivo (WebAPK / PWA)
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    {swRegistered ? 'Service Worker Ativo' : 'PWA Pronto'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O MonetizaHub possui Service Worker offline, manifesto completo e ícones PNG nativos (192px, 512px e Maskable), abrindo em tela cheia sem barra de navegador.
                </p>

                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalled}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    isInstalled
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isInstalled
                      ? 'Aplicativo Já Instalado em Modo Nativo'
                      : isInstallable
                      ? 'Instalar Aplicativo Agora'
                      : isIOS
                      ? 'Ver Instruções para iPhone / iPad'
                      : 'Instalar via Navegador Android / Chrome'}
                  </span>
                </button>
              </div>

              {(manualGuideExpanded || (!isInstallable && !isInstalled)) && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <div className="font-semibold text-white">
                    {isIOS
                      ? 'Como instalar no iPhone / iPad (Safari):'
                      : 'Como instalar manualmente no Android (Chrome):'}
                  </div>
                  {isIOS ? (
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                      <li>Toque no ícone de Compartilhar na barra inferior do Safari.</li>
                      <li>Role as opções e toque em <strong>Adicionar à Tela de Início</strong>.</li>
                      <li>Confirme em <strong>Adicionar</strong> no canto superior direito.</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                      <li>Abra este endereço diretamente no Google Chrome do Android (fora de visualizações incorporadas).</li>
                      <li>Toque no menu <strong>⋮</strong> no canto superior direito do Chrome.</li>
                      <li>Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                    </ol>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Live Technical Verification Checklist */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Diagnóstico Técnico para Google Play (TWA)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        allChecksReady ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {allChecksReady ? 'Requisitos Prontos' : 'Verificando...'}
                    </span>
                    <button
                      type="button"
                      onClick={loadStatus}
                      disabled={loadingStatus}
                      className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      title="Revalidar arquivos no servidor"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Manifesto (.webmanifest / .json)</span>
                    <span className="font-mono text-emerald-400">
                      {checks?.manifestFile && checks?.manifestJsonFile
                        ? 'Ambos Ativos'
                        : checks?.manifestFile || checks?.manifestJsonFile
                        ? 'Ativo'
                        : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Ícones PNG (192 / 512 / Maskable)</span>
                    <span className="font-mono text-emerald-400">
                      {checks?.icon192Png && checks?.icon512Png && checks?.iconMaskablePng
                        ? 'PNG OK'
                        : 'Verificar'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Digital Asset Links</span>
                    <span className="font-mono text-emerald-400">
                      {checks?.assetLinksFile ? '/.well-known OK' : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Service Worker Offline</span>
                    <span className="font-mono text-emerald-400">
                      {swRegistered ? 'Registrado' : 'Pronto no build'}
                    </span>
                  </div>
                </div>

                {/* Live Browser Verification of PWA & AssetLinks URLs */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Teste ao Vivo das Rotas Públicas (Pré-requisito PWABuilder)
                    </span>
                    <button
                      type="button"
                      onClick={runLiveEndpointProbe}
                      disabled={probingLive}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${probingLive ? 'animate-spin' : ''}`} />
                      <span>{probingLive ? 'Testando...' : 'Testar URLs'}</span>
                    </button>
                  </div>
                  {liveProbe && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-1.5">
                        <span className="font-mono text-slate-400 truncate">/manifest.json</span>
                        <span className={liveProbe.manifestJson.ok ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                          {liveProbe.manifestJson.detail}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-1.5">
                        <span className="font-mono text-slate-400 truncate">/manifest.webmanifest</span>
                        <span className={liveProbe.manifestWeb.ok ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                          {liveProbe.manifestWeb.detail}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-1.5">
                        <span className="font-mono text-slate-400 truncate">assetlinks.json</span>
                        <span className={liveProbe.assetLinks.ok ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                          {liveProbe.assetLinks.detail}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Package & Digital Asset Links Form */}
              <form
                onSubmit={handleSaveConfig}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span>Identidade Android & Assinatura Google Play Console</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Package Name (Application ID)
                    </label>
                    <input
                      type="text"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="com.monetizahub.creator"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Nome Curto do Ícone (máx. 12 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={launcherName}
                      onChange={(e) => setLauncherName(e.target.value)}
                      placeholder="MonetizaHub"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Nome Completo na Play Store
                    </label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Version Name
                      </label>
                      <input
                        type="text"
                        value={versionName}
                        onChange={(e) => setVersionName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Version Code
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={versionCode}
                        onChange={(e) => setVersionCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      SHA-256 Fingerprint (Google Play App Signing)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopy(sha256Input, 'sha')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'sha' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'sha' ? 'Copiado' : 'Copiar SHA-256'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={sha256Input}
                    onChange={(e) => setSha256Input(e.target.value)}
                    placeholder="14:6D:E9:7D:..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ao salvar, o servidor atualiza <span className="font-mono text-slate-300">/.well-known/assetlinks.json</span> para remover a barra do navegador dentro do app na Play Store.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadJsonFile(
                          `/api/playstore/twa-manifest?origin=${encodeURIComponent(liveOrigin)}`,
                          'twa-manifest.json'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Baixar twa-manifest.json</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadJsonFile('/.well-known/assetlinks.json', 'assetlinks.json')
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-blue-400" />
                      <span>Baixar assetlinks.json</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-60"
                  >
                    {savingConfig ? 'Salvando...' : 'Salvar Asset Links'}
                  </button>
                </div>
              </form>

              {/* PWABuilder (Sem Terminal) & Deploy HTTPS Checklist */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/25 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    Gerar .AAB Online via PWABuilder (Netlify / Vercel / Cloudflare)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Deploy Config Pronta
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                  <li>
                    <strong>Netlify Drop:</strong> Execute <span className="font-mono text-emerald-300">npm run build</span> e arraste a pasta <span className="font-mono text-slate-200">dist/</span> em netlify.com — os arquivos <span className="font-mono text-slate-200">_headers</span> e <span className="font-mono text-slate-200">_redirects</span> já estão incluídos.
                  </li>
                  <li>
                    <strong>Vercel / Cloudflare / Netlify (GitHub):</strong> <span className="font-mono text-slate-200">vercel.json</span> e <span className="font-mono text-slate-200">netlify.toml</span> já configuram o build automático, <span className="font-mono text-slate-200">/manifest.json</span>, <span className="font-mono text-slate-200">/sw.js</span> e <span className="font-mono text-slate-200">/.well-known/assetlinks.json</span>.
                  </li>
                  <li>
                    <strong>PWABuilder:</strong> Cole sua URL HTTPS publicada em <span className="font-mono text-emerald-300">pwabuilder.com</span>, clique em <strong>Package for stores &rarr; Android</strong> e baixe o pacote <span className="font-mono text-slate-200">.aab</span> pronto para a Google Play Console.
                  </li>
                </ol>
              </div>

              {/* Bubblewrap CLI Build & Play Console Submission Steps */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Alternativa via Terminal (Bubblewrap CLI)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(bubblewrapCommand, 'cmd')}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-mono cursor-pointer"
                  >
                    {copiedKey === 'cmd' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'cmd' ? 'Copiado!' : 'Copiar Comandos'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {bubblewrapCommand}
                </pre>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                  <li>
                    Execute os comandos acima (ou use o <span className="text-slate-200 font-mono">twa-manifest.json</span> baixado) para gerar <span className="text-slate-200 font-mono">app-release-bundle.aab</span>.
                  </li>
                  <li>
                    No Google Play Console, crie o app, envie o <span className="text-slate-200 font-mono">.aab</span> na faixa de produção/testes e copie o SHA-256 de Assinatura de App para o campo acima.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Compatível com Google Play Console (TWA) e instalação WebAPK.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
