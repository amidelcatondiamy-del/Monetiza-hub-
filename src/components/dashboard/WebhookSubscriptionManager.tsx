import React, { useEffect, useState } from 'react';
import {
  Webhook,
  Plus,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  PauseCircle,
  AlertCircle,
  Pencil,
  Check,
  X,
  Clock,
} from 'lucide-react';
import {
  PRESET_WEBHOOK_EVENTS,
  WebhookSubscription,
  createWebhookSubscriptionApi,
  deleteWebhookSubscriptionApi,
  fetchWebhookSubscriptionsApi,
  testWebhookSubscriptionApi,
  updateWebhookSubscriptionApi,
} from '../../services/webhookSubscriptionsClient';
import {
  subscribeExpressStream,
  validateWebhookEndpointUrl,
} from '../../services/angolaPspClient';

interface WebhookSubscriptionManagerProps {
  defaultEndpointUrl: string;
  onOpenLogHistory?: () => void;
  onOpenRequestLogs?: () => void;
}

export const WebhookSubscriptionManager: React.FC<WebhookSubscriptionManagerProps> = ({
  defaultEndpointUrl,
  onOpenLogHistory,
  onOpenRequestLogs,
}) => {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');

  const [selectedEventPreset, setSelectedEventPreset] = useState<string>(
    PRESET_WEBHOOK_EVENTS[0].eventType
  );
  const [customEventName, setCustomEventName] = useState<string>('');
  const [newEndpointUrl, setNewEndpointUrl] = useState<string>(defaultEndpointUrl);
  const [newDescription, setNewDescription] = useState<string>(
    PRESET_WEBHOOK_EVENTS[0].description
  );
  const [isCreating, setIsCreating] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEndpointUrl, setEditEndpointUrl] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    const items = await fetchWebhookSubscriptionsApi();
    setSubscriptions(items);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSubscriptions();
    const unsubscribe = subscribeExpressStream((eventName, payload) => {
      if (
        eventName === 'webhook_subscriptions_updated' &&
        Array.isArray(payload.webhookSubscriptions)
      ) {
        setSubscriptions(payload.webhookSubscriptions as WebhookSubscription[]);
      }
    });
    return unsubscribe;
  }, []);

  const resolvedEventType =
    selectedEventPreset === '__custom__'
      ? customEventName.trim()
      : selectedEventPreset.trim();

  const newUrlValidation = newEndpointUrl.trim().startsWith('/')
    ? { valid: true }
    : validateWebhookEndpointUrl(newEndpointUrl);

  const editUrlValidation = editEndpointUrl.trim().startsWith('/')
    ? { valid: true }
    : validateWebhookEndpointUrl(editEndpointUrl);

  const handlePresetChange = (value: string) => {
    setSelectedEventPreset(value);
    const match = PRESET_WEBHOOK_EVENTS.find((p) => p.eventType === value);
    if (match) {
      setNewDescription(match.description);
    } else if (value === '__custom__') {
      setNewDescription('');
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedEventType) {
      setFormFeedback({
        ok: false,
        text: 'Informe o nome do evento (ex: transação.aprovada).',
      });
      return;
    }
    if (!newUrlValidation.valid) {
      setFormFeedback({
        ok: false,
        text:
          ('error' in newUrlValidation && newUrlValidation.error) ||
          'URL do endpoint inválida.',
      });
      return;
    }

    setIsCreating(true);
    setFormFeedback(null);
    const res = await createWebhookSubscriptionApi({
      eventType: resolvedEventType,
      endpointUrl: newEndpointUrl.trim(),
      description: newDescription.trim(),
      active: true,
    });

    if (res.ok && res.items) {
      setSubscriptions(res.items);
      setFormFeedback({
        ok: true,
        text: `Subscrição "${resolvedEventType}" configurada e ativada.`,
      });
      if (selectedEventPreset === '__custom__') {
        setCustomEventName('');
      }
    } else {
      setFormFeedback({
        ok: false,
        text: res.error || 'Não foi possível criar a subscrição.',
      });
    }
    setIsCreating(false);
  };

  const handleToggleActive = async (sub: WebhookSubscription) => {
    setTogglingId(sub.id);
    const res = await updateWebhookSubscriptionApi(sub.id, { active: !sub.active });
    if (res.ok && res.items) {
      setSubscriptions(res.items);
    }
    setTogglingId(null);
  };

  const handleTestSubscription = async (sub: WebhookSubscription) => {
    setTestingId(sub.id);
    const res = await testWebhookSubscriptionApi(sub.id);
    if (res.items) {
      setSubscriptions(res.items);
    }
    setTestingId(null);
  };

  const handleDeleteSubscription = async (id: string) => {
    setDeletingId(id);
    const res = await deleteWebhookSubscriptionApi(id);
    if (res.ok && res.items) {
      setSubscriptions(res.items);
    }
    setDeletingId(null);
  };

  const startEditing = (sub: WebhookSubscription) => {
    setEditingId(sub.id);
    setEditEndpointUrl(sub.endpointUrl);
    setEditDescription(sub.description);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editUrlValidation.valid) return;
    setIsSavingEdit(true);
    const res = await updateWebhookSubscriptionApi(id, {
      endpointUrl: editEndpointUrl.trim(),
      description: editDescription.trim(),
    });
    if (res.ok && res.items) {
      setSubscriptions(res.items);
      setEditingId(null);
    }
    setIsSavingEdit(false);
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const activeCount = subscriptions.filter((s) => s.active).length;
  const pausedCount = subscriptions.length - activeCount;

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filterStatus === 'active') return sub.active;
    if (filterStatus === 'paused') return !sub.active;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Webhook className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Webhook Subscription Management</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono tabular-nums">
            <span>
              Total: <strong className="text-white">{subscriptions.length}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Ativos: <strong className="text-emerald-400">{activeCount}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Pausados: <strong className="text-amber-300">{pausedCount}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenLogHistory && (
            <button
              type="button"
              onClick={onOpenLogHistory}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Histórico de Logs
            </button>
          )}
          {onOpenRequestLogs && (
            <button
              type="button"
              onClick={onOpenRequestLogs}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-300 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Logs de Requisições
            </button>
          )}
          <button
            type="button"
            onClick={loadSubscriptions}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Add New Event Subscription Form */}
      <form
        onSubmit={handleCreateSubscription}
        className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
      >
        <div className="text-xs font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Nova Subscrição por Tipo de Evento</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label htmlFor="wh-sub-event-select" className="text-[11px] font-semibold text-slate-300 block">
              Tipo de Evento
            </label>
            <select
              id="wh-sub-event-select"
              value={selectedEventPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            >
              {PRESET_WEBHOOK_EVENTS.map((ev) => (
                <option key={ev.eventType} value={ev.eventType}>
                  {ev.label}
                </option>
              ))}
              <option value="__custom__">Evento personalizado...</option>
            </select>
          </div>

          {selectedEventPreset === '__custom__' ? (
            <div className="space-y-1">
              <label htmlFor="wh-sub-custom-event" className="text-[11px] font-semibold text-slate-300 block">
                Nome do Evento Personalizado
              </label>
              <input
                id="wh-sub-custom-event"
                type="text"
                value={customEventName}
                onChange={(e) => setCustomEventName(e.target.value)}
                placeholder="ex: assinatura.cancelada"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="wh-sub-description" className="text-[11px] font-semibold text-slate-300 block">
                Descrição / Finalidade
              </label>
              <input
                id="wh-sub-description"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descrição opcional do evento"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="md:col-span-2 space-y-1">
            <label htmlFor="wh-sub-endpoint-url" className="text-[11px] font-semibold text-slate-300 block">
              URL do Endpoint Destino
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="wh-sub-endpoint-url"
                type="text"
                value={newEndpointUrl}
                aria-invalid={!newUrlValidation.valid}
                onChange={(e) => setNewEndpointUrl(e.target.value)}
                placeholder="https://seu-dominio.com/api/webhooks/angola-psp"
                className={`flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-900 border text-white font-mono text-xs focus:outline-none ${
                  newUrlValidation.valid
                    ? 'border-slate-800 focus:border-emerald-500'
                    : 'border-rose-500/60 focus:border-rose-400'
                }`}
              />
              <button
                type="submit"
                disabled={isCreating || !newUrlValidation.valid || !resolvedEventType}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreating ? 'Salvando...' : 'Adicionar Subscrição'}</span>
              </button>
            </div>
            {!newUrlValidation.valid && 'error' in newUrlValidation && newUrlValidation.error && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1.5 pt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{newUrlValidation.error}</span>
              </p>
            )}
          </div>
        </div>

        {formFeedback && (
          <div
            className={`text-xs flex items-center gap-1.5 pt-1 ${
              formFeedback.ok ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formFeedback.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{formFeedback.text}</span>
          </div>
        )}
      </form>

      {/* Filter Bar + List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-200">
            Subscrições Configuradas ({filteredSubscriptions.length})
          </h4>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Ativos' },
              { id: 'paused', label: 'Pausados' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id as 'all' | 'active' | 'paused')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  filterStatus === tab.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
            Nenhuma subscrição encontrada para o filtro selecionado.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSubscriptions.map((sub) => {
              const isEditing = editingId === sub.id;
              const isTesting = testingId === sub.id;
              const isToggling = togglingId === sub.id;
              const isDeleting = deletingId === sub.id;

              return (
                <div
                  key={sub.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-xs font-mono font-bold text-white">
                          {sub.eventType}
                        </code>
                        <span className="text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        {sub.active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Ativo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                            <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Pausado</span>
                          </span>
                        )}
                      </div>

                      {!isEditing ? (
                        <>
                          <div className="text-xs font-mono text-slate-300 truncate">
                            {sub.endpointUrl}
                          </div>
                          {sub.description && (
                            <p className="text-[11px] text-slate-400 leading-snug">
                              {sub.description}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={editEndpointUrl}
                            onChange={(e) => setEditEndpointUrl(e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border text-white font-mono text-xs focus:outline-none ${
                              editUrlValidation.valid
                                ? 'border-slate-700 focus:border-emerald-500'
                                : 'border-rose-500/60 focus:border-rose-400'
                            }`}
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Descrição"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(sub.id)}
                              disabled={isSavingEdit || !editUrlValidation.valid}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" />
                              <span>{isSavingEdit ? 'Salvando...' : 'Salvar'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <X className="w-3 h-3" />
                              <span>Cancelar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Row Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTestSubscription(sub)}
                        disabled={!sub.active || isTesting}
                        title={
                          sub.active
                            ? `Disparar evento ${sub.eventType}`
                            : 'Retome a subscrição para disparar um teste'
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isTesting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        <span>{isTesting ? 'Enviando...' : 'Testar Evento'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(sub)}
                        disabled={isToggling}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                          sub.active
                            ? 'bg-slate-900 hover:bg-slate-800 border-amber-500/40 text-amber-300'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {sub.active ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pausar</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Retomar</span>
                          </>
                        )}
                      </button>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEditing(sub)}
                          aria-label={`Editar ${sub.eventType}`}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSubscription(sub.id)}
                        disabled={isDeleting}
                        aria-label={`Remover ${sub.eventType}`}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition cursor-pointer shrink-0 disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Last Execution Log Strip */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    {sub.lastExecution ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          {sub.lastExecution.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Última execução: Sucesso</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-400 shrink-0">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Última execução: Erro</span>
                            </span>
                          )}
                          <span className="text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-300 truncate">
                            {sub.lastExecution.message}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono tabular-nums text-slate-400 shrink-0">
                          <span>HTTP {sub.lastExecution.httpStatus}</span>
                          <span aria-hidden="true">·</span>
                          <span>{sub.lastExecution.latencyMs}ms</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatTimestamp(sub.lastExecution.executedAt)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Última execução: Aguardando primeiro disparo (use Testar Evento ou aguarde evento real)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
