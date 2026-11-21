import React, { useEffect, useState } from 'react';
import {
  QrCode,
  FileText,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Save,
  Webhook,
  Server,
  KeyRound,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Zap,
} from 'lucide-react';
import {
  BR_PROVIDER_PRESETS,
  BrGatewayConfig,
  BrGatewayProviderId,
  BrGatewayServerStatus,
  BrMethodEndpointStatus,
  BrPaymentMethodKey,
  buildBrGatewayEnvTemplate,
  fetchBrGatewayState,
  saveBrGatewayConfigApi,
  testAllBrEndpointsApi,
  testBrGatewayConnectionApi,
} from '../../services/brGatewayClient';
import { validateWebhookEndpointUrl } from '../../services/angolaPspClient';

interface BrGatewayConfigPanelProps {
  onSaved?: (config: BrGatewayConfig) => void;
  onOpenLogHistory?: () => void;
  onOpenRequestLogs?: () => void;
  brMethodStatuses?: Record<BrPaymentMethodKey, BrMethodEndpointStatus> | null;
  isTestingAllEndpoints?: boolean;
  onTestAllEndpoints?: (latestConfig: BrGatewayConfig) => void;
  onConfigSync?: (config: BrGatewayConfig) => void;
}

const DEFAULT_LOCAL_BR_CONFIG: BrGatewayConfig = {
  provider: 'mercadopago',
  customProviderName: '',
  customApiBaseUrl: '',
  mode: 'sandbox',
  merchantOrAccountId: '',
  pixEnabled: true,
  pixKey: '',
  pixExpirationMinutes: 30,
  boletoEnabled: true,
  boletoDueDays: 3,
  boletoInstructions: 'Não receber após o vencimento. Pedido digital MonetizaHub.',
  creditCardEnabled: true,
  maxInstallments: 12,
  interestFreeInstallments: 3,
  captureMode: 'automatic',
  webhookEndpoint: '',
  pixWebhookEndpoint: '',
  boletoWebhookEndpoint: '',
  creditCardWebhookEndpoint: '',
};

export const BrGatewayConfigPanel: React.FC<BrGatewayConfigPanelProps> = ({
  onSaved,
  onOpenLogHistory,
  onOpenRequestLogs,
  brMethodStatuses,
  isTestingAllEndpoints,
  onTestAllEndpoints,
  onConfigSync,
}) => {
  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://seu-dominio.com';
  const isDevPreviewHost =
    typeof window !== 'undefined' && window.location.hostname.startsWith('ais-dev-');
  const defaultWebhookUrl = isDevPreviewHost
    ? `${currentOrigin.replace('://ais-dev-', '://ais-pre-')}/api/webhooks/br-gateway`
    : `${currentOrigin}/api/webhooks/br-gateway`;

  const [config, setConfig] = useState<BrGatewayConfig>({
    ...DEFAULT_LOCAL_BR_CONFIG,
    webhookEndpoint: defaultWebhookUrl,
  });
  const [serverStatus, setServerStatus] = useState<BrGatewayServerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean;
    captured: boolean;
    httpStatus: number;
    latencyMs?: number;
    reference?: string;
    warning?: string;
    error?: string;
  } | null>(null);

  const [localMethodStatuses, setLocalMethodStatuses] = useState<Record<
    BrPaymentMethodKey,
    BrMethodEndpointStatus
  > | null>(null);
  const [localTestingAll, setLocalTestingAll] = useState(false);

  const effectiveMethodStatuses =
    brMethodStatuses !== undefined ? brMethodStatuses : localMethodStatuses;
  const effectiveTestingAll = isTestingAllEndpoints ?? localTestingAll;

  const loadState = async () => {
    setIsLoading(true);
    const data = await fetchBrGatewayState();
    if (data) {
      setConfig({
        ...data.config,
        webhookEndpoint: data.config.webhookEndpoint || defaultWebhookUrl,
      });
      setServerStatus(data.serverStatus);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    onConfigSync?.(config);
  }, [config]);

  const preset = BR_PROVIDER_PRESETS[config.provider];
  const envTemplate = buildBrGatewayEnvTemplate(config);
  const webhookUrlValidation = validateWebhookEndpointUrl(config.webhookEndpoint || '');
  const pixWebhookValidation = config.pixWebhookEndpoint?.trim()
    ? validateWebhookEndpointUrl(config.pixWebhookEndpoint)
    : { valid: true };
  const boletoWebhookValidation = config.boletoWebhookEndpoint?.trim()
    ? validateWebhookEndpointUrl(config.boletoWebhookEndpoint)
    : { valid: true };
  const creditCardWebhookValidation = config.creditCardWebhookEndpoint?.trim()
    ? validateWebhookEndpointUrl(config.creditCardWebhookEndpoint)
    : { valid: true };

  const allMethodUrlsValid =
    webhookUrlValidation.valid &&
    pixWebhookValidation.valid &&
    boletoWebhookValidation.valid &&
    creditCardWebhookValidation.valid;

  const customApiUrlValid =
    config.provider !== 'custom_br' ||
    !config.customApiBaseUrl.trim() ||
    validateWebhookEndpointUrl(config.customApiBaseUrl).valid;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveFeedback(null);
    const res = await saveBrGatewayConfigApi(config);
    if (res.ok && res.config) {
      setConfig(res.config);
      setSaveFeedback({
        ok: true,
        text: 'Preferências do Gateway BR (Pix, Boleto, Cartão e provedor) gravadas no servidor.',
      });
      onSaved?.(res.config);
      await loadState();
    } else {
      setSaveFeedback({
        ok: false,
        text: res.error || 'Não foi possível salvar a configuração BR.',
      });
    }
    setIsSaving(false);
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    window.setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(config.webhookEndpoint || defaultWebhookUrl);
    setCopiedWebhook(true);
    window.setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrlValidation.valid) return;
    setIsTestingConnection(true);
    setConnectionResult(null);
    const res = await testBrGatewayConnectionApi({
      endpointUrl: config.webhookEndpoint.trim(),
      provider: config.provider,
    });
    setConnectionResult(res);
    setIsTestingConnection(false);
  };

  const handleTestAllLocalOrParent = async () => {
    if (!allMethodUrlsValid) return;
    if (onTestAllEndpoints) {
      onTestAllEndpoints(config);
      return;
    }
    setLocalTestingAll(true);
    const baseUrl = (config.webhookEndpoint || '').trim() || defaultWebhookUrl;
    setLocalMethodStatuses({
      pix: {
        method: 'pix',
        label: 'Pix',
        enabled: config.pixEnabled,
        endpointUrl: (config.pixWebhookEndpoint || '').trim() || baseUrl,
        state: config.pixEnabled ? 'testing' : 'disabled',
      },
      boleto: {
        method: 'boleto',
        label: 'Boleto',
        enabled: config.boletoEnabled,
        endpointUrl: (config.boletoWebhookEndpoint || '').trim() || baseUrl,
        state: config.boletoEnabled ? 'testing' : 'disabled',
      },
      credit_card: {
        method: 'credit_card',
        label: 'Cartão',
        enabled: config.creditCardEnabled,
        endpointUrl: (config.creditCardWebhookEndpoint || '').trim() || baseUrl,
        state: config.creditCardEnabled ? 'testing' : 'disabled',
      },
    });
    const res = await testAllBrEndpointsApi(config, defaultWebhookUrl);
    setLocalMethodStatuses(res);
    setLocalTestingAll(false);
  };

  const renderMethodFooterStatus = (
    method: BrPaymentMethodKey,
    enabled: boolean,
    activeLabel: string,
    activeColorClass: string
  ) => {
    const live = effectiveMethodStatuses?.[method];
    if (live) {
      if (live.state === 'testing') {
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
            <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
            <span>Verificando endpoint...</span>
          </span>
        );
      }
      if (live.state === 'ok') {
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold font-mono tabular-nums">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              Webhook OK · HTTP {live.httpStatus}
              {live.latencyMs !== undefined ? ` · ${live.latencyMs}ms` : ''}
            </span>
          </span>
        );
      }
      if (live.state === 'error') {
        return (
          <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold font-mono tabular-nums">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Falha · {live.message || `HTTP ${live.httpStatus ?? 0}`}</span>
          </span>
        );
      }
      return <strong className="text-slate-500">Desativado</strong>;
    }

    return (
      <strong className={enabled ? activeColorClass : 'text-slate-500'}>
        {enabled ? activeLabel : 'Desativado'}
      </strong>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-white">Configuração de Gateway BR</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-400 font-semibold">
              Pix · Boleto Bancário · Cartão de Crédito Nacional
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Escolha o provedor brasileiro de sua preferência, habilite os métodos de pagamento nacionais e configure as variáveis de servidor (.env) com segurança.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
              serverStatus?.configured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <Server className="w-3 h-3" />
            <span>
              {serverStatus?.configured ? 'Credenciais .env Ativas' : 'Aguardando Secrets BR'}
            </span>
          </span>
        </div>
      </div>

      {/* 1. Brazilian Gateway Selector + Mode */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white">
            1. Escolha do Gateway Brasileiro & Ambiente
          </h3>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, mode: 'sandbox' }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                config.mode === 'sandbox'
                  ? 'bg-slate-800 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sandbox (Testes)
            </button>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, mode: 'live' }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                config.mode === 'live'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live (Produção)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(Object.keys(BR_PROVIDER_PRESETS) as BrGatewayProviderId[]).map((key) => {
            const item = BR_PROVIDER_PRESETS[key];
            const selected = config.provider === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, provider: key }))}
                className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                  selected
                    ? 'bg-emerald-500/10 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{item.name}</span>
                  {selected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">
                  {item.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom BR Provider Fields or Selected Gateway Summary */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-white">{preset.name}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Autenticação: {preset.authMode}
              </div>
            </div>
            <a
              href={preset.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition whitespace-nowrap shrink-0"
            >
              <span>Portal do Provedor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 block">
                ID Público da Conta / Loja (Merchant / Account ID)
              </label>
              <input
                type="text"
                value={config.merchantOrAccountId}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, merchantOrAccountId: e.target.value }))
                }
                placeholder="Ex: collector_id, acc_..., wallet_id"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {config.provider === 'custom_br' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Nome do Gateway Brasileiro Personalizado
                </label>
                <input
                  type="text"
                  value={config.customProviderName}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, customProviderName: e.target.value }))
                  }
                  placeholder="Ex: PagBank, Iugu, Cielo, Woovi"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Endpoint API do Provedor ({config.mode.toUpperCase()})
                </label>
                <input
                  type="text"
                  readOnly
                  value={config.mode === 'live' ? preset.liveBaseUrl : preset.sandboxBaseUrl}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 font-mono text-xs"
                />
              </div>
            )}

            {config.provider === 'custom_br' && (
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  URL Base da API do Gateway BR Personalizado
                </label>
                <input
                  type="url"
                  value={config.customApiBaseUrl}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, customApiBaseUrl: e.target.value }))
                  }
                  placeholder="https://api.seu-gateway-br.com.br/v1"
                  className={`w-full px-3 py-2 rounded-lg bg-slate-900 border text-white font-mono text-xs focus:outline-none ${
                    customApiUrlValid
                      ? 'border-slate-800 focus:border-emerald-500'
                      : 'border-rose-500/60 focus:border-rose-400'
                  }`}
                />
                {!customApiUrlValid && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Informe uma URL HTTP/HTTPS válida para a API do gateway.</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Payment Methods Configuration (Pix, Boleto, Cartão Nacional) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white">
          2. Métodos de Pagamento Nacionais (Pix · Boleto · Cartão Nacional)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Pix Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Pix Instantâneo</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, pixEnabled: !prev.pixEnabled }))}
                  className="cursor-pointer"
                  title="Ativar ou pausar Pix"
                >
                  {config.pixEnabled ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-600" />
                  )}
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">
                  Chave Pix de Recebimento (D+0)
                </label>
                <input
                  type="text"
                  value={config.pixKey}
                  onChange={(e) => setConfig((prev) => ({ ...prev, pixKey: e.target.value }))}
                  placeholder="CNPJ, E-mail, Celular ou EVP"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">
                  Expiração do QR Code (minutos)
                </label>
                <select
                  value={config.pixExpirationMinutes}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, pixExpirationMinutes: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>60 minutos</option>
                  <option value={1440}>24 horas</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">
                  Webhook Pix (opcional, usa padrão BR se vazio)
                </label>
                <input
                  type="url"
                  value={config.pixWebhookEndpoint || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, pixWebhookEndpoint: e.target.value }))
                  }
                  placeholder="Usar endpoint principal BR"
                  className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border text-white font-mono text-[11px] focus:outline-none ${
                    pixWebhookValidation.valid
                      ? 'border-slate-800 focus:border-emerald-500'
                      : 'border-rose-500/60 focus:border-rose-400'
                  }`}
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <span>Status:</span>
              {renderMethodFooterStatus('pix', config.pixEnabled, 'Ativo no Checkout', 'text-emerald-400')}
            </div>
          </div>

          {/* Boleto Bancário Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white">Boleto Bancário</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, boletoEnabled: !prev.boletoEnabled }))
                  }
                  className="cursor-pointer"
                  title="Ativar ou pausar Boleto"
                >
                  {config.boletoEnabled ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-600" />
                  )}
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">
                  Prazo de Vencimento (dias úteis)
                </label>
                <select
                  value={config.boletoDueDays}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, boletoDueDays: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value={1}>1 dia útil</option>
                  <option value={2}>2 dias úteis</option>
                  <option value={3}>3 dias úteis (padrão)</option>
                  <option value={5}>5 dias úteis</option>
                  <option value={7}>7 dias úteis</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">
                  Instruções do Boleto Registrado
                </label>
                  <input
                  type="text"
                  value={config.boletoInstructions}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, boletoInstructions: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">
                  Webhook Boleto (opcional, usa padrão BR se vazio)
                </label>
                <input
                  type="url"
                  value={config.boletoWebhookEndpoint || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, boletoWebhookEndpoint: e.target.value }))
                  }
                  placeholder="Usar endpoint principal BR"
                  className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border text-white font-mono text-[11px] focus:outline-none ${
                    boletoWebhookValidation.valid
                      ? 'border-slate-800 focus:border-sky-500'
                      : 'border-rose-500/60 focus:border-rose-400'
                  }`}
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <span>Status:</span>
              {renderMethodFooterStatus(
                'boleto',
                config.boletoEnabled,
                'Ativo no Checkout',
                'text-sky-400'
              )}
            </div>
          </div>

          {/* Cartão Nacional Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Cartão de Crédito Nacional</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      creditCardEnabled: !prev.creditCardEnabled,
                    }))
                  }
                  className="cursor-pointer"
                  title="Ativar ou pausar Cartão Nacional"
                >
                  {config.creditCardEnabled ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-600" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block">Parcelas Máx.</label>
                  <select
                    value={config.maxInstallments}
                    onChange={(e) => {
                      const nextMax = Number(e.target.value);
                      setConfig((prev) => ({
                        ...prev,
                        maxInstallments: nextMax,
                        interestFreeInstallments: Math.min(prev.interestFreeInstallments, nextMax),
                      }));
                    }}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {[1, 2, 3, 6, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        até {n}x
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block">Sem Juros</label>
                  <select
                    value={config.interestFreeInstallments}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        interestFreeInstallments: Number(e.target.value),
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {[1, 2, 3, 4, 6].map((n) => (
                      <option key={n} value={n} disabled={n > config.maxInstallments}>
                        {n}x s/ juros
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">Captura da Transação</label>
                <select
                  value={config.captureMode}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      captureMode: e.target.value === 'manual' ? 'manual' : 'automatic',
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="automatic">Captura Automática (recomendado)</option>
                  <option value="manual">Pré-autorização Manual (antifraude)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">
                  Webhook Cartão (opcional, usa padrão BR se vazio)
                </label>
                <input
                  type="url"
                  value={config.creditCardWebhookEndpoint || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, creditCardWebhookEndpoint: e.target.value }))
                  }
                  placeholder="Usar endpoint principal BR"
                  className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border text-white font-mono text-[11px] focus:outline-none ${
                    creditCardWebhookValidation.valid
                      ? 'border-slate-800 focus:border-indigo-500'
                      : 'border-rose-500/60 focus:border-rose-400'
                  }`}
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <span>Status:</span>
              {renderMethodFooterStatus(
                'credit_card',
                config.creditCardEnabled,
                `Ativo (${config.maxInstallments}x)`,
                'text-indigo-400'
              )}
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {saveFeedback ? (
            <div
              className={`text-xs flex items-center gap-1.5 ${
                saveFeedback.ok ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {saveFeedback.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{saveFeedback.text}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              As preferências de pagamento nacional e provedor são salvas no servidor.
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !customApiUrlValid}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Configuração BR'}</span>
          </button>
        </div>
      </div>

      {/* 3. Credentials Guide & Server-Side .env Generator */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>3. Credenciais Privadas no Servidor (.env / Secrets)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tokens e chaves secretas ({preset.name}) devem ser gravados exclusivamente nas variáveis de ambiente do servidor, nunca no navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={loadState}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Verificar Servidor BR</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {preset.credentialVars.map((cred) => (
            <div
              key={cred.varName}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
            >
              <code className="text-[11px] font-mono text-amber-300 block truncate">
                {cred.varName}
              </code>
              <div className="text-xs font-semibold text-white">{cred.label}</div>
              <p className="text-[11px] text-slate-400 leading-snug">{cred.whereToFind}</p>
            </div>
          ))}
        </div>

        {/* .env Copyable Block */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/60">
            <span className="text-xs font-mono text-slate-300">
              .env — {preset.name} ({config.mode.toUpperCase()})
            </span>
            <button
              type="button"
              onClick={handleCopyEnv}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedEnv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEnv ? 'Bloco .env BR Copiado' : 'Copiar Bloco .env BR'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
            {envTemplate}
          </pre>
        </div>

        {/* Server Readiness Diagnostic */}
        <div
          className={`p-3.5 rounded-xl border text-xs ${
            serverStatus?.configured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}
        >
          {serverStatus?.configured ? (
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Gateway BR {serverStatus.provider.toUpperCase()} ({serverStatus.mode.toUpperCase()}) autenticado no servidor!
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Variáveis pendentes no servidor para ativar cobranças reais BR:{' '}
                  <span className="font-mono">
                    {serverStatus?.missingEnvVars.join(', ') || 'BR_GATEWAY_ACCESS_TOKEN'}
                  </span>
                </span>
              </div>
              {serverStatus?.warnings && serverStatus.warnings.length > 0 && (
                <p className="text-rose-300">{serverStatus.warnings.join(' ')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Webhook BR URL + Validated Connection Tester */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="br-gateway-webhook-endpoint"
            className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"
          >
            <Webhook className="w-4 h-4" />
            <span>Endpoint de Webhook BR ({preset.name})</span>
          </label>
          <div className="flex items-center gap-2 shrink-0">
            {config.webhookEndpoint !== defaultWebhookUrl && (
              <button
                type="button"
                onClick={() => {
                  setConfig((prev) => ({ ...prev, webhookEndpoint: defaultWebhookUrl }));
                  setConnectionResult(null);
                }}
                className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2 cursor-pointer whitespace-nowrap"
              >
                Restaurar padrão
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-emerald-300 cursor-pointer whitespace-nowrap"
            >
              {copiedWebhook ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedWebhook ? 'Copiado' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            id="br-gateway-webhook-endpoint"
            type="url"
            value={config.webhookEndpoint}
            aria-invalid={!webhookUrlValidation.valid}
            onChange={(e) => {
              setConfig((prev) => ({ ...prev, webhookEndpoint: e.target.value }));
              if (connectionResult) setConnectionResult(null);
            }}
            placeholder="https://seu-dominio.com.br/api/webhooks/br-gateway"
            className={`flex-1 min-w-0 bg-slate-900 border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${
              webhookUrlValidation.valid
                ? 'border-slate-800 focus:border-emerald-500'
                : 'border-rose-500/60 focus:border-rose-400'
            }`}
          />
          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={isTestingConnection || !webhookUrlValidation.valid}
            title={
              !webhookUrlValidation.valid
                ? webhookUrlValidation.error
                : 'Disparar ping de callback Pix/Boleto/Cartão'
            }
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
            <span>{isTestingConnection ? 'Testando...' : 'Testar Conexão'}</span>
          </button>
          <button
            type="button"
            onClick={handleTestAllLocalOrParent}
            disabled={effectiveTestingAll || !allMethodUrlsValid}
            title={
              !allMethodUrlsValid
                ? 'Corrija as URLs de webhook inválidas antes de testar todos os endpoints.'
                : 'Disparar verificação simultânea para Pix, Boleto e Cartão'
            }
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {effectiveTestingAll ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>
              {effectiveTestingAll ? 'Testando Todos...' : 'Testar Todos os Endpoints'}
            </span>
          </button>
        </div>

        {!webhookUrlValidation.valid && (
          <p className="text-[11px] text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{webhookUrlValidation.error}</span>
          </p>
        )}

        {effectiveMethodStatuses && (
          <div className="pt-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-200">
                Verificação Simultânea de Endpoints (Pix · Boleto · Cartão)
              </span>
              {onOpenRequestLogs && (
                <button
                  type="button"
                  onClick={onOpenRequestLogs}
                  className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap"
                >
                  Ver em Últimos Logs de Requisições
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(['pix', 'boleto', 'credit_card'] as BrPaymentMethodKey[]).map((key) => {
                const st = effectiveMethodStatuses[key];
                if (!st) return null;
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border text-xs space-y-1 ${
                      st.state === 'ok'
                        ? 'bg-emerald-950/30 border-emerald-500/30'
                        : st.state === 'error'
                        ? 'bg-rose-950/30 border-rose-500/30'
                        : st.state === 'testing'
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white">{st.label}</span>
                      {st.state === 'testing' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Testando
                        </span>
                      )}
                      {st.state === 'ok' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-bold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          HTTP {st.httpStatus}
                        </span>
                      )}
                      {st.state === 'error' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-bold text-rose-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Falha
                        </span>
                      )}
                      {st.state === 'disabled' && (
                        <span className="text-[11px] font-semibold text-slate-500">
                          Desativado
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {st.endpointUrl}
                    </div>
                    {st.message && (
                      <div
                        className={`text-[11px] font-mono tabular-nums ${
                          st.state === 'ok'
                            ? 'text-emerald-300'
                            : st.state === 'error'
                            ? 'text-rose-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {connectionResult && (
          <div
            className={`p-3 rounded-lg border text-xs space-y-1 ${
              connectionResult.ok
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                {connectionResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>
                  {connectionResult.ok
                    ? 'Conexão confirmada: evento BR (Pix/Boleto/Cartão) capturado.'
                    : connectionResult.error || 'Falha ao validar endpoint BR.'}
                </span>
              </span>
              <span className="font-mono tabular-nums text-[11px] shrink-0">
                HTTP {connectionResult.httpStatus}
                {connectionResult.latencyMs !== undefined ? ` · ${connectionResult.latencyMs}ms` : ''}
              </span>
            </div>
            {connectionResult.warning && (
              <p className="text-[11px] text-amber-300">{connectionResult.warning}</p>
            )}
            {onOpenLogHistory && (
              <div className="pt-0.5 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onOpenLogHistory}
                  className="text-[11px] text-emerald-300 hover:text-emerald-200 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap"
                >
                  Ver tentativa no Histórico de Logs
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
