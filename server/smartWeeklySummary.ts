import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export interface SmartSummaryProductMetric {
  id: string;
  title: string;
  type: string;
  price: number;
  salesCount: number;
  viewsCount: number;
  conversionRatePct: number;
  estimatedRevenue: number;
  tags: string[];
}

export interface SmartSummaryInputPayload {
  creatorName: string;
  currency: string;
  weeklyMetrics: {
    periodLabel: string;
    currentWeekGross: number;
    currentWeekNet: number;
    previousWeekGross: number;
    weekOverWeekGrowthPct: number;
    approvedTransactionsCount: number;
    pendingTransactionsCount: number;
    pendingAmount: number;
    averageTicket: number;
    mrr: number;
    tipsTotalWeek: number;
    subscriptionsTotalWeek: number;
    productsTotalWeek: number;
    topPaymentMethods: Array<{ method: string; count: number; total: number }>;
  };
  topProducts: SmartSummaryProductMetric[];
  activeCoupons: Array<{
    code: string;
    discountPercentage: number;
    usedCount: number;
    maxUses: number;
  }>;
  monthlyGoalTarget?: number;
}

export interface SmartWeeklyTopProductHighlight {
  productTitle: string;
  performanceSummary: string;
  conversionDiagnosis: string;
}

export interface SmartWeeklyMarketingAction {
  title: string;
  targetProduct: string;
  channel: string;
  tactic: string;
  expectedImpact: string;
  suggestedCouponCode?: string;
  suggestedDiscountPct?: number;
}

export interface SmartWeeklySummaryResult {
  id: string;
  generatedAt: string;
  model: string;
  periodLabel: string;
  headline: string;
  weeklyNarrative: string;
  topProducts: SmartWeeklyTopProductHighlight[];
  marketingActions: SmartWeeklyMarketingAction[];
  closingTakeaway: string;
  metricsSnapshot: SmartSummaryInputPayload['weeklyMetrics'];
}

interface StoredSmartSummaryState {
  latest: SmartWeeklySummaryResult | null;
  history: SmartWeeklySummaryResult[];
}

export class SmartWeeklySummaryService {
  private readonly filePath: string;
  private state: StoredSmartSummaryState;

  constructor(dataDir: string) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'smart-weekly-summary.json');
    this.state = this.loadState();
  }

  private loadState(): StoredSmartSummaryState {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(
          fs.readFileSync(this.filePath, 'utf-8')
        ) as Partial<StoredSmartSummaryState>;
        return {
          latest: parsed.latest ?? null,
          history: Array.isArray(parsed.history) ? parsed.history : [],
        };
      }
    } catch {
      // Fallback to clean empty state
    }
    return { latest: null, history: [] };
  }

  private persistState(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(this.state, null, 2),
      'utf-8'
    );
  }

  public isGeminiConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY?.trim();
    return Boolean(key && key.length > 10);
  }

  public getLatestState(): StoredSmartSummaryState & { geminiConfigured: boolean } {
    return {
      latest: this.state.latest,
      history: this.state.history,
      geminiConfigured: this.isGeminiConfigured(),
    };
  }

  private getGeminiClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY não configurada no servidor. Verifique sua chave no painel Settings > Secrets.'
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
      // Keep original string
    }

    const upper = `${rawMsg} ${extractedMsg}`.toUpperCase();
    if (
      upper.includes('API_KEY_INVALID') ||
      upper.includes('PERMISSION_DENIED') ||
      upper.includes('401') ||
      upper.includes('403')
    ) {
      return 'Chave GEMINI_API_KEY inválida ou sem permissão. Verifique em Settings > Secrets.';
    }
    if (
      upper.includes('503') ||
      upper.includes('UNAVAILABLE') ||
      upper.includes('HIGH DEMAND') ||
      upper.includes('DEADLINE')
    ) {
      return 'O serviço Gemini está temporariamente sobrecarregado ou excedeu o tempo limite. Tente gerar novamente em instantes.';
    }
    if (upper.includes('RESOURCE_EXHAUSTED') || upper.includes('429')) {
      return 'Limite de cota da API Gemini atingido (429). Verifique seu plano ou chave em Settings > Secrets.';
    }
    if (upper.includes('404') || upper.includes('NOT_FOUND')) {
      return 'Modelo Gemini não encontrado (404) para esta chave.';
    }
    return extractedMsg || 'Falha ao gerar Resumo Inteligente via API Gemini.';
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async generateWeeklySummary(
    payload: SmartSummaryInputPayload
  ): Promise<{
    ok: boolean;
    summary?: SmartWeeklySummaryResult;
    history?: SmartWeeklySummaryResult[];
    geminiConfigured: boolean;
    error?: string;
  }> {
    const model = 'gemini-4-hydrogen';

    try {
      const ai = this.getGeminiClient();

      const contextJson = JSON.stringify({
        creatorName: payload.creatorName,
        currency: payload.currency,
        weeklyMetrics: payload.weeklyMetrics,
        topProducts: payload.topProducts.slice(0, 6),
        activeCoupons: payload.activeCoupons.slice(0, 8),
        monthlyGoalTarget: payload.monthlyGoalTarget ?? null,
      });

      const prompt = [
        'Elabore um Resumo Inteligente semanal completo de desempenho financeiro e comercial para o criador abaixo, em Português do Brasil.',
        'Regras obrigatórias do texto:',
        '1. Escreva uma narrativa semanal descritiva (2 a 3 parágrafos bem redigidos em weeklyNarrative) explicando o faturamento bruto e líquido da semana, a variação frente à semana anterior, a composição entre produtos/assinaturas/gorjetas, os métodos de pagamento preferidos e eventuais valores pendentes.',
        '2. Destaque objetivamente os produtos mais vendidos (usando os dados reais de vendas, receita estimada e taxa de conversão de visualizações para compras).',
        '3. Sugira de 3 a 4 ações de marketing específicas, práticas e mensuráveis para elevar as conversões na próxima semana (indicando produto-alvo, canal de distribuição, tática concreta, impacto esperado e código de cupom apenas quando fizer sentido).',
        'Dados reais consolidados da semana:',
        contextJson,
      ].join('\n\n');

      const requestPayload = {
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Você é um analista sênior de receita e growth marketing para criadores digitais. Responda exclusivamente em JSON válido seguindo o schema, em Português do Brasil claro, preciso e baseado estritamente nos números recebidos sem inventar dados inexistentes.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description:
                  'Manchete executiva resumindo o desempenho financeiro semanal em até 12 palavras.',
              },
              weeklyNarrative: {
                type: Type.STRING,
                description:
                  'Texto descritivo semanal fluido com 2 a 3 parágrafos separados por \\n\\n analisando desempenho financeiro, margem líquida, tendência semanal e meios de pagamento.',
              },
              topProducts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    productTitle: { type: Type.STRING },
                    performanceSummary: {
                      type: Type.STRING,
                      description:
                        'Resumo do volume de vendas e participação no faturamento.',
                    },
                    conversionDiagnosis: {
                      type: Type.STRING,
                      description:
                        'Leitura objetiva da relação visualizações -> compras e oportunidade de melhoria.',
                    },
                  },
                  required: [
                    'productTitle',
                    'performanceSummary',
                    'conversionDiagnosis',
                  ],
                },
              },
              marketingActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    targetProduct: { type: Type.STRING },
                    channel: {
                      type: Type.STRING,
                      description:
                        'Canal específico (ex: WhatsApp VIP, E-mail Pós-Visualização, Reels/Stories, Checkout).',
                    },
                    tactic: {
                      type: Type.STRING,
                      description:
                        'Descrição acionável do que executar passo a passo nesta semana.',
                    },
                    expectedImpact: {
                      type: Type.STRING,
                      description: 'Ganho esperado em conversão ou ticket médio.',
                    },
                    suggestedCouponCode: { type: Type.STRING },
                    suggestedDiscountPct: { type: Type.NUMBER },
                  },
                  required: [
                    'title',
                    'targetProduct',
                    'channel',
                    'tactic',
                    'expectedImpact',
                  ],
                },
              },
              closingTakeaway: {
                type: Type.STRING,
                description:
                  'Recomendação final curta de prioridade para os próximos 7 dias.',
              },
            },
            required: [
              'headline',
              'weeklyNarrative',
              'topProducts',
              'marketingActions',
              'closingTakeaway',
            ],
          },
        },
      };

      const maxAttempts = 2;
      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null =
        null;
      let lastErr: unknown = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          response = await Promise.race([
            ai.models.generateContent(requestPayload),
            new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error(
                      '503 UNAVAILABLE: Tempo limite excedido ao consultar o serviço Gemini.'
                    )
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
        weeklyNarrative?: string;
        topProducts?: Array<{
          productTitle?: string;
          performanceSummary?: string;
          conversionDiagnosis?: string;
        }>;
        marketingActions?: Array<{
          title?: string;
          targetProduct?: string;
          channel?: string;
          tactic?: string;
          expectedImpact?: string;
          suggestedCouponCode?: string;
          suggestedDiscountPct?: number;
        }>;
        closingTakeaway?: string;
      };

      const nowIso = new Date().toISOString();
      const summary: SmartWeeklySummaryResult = {
        id: `smart-summary-${Date.now()}`,
        generatedAt: nowIso,
        model,
        periodLabel: payload.weeklyMetrics.periodLabel,
        headline:
          String(parsed.headline || '').trim() ||
          'Desempenho Financeiro Semanal Consolidado',
        weeklyNarrative:
          String(parsed.weeklyNarrative || '').trim() ||
          'Análise semanal gerada com sucesso a partir das movimentações financeiras recentes.',
        topProducts: (parsed.topProducts || []).slice(0, 5).map((item) => ({
          productTitle: String(item.productTitle || 'Produto em destaque').trim(),
          performanceSummary: String(item.performanceSummary || '').trim(),
          conversionDiagnosis: String(item.conversionDiagnosis || '').trim(),
        })),
        marketingActions: (parsed.marketingActions || [])
          .slice(0, 4)
          .map((action) => {
            const rawCode = action.suggestedCouponCode
              ? String(action.suggestedCouponCode)
                  .toUpperCase()
                  .replace(/[^A-Z0-9_-]/g, '')
              : '';
            const rawPct =
              typeof action.suggestedDiscountPct === 'number' &&
              action.suggestedDiscountPct > 0
                ? Math.min(70, Math.round(action.suggestedDiscountPct))
                : undefined;

            return {
              title: String(action.title || 'Ação de Marketing').trim(),
              targetProduct: String(
                action.targetProduct || 'Catálogo geral'
              ).trim(),
              channel: String(action.channel || 'Vitrine & Funil').trim(),
              tactic: String(action.tactic || '').trim(),
              expectedImpact: String(
                action.expectedImpact || 'Aumento na taxa de conversão'
              ).trim(),
              suggestedCouponCode: rawCode.length >= 3 ? rawCode : undefined,
              suggestedDiscountPct: rawPct,
            };
          }),
        closingTakeaway:
          String(parsed.closingTakeaway || '').trim() ||
          'Priorize ofertas direcionadas aos itens com maior volume de visualizações nesta semana.',
        metricsSnapshot: payload.weeklyMetrics,
      };

      this.state.latest = summary;
      this.state.history = [summary, ...this.state.history].slice(0, 12);
      this.persistState();

      return {
        ok: true,
        summary,
        history: this.state.history,
        geminiConfigured: this.isGeminiConfigured(),
      };
    } catch (err) {
      return {
        ok: false,
        geminiConfigured: this.isGeminiConfigured(),
        error: this.formatUpstreamError(err),
      };
    }
  }
}
