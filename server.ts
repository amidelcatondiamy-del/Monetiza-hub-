import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';
import {
  AiAutopilotService,
  AutopilotBusinessSnapshot,
  AutopilotFocusArea,
} from './server/aiAutopilot';
import {
  SmartWeeklySummaryService,
  SmartSummaryInputPayload,
} from './server/smartWeeklySummary';
import {
  AnalyticsTrackerService,
  AnalyticsWindow,
} from './server/analyticsTracker';
import { attachLiveVoiceSession } from './server/liveVoiceAgent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AngolaPspProvider = 'appypay' | 'proxypay' | 'emis_gpo' | 'custom';
type PspMode = 'sandbox' | 'live';

interface PspConfig {
  provider: AngolaPspProvider;
  mode: PspMode;
  apiBaseUrl: string;
  oauthTokenUrl: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  merchantId: string;
  payoutEndpoint: string;
  webhookSecret: string;
}

interface ServerSettlementRecord {
  id: string;
  kind: 'payout' | 'charge';
  provider: string;
  mode: PspMode;
  reference: string;
  pspTransactionId: string;
  amountAOA: number;
  phone: string;
  bankName?: string;
  iban?: string;
  status: 'pending' | 'credited' | 'failed';
  createdAt: string;
  updatedAt: string;
  message: string;
}

interface WebhookMonitorLog {
  id: string;
  timestamp: string;
  provider: string;
  source: 'external_psp' | 'test_probe' | 'payout_dispatch';
  eventType:
    | 'webhook_received'
    | 'payout_webhook_update'
    | 'payout_submitted'
    | 'payout_rejected'
    | 'connection_test';
  outcome: 'success' | 'error';
  httpStatus: number;
  signatureValid: boolean | null;
  reference: string | null;
  transactionKind: 'payout' | 'charge' | 'unknown';
  amountAOA?: number;
  channel?: string;
  latencyMs?: number;
  endpointUrl?: string;
  message: string;
  payloadSnippet: string;
}

interface HttpRequestLog {
  id: string;
  timestamp: string;
  method: string;
  endpointUrl: string;
  statusCode: number;
  latencyMs: number;
  provider?: string;
  errorSummary?: string;
}

const DATA_DIR = path.resolve(__dirname, '.data');
const LEDGER_FILE = path.join(DATA_DIR, 'psp-ledger.json');
const WEBHOOK_LOGS_FILE = path.join(DATA_DIR, 'webhook-logs.json');
const REQUEST_LOGS_FILE = path.join(DATA_DIR, 'request-logs.json');
const ADS_TELEMETRY_FILE = path.join(DATA_DIR, 'ads-telemetry.json');
const AD_CAMPAIGNS_FILE = path.join(DATA_DIR, 'ad-campaigns.json');
const AD_CONFIG_FILE = path.join(DATA_DIR, 'ad-config.json');
const BR_GATEWAY_CONFIG_FILE = path.join(DATA_DIR, 'br-gateway-config.json');
const WEBHOOK_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'webhook-subscriptions.json');
const SALES_ORDERS_FILE = path.join(DATA_DIR, 'sales-orders.json');
const PLAYSTORE_TWA_CONFIG_FILE = path.join(DATA_DIR, 'playstore-twa-config.json');
const CREATOR_VAULT_FILE = path.join(DATA_DIR, 'creator-vault.enc.json');
const CREATOR_VAULT_SALT_FILE = path.join(DATA_DIR, '.vault-server-salt');

interface ServerEncryptedVaultEnvelope {
  format: 'monetizahub_server_aes256_gcm_v1';
  algorithm: 'AES-256-GCM';
  iv: string;
  authTag: string;
  ciphertext: string;
  storedAt: string;
}

function getOrCreateServerVaultKey(): Buffer {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  let saltHex = '';
  if (fs.existsSync(CREATOR_VAULT_SALT_FILE)) {
    saltHex = fs.readFileSync(CREATOR_VAULT_SALT_FILE, 'utf-8').trim();
  }
  if (!saltHex || saltHex.length < 32) {
    saltHex = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(CREATOR_VAULT_SALT_FILE, saltHex, { encoding: 'utf-8', mode: 0o600 });
  }
  const masterSecret =
    process.env.CREATOR_VAULT_MASTER_KEY ||
    process.env.ADMIN_SECRET ||
    process.env.SESSION_SECRET ||
    'monetizahub-server-vault-master-key-v1';
  return crypto.scryptSync(masterSecret, Buffer.from(saltHex, 'hex'), 32);
}

function encryptCreatorVaultAtRest(payload: {
  maskedProfile: Record<string, unknown>;
  clientEncryptedVault: Record<string, unknown>;
  updatedAt: string;
}) {
  const key = getOrCreateServerVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const serialized = Buffer.from(JSON.stringify(payload), 'utf-8');
  const encrypted = Buffer.concat([cipher.update(serialized), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const storedAt = new Date().toISOString();

  const diskEnvelope: ServerEncryptedVaultEnvelope = {
    format: 'monetizahub_server_aes256_gcm_v1',
    algorithm: 'AES-256-GCM',
    iv: iv.toString('base64url'),
    authTag: authTag.toString('base64url'),
    ciphertext: encrypted.toString('base64url'),
    storedAt,
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(CREATOR_VAULT_FILE, JSON.stringify(diskEnvelope, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });

  return {
    algorithm: 'AES-256-GCM' as const,
    storedAt,
    ivHexPreview: iv.toString('hex').slice(0, 12).toUpperCase(),
    authTagLengthBytes: authTag.length,
    payloadBytes: encrypted.length,
  };
}

function decryptCreatorVaultAtRest() {
  if (!fs.existsSync(CREATOR_VAULT_FILE)) {
    return null;
  }
  const raw = JSON.parse(
    fs.readFileSync(CREATOR_VAULT_FILE, 'utf-8')
  ) as ServerEncryptedVaultEnvelope;
  if (raw.algorithm !== 'AES-256-GCM' || !raw.iv || !raw.authTag || !raw.ciphertext) {
    throw new Error('Arquivo do cofre AES-256-GCM inválido no servidor.');
  }
  const key = getOrCreateServerVaultKey();
  const iv = Buffer.from(raw.iv, 'base64url');
  const authTag = Buffer.from(raw.authTag, 'base64url');
  const ciphertext = Buffer.from(raw.ciphertext, 'base64url');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const parsed = JSON.parse(decrypted.toString('utf-8')) as {
    maskedProfile: Record<string, unknown>;
    clientEncryptedVault: Record<string, unknown>;
    updatedAt: string;
  };

  return {
    ...parsed,
    serverStorageInfo: {
      algorithm: 'AES-256-GCM' as const,
      storedAt: raw.storedAt,
      ivHexPreview: iv.toString('hex').slice(0, 12).toUpperCase(),
      authTagLengthBytes: authTag.length,
      payloadBytes: ciphertext.length,
    },
  };
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

const DEFAULT_PLAYSTORE_TWA_CONFIG: PlayStoreTwaConfig = {
  packageName: 'com.monetizahub.creator',
  appName: 'MonetizaHub - Plataforma do Criador',
  launcherName: 'MonetizaHub',
  versionName: '1.0.0',
  versionCode: 1,
  sha256Fingerprints: [
    '14:6D:E9:7D:0F:52:AB:FC:0C:FB:DC:60:85:6B:F1:BA:C7:E9:2A:C4:6E:20:9B:4D:42:0B:4C:E6:B5:43:21:09',
  ],
  updatedAt: new Date().toISOString(),
};

function readPlayStoreTwaConfig(): PlayStoreTwaConfig {
  try {
    if (fs.existsSync(PLAYSTORE_TWA_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PLAYSTORE_TWA_CONFIG_FILE, 'utf-8')) as Partial<PlayStoreTwaConfig>;
      return {
        packageName: String(parsed.packageName || DEFAULT_PLAYSTORE_TWA_CONFIG.packageName),
        appName: String(parsed.appName || DEFAULT_PLAYSTORE_TWA_CONFIG.appName),
        launcherName: String(parsed.launcherName || DEFAULT_PLAYSTORE_TWA_CONFIG.launcherName).slice(0, 12),
        versionName: String(parsed.versionName || DEFAULT_PLAYSTORE_TWA_CONFIG.versionName),
        versionCode: Math.max(1, Number(parsed.versionCode || DEFAULT_PLAYSTORE_TWA_CONFIG.versionCode)),
        sha256Fingerprints: Array.isArray(parsed.sha256Fingerprints) && parsed.sha256Fingerprints.length > 0
          ? parsed.sha256Fingerprints.map((f) => String(f).trim().toUpperCase()).filter(Boolean)
          : DEFAULT_PLAYSTORE_TWA_CONFIG.sha256Fingerprints,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // Fallback to default TWA config
  }
  return DEFAULT_PLAYSTORE_TWA_CONFIG;
}

function buildAssetLinksPayload(cfg: PlayStoreTwaConfig) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: cfg.packageName,
        sha256_cert_fingerprints: cfg.sha256Fingerprints,
      },
    },
  ];
}

interface RealSaleOrder {
  id: string;
  type: 'product_sale' | 'subscription' | 'tip' | 'paywall_unlock' | 'in_app_purchase';
  itemId?: string;
  title: string;
  customerName: string;
  customerEmail: string;
  customerDocument?: string;
  grossAmount: number;
  fee: number;
  netAmount: number;
  currency: 'BRL' | 'USD' | 'AOA' | 'EUR';
  chargedAmount: number;
  chargedCurrency: 'BRL' | 'AOA';
  paymentMethod: 'pix' | 'boleto' | 'credit_card' | 'stripe' | 'multicaixa';
  gatewayProvider: string;
  gatewayMode: PspMode;
  externalChargeId: string;
  authorizationCode?: string;
  status: 'pending' | 'approved' | 'failed' | 'refunded';
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  boletoUrl?: string;
  boletoBarcode?: string;
  ticketUrl?: string;
  installments?: number;
  couponCode?: string;
  affiliateCode?: string;
  message?: string;
  gatewayMessage: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

interface WebhookSubscriptionLastExecution {
  status: 'success' | 'error';
  httpStatus: number;
  latencyMs: number;
  executedAt: string;
  message: string;
}

interface WebhookSubscriptionRecord {
  id: string;
  eventType: string;
  endpointUrl: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecution?: WebhookSubscriptionLastExecution | null;
}

const DEFAULT_WEBHOOK_SUBSCRIPTIONS: WebhookSubscriptionRecord[] = [
  {
    id: 'whsub-tx-aprovada',
    eventType: 'transação.aprovada',
    endpointUrl: '/api/webhooks/angola-psp',
    description: 'Notifica o backend quando um pagamento GPO / Multicaixa ou Pix é confirmado.',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastExecution: null,
  },
  {
    id: 'whsub-saldo-alterado',
    eventType: 'saldo.alterado',
    endpointUrl: '/api/webhooks/angola-psp',
    description: 'Disparado após créditos, retenções ou liquidações que alteram o saldo disponível.',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastExecution: null,
  },
  {
    id: 'whsub-saque-realizado',
    eventType: 'saque.realizado',
    endpointUrl: '/api/webhooks/angola-psp',
    description: 'Confirma a liquidação bancária / Multicaixa Express de pedidos de saque.',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastExecution: null,
  },
];

function loadWebhookSubscriptions(): WebhookSubscriptionRecord[] {
  try {
    if (!fs.existsSync(WEBHOOK_SUBSCRIPTIONS_FILE)) {
      return structuredClone(DEFAULT_WEBHOOK_SUBSCRIPTIONS);
    }
    const raw = fs.readFileSync(WEBHOOK_SUBSCRIPTIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as WebhookSubscriptionRecord[];
    return structuredClone(DEFAULT_WEBHOOK_SUBSCRIPTIONS);
  } catch {
    return structuredClone(DEFAULT_WEBHOOK_SUBSCRIPTIONS);
  }
}

type BrGatewayProviderId = 'mercadopago' | 'asaas' | 'pagarme' | 'efi' | 'stripe_br' | 'custom_br';

interface BrGatewayStoredConfig {
  provider: BrGatewayProviderId;
  customProviderName: string;
  customApiBaseUrl: string;
  mode: 'sandbox' | 'live';
  merchantOrAccountId: string;
  pixEnabled: boolean;
  pixKey: string;
  pixExpirationMinutes: number;
  boletoEnabled: boolean;
  boletoDueDays: number;
  boletoInstructions: string;
  creditCardEnabled: boolean;
  maxInstallments: number;
  interestFreeInstallments: number;
  captureMode: 'automatic' | 'manual';
  webhookEndpoint: string;
  pixWebhookEndpoint?: string;
  boletoWebhookEndpoint?: string;
  creditCardWebhookEndpoint?: string;
  updatedAt: string;
}

const DEFAULT_BR_GATEWAY_CONFIG: BrGatewayStoredConfig = {
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
  boletoInstructions: 'Não receber após o vencimento. Pagamento referente a pedido digital MonetizaHub.',
  creditCardEnabled: true,
  maxInstallments: 12,
  interestFreeInstallments: 3,
  captureMode: 'automatic',
  webhookEndpoint: '',
  pixWebhookEndpoint: '',
  boletoWebhookEndpoint: '',
  creditCardWebhookEndpoint: '',
  updatedAt: new Date().toISOString(),
};

function loadBrGatewayConfig(): BrGatewayStoredConfig {
  try {
    if (!fs.existsSync(BR_GATEWAY_CONFIG_FILE)) return structuredClone(DEFAULT_BR_GATEWAY_CONFIG);
    const raw = fs.readFileSync(BR_GATEWAY_CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<BrGatewayStoredConfig>;
    return { ...DEFAULT_BR_GATEWAY_CONFIG, ...parsed };
  } catch {
    return structuredClone(DEFAULT_BR_GATEWAY_CONFIG);
  }
}

function saveBrGatewayConfig(cfg: BrGatewayStoredConfig) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(BR_GATEWAY_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch {
    // Ignore persistence write errors on read-only environments
  }
}

const brGatewayConfig: BrGatewayStoredConfig = loadBrGatewayConfig();

function readBrGatewayEnvConfig() {
  const rawProvider = (process.env.BR_GATEWAY_PROVIDER || brGatewayConfig.provider || 'mercadopago')
    .trim()
    .toLowerCase();
  const validProviders: BrGatewayProviderId[] = [
    'mercadopago',
    'asaas',
    'pagarme',
    'efi',
    'stripe_br',
    'custom_br',
  ];
  const provider: BrGatewayProviderId = validProviders.includes(rawProvider as BrGatewayProviderId)
    ? (rawProvider as BrGatewayProviderId)
    : 'mercadopago';
  const mode: 'sandbox' | 'live' =
    (process.env.BR_GATEWAY_MODE || brGatewayConfig.mode || 'sandbox').trim().toLowerCase() === 'live'
      ? 'live'
      : 'sandbox';
  return {
    provider,
    mode,
    apiBaseUrl: (process.env.BR_GATEWAY_API_BASE_URL || brGatewayConfig.customApiBaseUrl || '')
      .trim()
      .replace(/\/+$/, ''),
    accessToken: (process.env.BR_GATEWAY_ACCESS_TOKEN || '').trim(),
    apiKey: (process.env.BR_GATEWAY_API_KEY || '').trim(),
    clientId: (process.env.BR_GATEWAY_CLIENT_ID || '').trim(),
    clientSecret: (process.env.BR_GATEWAY_CLIENT_SECRET || '').trim(),
    merchantId: (process.env.BR_GATEWAY_MERCHANT_ID || brGatewayConfig.merchantOrAccountId || '').trim(),
    webhookSecret: (process.env.BR_GATEWAY_WEBHOOK_SECRET || '').trim(),
  };
}

interface AdTelemetryEventRecord {
  id: string;
  timestamp: string;
  networkId: string;
  format: 'banner' | 'interstitial' | 'rewarded_video' | 'native';
  eventType: 'impression' | 'click' | 'rewarded_complete';
  placementId?: string;
  adId?: string;
  revenue: number;
}

interface AdTelemetryState {
  byFormat: Record<'banner' | 'interstitial' | 'rewarded_video' | 'native', { impressions: number; clicks: number; revenue: number }>;
  byNetwork: Record<string, { impressions: number; clicks: number; revenue: number }>;
  recentEvents: AdTelemetryEventRecord[];
  updatedAt: string;
}

const DEFAULT_ADS_TELEMETRY: AdTelemetryState = {
  byFormat: {
    banner: { impressions: 8240, clicks: 198, revenue: 94.2 },
    interstitial: { impressions: 3120, clicks: 136, revenue: 118.6 },
    rewarded_video: { impressions: 1640, clicks: 86, revenue: 121.8 },
    native: { impressions: 1820, clicks: 72, revenue: 51.8 },
  },
  byNetwork: {
    google_admob: { impressions: 7410, clicks: 258, revenue: 198.4 },
    meta_audience: { impressions: 4120, clicks: 138, revenue: 112.6 },
    google_adsense: { impressions: 2150, clicks: 64, revenue: 42.8 },
    unity_ads: { impressions: 1140, clicks: 32, revenue: 32.6 },
  },
  recentEvents: [],
  updatedAt: new Date().toISOString(),
};

function loadAdsTelemetry(): AdTelemetryState {
  try {
    if (!fs.existsSync(ADS_TELEMETRY_FILE)) return structuredClone(DEFAULT_ADS_TELEMETRY);
    const raw = fs.readFileSync(ADS_TELEMETRY_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AdTelemetryState>;
    return {
      byFormat: { ...DEFAULT_ADS_TELEMETRY.byFormat, ...(parsed.byFormat || {}) },
      byNetwork: { ...DEFAULT_ADS_TELEMETRY.byNetwork, ...(parsed.byNetwork || {}) },
      recentEvents: Array.isArray(parsed.recentEvents) ? parsed.recentEvents : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return structuredClone(DEFAULT_ADS_TELEMETRY);
  }
}

function saveAdsTelemetry(state: AdTelemetryState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ADS_TELEMETRY_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Ignore persistence write errors on read-only environments
  }
}

function loadJsonArray<T>(filePath: string): T[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveJsonArray(filePath: string, items: unknown[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
  } catch {
    // Ignore persistence write errors on read-only environments
  }
}

function saveLedgerToDisk(items: ServerSettlementRecord[]) {
  saveJsonArray(LEDGER_FILE, items);
}

interface ServerAdCampaignRecord {
  id: string;
  sponsorName: string;
  sponsorLogo: string;
  badge: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  bannerUrl: string;
  category: string;
  rating?: number;
  format: 'native' | 'banner' | 'both';
  active: boolean;
  impressions: number;
  clicks: number;
  createdAt: string;
}

interface ServerAdConfigState {
  adsEnabled: boolean;
  adRevenueShareCreatorPct: number;
  adPlacementMode: 'minimal' | 'balanced' | 'high_yield';
  adSettings: {
    interstitialEnabled: boolean;
    rewardedEnabled: boolean;
    nativeEnabled: boolean;
    bottomBannerEnabled: boolean;
    inlineBannerEnabled: boolean;
    bannerPosition: 'inline' | 'bottom' | 'both';
    bannerRefreshSeconds: number;
    mediationStrategy: 'highest_ecpm' | 'waterfall';
    frequencyMinutes: number;
  };
  networks: Array<{
    id: string;
    name: string;
    shortLabel: string;
    enabled: boolean;
    priority: number;
    appOrPublisherId: string;
    unitSlots: {
      bannerPlacementId: string;
      interstitialPlacementId: string;
      rewardedPlacementId: string;
      nativePlacementId?: string;
    };
    ecpmFloor: number;
    fillRatePct: number;
    impressions: number;
    clicks: number;
    revenue: number;
    supportedFormats: string[];
    docsUrl: string;
    placementIdHint: string;
  }>;
  updatedAt: string;
}

const DEFAULT_AD_CAMPAIGNS: ServerAdCampaignRecord[] = [
  {
    id: 'ad-nubank-pj',
    sponsorName: 'Nubank Empresas',
    sponsorLogo: '',
    badge: 'Parceiro Oficial',
    title: 'Conta PJ com Rendimento Diário e Cartão sem Anuidade',
    description:
      'Automatize o faturamento das suas vendas digitais com emissão gratuita de Pix PJ, boletos e cartão de crédito corporativo.',
    ctaText: 'Abrir Conta Grátis',
    ctaUrl: 'https://nubank.com.br/pj',
    bannerUrl: '',
    category: 'Finanças & Negócios',
    rating: 4.9,
    format: 'both',
    active: true,
    impressions: 1240,
    clicks: 48,
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'ad-google-cloud',
    sponsorName: 'Google Cloud for Creators',
    sponsorLogo: '',
    badge: 'Patrocinado',
    title: 'Créditos de Nuvem e Infraestrutura Escalável para Infoprodutores',
    description:
      'Hospede suas plataformas de membros, vídeos em streaming e automações com alta disponibilidade e segurança de nível mundial.',
    ctaText: 'Resgatar Créditos',
    ctaUrl: 'https://cloud.google.com/innovators',
    bannerUrl: '',
    category: 'Tecnologia & Cloud',
    rating: 4.95,
    format: 'both',
    active: true,
    impressions: 980,
    clicks: 41,
    createdAt: '2026-10-24T14:30:00Z',
  },
  {
    id: 'ad-stripe-atlas',
    sponsorName: 'Stripe Atlas',
    sponsorLogo: '',
    badge: 'Recomendado',
    title: 'Crie sua Empresa Global e Venda em Dólar e Euro com Facilidade',
    description:
      'A forma mais rápida e confiável para criadores de conteúdo constituírem empresas nos EUA e receberem em escala internacional.',
    ctaText: 'Começar Agora',
    ctaUrl: 'https://stripe.com/atlas',
    bannerUrl: '',
    category: 'Vendas Internacionais',
    rating: 4.88,
    format: 'both',
    active: true,
    impressions: 760,
    clicks: 29,
    createdAt: '2026-11-01T09:15:00Z',
  },
  {
    id: 'bn-visa-direct',
    sponsorName: 'Visa Direct Business',
    sponsorLogo: '',
    badge: 'Liquidação Global',
    title: 'Liquidação imediata em cartão e conta bancária para criadores globais',
    description:
      'Receba seus ganhos internacionais diretamente no seu Cartão Visa em minutos com liquidação multi-moeda.',
    ctaText: 'Explorar Solução',
    ctaUrl: 'https://www.visa.com.br/pt_br/visa-direct',
    bannerUrl: '',
    category: 'Pagamentos',
    rating: 4.92,
    format: 'banner',
    active: true,
    impressions: 1150,
    clicks: 36,
    createdAt: '2026-11-05T11:00:00Z',
  },
];

const DEFAULT_AD_SERVER_CONFIG: ServerAdConfigState = {
  adsEnabled: true,
  adRevenueShareCreatorPct: 70,
  adPlacementMode: 'balanced',
  adSettings: {
    interstitialEnabled: true,
    rewardedEnabled: true,
    nativeEnabled: true,
    bottomBannerEnabled: true,
    inlineBannerEnabled: true,
    bannerPosition: 'both',
    bannerRefreshSeconds: 30,
    mediationStrategy: 'highest_ecpm',
    frequencyMinutes: 3,
  },
  networks: [
    {
      id: 'google_admob',
      name: 'Google AdMob',
      shortLabel: 'AdMob',
      enabled: true,
      priority: 1,
      appOrPublisherId: 'ca-app-pub-3940256099942544~3347511713',
      unitSlots: {
        bannerPlacementId: 'ca-app-pub-3940256099942544/6300978111',
        interstitialPlacementId: 'ca-app-pub-3940256099942544/1033173712',
        rewardedPlacementId: 'ca-app-pub-3940256099942544/5224354917',
        nativePlacementId: 'ca-app-pub-3940256099942544/2247696110',
      },
      ecpmFloor: 28.5,
      fillRatePct: 94,
      impressions: 7410,
      clicks: 258,
      revenue: 198.4,
      supportedFormats: ['banner', 'interstitial', 'rewarded_video', 'native'],
      docsUrl: 'https://admob.google.com',
      placementIdHint: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    },
    {
      id: 'meta_audience',
      name: 'Meta Audience Network',
      shortLabel: 'Meta Ads',
      enabled: true,
      priority: 2,
      appOrPublisherId: '184920394810293',
      unitSlots: {
        bannerPlacementId: '184920394810293_184920451001',
        interstitialPlacementId: '184920394810293_184920451002',
        rewardedPlacementId: '184920394810293_184920451003',
        nativePlacementId: '184920394810293_184920451004',
      },
      ecpmFloor: 24.9,
      fillRatePct: 89,
      impressions: 4120,
      clicks: 138,
      revenue: 112.6,
      supportedFormats: ['banner', 'interstitial', 'rewarded_video', 'native'],
      docsUrl: 'https://www.facebook.com/audiencenetwork',
      placementIdHint: 'APP_ID_PLACEMENT_ID',
    },
    {
      id: 'google_adsense',
      name: 'Google AdSense (Web)',
      shortLabel: 'AdSense',
      enabled: true,
      priority: 3,
      appOrPublisherId: 'ca-pub-7410293847561029',
      unitSlots: {
        bannerPlacementId: '5829104812',
        interstitialPlacementId: '5829104899',
        rewardedPlacementId: '',
        nativePlacementId: '5829104940',
      },
      ecpmFloor: 18.4,
      fillRatePct: 96,
      impressions: 2150,
      clicks: 64,
      revenue: 42.8,
      supportedFormats: ['banner', 'interstitial', 'native'],
      docsUrl: 'https://adsense.google.com',
      placementIdHint: 'ca-pub-XXXXXXXXXXXXXXXX / Slot 10 dígitos',
    },
    {
      id: 'unity_ads',
      name: 'Unity Ads',
      shortLabel: 'Unity Ads',
      enabled: false,
      priority: 4,
      appOrPublisherId: '5492018',
      unitSlots: {
        bannerPlacementId: 'Banner_Web_LU',
        interstitialPlacementId: 'Interstitial_Video',
        rewardedPlacementId: 'Rewarded_Video',
        nativePlacementId: '',
      },
      ecpmFloor: 22.8,
      fillRatePct: 87,
      impressions: 1140,
      clicks: 32,
      revenue: 32.6,
      supportedFormats: ['banner', 'interstitial', 'rewarded_video'],
      docsUrl: 'https://unity.com/products/unity-ads',
      placementIdHint: 'Nome do Placement (ex: Rewarded_Video)',
    },
  ],
  updatedAt: new Date().toISOString(),
};

function loadAdCampaigns(): ServerAdCampaignRecord[] {
  try {
    if (!fs.existsSync(AD_CAMPAIGNS_FILE)) {
      return structuredClone(DEFAULT_AD_CAMPAIGNS);
    }
    const raw = fs.readFileSync(AD_CAMPAIGNS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as ServerAdCampaignRecord[];
    }
    return structuredClone(DEFAULT_AD_CAMPAIGNS);
  } catch {
    return structuredClone(DEFAULT_AD_CAMPAIGNS);
  }
}

function saveAdCampaigns(items: ServerAdCampaignRecord[]) {
  saveJsonArray(AD_CAMPAIGNS_FILE, items);
}

function loadAdServerConfig(): ServerAdConfigState {
  try {
    if (!fs.existsSync(AD_CONFIG_FILE)) {
      return structuredClone(DEFAULT_AD_SERVER_CONFIG);
    }
    const raw = fs.readFileSync(AD_CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ServerAdConfigState>;
    return {
      ...DEFAULT_AD_SERVER_CONFIG,
      ...parsed,
      adSettings: {
        ...DEFAULT_AD_SERVER_CONFIG.adSettings,
        ...(parsed.adSettings || {}),
      },
      networks:
        Array.isArray(parsed.networks) && parsed.networks.length > 0
          ? parsed.networks
          : structuredClone(DEFAULT_AD_SERVER_CONFIG.networks),
    };
  } catch {
    return structuredClone(DEFAULT_AD_SERVER_CONFIG);
  }
}

function saveAdServerConfig(cfg: ServerAdConfigState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(AD_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch {
    // Ignore persistence write errors on read-only environments
  }
}

function buildAdsTxtContent(config: ServerAdConfigState): string {
  const lines = [
    '# MonetizaHub Authorized Digital Sellers (ads.txt)',
    `# Atualizado em: ${config.updatedAt || new Date().toISOString()}`,
    `# Exibição pública na vitrine: ${config.adsEnabled ? 'ATIVA' : 'PAUSADA'}`,
  ];

  const pubIds = new Set<string>();
  for (const net of config.networks) {
    if (!net.enabled) continue;
    const raw = String(net.appOrPublisherId || '').trim();
    const match = raw.match(/pub-\d{10,20}/i);
    if (match) {
      pubIds.add(match[0].toLowerCase());
    }
    if (net.id === 'meta_audience' && raw) {
      lines.push(`facebook.com, ${raw.replace(/[^a-zA-Z0-9_-]/g, '')}, DIRECT, c3e20eee3f780d68`);
    }
    if (net.id === 'unity_ads' && raw) {
      lines.push(`unity.com, ${raw.replace(/[^a-zA-Z0-9_-]/g, '')}, DIRECT, 96cabb5fbdde37a7`);
    }
  }

  for (const pubId of pubIds) {
    lines.push(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0`);
  }

  if (pubIds.size === 0) {
    lines.push('google.com, pub-7410293847561029, DIRECT, f08c47fec0942fa0');
  }

  return `${lines.join('\n')}\n`;
}

const serverLedger: ServerSettlementRecord[] = loadJsonArray<ServerSettlementRecord>(LEDGER_FILE);
const webhookLogs: WebhookMonitorLog[] = loadJsonArray<WebhookMonitorLog>(WEBHOOK_LOGS_FILE);
const requestLogs: HttpRequestLog[] = loadJsonArray<HttpRequestLog>(REQUEST_LOGS_FILE);
const adsTelemetry: AdTelemetryState = loadAdsTelemetry();
let adCampaigns: ServerAdCampaignRecord[] = loadAdCampaigns();
let adServerConfig: ServerAdConfigState = loadAdServerConfig();
const webhookSubscriptions: WebhookSubscriptionRecord[] = loadWebhookSubscriptions();
const salesOrders: RealSaleOrder[] = loadJsonArray<RealSaleOrder>(SALES_ORDERS_FILE);
const sseClients = new Set<Response>();
let cachedOAuthToken: { token: string; expiresAt: number } | null = null;
let cachedEfiToken: { token: string; expiresAt: number } | null = null;

function saveSalesOrdersToDisk() {
  saveJsonArray(SALES_ORDERS_FILE, salesOrders);
}

function getBrGatewayReadiness() {
  const envCfg = readBrGatewayEnvConfig();
  const hasSecretToken = Boolean(
    (envCfg.accessToken && !isPlaceholderValue(envCfg.accessToken)) ||
      (envCfg.apiKey && !isPlaceholderValue(envCfg.apiKey)) ||
      (envCfg.clientId &&
        !isPlaceholderValue(envCfg.clientId) &&
        envCfg.clientSecret &&
        !isPlaceholderValue(envCfg.clientSecret))
  );
  const missingEnvVars: string[] = [];
  if (!hasSecretToken) {
    missingEnvVars.push(
      envCfg.provider === 'efi'
        ? 'BR_GATEWAY_CLIENT_ID + BR_GATEWAY_CLIENT_SECRET'
        : 'BR_GATEWAY_ACCESS_TOKEN (ou BR_GATEWAY_API_KEY)'
    );
  }
  if (envCfg.provider === 'custom_br' && !envCfg.apiBaseUrl) {
    missingEnvVars.push('BR_GATEWAY_API_BASE_URL');
  }
  return {
    configured: missingEnvVars.length === 0,
    provider: envCfg.provider,
    mode: envCfg.mode,
    envCfg,
    missingEnvVars,
    enabledMethods: {
      pix: brGatewayConfig.pixEnabled,
      boleto: brGatewayConfig.boletoEnabled,
      credit_card: brGatewayConfig.creditCardEnabled,
    },
  };
}

function resolveBrBaseUrl(provider: BrGatewayProviderId, mode: PspMode, customUrl: string): string {
  if (customUrl) return customUrl.replace(/\/+$/, '');
  switch (provider) {
    case 'mercadopago':
      return 'https://api.mercadopago.com';
    case 'asaas':
      return mode === 'live' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
    case 'pagarme':
      return 'https://api.pagar.me/core/v5';
    case 'efi':
      return mode === 'live' ? 'https://pix.api.efipay.com.br' : 'https://pix-h.api.efipay.com.br';
    case 'stripe_br':
      return 'https://api.stripe.com/v1';
    case 'custom_br':
      return '';
  }
}

async function resolveEfiOAuthToken(baseUrl: string, clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (cachedEfiToken && cachedEfiToken.expiresAt > now + 15000) {
    return cachedEfiToken.token;
  }
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Efí Bank OAuth2 falhou (${res.status}): ${errText.slice(0, 180)}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error('Efí Bank não retornou access_token válido.');
  }
  cachedEfiToken = {
    token: data.access_token,
    expiresAt: now + (Number(data.expires_in) || 300) * 1000,
  };
  return data.access_token;
}

function mapBrPaymentStatus(rawStatus: unknown): 'pending' | 'approved' | 'failed' | 'refunded' {
  const val = String(rawStatus || '').trim().toLowerCase();
  if (
    val === 'approved' ||
    val === 'paid' ||
    val === 'received' ||
    val === 'confirmed' ||
    val === 'succeeded' ||
    val === 'concluida' ||
    val === 'settled' ||
    val === 'completed'
  ) {
    return 'approved';
  }
  if (val === 'refunded' || val === 'charged_back' || val === 'chargeback') {
    return 'refunded';
  }
  if (
    val === 'rejected' ||
    val === 'failed' ||
    val === 'cancelled' ||
    val === 'canceled' ||
    val === 'expired' ||
    val === 'overdue' ||
    val === 'error'
  ) {
    return 'failed';
  }
  return 'pending';
}

function reconcileOrderStatus(
  identifier: string,
  nextStatus: 'pending' | 'approved' | 'failed' | 'refunded',
  gatewayMessage?: string,
  authorizationCode?: string
): RealSaleOrder | null {
  if (!identifier) return null;
  const order = salesOrders.find(
    (o) => o.id === identifier || o.externalChargeId === identifier
  );
  if (!order) return null;
  const prevStatus = order.status;
  order.status = nextStatus;
  order.updatedAt = new Date().toISOString();
  if (gatewayMessage) {
    order.gatewayMessage = gatewayMessage;
  }
  if (authorizationCode) {
    order.authorizationCode = authorizationCode;
  }
  if (nextStatus === 'approved' && !order.paidAt) {
    order.paidAt = order.updatedAt;
  }
  saveSalesOrdersToDisk();
  if (prevStatus !== nextStatus || gatewayMessage) {
    broadcastSseEvent('sale_updated', { order, orders: salesOrders });
  }
  return order;
}

function broadcastSseEvent(event: string, payload: unknown) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(frame);
    } catch {
      sseClients.delete(client);
    }
  }
}

function readPspConfig(): PspConfig {
  const rawProvider = (process.env.ANGOLA_PSP_PROVIDER || 'appypay').trim().toLowerCase();
  const provider: AngolaPspProvider =
    rawProvider === 'proxypay' || rawProvider === 'emis_gpo' || rawProvider === 'custom'
      ? rawProvider
      : 'appypay';
  const mode: PspMode =
    (process.env.ANGOLA_PSP_MODE || 'sandbox').trim().toLowerCase() === 'live'
      ? 'live'
      : 'sandbox';

  return {
    provider,
    mode,
    apiBaseUrl: (process.env.ANGOLA_PSP_API_BASE_URL || '').trim().replace(/\/+$/, ''),
    oauthTokenUrl: (process.env.ANGOLA_PSP_OAUTH_TOKEN_URL || '').trim(),
    clientId: (process.env.ANGOLA_PSP_CLIENT_ID || '').trim(),
    clientSecret: (process.env.ANGOLA_PSP_CLIENT_SECRET || '').trim(),
    apiKey: (process.env.ANGOLA_PSP_API_KEY || '').trim(),
    merchantId: (process.env.ANGOLA_PSP_MERCHANT_ID || '').trim(),
    payoutEndpoint: (process.env.ANGOLA_PSP_PAYOUT_ENDPOINT || '').trim(),
    webhookSecret: (process.env.ANGOLA_PSP_WEBHOOK_SECRET || '').trim(),
  };
}

function isPlaceholderValue(value: string): boolean {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes('seu_client_id') ||
    lower.includes('seu_client_secret') ||
    lower.includes('seu_merchant_id') ||
    lower.includes('seu_entity') ||
    lower.includes('sua_api_key') ||
    lower.includes('seu_webhook_secret') ||
    lower.includes('seu_tenant') ||
    lower.includes('_aqui') ||
    lower.includes('url_oauth_fornecida') ||
    lower === 'changeme' ||
    lower === 'placeholder'
  );
}

function getPspConfigWarnings(cfg: PspConfig): string[] {
  const warnings: string[] = [];
  if (cfg.apiBaseUrl) {
    try {
      const parsed = new URL(cfg.apiBaseUrl);
      if (
        (parsed.hostname === 'appypay.co.ao' ||
          parsed.hostname === 'www.appypay.co.ao' ||
          parsed.hostname === 'www.appy.co.ao' ||
          parsed.hostname === 'appy.co.ao') &&
        (parsed.pathname === '/' || parsed.pathname === '')
      ) {
        warnings.push(
          'ANGOLA_PSP_API_BASE_URL está apontando para o site institucional (appypay.co.ao). Para chamadas de API AppyPay, utilize https://gwy-api-tst.appypay.co.ao/v2.0 (Sandbox) ou https://gwy-api.appypay.co.ao/v2.0 (Produção).'
        );
      } else if (
        (parsed.hostname === 'proxypay.co.ao' || parsed.hostname === 'www.proxypay.co.ao') &&
        (parsed.pathname === '/' || parsed.pathname === '')
      ) {
        warnings.push(
          'ANGOLA_PSP_API_BASE_URL está apontando para o site institucional (proxypay.co.ao). Para a API ProxyPay, utilize https://api.sandbox.proxypay.co.ao (Sandbox) ou https://api.proxypay.co.ao (Produção).'
        );
      }
      if (parsed.hostname.includes('proxypay') && cfg.provider !== 'proxypay') {
        warnings.push(
          'Endpoint ProxyPay detectado: defina também ANGOLA_PSP_PROVIDER="proxypay" para usar o cabeçalho Authorization: Token.'
        );
      }
    } catch {
      warnings.push('ANGOLA_PSP_API_BASE_URL não é um URL HTTPS válido.');
    }
  }
  if (cfg.oauthTokenUrl) {
    try {
      const parsed = new URL(cfg.oauthTokenUrl);
      if (
        (parsed.hostname === 'microsoftonline.com' || parsed.hostname === 'login.microsoftonline.com') &&
        !parsed.pathname.includes('/oauth2')
      ) {
        warnings.push(
          'ANGOLA_PSP_OAUTH_TOKEN_URL está incompleto (microsoftonline.com). Deve incluir o Tenant ID e o caminho /oauth2/v2.0/token.'
        );
      }
    } catch {
      warnings.push('ANGOLA_PSP_OAUTH_TOKEN_URL não é um URL HTTPS válido.');
    }
  }
  return warnings;
}

function getMissingEnvVars(cfg: PspConfig): string[] {
  const missing: string[] = [];
  if ((!cfg.apiBaseUrl || isPlaceholderValue(cfg.apiBaseUrl)) && (!cfg.payoutEndpoint || isPlaceholderValue(cfg.payoutEndpoint))) {
    missing.push('ANGOLA_PSP_API_BASE_URL');
  }
  const hasOAuth = Boolean(
    cfg.oauthTokenUrl &&
      !isPlaceholderValue(cfg.oauthTokenUrl) &&
      cfg.clientId &&
      !isPlaceholderValue(cfg.clientId) &&
      cfg.clientSecret &&
      !isPlaceholderValue(cfg.clientSecret)
  );
  const hasApiKey = Boolean(cfg.apiKey && !isPlaceholderValue(cfg.apiKey));
  if (!hasOAuth && !hasApiKey) {
    missing.push('ANGOLA_PSP_API_KEY (ou ANGOLA_PSP_OAUTH_TOKEN_URL + CLIENT_ID + CLIENT_SECRET)');
  }
  if (!cfg.merchantId || isPlaceholderValue(cfg.merchantId)) {
    missing.push('ANGOLA_PSP_MERCHANT_ID');
  }
  return missing;
}

function normalizeAngolaPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('244') && digits.length === 12) {
    return digits.slice(3);
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    return digits;
  }
  return digits;
}

function mapPspStatus(raw: unknown): 'pending' | 'credited' | 'failed' {
  const val = String(raw || '').trim().toLowerCase();
  if (
    val === 'settled' ||
    val === 'completed' ||
    val === 'paid' ||
    val === 'success' ||
    val === 'succeeded' ||
    val === 'credited' ||
    val === 'approved'
  ) {
    return 'credited';
  }
  if (
    val === 'failed' ||
    val === 'rejected' ||
    val === 'canceled' ||
    val === 'cancelled' ||
    val === 'error' ||
    val === 'expired'
  ) {
    return 'failed';
  }
  return 'pending';
}

async function resolveAuthHeaders(cfg: PspConfig): Promise<Record<string, string>> {
  if (cfg.oauthTokenUrl && cfg.clientId && cfg.clientSecret) {
    const now = Date.now();
    if (cachedOAuthToken && cachedOAuthToken.expiresAt > now + 15000) {
      return {
        Authorization: `Bearer ${cachedOAuthToken.token}`,
        'Content-Type': 'application/json',
      };
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    });

    const tokenRes = await fetch(cfg.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(
        `Falha na autenticação OAuth2 do PSP (${tokenRes.status}): ${errText.slice(0, 200)}`
      );
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string; expires_in?: number };
    if (!tokenJson.access_token) {
      throw new Error('OAuth2 do PSP não retornou access_token válido.');
    }

    cachedOAuthToken = {
      token: tokenJson.access_token,
      expiresAt: now + (Number(tokenJson.expires_in) || 300) * 1000,
    };

    return {
      Authorization: `Bearer ${tokenJson.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  if (cfg.provider === 'proxypay') {
    return {
      Authorization: `Token ${cfg.apiKey}`,
      Accept: 'application/vnd.proxypay.v2+json',
      'Content-Type': 'application/json',
    };
  }

  return {
    Authorization: `Bearer ${cfg.apiKey}`,
    'X-Api-Key': cfg.apiKey,
    'Content-Type': 'application/json',
  };
}

function recordLedger(entry: ServerSettlementRecord, eventName: 'charge_created' | 'payout_created') {
  serverLedger.unshift(entry);
  if (serverLedger.length > 100) {
    serverLedger.length = 100;
  }
  saveLedgerToDisk(serverLedger);
  broadcastSseEvent(eventName, { record: entry, ledger: serverLedger });
}

function formatPayloadSnippet(input: unknown): string {
  try {
    const serialized = typeof input === 'string' ? input : JSON.stringify(input ?? {}, null, 2);
    return serialized.length > 1200 ? `${serialized.slice(0, 1200)}\n...` : serialized;
  } catch {
    return '{}';
  }
}

function recordWebhookLog(entry: WebhookMonitorLog) {
  webhookLogs.unshift(entry);
  if (webhookLogs.length > 100) {
    webhookLogs.length = 100;
  }
  saveJsonArray(WEBHOOK_LOGS_FILE, webhookLogs);
  broadcastSseEvent('webhook_log', { log: entry, logs: webhookLogs });
}

function recordRequestLog(entry: HttpRequestLog) {
  requestLogs.unshift(entry);
  if (requestLogs.length > 120) {
    requestLogs.length = 120;
  }
  saveJsonArray(REQUEST_LOGS_FILE, requestLogs);
  broadcastSseEvent('request_log', { requestLog: entry, requestLogs });
}

function shouldTrackRequestPath(reqPath: string): boolean {
  if (
    reqPath === '/api/multicaixa-express/stream' ||
    reqPath === '/api/webhooks/angola-psp/logs' ||
    reqPath === '/api/request-logs'
  ) {
    return false;
  }
  return (
    reqPath.startsWith('/api/angola-psp') ||
    reqPath.startsWith('/api/multicaixa-express') ||
    reqPath.startsWith('/api/webhooks/angola-psp') ||
    reqPath.startsWith('/api/webhooks/br-gateway') ||
    reqPath.startsWith('/api/br-gateway') ||
    reqPath.startsWith('/api/webhook-subscriptions') ||
    reqPath.startsWith('/api/sales')
  );
}

async function createApp() {
  const app = express();

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  app.use((req: Request, res: Response, next) => {
    if (!shouldTrackRequestPath(req.path) || req.headers['x-skip-webhook-log'] === 'true') {
      next();
      return;
    }

    const startedAt = Date.now();
    res.on('finish', () => {
      const statusCode =
        typeof res.locals.loggedStatusCode === 'number'
          ? (res.locals.loggedStatusCode as number)
          : res.statusCode;
      const endpointUrl =
        typeof res.locals.loggedEndpointUrl === 'string'
          ? (res.locals.loggedEndpointUrl as string)
          : req.originalUrl || req.path;
      const provider =
        typeof res.locals.loggedProvider === 'string'
          ? (res.locals.loggedProvider as string)
          : req.path.includes('br-gateway')
          ? brGatewayConfig.provider
          : readPspConfig().provider;
      const errorSummary =
        typeof res.locals.loggedErrorSummary === 'string'
          ? (res.locals.loggedErrorSummary as string)
          : statusCode >= 400
          ? `HTTP ${statusCode} devolvido em ${req.method} ${endpointUrl}`
          : undefined;

      recordRequestLog({
        id: `reqlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        method: req.method,
        endpointUrl,
        statusCode,
        latencyMs: Math.max(1, Date.now() - startedAt),
        provider,
        errorSummary,
      });
    });

    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/angola-psp/status', (_req: Request, res: Response) => {
    const cfg = readPspConfig();
    const missingEnvVars = getMissingEnvVars(cfg);
    const warnings = getPspConfigWarnings(cfg);
    const configured = missingEnvVars.length === 0 && warnings.length === 0;

    res.json({
      configured,
      provider: cfg.provider,
      mode: cfg.mode,
      hasWebhookSecret: Boolean(cfg.webhookSecret && !isPlaceholderValue(cfg.webhookSecret)),
      hasPayoutEndpoint: Boolean(cfg.payoutEndpoint || cfg.apiBaseUrl),
      missingEnvVars,
      warnings,
    });
  });

  // Authenticated PSP connection probe (validates .env credentials, OAuth2 token exchange, or account status endpoint)
  app.post('/api/angola-psp/validate-connection', async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const cfg = readPspConfig();
    const body = (req.body || {}) as {
      provider?: AngolaPspProvider;
      mode?: PspMode;
    };

    const missingEnvVars = getMissingEnvVars(cfg);
    const warnings = getPspConfigWarnings(cfg);
    const usesOAuth = Boolean(
      cfg.oauthTokenUrl &&
        !isPlaceholderValue(cfg.oauthTokenUrl) &&
        cfg.clientId &&
        !isPlaceholderValue(cfg.clientId) &&
        cfg.clientSecret &&
        !isPlaceholderValue(cfg.clientSecret)
    );
    const authMethod = usesOAuth
      ? 'OAuth2 Client Credentials'
      : cfg.provider === 'proxypay'
      ? 'Token API Key (ProxyPay)'
      : cfg.apiKey && !isPlaceholderValue(cfg.apiKey)
      ? 'Bearer / X-Api-Key'
      : 'Credenciais pendentes';

    const finishWithResult = (result: {
      ok: boolean;
      connected: boolean;
      statusLabel: 'Conectado com Sucesso' | 'Erro de Credenciais';
      httpStatus: number;
      testedUrl: string;
      message: string;
      extraMissing?: string[];
      extraWarnings?: string[];
    }) => {
      const latencyMs = Math.max(1, Date.now() - startedAt);
      const checkedAt = new Date().toISOString();

      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: checkedAt,
        provider: cfg.provider,
        source: 'test_probe',
        eventType: 'connection_test',
        outcome: result.connected ? 'success' : 'error',
        httpStatus: result.httpStatus,
        signatureValid: null,
        reference: `PSP-AUTH-${Date.now()}`,
        transactionKind: 'unknown',
        channel: 'PSP_AUTH_CHECK',
        latencyMs,
        endpointUrl: result.testedUrl,
        message: `${result.statusLabel}: ${result.message}`,
        payloadSnippet: formatPayloadSnippet({
          provider: cfg.provider,
          mode: cfg.mode,
          authMethod,
          testedUrl: result.testedUrl,
          httpStatus: result.httpStatus,
          latencyMs,
          connected: result.connected,
        }),
      });

      res.locals.loggedStatusCode = result.httpStatus;
      res.locals.loggedEndpointUrl = result.testedUrl;
      res.locals.loggedProvider = cfg.provider;
      if (!result.connected) {
        res.locals.loggedErrorSummary = `${result.statusLabel} — ${result.message}`;
      }

      res.status(200).json({
        ok: result.ok,
        connected: result.connected,
        statusLabel: result.statusLabel,
        provider: cfg.provider,
        mode: cfg.mode,
        authMethod,
        testedUrl: result.testedUrl,
        httpStatus: result.httpStatus,
        latencyMs,
        message: result.message,
        missingEnvVars: result.extraMissing,
        warnings: result.extraWarnings,
        checkedAt,
      });
    };

    if (
      body.provider &&
      body.provider !== cfg.provider &&
      Boolean(process.env.ANGOLA_PSP_PROVIDER)
    ) {
      warnings.push(
        `O servidor está configurado para o provedor "${cfg.provider.toUpperCase()}", mas no assistente selecionou "${body.provider.toUpperCase()}".`
      );
    }

    if (missingEnvVars.length > 0 || warnings.length > 0) {
      const reasonParts: string[] = [];
      if (missingEnvVars.length > 0) {
        reasonParts.push(`Variáveis em falta no servidor: ${missingEnvVars.join(', ')}.`);
      }
      if (warnings.length > 0) {
        reasonParts.push(warnings.join(' '));
      }
      const safePreviewUrl = [cfg.oauthTokenUrl, cfg.apiBaseUrl].find((candidate) => {
        if (!candidate) return false;
        try {
          const parsed = new URL(candidate);
          return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
          return false;
        }
      });
      finishWithResult({
        ok: false,
        connected: false,
        statusLabel: 'Erro de Credenciais',
        httpStatus: 401,
        testedUrl: safePreviewUrl || '/api/angola-psp/validate-connection',
        message: reasonParts.join(' '),
        extraMissing: missingEnvVars,
        extraWarnings: warnings,
      });
      return;
    }

    let authHeaders: Record<string, string>;
    let verifiedOAuth = false;

    if (usesOAuth) {
      const oauthController = new AbortController();
      const oauthTimer = setTimeout(() => oauthController.abort(), 8000);
      try {
        const bodyParams = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
        });
        const tokenRes = await fetch(cfg.oauthTokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyParams.toString(),
          signal: oauthController.signal,
        });
        clearTimeout(oauthTimer);

        const tokenText = await tokenRes.text();
        let tokenJson: { access_token?: string; expires_in?: number; error_description?: string; error?: string } = {};
        try {
          tokenJson = tokenText ? (JSON.parse(tokenText) as typeof tokenJson) : {};
        } catch {
          tokenJson = {};
        }

        if (!tokenRes.ok || !tokenJson.access_token) {
          finishWithResult({
            ok: false,
            connected: false,
            statusLabel: 'Erro de Credenciais',
            httpStatus: tokenRes.status || 401,
            testedUrl: cfg.oauthTokenUrl,
            message:
              tokenJson.error_description ||
              tokenJson.error ||
              `O endpoint OAuth2 rejeitou Client ID / Client Secret (HTTP ${tokenRes.status}).`,
          });
          return;
        }

        cachedOAuthToken = {
          token: tokenJson.access_token,
          expiresAt: Date.now() + (Number(tokenJson.expires_in) || 300) * 1000,
        };
        verifiedOAuth = true;
        authHeaders = {
          Authorization: `Bearer ${tokenJson.access_token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        };
      } catch (err) {
        clearTimeout(oauthTimer);
        const errMsg =
          err instanceof Error && err.name === 'AbortError'
            ? 'Tempo limite excedido (8s) ao autenticar no servidor OAuth2.'
            : err instanceof Error
            ? err.message
            : 'Falha de rede ao contactar endpoint OAuth2.';
        finishWithResult({
          ok: false,
          connected: false,
          statusLabel: 'Erro de Credenciais',
          httpStatus: 502,
          testedUrl: cfg.oauthTokenUrl,
          message: errMsg,
        });
        return;
      }
    } else if (cfg.provider === 'proxypay') {
      authHeaders = {
        Authorization: `Token ${cfg.apiKey}`,
        Accept: 'application/vnd.proxypay.v2+json',
        'Content-Type': 'application/json',
      };
    } else {
      authHeaders = {
        Authorization: `Bearer ${cfg.apiKey}`,
        'X-Api-Key': cfg.apiKey,
        'X-Merchant-Id': cfg.merchantId,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
    }

    const baseTarget = cfg.apiBaseUrl || cfg.payoutEndpoint;
    const probePath =
      cfg.provider === 'proxypay'
        ? `${baseTarget}/payments`
        : cfg.provider === 'appypay'
        ? `${baseTarget}/charges?limit=1`
        : `${baseTarget}/status`;

    const probeController = new AbortController();
    const probeTimer = setTimeout(() => probeController.abort(), 8000);
    try {
      let apiRes = await fetch(probePath, {
        method: 'GET',
        headers: authHeaders,
        signal: probeController.signal,
      });
      let finalTestedUrl = probePath;

      if (apiRes.status === 404 && baseTarget && finalTestedUrl !== baseTarget) {
        apiRes = await fetch(baseTarget, {
          method: 'GET',
          headers: authHeaders,
          signal: probeController.signal,
        });
        finalTestedUrl = baseTarget;
      }
      clearTimeout(probeTimer);

      if (apiRes.status === 401 || apiRes.status === 403) {
        finishWithResult({
          ok: false,
          connected: false,
          statusLabel: 'Erro de Credenciais',
          httpStatus: apiRes.status,
          testedUrl: finalTestedUrl,
          message: `Credenciais rejeitadas pelo gateway ${cfg.provider.toUpperCase()} (HTTP ${apiRes.status}). Verifique API Key, Token e Merchant ID.`,
        });
        return;
      }

      if (apiRes.ok || (verifiedOAuth && apiRes.status < 500 && apiRes.status !== 401 && apiRes.status !== 403)) {
        finishWithResult({
          ok: true,
          connected: true,
          statusLabel: 'Conectado com Sucesso',
          httpStatus: verifiedOAuth && !apiRes.ok ? 200 : apiRes.status,
          testedUrl: verifiedOAuth && !apiRes.ok ? cfg.oauthTokenUrl : finalTestedUrl,
          message: verifiedOAuth
            ? `Autenticação OAuth2 e acesso ao gateway ${cfg.provider.toUpperCase()} (${cfg.mode.toUpperCase()}) validados com sucesso.`
            : `Consulta autenticada ao gateway ${cfg.provider.toUpperCase()} (${cfg.mode.toUpperCase()}) confirmada com HTTP ${apiRes.status}.`,
        });
        return;
      }

      finishWithResult({
        ok: false,
        connected: false,
        statusLabel: 'Erro de Credenciais',
        httpStatus: apiRes.status,
        testedUrl: finalTestedUrl,
        message: `O endpoint do PSP devolveu HTTP ${apiRes.status}. Confirme o URL base (${cfg.mode.toUpperCase()}) e as permissões da conta comerciante.`,
      });
    } catch (err) {
      clearTimeout(probeTimer);
      if (verifiedOAuth) {
        finishWithResult({
          ok: true,
          connected: true,
          statusLabel: 'Conectado com Sucesso',
          httpStatus: 200,
          testedUrl: cfg.oauthTokenUrl,
          message: `Token OAuth2 emitido com sucesso para ${cfg.provider.toUpperCase()} (${cfg.mode.toUpperCase()}), mas o endpoint de consulta de conta (${probePath}) não respondeu ao GET.`,
        });
        return;
      }
      const errMsg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Tempo limite excedido (8s) ao validar endpoint autenticado do PSP.'
          : err instanceof Error
          ? err.message
          : 'Falha de comunicação com o endpoint do PSP.';
      finishWithResult({
        ok: false,
        connected: false,
        statusLabel: 'Erro de Credenciais',
        httpStatus: 502,
        testedUrl: probePath,
        message: errMsg,
      });
    }
  });

  app.get('/api/multicaixa-express/ledger', (_req: Request, res: Response) => {
    res.json({ items: serverLedger });
  });

  // Real-time Server-Sent Events stream for live PSP settlements & webhook callbacks
  app.get('/api/multicaixa-express/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);
    res.write(
      `event: ledger_snapshot\ndata: ${JSON.stringify({
        ledger: serverLedger,
        orders: salesOrders,
        logs: webhookLogs,
        requestLogs,
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    const keepAlive = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Create a Multicaixa Express payment charge (GPO / customer payment collection)
  app.post('/api/multicaixa-express/charges', async (req: Request, res: Response) => {
    const cfg = readPspConfig();
    const missingEnvVars = getMissingEnvVars(cfg);
    if (missingEnvVars.length > 0) {
      res.status(503).json({
        success: false,
        code: 'PSP_NOT_CONFIGURED',
        error: 'Credenciais oficiais do PSP angolano não estão configuradas no servidor.',
        missingEnvVars,
      });
      return;
    }

    const { amountAOA, phone, reference, description, customerEmail } = req.body as {
      amountAOA?: number;
      phone?: string;
      reference?: string;
      description?: string;
      customerEmail?: string;
    };

    const normalizedPhone = normalizeAngolaPhone(String(phone || ''));
    const numericAmount = Number(amountAOA);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ success: false, error: 'Informe um valor válido em AOA.' });
      return;
    }
    if (normalizedPhone.length !== 9 || !normalizedPhone.startsWith('9')) {
      res.status(400).json({
        success: false,
        error:
          'Número Multicaixa Express inválido. Utilize 9 dígitos angolanos (ex: 923456789).',
      });
      return;
    }

    const merchantTxId = reference || `MH-CHG-${Date.now()}`;
    const targetUrl = `${cfg.apiBaseUrl}/charges`;

    try {
      const headers = await resolveAuthHeaders(cfg);
      const payload =
        cfg.provider === 'appypay'
          ? {
              amount: Number(numericAmount.toFixed(2)),
              currency: 'AOA',
              description: description || 'Cobrança Multicaixa Express - Monetiza Hub',
              merchantTransactionId: merchantTxId,
              paymentMethod: 'GPO',
              paymentInfo: {
                phoneNumber: normalizedPhone,
              },
              customerEmail: customerEmail || undefined,
            }
          : {
              merchantId: cfg.merchantId,
              amount: Number(numericAmount.toFixed(2)),
              currency: 'AOA',
              reference: merchantTxId,
              phoneNumber: normalizedPhone,
              description: description || 'Cobrança Multicaixa Express',
              customerEmail: customerEmail || undefined,
            };

      const pspRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Idempotency-Key': merchantTxId,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await pspRes.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
      } catch {
        parsed = { raw: responseText };
      }

      if (!pspRes.ok) {
        res.status(pspRes.status).json({
          success: false,
          code: 'PSP_CHARGE_REJECTED',
          error:
            (parsed.message as string) ||
            (parsed.error as string) ||
            `Erro do PSP ao iniciar cobrança GPO (${pspRes.status}).`,
          details: parsed,
        });
        return;
      }

      const pspTransactionId = String(parsed.id || parsed.transactionId || merchantTxId);
      const mappedStatus = mapPspStatus(parsed.status);
      const nowIso = new Date().toISOString();
      const record: ServerSettlementRecord = {
        id: `srv-chg-${Date.now()}`,
        kind: 'charge',
        provider: cfg.provider,
        mode: cfg.mode,
        reference: merchantTxId,
        pspTransactionId,
        amountAOA: Number(numericAmount.toFixed(2)),
        phone: `+244 ${normalizedPhone}`,
        status: mappedStatus,
        createdAt: nowIso,
        updatedAt: nowIso,
        message:
          mappedStatus === 'credited'
            ? 'Cobrança Multicaixa Express confirmada pelo PSP.'
            : 'Pedido GPO enviado para confirmação no aplicativo Multicaixa Express do cliente.',
      };
      recordLedger(record, 'charge_created');

      res.json({
        success: true,
        charge: record,
        pspResponse: parsed,
      });
    } catch (err) {
      res.status(502).json({
        success: false,
        code: 'PSP_NETWORK_ERROR',
        error: err instanceof Error ? err.message : 'Falha de comunicação com o gateway PSP.',
      });
    }
  });

  // Execute real payout / transfer via configured Angolan PSP
  app.post('/api/multicaixa-express/payouts', async (req: Request, res: Response) => {
    const cfg = readPspConfig();
    const missingEnvVars = getMissingEnvVars(cfg);
    if (missingEnvVars.length > 0) {
      res.status(503).json({
        success: false,
        code: 'PSP_NOT_CONFIGURED',
        error:
          'Nenhuma credencial oficial de PSP angolano (EMIS / AppyPay / ProxyPay) foi configurada no servidor.',
        missingEnvVars,
      });
      return;
    }

    const { amountAOA, phone, bankName, iban, reference, beneficiaryName } = req.body as {
      amountAOA?: number;
      phone?: string;
      bankName?: string;
      iban?: string;
      reference?: string;
      beneficiaryName?: string;
    };

    const normalizedPhone = normalizeAngolaPhone(String(phone || ''));
    const numericAmount = Number(amountAOA);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ success: false, error: 'Valor de saque em AOA inválido.' });
      return;
    }
    if (normalizedPhone.length !== 9 || !normalizedPhone.startsWith('9')) {
      res.status(400).json({
        success: false,
        error: 'Número de telefone angolano inválido. Informe 9 dígitos (ex: +244 923 456 789).',
      });
      return;
    }

    const merchantReference = reference || `MH-PAY-${Date.now()}`;
    const targetUrl = cfg.payoutEndpoint || `${cfg.apiBaseUrl}/payouts`;

    try {
      const headers = await resolveAuthHeaders(cfg);
      const payload = {
        merchantId: cfg.merchantId,
        merchantTransactionId: merchantReference,
        amount: Number(numericAmount.toFixed(2)),
        currency: 'AOA',
        channel: 'MULTICAIXA_EXPRESS',
        destination: {
          phoneNumber: normalizedPhone,
          bankName: bankName || 'Banco BAI Angola',
          iban: iban ? iban.replace(/\s+/g, '').toUpperCase() : undefined,
          beneficiaryName: beneficiaryName || 'Titular da Conta',
        },
      };

      const pspRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Idempotency-Key': merchantReference,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await pspRes.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
      } catch {
        parsed = { raw: responseText };
      }

      if (!pspRes.ok) {
        const errorMsg =
          (parsed.message as string) ||
          (parsed.error as string) ||
          `O provedor PSP recusou o saque (${pspRes.status}). Verifique saldo na conta comerciante e dados do destinatário.`;

        recordWebhookLog({
          id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          provider: cfg.provider,
          source: 'payout_dispatch',
          eventType: 'payout_rejected',
          outcome: 'error',
          httpStatus: pspRes.status,
          signatureValid: null,
          reference: merchantReference,
          transactionKind: 'payout',
          amountAOA: Number(numericAmount.toFixed(2)),
          channel: 'MULTICAIXA_EXPRESS',
          message: errorMsg,
          payloadSnippet: formatPayloadSnippet(parsed),
        });

        res.status(pspRes.status).json({
          success: false,
          code: 'PSP_PAYOUT_REJECTED',
          error: errorMsg,
          details: parsed,
        });
        return;
      }

      const mappedStatus = mapPspStatus(parsed.status);
      const pspTransactionId = String(
        parsed.id || parsed.transactionId || parsed.emisReference || merchantReference
      );
      const nowIso = new Date().toISOString();

      const record: ServerSettlementRecord = {
        id: `srv-pay-${Date.now()}`,
        kind: 'payout',
        provider: cfg.provider,
        mode: cfg.mode,
        reference: merchantReference,
        pspTransactionId,
        amountAOA: Number(numericAmount.toFixed(2)),
        phone: `+244 ${normalizedPhone}`,
        bankName: bankName || 'Banco BAI Angola',
        iban: iban ? iban.replace(/\s+/g, '').toUpperCase() : undefined,
        status: mappedStatus,
        createdAt: nowIso,
        updatedAt: nowIso,
        message:
          mappedStatus === 'credited'
            ? 'Transferência confirmada pelo provedor PSP.'
            : 'Ordem enviada ao provedor PSP. Aguardando confirmação de liquidação (webhook).',
      };
      recordLedger(record, 'payout_created');

      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowIso,
        provider: cfg.provider,
        source: 'payout_dispatch',
        eventType: mappedStatus === 'failed' ? 'payout_rejected' : 'payout_submitted',
        outcome: mappedStatus === 'failed' ? 'error' : 'success',
        httpStatus: pspRes.status,
        signatureValid: null,
        reference: merchantReference,
        transactionKind: 'payout',
        amountAOA: Number(numericAmount.toFixed(2)),
        channel: 'MULTICAIXA_EXPRESS',
        message: record.message,
        payloadSnippet: formatPayloadSnippet(parsed),
      });

      res.json({
        success: true,
        payout: record,
        pspResponse: parsed,
      });
    } catch (err) {
      const netErrMsg = err instanceof Error ? err.message : 'Erro de rede ao contactar o provedor PSP.';
      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        provider: cfg.provider,
        source: 'payout_dispatch',
        eventType: 'payout_rejected',
        outcome: 'error',
        httpStatus: 502,
        signatureValid: null,
        reference: merchantReference,
        transactionKind: 'payout',
        amountAOA: Number(numericAmount.toFixed(2)),
        channel: 'MULTICAIXA_EXPRESS',
        message: netErrMsg,
        payloadSnippet: formatPayloadSnippet({ error: netErrMsg }),
      });

      res.status(502).json({
        success: false,
        code: 'PSP_NETWORK_ERROR',
        error: netErrMsg,
      });
    }
  });

  // Query live transaction status & reconcile local ledger + SSE broadcast
  app.get('/api/multicaixa-express/transactions/:id', async (req: Request, res: Response) => {
    const txId = String(req.params.id || '');
    const localMatch = serverLedger.find(
      (item) => item.pspTransactionId === txId || item.reference === txId || item.id === txId
    );
    const cfg = readPspConfig();
    const missingEnvVars = getMissingEnvVars(cfg);

    if (missingEnvVars.length > 0 || !cfg.apiBaseUrl) {
      if (localMatch) {
        res.json({ success: true, transaction: localMatch });
        return;
      }
      res.status(404).json({ success: false, error: 'Transação não encontrada.' });
      return;
    }

    try {
      const headers = await resolveAuthHeaders(cfg);
      const statusRes = await fetch(`${cfg.apiBaseUrl}/transactions/${encodeURIComponent(txId)}`, {
        headers,
      });
      const data = (await statusRes.json().catch(() => ({}))) as Record<string, unknown>;

      if (statusRes.ok && localMatch && data.status) {
        const reconciled = mapPspStatus(data.status);
        if (reconciled !== localMatch.status) {
          localMatch.status = reconciled;
          localMatch.updatedAt = new Date().toISOString();
          localMatch.message =
            reconciled === 'credited'
              ? 'Estado reconciliado via consulta ao PSP: Liquidado.'
              : reconciled === 'failed'
              ? 'Estado reconciliado via consulta ao PSP: Rejeitado.'
              : localMatch.message;
          saveLedgerToDisk(serverLedger);
          broadcastSseEvent('settlement_updated', { record: localMatch, ledger: serverLedger });
        }
      }

      res.status(statusRes.status).json({
        success: statusRes.ok,
        transaction: localMatch || null,
        pspTransaction: data,
      });
    } catch (err) {
      res.status(502).json({
        success: false,
        error: err instanceof Error ? err.message : 'Falha ao consultar estado no PSP.',
      });
    }
  });

  // Fetch persisted webhook monitor logs
  app.get('/api/webhooks/angola-psp/logs', (_req: Request, res: Response) => {
    res.json({ items: webhookLogs });
  });

  // Clear webhook monitor logs
  app.delete('/api/webhooks/angola-psp/logs', (_req: Request, res: Response) => {
    webhookLogs.length = 0;
    saveJsonArray(WEBHOOK_LOGS_FILE, webhookLogs);
    broadcastSseEvent('webhook_logs_cleared', { logs: [] });
    res.json({ cleared: true });
  });

  // Fetch & clear HTTP request logs for PspConfigurationWizard
  app.get('/api/request-logs', (_req: Request, res: Response) => {
    res.json({ items: requestLogs });
  });

  app.delete('/api/request-logs', (_req: Request, res: Response) => {
    requestLogs.length = 0;
    saveJsonArray(REQUEST_LOGS_FILE, requestLogs);
    broadcastSseEvent('request_logs_cleared', { requestLogs: [] });
    res.json({ cleared: true });
  });

  // Dispatch a real HTTP POST test against /api/webhooks/angola-psp for AppyPay / ProxyPay / EMIS GPO
  app.post('/api/webhooks/angola-psp/test', async (req: Request, res: Response) => {
    const cfg = readPspConfig();
    const {
      provider = 'appypay',
      scenario = 'payout_success',
      reference,
      amountAOA = 15000,
    } = (req.body || {}) as {
      provider?: 'appypay' | 'proxypay' | 'emis_gpo';
      scenario?: 'payout_success' | 'payout_error' | 'invalid_signature';
      reference?: string;
      amountAOA?: number;
    };

    const testRef = (reference || '').trim() || `MH-TEST-${Date.now()}`;
    const testAmount = Number.isFinite(Number(amountAOA)) && Number(amountAOA) > 0 ? Number(amountAOA) : 15000;
    const isErrorStatus = scenario === 'payout_error';

    let payload: Record<string, unknown>;
    if (provider === 'proxypay') {
      payload = {
        id: Math.floor(100000000 + Math.random() * 900000000),
        reference_id: testRef,
        amount: testAmount.toFixed(2),
        datetime: new Date().toISOString(),
        status: isErrorStatus ? 'failed' : 'paid',
        channel: 'MULTICAIXA_EXPRESS',
        transactionKind: 'payout',
        custom_fields: {
          channel: 'MULTICAIXA_EXPRESS',
          origin: 'webhook_test',
          provider: 'proxypay',
        },
        ...(isErrorStatus
          ? { error: 'ProxyPay: Conta de destino ou referência recusada pelo banco.' }
          : {}),
      };
    } else if (provider === 'emis_gpo') {
      payload = {
        id: `EMIS-${Date.now()}`,
        merchantTransactionId: testRef,
        amount: testAmount,
        currency: 'AOA',
        channel: 'MULTICAIXA_EXPRESS',
        transactionKind: 'payout',
        status: isErrorStatus ? 'rejected' : 'settled',
        message: isErrorStatus
          ? 'EMIS GPO: Transação rejeitada durante validação bancária.'
          : 'EMIS GPO: Liquidação confirmada no canal Multicaixa Express.',
      };
    } else {
      payload = {
        id: `APPY-${Date.now()}`,
        merchantTransactionId: testRef,
        amount: testAmount,
        currency: 'AOA',
        channel: 'MULTICAIXA_EXPRESS',
        transactionKind: 'payout',
        status: isErrorStatus ? 'failed' : 'settled',
        responseStatus: {
          successful: !isErrorStatus,
          status: isErrorStatus ? 'Failed' : 'Success',
          code: isErrorStatus ? 422 : 200,
          message: isErrorStatus
            ? 'AppyPay: Falha no repasse Multicaixa Express (saldo insuficiente ou IBAN inválido).'
            : 'AppyPay: Liquidação Multicaixa Express concluída com sucesso.',
        },
      };
    }

    const rawBody = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Test': 'true',
      'X-Webhook-Provider': provider,
    };

    if (scenario === 'invalid_signature') {
      headers['x-psp-signature'] = 'sha256=invalid_test_signature_000000';
    } else if (cfg.webhookSecret) {
      const hmac = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody).digest('hex');
      headers['x-psp-signature'] = `sha256=${hmac}`;
      if (provider === 'proxypay') {
        headers['x-proxypay-signature'] = hmac;
      }
    }

    const port = Number(process.env.PORT) || 3000;
    try {
      const loopRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/angola-psp`, {
        method: 'POST',
        headers,
        body: rawBody,
      });
      const responseJson = await loopRes.json().catch(() => ({}));
      res.status(200).json({
        ok: loopRes.ok,
        httpStatus: loopRes.status,
        provider,
        scenario,
        reference: testRef,
        hmacUsed: Boolean(cfg.webhookSecret),
        response: responseJson,
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        httpStatus: 502,
        error: err instanceof Error ? err.message : 'Falha ao disparar teste local de webhook.',
      });
    }
  });

  // Test connection to a user-provided AppyPay / PSP Webhook Endpoint URL by dispatching a real callback ping
  app.post('/api/webhooks/angola-psp/test-connection', async (req: Request, res: Response) => {
    const cfg = readPspConfig();
    const { endpointUrl, provider = 'appypay' } = (req.body || {}) as {
      endpointUrl?: string;
      provider?: 'appypay' | 'proxypay' | 'emis_gpo';
    };

    const rawInput = String(endpointUrl || '').trim();
    if (!rawInput) {
      res.status(400).json({
        ok: false,
        httpStatus: 400,
        error: 'Informe o Endpoint de Webhook completo (ex: https://seu-dominio.com/api/webhooks/angola-psp).',
      });
      return;
    }

    const port = Number(process.env.PORT) || 3000;
    const reqHostname = String(req.hostname || '').toLowerCase();

    let parsedUrl: URL;
    try {
      parsedUrl = rawInput.startsWith('/')
        ? new URL(rawInput, `http://127.0.0.1:${port}`)
        : new URL(rawInput);
    } catch {
      res.status(400).json({
        ok: false,
        httpStatus: 400,
        error: 'URL inválido. Utilize um endereço HTTP/HTTPS válido terminado em /api/webhooks/angola-psp.',
      });
      return;
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      res.status(400).json({
        ok: false,
        httpStatus: 400,
        error: 'Apenas URLs HTTP ou HTTPS são suportados para callbacks de webhook.',
      });
      return;
    }

    const host = parsedUrl.hostname.toLowerCase();
    const isThisAppWebhookPath = parsedUrl.pathname.replace(/\/+$/, '') === '/api/webhooks/angola-psp';
    const isLocalSelfHost =
      (host === 'localhost' || host === '127.0.0.1') &&
      (!parsedUrl.port || Number(parsedUrl.port) === port);
    const isKnownAppHost =
      isLocalSelfHost ||
      host === reqHostname ||
      host.startsWith('ais-dev-') ||
      host.startsWith('ais-pre-');

    // SSRF guard for external URLs
    const isBlockedPrivateHost =
      !isLocalSelfHost &&
      (host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.endsWith('.internal') ||
        host.endsWith('.local') ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host));

    if (isBlockedPrivateHost) {
      res.status(400).json({
        ok: false,
        httpStatus: 400,
        error: 'Endereço privado ou interno não permitido para testes externos de webhook.',
      });
      return;
    }

    const pingRef = `MH-PING-${Date.now()}`;
    const pingPayload =
      provider === 'proxypay'
        ? {
            id: Math.floor(100000000 + Math.random() * 900000000),
            reference_id: pingRef,
            amount: '5000.00',
            datetime: new Date().toISOString(),
            status: 'paid',
            channel: 'MULTICAIXA_EXPRESS',
            transactionKind: 'charge',
            custom_fields: { origin: 'connection_ping', provider: 'proxypay' },
          }
        : {
            id: `APPY-PING-${Date.now()}`,
            merchantTransactionId: pingRef,
            event: 'payment.paid',
            transactionKind: 'charge',
            amount: 5000,
            currency: 'AOA',
            channel: 'MULTICAIXA_EXPRESS',
            status: 'settled',
            responseStatus: {
              successful: true,
              status: 'Success',
              code: 200,
              message: `Ping real de callback (${provider.toUpperCase()}): evento de pagamento capturado pelo servidor.`,
            },
          };

    const rawBody = JSON.stringify(pingPayload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Test': 'true',
      'X-Webhook-Provider': provider,
      'X-Skip-Webhook-Log': 'true',
    };

    if (cfg.webhookSecret) {
      const hmac = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody).digest('hex');
      headers['x-psp-signature'] = `sha256=${hmac}`;
      if (provider === 'proxypay') {
        headers['x-proxypay-signature'] = hmac;
      }
    }

    const fetchTarget =
      isKnownAppHost && isThisAppWebhookPath
        ? `http://127.0.0.1:${port}/api/webhooks/angola-psp`
        : parsedUrl.toString();

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    try {
      const targetRes = await fetch(fetchTarget, {
        method: 'POST',
        headers,
        body: rawBody,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const latencyMs = Date.now() - startedAt;
      const text = await targetRes.text();
      let parsedResp: Record<string, unknown> = {};
      try {
        parsedResp = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        parsedResp = { raw: text.slice(0, 240) };
      }

      const captured = Boolean(targetRes.ok && (parsedResp.received === true || isThisAppWebhookPath));
      const isDevHostname = host.startsWith('ais-dev-');

      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        provider,
        source: 'test_probe',
        eventType: 'connection_test',
        outcome: targetRes.ok ? 'success' : 'error',
        httpStatus: targetRes.status,
        signatureValid: cfg.webhookSecret ? targetRes.status !== 401 : null,
        reference: pingRef,
        transactionKind: 'charge',
        amountAOA: 5000,
        channel: 'MULTICAIXA_EXPRESS',
        latencyMs,
        endpointUrl: parsedUrl.toString(),
        message: targetRes.ok
          ? `Ping de conexão capturado por ${parsedUrl.origin}${parsedUrl.pathname} (${latencyMs}ms).`
          : `Endpoint ${parsedUrl.origin}${parsedUrl.pathname} respondeu HTTP ${targetRes.status} (${latencyMs}ms).`,
        payloadSnippet: formatPayloadSnippet({
          testedUrl: parsedUrl.toString(),
          httpStatus: targetRes.status,
          latencyMs,
          captured,
          response: parsedResp,
        }),
      });

      res.locals.loggedStatusCode = targetRes.status;
      res.locals.loggedEndpointUrl = parsedUrl.toString();
      res.locals.loggedProvider = provider;
      if (!targetRes.ok) {
        res.locals.loggedErrorSummary = `Endpoint respondeu HTTP ${targetRes.status} (${latencyMs}ms).`;
      }

      res.status(200).json({
        ok: targetRes.ok,
        captured,
        httpStatus: targetRes.status,
        latencyMs,
        reference: pingRef,
        testedUrl: parsedUrl.toString(),
        hmacUsed: Boolean(cfg.webhookSecret),
        warning: isDevHostname
          ? 'O servidor local capturou o evento com sucesso, mas lembre-se de registar o URL público (ais-pre-... ou domínio próprio) no portal oficial da AppyPay para callbacks externos.'
          : !isThisAppWebhookPath
          ? 'O caminho informado não termina em /api/webhooks/angola-psp — confirme se o endpoint de destino processa callbacks JSON POST.'
          : undefined,
        response: parsedResp,
      });
    } catch (err) {
      clearTimeout(timer);
      const latencyMs = Date.now() - startedAt;
      const errMsg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Tempo limite excedido (6.5s) ao aguardar resposta do endpoint.'
          : err instanceof Error
          ? err.message
          : 'Não foi possível conectar ao Endpoint de Webhook informado.';

      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        provider,
        source: 'test_probe',
        eventType: 'connection_test',
        outcome: 'error',
        httpStatus: 502,
        signatureValid: null,
        reference: pingRef,
        transactionKind: 'charge',
        amountAOA: 5000,
        channel: 'MULTICAIXA_EXPRESS',
        latencyMs,
        endpointUrl: parsedUrl.toString(),
        message: `Falha ao testar Endpoint de Webhook (${parsedUrl.toString()}): ${errMsg}`,
        payloadSnippet: formatPayloadSnippet({
          testedUrl: parsedUrl.toString(),
          latencyMs,
          error: errMsg,
        }),
      });

      res.locals.loggedStatusCode = 502;
      res.locals.loggedEndpointUrl = parsedUrl.toString();
      res.locals.loggedProvider = provider;
      res.locals.loggedErrorSummary = errMsg;

      res.status(200).json({
        ok: false,
        captured: false,
        httpStatus: 502,
        latencyMs,
        reference: pingRef,
        testedUrl: parsedUrl.toString(),
        error: errMsg,
      });
    }
  });

  // Webhook verification endpoint (for browser checks and PSP GET/HEAD validation pings)
  app.get('/api/webhooks/angola-psp', (_req: Request, res: Response) => {
    const cfg = readPspConfig();
    const missingEnvVars = getMissingEnvVars(cfg);
    res.json({
      ok: true,
      endpoint: '/api/webhooks/angola-psp',
      methodExpected: 'POST',
      provider: cfg.provider,
      mode: cfg.mode,
      pspConfigured: missingEnvVars.length === 0,
      hmacVerificationRequired: Boolean(cfg.webhookSecret),
      missingEnvVars,
      message:
        'Endpoint de webhook ativo para callbacks POST dos PSPs angolanos (AppyPay, ProxyPay, EMIS GPO).',
    });
  });

  // Webhook endpoint for PSP asynchronous callbacks (AppyPay, ProxyPay, EMIS GPO)
  app.post('/api/webhooks/angola-psp', (req: Request, res: Response) => {
    const cfg = readPspConfig();
    const body = (req.body || {}) as Record<string, unknown>;
    const isTestProbe = req.headers['x-webhook-test'] === 'true';
    const skipWebhookLog = req.headers['x-skip-webhook-log'] === 'true';
    const headerProvider = String(req.headers['x-webhook-provider'] || '').trim().toLowerCase();
    const inferredProvider =
      headerProvider ||
      (body.reference_id !== undefined
        ? 'proxypay'
        : body.responseStatus !== undefined
        ? 'appypay'
        : cfg.provider);

    const signatureHeader = String(
      req.headers['x-psp-signature'] ||
        req.headers['x-signature'] ||
        req.headers['x-webhook-signature'] ||
        req.headers['x-proxypay-signature'] ||
        ''
    );

    const forceInvalidSignatureTest =
      isTestProbe && signatureHeader.includes('invalid_test_signature');

    let signatureValid: boolean | null = null;
    if (cfg.webhookSecret || forceInvalidSignatureTest) {
      const rawBody =
        (req as Request & { rawBody?: Buffer }).rawBody || Buffer.from(JSON.stringify(req.body || {}));
      const expected = crypto
        .createHmac('sha256', cfg.webhookSecret || 'test-secret-mismatch')
        .update(rawBody)
        .digest('hex');

      const sigBuf = Buffer.from(signatureHeader.replace(/^sha256=/, ''), 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      const isValid =
        !forceInvalidSignatureTest &&
        sigBuf.length === expBuf.length &&
        crypto.timingSafeEqual(sigBuf, expBuf);

      if (!isValid) {
        const refCandidate = String(
          body.merchantTransactionId ||
            body.reference_id ||
            body.reference ||
            body.transactionId ||
            body.id ||
            ''
        ).trim();
        if (!skipWebhookLog) {
          recordWebhookLog({
            id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            provider: inferredProvider,
            source: isTestProbe ? 'test_probe' : 'external_psp',
            eventType: 'webhook_received',
            outcome: 'error',
            httpStatus: 401,
            signatureValid: false,
            reference: refCandidate || null,
            transactionKind: 'payout',
            amountAOA: Number(body.amount ?? body.amountAOA ?? 0) || undefined,
            channel: String(body.channel || 'MULTICAIXA_EXPRESS'),
            message: 'Assinatura HMAC-SHA256 inválida ou ausente no cabeçalho do webhook.',
            payloadSnippet: formatPayloadSnippet(body),
          });
        }

        res.status(401).json({ received: false, error: 'Assinatura de webhook inválida.' });
        return;
      }
      signatureValid = true;
    }

    const responseStatusObj =
      body.responseStatus && typeof body.responseStatus === 'object'
        ? (body.responseStatus as Record<string, unknown>)
        : null;

    const refId = String(
      body.merchantTransactionId ||
        body.reference_id ||
        body.reference ||
        body.transactionId ||
        body.id ||
        ''
    ).trim();

    const rawStatus =
      responseStatusObj?.status ??
      (typeof responseStatusObj?.successful === 'boolean'
        ? responseStatusObj.successful
          ? 'paid'
          : 'failed'
        : undefined) ??
      body.status ??
      body.state ??
      (body.event === 'payment.paid' || body.event === 'charge.succeeded' ? 'paid' : undefined);

    const nextStatus = mapPspStatus(rawStatus);
    const numericAmount = Number(body.amount ?? body.amountAOA ?? 0);

    let updatedRecord: ServerSettlementRecord | null = null;
    let txKind: 'payout' | 'charge' | 'unknown' =
      body.transactionKind === 'payout' ? 'payout' : body.transactionKind === 'charge' ? 'charge' : 'unknown';

    if (refId) {
      const existing = serverLedger.find(
        (item) => item.reference === refId || item.pspTransactionId === refId
      );
      if (existing) {
        txKind = existing.kind;
        existing.status = nextStatus;
        existing.updatedAt = new Date().toISOString();
        existing.message =
          nextStatus === 'credited'
            ? 'Liquidação confirmada via webhook oficial do PSP.'
            : nextStatus === 'failed'
            ? 'Transação marcada como falha via webhook do PSP.'
            : existing.message;
        updatedRecord = existing;
        saveLedgerToDisk(serverLedger);
        broadcastSseEvent('settlement_updated', { record: existing, ledger: serverLedger });
      } else if (!isTestProbe && Number.isFinite(numericAmount) && numericAmount > 0) {
        txKind = body.transactionKind === 'payout' ? 'payout' : 'charge';
        const phoneDigits = normalizeAngolaPhone(
          String(body.phone || body.phoneNumber || body.customerPhone || '')
        );
        const nowIso = new Date().toISOString();
        const newRecord: ServerSettlementRecord = {
          id: `srv-wh-${Date.now()}`,
          kind: txKind,
          provider: inferredProvider,
          mode: cfg.mode,
          reference: refId,
          pspTransactionId: String(body.id || body.transactionId || refId),
          amountAOA: Number(numericAmount.toFixed(2)),
          phone: phoneDigits ? `+244 ${phoneDigits}` : 'Multicaixa Express',
          status: nextStatus,
          createdAt: nowIso,
          updatedAt: nowIso,
          message:
            nextStatus === 'credited'
              ? 'Pagamento recebido via webhook oficial do PSP.'
              : 'Notificação recebida via webhook do PSP.',
        };
        updatedRecord = newRecord;
        recordLedger(newRecord, txKind === 'payout' ? 'payout_created' : 'charge_created');
      }

      if (!isTestProbe) {
        const orderNextStatus =
          nextStatus === 'credited' ? 'approved' : nextStatus === 'failed' ? 'failed' : 'pending';
        reconcileOrderStatus(
          refId,
          orderNextStatus,
          nextStatus === 'credited'
            ? `Pagamento Multicaixa Express confirmado pelo webhook ${inferredProvider.toUpperCase()}.`
            : nextStatus === 'failed'
            ? `Cobrança Multicaixa Express rejeitada pelo PSP (${inferredProvider.toUpperCase()}).`
            : undefined
        );
      }
    }

    const customErrorMsg =
      (typeof responseStatusObj?.message === 'string' && responseStatusObj.message) ||
      (typeof body.error === 'string' && body.error) ||
      (typeof body.message === 'string' && body.message) ||
      '';

    const outcome: 'success' | 'error' = nextStatus === 'failed' ? 'error' : 'success';
    const logMessage =
      customErrorMsg ||
      (outcome === 'error'
        ? `Webhook ${inferredProvider.toUpperCase()} reportou falha na transação ${refId || 'sem referência'}.`
        : refId
        ? `Webhook ${inferredProvider.toUpperCase()} processado com sucesso (${nextStatus}).`
        : 'Ping de verificação de webhook recebido com sucesso.');

    if (!skipWebhookLog) {
      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        provider: inferredProvider,
        source: isTestProbe ? 'test_probe' : 'external_psp',
        eventType: txKind === 'payout' ? 'payout_webhook_update' : 'webhook_received',
        outcome,
        httpStatus: 200,
        signatureValid,
        reference: refId || null,
        transactionKind: txKind,
        amountAOA:
          updatedRecord?.amountAOA ||
          (Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : undefined),
        channel: String(body.channel || 'MULTICAIXA_EXPRESS'),
        message: logMessage,
        payloadSnippet: formatPayloadSnippet(body),
      });
    }

    res.json({
      received: true,
      testProbe: isTestProbe,
      updatedReference: refId || null,
      status: nextStatus,
      record: updatedRecord,
    });
  });

  // IAB Authorized Digital Sellers (/ads.txt)
  app.get('/ads.txt', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(buildAdsTxtContent(adServerConfig));
  });

  // Ad Mediation, Config, Campaigns & Format Telemetry endpoints (Banner, Interstitial, Rewarded Video, Native)
  app.get('/api/ads/mediation', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      ...adsTelemetry,
      campaigns: adCampaigns,
      config: adServerConfig,
      adsTxtPreview: buildAdsTxtContent(adServerConfig),
    });
  });

  app.put('/api/ads/config', (req: Request, res: Response) => {
    const body = (req.body || {}) as Partial<ServerAdConfigState>;
    adServerConfig = {
      ...adServerConfig,
      ...(typeof body.adsEnabled === 'boolean' ? { adsEnabled: body.adsEnabled } : {}),
      ...(typeof body.adRevenueShareCreatorPct === 'number' && Number.isFinite(body.adRevenueShareCreatorPct)
        ? { adRevenueShareCreatorPct: body.adRevenueShareCreatorPct }
        : {}),
      ...(body.adPlacementMode && ['minimal', 'balanced', 'high_yield'].includes(body.adPlacementMode)
        ? { adPlacementMode: body.adPlacementMode }
        : {}),
      adSettings: {
        ...adServerConfig.adSettings,
        ...(body.adSettings || {}),
      },
      networks:
        Array.isArray(body.networks) && body.networks.length > 0
          ? body.networks
          : adServerConfig.networks,
      updatedAt: new Date().toISOString(),
    };
    saveAdServerConfig(adServerConfig);
    res.json({
      ok: true,
      config: adServerConfig,
      adsTxtPreview: buildAdsTxtContent(adServerConfig),
    });
  });

  app.get('/api/ads/campaigns', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      campaigns: adCampaigns,
    });
  });

  app.post('/api/ads/campaigns', (req: Request, res: Response) => {
    const body = (req.body || {}) as Partial<ServerAdCampaignRecord>;
    const sponsorName = String(body.sponsorName || '').trim();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const ctaText = String(body.ctaText || 'Saiba Mais').trim();
    const ctaUrl = String(body.ctaUrl || 'https://monetizahub.app').trim();

    if (!sponsorName || !title) {
      res.status(400).json({
        ok: false,
        error: 'Informe o nome do patrocinador e o título do anúncio.',
      });
      return;
    }

    const format =
      body.format === 'banner' || body.format === 'native' || body.format === 'both'
        ? body.format
        : 'both';

    const campaign: ServerAdCampaignRecord = {
      id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sponsorName: sponsorName.slice(0, 80),
      sponsorLogo: String(body.sponsorLogo || '').slice(0, 300),
      badge: String(body.badge || 'Patrocinado').trim().slice(0, 32),
      title: title.slice(0, 120),
      description: (description || `Conheça a solução oficial de ${sponsorName}.`).slice(0, 280),
      ctaText: ctaText.slice(0, 40),
      ctaUrl: /^https?:\/\//i.test(ctaUrl) ? ctaUrl : `https://${ctaUrl}`,
      bannerUrl: String(body.bannerUrl || '').slice(0, 300),
      category: String(body.category || 'Patrocinador Direto').trim().slice(0, 60),
      rating: typeof body.rating === 'number' ? body.rating : 4.9,
      format,
      active: body.active !== false,
      impressions: 0,
      clicks: 0,
      createdAt: new Date().toISOString(),
    };

    adCampaigns = [campaign, ...adCampaigns];
    saveAdCampaigns(adCampaigns);
    res.status(201).json({
      ok: true,
      campaign,
      campaigns: adCampaigns,
    });
  });

  app.patch('/api/ads/campaigns/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = adCampaigns.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'Campanha de anúncio não encontrada.' });
      return;
    }
    const body = (req.body || {}) as Partial<ServerAdCampaignRecord>;
    const existing = adCampaigns[idx];
    const nextUrl = body.ctaUrl !== undefined ? String(body.ctaUrl).trim() : existing.ctaUrl;
    const updated: ServerAdCampaignRecord = {
      ...existing,
      ...(body.sponsorName !== undefined ? { sponsorName: String(body.sponsorName).trim().slice(0, 80) } : {}),
      ...(body.badge !== undefined ? { badge: String(body.badge).trim().slice(0, 32) } : {}),
      ...(body.title !== undefined ? { title: String(body.title).trim().slice(0, 120) } : {}),
      ...(body.description !== undefined ? { description: String(body.description).trim().slice(0, 280) } : {}),
      ...(body.ctaText !== undefined ? { ctaText: String(body.ctaText).trim().slice(0, 40) } : {}),
      ...(body.ctaUrl !== undefined ? { ctaUrl: /^https?:\/\//i.test(nextUrl) ? nextUrl : `https://${nextUrl}` } : {}),
      ...(body.category !== undefined ? { category: String(body.category).trim().slice(0, 60) } : {}),
      ...(body.format && ['native', 'banner', 'both'].includes(body.format) ? { format: body.format } : {}),
      ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
    };
    adCampaigns[idx] = updated;
    saveAdCampaigns(adCampaigns);
    res.json({
      ok: true,
      campaign: updated,
      campaigns: adCampaigns,
    });
  });

  app.delete('/api/ads/campaigns/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const before = adCampaigns.length;
    adCampaigns = adCampaigns.filter((c) => c.id !== id);
    if (adCampaigns.length === before) {
      res.status(404).json({ ok: false, error: 'Campanha de anúncio não encontrada.' });
      return;
    }
    saveAdCampaigns(adCampaigns);
    res.json({
      ok: true,
      campaigns: adCampaigns,
    });
  });

  app.post('/api/ads/events', (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      networkId?: string;
      format?: string;
      eventType?: string;
      placementId?: string;
      adId?: string;
      revenue?: number;
    };

    const validFormats = new Set(['banner', 'interstitial', 'rewarded_video', 'native']);
    const validEvents = new Set(['impression', 'click', 'rewarded_complete']);

    const format = validFormats.has(String(body.format))
      ? (String(body.format) as 'banner' | 'interstitial' | 'rewarded_video' | 'native')
      : null;
    const eventType = validEvents.has(String(body.eventType))
      ? (String(body.eventType) as 'impression' | 'click' | 'rewarded_complete')
      : null;

    if (!format || !eventType) {
      res.status(400).json({
        ok: false,
        error: 'Formato (banner|interstitial|rewarded_video|native) e evento (impression|click|rewarded_complete) são obrigatórios.',
      });
      return;
    }

    const networkId = String(body.networkId || 'google_admob').trim() || 'google_admob';
    const defaultRevenueMap: Record<string, number> = {
      'banner:impression': 0.015,
      'banner:click': 0.22,
      'interstitial:impression': 0.08,
      'interstitial:click': 0.35,
      'rewarded_video:impression': 0.12,
      'rewarded_video:rewarded_complete': 0.45,
      'rewarded_video:click': 0.4,
      'native:impression': 0.04,
      'native:click': 0.3,
    };

    const revenueDelta =
      typeof body.revenue === 'number' && Number.isFinite(body.revenue) && body.revenue >= 0
        ? Number(body.revenue.toFixed(4))
        : defaultRevenueMap[`${format}:${eventType}`] ?? 0.05;

    const formatBucket = adsTelemetry.byFormat[format];
    if (eventType === 'impression' || eventType === 'rewarded_complete') {
      formatBucket.impressions += 1;
    }
    if (eventType === 'click') {
      formatBucket.clicks += 1;
    }
    formatBucket.revenue = Number((formatBucket.revenue + revenueDelta).toFixed(2));

    if (!adsTelemetry.byNetwork[networkId]) {
      adsTelemetry.byNetwork[networkId] = { impressions: 0, clicks: 0, revenue: 0 };
    }
    const netBucket = adsTelemetry.byNetwork[networkId];
    if (eventType === 'impression' || eventType === 'rewarded_complete') {
      netBucket.impressions += 1;
    }
    if (eventType === 'click') {
      netBucket.clicks += 1;
    }
    netBucket.revenue = Number((netBucket.revenue + revenueDelta).toFixed(2));

    if (body.adId) {
      const camp = adCampaigns.find((c) => c.id === String(body.adId));
      if (camp) {
        if (eventType === 'impression') camp.impressions = (camp.impressions || 0) + 1;
        if (eventType === 'click') camp.clicks = (camp.clicks || 0) + 1;
        saveAdCampaigns(adCampaigns);
      }
    }

    const record: AdTelemetryEventRecord = {
      id: `adev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      networkId,
      format,
      eventType,
      placementId: body.placementId ? String(body.placementId).slice(0, 80) : undefined,
      adId: body.adId ? String(body.adId).slice(0, 80) : undefined,
      revenue: revenueDelta,
    };

    adsTelemetry.recentEvents.unshift(record);
    if (adsTelemetry.recentEvents.length > 60) {
      adsTelemetry.recentEvents.length = 60;
    }
    adsTelemetry.updatedAt = record.timestamp;
    saveAdsTelemetry(adsTelemetry);

    res.json({
      ok: true,
      event: record,
      byFormat: adsTelemetry.byFormat,
      byNetwork: adsTelemetry.byNetwork,
      campaigns: adCampaigns,
    });
  });

  // Brazil Payment Gateway (Pix, Boleto Bancário, Cartão Nacional) status, config & webhook endpoints
  app.get('/api/br-gateway/status', (_req: Request, res: Response) => {
    const envCfg = readBrGatewayEnvConfig();
    const hasSecretToken = Boolean(
      (envCfg.accessToken && !isPlaceholderValue(envCfg.accessToken)) ||
        (envCfg.apiKey && !isPlaceholderValue(envCfg.apiKey)) ||
        (envCfg.clientId &&
          !isPlaceholderValue(envCfg.clientId) &&
          envCfg.clientSecret &&
          !isPlaceholderValue(envCfg.clientSecret))
    );
    const hasWebhookSecret = Boolean(
      envCfg.webhookSecret && !isPlaceholderValue(envCfg.webhookSecret)
    );

    const missingEnvVars: string[] = [];
    if (!hasSecretToken) {
      missingEnvVars.push(
        envCfg.provider === 'efi'
          ? 'BR_GATEWAY_CLIENT_ID + BR_GATEWAY_CLIENT_SECRET'
          : 'BR_GATEWAY_ACCESS_TOKEN (ou BR_GATEWAY_API_KEY)'
      );
    }
    if (envCfg.provider === 'custom_br' && !envCfg.apiBaseUrl) {
      missingEnvVars.push('BR_GATEWAY_API_BASE_URL');
    }

    const warnings: string[] = [];
    if (envCfg.apiBaseUrl) {
      try {
        const parsed = new URL(envCfg.apiBaseUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          warnings.push('BR_GATEWAY_API_BASE_URL deve iniciar com https://.');
        }
      } catch {
        warnings.push('BR_GATEWAY_API_BASE_URL não é uma URL válida.');
      }
    }

    res.json({
      ok: true,
      config: brGatewayConfig,
      serverStatus: {
        configured: missingEnvVars.length === 0 && warnings.length === 0,
        provider: envCfg.provider,
        mode: envCfg.mode,
        hasSecretToken,
        hasWebhookSecret,
        hasMerchantId: Boolean(envCfg.merchantId && !isPlaceholderValue(envCfg.merchantId)),
        missingEnvVars,
        warnings,
      },
    });
  });

  app.put('/api/br-gateway/config', (req: Request, res: Response) => {
    const body = (req.body || {}) as Partial<BrGatewayStoredConfig>;
    const validProviders: BrGatewayProviderId[] = [
      'mercadopago',
      'asaas',
      'pagarme',
      'efi',
      'stripe_br',
      'custom_br',
    ];

    if (body.provider && validProviders.includes(body.provider)) {
      brGatewayConfig.provider = body.provider;
    }
    if (typeof body.customProviderName === 'string') {
      brGatewayConfig.customProviderName = body.customProviderName.trim().slice(0, 80);
    }
    if (typeof body.customApiBaseUrl === 'string') {
      brGatewayConfig.customApiBaseUrl = body.customApiBaseUrl.trim().slice(0, 200);
    }
    if (body.mode === 'sandbox' || body.mode === 'live') {
      brGatewayConfig.mode = body.mode;
    }
    if (typeof body.merchantOrAccountId === 'string') {
      brGatewayConfig.merchantOrAccountId = body.merchantOrAccountId.trim().slice(0, 120);
    }
    if (typeof body.pixEnabled === 'boolean') brGatewayConfig.pixEnabled = body.pixEnabled;
    if (typeof body.pixKey === 'string') brGatewayConfig.pixKey = body.pixKey.trim().slice(0, 140);
    if (typeof body.pixExpirationMinutes === 'number' && Number.isFinite(body.pixExpirationMinutes)) {
      brGatewayConfig.pixExpirationMinutes = Math.min(1440, Math.max(5, Math.round(body.pixExpirationMinutes)));
    }
    if (typeof body.boletoEnabled === 'boolean') brGatewayConfig.boletoEnabled = body.boletoEnabled;
    if (typeof body.boletoDueDays === 'number' && Number.isFinite(body.boletoDueDays)) {
      brGatewayConfig.boletoDueDays = Math.min(30, Math.max(1, Math.round(body.boletoDueDays)));
    }
    if (typeof body.boletoInstructions === 'string') {
      brGatewayConfig.boletoInstructions = body.boletoInstructions.trim().slice(0, 240);
    }
    if (typeof body.creditCardEnabled === 'boolean') {
      brGatewayConfig.creditCardEnabled = body.creditCardEnabled;
    }
    if (typeof body.maxInstallments === 'number' && Number.isFinite(body.maxInstallments)) {
      brGatewayConfig.maxInstallments = Math.min(12, Math.max(1, Math.round(body.maxInstallments)));
    }
    if (typeof body.interestFreeInstallments === 'number' && Number.isFinite(body.interestFreeInstallments)) {
      brGatewayConfig.interestFreeInstallments = Math.min(
        brGatewayConfig.maxInstallments,
        Math.max(1, Math.round(body.interestFreeInstallments))
      );
    }
    if (body.captureMode === 'automatic' || body.captureMode === 'manual') {
      brGatewayConfig.captureMode = body.captureMode;
    }
    if (typeof body.webhookEndpoint === 'string') {
      brGatewayConfig.webhookEndpoint = body.webhookEndpoint.trim().slice(0, 240);
    }
    if (typeof body.pixWebhookEndpoint === 'string') {
      brGatewayConfig.pixWebhookEndpoint = body.pixWebhookEndpoint.trim().slice(0, 240);
    }
    if (typeof body.boletoWebhookEndpoint === 'string') {
      brGatewayConfig.boletoWebhookEndpoint = body.boletoWebhookEndpoint.trim().slice(0, 240);
    }
    if (typeof body.creditCardWebhookEndpoint === 'string') {
      brGatewayConfig.creditCardWebhookEndpoint = body.creditCardWebhookEndpoint.trim().slice(0, 240);
    }

    brGatewayConfig.updatedAt = new Date().toISOString();
    saveBrGatewayConfig(brGatewayConfig);

    res.json({
      ok: true,
      config: brGatewayConfig,
    });
  });

  app.get('/api/webhooks/br-gateway', (_req: Request, res: Response) => {
    const envCfg = readBrGatewayEnvConfig();
    res.json({
      ok: true,
      endpoint: '/api/webhooks/br-gateway',
      provider: envCfg.provider,
      mode: envCfg.mode,
      methodsSupported: ['pix', 'boleto', 'credit_card'],
      message: 'Endpoint de webhook BR ativo para notificações de Pix, Boleto e Cartão Nacional.',
    });
  });

  app.post('/api/webhooks/br-gateway', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const envCfg = readBrGatewayEnvConfig();
    const isTestProbe = req.headers['x-webhook-test'] === 'true';
    const skipWebhookLog = req.headers['x-skip-webhook-log'] === 'true';
    const methodLabel = String(body.paymentMethod || body.type || 'pix');
    const refId = String(body.reference || body.id || body.external_reference || '').trim();
    const statusRaw = String(
      body.status ||
        (body.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>).status : undefined) ||
        (body.payment && typeof body.payment === 'object' ? (body.payment as Record<string, unknown>).status : undefined) ||
        'approved'
    ).toLowerCase();
    const mappedBrStatus = mapBrPaymentStatus(statusRaw);
    const isFailure = mappedBrStatus === 'failed';

    let reconciledOrder: RealSaleOrder | null = null;
    if (!isTestProbe && refId) {
      reconciledOrder = reconcileOrderStatus(
        refId,
        mappedBrStatus,
        mappedBrStatus === 'approved'
          ? `Pagamento confirmado via webhook ${envCfg.provider.toUpperCase()}.`
          : mappedBrStatus === 'failed'
          ? `Pagamento recusado/expirado segundo webhook ${envCfg.provider.toUpperCase()}.`
          : `Status atualizado via webhook: ${statusRaw}.`
      );
    }

    if (!skipWebhookLog) {
      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        provider: String(req.headers['x-webhook-provider'] || envCfg.provider),
        source: isTestProbe ? 'test_probe' : 'external_psp',
        eventType: 'webhook_received',
        outcome: isFailure ? 'error' : 'success',
        httpStatus: isFailure ? 422 : 200,
        signatureValid: envCfg.webhookSecret ? true : null,
        reference: refId || null,
        transactionKind: 'charge',
        channel: `BR_${methodLabel.toUpperCase()}`,
        message: isFailure
          ? `Webhook Gateway BR (${envCfg.provider.toUpperCase()}) reportou erro no método ${methodLabel.toUpperCase()}.`
          : `Webhook Gateway BR (${envCfg.provider.toUpperCase()}) recebido para ${methodLabel.toUpperCase()}.`,
        payloadSnippet: formatPayloadSnippet(body),
      });
    }

    res.json({
      received: true,
      testProbe: isTestProbe,
      provider: envCfg.provider,
      reference: refId || null,
      order: reconciledOrder,
    });
  });

  app.post('/api/br-gateway/test-connection', async (req: Request, res: Response) => {
    const {
      endpointUrl,
      provider = brGatewayConfig.provider,
      paymentMethod,
    } = (req.body || {}) as {
      endpointUrl?: string;
      provider?: string;
      paymentMethod?: 'pix' | 'boleto' | 'credit_card';
    };

    const resolvedMethod: 'pix' | 'boleto' | 'credit_card' =
      paymentMethod === 'boleto' || paymentMethod === 'credit_card'
        ? paymentMethod
        : 'pix';

    const rawInput = String(endpointUrl || '').trim();
    if (!rawInput) {
      res.status(400).json({
        ok: false,
        httpStatus: 400,
        error: 'Informe o Endpoint de Webhook BR completo.',
      });
      return;
    }

    const port = Number(process.env.PORT) || 3000;
    const reqHostname = String(req.hostname || '').toLowerCase();

    let parsedUrl: URL;
    try {
      parsedUrl = rawInput.startsWith('/')
        ? new URL(rawInput, `http://127.0.0.1:${port}`)
        : new URL(rawInput);
    } catch {
      res.status(400).json({
        ok: false,
        httpStatus: 400,
        error: 'URL inválida. Utilize um endereço HTTP/HTTPS válido.',
      });
      return;
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      res.status(400).json({
        ok: false,
        httpStatus: 400,
        error: 'Apenas URLs HTTP ou HTTPS são suportados para callbacks BR.',
      });
      return;
    }

    const host = parsedUrl.hostname.toLowerCase();
    const isLocalSelfHost =
      (host === 'localhost' || host === '127.0.0.1') &&
      (!parsedUrl.port || Number(parsedUrl.port) === port);
    const isKnownAppHost =
      isLocalSelfHost ||
      host === reqHostname ||
      host.startsWith('ais-dev-') ||
      host.startsWith('ais-pre-');
    const isThisBrPath = parsedUrl.pathname.replace(/\/+$/, '') === '/api/webhooks/br-gateway';

    const isBlockedPrivateHost =
      !isLocalSelfHost &&
      (host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.endsWith('.internal') ||
        host.endsWith('.local') ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host));

    if (isBlockedPrivateHost) {
      res.status(400).json({
        ok: false,
        httpStatus: 400,
        error: 'Endereço privado ou interno não permitido para testes externos.',
      });
      return;
    }

    const pingRef = `BR-${resolvedMethod.toUpperCase()}-PING-${Date.now()}`;
    const pingPayload = {
      id: pingRef,
      external_reference: pingRef,
      provider,
      paymentMethod: resolvedMethod,
      amountBRL: 97.0,
      status: 'approved',
    };

    const fetchTarget =
      isKnownAppHost && isThisBrPath
        ? `http://127.0.0.1:${port}/api/webhooks/br-gateway`
        : parsedUrl.toString();

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    try {
      const targetRes = await fetch(fetchTarget, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Test': 'true',
          'X-Webhook-Provider': String(provider),
          'X-Skip-Webhook-Log': 'true',
        },
        body: JSON.stringify(pingPayload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const latencyMs = Date.now() - startedAt;
      const text = await targetRes.text();
      let parsedResp: Record<string, unknown> = {};
      try {
        parsedResp = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        parsedResp = { raw: text.slice(0, 240) };
      }

      const captured = Boolean(targetRes.ok && (parsedResp.received === true || isThisBrPath));
      const envCfg = readBrGatewayEnvConfig();
      const methodChannel = `BR_${resolvedMethod.toUpperCase()}`;

      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        provider: String(provider),
        source: 'test_probe',
        eventType: 'connection_test',
        outcome: targetRes.ok ? 'success' : 'error',
        httpStatus: targetRes.status,
        signatureValid: envCfg.webhookSecret ? targetRes.status !== 401 : null,
        reference: pingRef,
        transactionKind: 'charge',
        channel: methodChannel,
        latencyMs,
        endpointUrl: parsedUrl.toString(),
        message: targetRes.ok
          ? `Ping Webhook ${resolvedMethod.toUpperCase()} (${String(provider).toUpperCase()}) capturado por ${parsedUrl.origin}${parsedUrl.pathname} (${latencyMs}ms).`
          : `Endpoint BR ${resolvedMethod.toUpperCase()} (${parsedUrl.origin}${parsedUrl.pathname}) respondeu HTTP ${targetRes.status} (${latencyMs}ms).`,
        payloadSnippet: formatPayloadSnippet({
          paymentMethod: resolvedMethod,
          testedUrl: parsedUrl.toString(),
          httpStatus: targetRes.status,
          latencyMs,
          captured,
          response: parsedResp,
        }),
      });

      res.locals.loggedStatusCode = targetRes.status;
      res.locals.loggedEndpointUrl = parsedUrl.toString();
      res.locals.loggedProvider = String(provider);
      if (!targetRes.ok) {
        res.locals.loggedErrorSummary = `Endpoint BR ${resolvedMethod.toUpperCase()} respondeu HTTP ${targetRes.status} (${latencyMs}ms).`;
      }

      res.status(200).json({
        ok: targetRes.ok,
        captured,
        paymentMethod: resolvedMethod,
        httpStatus: targetRes.status,
        latencyMs,
        reference: pingRef,
        testedUrl: parsedUrl.toString(),
        warning: host.startsWith('ais-dev-')
          ? 'O servidor local respondeu ao ping, mas para callbacks reais do gateway BR utilize o URL público (ais-pre-... ou domínio próprio).'
          : undefined,
      });
    } catch (err) {
      clearTimeout(timer);
      const latencyMs = Date.now() - startedAt;
      const errMsg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Tempo limite excedido (6.5s) ao testar o endpoint.'
          : err instanceof Error
          ? err.message
          : 'Falha ao conectar ao endpoint BR.';

      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        provider: String(provider),
        source: 'test_probe',
        eventType: 'connection_test',
        outcome: 'error',
        httpStatus: 502,
        signatureValid: null,
        reference: pingRef,
        transactionKind: 'charge',
        channel: 'BR_GATEWAY',
        latencyMs,
        endpointUrl: parsedUrl.toString(),
        message: `Falha ao testar Endpoint BR (${parsedUrl.toString()}): ${errMsg}`,
        payloadSnippet: formatPayloadSnippet({
          testedUrl: parsedUrl.toString(),
          latencyMs,
          error: errMsg,
        }),
      });

      res.locals.loggedStatusCode = 502;
      res.locals.loggedEndpointUrl = parsedUrl.toString();
      res.locals.loggedProvider = String(provider);
      res.locals.loggedErrorSummary = errMsg;

      res.status(200).json({
        ok: false,
        captured: false,
        httpStatus: 502,
        latencyMs,
        reference: pingRef,
        testedUrl: parsedUrl.toString(),
        error: errMsg,
      });
    }
  });

  // Webhook Subscription Management (configure, list, pause/resume, test per event type)
  app.get('/api/webhook-subscriptions', (_req: Request, res: Response) => {
    res.json({ items: webhookSubscriptions });
  });

  app.post('/api/webhook-subscriptions', (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      eventType?: string;
      endpointUrl?: string;
      description?: string;
      active?: boolean;
    };

    const eventType = String(body.eventType || '').trim().slice(0, 80);
    const endpointUrl = String(body.endpointUrl || '').trim().slice(0, 300);
    const description = String(body.description || '').trim().slice(0, 220);

    if (!eventType) {
      res.status(400).json({ ok: false, error: 'Informe o tipo de evento (ex: transação.aprovada).' });
      return;
    }
    if (!endpointUrl) {
      res.status(400).json({ ok: false, error: 'Informe o URL do endpoint para esta subscrição.' });
      return;
    }

    const port = Number(process.env.PORT) || 3000;
    try {
      const parsed = endpointUrl.startsWith('/')
        ? new URL(endpointUrl, `http://127.0.0.1:${port}`)
        : new URL(endpointUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        res.status(400).json({ ok: false, error: 'O URL deve iniciar com https:// ou http:// (ou caminho /api/...).' });
        return;
      }
    } catch {
      res.status(400).json({ ok: false, error: 'Formato de URL inválido na subscrição de webhook.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const record: WebhookSubscriptionRecord = {
      id: `whsub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventType,
      endpointUrl,
      description:
        description || `Subscrição automática para eventos do tipo ${eventType}.`,
      active: typeof body.active === 'boolean' ? body.active : true,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastExecution: null,
    };

    webhookSubscriptions.unshift(record);
    saveJsonArray(WEBHOOK_SUBSCRIPTIONS_FILE, webhookSubscriptions);
    broadcastSseEvent('webhook_subscriptions_updated', {
      webhookSubscriptions,
    });

    res.status(201).json({ ok: true, item: record, items: webhookSubscriptions });
  });

  app.patch('/api/webhook-subscriptions/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    const target = webhookSubscriptions.find((item) => item.id === id);
    if (!target) {
      res.status(404).json({ ok: false, error: 'Subscrição de webhook não encontrada.' });
      return;
    }

    const body = (req.body || {}) as {
      eventType?: string;
      endpointUrl?: string;
      description?: string;
      active?: boolean;
    };

    if (typeof body.eventType === 'string' && body.eventType.trim()) {
      target.eventType = body.eventType.trim().slice(0, 80);
    }
    if (typeof body.endpointUrl === 'string') {
      const nextUrl = body.endpointUrl.trim().slice(0, 300);
      if (!nextUrl) {
        res.status(400).json({ ok: false, error: 'O URL do endpoint não pode ficar vazio.' });
        return;
      }
      const port = Number(process.env.PORT) || 3000;
      try {
        const parsed = nextUrl.startsWith('/')
          ? new URL(nextUrl, `http://127.0.0.1:${port}`)
          : new URL(nextUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          res.status(400).json({ ok: false, error: 'O URL deve iniciar com https:// ou http://.' });
          return;
        }
      } catch {
        res.status(400).json({ ok: false, error: 'Formato de URL inválido.' });
        return;
      }
      target.endpointUrl = nextUrl;
    }
    if (typeof body.description === 'string') {
      target.description = body.description.trim().slice(0, 220);
    }
    if (typeof body.active === 'boolean') {
      target.active = body.active;
    }

    target.updatedAt = new Date().toISOString();
    saveJsonArray(WEBHOOK_SUBSCRIPTIONS_FILE, webhookSubscriptions);
    broadcastSseEvent('webhook_subscriptions_updated', {
      webhookSubscriptions,
    });

    res.json({ ok: true, item: target, items: webhookSubscriptions });
  });

  app.delete('/api/webhook-subscriptions/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    const idx = webhookSubscriptions.findIndex((item) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'Subscrição de webhook não encontrada.' });
      return;
    }
    webhookSubscriptions.splice(idx, 1);
    saveJsonArray(WEBHOOK_SUBSCRIPTIONS_FILE, webhookSubscriptions);
    broadcastSseEvent('webhook_subscriptions_updated', {
      webhookSubscriptions,
    });
    res.json({ ok: true, items: webhookSubscriptions });
  });

  app.post('/api/webhook-subscriptions/:id/test', async (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    const sub = webhookSubscriptions.find((item) => item.id === id);
    if (!sub) {
      res.status(404).json({ ok: false, error: 'Subscrição de webhook não encontrada.' });
      return;
    }

    if (!sub.active) {
      res.status(409).json({
        ok: false,
        error: 'Subscrição pausada. Retome o webhook antes de disparar um evento de teste.',
        item: sub,
      });
      return;
    }

    const cfg = readPspConfig();
    const port = Number(process.env.PORT) || 3000;
    const reqHostname = String(req.hostname || '').toLowerCase();

    let parsedUrl: URL;
    try {
      parsedUrl = sub.endpointUrl.startsWith('/')
        ? new URL(sub.endpointUrl, `http://127.0.0.1:${port}`)
        : new URL(sub.endpointUrl);
    } catch {
      res.status(400).json({ ok: false, error: 'URL inválido configurado nesta subscrição.' });
      return;
    }

    const host = parsedUrl.hostname.toLowerCase();
    const cleanPath = parsedUrl.pathname.replace(/\/+$/, '');
    const isSelfWebhookPath =
      cleanPath === '/api/webhooks/angola-psp' || cleanPath === '/api/webhooks/br-gateway';
    const isLocalSelfHost =
      (host === 'localhost' || host === '127.0.0.1') &&
      (!parsedUrl.port || Number(parsedUrl.port) === port);
    const isKnownAppHost =
      isLocalSelfHost ||
      host === reqHostname ||
      host.startsWith('ais-dev-') ||
      host.startsWith('ais-pre-');

    const isBlockedPrivateHost =
      !isLocalSelfHost &&
      (host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.endsWith('.internal') ||
        host.endsWith('.local') ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host));

    if (isBlockedPrivateHost) {
      res.status(400).json({
        ok: false,
        error: 'Endereço privado ou interno não permitido para entregas externas.',
      });
      return;
    }

    const eventRef = `EVT-${Date.now()}`;
    const eventPayload = {
      id: eventRef,
      event: sub.eventType,
      eventType: sub.eventType,
      subscriptionId: sub.id,
      provider: cfg.provider,
      reference: eventRef,
      status: sub.eventType.includes('recusad') ? 'failed' : 'paid',
      amount: sub.eventType.includes('saque') || sub.eventType.includes('saldo') ? 25000 : 12500,
      currency: 'AOA',
      timestamp: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(eventPayload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': sub.eventType,
      'X-Webhook-Subscription-Id': sub.id,
      'X-Webhook-Test': 'true',
      'X-Webhook-Provider': cfg.provider,
      'X-Skip-Webhook-Log': 'true',
    };
    if (cfg.webhookSecret) {
      const hmac = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody).digest('hex');
      headers['x-psp-signature'] = `sha256=${hmac}`;
    }

    const fetchTarget =
      isKnownAppHost && isSelfWebhookPath
        ? `http://127.0.0.1:${port}${cleanPath}`
        : parsedUrl.toString();

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    try {
      const dispatchRes = await fetch(fetchTarget, {
        method: 'POST',
        headers,
        body: rawBody,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const latencyMs = Math.max(1, Date.now() - startedAt);
      const executedAt = new Date().toISOString();
      const message = dispatchRes.ok
        ? `Evento ${sub.eventType} entregue com sucesso (HTTP ${dispatchRes.status} · ${latencyMs}ms).`
        : `Endpoint respondeu HTTP ${dispatchRes.status} para o evento ${sub.eventType}.`;

      sub.lastExecution = {
        status: dispatchRes.ok ? 'success' : 'error',
        httpStatus: dispatchRes.status,
        latencyMs,
        executedAt,
        message,
      };
      sub.updatedAt = executedAt;
      saveJsonArray(WEBHOOK_SUBSCRIPTIONS_FILE, webhookSubscriptions);

      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: executedAt,
        provider: cfg.provider,
        source: 'test_probe',
        eventType: 'webhook_received',
        outcome: dispatchRes.ok ? 'success' : 'error',
        httpStatus: dispatchRes.status,
        signatureValid: cfg.webhookSecret ? dispatchRes.status !== 401 : null,
        reference: eventRef,
        transactionKind: sub.eventType.includes('saque') ? 'payout' : 'charge',
        channel: sub.eventType.toUpperCase(),
        latencyMs,
        endpointUrl: sub.endpointUrl,
        message,
        payloadSnippet: formatPayloadSnippet(eventPayload),
      });

      res.locals.loggedStatusCode = dispatchRes.status;
      res.locals.loggedEndpointUrl = sub.endpointUrl;
      res.locals.loggedProvider = cfg.provider;
      if (!dispatchRes.ok) {
        res.locals.loggedErrorSummary = message;
      }

      broadcastSseEvent('webhook_subscriptions_updated', {
        webhookSubscriptions,
      });

      res.json({ ok: dispatchRes.ok, item: sub, items: webhookSubscriptions });
    } catch (err) {
      clearTimeout(timer);
      const latencyMs = Math.max(1, Date.now() - startedAt);
      const executedAt = new Date().toISOString();
      const errMsg =
        err instanceof Error && err.name === 'AbortError'
          ? `Timeout (6.5s) ao entregar evento ${sub.eventType}.`
          : err instanceof Error
          ? err.message
          : `Falha ao entregar evento ${sub.eventType}.`;

      sub.lastExecution = {
        status: 'error',
        httpStatus: 502,
        latencyMs,
        executedAt,
        message: errMsg,
      };
      sub.updatedAt = executedAt;
      saveJsonArray(WEBHOOK_SUBSCRIPTIONS_FILE, webhookSubscriptions);

      recordWebhookLog({
        id: `whlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: executedAt,
        provider: cfg.provider,
        source: 'test_probe',
        eventType: 'webhook_received',
        outcome: 'error',
        httpStatus: 502,
        signatureValid: null,
        reference: eventRef,
        transactionKind: 'unknown',
        channel: sub.eventType.toUpperCase(),
        latencyMs,
        endpointUrl: sub.endpointUrl,
        message: errMsg,
        payloadSnippet: formatPayloadSnippet({ event: sub.eventType, error: errMsg }),
      });

      res.locals.loggedStatusCode = 502;
      res.locals.loggedEndpointUrl = sub.endpointUrl;
      res.locals.loggedProvider = cfg.provider;
      res.locals.loggedErrorSummary = errMsg;

      broadcastSseEvent('webhook_subscriptions_updated', {
        webhookSubscriptions,
      });

      res.json({ ok: false, item: sub, items: webhookSubscriptions, error: errMsg });
    }
  });

  // ---------------------------------------------------------------------------
  // Real Sales & Checkout Gateway Engine (Zero Simulated Approvals)
  // ---------------------------------------------------------------------------
  app.get('/api/sales/status', (_req: Request, res: Response) => {
    const pspCfg = readPspConfig();
    const pspMissing = getMissingEnvVars(pspCfg);
    const pspWarnings = getPspConfigWarnings(pspCfg);
    const brReadiness = getBrGatewayReadiness();

    const approvedOrders = salesOrders.filter((o) => o.status === 'approved');
    const pendingOrders = salesOrders.filter((o) => o.status === 'pending');
    const failedOrders = salesOrders.filter((o) => o.status === 'failed');

    res.json({
      ok: true,
      angolaPsp: {
        configured: pspMissing.length === 0 && pspWarnings.length === 0,
        provider: pspCfg.provider,
        mode: pspCfg.mode,
        missingEnvVars: pspMissing,
        warnings: pspWarnings,
      },
      brGateway: {
        configured: brReadiness.configured,
        provider: brReadiness.provider,
        mode: brReadiness.mode,
        missingEnvVars: brReadiness.missingEnvVars,
        enabledMethods: brReadiness.enabledMethods,
      },
      summary: {
        totalOrders: salesOrders.length,
        approvedOrders: approvedOrders.length,
        pendingOrders: pendingOrders.length,
        failedOrders: failedOrders.length,
        grossRevenueBRL: Number(
          approvedOrders.reduce((acc, o) => acc + o.grossAmount, 0).toFixed(2)
        ),
        netRevenueBRL: Number(
          approvedOrders.reduce((acc, o) => acc + o.netAmount, 0).toFixed(2)
        ),
      },
    });
  });

  app.get('/api/sales/orders', (_req: Request, res: Response) => {
    res.json({ ok: true, items: salesOrders });
  });

  app.post('/api/sales/checkout', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      type?: RealSaleOrder['type'];
      itemId?: string;
      title?: string;
      customerName?: string;
      customerEmail?: string;
      customerDocument?: string;
      customerPhone?: string;
      grossAmount?: number;
      fee?: number;
      netAmount?: number;
      currency?: RealSaleOrder['currency'];
      chargedAmount?: number;
      paymentMethod?: RealSaleOrder['paymentMethod'];
      installments?: number;
      cardToken?: string;
      card?: {
        number?: string;
        holderName?: string;
        expMonth?: string;
        expYear?: string;
        cvv?: string;
      };
      couponCode?: string;
      affiliateCode?: string;
      message?: string;
    };

    const customerName = String(body.customerName || '').trim();
    const customerEmail = String(body.customerEmail || '').trim().toLowerCase();
    const paymentMethod = body.paymentMethod;
    const grossAmount = Number(body.grossAmount);
    const fee = Number.isFinite(Number(body.fee)) ? Number(body.fee) : Number((grossAmount * 0.0499).toFixed(2));
    const netAmount = Number.isFinite(Number(body.netAmount))
      ? Number(body.netAmount)
      : Number(Math.max(0, grossAmount - fee).toFixed(2));
    const currency: RealSaleOrder['currency'] = body.currency || 'BRL';
    const orderType: RealSaleOrder['type'] = body.type || 'product_sale';
    const title = String(body.title || 'Pedido Digital MonetizaHub').trim().slice(0, 140);

    if (!customerName || customerName.length < 2) {
      res.status(400).json({ ok: false, error: 'Informe o nome completo do comprador.' });
      return;
    }
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      res.status(400).json({ ok: false, error: 'Informe um endereço de e-mail válido.' });
      return;
    }
    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      res.status(400).json({ ok: false, error: 'O valor da cobrança deve ser superior a zero.' });
      return;
    }
    if (
      paymentMethod !== 'pix' &&
      paymentMethod !== 'boleto' &&
      paymentMethod !== 'credit_card' &&
      paymentMethod !== 'stripe' &&
      paymentMethod !== 'multicaixa'
    ) {
      res.status(400).json({ ok: false, error: 'Método de pagamento inválido.' });
      return;
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    // -------------------------------------------------------------------------
    // BRANCH A: ANGOLA PSP (Multicaixa Express GPO real charge)
    // -------------------------------------------------------------------------
    if (paymentMethod === 'multicaixa') {
      const pspCfg = readPspConfig();
      const missing = getMissingEnvVars(pspCfg);
      const warnings = getPspConfigWarnings(pspCfg);
      if (missing.length > 0 || warnings.length > 0) {
        res.status(503).json({
          ok: false,
          code: 'GATEWAY_NOT_CONFIGURED',
          gatewayType: 'angola_psp',
          provider: pspCfg.provider,
          missingEnvVars: missing,
          error:
            missing.length > 0
              ? `Gateway Angola PSP (${pspCfg.provider.toUpperCase()}) sem credenciais reais no servidor: ${missing.join(', ')}. Configure as variáveis no servidor para processar vendas reais via Multicaixa Express.`
              : warnings.join(' '),
        });
        return;
      }

      const normalizedPhone = normalizeAngolaPhone(String(body.customerPhone || ''));
      if (normalizedPhone.length !== 9 || !normalizedPhone.startsWith('9')) {
        res.status(400).json({
          ok: false,
          error: 'Número Multicaixa Express inválido. Utilize 9 dígitos angolanos (ex: 923456789).',
        });
        return;
      }

      const amountAOA = Number.isFinite(Number(body.chargedAmount)) && Number(body.chargedAmount) > 0
        ? Number(Number(body.chargedAmount).toFixed(2))
        : Number((grossAmount * 165).toFixed(2));

      try {
        const headers = await resolveAuthHeaders(pspCfg);
        const targetUrl = `${pspCfg.apiBaseUrl}/charges`;
        const payload =
          pspCfg.provider === 'appypay'
            ? {
                amount: amountAOA,
                currency: 'AOA',
                description: title,
                merchantTransactionId: orderId,
                paymentMethod: 'GPO',
                paymentInfo: { phoneNumber: normalizedPhone },
                customerEmail,
              }
            : {
                merchantId: pspCfg.merchantId,
                amount: amountAOA,
                currency: 'AOA',
                reference: orderId,
                phoneNumber: normalizedPhone,
                description: title,
                customerEmail,
              };

        const pspRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { ...headers, 'Idempotency-Key': orderId },
          body: JSON.stringify(payload),
        });
        const responseText = await pspRes.text();
        let parsed: Record<string, unknown> = {};
        try {
          parsed = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
        } catch {
          parsed = { raw: responseText };
        }

        if (!pspRes.ok) {
          res.status(pspRes.status).json({
            ok: false,
            code: 'PSP_CHARGE_REJECTED',
            error:
              (parsed.message as string) ||
              (parsed.error as string) ||
              `O gateway ${pspCfg.provider.toUpperCase()} recusou a cobrança Multicaixa Express (HTTP ${pspRes.status}).`,
            details: parsed,
          });
          return;
        }

        const pspTxId = String(parsed.id || parsed.transactionId || orderId);
        const mappedPspStatus = mapPspStatus(parsed.status);
        const orderStatus: RealSaleOrder['status'] =
          mappedPspStatus === 'credited' ? 'approved' : mappedPspStatus === 'failed' ? 'failed' : 'pending';

        const serverRecord: ServerSettlementRecord = {
          id: `srv-chg-${Date.now()}`,
          kind: 'charge',
          provider: pspCfg.provider,
          mode: pspCfg.mode,
          reference: orderId,
          pspTransactionId: pspTxId,
          amountAOA,
          phone: `+244 ${normalizedPhone}`,
          status: mappedPspStatus,
          createdAt: nowIso,
          updatedAt: nowIso,
          message:
            mappedPspStatus === 'credited'
              ? `Venda Multicaixa Express confirmada via ${pspCfg.provider.toUpperCase()}.`
              : `Pedido GPO enviado ao Multicaixa Express do cliente (+244 ${normalizedPhone}).`,
        };
        recordLedger(serverRecord, 'charge_created');

        const order: RealSaleOrder = {
          id: orderId,
          type: orderType,
          itemId: body.itemId,
          title,
          customerName,
          customerEmail,
          grossAmount,
          fee,
          netAmount,
          currency,
          chargedAmount: amountAOA,
          chargedCurrency: 'AOA',
          paymentMethod: 'multicaixa',
          gatewayProvider: pspCfg.provider,
          gatewayMode: pspCfg.mode,
          externalChargeId: pspTxId,
          authorizationCode: typeof parsed.authorizationCode === 'string' ? parsed.authorizationCode : pspTxId,
          status: orderStatus,
          couponCode: body.couponCode,
          affiliateCode: body.affiliateCode,
          message: body.message,
          gatewayMessage: serverRecord.message,
          createdAt: nowIso,
          updatedAt: nowIso,
          paidAt: orderStatus === 'approved' ? nowIso : undefined,
        };
        salesOrders.unshift(order);
        if (salesOrders.length > 200) salesOrders.length = 200;
        saveSalesOrdersToDisk();
        broadcastSseEvent('sale_created', { order, orders: salesOrders });

        res.status(200).json({ ok: true, order });
        return;
      } catch (err) {
        res.status(502).json({
          ok: false,
          code: 'PSP_NETWORK_ERROR',
          error: err instanceof Error ? err.message : 'Falha de comunicação com o PSP Angola.',
        });
        return;
      }
    }

    // -------------------------------------------------------------------------
    // BRANCH B: BRAZIL / CARD GATEWAY (Pix, Boleto, Cartão de Crédito, Stripe)
    // -------------------------------------------------------------------------
    const brReadiness = getBrGatewayReadiness();
    if (!brReadiness.configured) {
      res.status(503).json({
        ok: false,
        code: 'GATEWAY_NOT_CONFIGURED',
        gatewayType: 'br_gateway',
        provider: brReadiness.provider,
        missingEnvVars: brReadiness.missingEnvVars,
        error: `Gateway de Pagamentos (${brReadiness.provider.toUpperCase()}) sem credenciais reais configuradas no servidor: ${brReadiness.missingEnvVars.join(', ')}. Configure no painel/Secrets do servidor para processar vendas reais.`,
      });
      return;
    }

    if (paymentMethod === 'pix' && !brGatewayConfig.pixEnabled) {
      res.status(400).json({ ok: false, error: 'Pagamento via Pix está desativado nas preferências do gateway.' });
      return;
    }
    if (paymentMethod === 'boleto' && !brGatewayConfig.boletoEnabled) {
      res.status(400).json({ ok: false, error: 'Pagamento via Boleto está desativado nas preferências do gateway.' });
      return;
    }
    if ((paymentMethod === 'credit_card' || paymentMethod === 'stripe') && !brGatewayConfig.creditCardEnabled) {
      res.status(400).json({ ok: false, error: 'Pagamento via Cartão de Crédito está desativado nas preferências do gateway.' });
      return;
    }

    const { envCfg } = brReadiness;
    const baseUrl = resolveBrBaseUrl(envCfg.provider, envCfg.mode, envCfg.apiBaseUrl);
    if (!baseUrl) {
      res.status(503).json({
        ok: false,
        code: 'GATEWAY_NOT_CONFIGURED',
        gatewayType: 'br_gateway',
        provider: envCfg.provider,
        missingEnvVars: ['BR_GATEWAY_API_BASE_URL'],
        error: 'URL base da API do gateway não configurada (BR_GATEWAY_API_BASE_URL).',
      });
      return;
    }

    const chargedBRL = Number(grossAmount.toFixed(2));
    const installments = Math.min(brGatewayConfig.maxInstallments || 12, Math.max(1, Number(body.installments) || 1));
    const cleanDoc = String(body.customerDocument || '').replace(/\D/g, '');
    const cleanPhone = String(body.customerPhone || '').replace(/\D/g, '');

    try {
      let externalChargeId = orderId;
      let status: RealSaleOrder['status'] = 'pending';
      let pixQrCode: string | undefined;
      let pixQrCodeBase64: string | undefined;
      let boletoUrl: string | undefined;
      let boletoBarcode: string | undefined;
      let ticketUrl: string | undefined;
      let authorizationCode: string | undefined;
      let gatewayMessage = `Cobrança iniciada via ${envCfg.provider.toUpperCase()}.`;

      const bearerToken = envCfg.accessToken || envCfg.apiKey;

      if (envCfg.provider === 'mercadopago') {
        const nameParts = customerName.split(/\s+/);
        const firstName = nameParts[0] || customerName;
        const lastName = nameParts.slice(1).join(' ') || 'Cliente';

        const mpPayload: Record<string, unknown> = {
          transaction_amount: chargedBRL,
          description: title,
          external_reference: orderId,
          payer: {
            email: customerEmail,
            first_name: firstName,
            last_name: lastName,
            ...(cleanDoc.length === 11 || cleanDoc.length === 14
              ? {
                  identification: {
                    type: cleanDoc.length === 14 ? 'CNPJ' : 'CPF',
                    number: cleanDoc,
                  },
                }
              : {}),
          },
          ...(brGatewayConfig.webhookEndpoint?.startsWith('http')
            ? { notification_url: brGatewayConfig.webhookEndpoint }
            : {}),
        };

        if (paymentMethod === 'pix') {
          mpPayload.payment_method_id = 'pix';
          const expDate = new Date(Date.now() + (brGatewayConfig.pixExpirationMinutes || 30) * 60000);
          mpPayload.date_of_expiration = expDate.toISOString();
        } else if (paymentMethod === 'boleto') {
          mpPayload.payment_method_id = 'bolbradesco';
          const due = new Date(Date.now() + (brGatewayConfig.boletoDueDays || 3) * 86400000);
          mpPayload.date_of_expiration = due.toISOString();
        } else {
          if (body.cardToken) {
            mpPayload.token = body.cardToken;
          }
          mpPayload.installments = installments;
          mpPayload.capture = brGatewayConfig.captureMode !== 'manual';
        }

        const mpRes = await fetch(`${baseUrl}/v1/payments`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': orderId,
          },
          body: JSON.stringify(mpPayload),
        });
        const mpData = (await mpRes.json().catch(() => ({}))) as Record<string, unknown>;
        if (!mpRes.ok) {
          res.status(mpRes.status).json({
            ok: false,
            code: 'GATEWAY_CHARGE_REJECTED',
            error:
              (mpData.message as string) ||
              `Mercado Pago recusou a cobrança (HTTP ${mpRes.status}).`,
            details: mpData,
          });
          return;
        }

        externalChargeId = String(mpData.id || orderId);
        status = mapBrPaymentStatus(mpData.status);
        authorizationCode = String(mpData.authorization_code || mpData.id || externalChargeId);

        const poi = (mpData.point_of_interaction || {}) as Record<string, unknown>;
        const txData = (poi.transaction_data || {}) as Record<string, unknown>;
        const txDetails = (mpData.transaction_details || {}) as Record<string, unknown>;
        const barcodeObj = (mpData.barcode || {}) as Record<string, unknown>;

        if (typeof txData.qr_code === 'string') pixQrCode = txData.qr_code;
        if (typeof txData.qr_code_base64 === 'string') {
          pixQrCodeBase64 = txData.qr_code_base64.startsWith('data:')
            ? txData.qr_code_base64
            : `data:image/png;base64,${txData.qr_code_base64}`;
        }
        if (typeof txData.ticket_url === 'string') ticketUrl = txData.ticket_url;
        if (typeof txDetails.external_resource_url === 'string') {
          boletoUrl = txDetails.external_resource_url;
        }
        if (typeof barcodeObj.content === 'string') {
          boletoBarcode = barcodeObj.content;
        }
        gatewayMessage =
          status === 'approved'
            ? `Pagamento aprovado no Mercado Pago (#${externalChargeId}).`
            : paymentMethod === 'pix'
            ? 'QR Code Pix gerado pelo Mercado Pago. Aguardando confirmação do pagamento.'
            : paymentMethod === 'boleto'
            ? 'Boleto registrado no Mercado Pago. Aguardando compensação bancária.'
            : `Status no Mercado Pago: ${String(mpData.status || 'pending')}.`;
      } else if (envCfg.provider === 'asaas') {
        const custRes = await fetch(`${baseUrl}/customers`, {
          method: 'POST',
          headers: {
            access_token: envCfg.apiKey || bearerToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: customerName,
            email: customerEmail,
            ...(cleanDoc ? { cpfCnpj: cleanDoc } : {}),
            ...(cleanPhone ? { mobilePhone: cleanPhone } : {}),
          }),
        });
        const custData = (await custRes.json().catch(() => ({}))) as Record<string, unknown>;
        if (!custRes.ok || !custData.id) {
          const errors = Array.isArray(custData.errors)
            ? (custData.errors as { description?: string }[]).map((e) => e.description).filter(Boolean).join('; ')
            : '';
          res.status(custRes.status || 400).json({
            ok: false,
            code: 'GATEWAY_CHARGE_REJECTED',
            error: errors || `Asaas rejeitou cadastro do pagador (HTTP ${custRes.status}).`,
            details: custData,
          });
          return;
        }

        const dueDays = paymentMethod === 'boleto' ? brGatewayConfig.boletoDueDays || 3 : 1;
        const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);
        const billingType =
          paymentMethod === 'pix'
            ? 'PIX'
            : paymentMethod === 'boleto'
            ? 'BOLETO'
            : 'CREDIT_CARD';

        const payPayload: Record<string, unknown> = {
          customer: custData.id,
          billingType,
          value: chargedBRL,
          dueDate,
          description: title,
          externalReference: orderId,
        };

        if (billingType === 'CREDIT_CARD' && body.card) {
          payPayload.installmentCount = installments;
          payPayload.installmentValue = Number((chargedBRL / installments).toFixed(2));
          payPayload.creditCard = {
            holderName: body.card.holderName || customerName,
            number: String(body.card.number || '').replace(/\D/g, ''),
            expiryMonth: body.card.expMonth,
            expiryYear: body.card.expYear,
            ccv: body.card.cvv,
          };
          payPayload.creditCardHolderInfo = {
            name: customerName,
            email: customerEmail,
            cpfCnpj: cleanDoc,
            phone: cleanPhone || '11999999999',
          };
        }

        const payRes = await fetch(`${baseUrl}/payments`, {
          method: 'POST',
          headers: {
            access_token: envCfg.apiKey || bearerToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payPayload),
        });
        const payData = (await payRes.json().catch(() => ({}))) as Record<string, unknown>;
        if (!payRes.ok || !payData.id) {
          const errors = Array.isArray(payData.errors)
            ? (payData.errors as { description?: string }[]).map((e) => e.description).filter(Boolean).join('; ')
            : '';
          res.status(payRes.status || 400).json({
            ok: false,
            code: 'GATEWAY_CHARGE_REJECTED',
            error: errors || `Asaas recusou a cobrança (HTTP ${payRes.status}).`,
            details: payData,
          });
          return;
        }

        externalChargeId = String(payData.id);
        status = mapBrPaymentStatus(payData.status);
        authorizationCode = String(payData.nossoNumero || payData.id);
        if (typeof payData.bankSlipUrl === 'string') boletoUrl = payData.bankSlipUrl;
        if (typeof payData.invoiceUrl === 'string') ticketUrl = payData.invoiceUrl;

        if (paymentMethod === 'pix') {
          const qrRes = await fetch(`${baseUrl}/payments/${externalChargeId}/pixQrCode`, {
            headers: { access_token: envCfg.apiKey || bearerToken },
          });
          if (qrRes.ok) {
            const qrData = (await qrRes.json().catch(() => ({}))) as Record<string, unknown>;
            if (typeof qrData.payload === 'string') pixQrCode = qrData.payload;
            if (typeof qrData.encodedImage === 'string') {
              pixQrCodeBase64 = qrData.encodedImage.startsWith('data:')
                ? qrData.encodedImage
                : `data:image/png;base64,${qrData.encodedImage}`;
            }
          }
        }
        gatewayMessage =
          status === 'approved'
            ? `Cobrança confirmada pelo Asaas (#${externalChargeId}).`
            : `Cobrança ${billingType} gerada no Asaas (#${externalChargeId}). Aguardando pagamento.`;
      } else if (envCfg.provider === 'stripe_br' || paymentMethod === 'stripe') {
        const stripeKey = envCfg.apiKey || bearerToken;
        const stripeParams = new URLSearchParams({
          amount: String(Math.round(chargedBRL * 100)),
          currency: 'brl',
          description: title,
          receipt_email: customerEmail,
          'metadata[order_id]': orderId,
        });
        stripeParams.append('payment_method_types[]', 'card');
        if (body.cardToken) {
          stripeParams.set('payment_method', body.cardToken);
          stripeParams.set('confirm', 'true');
        }

        const stripeRes = await fetch(`${baseUrl}/payment_intents`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: stripeParams.toString(),
        });
        const stripeData = (await stripeRes.json().catch(() => ({}))) as Record<string, unknown>;
        if (!stripeRes.ok || !stripeData.id) {
          const errObj = (stripeData.error || {}) as Record<string, unknown>;
          res.status(stripeRes.status || 400).json({
            ok: false,
            code: 'GATEWAY_CHARGE_REJECTED',
            error: (errObj.message as string) || `Stripe recusou o pagamento (HTTP ${stripeRes.status}).`,
            details: stripeData,
          });
          return;
        }

        externalChargeId = String(stripeData.id);
        status = mapBrPaymentStatus(stripeData.status);
        authorizationCode = externalChargeId;
        gatewayMessage =
          status === 'approved'
            ? `PaymentIntent Stripe confirmado (${externalChargeId}).`
            : `PaymentIntent Stripe criado (${String(stripeData.status || 'requires_payment_method')}).`;
      } else if (envCfg.provider === 'pagarme') {
        const authBasic = Buffer.from(`${bearerToken}:`).toString('base64');
        const amountCents = Math.round(chargedBRL * 100);
        const paymentEntry: Record<string, unknown> =
          paymentMethod === 'pix'
            ? {
                payment_method: 'pix',
                pix: { expires_in: (brGatewayConfig.pixExpirationMinutes || 30) * 60 },
              }
            : paymentMethod === 'boleto'
            ? {
                payment_method: 'boleto',
                boleto: {
                  instructions: brGatewayConfig.boletoInstructions || 'Pedido MonetizaHub',
                  due_at: new Date(Date.now() + (brGatewayConfig.boletoDueDays || 3) * 86400000).toISOString(),
                },
              }
            : {
                payment_method: 'credit_card',
                credit_card: {
                  installments,
                  statement_descriptor: 'MONETIZAHUB',
                  ...(body.cardToken ? { card_token: body.cardToken } : {}),
                },
              };

        const pmRes = await fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authBasic}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: orderId,
            customer: {
              name: customerName,
              email: customerEmail,
              ...(cleanDoc ? { document: cleanDoc, type: cleanDoc.length === 14 ? 'company' : 'individual' } : {}),
            },
            items: [{ amount: amountCents, description: title, quantity: 1, code: body.itemId || orderId }],
            payments: [paymentEntry],
          }),
        });
        const pmData = (await pmRes.json().catch(() => ({}))) as Record<string, unknown>;
        if (!pmRes.ok || !pmData.id) {
          res.status(pmRes.status || 400).json({
            ok: false,
            code: 'GATEWAY_CHARGE_REJECTED',
            error: (pmData.message as string) || `Pagar.me recusou a ordem (HTTP ${pmRes.status}).`,
            details: pmData,
          });
          return;
        }

        externalChargeId = String(pmData.id);
        status = mapBrPaymentStatus(pmData.status);
        const charges = Array.isArray(pmData.charges) ? (pmData.charges as Record<string, unknown>[]) : [];
        const firstCharge = charges[0] || {};
        const lastTx = (firstCharge.last_transaction || {}) as Record<string, unknown>;
        if (typeof lastTx.qr_code === 'string') pixQrCode = lastTx.qr_code;
        if (typeof lastTx.pdf === 'string') boletoUrl = lastTx.pdf;
        if (typeof lastTx.line === 'string') boletoBarcode = lastTx.line;
        authorizationCode = String(firstCharge.id || externalChargeId);
        gatewayMessage =
          status === 'approved'
            ? `Ordem Pagar.me aprovada (${externalChargeId}).`
            : `Ordem Pagar.me criada (${externalChargeId}). Aguardando pagamento.`;
      } else if (envCfg.provider === 'efi') {
        const efiToken = await resolveEfiOAuthToken(baseUrl, envCfg.clientId, envCfg.clientSecret);
        const efiRes = await fetch(`${baseUrl}/v2/cob`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${efiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            calendario: { expiracao: (brGatewayConfig.pixExpirationMinutes || 30) * 60 },
            valor: { original: chargedBRL.toFixed(2) },
            chave: brGatewayConfig.pixKey,
            solicitacaoPagador: title.slice(0, 140),
          }),
        });
        const efiData = (await efiRes.json().catch(() => ({}))) as Record<string, unknown>;
        if (!efiRes.ok) {
          res.status(efiRes.status).json({
            ok: false,
            code: 'GATEWAY_CHARGE_REJECTED',
            error: (efiData.mensagem as string) || `Efí Bank recusou a cobrança Pix (HTTP ${efiRes.status}).`,
            details: efiData,
          });
          return;
        }
        externalChargeId = String(efiData.txid || orderId);
        status = mapBrPaymentStatus(efiData.status);
        if (typeof efiData.pixCopiaECola === 'string') pixQrCode = efiData.pixCopiaECola;
        const loc = (efiData.loc || {}) as Record<string, unknown>;
        if (loc.id) {
          const qrRes = await fetch(`${baseUrl}/v2/loc/${String(loc.id)}/qrcode`, {
            headers: { Authorization: `Bearer ${efiToken}` },
          });
          if (qrRes.ok) {
            const qrJson = (await qrRes.json().catch(() => ({}))) as Record<string, unknown>;
            if (typeof qrJson.qrcode === 'string') pixQrCode = qrJson.qrcode;
            if (typeof qrJson.imagemQrcode === 'string') pixQrCodeBase64 = qrJson.imagemQrcode;
          }
        }
        gatewayMessage = `Cobrança Pix criada na Efí Bank (txid: ${externalChargeId}).`;
      } else {
        // Custom BR Gateway
        const customRes = await fetch(`${baseUrl}/charges`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'X-Api-Key': bearerToken,
            'Content-Type': 'application/json',
            'Idempotency-Key': orderId,
          },
          body: JSON.stringify({
            reference: orderId,
            amount: chargedBRL,
            currency: 'BRL',
            paymentMethod,
            description: title,
            customer: { name: customerName, email: customerEmail, document: cleanDoc || undefined },
          }),
        });
        const customData = (await customRes.json().catch(() => ({}))) as Record<string, unknown>;
        if (!customRes.ok) {
          res.status(customRes.status).json({
            ok: false,
            code: 'GATEWAY_CHARGE_REJECTED',
            error: (customData.message as string) || (customData.error as string) || `Gateway recusou a cobrança (HTTP ${customRes.status}).`,
            details: customData,
          });
          return;
        }
        externalChargeId = String(customData.id || customData.chargeId || orderId);
        status = mapBrPaymentStatus(customData.status);
        if (typeof customData.qrCode === 'string') pixQrCode = customData.qrCode;
        if (typeof customData.qrCodeBase64 === 'string') pixQrCodeBase64 = customData.qrCodeBase64;
        if (typeof customData.boletoUrl === 'string') boletoUrl = customData.boletoUrl;
        if (typeof customData.boletoBarcode === 'string') boletoBarcode = customData.boletoBarcode;
        authorizationCode = String(customData.authorizationCode || externalChargeId);
        gatewayMessage =
          (customData.message as string) || `Cobrança processada pelo gateway (${externalChargeId}).`;
      }

      if (pixQrCode && !pixQrCodeBase64) {
        try {
          pixQrCodeBase64 = await QRCode.toDataURL(pixQrCode, {
            width: 240,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
        } catch {
          // Ignore QR PNG failure if text EMV is available
        }
      }

      const order: RealSaleOrder = {
        id: orderId,
        type: orderType,
        itemId: body.itemId,
        title,
        customerName,
        customerEmail,
        customerDocument: cleanDoc || undefined,
        grossAmount,
        fee,
        netAmount,
        currency,
        chargedAmount: chargedBRL,
        chargedCurrency: 'BRL',
        paymentMethod,
        gatewayProvider: envCfg.provider,
        gatewayMode: envCfg.mode,
        externalChargeId,
        authorizationCode,
        status,
        pixQrCode,
        pixQrCodeBase64,
        boletoUrl,
        boletoBarcode,
        ticketUrl,
        installments,
        couponCode: body.couponCode,
        affiliateCode: body.affiliateCode,
        message: body.message,
        gatewayMessage,
        createdAt: nowIso,
        updatedAt: nowIso,
        paidAt: status === 'approved' ? nowIso : undefined,
      };

      salesOrders.unshift(order);
      if (salesOrders.length > 200) salesOrders.length = 200;
      saveSalesOrdersToDisk();
      broadcastSseEvent('sale_created', { order, orders: salesOrders });

      res.status(200).json({ ok: true, order });
    } catch (err) {
      res.status(502).json({
        ok: false,
        code: 'GATEWAY_NETWORK_ERROR',
        error: err instanceof Error ? err.message : 'Falha de comunicação com o gateway de pagamento.',
      });
    }
  });

  app.post('/api/sales/orders/:id/verify', async (req: Request, res: Response) => {
    const orderId = String(req.params.id || '');
    const order = salesOrders.find((o) => o.id === orderId || o.externalChargeId === orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Pedido não encontrado no servidor.' });
      return;
    }

    if (order.status === 'approved' || order.status === 'failed' || order.status === 'refunded') {
      res.json({ ok: true, order });
      return;
    }

    try {
      if (order.paymentMethod === 'multicaixa') {
        const pspCfg = readPspConfig();
        if (getMissingEnvVars(pspCfg).length === 0) {
          const headers = await resolveAuthHeaders(pspCfg);
          const lookupPath =
            pspCfg.provider === 'proxypay'
              ? `${pspCfg.apiBaseUrl}/payments/${encodeURIComponent(order.externalChargeId)}`
              : `${pspCfg.apiBaseUrl}/charges/${encodeURIComponent(order.externalChargeId)}`;
          const pspRes = await fetch(lookupPath, { headers });
          if (pspRes.ok) {
            const pspJson = (await pspRes.json().catch(() => ({}))) as Record<string, unknown>;
            const mapped = mapPspStatus(pspJson.status);
            const nextStatus: RealSaleOrder['status'] =
              mapped === 'credited' ? 'approved' : mapped === 'failed' ? 'failed' : 'pending';
            reconcileOrderStatus(
              order.id,
              nextStatus,
              nextStatus === 'approved'
                ? 'Pagamento Multicaixa Express confirmado via consulta direta ao PSP.'
                : nextStatus === 'failed'
                ? 'Cobrança Multicaixa Express falhou ou expirou no PSP.'
                : undefined
            );
          }
        }
      } else {
        const { envCfg } = getBrGatewayReadiness();
        const baseUrl = resolveBrBaseUrl(envCfg.provider, envCfg.mode, envCfg.apiBaseUrl);
        const token = envCfg.accessToken || envCfg.apiKey;
        if (baseUrl && (token || (envCfg.clientId && envCfg.clientSecret))) {
          let checkRes: globalThis.Response | null = null;
          if (envCfg.provider === 'mercadopago') {
            checkRes = await fetch(`${baseUrl}/v1/payments/${encodeURIComponent(order.externalChargeId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } else if (envCfg.provider === 'asaas') {
            checkRes = await fetch(`${baseUrl}/payments/${encodeURIComponent(order.externalChargeId)}`, {
              headers: { access_token: token },
            });
          } else if (envCfg.provider === 'pagarme') {
            const authBasic = Buffer.from(`${token}:`).toString('base64');
            checkRes = await fetch(`${baseUrl}/orders/${encodeURIComponent(order.externalChargeId)}`, {
              headers: { Authorization: `Basic ${authBasic}` },
            });
          } else if (envCfg.provider === 'stripe_br' || order.paymentMethod === 'stripe') {
            checkRes = await fetch(`${baseUrl}/payment_intents/${encodeURIComponent(order.externalChargeId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } else if (envCfg.provider === 'efi') {
            const efiToken = await resolveEfiOAuthToken(baseUrl, envCfg.clientId, envCfg.clientSecret);
            checkRes = await fetch(`${baseUrl}/v2/cob/${encodeURIComponent(order.externalChargeId)}`, {
              headers: { Authorization: `Bearer ${efiToken}` },
            });
          } else {
            checkRes = await fetch(`${baseUrl}/charges/${encodeURIComponent(order.externalChargeId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }

          if (checkRes && checkRes.ok) {
            const data = (await checkRes.json().catch(() => ({}))) as Record<string, unknown>;
            const nextStatus = mapBrPaymentStatus(data.status);
            reconcileOrderStatus(
              order.id,
              nextStatus,
              nextStatus === 'approved'
                ? `Pagamento confirmado em tempo real via ${envCfg.provider.toUpperCase()}.`
                : nextStatus === 'failed'
                ? `Pagamento expirado ou recusado (${String(data.status || 'failed')}).`
                : undefined
            );
          }
        }
      }
      res.json({ ok: true, order });
    } catch (err) {
      res.status(502).json({
        ok: false,
        order,
        error: err instanceof Error ? err.message : 'Erro ao consultar status do pagamento no gateway.',
      });
    }
  });

  // Google Play Store / Trusted Web Activity (TWA) & Digital Asset Links
  app.get('/.well-known/assetlinks.json', (_req: Request, res: Response) => {
    const cfg = readPlayStoreTwaConfig();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(buildAssetLinksPayload(cfg));
  });

  app.get('/manifest.json', (_req: Request, res: Response) => {
    const publicDir = path.resolve(__dirname, 'public');
    const manifestJsonPath = path.join(publicDir, 'manifest.json');
    const manifestWebPath = path.join(publicDir, 'manifest.webmanifest');
    const targetPath = fs.existsSync(manifestJsonPath) ? manifestJsonPath : manifestWebPath;
    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'Manifesto PWA não encontrado.' });
      return;
    }
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.sendFile(targetPath);
  });

  app.get('/api/playstore/status', (req: Request, res: Response) => {
    const cfg = readPlayStoreTwaConfig();
    const publicDir = path.resolve(__dirname, 'public');
    const checks = {
      manifestFile: fs.existsSync(path.join(publicDir, 'manifest.webmanifest')),
      manifestJsonFile: fs.existsSync(path.join(publicDir, 'manifest.json')),
      icon192Png: fs.existsSync(path.join(publicDir, 'pwa-192x192.png')),
      icon512Png: fs.existsSync(path.join(publicDir, 'pwa-512x512.png')),
      iconMaskablePng: fs.existsSync(path.join(publicDir, 'pwa-maskable-512x512.png')),
      appleTouchIconPng: fs.existsSync(path.join(publicDir, 'apple-touch-icon.png')),
      assetLinksFile: fs.existsSync(path.join(publicDir, '.well-known', 'assetlinks.json')),
    };

    const host =
      String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000');
    const protocol = String(req.headers['x-forwarded-proto'] || req.protocol || 'https');
    const origin = `${protocol}://${host}`;

    res.json({
      ok: true,
      origin,
      host,
      checks,
      twaConfig: cfg,
      readyForTwa:
        (checks.manifestFile || checks.manifestJsonFile) &&
        checks.icon192Png &&
        checks.icon512Png &&
        checks.iconMaskablePng &&
        checks.assetLinksFile,
    });
  });

  app.put('/api/playstore/config', (req: Request, res: Response) => {
    const body = (req.body || {}) as Partial<PlayStoreTwaConfig> & { sha256Text?: string };
    const packageName = String(body.packageName || '').trim();
    const appName = String(body.appName || '').trim();
    const launcherName = String(body.launcherName || '').trim().slice(0, 12);
    const versionName = String(body.versionName || '1.0.0').trim();
    const versionCode = Math.max(1, Math.floor(Number(body.versionCode || 1)));

    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(packageName)) {
      res.status(400).json({
        ok: false,
        error: 'Package Name inválido. Use o formato reverso padrão Android (ex: com.suaempresa.app).',
      });
      return;
    }

    const rawFingerprints = Array.isArray(body.sha256Fingerprints)
      ? body.sha256Fingerprints
      : String(body.sha256Text || '')
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);

    const validShaPattern = /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/;
    const invalidFp = rawFingerprints.find((fp) => !validShaPattern.test(fp));
    if (rawFingerprints.length === 0 || invalidFp) {
      res.status(400).json({
        ok: false,
        error:
          'Informe ao menos uma impressão digital SHA-256 válida (32 bytes hexadecimais separados por dois pontos, ex: AA:BB:CC:...).',
      });
      return;
    }

    const nextConfig: PlayStoreTwaConfig = {
      packageName,
      appName: appName || DEFAULT_PLAYSTORE_TWA_CONFIG.appName,
      launcherName: launcherName || DEFAULT_PLAYSTORE_TWA_CONFIG.launcherName,
      versionName: versionName || '1.0.0',
      versionCode,
      sha256Fingerprints: rawFingerprints.map((fp) => fp.toUpperCase()),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(PLAYSTORE_TWA_CONFIG_FILE, JSON.stringify(nextConfig, null, 2), 'utf-8');

      const wellKnownDir = path.resolve(__dirname, 'public', '.well-known');
      if (!fs.existsSync(wellKnownDir)) fs.mkdirSync(wellKnownDir, { recursive: true });
      fs.writeFileSync(
        path.join(wellKnownDir, 'assetlinks.json'),
        JSON.stringify(buildAssetLinksPayload(nextConfig), null, 2),
        'utf-8'
      );

      res.json({
        ok: true,
        twaConfig: nextConfig,
        assetLinks: buildAssetLinksPayload(nextConfig),
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Falha ao salvar configuração da Play Store.',
      });
    }
  });

  app.get('/api/playstore/twa-manifest', (req: Request, res: Response) => {
    const cfg = readPlayStoreTwaConfig();
    const customOrigin = typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
    const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000');
    const protoHeader = String(req.headers['x-forwarded-proto'] || req.protocol || 'https');
    const resolvedOrigin = customOrigin && /^https?:\/\//i.test(customOrigin) ? customOrigin.replace(/\/+$/, '') : `${protoHeader}://${hostHeader}`;
    const parsedUrl = new URL(resolvedOrigin);

    const twaManifest = {
      packageId: cfg.packageName,
      host: parsedUrl.host,
      name: cfg.appName,
      launcherName: cfg.launcherName,
      display: 'standalone',
      themeColor: '#059669',
      themeColorDark: '#020617',
      navigationColor: '#020617',
      navigationColorDark: '#020617',
      navigationDividerColor: '#0F172A',
      navigationDividerColorDark: '#0F172A',
      backgroundColor: '#020617',
      enableNotifications: true,
      startUrl: '/',
      iconUrl: `${resolvedOrigin}/pwa-512x512.png`,
      maskableIconUrl: `${resolvedOrigin}/pwa-maskable-512x512.png`,
      monochromeIconUrl: `${resolvedOrigin}/pwa-192x192.png`,
      splashScreenFadeOutDuration: 300,
      signingKey: {
        path: './android.keystore',
        alias: 'android',
      },
      appVersionName: cfg.versionName,
      appVersionCode: cfg.versionCode,
      shortcuts: [
        {
          name: 'Painel Financeiro',
          shortName: 'Painel',
          url: `${resolvedOrigin}/?tab=overview`,
          chosenIconUrl: `${resolvedOrigin}/pwa-192x192.png`,
        },
        {
          name: 'Vitrine Pública',
          shortName: 'Vitrine',
          url: `${resolvedOrigin}/?view=storefront`,
          chosenIconUrl: `${resolvedOrigin}/pwa-192x192.png`,
        },
      ],
      generatorApp: 'bubblewrap-cli',
      webManifestUrl: `${resolvedOrigin}/manifest.webmanifest`,
      fallbackType: 'customtabs',
      features: {},
      alphaDependencies: { enabled: false },
      enableSiteSettingsShortcut: 'true',
      isChromeOSOnly: false,
      isMetaQuest: false,
      orientation: 'portrait',
      fingerprints: cfg.sha256Fingerprints.map((value) => ({ name: 'Play App Signing', value })),
      minSdkVersion: 21,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(twaManifest);
  });

  // Creator Sensitive Data AES-256-GCM Vault Endpoints
  app.get('/api/creator/vault', (_req: Request, res: Response) => {
    try {
      const vaultRecord = decryptCreatorVaultAtRest();
      if (!vaultRecord) {
        res.json({ ok: true, exists: false });
        return;
      }
      res.json({
        ok: true,
        exists: true,
        maskedProfile: vaultRecord.maskedProfile,
        clientEncryptedVault: vaultRecord.clientEncryptedVault,
        updatedAt: vaultRecord.updatedAt,
        serverStorageInfo: vaultRecord.serverStorageInfo,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Falha ao ler cofre AES-256-GCM no banco de dados.',
      });
    }
  });

  app.put('/api/creator/vault', (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        maskedProfile?: Record<string, unknown>;
        clientEncryptedVault?: Record<string, unknown>;
      };

      const maskedProfile = body.maskedProfile;
      const clientEncryptedVault = body.clientEncryptedVault;

      if (!maskedProfile || typeof maskedProfile !== 'object') {
        res.status(400).json({
          ok: false,
          error: 'maskedProfile ausente na requisição.',
        });
        return;
      }

      if (
        !clientEncryptedVault ||
        typeof clientEncryptedVault !== 'object' ||
        clientEncryptedVault.algorithm !== 'AES-256-GCM' ||
        typeof clientEncryptedVault.ciphertext !== 'string' ||
        clientEncryptedVault.ciphertext.length < 16 ||
        typeof clientEncryptedVault.iv !== 'string' ||
        typeof clientEncryptedVault.salt !== 'string'
      ) {
        res.status(400).json({
          ok: false,
          error:
            'Rejeitado: os dados sensíveis devem chegar pré-criptografados em AES-256-GCM (ciphertext, iv e salt obrigatórios).',
        });
        return;
      }

      const cardObj = maskedProfile.savedVisaCard as Record<string, unknown> | undefined;
      if (cardObj && typeof cardObj.fullCardNumber === 'string' && cardObj.fullCardNumber.trim().length > 0) {
        res.status(400).json({
          ok: false,
          error: 'Rejeitado: número completo do cartão em texto puro não é permitido no perfil público.',
        });
        return;
      }

      const serverStorageInfo = encryptCreatorVaultAtRest({
        maskedProfile,
        clientEncryptedVault,
        updatedAt: new Date().toISOString(),
      });

      res.json({
        ok: true,
        serverStorageInfo,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao gravar cofre AES-256-GCM no banco de dados.',
      });
    }
  });

  // Server-Side Autonomous AI Autopilot (Background / Away Mode)
  const aiAutopilot = new AiAutopilotService(DATA_DIR);
  aiAutopilot.startBackgroundScheduler();

  app.get('/api/ai-autopilot/state', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      state: aiAutopilot.getPublicState(),
    });
  });

  app.put('/api/ai-autopilot/config', (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        enabled?: boolean;
        intervalMinutes?: 5 | 15 | 30 | 60;
        focusAreas?: AutopilotFocusArea[];
        autoApplySafeActions?: boolean;
        snapshot?: AutopilotBusinessSnapshot;
      };
      const updated = aiAutopilot.updateConfig(body);
      res.json({
        ok: true,
        state: {
          ...updated,
          geminiConfigured: aiAutopilot.isGeminiConfigured(),
        },
      });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Falha ao atualizar configurações do Piloto Automático IA.',
      });
    }
  });

  app.post('/api/ai-autopilot/sync', (req: Request, res: Response) => {
    const snapshot = req.body as AutopilotBusinessSnapshot | undefined;
    if (!snapshot || typeof snapshot !== 'object') {
      res.status(400).json({ ok: false, error: 'Snapshot inválido.' });
      return;
    }
    const updated = aiAutopilot.syncSnapshot(snapshot);
    res.json({
      ok: true,
      syncedAt: updated.latestSnapshot?.syncedAt,
    });
  });

  app.post('/api/ai-autopilot/run-now', async (req: Request, res: Response) => {
    const snapshot = (req.body?.snapshot || undefined) as
      | AutopilotBusinessSnapshot
      | undefined;
    const result = await aiAutopilot.runOrganizationCycle('manual', snapshot);
    if (!result.ok) {
      res.status(result.error?.includes('GEMINI_API_KEY') ? 503 : 500).json({
        ok: false,
        error: result.error,
        state: result.state,
      });
      return;
    }
    res.json({
      ok: true,
      state: result.state,
    });
  });

  app.post('/api/ai-autopilot/tasks/:id/apply', (req: Request, res: Response) => {
    const task = aiAutopilot.markTaskStatus(String(req.params.id), 'applied');
    if (!task) {
      res.status(404).json({ ok: false, error: 'Tarefa de organização não encontrada.' });
      return;
    }
    res.json({
      ok: true,
      task,
      state: aiAutopilot.getPublicState(),
    });
  });

  app.post('/api/ai-autopilot/tasks/:id/dismiss', (req: Request, res: Response) => {
    const task = aiAutopilot.markTaskStatus(String(req.params.id), 'dismissed');
    if (!task) {
      res.status(404).json({ ok: false, error: 'Tarefa de organização não encontrada.' });
      return;
    }
    res.json({
      ok: true,
      task,
      state: aiAutopilot.getPublicState(),
    });
  });

  // Server-Side Smart Weekly Financial & Marketing Summary (Gemini)
  const smartWeeklySummary = new SmartWeeklySummaryService(DATA_DIR);

  app.get('/api/smart-summary/latest', (_req: Request, res: Response) => {
    const data = smartWeeklySummary.getLatestState();
    res.json({
      ok: true,
      ...data,
    });
  });

  app.post('/api/smart-summary/generate', async (req: Request, res: Response) => {
    const payload = req.body as SmartSummaryInputPayload | undefined;
    if (
      !payload ||
      typeof payload !== 'object' ||
      !payload.weeklyMetrics ||
      !Array.isArray(payload.topProducts)
    ) {
      res.status(400).json({
        ok: false,
        error: 'Snapshot semanal inválido para gerar o Resumo Inteligente.',
      });
      return;
    }

    const result = await smartWeeklySummary.generateWeeklySummary(payload);
    if (!result.ok) {
      res.status(result.error?.includes('GEMINI_API_KEY') ? 503 : 500).json({
        ok: false,
        error: result.error,
        geminiConfigured: result.geminiConfigured,
      });
      return;
    }

    res.json({
      ok: true,
      summary: result.summary,
      history: result.history,
      geminiConfigured: result.geminiConfigured,
    });
  });

  // Server-Side User Analytics & Usage Patterns Tracking
  const analyticsTracker = new AnalyticsTrackerService(DATA_DIR);

  app.get('/api/analytics/overview', (req: Request, res: Response) => {
    const rawWin = String(req.query.window || '30d');
    const windowPeriod: AnalyticsWindow =
      rawWin === '24h' || rawWin === '7d' || rawWin === '30d' ? rawWin : '30d';

    const byFmt = adsTelemetry.byFormat || DEFAULT_ADS_TELEMETRY.byFormat;
    const totalImpr = Object.values(byFmt).reduce((sum, item) => sum + (item?.impressions || 0), 0);
    const totalRev = Number(
      Object.values(byFmt)
        .reduce((sum, item) => sum + (item?.revenue || 0), 0)
        .toFixed(2)
    );
    const adEcpm = totalImpr > 0 ? Number(((totalRev / totalImpr) * 1000).toFixed(2)) : 26.07;

    const overview = analyticsTracker.getOverview(windowPeriod, {
      adRevenue: totalRev,
      adImpressions: totalImpr,
      adEcpm,
    });

    res.json({
      ok: true,
      overview,
    });
  });

  app.post('/api/analytics/events', (req: Request, res: Response) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ ok: false, error: 'Payload de evento inválido.' });
      return;
    }

    const list = Array.isArray(body.events) ? body.events : [body];
    let recordedCount = 0;
    for (const item of list) {
      if (item && typeof item === 'object') {
        analyticsTracker.recordEvent(item);
        recordedCount += 1;
      }
    }

    res.json({
      ok: true,
      recordedCount,
    });
  });

  const port = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);
  const liveVoiceWss = new WebSocketServer({ noServer: true });
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: hmrDisabled ? false : true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build dist/index.html não encontrado.');
      }
    });
  }

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (parsedUrl.pathname === '/api/live-voice') {
        liveVoiceWss.handleUpgrade(request, socket, head, (ws) => {
          attachLiveVoiceSession(ws, {
            analyticsTracker,
            aiAutopilot,
          });
        });
      }
    } catch {
      socket.destroy();
    }
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Monetiza Hub server running on http://0.0.0.0:${port}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
