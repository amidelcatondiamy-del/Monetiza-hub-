export interface WebhookSubscriptionLastExecution {
  status: 'success' | 'error';
  httpStatus: number;
  latencyMs: number;
  executedAt: string;
  message: string;
}

export interface WebhookSubscription {
  id: string;
  eventType: string;
  endpointUrl: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecution?: WebhookSubscriptionLastExecution | null;
}

export const PRESET_WEBHOOK_EVENTS: {
  eventType: string;
  label: string;
  description: string;
}[] = [
  {
    eventType: 'transação.aprovada',
    label: 'transação.aprovada',
    description: 'Notifica quando um pagamento Multicaixa, Pix ou Cartão é liquidado.',
  },
  {
    eventType: 'saldo.alterado',
    label: 'saldo.alterado',
    description: 'Disparado sempre que há variação de saldo disponível ou bloqueado.',
  },
  {
    eventType: 'saque.realizado',
    label: 'saque.realizado',
    description: 'Confirma a liquidação bancária / Multicaixa Express do saque.',
  },
  {
    eventType: 'transação.recusada',
    label: 'transação.recusada',
    description: 'Notifica recusa pelo emissor, saldo insuficiente ou timeout.',
  },
  {
    eventType: 'chargeback.aberto',
    label: 'chargeback.aberto',
    description: 'Alerta imediato para contestação ou disputa de pagamento.',
  },
];

export async function fetchWebhookSubscriptionsApi(): Promise<WebhookSubscription[]> {
  try {
    const res = await fetch('/api/webhook-subscriptions');
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: WebhookSubscription[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function createWebhookSubscriptionApi(payload: {
  eventType: string;
  endpointUrl: string;
  description?: string;
  active?: boolean;
}): Promise<{ ok: boolean; items?: WebhookSubscription[]; error?: string }> {
  try {
    const res = await fetch('/api/webhook-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      items?: WebhookSubscription[];
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Falha ao criar subscrição de webhook.' };
    }
    return { ok: true, items: data.items };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de rede ao criar subscrição.',
    };
  }
}

export async function updateWebhookSubscriptionApi(
  id: string,
  patch: Partial<Pick<WebhookSubscription, 'eventType' | 'endpointUrl' | 'description' | 'active'>>
): Promise<{ ok: boolean; items?: WebhookSubscription[]; error?: string }> {
  try {
    const res = await fetch(`/api/webhook-subscriptions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      items?: WebhookSubscription[];
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Falha ao atualizar subscrição.' };
    }
    return { ok: true, items: data.items };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de rede ao atualizar subscrição.',
    };
  }
}

export async function deleteWebhookSubscriptionApi(
  id: string
): Promise<{ ok: boolean; items?: WebhookSubscription[]; error?: string }> {
  try {
    const res = await fetch(`/api/webhook-subscriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      items?: WebhookSubscription[];
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Falha ao remover subscrição.' };
    }
    return { ok: true, items: data.items };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de rede ao remover subscrição.',
    };
  }
}

export async function testWebhookSubscriptionApi(
  id: string
): Promise<{ ok: boolean; items?: WebhookSubscription[]; error?: string }> {
  try {
    const res = await fetch(`/api/webhook-subscriptions/${encodeURIComponent(id)}/test`, {
      method: 'POST',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      items?: WebhookSubscription[];
      error?: string;
    };
    return {
      ok: Boolean(data.ok),
      items: data.items,
      error: data.error,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha de rede ao testar subscrição.',
    };
  }
}
