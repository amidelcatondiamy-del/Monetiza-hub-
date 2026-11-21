import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export type AutopilotFocusArea =
  | 'catalog'
  | 'pricing'
  | 'coupons'
  | 'pending_orders'
  | 'financial_summary';

export interface AutopilotSnapshotProduct {
  id: string;
  title: string;
  price: number;
  type: string;
  salesCount: number;
  viewsCount: number;
  isPublished: boolean;
  tags: string[];
}

export interface AutopilotSnapshotCoupon {
  code: string;
  discountPercentage: number;
  usedCount: number;
  maxUses: number;
  active: boolean;
  expiresAt: string;
}

export interface AutopilotSnapshotTransaction {
  id: string;
  type: string;
  title: string;
  grossAmount: number;
  netAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

export interface AutopilotBusinessSnapshot {
  creatorName: string;
  currency: string;
  totalGrossRevenue: number;
  totalNetRevenue: number;
  availableBalance: number;
  pendingBalance: number;
  mrr: number;
  products: AutopilotSnapshotProduct[];
  coupons: AutopilotSnapshotCoupon[];
  recentTransactions: AutopilotSnapshotTransaction[];
  monthlyGoalTarget?: number;
  syncedAt: string;
}

export interface AutopilotOrganizedTask {
  id: string;
  title: string;
  description: string;
  category: 'coupon' | 'pricing' | 'catalog' | 'retention' | 'finance';
  actionType:
    | 'create_coupon'
    | 'adjust_price'
    | 'optimize_tags'
    | 'review_pending'
    | 'general_organization';
  estimatedImpact: string;
  payload: {
    couponCode?: string;
    discountPercentage?: number;
    productId?: string;
    productTitle?: string;
    suggestedPrice?: number;
    suggestedTags?: string[];
  };
  status: 'pending' | 'applied' | 'dismissed';
  createdAt: string;
  appliedAt?: string;
}

export interface AutopilotRunLog {
  id: string;
  timestamp: string;
  trigger: 'scheduled_away' | 'manual';
  outcome: 'success' | 'error';
  model: string;
  tasksCreated: number;
  summary: string;
  errorMessage?: string;
}

export interface AutopilotBriefing {
  headline: string;
  awaySummary: string;
  organizedHighlights: string[];
  generatedAt: string;
}

export interface AiAutopilotState {
  enabled: boolean;
  intervalMinutes: 5 | 15 | 30 | 60;
  focusAreas: AutopilotFocusArea[];
  autoApplySafeActions: boolean;
  status: 'idle' | 'running' | 'paused' | 'error';
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastClientSeenAt: string | null;
  totalRuns: number;
  lastError: string | null;
  latestSnapshot: AutopilotBusinessSnapshot | null;
  latestBriefing: AutopilotBriefing | null;
  organizedTasks: AutopilotOrganizedTask[];
  runsHistory: AutopilotRunLog[];
}

const DEFAULT_FOCUS_AREAS: AutopilotFocusArea[] = [
  'catalog',
  'pricing',
  'coupons',
  'pending_orders',
  'financial_summary',
];

export class AiAutopilotService {
  private readonly stateFilePath: string;
  private state: AiAutopilotState;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private isExecutingCycle = false;

  constructor(dataDir: string) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.stateFilePath = path.join(dataDir, 'ai-autopilot-state.json');
    this.state = this.loadState();
  }

  private createDefaultState(): AiAutopilotState {
    return {
      enabled: false,
      intervalMinutes: 15,
      focusAreas: DEFAULT_FOCUS_AREAS,
      autoApplySafeActions: false,
      status: 'paused',
      lastRunAt: null,
      nextRunAt: null,
      lastClientSeenAt: null,
      totalRuns: 0,
      lastError: null,
      latestSnapshot: null,
      latestBriefing: null,
      organizedTasks: [],
      runsHistory: [],
    };
  }

  private loadState(): AiAutopilotState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const parsed = JSON.parse(
          fs.readFileSync(this.stateFilePath, 'utf-8')
        ) as Partial<AiAutopilotState>;
        const def = this.createDefaultState();
        const interval = parsed.intervalMinutes;
        const validInterval: 5 | 15 | 30 | 60 =
          interval === 5 || interval === 15 || interval === 30 || interval === 60
            ? interval
            : 15;
        return {
          ...def,
          ...parsed,
          intervalMinutes: validInterval,
          focusAreas:
            Array.isArray(parsed.focusAreas) && parsed.focusAreas.length > 0
              ? parsed.focusAreas
              : DEFAULT_FOCUS_AREAS,
          organizedTasks: Array.isArray(parsed.organizedTasks)
            ? parsed.organizedTasks
            : [],
          runsHistory: Array.isArray(parsed.runsHistory)
            ? parsed.runsHistory
            : [],
          status: parsed.enabled ? 'idle' : 'paused',
        };
      }
    } catch {
      // Fallback cleanly to default state
    }
    return this.createDefaultState();
  }

  private persistState(): void {
    const dir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      this.stateFilePath,
      JSON.stringify(this.state, null, 2),
      'utf-8'
    );
  }

  public isGeminiConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY?.trim();
    return Boolean(key && key.length > 10);
  }

  public getPublicState(): AiAutopilotState & { geminiConfigured: boolean } {
    return {
      ...this.state,
      geminiConfigured: this.isGeminiConfigured(),
    };
  }

  public syncSnapshot(snapshot: AutopilotBusinessSnapshot): AiAutopilotState {
    this.state.latestSnapshot = {
      ...snapshot,
      syncedAt: new Date().toISOString(),
    };
    this.state.lastClientSeenAt = new Date().toISOString();
    this.persistState();
    return this.state;
  }

  public updateConfig(input: {
    enabled?: boolean;
    intervalMinutes?: 5 | 15 | 30 | 60;
    focusAreas?: AutopilotFocusArea[];
    autoApplySafeActions?: boolean;
    snapshot?: AutopilotBusinessSnapshot;
  }): AiAutopilotState {
    if (input.snapshot) {
      this.state.latestSnapshot = {
        ...input.snapshot,
        syncedAt: new Date().toISOString(),
      };
    }

    if (
      input.intervalMinutes === 5 ||
      input.intervalMinutes === 15 ||
      input.intervalMinutes === 30 ||
      input.intervalMinutes === 60
    ) {
      this.state.intervalMinutes = input.intervalMinutes;
    }

    if (Array.isArray(input.focusAreas) && input.focusAreas.length > 0) {
      this.state.focusAreas = input.focusAreas;
    }

    if (typeof input.autoApplySafeActions === 'boolean') {
      this.state.autoApplySafeActions = input.autoApplySafeActions;
    }

    if (typeof input.enabled === 'boolean') {
      this.state.enabled = input.enabled;
      if (input.enabled) {
        this.state.status = 'idle';
        this.state.lastError = null;
        const nextMs = Date.now() + this.state.intervalMinutes * 60 * 1000;
        this.state.nextRunAt = new Date(nextMs).toISOString();
      } else {
        this.state.status = 'paused';
        this.state.nextRunAt = null;
      }
    } else if (this.state.enabled) {
      const nextMs = Date.now() + this.state.intervalMinutes * 60 * 1000;
      this.state.nextRunAt = new Date(nextMs).toISOString();
    }

    this.state.lastClientSeenAt = new Date().toISOString();
    this.persistState();
    return this.state;
  }

  public markTaskStatus(
    taskId: string,
    status: 'applied' | 'dismissed'
  ): AutopilotOrganizedTask | null {
    const target = this.state.organizedTasks.find((t) => t.id === taskId);
    if (!target) return null;
    target.status = status;
    if (status === 'applied') {
      target.appliedAt = new Date().toISOString();
    }
    this.persistState();
    return target;
  }

  private getGeminiClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY não configurada no servidor. Configure sua chave no painel Settings > Secrets para ativar o processamento Gemini.'
      );
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 30000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  private isTransientGeminiError(err: unknown): boolean {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const upper = rawMsg.toUpperCase();
    return (
      upper.includes('503') ||
      upper.includes('UNAVAILABLE') ||
      upper.includes('429') ||
      upper.includes('RESOURCE_EXHAUSTED') ||
      upper.includes('HIGH DEMAND') ||
      upper.includes('DEADLINE') ||
      upper.includes('ETIMEDOUT') ||
      upper.includes('ECONNRESET') ||
      upper.includes('FETCH FAILED')
    );
  }

  private formatUpstreamError(err: unknown): string {
    const rawMsg = err instanceof Error ? err.message : String(err);
    let extractedMsg = rawMsg;

    // Parse nested JSON error returned by SDK if present
    try {
      const jsonStart = rawMsg.indexOf('{');
      if (jsonStart !== -1) {
        const parsed = JSON.parse(rawMsg.slice(jsonStart)) as {
          error?: { message?: string; status?: string; code?: number };
          message?: string;
        };
        if (parsed.error?.message) {
          extractedMsg = parsed.error.message;
        } else if (parsed.message) {
          extractedMsg = parsed.message;
        }
      }
    } catch {
      // Keep rawMsg
    }

    const upper = `${rawMsg} ${extractedMsg}`.toUpperCase();
    if (upper.includes('API_KEY_INVALID') || upper.includes('PERMISSION_DENIED') || upper.includes('401') || upper.includes('403')) {
      return 'Chave GEMINI_API_KEY inválida ou sem permissão. Verifique em Settings > Secrets.';
    }
    if (upper.includes('503') || upper.includes('UNAVAILABLE') || upper.includes('HIGH DEMAND') || upper.includes('DEADLINE')) {
      return 'O serviço Gemini está temporariamente sobrecarregado ou excedeu o tempo limite. O agendador tentará novamente automaticamente no próximo ciclo.';
    }
    if (upper.includes('RESOURCE_EXHAUSTED') || upper.includes('429')) {
      return 'Limite de cota da API Gemini atingido (429). Aguarde o próximo ciclo ou verifique seu plano em Settings > Secrets.';
    }
    if (upper.includes('404') || upper.includes('NOT_FOUND')) {
      return 'Modelo Gemini indisponível ou não encontrado (404) para esta chave.';
    }
    return extractedMsg || 'Falha ao consultar a API Gemini.';
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async runOrganizationCycle(
    trigger: 'scheduled_away' | 'manual',
    overrideSnapshot?: AutopilotBusinessSnapshot
  ): Promise<{
    ok: boolean;
    state: AiAutopilotState & { geminiConfigured: boolean };
    error?: string;
  }> {
    if (overrideSnapshot) {
      this.state.latestSnapshot = {
        ...overrideSnapshot,
        syncedAt: new Date().toISOString(),
      };
    }

    if (this.isExecutingCycle) {
      return {
        ok: false,
        state: this.getPublicState(),
        error: 'Um ciclo autônomo de organização já está em execução.',
      };
    }

    this.isExecutingCycle = true;
    this.state.status = 'running';
    this.state.lastError = null;
    this.persistState();

    const nowIso = new Date().toISOString();
    const model = 'gemini-4-hydrogen';

    try {
      const ai = this.getGeminiClient();
      const snapshot = this.state.latestSnapshot;

      const snapshotSummary = snapshot
        ? JSON.stringify({
            creatorName: snapshot.creatorName,
            currency: snapshot.currency,
            metrics: {
              totalGrossRevenue: snapshot.totalGrossRevenue,
              totalNetRevenue: snapshot.totalNetRevenue,
              availableBalance: snapshot.availableBalance,
              pendingBalance: snapshot.pendingBalance,
              mrr: snapshot.mrr,
              monthlyGoalTarget: snapshot.monthlyGoalTarget ?? null,
            },
            products: snapshot.products.slice(0, 12),
            coupons: snapshot.coupons.slice(0, 12),
            pendingTransactions: snapshot.recentTransactions
              .filter((t) => t.status === 'pending')
              .slice(0, 8),
            recentApprovedTransactions: snapshot.recentTransactions
              .filter((t) => t.status === 'approved')
              .slice(0, 10),
          })
        : JSON.stringify({
            note: 'Nenhum snapshot detalhado sincronizado ainda; gere recomendações iniciais de organização financeira, catálogo e cupons para o criador.',
          });

      const prompt = [
        `Você é o agente autônomo de organização e operações da plataforma MonetizaHub trabalhando em segundo plano enquanto o criador não está no aplicativo.`,
        `Áreas de foco configuradas: ${this.state.focusAreas.join(', ')}.`,
        `Gatilho do ciclo: ${trigger === 'scheduled_away' ? 'Execução agendada em modo ausente' : 'Execução manual solicitada pelo criador'}.`,
        `Analise o snapshot real abaixo e produza um plano estruturado de organização com ações práticas, objetivas e em Português do Brasil:`,
        snapshotSummary,
      ].join('\n\n');

      const requestPayload = {
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Responda exclusivamente em JSON válido seguindo o schema fornecido. Todas as mensagens, títulos e descrições devem estar em Português do Brasil claro, direto e prático. Use apenas IDs de produtos realmente presentes no snapshot quando preencher productId.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: 'Título curto resumindo a organização feita pela IA.',
              },
              awaySummary: {
                type: Type.STRING,
                description:
                  'Resumo executivo em 2 a 3 frases sobre o que a IA auditou e organizou no catálogo, financeiro e cupons.',
              },
              organizedHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista com 3 pontos objetivos do que foi priorizado.',
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      description:
                        'Um de: coupon, pricing, catalog, retention, finance',
                    },
                    actionType: {
                      type: Type.STRING,
                      description:
                        'Um de: create_coupon, adjust_price, optimize_tags, review_pending, general_organization',
                    },
                    estimatedImpact: { type: Type.STRING },
                    couponCode: { type: Type.STRING },
                    discountPercentage: { type: Type.NUMBER },
                    productId: { type: Type.STRING },
                    productTitle: { type: Type.STRING },
                    suggestedPrice: { type: Type.NUMBER },
                    suggestedTags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    'title',
                    'description',
                    'category',
                    'actionType',
                    'estimatedImpact',
                  ],
                },
              },
            },
            required: ['headline', 'awaySummary', 'organizedHighlights', 'tasks'],
          },
        },
      };

      const maxAttempts = 2;
      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
      let lastErr: unknown = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          response = await Promise.race([
            ai.models.generateContent(requestPayload),
            new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error('503 UNAVAILABLE: Tempo limite excedido ao consultar o serviço Gemini.')
                  ),
                35_000
              )
            ),
          ]);
          lastErr = null;
          break;
        } catch (attemptErr) {
          lastErr = attemptErr;
          if (attempt < maxAttempts && this.isTransientGeminiError(attemptErr)) {
            await this.sleep(1200);
            continue;
          }
          throw attemptErr;
        }
      }

      if (!response) {
        throw lastErr ?? new Error('Nenhuma resposta recebida da API Gemini.');
      }

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        headline?: string;
        awaySummary?: string;
        organizedHighlights?: string[];
        tasks?: Array<{
          title?: string;
          description?: string;
          category?: string;
          actionType?: string;
          estimatedImpact?: string;
          couponCode?: string;
          discountPercentage?: number;
          productId?: string;
          productTitle?: string;
          suggestedPrice?: number;
          suggestedTags?: string[];
        }>;
      };

      const allowedCategories = new Set([
        'coupon',
        'pricing',
        'catalog',
        'retention',
        'finance',
      ]);
      const allowedActionTypes = new Set([
        'create_coupon',
        'adjust_price',
        'optimize_tags',
        'review_pending',
        'general_organization',
      ]);

      const createdTasks: AutopilotOrganizedTask[] = (parsed.tasks || [])
        .slice(0, 5)
        .map((t, idx) => {
          const cat = allowedCategories.has(String(t.category))
            ? (t.category as AutopilotOrganizedTask['category'])
            : 'catalog';
          const act = allowedActionTypes.has(String(t.actionType))
            ? (t.actionType as AutopilotOrganizedTask['actionType'])
            : 'general_organization';
          return {
            id: `ai-task-${Date.now()}-${idx}`,
            title: String(t.title || 'Ação de organização sugerida').trim(),
            description: String(t.description || '').trim(),
            category: cat,
            actionType: act,
            estimatedImpact: String(t.estimatedImpact || 'Otimização operacional').trim(),
            payload: {
              couponCode: t.couponCode
                ? String(t.couponCode).toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                : undefined,
              discountPercentage:
                typeof t.discountPercentage === 'number' && t.discountPercentage > 0
                  ? Math.min(80, Math.round(t.discountPercentage))
                  : undefined,
              productId: t.productId || undefined,
              productTitle: t.productTitle || undefined,
              suggestedPrice:
                typeof t.suggestedPrice === 'number' && t.suggestedPrice > 0
                  ? Number(t.suggestedPrice.toFixed(2))
                  : undefined,
              suggestedTags: Array.isArray(t.suggestedTags)
                ? t.suggestedTags.map((s) => String(s)).slice(0, 5)
                : undefined,
            },
            status: 'pending',
            createdAt: nowIso,
          };
        });

      this.state.latestBriefing = {
        headline: parsed.headline || 'Organização concluída pela IA em segundo plano',
        awaySummary:
          parsed.awaySummary ||
          'Catálogo, metas e movimentações financeiras analisados com sucesso.',
        organizedHighlights: Array.isArray(parsed.organizedHighlights)
          ? parsed.organizedHighlights.slice(0, 4)
          : [],
        generatedAt: nowIso,
      };

      // Keep applied/dismissed tasks + prepend newly generated pending tasks (deduping old pending)
      const previousResolved = this.state.organizedTasks
        .filter((t) => t.status !== 'pending')
        .slice(0, 10);
      this.state.organizedTasks = [...createdTasks, ...previousResolved];

      this.state.lastRunAt = nowIso;
      this.state.nextRunAt = this.state.enabled
        ? new Date(
            Date.now() + this.state.intervalMinutes * 60 * 1000
          ).toISOString()
        : null;
      this.state.totalRuns += 1;
      this.state.status = this.state.enabled ? 'idle' : 'paused';
      this.state.lastError = null;

      this.state.runsHistory = [
        {
          id: `run-${Date.now()}`,
          timestamp: nowIso,
          trigger,
          outcome: 'success' as const,
          model,
          tasksCreated: createdTasks.length,
          summary: this.state.latestBriefing.headline,
        },
        ...this.state.runsHistory,
      ].slice(0, 25);

      this.persistState();
      return { ok: true, state: this.getPublicState() };
    } catch (err) {
      const errorMessage = this.formatUpstreamError(err);
      this.state.lastError = errorMessage;
      this.state.status = 'error';
      this.state.lastRunAt = nowIso;
      this.state.nextRunAt = this.state.enabled
        ? new Date(
            Date.now() + this.state.intervalMinutes * 60 * 1000
          ).toISOString()
        : null;

      this.state.runsHistory = [
        {
          id: `run-${Date.now()}`,
          timestamp: nowIso,
          trigger,
          outcome: 'error' as const,
          model,
          tasksCreated: 0,
          summary: 'Falha na execução do ciclo Gemini',
          errorMessage,
        },
        ...this.state.runsHistory,
      ].slice(0, 25);

      this.persistState();
      return {
        ok: false,
        state: this.getPublicState(),
        error: errorMessage,
      };
    } finally {
      this.isExecutingCycle = false;
    }
  }

  public startBackgroundScheduler(): void {
    if (this.timerHandle) return;
    // Tick every 30s on the server so scheduled cycles fire even with zero open browser tabs
    this.timerHandle = setInterval(() => {
      if (!this.state.enabled || this.isExecutingCycle) return;
      if (!this.state.nextRunAt) return;
      const dueAt = new Date(this.state.nextRunAt).getTime();
      if (!Number.isNaN(dueAt) && Date.now() >= dueAt) {
        void this.runOrganizationCycle('scheduled_away');
      }
    }, 30_000);
    if (typeof this.timerHandle.unref === 'function') {
      this.timerHandle.unref();
    }
  }
}
