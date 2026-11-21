import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Globe,
  History,
  Landmark,
  Play,
  PlugZap,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  clearWebhookLogsApi,
  fetchWebhookLogsApi,
  subscribeExpressStream,
  testWebhookConnectionApi,
  triggerWebhookTestApi,
  validateAngolaPspConnectionApi,
  WebhookMonitorLog,
} from '../../services/angolaPspClient';

type CategoryFilter = 'all' | 'connection' | 'webhook' | 'errors';
type RegionFilter = 'all' | 'angola' | 'brazil';

interface LogHistoryModuleProps {
  configuredWebhookUrl?: string;
  selectedProvider?: 'appypay' | 'proxypay' | 'emis_gpo';
  onOpenWebhookSettings?: () => void;
}

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
  connection_test: 'Tentativa de Conexão',
  webhook_received: 'Callback Webhook Recebido',
  payout_webhook_update: 'Retorno de Saque MCX',
  payout_submitted: 'Saque Enviado ao PSP',
  payout_rejected: 'Falha no Saque MCX',
};

const BR_PROVIDERS = new Set(['mercadopago', 'asaas', 'pagarme', 'efi', 'stripe_br', 'custom_br']);

function isBrazilLog(entry: WebhookMonitorLog): boolean {
  if (entry.channel && entry.channel.startsWith('BR_')) return true;
  if (BR_PROVIDERS.has(entry.provider.toLowerCase())) return true;
  if (entry.endpointUrl && entry.endpointUrl.includes('/api/webhooks/br-gateway')) return true;
  return false;
}

function getDiagnosticHint(entry: WebhookMonitorLog): string | null {
  if (entry.outcome === 'success') return null;

  if (entry.httpStatus === 401 || entry.signatureValid === false) {
    return 'Assinatura HMAC-SHA256 rejeitada ou credenciais inválidas (HTTP 401). Confirme se ANGOLA_PSP_WEBHOOK_SECRET / API Key no servidor coincide com o portal do gateway.';
  }
  if (entry.httpStatus === 404) {
    return 'Endpoint não encontrado (HTTP 404). Verifique se o URL termina em /api/webhooks/angola-psp (Angola) ou /api/webhooks/br-gateway (Brasil).';
  }
  if (entry.httpStatus === 502 || entry.httpStatus === 504 || entry.httpStatus === 0) {
    return 'Falha de rede ou timeout ao contactar o endpoint (HTTP 502). Para callbacks externos reais, utilize o URL público (ais-pre-... ou domínio próprio).';
  }
  if (entry.httpStatus === 422 || entry.eventType === 'payout_rejected') {
    return 'Operação recusada pelo gateway (HTTP 422). Verifique saldo no merchant, formato de IBAN/telemóvel MCX ou ambiente Sandbox vs Live.';
  }
  if (entry.httpStatus >= 400) {
    return `O endpoint devolveu HTTP ${entry.httpStatus}. Abra o payload JSON de resposta da API para verificar os campos ausentes ou erro de autenticação.`;
  }
  return 'Inspecione o JSON da resposta da API e valide as variáveis de ambiente do servidor.';
}

export const LogHistoryModule: React.FC<LogHistoryModuleProps> = ({
  configuredWebhookUrl,
  selectedProvider = 'appypay',
  onOpenWebhookSettings,
}) => {
  const [logs, setLogs] = useState<WebhookMonitorLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRunningProbe, setIsRunningProbe] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    const items = await fetchWebhookLogsApi();
    setLogs(items);
    setIsLoading(false);
  };

  useEffect(() => {
    let active = true;
    loadLogs();

    const unsubscribe = subscribeExpressStream(
      (eventType, payload) => {
        if (!active) return;
        setSseConnected(true);
        if (eventType === 'ledger_snapshot' && Array.isArray(payload.logs)) {
          setLogs(payload.logs);
        } else if (eventType === 'webhook_log' && payload.log) {
          setLogs((prev) => {
            const withoutDup = prev.filter((item) => item.id !== payload.log!.id);
            return [payload.log!, ...withoutDup].slice(0, 80);
          });
        } else if (eventType === 'webhook_log' && Array.isArray(payload.logs)) {
          setLogs(payload.logs);
        } else if (eventType === 'webhook_logs_cleared') {
          setLogs([]);
        }
      },
      (connected) => {
        if (active) setSseConnected(connected);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleClear = async () => {
    const ok = await clearWebhookLogsApi();
    if (ok) {
      setLogs([]);
      setExpandedId(null);
      setStatusFeedback({ type: 'success', text: 'Histórico de logs limpo no servidor.' });
      window.setTimeout(() => setStatusFeedback(null), 3000);
    }
  };

  const handleProbeConnectionNow = async () => {
    setIsRunningProbe('auth');
    setStatusFeedback(null);
    const authRes = await validateAngolaPspConnectionApi({ provider: selectedProvider });
    setIsRunningProbe(null);
    setStatusFeedback({
      type: authRes.connected ? 'success' : 'error',
      text: `${authRes.statusLabel} (HTTP ${authRes.httpStatus} · ${authRes.latencyMs}ms): ${authRes.message}`,
    });
  };

  const handleProbeWebhookNow = async () => {
    const defaultUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/webhooks/angola-psp`
        : '/api/webhooks/angola-psp';
    const targetUrl = (configuredWebhookUrl || '').trim() || defaultUrl;
    setIsRunningProbe('webhook_ping');
    setStatusFeedback(null);
    const res = await testWebhookConnectionApi({
      endpointUrl: targetUrl,
      provider: selectedProvider,
    });
    setIsRunningProbe(null);
    setStatusFeedback({
      type: res.ok ? 'success' : 'error',
      text: res.ok
        ? `Callback de webhook capturado com sucesso (HTTP ${res.httpStatus}${res.latencyMs ? ` · ${res.latencyMs}ms` : ''}).`
        : res.error || `Falha no ping ao webhook configurado (HTTP ${res.httpStatus}).`,
    });
  };

  const handleSimulateCallback = async (scenario: 'payout_success' | 'invalid_signature') => {
    setIsRunningProbe(scenario);
    setStatusFeedback(null);
    const res = await triggerWebhookTestApi({
      provider: selectedProvider,
      scenario,
      amountAOA: 15000,
    });
    setIsRunningProbe(null);
    if (scenario === 'invalid_signature') {
      setStatusFeedback({
        type: res.httpStatus === 401 ? 'success' : 'error',
        text: `Callback de assinatura inválida retornou HTTP ${res.httpStatus} e foi registado na tabela abaixo.`,
      });
    } else {
      setStatusFeedback({
        type: res.ok ? 'success' : 'error',
        text: res.ok
          ? `Callback ${PROVIDER_LABELS[selectedProvider]} recebido (HTTP ${res.httpStatus}) · Ref ${res.reference}.`
          : res.error || `Erro ao receber callback (HTTP ${res.httpStatus}).`,
      });
    }
  };

  const handleCopyPayload = (entry: WebhookMonitorLog) => {
    navigator.clipboard.writeText(entry.payloadSnippet);
    setCopiedId(entry.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const metrics = useMemo(() => {
    const connectionCount = logs.filter((l) => l.eventType === 'connection_test').length;
    const webhookCount = logs.filter(
      (l) => l.eventType === 'webhook_received' || l.eventType === 'payout_webhook_update'
    ).length;
    const errorCount = logs.filter((l) => l.outcome === 'error').length;
    const latencies = logs
      .map((l) => l.latencyMs)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const avgLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((acc, v) => acc + v, 0) / latencies.length)
        : null;
    return {
      total: logs.length,
      connectionCount,
      webhookCount,
      errorCount,
      avgLatencyMs,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return logs.filter((entry) => {
      if (categoryFilter === 'connection' && entry.eventType !== 'connection_test') {
        return false;
      }
      if (
        categoryFilter === 'webhook' &&
        entry.eventType !== 'webhook_received' &&
        entry.eventType !== 'payout_webhook_update'
      ) {
        return false;
      }
      if (categoryFilter === 'errors' && entry.outcome !== 'error') {
        return false;
      }

      const isBr = isBrazilLog(entry);
      if (regionFilter === 'brazil' && !isBr) return false;
      if (regionFilter === 'angola' && isBr) return false;

      if (!q) return true;
      return (
        entry.provider.toLowerCase().includes(q) ||
        (entry.reference || '').toLowerCase().includes(q) ||
        (entry.endpointUrl || '').toLowerCase().includes(q) ||
        entry.message.toLowerCase().includes(q) ||
        entry.payloadSnippet.toLowerCase().includes(q) ||
        String(entry.httpStatus).includes(q) ||
        (entry.channel || '').toLowerCase().includes(q)
      );
    });
  }, [logs, categoryFilter, regionFilter, searchTerm]);

  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Histórico de Logs · Conexões e Callbacks de Webhooks</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoramento em tempo real das tentativas de conexão com o PSP e dos callbacks recebidos pelos webhooks configurados para facilitar a depuração.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap shrink-0 ${
              sseConnected
                ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>{sseConnected ? 'Tempo Real Ativo' : 'Conectando SSE'}</span>
          </span>

          <button
            type="button"
            onClick={loadLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Diagnostic Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-slate-800 bg-slate-950 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
        <div className="px-4 py-3">
          <div className="text-[11px] text-slate-400">Tentativas de Conexão</div>
          <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
            {metrics.connectionCount}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] text-slate-400">Callbacks Recebidos</div>
          <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
            {metrics.webhookCount}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] text-slate-400">Erros / Falhas</div>
          <div
            className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
              metrics.errorCount > 0 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {metrics.errorCount}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] text-slate-400">Latência Média</div>
          <div className="text-lg font-bold text-amber-300 font-mono tabular-nums mt-0.5">
            {metrics.avgLatencyMs !== null ? `${metrics.avgLatencyMs}ms` : '—'}
          </div>
        </div>
      </div>

      {/* Quick Debug Bar: Trigger Connection Test & Webhook Callbacks Directly */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="text-xs text-slate-300 min-w-0">
          <span className="font-semibold text-white">Depuração Rápida ({PROVIDER_LABELS[selectedProvider]}): </span>
          <span className="text-slate-400 font-mono text-[11px] break-all">
            {configuredWebhookUrl || '/api/webhooks/angola-psp'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleProbeConnectionNow}
            disabled={isRunningProbe !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <PlugZap className="w-3.5 h-3.5" />
            <span>{isRunningProbe === 'auth' ? 'Validando...' : 'Testar Conexão PSP'}</span>
          </button>

          <button
            type="button"
            onClick={handleProbeWebhookNow}
            disabled={isRunningProbe !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {isRunningProbe === 'webhook_ping' ? 'Enviando...' : 'Ping Webhook Configurado'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSimulateCallback('payout_success')}
            disabled={isRunningProbe !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simular Callback 200</span>
          </button>

          <button
            type="button"
            onClick={() => handleSimulateCallback('invalid_signature')}
            disabled={isRunningProbe !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-500/35 text-rose-300 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Simular Erro 401</span>
          </button>
        </div>
      </div>

      {statusFeedback && (
        <div
          role="status"
          className={`px-3.5 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            statusFeedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusFeedback.text}</span>
          </div>
          {onOpenWebhookSettings && (
            <button
              type="button"
              onClick={onOpenWebhookSettings}
              className="text-[11px] font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Configurar Endpoint
            </button>
          )}
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
            {(
              [
                { id: 'all', label: `Todos (${metrics.total})` },
                { id: 'connection', label: `Conexões (${metrics.connectionCount})` },
                { id: 'webhook', label: `Webhooks (${metrics.webhookCount})` },
                { id: 'errors', label: `Erros (${metrics.errorCount})` },
              ] as { id: CategoryFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  categoryFilter === tab.id
                    ? tab.id === 'errors'
                      ? 'bg-rose-950 text-rose-300'
                      : 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
            {(
              [
                { id: 'all', label: 'Todas Regiões' },
                { id: 'angola', label: 'PSP Angola' },
                { id: 'brazil', label: 'Gateway BR' },
              ] as { id: RegionFilter; label: string }[]
            ).map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => setRegionFilter(reg.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  regionFilter === reg.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar URL, HTTP, referência ou mensagem..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Structured Log Table: Data | Origem & Evento | Status (Sucesso/Erro) | Mensagem de Resposta da API */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-800/80">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="px-4 py-3.5 flex items-center justify-between gap-4">
                <div className="h-3.5 w-28 bg-slate-800 rounded animate-pulse" />
                <div className="h-3.5 w-36 bg-slate-800 rounded animate-pulse" />
                <div className="h-3.5 w-24 bg-slate-800 rounded animate-pulse" />
                <div className="h-3.5 w-64 bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center space-y-2.5">
            <History className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {logs.length === 0
                ? 'Nenhuma tentativa de conexão ou callback de webhook registado ainda. Use os botões acima para testar a conexão ou simular callbacks e acompanhar a resposta da API na tabela.'
                : 'Nenhum registo corresponde aos filtros atuais.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Data</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Origem / Evento</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3.5">Mensagem de Resposta da API</th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Depuração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredLogs.map((entry) => {
                  const isSuccess = entry.outcome === 'success';
                  const isBr = isBrazilLog(entry);
                  const isExpanded = expandedId === entry.id;
                  const diagnosticHint = getDiagnosticHint(entry);

                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        className={
                          isSuccess
                            ? 'hover:bg-slate-900/50 transition'
                            : 'bg-rose-950/15 hover:bg-rose-950/25 transition'
                        }
                      >
                        {/* Coluna 1: Data */}
                        <td className="py-3 px-3.5 font-mono tabular-nums text-slate-300 whitespace-nowrap align-top">
                          <div>{formatTimestamp(entry.timestamp)}</div>
                          {typeof entry.latencyMs === 'number' && (
                            <div className="inline-flex items-center gap-1 text-[11px] text-amber-300 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{entry.latencyMs}ms</span>
                            </div>
                          )}
                        </td>

                        {/* Coluna 2: Origem / Evento */}
                        <td className="py-3 px-3.5 align-top whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 font-semibold text-white">
                            {isBr ? (
                              <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Landmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span>{PROVIDER_LABELS[entry.provider] || entry.provider}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {EVENT_LABELS[entry.eventType]}
                          </div>
                          {entry.reference && (
                            <code className="block text-[11px] font-mono text-amber-300 mt-0.5">
                              {entry.reference}
                            </code>
                          )}
                        </td>

                        {/* Coluna 3: Status (Sucesso / Erro + Código HTTP + HMAC) */}
                        <td className="py-3 px-3.5 align-top whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-semibold text-[11px] ${
                                isSuccess
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                              }`}
                            >
                              {isSuccess ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{isSuccess ? 'Sucesso' : 'Erro'}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">HTTP {entry.httpStatus}</span>
                            </span>

                            {entry.signatureValid !== null && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] ${
                                  entry.signatureValid ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {entry.signatureValid ? (
                                  <ShieldCheck className="w-3 h-3" />
                                ) : (
                                  <ShieldAlert className="w-3 h-3" />
                                )}
                                <span>
                                  {entry.signatureValid ? 'HMAC Válido' : 'HMAC Inválido'}
                                </span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Coluna 4: Mensagem de Resposta da API */}
                        <td className="py-3 px-3.5 align-top min-w-[260px]">
                          <div className="text-slate-200 leading-relaxed">{entry.message}</div>
                          {entry.endpointUrl && (
                            <div className="text-[11px] font-mono text-slate-400 mt-1 break-all">
                              {entry.endpointUrl}
                            </div>
                          )}
                        </td>

                        {/* Coluna 5: Ação de Depuração */}
                        <td className="py-3 px-3.5 text-right align-top whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-200 cursor-pointer whitespace-nowrap"
                          >
                            <span>{isExpanded ? 'Ocultar JSON' : 'Depurar API'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={5} className="px-4 py-3.5 space-y-2.5 border-t border-slate-800/70">
                            {diagnosticHint && (
                              <div className="px-3 py-2 rounded-lg bg-rose-950/35 border border-rose-500/30 text-[11px] text-rose-200 flex items-start gap-2">
                                <Wrench className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-rose-300">Diagnóstico sugerido: </strong>
                                  <span>{diagnosticHint}</span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                                <span>Payload / Resposta Completa da API Capturada pelo Servidor</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyPayload(entry)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 cursor-pointer"
                              >
                                {copiedId === entry.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedId === entry.id ? 'Copiado' : 'Copiar JSON'}</span>
                              </button>
                            </div>

                            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed">
                              {entry.payloadSnippet}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
