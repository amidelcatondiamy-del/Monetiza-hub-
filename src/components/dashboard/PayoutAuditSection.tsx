import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Download,
  Search,
  Zap,
  CreditCard,
  Building,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { WithdrawalRequest } from '../../types/monetization';
import { formatCurrency } from '../../utils/formatters';

type AuditStatusFilter = 'all' | 'processing' | 'completed' | 'failed' | 'reversed';
type AuditMethodFilter = 'all' | 'express' | 'visa_card' | 'ted' | 'pix';

const METHOD_META: Record<
  'express' | 'visa_card' | 'ted' | 'pix',
  {
    label: string;
    shortLabel: string;
    Icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
  }
> = {
  express: {
    label: 'Multicaixa Express',
    shortLabel: 'Multicaixa',
    Icon: Zap,
    accentClass: 'text-amber-400',
  },
  visa_card: {
    label: 'Cartão Visa Direct',
    shortLabel: 'Visa Direct',
    Icon: CreditCard,
    accentClass: 'text-blue-400',
  },
  ted: {
    label: 'Transferência Bancária',
    shortLabel: 'Transf. Bancária',
    Icon: Building,
    accentClass: 'text-purple-400',
  },
  pix: {
    label: 'PIX Instantâneo',
    shortLabel: 'PIX',
    Icon: QrCode,
    accentClass: 'text-emerald-400',
  },
};

const STATUS_META: Record<
  WithdrawalRequest['status'],
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    textClass: string;
  }
> = {
  processing: {
    label: 'Processando',
    Icon: Clock,
    textClass: 'text-amber-400',
  },
  completed: {
    label: 'Sucesso',
    Icon: CheckCircle2,
    textClass: 'text-emerald-400',
  },
  failed: {
    label: 'Falha',
    Icon: XCircle,
    textClass: 'text-rose-400',
  },
  reversed: {
    label: 'Estornado',
    Icon: RotateCcw,
    textClass: 'text-sky-400',
  },
};

function getSettlementDurationSeconds(wd: WithdrawalRequest): number | null {
  if (wd.status !== 'completed') return null;
  if (typeof wd.settlementSeconds === 'number' && wd.settlementSeconds >= 0) {
    return wd.settlementSeconds;
  }
  if (!wd.settledAt) return null;
  const start = new Date(wd.requestedAt).getTime();
  const end = new Date(wd.settledAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.max(1, Math.round((end - start) / 1000));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSecs = seconds % 60;
  if (mins < 60) {
    return remSecs > 0 && mins < 5 ? `${mins}m ${remSecs}s` : `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PayoutAuditSection: React.FC = () => {
  const { withdrawals, selectedCurrency } = useMonetization();
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<AuditMethodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const statusCounts = useMemo(() => {
    const counts = { all: withdrawals.length, processing: 0, completed: 0, failed: 0, reversed: 0 };
    withdrawals.forEach((w) => {
      if (w.status === 'processing') counts.processing += 1;
      else if (w.status === 'completed') counts.completed += 1;
      else if (w.status === 'failed') counts.failed += 1;
      else if (w.status === 'reversed') counts.reversed += 1;
    });
    return counts;
  }, [withdrawals]);

  const methodAverages = useMemo(() => {
    const orderedMethods: Array<'express' | 'visa_card' | 'ted' | 'pix'> = [
      'express',
      'visa_card',
      'ted',
      'pix',
    ];

    return orderedMethods.map((methodKey) => {
      const items = withdrawals.filter((w) => w.destinationType === methodKey);
      const completed = items.filter((w) => w.status === 'completed');
      const durations = completed
        .map(getSettlementDurationSeconds)
        .filter((val): val is number => val !== null);

      const avgSeconds =
        durations.length > 0
          ? Math.round(durations.reduce((acc, s) => acc + s, 0) / durations.length)
          : null;

      const successRate =
        items.length > 0 ? Math.round((completed.length / items.length) * 100) : null;

      return {
        methodKey,
        meta: METHOD_META[methodKey],
        totalAttempts: items.length,
        settledCount: completed.length,
        avgLabel: avgSeconds !== null ? formatDuration(avgSeconds) : 'Sem liquidação',
        successRate,
      };
    });
  }, [withdrawals]);

  const sortedAndFiltered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...withdrawals]
      .sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      )
      .filter((w) => {
        if (statusFilter !== 'all' && w.status !== statusFilter) return false;
        if (methodFilter !== 'all' && w.destinationType !== methodFilter) return false;
        if (query) {
          const hay = [
            w.receiptNumber,
            w.destinationKey,
            w.failureReason || '',
            w.visaDetails?.authorizationCode || '',
            w.expressDetails?.emisReference || '',
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      });
  }, [withdrawals, statusFilter, methodFilter, searchQuery]);

  const filteredTotalAmount = useMemo(
    () => sortedAndFiltered.reduce((sum, item) => sum + item.amount, 0),
    [sortedAndFiltered]
  );

  const handleExportCsv = () => {
    const headers = [
      'Data Solicitação',
      'Comprovante',
      'Método',
      'Destino',
      'Valor (BRL)',
      'Tempo Liquidação',
      'Status',
      'Observação',
    ];

    const rows = sortedAndFiltered.map((w) => {
      const dur = getSettlementDurationSeconds(w);
      const methodLabel =
        w.destinationType === 'paypal'
          ? 'PayPal'
          : METHOD_META[w.destinationType]?.label || w.destinationType;
      return [
        formatDateTime(w.requestedAt),
        w.receiptNumber,
        methodLabel,
        w.destinationKey,
        w.amount.toFixed(2),
        w.status === 'processing'
          ? 'Em aberto'
          : dur !== null
          ? formatDuration(dur)
          : '—',
        STATUS_META[w.status].label,
        w.failureReason || '',
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-repasses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setMethodFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Auditoria de Repasses
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhe cada tentativa de saque, motivos de falha ou estorno e o tempo médio de liquidação por método.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={sortedAndFiltered.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Tempo Médio de Liquidação por Método */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">
            Tempo Médio de Liquidação por Método
          </span>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {withdrawals.length} tentativas registradas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {methodAverages.map(({ methodKey, meta, totalAttempts, avgLabel, successRate }) => {
            const Icon = meta.Icon;
            const isSelected = methodFilter === methodKey;
            return (
              <button
                key={methodKey}
                type="button"
                onClick={() =>
                  setMethodFilter((prev) => (prev === methodKey ? 'all' : methodKey))
                }
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500/60'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                  <Icon className={`w-3.5 h-3.5 ${meta.accentClass} shrink-0`} />
                  <span className="truncate">{meta.shortLabel}</span>
                </div>
                <div className="text-base font-bold text-white font-mono tabular-nums mt-1.5">
                  {avgLabel}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono tabular-nums flex items-center gap-1">
                  <span>{totalAttempts} saques</span>
                  {successRate !== null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{successRate}% sucesso</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls: Segmented Status Filter + Search + Method Select */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          {(
            [
              { id: 'all', label: 'Todos', count: statusCounts.all },
              { id: 'processing', label: 'Processando', count: statusCounts.processing },
              { id: 'completed', label: 'Sucesso', count: statusCounts.completed },
              { id: 'failed', label: 'Falha', count: statusCounts.failed },
              { id: 'reversed', label: 'Estornado', count: statusCounts.reversed },
            ] as Array<{ id: AuditStatusFilter; label: string; count: number }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono tabular-nums text-[10px] text-slate-400">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por comprovante, destino, referência ou erro..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            aria-label="Filtrar repasses por método"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as AuditMethodFilter)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todos os Métodos</option>
            <option value="express">Multicaixa Express</option>
            <option value="visa_card">Cartão Visa Direct</option>
            <option value="ted">Transferência Bancária</option>
            <option value="pix">PIX Instantâneo</option>
          </select>
        </div>
      </div>

      {/* Payout Attempts Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        {sortedAndFiltered.length === 0 ? (
          <div className="p-8 text-center space-y-2.5">
            <p className="text-xs font-semibold text-slate-300">
              Nenhuma tentativa de saque encontrada para os filtros aplicados.
            </p>
            <p className="text-[11px] text-slate-500">
              Ajuste os filtros de status, método ou termo de busca para visualizar o histórico completo de repasses.
            </p>
            {(statusFilter !== 'all' || methodFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer whitespace-nowrap"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400">
                  <th className="py-2.5 px-3 whitespace-nowrap">Data & Comprovante</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Método</th>
                  <th className="py-2.5 px-3">Destino & Detalhes</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Valor</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Liquidação</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {sortedAndFiltered.map((wd) => {
                  const statusInfo = STATUS_META[wd.status];
                  const StatusIcon = statusInfo.Icon;
                  const methodInfo =
                    wd.destinationType === 'paypal'
                      ? { label: 'PayPal', accentClass: 'text-sky-400' }
                      : METHOD_META[wd.destinationType];
                  const durationSeconds = getSettlementDurationSeconds(wd);

                  return (
                    <tr
                      key={wd.id}
                      className="hover:bg-slate-900/50 transition-colors align-top"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono tabular-nums text-[11px] text-slate-200">
                          {formatDateTime(wd.requestedAt)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {wd.receiptNumber}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-semibold text-[11px] ${methodInfo.accentClass}`}>
                          {methodInfo.label}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 max-w-[200px]">
                        <div
                          className="font-mono text-[11px] text-slate-200 truncate"
                          title={wd.destinationKey}
                        >
                          {wd.destinationKey}
                        </div>
                        {wd.failureReason && (
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                            {wd.failureReason}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums font-semibold text-white">
                        {formatCurrency(wd.amount, selectedCurrency)}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums text-[11px] text-slate-300">
                        {wd.status === 'processing'
                          ? 'Em aberto'
                          : durationSeconds !== null
                          ? formatDuration(durationSeconds)
                          : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-end gap-1 font-semibold text-[11px] ${statusInfo.textClass}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{statusInfo.label}</span>
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

      {/* Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono tabular-nums px-1">
        <span>
          Exibindo {sortedAndFiltered.length} de {withdrawals.length} tentativas
        </span>
        <span>
          Total filtrado:{' '}
          <strong className="text-slate-200">
            {formatCurrency(filteredTotalAmount, selectedCurrency)}
          </strong>
        </span>
      </div>
    </div>
  );
};
