export type BrGatewayProviderId =
  | 'mercadopago'
  | 'asaas'
  | 'pagarme'
  | 'efi'
  | 'stripe_br'
  | 'custom_br';

export interface BrGatewayConfig {
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
  updatedAt?: string;
}

export type BrPaymentMethodKey = 'pix' | 'boleto' | 'credit_card';

export interface BrMethodEndpointStatus {
  method: BrPaymentMethodKey;
  label: string;
  enabled: boolean;
  endpointUrl: string;
  state: 'idle' | 'testing' | 'ok' | 'error' | 'disabled';
  httpStatus?: number;
  latencyMs?: number;
  message?: string;
  testedAt?: string;
}

export interface BrGatewayServerStatus {
  configured: boolean;
  provider: string;
  mode: 'sandbox' | 'live';
  hasSecretToken: boolean;
  hasWebhookSecret: boolean;
  hasMerchantId: boolean;
  missingEnvVars: string[];
  warnings: string[];
}

export interface BrProviderPreset {
  id: BrGatewayProviderId;
  name: string;
  subtitle: string;
  portalUrl: string;
  authMode: string;
  sandboxBaseUrl: string;
  liveBaseUrl: string;
  credentialVars: {
    varName: string;
    label: string;
    whereToFind: string;
  }[];
}

export const BR_PROVIDER_PRESETS: Record<BrGatewayProviderId, BrProviderPreset> = {
  mercadopago: {
    id: 'mercadopago',
    name: 'Mercado Pago',
    subtitle: 'Pix instantâneo D+0 · Boleto Registrado · Cartão em até 12x',
    portalUrl: 'https://www.mercadopago.com.br/developers/panel',
    authMode: 'Access Token Bearer + Public Collector ID',
    sandboxBaseUrl: 'https://api.mercadopago.com',
    liveBaseUrl: 'https://api.mercadopago.com',
    credentialVars: [
      {
        varName: 'BR_GATEWAY_ACCESS_TOKEN',
        label: 'Access Token (Produção ou Teste)',
        whereToFind:
          'Painel Developers Mercado Pago → Suas Integrações → Credenciais de produção/teste (configure apenas no .env / Secrets do servidor).',
      },
      {
        varName: 'BR_GATEWAY_MERCHANT_ID',
        label: 'User ID / Collector ID',
        whereToFind:
          'Identificador público da conta encontrado em Dados do Negócio / Detalhes da Aplicação.',
      },
      {
        varName: 'BR_GATEWAY_WEBHOOK_SECRET',
        label: 'Assinatura Secreta Webhooks (x-signature)',
        whereToFind:
          'Secção Webhooks → Configurar notificações → Chave secreta para validação de IPN/Webhooks.',
      },
    ],
  },
  asaas: {
    id: 'asaas',
    name: 'Asaas Pagamentos',
    subtitle: 'Pix dinâmico · Boleto Bancário com baixa automática · Cartão Nacional',
    portalUrl: 'https://www.asaas.com',
    authMode: 'API Key ($aact_...) no cabeçalho access_token',
    sandboxBaseUrl: 'https://api-sandbox.asaas.com/v3',
    liveBaseUrl: 'https://api.asaas.com/v3',
    credentialVars: [
      {
        varName: 'BR_GATEWAY_API_KEY',
        label: 'Chave de API Asaas ($aact_...)',
        whereToFind:
          'Minha Conta → Integrações → Gerar nova chave de API (Sandbox ou Produção).',
      },
      {
        varName: 'BR_GATEWAY_MERCHANT_ID',
        label: 'Wallet ID Asaas',
        whereToFind:
          'Identificador público da carteira em Minha Conta → Dados da Conta / Split de Pagamentos.',
      },
      {
        varName: 'BR_GATEWAY_WEBHOOK_SECRET',
        label: 'Token de Autenticação do Webhook',
        whereToFind:
          'Configurações → Integrações → Webhooks → Token enviado no cabeçalho asaas-access-token.',
      },
    ],
  },
  pagarme: {
    id: 'pagarme',
    name: 'Pagar.me (Stone)',
    subtitle: 'API v5 · Pix · Boleto · Cartão Nacional com 3DS 2.0 e Antifraude',
    portalUrl: 'https://dash.pagar.me',
    authMode: 'Secret Key (sk_...) + Account ID',
    sandboxBaseUrl: 'https://api.pagar.me/core/v5',
    liveBaseUrl: 'https://api.pagar.me/core/v5',
    credentialVars: [
      {
        varName: 'BR_GATEWAY_API_KEY',
        label: 'Chave Secreta Pagar.me (sk_live / sk_test)',
        whereToFind:
          'Dashboard Pagar.me → Configurações → Chaves de API (use a chave sk_* somente no servidor).',
      },
      {
        varName: 'BR_GATEWAY_MERCHANT_ID',
        label: 'Account ID / Recipient ID',
        whereToFind:
          'Detalhes da Loja / Recebedor Principal (acc_... ou rp_...).',
      },
      {
        varName: 'BR_GATEWAY_WEBHOOK_SECRET',
        label: 'Segredo de Assinatura Webhook',
        whereToFind:
          'Configurações → Webhooks → Chave secreta de verificação dos eventos order.paid e charge.paid.',
      },
    ],
  },
  efi: {
    id: 'efi',
    name: 'Efí Bank (Gerencianet)',
    subtitle: 'API Pix Oficial Bacen · Boleto Bolix · Cartão de Crédito BR',
    portalUrl: 'https://app.sejaefi.com.br',
    authMode: 'OAuth2 Client Credentials (Client ID + Client Secret)',
    sandboxBaseUrl: 'https://pix-h.api.efipay.com.br',
    liveBaseUrl: 'https://pix.api.efipay.com.br',
    credentialVars: [
      {
        varName: 'BR_GATEWAY_CLIENT_ID',
        label: 'Client ID da Aplicação',
        whereToFind:
          'Painel Efí → API → Aplicações → Selecione sua aplicação (Homologação ou Produção).',
      },
      {
        varName: 'BR_GATEWAY_CLIENT_SECRET',
        label: 'Client Secret da Aplicação',
        whereToFind:
          'Exibido ao criar/editar a aplicação no módulo API da Efí Bank.',
      },
      {
        varName: 'BR_GATEWAY_WEBHOOK_SECRET',
        label: 'Hash / Segredo de Webhook mTLS',
        whereToFind:
          'Secção API → Configurar Webhook Pix / Cobranças.',
      },
    ],
  },
  stripe_br: {
    id: 'stripe_br',
    name: 'Stripe Brasil',
    subtitle: 'Cartão Nacional BRL · Boleto Bancário · Pix via EBANX/Stripe',
    portalUrl: 'https://dashboard.stripe.com/apikeys',
    authMode: 'Secret Key (sk_live / sk_test) + Webhook Endpoint Secret',
    sandboxBaseUrl: 'https://api.stripe.com/v1',
    liveBaseUrl: 'https://api.stripe.com/v1',
    credentialVars: [
      {
        varName: 'BR_GATEWAY_API_KEY',
        label: 'Secret Key (sk_test_... ou sk_live_...)',
        whereToFind:
          'Stripe Dashboard → Developers → API Keys.',
      },
      {
        varName: 'BR_GATEWAY_MERCHANT_ID',
        label: 'Account ID (acct_...)',
        whereToFind:
          'Configurações da Conta Stripe → Identificador da conta.',
      },
      {
        varName: 'BR_GATEWAY_WEBHOOK_SECRET',
        label: 'Webhook Signing Secret (whsec_...)',
        whereToFind:
          'Developers → Webhooks → Signing secret do endpoint cadastrado.',
      },
    ],
  },
  custom_br: {
    id: 'custom_br',
    name: 'Gateway BR Personalizado',
    subtitle: 'Integre qualquer provedor brasileiro (Iugu, Cielo, PagSeguro, Woovi, etc.)',
    portalUrl: 'https://pix.bcb.gov.br',
    authMode: 'Bearer Token / API Key / OAuth2 configurável via .env',
    sandboxBaseUrl: 'https://sandbox.seu-gateway-br.com.br/v1',
    liveBaseUrl: 'https://api.seu-gateway-br.com.br/v1',
    credentialVars: [
      {
        varName: 'BR_GATEWAY_API_BASE_URL',
        label: 'URL Base da API do Provedor',
        whereToFind:
          'Documentação técnica do provedor brasileiro escolhido (ex.: PagBank, Iugu, Cielo E-Commerce, Woovi).',
      },
      {
        varName: 'BR_GATEWAY_API_KEY',
        label: 'API Key / Access Token do Provedor',
        whereToFind:
          'Portal do lojista do gateway brasileiro selecionado (manter apenas no servidor).',
      },
      {
        varName: 'BR_GATEWAY_WEBHOOK_SECRET',
        label: 'Chave Secreta do Webhook',
        whereToFind:
          'Configurações de notificações/webhooks do gateway brasileiro escolhido.',
      },
    ],
  },
};

export function buildBrGatewayEnvTemplate(cfg: BrGatewayConfig): string {
  const preset = BR_PROVIDER_PRESETS[cfg.provider];
  const baseUrl =
    cfg.provider === 'custom_br' && cfg.customApiBaseUrl.trim()
      ? cfg.customApiBaseUrl.trim()
      : cfg.mode === 'live'
      ? preset.liveBaseUrl
      : preset.sandboxBaseUrl;

  const lines = [
    `# ${cfg.provider === 'custom_br' && cfg.customProviderName.trim() ? cfg.customProviderName.trim() : preset.name} (${cfg.mode.toUpperCase()})`,
    `BR_GATEWAY_PROVIDER="${cfg.provider}"`,
    `BR_GATEWAY_MODE="${cfg.mode}"`,
    `BR_GATEWAY_API_BASE_URL="${baseUrl}"`,
  ];

  if (cfg.provider === 'efi') {
    lines.push('BR_GATEWAY_CLIENT_ID="seu_client_id_efi"');
    lines.push('BR_GATEWAY_CLIENT_SECRET="seu_client_secret_efi"');
  } else if (cfg.provider === 'mercadopago') {
    lines.push('BR_GATEWAY_ACCESS_TOKEN="seu_access_token_mercado_pago"');
  } else {
    lines.push('BR_GATEWAY_API_KEY="sua_chave_secreta_servidor"');
  }

  lines.push(`BR_GATEWAY_MERCHANT_ID="${cfg.merchantOrAccountId || 'seu_merchant_account_id'}"`);
  lines.push('BR_GATEWAY_WEBHOOK_SECRET="seu_webhook_secret_hmac"');
  lines.push(`BR_PIX_ENABLED="${cfg.pixEnabled}"`);
  lines.push(`BR_BOLETO_ENABLED="${cfg.boletoEnabled}"`);
  lines.push(`BR_CREDIT_CARD_ENABLED="${cfg.creditCardEnabled}"`);
  lines.push(`BR_MAX_INSTALLMENTS="${cfg.maxInstallments}"`);

  return lines.join('\n');
}

export async function fetchBrGatewayState(): Promise<{
  config: BrGatewayConfig;
  serverStatus: BrGatewayServerStatus;
} | null> {
  try {
    const res = await fetch('/api/br-gateway/status');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.config || !data?.serverStatus) return null;
    return { config: data.config, serverStatus: data.serverStatus };
  } catch {
    return null;
  }
}

export async function saveBrGatewayConfigApi(
  config: BrGatewayConfig
): Promise<{ ok: boolean; config?: BrGatewayConfig; error?: string }> {
  try {
    const res = await fetch('/api/br-gateway/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Falha ao gravar configuração BR no servidor.' };
    }
    return { ok: true, config: data.config };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de rede ao salvar configuração BR.',
    };
  }
}

export async function testBrGatewayConnectionApi(payload: {
  endpointUrl: string;
  provider: BrGatewayProviderId;
  paymentMethod?: BrPaymentMethodKey;
}): Promise<{
  ok: boolean;
  captured: boolean;
  paymentMethod?: BrPaymentMethodKey;
  httpStatus: number;
  latencyMs?: number;
  reference?: string;
  testedUrl?: string;
  warning?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/br-gateway/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(res.ok && data.ok),
      captured: Boolean(data.captured),
      paymentMethod: data.paymentMethod,
      httpStatus: Number(data.httpStatus || res.status),
      latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
      reference: data.reference,
      testedUrl: data.testedUrl,
      warning: data.warning,
      error: data.error,
    };
  } catch (err) {
    return {
      ok: false,
      captured: false,
      paymentMethod: payload.paymentMethod,
      httpStatus: 0,
      error: err instanceof Error ? err.message : 'Falha de rede ao testar conexão BR.',
    };
  }
}

export async function testAllBrEndpointsApi(
  config: BrGatewayConfig,
  fallbackWebhookUrl: string
): Promise<Record<BrPaymentMethodKey, BrMethodEndpointStatus>> {
  const baseEndpoint = (config.webhookEndpoint || '').trim() || fallbackWebhookUrl;
  const targets: {
    method: BrPaymentMethodKey;
    label: string;
    enabled: boolean;
    endpointUrl: string;
  }[] = [
    {
      method: 'pix',
      label: 'Pix',
      enabled: config.pixEnabled,
      endpointUrl: (config.pixWebhookEndpoint || '').trim() || baseEndpoint,
    },
    {
      method: 'boleto',
      label: 'Boleto',
      enabled: config.boletoEnabled,
      endpointUrl: (config.boletoWebhookEndpoint || '').trim() || baseEndpoint,
    },
    {
      method: 'credit_card',
      label: 'Cartão',
      enabled: config.creditCardEnabled,
      endpointUrl: (config.creditCardWebhookEndpoint || '').trim() || baseEndpoint,
    },
  ];

  const entries = await Promise.all(
    targets.map(async (target): Promise<[BrPaymentMethodKey, BrMethodEndpointStatus]> => {
      if (!target.enabled) {
        return [
          target.method,
          {
            method: target.method,
            label: target.label,
            enabled: false,
            endpointUrl: target.endpointUrl,
            state: 'disabled',
            message: 'Método desativado na configuração',
          },
        ];
      }

      const res = await testBrGatewayConnectionApi({
        endpointUrl: target.endpointUrl,
        provider: config.provider,
        paymentMethod: target.method,
      });

      return [
        target.method,
        {
          method: target.method,
          label: target.label,
          enabled: true,
          endpointUrl: target.endpointUrl,
          state: res.ok ? 'ok' : 'error',
          httpStatus: res.httpStatus,
          latencyMs: res.latencyMs,
          message: res.ok
            ? `Capturado (${res.latencyMs ?? 0}ms)`
            : res.error || `HTTP ${res.httpStatus}`,
          testedAt: new Date().toISOString(),
        },
      ];
    })
  );

  return Object.fromEntries(entries) as Record<BrPaymentMethodKey, BrMethodEndpointStatus>;
}
