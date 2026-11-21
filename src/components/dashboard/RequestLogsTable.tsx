import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ListChecks,
  Radio,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  clearRequestLogsApi,
  fetchRequestLogsApi,
  HttpRequestLog,
  subscribeExpressStream,
} from '../../services/angolaPspClient';

type MethodFilter = 'ALL' | 'POST' | 'GET' | 'PUT';
type StatusFilter = 'all' | 'success' | 'error';

function getHttpStatusLabel(code: number): string {
  if (code === 200) return '200 OK';
  if (code === 201) return '201 Created';
  if (code === 204) return '204 No Content';
  if (code === 400) return '400 Bad Request';
  if (code === 401) return '401 Unauthorized';
  if (code === 403) return '403 Forbidden';
  if (code === 404) return '404 Not Found';
  if (code === 422) return '422 Unprocessable';
  if (code === 500) return '500 Server Error';
  if (code === 502) return '502 Bad Gateway';
  if (code === 503) return '503 Unavailable';
  if (code === 504) return '504 Timeout';
  return String(code);
}

export const RequestLogsTable: React.FC = () => {
  const [logs, setLogs] = useState<HttpRequestLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    const items = await fetchRequestLogsApi();
    setLogs(items);
    setIsLoading(false);
  };

  useEffect(() => {
    let active = true;
    loadLogs();

    const unsubscribe = subscribeExpressStream((eventName, payload) => {
      if (!active) return;
      setSseConnected(true);
      if (eventName === 'ledger_snapshot' && Array.isArray(payload.requestLogs)) {
        setLogs(payload.requestLogs);
      } else if (eventName === 'request_log' && payload.requestLog) {
        setLogs((prev) => {
          const withoutDup = prev.filter((item) => item.id !== payload.requestLog!.id);
          return [payload.requestLog!, ...withoutDup].slice(0, 120);
        });
      } else if (eventName === 'request_logs_cleared') {
        setLogs([]);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleClear = async () => {
    const ok = await clearRequestLogsApi();
    if (ok) {
      setLogs([]);
      setFeedback('Registos de requisições limpos no servidor.');
      window.setTimeout(() => setFeedback(null), 3000);
    }
  };

  const summary = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter((l) => l.statusCode >= 400).length;
    const posts = logs.filter((l) => l.method.toUpperCase() === 'POST').length;
    const gets = logs.filter((l) => l.method.toUpperCase() === 'GET').length;
    return { total, errors, posts, gets };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return logs.filter((entry) => {
      const m = entry.method.toUpperCase();
      if (methodFilter !== 'ALL' && m !== methodFilter) return false;

      const isErr = entry.statusCode >= 400;
      if (statusFilter === 'error' && !isErr) return false;
      if (statusFilter === 'success' && isErr) return false;

      if (!q) return true;
      return (
        entry.endpointUrl.toLowerCase().includes(q) ||
        entry.method.toLowerCase().includes(q) ||
        String(entry.statusCode).includes(q) ||
        (entry.provider || '').toLowerCase().includes(q) ||
        (entry.errorSummary || '').toLowerCase().includes(q)
      );
    });
  }, [logs, methodFilter, statusFilter, searchTerm]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const getMethodClasses = (method: string) => {
    const upper = method.toUpperCase();
    if (upper === 'POST') {
      return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    }
    if (upper === 'GET') {
      return 'bg-sky-500/15 border-sky-500/30 text-sky-300';
    }
    return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-sky-400" />
            <span>Últimos Logs de Requisições</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tabela cronológica de chamadas HTTP (POST, GET, PUT) aos endpoints de PSP Angola, Gateway BR e webhooks para identificar falhas rapidamente.
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
            <span>{sseConnected ? 'Tempo Real Ativo' : 'SSE Conectando'}</span>
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

      {/* Compact Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-slate-800 bg-slate-950 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
        <div className="px-4 py-2.5">
          <div className="text-[11px] text-slate-400">Total de Requisições</div>
          <div className="text-base font-bold text-white font-mono tabular-nums mt-0.5">
            {summary.total}
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="text-[11px] text-slate-400">POST / Callbacks</div>
          <div className="text-base font-bold text-amber-300 font-mono tabular-nums mt-0.5">
            {summary.posts}
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="text-[11px] text-slate-400">GET / Verificações</div>
          <div className="text-base font-bold text-sky-300 font-mono tabular-nums mt-0.5">
            {summary.gets}
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="text-[11px] text-slate-400">Falhas (4xx / 5xx)</div>
          <div
            className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
              summary.errors > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {summary.errors}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="px-3.5 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
            {(['ALL', 'POST', 'GET', 'PUT'] as MethodFilter[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  methodFilter === m
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'ALL' ? 'Todos Métodos' : m}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
            {(
              [
                { id: 'all', label: 'Todos Status' },
                { id: 'success', label: 'Sucesso (2xx)' },
                { id: 'error', label: `Falhas (${summary.errors})` },
              ] as { id: StatusFilter; label: string }[]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === st.id
                    ? st.id === 'error'
                      ? 'bg-rose-950 text-rose-300'
                      : 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.label}
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
            placeholder="Filtrar por URL, código (401/502) ou método..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Request Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-800/80">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="h-3.5 w-32 bg-slate-800 rounded animate-pulse" />
                <div className="h-3.5 w-64 bg-slate-800 rounded animate-pulse" />
                <div className="h-3.5 w-20 bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <ListChecks className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {logs.length === 0
                ? 'Nenhuma requisição HTTP registada ainda. Ao verificar o estado do servidor, salvar configurações ou testar webhooks, cada pedido GET/POST aparecerá nesta tabela.'
                : 'Nenhuma requisição corresponde aos filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Data</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Método HTTP</th>
                  <th className="py-2.5 px-3.5">URL do Endpoint</th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Código de Resposta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredLogs.map((entry) => {
                  const isError = entry.statusCode >= 400;
                  return (
                    <tr
                      key={entry.id}
                      className={
                        isError
                          ? 'bg-rose-950/15 hover:bg-rose-950/25 transition'
                          : 'hover:bg-slate-900/50 transition'
                      }
                    >
                      <td className="py-2.5 px-3.5 font-mono tabular-nums text-slate-300 whitespace-nowrap align-top">
                        {formatDate(entry.timestamp)}
                      </td>

                      <td className="py-2.5 px-3.5 whitespace-nowrap align-top">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[11px] font-bold ${getMethodClasses(
                            entry.method
                          )}`}
                        >
                          {entry.method.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 align-top min-w-[240px]">
                        <div className="font-mono text-slate-100 break-all">
                          {entry.endpointUrl}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          {entry.provider && (
                            <span className="uppercase font-semibold text-slate-400">
                              {entry.provider}
                            </span>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{entry.latencyMs}ms</span>
                          {entry.errorSummary && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-rose-300">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>{entry.errorSummary}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border font-mono tabular-nums text-[11px] font-bold ${
                            isError
                              ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                              : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                          }`}
                        >
                          {isError ? (
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{getHttpStatusLabel(entry.statusCode)}</span>
                        </span>
                      </td>
                    </tr>
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
