import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Play,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  clearWebhookLogsApi,
  fetchExpressLedgerApi,
  fetchWebhookLogsApi,
  ServerSettlementRecord,
  subscribeExpressStream,
  testWebhookConnectionApi,
  triggerWebhookTestApi,
  validateWebhookEndpointUrl,
  verifyWebhookGetEndpointApi,
  WebhookMonitorLog,
} from '../../services/angolaPspClient';

export type WebhookProviderChoice = 'appypay' | 'proxypay' | 'emis_gpo';

interface WebhookMonitorModuleProps {
  defaultProvider?: WebhookProviderChoice;
  publicWebhookUrl: string;
  webhookEndpoint?: string;
  onWebhookEndpointChange?: (url: string) => void;
  hasWebhookSecret: boolean;
}

type OutcomeFilter = 'all' | 'success' | 'error' | 'payouts';

const PROVIDER_LABELS: Record<string, string> = {
  appypay: 'AppyPay',
  proxypay: 'ProxyPay',
  emis_gpo: 'EMIS GPO',
  custom: 'PSP Custom',
  mercadopago: 'Mercado Pago BR',
  asaas: 'Asaas BR',
  pagarme: 'Pagar.me BR',
  efi: 'Efí Bank BR',
  stripe_br: 'Stripe Brasil',
  custom_br: 'Gateway BR Custom',
};

const EVENT_LABELS: Record<WebhookMonitorLog['eventType'], string> = {
  webhook_received: 'Webhook Recebido',
  payout_webhook_update: 'Retorno de Saque MCX',
  payout_submitted: 'Saque Enviado ao PSP',
  payout_rejected: 'Falha no Saque MCX',
  connection_test: 'Tentativa de Conexão',
};

const SOURCE_LABELS: Record<WebhookMonitorLog['source'], string> = {
  external_psp: 'PSP Externo',
  test_probe: 'Teste de Recepção',
  payout_dispatch: 'Motor de Saque',
};

export const WebhookMonitorModule: React.FC<WebhookMonitorModuleProps> = ({
  defaultProvider = 'appypay',
  publicWebhookUrl,
  webhookEndpoint,
  onWebhookEndpointChange,
  hasWebhookSecret,
}) => {
  const [logs, setLogs] = useState<WebhookMonitorLog[]>([]);
  const [ledgerPayouts, setLedgerPayouts] = useState<ServerSettlementRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sseConnected, setSseConnected] = useState<boolean>(false);

  const [localEndpoint, setLocalEndpoint] = useState<string>(webhookEndpoint || publicWebhookUrl);
  const activeEndpoint = webhookEndpoint !== undefined ? webhookEndpoint : localEndpoint;
  const setActiveEndpoint = onWebhookEndpointChange || setLocalEndpoint;

  const [testProvider, setTestProvider] = useState<WebhookProviderChoice>(defaultProvider);
  const [testReference, setTestReference] = useState<string>('');
  const [testAmount, setTestAmount] = useState<string>('15000');
  const [isDispatching, setIsDispatching] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [getCheckStatus, setGetCheckStatus] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const [filter, setFilter] = useState<OutcomeFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    setTestProvider(defaultProvider);
  }, [defaultProvider]);

  useEffect(() => {
    let mounted = true;
    const loadInitial = async () => {
      setIsLoading(true);
      const [initialLogs, ledgerItems] = await Promise.all([
        fetchWebhookLogsApi(),
        fetchExpressLedgerApi(),
      ]);
      if (!mounted) return;
      setLogs(initialLogs);
      setLedgerPayouts(ledgerItems.filter((item) => item.kind === 'payout').slice(0, 5));
      setIsLoading(false);
    };
    loadInitial();

    const unsubscribe = subscribeExpressStream(
      (eventName, payload) => {
        if (!mounted) return;
        if (eventName === 'ledger_snapshot') {
          if (Array.isArray(payload.logs)) {
            setLogs(payload.logs);
          }
          if (Array.isArray(payload.ledger)) {
            setLedgerPayouts(
              payload.ledger.filter((item) => item.kind === 'payout').slice(0, 5)
            );
          }
        } else if (eventName === 'webhook_log' && Array.isArray(payload.logs)) {
          setLogs(payload.logs);
        } else if (eventName === 'webhook_logs_cleared') {
          setLogs([]);
        } else if (
          (eventName === 'payout_created' || eventName === 'settlement_updated') &&
          Array.isArray(payload.ledger)
        ) {
          setLedgerPayouts(
            payload.ledger.filter((item) => item.kind === 'payout').slice(0, 5)
          );
        }
      },
      (connected) => {
        if (mounted) setSseConnected(connected);
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(activeEndpoint || publicWebhookUrl);
    setCopiedUrl(true);
    window.setTimeout(() => setCopiedUrl(false), 1800);
  };

  const handleVerifyGetEndpoint = async () => {
    setIsDispatching('get_verify');
    setGetCheckStatus(null);
    const res = await verifyWebhookGetEndpointApi();
    setIsDispatching(null);
    if (res.ok) {
      setGetCheckStatus(`HTTP ${res.httpStatus} · Endpoint GET operacional`);
    } else {
      setGetCheckStatus(`HTTP ${res.httpStatus || 'Erro'} · ${res.error || 'Falha na resposta'}`);
    }
  };

  const webhookUrlValidation = validateWebhookEndpointUrl(activeEndpoint);

  const handleTestEndpointConnection = async () => {
    if (!webhookUrlValidation.valid) return;
    setIsDispatching('connection_ping');
    setGetCheckStatus(null);
    setActionFeedback(null);
    const res = await testWebhookConnectionApi({
      endpointUrl: activeEndpoint.trim(),
      provider: testProvider,
    });
    setIsDispatching(null);

    if (res.ok) {
      setGetCheckStatus(
        `HTTP ${res.httpStatus}${res.latencyMs !== undefined ? ` · ${res.latencyMs}ms` : ''} · Evento capturado`
      );
      setActionFeedback({
        type: 'success',
        text: `Ping de callback capturado com sucesso (${res.reference || 'MH-PING'}).${
          res.warning ? ` ${res.warning}` : ''
        }`,
      });
    } else {
      setGetCheckStatus(`HTTP ${res.httpStatus || 'Erro'} · Falha na captura`);
      setActionFeedback({
        type: 'error',
        text: res.error || `Falha ao testar conexão com o Endpoint de Webhook (HTTP ${res.httpStatus}).`,
      });
    }
  };

  const handleRunWebhookTest = async (
    scenario: 'payout_success' | 'payout_error' | 'invalid_signature'
  ) => {
    setIsDispatching(scenario);
    setActionFeedback(null);
    const parsedAmount = Number(testAmount.replace(',', '.'));
    const result = await triggerWebhookTestApi({
      provider: testProvider,
      scenario,
      reference: testReference.trim() || undefined,
      amountAOA: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 15000,
    });
    setIsDispatching(null);

    if (scenario === 'invalid_signature') {
      if (result.httpStatus === 401) {
        setActionFeedback({
          type: 'success',
          text: `Teste de segurança passou: HTTP 401 rejeitou assinatura inválida e registou o log de erro em tempo real.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          text: `Resposta inesperada (${result.httpStatus}) ao testar assinatura inválida.`,
        });
      }
      return;
    }

    if (result.ok) {
      setActionFeedback({
        type: 'success',
        text: `Webhook ${PROVIDER_LABELS[testProvider]} entregue (HTTP ${result.httpStatus}) para ref ${result.reference}.`,
      });
    } else {
      setActionFeedback({
        type: 'error',
        text: result.error || `Falha ao entregar webhook (HTTP ${result.httpStatus}).`,
      });
    }
  };

  const handleClearLogs = async () => {
    const ok = await clearWebhookLogsApi();
    if (ok) {
      setLogs([]);
      setActionFeedback(null);
    }
  };

  const handleRefreshLogs = async () => {
    setIsLoading(true);
    const latest = await fetchWebhookLogsApi();
    setLogs(latest);
    setIsLoading(false);
  };

  const counts = useMemo(() => {
    let success = 0;
    let error = 0;
    let payouts = 0;
    for (const item of logs) {
      if (item.outcome === 'success') success += 1;
      else error += 1;
      if (item.transactionKind === 'payout') payouts += 1;
    }
    return { total: logs.length, success, error, payouts };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return logs.filter((entry) => {
      if (filter === 'success' && entry.outcome !== 'success') return false;
      if (filter === 'error' && entry.outcome !== 'error') return false;
      if (filter === 'payouts' && entry.transactionKind !== 'payout') return false;
      if (!query) return true;
      return (
        (entry.reference || '').toLowerCase().includes(query) ||
        entry.provider.toLowerCase().includes(query) ||
        entry.message.toLowerCase().includes(query)
      );
    });
  }, [logs, filter, searchTerm]);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('pt-AO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatAOA = (value?: number) => {
    if (value === undefined || !Number.isFinite(value)) return '—';
    return `${new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} AOA`;
  };

  return (
    <div className="space-y-5">
      {/* Header & Live Stream Telemetry Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Monitoramento em Tempo Real de Webhooks e Saques MCX</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <Radio
                className={`w-3.5 h-3.5 ${sseConnected ? 'text-emerald-400' : 'text-amber-400'}`}
              />
              <span>{sseConnected ? 'Stream SSE ativo' : 'A ligar ao stream SSE'}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {hasWebhookSecret ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">HMAC-SHA256 ativo</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300">Sem secret HMAC definido</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleVerifyGetEndpoint}
            disabled={isDispatching !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isDispatching === 'get_verify' ? 'animate-spin' : ''}`}
            />
            <span>Verificar GET</span>
          </button>
          <button
            type="button"
            onClick={handleCopyWebhookUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-emerald-300 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'URL Copiado' : 'Copiar Endpoint'}</span>
          </button>
        </div>
      </div>

      {/* Editable Webhook Endpoint + Test Connection Row */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="monitor-webhook-endpoint"
            className="text-xs font-medium text-slate-300"
          >
            Endpoint de Webhook ({PROVIDER_LABELS[testProvider]})
          </label>
          {getCheckStatus && (
            <span className="font-mono tabular-nums text-[11px] text-emerald-300 whitespace-nowrap shrink-0">
              {getCheckStatus}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            id="monitor-webhook-endpoint"
            type="url"
            value={activeEndpoint}
            aria-invalid={!webhookUrlValidation.valid}
            onChange={(e) => setActiveEndpoint(e.target.value)}
            placeholder="https://seu-dominio.com/api/webhooks/angola-psp"
            className={`flex-1 min-w-0 bg-slate-900 border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${
              webhookUrlValidation.valid
                ? 'border-slate-800 focus:border-emerald-500'
                : 'border-rose-500/60 focus:border-rose-400'
            }`}
          />
          <button
            type="button"
            onClick={handleTestEndpointConnection}
            disabled={isDispatching !== null || !webhookUrlValidation.valid}
            title={
              !webhookUrlValidation.valid
                ? webhookUrlValidation.error
                : 'Enviar ping real de callback para validar conexão'
            }
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isDispatching === 'connection_ping' ? 'animate-spin' : ''}`}
            />
            <span>
              {isDispatching === 'connection_ping' ? 'Testando...' : 'Testar Conexão'}
            </span>
          </button>
        </div>
        {!webhookUrlValidation.valid && (
          <p className="text-[11px] text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{webhookUrlValidation.error}</span>
          </p>
        )}
      </div>

      {/* Real Webhook Test Dispatcher */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-white">
              Testar Recepção Real de Webhook (POST /api/webhooks/angola-psp)
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Envia um HTTP POST real com assinatura HMAC e estrutura oficial do provedor selecionado para validar o processamento de saques.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 self-start md:self-auto shrink-0">
            {(['appypay', 'proxypay', 'emis_gpo'] as WebhookProviderChoice[]).map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => setTestProvider(prov)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                  testProvider === prov
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {PROVIDER_LABELS[prov]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Referência da Transação (opcional)
            </label>
            <input
              type="text"
              value={testReference}
              onChange={(e) => setTestReference(e.target.value)}
              placeholder="Ex: MH-PAY-... (vazio gera MH-TEST-...)"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Valor do Saque (AOA)
            </label>
            <input
              type="number"
              min="1"
              step="100"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {ledgerPayouts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Saques recentes:</span>
            {ledgerPayouts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTestReference(item.reference);
                  setTestAmount(String(item.amountAOA));
                }}
                className="font-mono text-[11px] text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                {item.reference}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleRunWebhookTest('payout_success')}
            disabled={isDispatching !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {isDispatching === 'payout_success'
                ? 'Enviando...'
                : `Testar Sucesso (${PROVIDER_LABELS[testProvider]})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleRunWebhookTest('payout_error')}
            disabled={isDispatching !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-300 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>
              {isDispatching === 'payout_error'
                ? 'Enviando...'
                : 'Simular Falha de Saque'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleRunWebhookTest('invalid_signature')}
            disabled={isDispatching !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isDispatching === 'invalid_signature'
                ? 'Testando...'
                : 'Testar Erro HMAC (401)'}
            </span>
          </button>
        </div>

        {actionFeedback && (
          <div
            className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
        )}
      </div>

      {/* Logs Filter, Metrics Summary & Search */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <span className="text-slate-200 font-semibold">{counts.total} eventos</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">{counts.success} sucesso</span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-400">{counts.error} erro</span>
            <span aria-hidden="true">·</span>
            <span>{counts.payouts} saques MCX</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'success', label: 'Sucesso' },
                  { id: 'error', label: 'Erro' },
                  { id: 'payouts', label: 'Saques MCX' },
                ] as { id: OutcomeFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                    filter === tab.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRefreshLogs}
              aria-label="Atualizar logs"
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por referência, provedor (AppyPay/ProxyPay) ou mensagem..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Log Stream Surface */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-800/80">
              {[1, 2, 3].map((row) => (
                <div key={row} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="h-3.5 w-48 bg-slate-800 rounded animate-pulse" />
                  <div className="h-3.5 w-24 bg-slate-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {logs.length === 0
                  ? 'Nenhum evento de webhook registado ainda. Execute um teste acima ou processe um saque via Multicaixa Express para acompanhar logs de sucesso ou erro em tempo real.'
                  : 'Nenhum log corresponde ao filtro selecionado.'}
              </p>
              {logs.length === 0 && (
                <button
                  type="button"
                  onClick={() => handleRunWebhookTest('payout_success')}
                  disabled={isDispatching !== null}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Executar Primeiro Teste</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
              {filteredLogs.map((entry) => {
                const isExpanded = expandedLogId === entry.id;
                const isSuccess = entry.outcome === 'success';
                return (
                  <div key={entry.id} className="px-4 py-3 hover:bg-slate-900/60 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
                            isSuccess ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{isSuccess ? 'Sucesso' : 'Erro'}</span>
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="font-mono tabular-nums text-slate-300 shrink-0">
                          HTTP {entry.httpStatus}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="font-medium text-white shrink-0">
                          {PROVIDER_LABELS[entry.provider] || entry.provider}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="text-slate-400 truncate">
                          {EVENT_LABELS[entry.eventType]} ({SOURCE_LABELS[entry.source]})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-400 shrink-0">
                        {entry.amountAOA !== undefined && (
                          <span className="text-slate-200">{formatAOA(entry.amountAOA)}</span>
                        )}
                        <span>{formatTime(entry.timestamp)}</span>
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                          aria-label={isExpanded ? 'Ocultar payload JSON' : 'Ver payload JSON'}
                          className="inline-flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <span>Payload</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      {entry.reference && (
                        <>
                          <code className="font-mono text-amber-300">{entry.reference}</code>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                        </>
                      )}
                      <span>{entry.message}</span>
                      {entry.signatureValid !== null && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span
                            className={
                              entry.signatureValid ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {entry.signatureValid ? 'HMAC Válido' : 'HMAC Inválido'}
                          </span>
                        </>
                      )}
                    </div>

                    {isExpanded && (
                      <pre className="mt-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed">
                        {entry.payloadSnippet}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
