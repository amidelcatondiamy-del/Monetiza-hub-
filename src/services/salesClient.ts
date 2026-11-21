export type RealSaleOrderStatus = 'pending' | 'approved' | 'failed' | 'refunded';

export type RealPaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'stripe' | 'multicaixa';

export interface RealSaleOrder {
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
  paymentMethod: RealPaymentMethod;
  gatewayProvider: string;
  gatewayMode: 'sandbox' | 'live';
  externalChargeId: string;
  authorizationCode?: string;
  status: RealSaleOrderStatus;
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

export interface SalesGatewayReadiness {
  angolaPsp: {
    configured: boolean;
    provider: string;
    mode: 'sandbox' | 'live';
    missingEnvVars: string[];
    warnings?: string[];
  };
  brGateway: {
    configured: boolean;
    provider: string;
    mode: 'sandbox' | 'live';
    missingEnvVars: string[];
    enabledMethods: {
      pix: boolean;
      boleto: boolean;
      credit_card: boolean;
    };
  };
  summary: {
    totalOrders: number;
    approvedOrders: number;
    pendingOrders: number;
    failedOrders: number;
    grossRevenueBRL: number;
    netRevenueBRL: number;
  };
}

export async function fetchSalesStatusApi(): Promise<SalesGatewayReadiness | null> {
  try {
    const res = await fetch('/api/sales/status');
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean } & Partial<SalesGatewayReadiness>;
    if (!data.angolaPsp || !data.brGateway || !data.summary) return null;
    return {
      angolaPsp: data.angolaPsp,
      brGateway: data.brGateway,
      summary: data.summary,
    };
  } catch {
    return null;
  }
}

export async function fetchSalesOrdersApi(): Promise<RealSaleOrder[]> {
  try {
    const res = await fetch('/api/sales/orders');
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: RealSaleOrder[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function createRealSaleCheckoutApi(payload: {
  type: RealSaleOrder['type'];
  itemId?: string;
  title: string;
  customerName: string;
  customerEmail: string;
  customerDocument?: string;
  customerPhone?: string;
  grossAmount: number;
  fee?: number;
  netAmount?: number;
  currency: RealSaleOrder['currency'];
  chargedAmount?: number;
  paymentMethod: RealPaymentMethod;
  installments?: number;
  cardToken?: string;
  card?: {
    number: string;
    holderName: string;
    expMonth: string;
    expYear: string;
    cvv: string;
  };
  couponCode?: string;
  affiliateCode?: string;
  message?: string;
}): Promise<{
  ok: boolean;
  code?: string;
  gatewayType?: 'angola_psp' | 'br_gateway';
  provider?: string;
  missingEnvVars?: string[];
  error?: string;
  order?: RealSaleOrder;
}> {
  try {
    const res = await fetch('/api/sales/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      gatewayType?: 'angola_psp' | 'br_gateway';
      provider?: string;
      missingEnvVars?: string[];
      error?: string;
      order?: RealSaleOrder;
    };
    return {
      ok: Boolean(res.ok && data.ok && data.order),
      code: data.code,
      gatewayType: data.gatewayType,
      provider: data.provider,
      missingEnvVars: Array.isArray(data.missingEnvVars) ? data.missingEnvVars : undefined,
      error: data.error || (!res.ok ? `Erro HTTP ${res.status} ao criar cobrança real.` : undefined),
      order: data.order,
    };
  } catch (err) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      error: err instanceof Error ? err.message : 'Erro de rede ao contactar servidor de pagamentos.',
    };
  }
}

export async function verifyRealSaleOrderApi(orderId: string): Promise<{
  ok: boolean;
  order?: RealSaleOrder;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/sales/orders/${encodeURIComponent(orderId)}/verify`, {
      method: 'POST',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      order?: RealSaleOrder;
      error?: string;
    };
    return {
      ok: Boolean(res.ok && data.ok),
      order: data.order,
      error: data.error,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de rede ao verificar status da venda.',
    };
  }
}
