export interface AngolaPspStatus {
  configured: boolean;
  provider: 'appypay' | 'proxypay' | 'emis_gpo' | 'custom';
  mode: 'sandbox' | 'live';
  hasWebhookSecret: boolean;
  hasPayoutEndpoint: boolean;
  missingEnvVars: string[];
  warnings?: string[];
}

export interface ServerSettlementRecord {
  id: string;
  kind: 'payout' | 'charge';
  provider: string;
  mode: 'sandbox' | 'live';
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

export interface WebhookMonitorLog {
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

export interface HttpRequestLog {
  id: string;
  timestamp: string;
  method: string;
  endpointUrl: string;
  statusCode: number;
  latencyMs: number;
  provider?: string;
  errorSummary?: string;
}

export interface ExpressStreamPayload {
  record?: ServerSettlementRecord;
  ledger?: ServerSettlementRecord[];
  order?: unknown;
  orders?: unknown[];
  log?: WebhookMonitorLog;
  logs?: WebhookMonitorLog[];
  requestLog?: HttpRequestLog;
  requestLogs?: HttpRequestLog[];
  webhookSubscriptions?: unknown[];
  timestamp?: string;
}

export interface PspConnectionValidationResult {
  ok: boolean;
  connected: boolean;
  statusLabel: 'Conectado com Sucesso' | 'Erro de Credenciais';
  provider: string;
  mode: 'sandbox' | 'live';
  authMethod: string;
  testedUrl: string;
  httpStatus: number;
  latencyMs: number;
  message: string;
  missingEnvVars?: string[];
  warnings?: string[];
  checkedAt: string;
}

export async function fetchAngolaPspStatus(): Promise<AngolaPspStatus | null> {
  try {
    const res = await fetch('/api/angola-psp/status');
    if (!res.ok) return null;
    return (await res.json()) as AngolaPspStatus;
  } catch {
    return null;
  }
}

export async function validateAngolaPspConnectionApi(payload?: {
  provider?: 'appypay' | 'proxypay' | 'emis_gpo';
  mode?: 'sandbox' | 'live';
}): Promise<PspConnectionValidationResult> {
  try {
    const res = await fetch('/api/angola-psp/validate-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<PspConnectionValidationResult>;
    const connected = Boolean(res.ok && data.connected);
    return {
      ok: Boolean(res.ok && data.ok),
      connected,
      statusLabel:
        data.statusLabel === 'Conectado com Sucesso'
          ? 'Conectado com Sucesso'
          : 'Erro de Credenciais',
      provider: data.provider || payload?.provider || 'appypay',
      mode: data.mode || payload?.mode || 'sandbox',
      authMethod: data.authMethod || 'Credenciais do servidor',
      testedUrl: data.testedUrl || '/api/angola-psp/validate-connection',
      httpStatus: Number(data.httpStatus ?? res.status),
      latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : 0,
      message:
        data.message ||
        (connected
          ? 'Ligação autenticada confirmada.'
          : 'Não foi possível autenticar com as credenciais configuradas no servidor.'),
      missingEnvVars: Array.isArray(data.missingEnvVars) ? data.missingEnvVars : undefined,
      warnings: Array.isArray(data.warnings) ? data.warnings : undefined,
      checkedAt: data.checkedAt || new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      connected: false,
      statusLabel: 'Erro de Credenciais',
      provider: payload?.provider || 'appypay',
      mode: payload?.mode || 'sandbox',
      authMethod: 'Falha de rede',
      testedUrl: '/api/angola-psp/validate-connection',
      httpStatus: 0,
      latencyMs: 0,
      message:
        err instanceof Error
          ? err.message
          : 'Erro de rede ao executar validação autenticada no servidor.',
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function executeExpressPayoutApi(payload: {
  amountAOA: number;
  phone: string;
  bankName?: string;
  iban?: string;
  reference?: string;
  beneficiaryName?: string;
}): Promise<{
  success: boolean;
  code?: string;
  error?: string;
  missingEnvVars?: string[];
  payout?: ServerSettlementRecord;
}> {
  try {
    const res = await fetch('/api/multicaixa-express/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return {
      success: Boolean(res.ok && data.success),
      code: data.code,
      error: data.error,
      missingEnvVars: data.missingEnvVars,
      payout: data.payout,
    };
  } catch (err) {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: err instanceof Error ? err.message : 'Erro de rede ao contactar servidor PSP.',
    };
  }
}

export async function createExpressChargeApi(payload: {
  amountAOA: number;
  phone: string;
  reference?: string;
  description?: string;
  customerEmail?: string;
}): Promise<{
  success: boolean;
  code?: string;
  error?: string;
  missingEnvVars?: string[];
  charge?: ServerSettlementRecord;
}> {
  try {
    const res = await fetch('/api/multicaixa-express/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return {
      success: Boolean(res.ok && data.success),
      code: data.code,
      error: data.error,
      missingEnvVars: data.missingEnvVars,
      charge: data.charge,
    };
  } catch (err) {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: err instanceof Error ? err.message : 'Erro de rede ao contactar servidor PSP.',
    };
  }
}

export async function queryExpressTransactionApi(txId: string): Promise<{
  success: boolean;
  transaction?: ServerSettlementRecord | null;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/multicaixa-express/transactions/${encodeURIComponent(txId)}`);
    const data = await res.json();
    return {
      success: Boolean(res.ok && data.success),
      transaction: data.transaction ?? data.localRecord ?? null,
      error: data.error,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao consultar transação no servidor.',
    };
  }
}

export async function fetchExpressLedgerApi(): Promise<ServerSettlementRecord[]> {
  try {
    const res = await fetch('/api/multicaixa-express/ledger');
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: ServerSettlementRecord[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function fetchWebhookLogsApi(): Promise<WebhookMonitorLog[]> {
  try {
    const res = await fetch('/api/webhooks/angola-psp/logs');
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: WebhookMonitorLog[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function clearWebhookLogsApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/webhooks/angola-psp/logs', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function triggerWebhookTestApi(payload: {
  provider: 'appypay' | 'proxypay' | 'emis_gpo';
  scenario: 'payout_success' | 'payout_error' | 'invalid_signature';
  reference?: string;
  amountAOA?: number;
}): Promise<{
  ok: boolean;
  httpStatus: number;
  provider?: string;
  scenario?: string;
  reference?: string;
  hmacUsed?: boolean;
  response?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const res = await fetch('/api/webhooks/angola-psp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return {
      ok: Boolean(res.ok && data.ok),
      httpStatus: Number(data.httpStatus || res.status),
      provider: data.provider,
      scenario: data.scenario,
      reference: data.reference,
      hmacUsed: data.hmacUsed,
      response: data.response,
      error: data.error,
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: 0,
      error: err instanceof Error ? err.message : 'Falha de rede ao testar webhook.',
    };
  }
}

export function validateWebhookEndpointUrl(rawUrl: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Informe o Endpoint de Webhook (ex: https://seu-dominio.com/api/webhooks/angola-psp).',
    };
  }
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      error: 'O Endpoint de Webhook não pode conter espaços.',
    };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        valid: false,
        error: 'O URL do webhook deve iniciar com https:// ou http://.',
      };
    }
    const host = parsed.hostname.toLowerCase();
    const isValidHost =
      host === 'localhost' ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
      /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host);
    if (!isValidHost) {
      return {
        valid: false,
        error: 'Domínio inválido no Endpoint de Webhook. Verifique o endereço inserido.',
      };
    }
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Formato de URL inválido. Utilize um endereço completo (ex: https://dominio.ao/api/webhooks/angola-psp).',
    };
  }
}

export async function testWebhookConnectionApi(payload: {
  endpointUrl: string;
  provider?: 'appypay' | 'proxypay' | 'emis_gpo';
}): Promise<{
  ok: boolean;
  captured: boolean;
  httpStatus: number;
  latencyMs?: number;
  reference?: string;
  testedUrl?: string;
  hmacUsed?: boolean;
  warning?: string;
  error?: string;
  response?: Record<string, unknown>;
}> {
  try {
    const res = await fetch('/api/webhooks/angola-psp/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(res.ok && data.ok),
      captured: Boolean(data.captured),
      httpStatus: Number(data.httpStatus || res.status),
      latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
      reference: data.reference,
      testedUrl: data.testedUrl,
      hmacUsed: data.hmacUsed,
      warning: data.warning,
      error: data.error,
      response: data.response,
    };
  } catch (err) {
    return {
      ok: false,
      captured: false,
      httpStatus: 0,
      error: err instanceof Error ? err.message : 'Falha de rede ao testar conexão do webhook.',
    };
  }
}

export async function verifyWebhookGetEndpointApi(): Promise<{
  ok: boolean;
  httpStatus: number;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const res = await fetch('/api/webhooks/angola-psp');
    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(res.ok && data.ok),
      httpStatus: res.status,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: 0,
      error: err instanceof Error ? err.message : 'Falha ao consultar endpoint de webhook.',
    };
  }
}

export async function fetchRequestLogsApi(): Promise<HttpRequestLog[]> {
  try {
    const res = await fetch('/api/request-logs');
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: HttpRequestLog[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function clearRequestLogsApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/request-logs', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export function subscribeExpressStream(
  onEvent: (eventName: string, payload: ExpressStreamPayload) => void,
  onConnectionChange?: (connected: boolean) => void
): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }

  const es = new EventSource('/api/multicaixa-express/stream');
  const events = [
    'ledger_snapshot',
    'charge_created',
    'payout_created',
    'settlement_updated',
    'sale_created',
    'sale_updated',
    'webhook_log',
    'webhook_logs_cleared',
    'request_log',
    'request_logs_cleared',
    'webhook_subscriptions_updated',
  ];

  es.onopen = () => {
    onConnectionChange?.(true);
  };

  es.onerror = () => {
    onConnectionChange?.(false);
  };

  const listeners = events.map((ev) => {
    const handler = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as ExpressStreamPayload;
        onConnectionChange?.(true);
        onEvent(ev, parsed);
      } catch {
        // Ignore malformed SSE payload
      }
    };
    es.addEventListener(ev, handler);
    return { ev, handler };
  });

  return () => {
    listeners.forEach(({ ev, handler }) => es.removeEventListener(ev, handler));
    es.close();
  };
}
