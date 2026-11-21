import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Building2,
  KeyRound,
  FileCode2,
  Activity,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Landmark,
  FileCheck2,
  Webhook,
  XCircle,
  Globe,
  History,
  ListChecks,
  Zap,
  PlugZap,
  BellRing,
} from 'lucide-react';
import {
  AngolaPspStatus,
  PspConnectionValidationResult,
  fetchAngolaPspStatus,
  testWebhookConnectionApi,
  validateAngolaPspConnectionApi,
  validateWebhookEndpointUrl,
} from '../../services/angolaPspClient';
import {
  BrGatewayConfig,
  BrMethodEndpointStatus,
  BrPaymentMethodKey,
  fetchBrGatewayState,
  testAllBrEndpointsApi,
} from '../../services/brGatewayClient';
import { WebhookMonitorModule } from './WebhookMonitorModule';
import { BrGatewayConfigPanel } from './BrGatewayConfigPanel';
import { LogHistoryModule } from './LogHistoryModule';
import { RequestLogsTable } from './RequestLogsTable';
import { WebhookSubscriptionManager } from './WebhookSubscriptionManager';

type WizardProvider = 'appypay' | 'proxypay' | 'emis_gpo';

interface ProviderGuide {
  id: WizardProvider;
  name: string;
  subtitle: string;
  portalUrl: string;
  docsUrl: string;
  contactLabel: string;
  authMode: string;
  onboardingSteps: string[];
  credentialLocations: {
    varName: string;
    label: string;
    whereToFind: string;
  }[];
  buildEnvBlock: (mode: 'sandbox' | 'live') => string;
}

const PROVIDER_GUIDES: Record<WizardProvider, ProviderGuide> = {
  appypay: {
    id: 'appypay',
    name: 'AppyPay Angola',
    subtitle: 'API REST + OAuth2 (Multicaixa Express GPO & Pagamentos)',
    portalUrl: 'https://www.appy.co.ao',
    docsUrl: 'https://www.appy.co.ao',
    contactLabel: 'comercial@appy.co.ao',
    authMode: 'OAuth2 Client Credentials (Client ID + Client Secret)',
    onboardingSteps: [
      'Aceda ao portal oficial appy.co.ao ou envie solicitação comercial para comercial@appy.co.ao pedindo integração API para Multicaixa Express (GPO).',
      'Submeta os documentos KYC da empresa/comerciante em Angola: NIF, Registo Comercial/Alvará, BI dos representantes e IBAN da conta comercial em Kwanzas (AOA).',
      'Aguarde a vinculação do canal GPO junto ao banco patrocinador e receba acesso ao ambiente Sandbox e Produção.',
    ],
    credentialLocations: [
      {
        varName: 'ANGOLA_PSP_MERCHANT_ID',
        label: 'Merchant ID / Entity ID',
        whereToFind:
          'No painel de comerciante AppyPay (Definições da Loja / Conta) ou no e-mail de aprovação técnica enviado após o KYC.',
      },
      {
        varName: 'ANGOLA_PSP_CLIENT_ID',
        label: 'Client ID (OAuth2)',
        whereToFind:
          'Secção "Credenciais de API / Aplicações" do portal de programadores AppyPay (identificador público da aplicação).',
      },
      {
        varName: 'ANGOLA_PSP_CLIENT_SECRET',
        label: 'Client Secret (OAuth2)',
        whereToFind:
          'Gerado uma única vez ao criar as credenciais OAuth2 na área de API da AppyPay. Guarde apenas nas variáveis de servidor.',
      },
      {
        varName: 'ANGOLA_PSP_OAUTH_TOKEN_URL',
        label: 'URL de Token OAuth2',
        whereToFind:
          'Endpoint de autenticação fornecido na documentação técnica da AppyPay para gerar o Bearer token via client_credentials.',
      },
      {
        varName: 'ANGOLA_PSP_WEBHOOK_SECRET',
        label: 'Webhook Secret (HMAC-SHA256)',
        whereToFind:
          'Secção "Webhooks / Callbacks" após registar o URL de retorno do seu servidor.',
      },
    ],
    buildEnvBlock: (mode) => `# AppyPay Angola (${mode.toUpperCase()})
ANGOLA_PSP_PROVIDER="appypay"
ANGOLA_PSP_MODE="${mode}"
ANGOLA_PSP_API_BASE_URL="${
      mode === 'live'
        ? 'https://gwy-api.appypay.co.ao/v2.0'
        : 'https://gwy-api-tst.appypay.co.ao/v2.0'
    }"
ANGOLA_PSP_OAUTH_TOKEN_URL="https://login.microsoftonline.com/SEU_TENANT/oauth2/v2.0/token"
ANGOLA_PSP_CLIENT_ID="seu_client_id_appypay"
ANGOLA_PSP_CLIENT_SECRET="seu_client_secret_appypay"
ANGOLA_PSP_MERCHANT_ID="seu_merchant_id_appypay"
ANGOLA_PSP_WEBHOOK_SECRET="seu_webhook_secret_hmac"`,
  },
  proxypay: {
    id: 'proxypay',
    name: 'ProxyPay Angola',
    subtitle: 'API OPG (Multicaixa Express Telemóvel) & RPS (Referências)',
    portalUrl: 'https://proxypay.co.ao',
    docsUrl: 'https://developer.proxypay.co.ao',
    contactLabel: 'Portal ProxyPay (proxypay.co.ao)',
    authMode: 'Token de API (API Key + Entity / Merchant ID)',
    onboardingSteps: [
      'Crie a conta de comerciante em proxypay.co.ao informando os dados fiscais e a conta bancária comercial domiciliada em Angola (AOA).',
      'Solicite a ativação do módulo OPG (Online Payment Gateway) para cobranças via número Multicaixa Express (além do RPS para referências ATM/Homebanking).',
      'Conclua a aprovação de adesão GPO com o banco comercial de apoio para liberar o uso em produção.',
    ],
    credentialLocations: [
      {
        varName: 'ANGOLA_PSP_MERCHANT_ID',
        label: 'Entity ID / Merchant ID',
        whereToFind:
          'No painel ProxyPay em "Entidades / Definições da Conta" (código de 5 dígitos da sua entidade ou identificador de comerciante).',
      },
      {
        varName: 'ANGOLA_PSP_API_KEY',
        label: 'API Key (Sandbox ou Production)',
        whereToFind:
          'No Backoffice ProxyPay em "API / Chaves de Acesso". Existe uma chave distinta para Sandbox e outra para Produção.',
      },
      {
        varName: 'ANGOLA_PSP_CLIENT_ID',
        label: 'Client ID / OAuth (se aplicável ao seu plano)',
        whereToFind:
          'Opcional no ProxyPay padrão (que usa Token/API Key); caso o contrato OPG utilize OAuth2, copie em "Aplicações OAuth".',
      },
      {
        varName: 'ANGOLA_PSP_WEBHOOK_SECRET',
        label: 'Webhook Secret',
        whereToFind:
          'Configurado em "Webhooks / Notificações" no painel ProxyPay para assinar callbacks HTTP POST.',
      },
    ],
    buildEnvBlock: (mode) => `# ProxyPay Angola (${mode.toUpperCase()})
ANGOLA_PSP_PROVIDER="proxypay"
ANGOLA_PSP_MODE="${mode}"
ANGOLA_PSP_API_BASE_URL="${
      mode === 'live'
        ? 'https://api.proxypay.co.ao'
        : 'https://api.sandbox.proxypay.co.ao'
    }"
ANGOLA_PSP_API_KEY="sua_api_key_proxypay"
ANGOLA_PSP_MERCHANT_ID="seu_entity_ou_merchant_id"
ANGOLA_PSP_WEBHOOK_SECRET="seu_webhook_secret_hmac"`,
  },
  emis_gpo: {
    id: 'emis_gpo',
    name: 'EMIS GPO (Via Banco Comercial)',
    subtitle: 'Integração Direta ao Gateway de Pagamentos Online da EMIS',
    portalUrl: 'https://pagamentonline.emis.co.ao',
    docsUrl: 'https://www.multicaixa.ao',
    contactLabel: 'Gestor de Conta do seu Banco Comercial em Angola',
    authMode: 'Credenciais GPO / Certificação EMIS (Merchant ID + API/OAuth)',
    onboardingSteps: [
      'Dirija-se ao seu banco comercial em Angola (BAI, BFA, BIC, Millennium Atlântico, Standard Bank, BNI, etc.) e peça adesão de comerciante ao GPO (Gateway de Pagamentos Online).',
      'Formalize o contrato de apadrinhamento bancário e conclua os testes de certificação técnica exigidos pela EMIS.',
      'Após aprovação, aceda ao Portal do Comerciante GPO (pagamentonline.emis.co.ao) para gerir terminais virtuais e credenciais.',
    ],
    credentialLocations: [
      {
        varName: 'ANGOLA_PSP_MERCHANT_ID',
        label: 'Merchant ID / Terminal Virtual GPO',
        whereToFind:
          'Emitido pela EMIS através do banco patrocinador e visível no Portal do Comerciante GPO (pagamentonline.emis.co.ao).',
      },
      {
        varName: 'ANGOLA_PSP_CLIENT_ID',
        label: 'Client ID / Frame Token',
        whereToFind:
          'Entregue no kit técnico de certificação EMIS GPO / portal de integração após validação do seu canal.',
      },
      {
        varName: 'ANGOLA_PSP_CLIENT_SECRET',
        label: 'Client Secret / Chave Privada',
        whereToFind:
          'Fornecido em canal seguro durante a entrega das credenciais de certificação pelo banco/EMIS.',
      },
      {
        varName: 'ANGOLA_PSP_WEBHOOK_SECRET',
        label: 'Webhook / Callback Secret',
        whereToFind:
          'Definido na configuração de URL de callback do Portal do Comerciante GPO.',
      },
    ],
    buildEnvBlock: (mode) => `# EMIS GPO Direto (${mode.toUpperCase()})
ANGOLA_PSP_PROVIDER="emis_gpo"
ANGOLA_PSP_MODE="${mode}"
ANGOLA_PSP_API_BASE_URL="${
      mode === 'live'
        ? 'https://pagamentonline.emis.co.ao/online-payment-gateway/webframe/v1'
        : 'https://cerpagamentonline.emis.co.ao/online-payment-gateway/webframe/v1'
    }"
ANGOLA_PSP_OAUTH_TOKEN_URL="URL_OAUTH_FORNECIDA_PELA_EMIS"
ANGOLA_PSP_CLIENT_ID="seu_client_id_emis"
ANGOLA_PSP_CLIENT_SECRET="seu_client_secret_emis"
ANGOLA_PSP_MERCHANT_ID="seu_merchant_id_gpo"
ANGOLA_PSP_WEBHOOK_SECRET="seu_webhook_secret_hmac"`,
  },
};

const WIZARD_STEPS = [
  { id: 1, title: '1. Cadastro & KYC', icon: Building2 },
  { id: 2, title: '2. Obter Credenciais', icon: KeyRound },
  { id: 3, title: '3. Variáveis .env', icon: FileCode2 },
  { id: 4, title: '4. Verificar Ligação', icon: Activity },
  { id: 5, title: '5. Monitor Webhooks', icon: Webhook },
];

interface PspConfigurationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusRefreshed?: (status: AngolaPspStatus) => void;
  initialStep?: number;
}

export const PspConfigurationWizard: React.FC<PspConfigurationWizardProps> = ({
  isOpen,
  onClose,
  onStatusRefreshed,
  initialStep = 1,
}) => {
  const [wizardScope, setWizardScope] = useState<
    'angola' | 'brazil' | 'subscriptions' | 'logs' | 'requests'
  >('angola');
  const [selectedProvider, setSelectedProvider] = useState<WizardProvider>('appypay');
  const [targetMode, setTargetMode] = useState<'sandbox' | 'live'>('sandbox');
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [pspStatus, setPspStatus] = useState<AngolaPspStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://seu-dominio.com';
  const isDevPreviewHost =
    typeof window !== 'undefined' && window.location.hostname.startsWith('ais-dev-');
  const publicWebhookUrl = isDevPreviewHost
    ? `${currentOrigin.replace('://ais-dev-', '://ais-pre-')}/api/webhooks/angola-psp`
    : `${currentOrigin}/api/webhooks/angola-psp`;
  const defaultBrWebhookUrl = isDevPreviewHost
    ? `${currentOrigin.replace('://ais-dev-', '://ais-pre-')}/api/webhooks/br-gateway`
    : `${currentOrigin}/api/webhooks/br-gateway`;

  const [webhookEndpoint, setWebhookEndpoint] = useState<string>(publicWebhookUrl);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    ok: boolean;
    captured: boolean;
    httpStatus: number;
    latencyMs?: number;
    reference?: string;
    warning?: string;
    error?: string;
  } | null>(null);

  const [brConfigSnapshot, setBrConfigSnapshot] = useState<BrGatewayConfig | null>(null);
  const [brMethodStatuses, setBrMethodStatuses] = useState<Record<
    BrPaymentMethodKey,
    BrMethodEndpointStatus
  > | null>(null);
  const [isTestingAllEndpoints, setIsTestingAllEndpoints] = useState<boolean>(false);
  const [isValidatingAuthConnection, setIsValidatingAuthConnection] = useState<boolean>(false);
  const [pspValidationResult, setPspValidationResult] =
    useState<PspConnectionValidationResult | null>(null);

  const refreshServerStatus = async () => {
    setIsChecking(true);
    const status = await fetchAngolaPspStatus();
    if (status) {
      setPspStatus(status);
      onStatusRefreshed?.(status);
      if (
        status.provider === 'appypay' ||
        status.provider === 'proxypay' ||
        status.provider === 'emis_gpo'
      ) {
        setSelectedProvider(status.provider);
      }
      setTargetMode(status.mode);
    }
    setIsChecking(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(initialStep);
    setConnectionTestResult(null);
    setBrMethodStatuses(null);
    setPspValidationResult(null);
    refreshServerStatus();
    fetchBrGatewayState().then((data) => {
      if (data?.config) {
        setBrConfigSnapshot(data.config);
      }
    });
  }, [isOpen, initialStep]);

  if (!isOpen) return null;

  const guide = PROVIDER_GUIDES[selectedProvider];
  const envTemplate = guide.buildEnvBlock(targetMode);

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    window.setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookEndpoint || publicWebhookUrl);
    setCopiedWebhook(true);
    window.setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const webhookUrlValidation = validateWebhookEndpointUrl(webhookEndpoint);

  const handleTestWebhookConnection = async () => {
    if (!webhookUrlValidation.valid) return;
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    const res = await testWebhookConnectionApi({
      endpointUrl: webhookEndpoint.trim(),
      provider: selectedProvider,
    });
    setConnectionTestResult({
      ok: res.ok,
      captured: res.captured,
      httpStatus: res.httpStatus,
      latencyMs: res.latencyMs,
      reference: res.reference,
      warning: res.warning,
      error: res.error,
    });
    setIsTestingConnection(false);
  };

  const handleTestAllEndpoints = async (overrideConfig?: BrGatewayConfig) => {
    setIsTestingAllEndpoints(true);
    let targetConfig = overrideConfig || brConfigSnapshot;
    if (!targetConfig) {
      const fetched = await fetchBrGatewayState();
      if (fetched?.config) {
        targetConfig = fetched.config;
        setBrConfigSnapshot(fetched.config);
      }
    }

    const resolvedConfig: BrGatewayConfig = targetConfig || {
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
      webhookEndpoint: defaultBrWebhookUrl,
      pixWebhookEndpoint: '',
      boletoWebhookEndpoint: '',
      creditCardWebhookEndpoint: '',
    };

    const baseUrl = (resolvedConfig.webhookEndpoint || '').trim() || defaultBrWebhookUrl;
    setBrMethodStatuses({
      pix: {
        method: 'pix',
        label: 'Pix',
        enabled: resolvedConfig.pixEnabled,
        endpointUrl: (resolvedConfig.pixWebhookEndpoint || '').trim() || baseUrl,
        state: resolvedConfig.pixEnabled ? 'testing' : 'disabled',
      },
      boleto: {
        method: 'boleto',
        label: 'Boleto',
        enabled: resolvedConfig.boletoEnabled,
        endpointUrl: (resolvedConfig.boletoWebhookEndpoint || '').trim() || baseUrl,
        state: resolvedConfig.boletoEnabled ? 'testing' : 'disabled',
      },
      credit_card: {
        method: 'credit_card',
        label: 'Cartão',
        enabled: resolvedConfig.creditCardEnabled,
        endpointUrl: (resolvedConfig.creditCardWebhookEndpoint || '').trim() || baseUrl,
        state: resolvedConfig.creditCardEnabled ? 'testing' : 'disabled',
      },
    });

    const results = await testAllBrEndpointsApi(resolvedConfig, defaultBrWebhookUrl);
    setBrMethodStatuses(results);
    setIsTestingAllEndpoints(false);
  };

  const handleValidatePspConnection = async () => {
    setIsValidatingAuthConnection(true);
    const result = await validateAngolaPspConnectionApi({
      provider: selectedProvider,
      mode: targetMode,
    });
    setPspValidationResult(result);
    const refreshedStatus = await fetchAngolaPspStatus();
    if (refreshedStatus) {
      setPspStatus(refreshedStatus);
      onStatusRefreshed?.(refreshedStatus);
    }
    setIsValidatingAuthConnection(false);
  };

  const isEnvVarMissing = (varName: string): boolean => {
    if (!pspStatus) return true;
    if (pspStatus.configured) return false;
    return pspStatus.missingEnvVars.some((entry) => entry.includes(varName));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                <Landmark className="w-3.5 h-3.5" />
                Assistente PSP Angola
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                  pspValidationResult
                    ? pspValidationResult.connected
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : pspStatus?.configured
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {pspValidationResult ? (
                  pspValidationResult.connected ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )
                ) : (
                  <Server className="w-3 h-3" />
                )}
                {pspValidationResult
                  ? pspValidationResult.statusLabel
                  : pspStatus?.configured
                  ? 'Servidor Configurado'
                  : 'Aguardando Variáveis .env'}
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight mt-1">
              Guia de Configuração Passo a Passo (AppyPay • ProxyPay • EMIS GPO)
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar assistente"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Switcher: PSP Angola vs Configuração de Gateway BR vs Histórico de Logs */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWizardScope('angola')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                wizardScope === 'angola'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>PSP Angola (AppyPay · ProxyPay · EMIS)</span>
            </button>
            <button
              type="button"
              onClick={() => setWizardScope('brazil')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                wizardScope === 'brazil'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Configuração de Gateway BR (Pix · Boleto · Cartão)</span>
            </button>
            <button
              type="button"
              onClick={() => setWizardScope('subscriptions')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                wizardScope === 'subscriptions'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Webhook Subscriptions</span>
            </button>
            <button
              type="button"
              onClick={() => setWizardScope('logs')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                wizardScope === 'logs'
                  ? 'bg-slate-200 text-slate-950 border-slate-100'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico de Logs</span>
            </button>
            <button
              type="button"
              onClick={() => setWizardScope('requests')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                wizardScope === 'requests'
                  ? 'bg-sky-500 text-slate-950 border-sky-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Últimos Logs de Requisições</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleTestAllEndpoints()}
            disabled={isTestingAllEndpoints}
            title="Disparar verificação simultânea para os endpoints configurados de Pix, Boleto e Cartão"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isTestingAllEndpoints ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>
              {isTestingAllEndpoints ? 'Testando Endpoints...' : 'Testar Todos os Endpoints'}
            </span>
          </button>
        </div>

        {wizardScope === 'angola' && (
          <>
            {/* Provider & Mode Bar */}
            <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {(['appypay', 'proxypay', 'emis_gpo'] as WizardProvider[]).map((provKey) => {
                  const item = PROVIDER_GUIDES[provKey];
                  const active = selectedProvider === provKey;
                  return (
                    <button
                      key={provKey}
                      type="button"
                      onClick={() => setSelectedProvider(provKey)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setTargetMode('sandbox')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    targetMode === 'sandbox'
                      ? 'bg-slate-800 text-amber-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sandbox (Testes)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('live')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    targetMode === 'live'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Live (Produção)
                </button>
              </div>
            </div>

            {/* Step Navigation Pills */}
            <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
              {WIZARD_STEPS.map((step) => {
                const StepIcon = step.icon;
                const active = currentStep === step.id;
                const completed = currentStep > step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : completed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <StepIcon className="w-3.5 h-3.5" />
                    <span>{step.title}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Scrollable Step Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {brMethodStatuses && wizardScope !== 'brazil' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Status Simultâneo dos Webhooks BR (Pix · Boleto · Cartão)</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] shrink-0">
                  <button
                    type="button"
                    onClick={() => setWizardScope('brazil')}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap"
                  >
                    Configurar Gateway BR
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardScope('requests')}
                    className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap"
                  >
                    Ver Requisições
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrMethodStatuses(null)}
                    aria-label="Ocultar resumo de testes"
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['pix', 'boleto', 'credit_card'] as BrPaymentMethodKey[]).map((key) => {
                  const st = brMethodStatuses[key];
                  if (!st) return null;
                  return (
                    <div
                      key={key}
                      className={`p-2.5 rounded-lg border text-xs space-y-1 ${
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

          {wizardScope === 'brazil' ? (
            <BrGatewayConfigPanel
              onOpenLogHistory={() => setWizardScope('logs')}
              onOpenRequestLogs={() => setWizardScope('requests')}
              brMethodStatuses={brMethodStatuses}
              isTestingAllEndpoints={isTestingAllEndpoints}
              onTestAllEndpoints={(latestCfg) => handleTestAllEndpoints(latestCfg)}
              onConfigSync={setBrConfigSnapshot}
            />
          ) : wizardScope === 'subscriptions' ? (
            <WebhookSubscriptionManager
              defaultEndpointUrl={publicWebhookUrl}
              onOpenLogHistory={() => setWizardScope('logs')}
              onOpenRequestLogs={() => setWizardScope('requests')}
            />
          ) : wizardScope === 'logs' ? (
            <LogHistoryModule
              configuredWebhookUrl={webhookEndpoint}
              selectedProvider={selectedProvider}
              onOpenWebhookSettings={() => {
                setWizardScope('angola');
                setCurrentStep(5);
              }}
            />
          ) : wizardScope === 'requests' ? (
            <RequestLogsTable />
          ) : (
            <>
          {/* Provider Overview Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white">{guide.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{guide.subtitle}</div>
                <div className="text-[11px] text-amber-400 font-mono mt-1">
                  Autenticação: {guide.authMode}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleValidatePspConnection}
                  disabled={isValidatingAuthConnection}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {isValidatingAuthConnection ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlugZap className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isValidatingAuthConnection ? 'Validando Ligação...' : 'Validar Conexão'}
                  </span>
                </button>
                <a
                  href={guide.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition whitespace-nowrap shrink-0"
                >
                  <span>Portal Oficial</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {pspValidationResult && (
              <div
                role="status"
                aria-live="polite"
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  pspValidationResult.connected
                    ? 'bg-emerald-950/35 border-emerald-500/35 text-emerald-100'
                    : 'bg-rose-950/35 border-rose-500/35 text-rose-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 font-bold">
                    {pspValidationResult.connected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span
                      className={
                        pspValidationResult.connected ? 'text-emerald-300' : 'text-rose-300'
                      }
                    >
                      {pspValidationResult.statusLabel}
                    </span>
                    <span className="text-slate-400 font-normal">·</span>
                    <span className="text-[11px] font-mono text-slate-300">
                      {pspValidationResult.provider.toUpperCase()} ({pspValidationResult.mode.toUpperCase()})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-[11px] font-mono tabular-nums text-slate-300">
                      HTTP {pspValidationResult.httpStatus} · {pspValidationResult.latencyMs}ms
                    </span>
                    <button
                      type="button"
                      onClick={() => setPspValidationResult(null)}
                      aria-label="Fechar resultado de validação"
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-200">
                  {pspValidationResult.message}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10 text-[11px] text-slate-300">
                  <div className="min-w-0 truncate font-mono">
                    {pspValidationResult.authMethod} · {pspValidationResult.testedUrl}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {!pspValidationResult.connected && currentStep !== 3 && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-amber-300 hover:text-amber-200 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap"
                      >
                        Configurar .env (Passo 3)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setWizardScope('logs')}
                      className="text-emerald-300 hover:text-emerald-200 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap"
                    >
                      Histórico de Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardScope('requests')}
                      className="text-sky-300 hover:text-sky-200 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap"
                    >
                      Logs de Requisições
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 1: Onboarding & KYC */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  Passo 1: Abertura de Conta Comerciante & Adesão ao Canal GPO
                </h3>
                <p className="text-xs text-slate-400">
                  Canal recomendado: <strong className="text-slate-200">{guide.contactLabel}</strong>
                </p>
              </div>

              <div className="space-y-2.5">
                {guide.onboardingSteps.map((text, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs"
                  >
                    <span className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-200 leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  Documentação Geral Exigida (KYC em Angola)
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>NIF da empresa / atividade comercial</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Conta bancária comercial em AOA (IBAN AO06...)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Registo Comercial / Alvará Comercial</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>BI dos sócios ou representantes legais</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: Where to acquire Client ID, Client Secret, Merchant ID */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Passo 2: Onde Obter o Client ID, Client Secret e Merchant ID
                </h3>
                <p className="text-xs text-slate-400">
                  Localização exata de cada credencial no portal oficial da {guide.name} após aprovação comercial:
                </p>
              </div>

              <div className="space-y-2.5">
                {guide.credentialLocations.map((cred) => (
                  <div
                    key={cred.varName}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{cred.label}</span>
                      <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300">
                        {cred.varName}
                      </code>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{cred.whereToFind}</p>
                  </div>
                ))}
              </div>

              {/* Editable AppyPay / PSP Webhook Endpoint + Connection Ping Tester */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="psp-wizard-webhook-endpoint"
                    className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"
                  >
                    <Webhook className="w-4 h-4" />
                    <span>Endpoint de Webhook ({guide.name})</span>
                  </label>
                  <div className="flex items-center gap-2 shrink-0">
                    {webhookEndpoint !== publicWebhookUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setWebhookEndpoint(publicWebhookUrl);
                          setConnectionTestResult(null);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Restaurar padrão
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-emerald-300 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWebhook ? 'Copiado' : 'Copiar URL'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    id="psp-wizard-webhook-endpoint"
                    type="url"
                    value={webhookEndpoint}
                    aria-invalid={!webhookUrlValidation.valid}
                    onChange={(e) => {
                      setWebhookEndpoint(e.target.value);
                      if (connectionTestResult) setConnectionTestResult(null);
                    }}
                    placeholder="https://seu-dominio.com/api/webhooks/angola-psp"
                    className={`flex-1 min-w-0 bg-slate-900 border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${
                      webhookUrlValidation.valid
                        ? 'border-slate-800 focus:border-emerald-500'
                        : 'border-rose-500/60 focus:border-rose-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleTestWebhookConnection}
                    disabled={isTestingConnection || !webhookUrlValidation.valid}
                    title={
                      !webhookUrlValidation.valid
                        ? webhookUrlValidation.error
                        : 'Enviar ping real de callback para validar conexão'
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`}
                    />
                    <span>{isTestingConnection ? 'Testando...' : 'Testar Conexão'}</span>
                  </button>
                </div>

                {!webhookUrlValidation.valid && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{webhookUrlValidation.error}</span>
                  </p>
                )}

                {connectionTestResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      connectionTestResult.ok
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        {connectionTestResult.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>
                          {connectionTestResult.ok
                            ? 'Conexão confirmada: evento de pagamento capturado pelo servidor.'
                            : connectionTestResult.error ||
                              'O endpoint não respondeu conforme esperado ao ping de callback.'}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-[11px] opacity-90 shrink-0">
                        HTTP {connectionTestResult.httpStatus}
                        {connectionTestResult.latencyMs !== undefined
                          ? ` · ${connectionTestResult.latencyMs}ms`
                          : ''}
                      </span>
                    </div>

                    {connectionTestResult.reference && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                        <span>
                          Referência do ping:{' '}
                          <code className="font-mono text-amber-300">
                            {connectionTestResult.reference}
                          </code>
                        </span>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => setWizardScope('logs')}
                            className="text-amber-300 hover:text-amber-200 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Ver no Histórico de Logs
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentStep(5)}
                            className="text-emerald-300 hover:text-emerald-200 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Monitor Webhooks
                          </button>
                        </div>
                      </div>
                    )}

                    {connectionTestResult.warning && (
                      <p className="text-[11px] text-amber-300 leading-relaxed">
                        {connectionTestResult.warning}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-slate-400">
                  Insira o seu Endpoint de Webhook configurado no portal da {guide.name} e clique em <strong>Testar Conexão</strong> para enviar um ping real de callback e confirmar a captura de eventos de pagamento.
                </p>
                {isDevPreviewHost && (
                  <p className="text-[11px] text-amber-300 leading-relaxed">
                    Atenção: o endereço <code className="font-mono">ais-dev-...</code> da pré-visualização é privado. Para que AppyPay, ProxyPay ou EMIS enviem notificações externas, partilhe/publique a aplicação e use o URL público (<code className="font-mono">ais-pre-...</code> ou domínio próprio).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: .env Configuration Template */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-amber-400" />
                  Passo 3: Atualizar as Variáveis de Ambiente (.env / Secrets)
                </h3>
                <p className="text-xs text-slate-400">
                  Por segurança, as chaves privadas nunca devem ser inseridas no navegador. Adicione o bloco abaixo no ficheiro <code className="font-mono text-slate-200">.env</code> do servidor ou no painel de <strong>Secrets</strong> do ambiente e reinicie o servidor.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/60">
                  <span className="text-xs font-mono text-slate-300">
                    .env — {guide.name} ({targetMode.toUpperCase()})
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyEnv}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedEnv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEnv ? 'Bloco .env Copiado!' : 'Copiar Bloco .env'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {envTemplate}
                </pre>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Substitua apenas os valores entre aspas pelas credenciais reais emitidas pela {guide.name}. Se o provedor disponibilizar um endpoint separado para transferências/repasse bancário, defina também{' '}
                  <code className="font-mono text-white">ANGOLA_PSP_PAYOUT_ENDPOINT</code>.
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: Live Server Readiness Verification */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Passo 4: Verificação ao Vivo das Variáveis no Servidor
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspeção em tempo real de <code className="font-mono text-slate-300">/api/angola-psp/status</code> (sem expor segredos).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleValidatePspConnection}
                    disabled={isValidatingAuthConnection}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    {isValidatingAuthConnection ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlugZap className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isValidatingAuthConnection ? 'Validando Ligação...' : 'Validar Conexão'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={refreshServerStatus}
                    disabled={isChecking}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>{isChecking ? 'Verificando...' : 'Reverificar Servidor Agora'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    key: 'ANGOLA_PSP_API_BASE_URL',
                    label: 'Endpoint Base da API do PSP',
                    missing: isEnvVarMissing('ANGOLA_PSP_API_BASE_URL'),
                  },
                  {
                    key: 'ANGOLA_PSP_MERCHANT_ID',
                    label: 'Merchant ID / Entity ID',
                    missing: isEnvVarMissing('ANGOLA_PSP_MERCHANT_ID'),
                  },
                  {
                    key: 'ANGOLA_PSP_API_KEY',
                    label: 'API Key ou OAuth2 Client ID + Secret',
                    missing: isEnvVarMissing('ANGOLA_PSP_API_KEY'),
                  },
                  {
                    key: 'ANGOLA_PSP_WEBHOOK_SECRET',
                    label: 'Assinatura HMAC Webhook (Recomendado)',
                    missing: !pspStatus?.hasWebhookSecret,
                  },
                ].map((row) => (
                  <div
                    key={row.key}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      !row.missing
                        ? 'bg-emerald-950/30 border-emerald-500/30'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-white truncate">
                        {row.key}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{row.label}</div>
                    </div>
                    {!row.missing ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold shrink-0">
                        <AlertCircle className="w-3 h-3" />
                        Pendente
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div
                className={`p-4 rounded-xl border text-xs ${
                  pspStatus?.configured
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                {pspStatus?.configured ? (
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Provedor {pspStatus.provider.toUpperCase()} ({pspStatus.mode.toUpperCase()}) ativo no servidor! Cobranças GPO e saques no painel agora comunicam diretamente com a API configurada.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="font-semibold text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Servidor aguardando variáveis válidas e credenciais reais do PSP.</span>
                    </div>
                    {pspStatus?.warnings && pspStatus.warnings.length > 0 && (
                      <ul className="space-y-1 text-rose-300 list-disc pl-5">
                        {pspStatus.warnings.map((warn, idx) => (
                          <li key={idx}>{warn}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-slate-400">
                      Depois de gravar as variáveis reais nos Secrets / ambiente do servidor e reiniciar o servidor, clique em <strong>Reverificar Servidor Agora</strong> para confirmar a ligação.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Real-Time Webhook Monitor & Tester */}
          {currentStep === 5 && (
            <WebhookMonitorModule
              defaultProvider={selectedProvider}
              publicWebhookUrl={publicWebhookUrl}
              webhookEndpoint={webhookEndpoint}
              onWebhookEndpointChange={setWebhookEndpoint}
              hasWebhookSecret={Boolean(pspStatus?.hasWebhookSecret)}
            />
          )}
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3 shrink-0">
          {wizardScope === 'brazil' ||
          wizardScope === 'subscriptions' ||
          wizardScope === 'logs' ||
          wizardScope === 'requests' ? (
            <>
              <button
                type="button"
                onClick={() => setWizardScope('angola')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar para PSP Angola</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Concluir & Voltar ao Painel</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                disabled={currentStep === 1}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  currentStep === 1
                    ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Passo Anterior</span>
              </button>

              <div className="flex items-center gap-2">
                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Próximo Passo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Concluir & Voltar ao Painel</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
