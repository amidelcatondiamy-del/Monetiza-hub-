import {
  Behavior,
  FunctionDeclaration,
  FunctionResponseScheduling,
  GoogleGenAI,
  InteractionStatus,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
  Type,
} from '@google/genai';
import type { WebSocket, RawData } from 'ws';
import type { AnalyticsTrackerService } from './analyticsTracker';
import type { AiAutopilotService } from './aiAutopilot';

export type LiveVoiceName = 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
export type LivePersonaId =
  | 'strategist'
  | 'sales_concierge'
  | 'analytics_coach'
  | 'support_guide';

export interface LiveBusinessContext {
  creatorName?: string;
  currency?: string;
  totalGrossRevenue?: number;
  totalNetRevenue?: number;
  availableBalance?: number;
  mrr?: number;
  totalSalesCount?: number;
  averageTicket?: number;
  currentView?: string;
  activeTab?: string;
  topProducts?: Array<{ title: string; price: number; salesCount: number }>;
}

interface ClientLiveMessage {
  type: 'init' | 'audio' | 'text' | 'context_update' | 'close';
  persona?: LivePersonaId;
  voiceName?: LiveVoiceName;
  extendedThinking?: boolean;
  businessContext?: LiveBusinessContext;
  data?: string;
  text?: string;
}

const VALID_VOICES: LiveVoiceName[] = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];

function buildSystemInstruction(
  persona: LivePersonaId,
  ctx?: LiveBusinessContext
): string {
  const creator = ctx?.creatorName || 'Criador MonetizaHub';
  const currency = ctx?.currency || 'BRL';
  const revenueLine =
    typeof ctx?.totalGrossRevenue === 'number'
      ? `Faturamento bruto atual: ${ctx.totalGrossRevenue.toFixed(2)} ${currency}, MRR: ${(ctx.mrr ?? 0).toFixed(2)} ${currency}, Saldo disponível: ${(ctx.availableBalance ?? 0).toFixed(2)} ${currency}, Ticket médio: ${(ctx.averageTicket ?? 0).toFixed(2)} ${currency}.`
      : '';
  const productsLine =
    Array.isArray(ctx?.topProducts) && ctx.topProducts.length > 0
      ? `Principais produtos ativos: ${ctx.topProducts
          .slice(0, 4)
          .map((p) => `${p.title} (${p.price.toFixed(2)} ${currency}, ${p.salesCount} vendas)`)
          .join('; ')}.`
      : '';

  const personaDirectives: Record<LivePersonaId, string> = {
    strategist:
      'Você é a Consultora Estratégica de Receita do MonetizaHub. Fale em português brasileiro natural, direto e executivo, com respostas curtas e acionáveis ideais para conversa por voz. Ajude o criador a aumentar conversões, ajustar preços, estruturar assinaturas VIP e acelerar saques.',
    sales_concierge:
      'Você é o Concierge de Vendas da Vitrine MonetizaHub. Fale em português brasileiro acolhedor e persuasivo. Apresente os produtos digitais, planos de assinatura VIP e desbloqueios exclusivos de forma clara, respondendo dúvidas de compra via Pix, Cartão Visa ou Multicaixa Express.',
    analytics_coach:
      'Você é o Analista de Métricas e Crescimento do MonetizaHub. Fale em português brasileiro claro e orientado a dados. Traduza métricas como DAU/MAU (Stickiness), ARPU, ARPPU, Churn, eCPM e horários de pico em decisões práticas de monetização.',
    support_guide:
      'Você é o Guia de Operações e Pagamentos do MonetizaHub. Explique com clareza em português brasileiro como configurar gateways (Stripe, Mercado Pago, AppyPay/ProxyPay), acompanhar webhooks, ativar Modo Foco ou exportar resumos fiscais.',
  };

  return [
    personaDirectives[persona] || personaDirectives.strategist,
    `Você está conversando em tempo real por voz com ${creator}.`,
    revenueLine,
    productsLine,
    'Use as ferramentas disponíveis sempre que o usuário perguntar sobre métricas em tempo real, padrões de uso, decisões de monetização ou pedir para abrir uma seção do aplicativo. Mantenha respostas faladas objetivas (2 a 4 frases por turno) para fluidez conversacional.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function attachLiveVoiceSession(
  clientWs: WebSocket,
  deps: {
    analyticsTracker: AnalyticsTrackerService;
    aiAutopilot: AiAutopilotService;
  }
) {
  let activeSession: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
  let businessContext: LiveBusinessContext = {};
  let isClosed = false;

  const sendJson = (payload: Record<string, unknown>) => {
    if (isClosed || clientWs.readyState !== 1) return;
    try {
      clientWs.send(JSON.stringify(payload));
    } catch {
      // Ignore send errors on closed socket
    }
  };

  const closeGeminiSession = () => {
    if (activeSession) {
      try {
        activeSession.close();
      } catch {
        // Ignore close errors
      }
      activeSession = null;
    }
  };

  const executeTool = (name: string, args: Record<string, unknown> | undefined) => {
    if (name === 'getLiveBusinessSummary') {
      const overview = deps.analyticsTracker.getOverview('30d');
      const autopilotSnap = deps.aiAutopilot.getPublicState().latestSnapshot;
      const snapProducts = autopilotSnap?.products || [];
      const snapSalesCount = snapProducts.reduce((sum, p) => sum + (p.salesCount || 0), 0);
      const snapGross = autopilotSnap?.totalGrossRevenue ?? overview.revenueSummary.totalGross;
      const snapAvgTicket =
        snapSalesCount > 0 ? Number((snapGross / snapSalesCount).toFixed(2)) : 0;

      return {
        creatorName: businessContext.creatorName || autopilotSnap?.creatorName || 'Criador',
        currency: businessContext.currency || autopilotSnap?.currency || 'BRL',
        totalGrossRevenue: businessContext.totalGrossRevenue ?? snapGross,
        totalNetRevenue:
          businessContext.totalNetRevenue ?? autopilotSnap?.totalNetRevenue ?? overview.revenueSummary.totalNet,
        availableBalance: businessContext.availableBalance ?? autopilotSnap?.availableBalance ?? 0,
        mrr: businessContext.mrr ?? autopilotSnap?.mrr ?? 0,
        totalSalesCount: businessContext.totalSalesCount ?? snapSalesCount,
        averageTicket: businessContext.averageTicket ?? snapAvgTicket,
        topProducts:
          businessContext.topProducts ||
          snapProducts.slice(0, 4).map((p) => ({
            title: p.title,
            price: p.price,
            salesCount: p.salesCount,
          })),
      };
    }

    if (name === 'getUsagePatternsAndDecisions') {
      const period =
        args?.window === '24h' || args?.window === '7d' || args?.window === '30d'
          ? args.window
          : '30d';
      const overview = deps.analyticsTracker.getOverview(period);
      return {
        window: period,
        engagement: overview.engagement,
        revenueSummary: overview.revenueSummary,
        peakDay: overview.usagePatterns.peakDayLabel,
        peakTimeWindow: overview.usagePatterns.peakWindowLabel,
        topFeatures: overview.usagePatterns.featureAdoption.slice(0, 4),
        topDecisions: overview.keyMetricsDecisions.slice(0, 4).map((d) => ({
          metric: d.metricName,
          current: d.currentValue,
          decision: d.monetizationDecision,
          action: d.recommendedAction,
        })),
      };
    }

    if (name === 'navigateAppSection') {
      const targetTab = typeof args?.tab === 'string' ? args.tab : 'overview';
      const targetView =
        args?.view === 'storefront' || args?.view === 'admin' || args?.view === 'studio'
          ? args.view
          : 'studio';
      sendJson({
        type: 'ui_action',
        action: 'navigate',
        view: targetView,
        tab: targetTab,
      });
      return {
        navigated: true,
        view: targetView,
        tab: targetTab,
      };
    }

    return { error: `Ferramenta desconhecida: ${name}` };
  };

  const startLiveSession = async (initMsg: ClientLiveMessage) => {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      sendJson({
        type: 'error',
        message:
          'Chave GEMINI_API_KEY não configurada no servidor. Configure-a em Settings > Secrets para ativar conversas por voz em tempo real.',
      });
      return;
    }

    closeGeminiSession();
    if (initMsg.businessContext) {
      businessContext = initMsg.businessContext;
    }

    const persona: LivePersonaId =
      initMsg.persona &&
      ['strategist', 'sales_concierge', 'analytics_coach', 'support_guide'].includes(
        initMsg.persona
      )
        ? initMsg.persona
        : 'strategist';
    const voiceName: LiveVoiceName =
      initMsg.voiceName && VALID_VOICES.includes(initMsg.voiceName)
        ? initMsg.voiceName
        : 'Zephyr';
    const useExtendedThinking = Boolean(initMsg.extendedThinking);
    const model = useExtendedThinking
      ? 'gemini-3.8-live-extended-thinking'
      : 'gemini-3.8-live';

    const toolsList: FunctionDeclaration[] = [
      {
        name: 'getLiveBusinessSummary',
        description:
          'Obtém os dados financeiros atuais do criador (faturamento bruto, líquido, saldo disponível, MRR, ticket médio e principais produtos).',
        ...(useExtendedThinking ? { behavior: Behavior.NON_BLOCKING } : {}),
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'getUsagePatternsAndDecisions',
        description:
          'Consulta métricas de engajamento (DAU/MAU, duração da sessão), padrões de uso (horário de pico, recursos mais usados) e recomendações de monetização.',
        ...(useExtendedThinking ? { behavior: Behavior.NON_BLOCKING } : {}),
        parameters: {
          type: Type.OBJECT,
          properties: {
            window: {
              type: Type.STRING,
              description: "Janela de análise: '24h', '7d' ou '30d'.",
            },
          },
        },
      },
      {
        name: 'navigateAppSection',
        description:
          'Abre uma tela ou aba específica do MonetizaHub quando o usuário pedir por voz (ex: overview, analytics, user_analytics, products, subscriptions, ads, storefront).',
        ...(useExtendedThinking ? { behavior: Behavior.NON_BLOCKING } : {}),
        parameters: {
          type: Type.OBJECT,
          properties: {
            view: {
              type: Type.STRING,
              description: "Visão principal: 'studio', 'storefront' ou 'admin'.",
            },
            tab: {
              type: Type.STRING,
              description:
                "Aba do estúdio: 'overview', 'models', 'analytics', 'user_analytics', 'products', 'subscriptions', 'tipping', 'paywall', 'ads', 'calculator'.",
            },
          },
        },
      },
    ];

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          ...(useExtendedThinking
            ? {
                thinkingConfig: {
                  thinkingLevel: ThinkingLevel.MEDIUM,
                },
              }
            : {}),
          tools: [{ functionDeclarations: toolsList }],
          systemInstruction: buildSystemInstruction(persona, businessContext),
        },
        callbacks: {
          onopen: () => {
            sendJson({
              type: 'ready',
              model,
              voiceName,
              persona,
            });
          },
          onmessage: (message: LiveServerMessage) => {
            const serverContent = message.serverContent;
            if (serverContent?.inputTranscription?.text) {
              sendJson({
                type: 'input_transcript',
                text: serverContent.inputTranscription.text,
              });
            }
            if (serverContent?.outputTranscription?.text) {
              sendJson({
                type: 'output_transcript',
                text: serverContent.outputTranscription.text,
              });
            }
            for (const part of serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                sendJson({
                  type: 'audio',
                  data: part.inlineData.data,
                });
              }
            }
            if (serverContent?.interrupted) {
              sendJson({ type: 'interrupted' });
            }
            if (serverContent?.turnComplete || serverContent?.interactionStatus) {
              sendJson({
                type: 'turn_state',
                turnComplete: Boolean(serverContent.turnComplete),
                interactionStatus:
                  serverContent.interactionStatus ??
                  (serverContent.turnComplete
                    ? InteractionStatus.IDLE
                    : InteractionStatus.IN_PROGRESS),
              });
            }

            const calls = message.toolCall?.functionCalls ?? [];
            if (calls.length > 0 && activeSession) {
              const responses = calls.map((call) => {
                const toolName = call.name || 'unknown';
                const toolResult = executeTool(
                  toolName,
                  (call.args || {}) as Record<string, unknown>
                );
                sendJson({
                  type: 'tool_call',
                  name: toolName,
                  args: call.args || {},
                  result: toolResult,
                });
                return {
                  id: call.id,
                  name: toolName,
                  response: { result: toolResult },
                  ...(useExtendedThinking
                    ? { scheduling: FunctionResponseScheduling.WHEN_IDLE }
                    : {}),
                };
              });

              activeSession.sendToolResponse({
                functionResponses: responses,
              });
            }
          },
          onerror: (err: unknown) => {
            const msg =
              err instanceof Error
                ? err.message
                : 'Erro na conexão em tempo real com Gemini Live API.';
            sendJson({ type: 'error', message: msg });
          },
          onclose: () => {
            sendJson({ type: 'closed' });
          },
        },
      });

      if (isClosed) {
        session.close();
        return;
      }
      activeSession = session;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível iniciar a sessão de voz Gemini Live.';
      sendJson({ type: 'error', message: msg });
    }
  };

  clientWs.on('message', async (raw: RawData) => {
    try {
      const parsed = JSON.parse(raw.toString()) as ClientLiveMessage;
      if (parsed.type === 'init') {
        await startLiveSession(parsed);
      } else if (parsed.type === 'context_update' && parsed.businessContext) {
        businessContext = parsed.businessContext;
      } else if (parsed.type === 'audio' && parsed.data && activeSession) {
        activeSession.sendRealtimeInput({
          audio: {
            data: parsed.data,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } else if (parsed.type === 'text' && parsed.text && activeSession) {
        activeSession.sendRealtimeInput({
          text: parsed.text,
        });
      } else if (parsed.type === 'close') {
        closeGeminiSession();
      }
    } catch (err) {
      sendJson({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Mensagem inválida recebida pelo socket de voz.',
      });
    }
  });

  clientWs.on('close', () => {
    isClosed = true;
    closeGeminiSession();
  });
}
