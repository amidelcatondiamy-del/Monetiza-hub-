import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Send,
  Volume2,
  BrainCircuit,
  Sparkles,
  Wrench,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  LivePersonaId,
  LiveVoiceClient,
  LiveVoiceName,
  LiveVoiceToolEvent,
} from '../../services/liveVoiceClient';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency } from '../../utils/formatters';

interface LiveVoiceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'studio' | 'storefront' | 'admin';
  activeTab: string;
  onNavigateApp: (view: 'studio' | 'storefront' | 'admin', tab: string) => void;
}

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  text: string;
  timestamp: string;
}

const PERSONAS: Array<{ id: LivePersonaId; title: string; subtitle: string }> = [
  {
    id: 'strategist',
    title: 'Consultora Estratégica',
    subtitle: 'Preços, conversões, assinaturas VIP e meta mensal',
  },
  {
    id: 'analytics_coach',
    title: 'Analista de Métricas',
    subtitle: 'DAU/MAU, ARPU, ARPPU, picos de uso e decisões',
  },
  {
    id: 'sales_concierge',
    title: 'Concierge de Vitrine',
    subtitle: 'Apresenta produtos, planos e checkout Pix/Visa/Express',
  },
  {
    id: 'support_guide',
    title: 'Guia de Operações',
    subtitle: 'Gateways PSP, webhooks, Modo Foco e segurança',
  },
];

const VOICES: Array<{ id: LiveVoiceName; label: string; tone: string }> = [
  { id: 'Zephyr', label: 'Zephyr', tone: 'Clara & Executiva' },
  { id: 'Kore', label: 'Kore', tone: 'Acolhedora & Firme' },
  { id: 'Puck', label: 'Puck', tone: 'Dinâmica & Ágil' },
  { id: 'Charon', label: 'Charon', tone: 'Analítica & Serena' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Direta & Energética' },
];

const SUGGESTED_PROMPTS = [
  'Resuma meu faturamento atual e sugira uma ação rápida de conversão.',
  'Quais são meus horários de pico de uso e o que devo lançar neles?',
  'Abra a aba de Análise de Usuário para vermos o funil.',
  'Como posso aumentar meu ARPPU com compras únicas e assinaturas?',
];

export const LiveVoiceStudioModal: React.FC<LiveVoiceStudioModalProps> = ({
  isOpen,
  onClose,
  currentView,
  activeTab,
  onNavigateApp,
}) => {
  const {
    creator,
    selectedCurrency,
    totalGrossRevenue,
    totalNetRevenue,
    availableBalance,
    mrr,
    totalSalesCount,
    averageTicket,
    products,
    awardActionReward,
  } = useMonetization();

  const clientRef = useRef<LiveVoiceClient | null>(null);
  const [persona, setPersona] = useState<LivePersonaId>('strategist');
  const [voiceName, setVoiceName] = useState<LiveVoiceName>('Zephyr');
  const [extendedThinking, setExtendedThinking] = useState(false);

  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'listening' | 'speaking' | 'closed' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [toolEvents, setToolEvents] = useState<LiveVoiceToolEvent[]>([]);
  const awardedThisSessionRef = useRef(false);

  const buildBusinessContext = () => ({
    creatorName: creator.name,
    currency: selectedCurrency,
    totalGrossRevenue,
    totalNetRevenue,
    availableBalance,
    mrr,
    totalSalesCount,
    averageTicket,
    currentView,
    activeTab,
    topProducts: [...products]
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 4)
      .map((p) => ({ title: p.title, price: p.price, salesCount: p.salesCount })),
  });

  useEffect(() => {
    if (!isOpen) {
      clientRef.current?.disconnect();
      setStatus('idle');
      setMicLevel(0);
      awardedThisSessionRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  if (!isOpen) return null;

  const appendTranscript = (role: 'user' | 'assistant' | 'tool', chunk: string) => {
    if (!chunk) return;
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && role !== 'tool') {
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            text: last.text + chunk,
          },
        ];
      }
      return [
        ...prev.slice(-24),
        {
          id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          role,
          text: chunk,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    });
  };

  const handleStartSession = async (withMic = true) => {
    setErrorMsg(null);
    setToolEvents([]);
    if (!clientRef.current) {
      clientRef.current = new LiveVoiceClient();
    }

    const client = clientRef.current;
    client.setCallbacks({
      onStatusChange: (next) => {
        setStatus(next);
        if (next === 'ready' && !awardedThisSessionRef.current) {
          awardedThisSessionRef.current = true;
          awardActionReward('voice_coach_session', PERSONAS.find((p) => p.id === persona)?.title);
        }
      },
      onInputTranscript: (txt) => appendTranscript('user', txt),
      onOutputTranscript: (txt) => appendTranscript('assistant', txt),
      onToolCall: (ev) => {
        setToolEvents((prev) => [ev, ...prev].slice(0, 8));
        appendTranscript('tool', `Ferramenta executada: ${ev.name}`);
      },
      onUiAction: (act) => {
        if (act.action === 'navigate') {
          onNavigateApp(act.view, act.tab);
        }
      },
      onMicLevel: (lvl) => setMicLevel(lvl),
      onError: (msg) => setErrorMsg(msg),
    });

    try {
      await client.connect({
        persona,
        voiceName,
        extendedThinking,
        businessContext: buildBusinessContext(),
        enableMic: withMic,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao iniciar microfone ou sessão.');
      setStatus('error');
    }
  };

  const handleStopSession = () => {
    clientRef.current?.disconnect();
    setStatus('closed');
    setMicLevel(0);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    clientRef.current?.setMuted(next);
  };

  const handleSendText = (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const msg = (overrideText ?? textInput).trim();
    if (!msg) return;
    appendTranscript('user', msg);
    clientRef.current?.sendText(msg);
    if (!overrideText) setTextInput('');
  };

  const isConnected = status === 'ready' || status === 'listening' || status === 'speaking';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-white tracking-tight">
                  MonetizaHub Live Voice (Gemini Live API)
                </h2>
                <span className="text-[11px] font-mono text-emerald-400">
                  {extendedThinking ? 'gemini-3.8-live-extended-thinking' : 'gemini-3.8-live'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Conversa bidirecional por áudio em tempo real (16kHz/24kHz PCM) com acesso aos dados do negócio e navegação por voz.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              handleStopSession();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Configuration & Controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Business Snapshot */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Contexto em Tempo Real Injetado
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Faturamento Bruto:</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  {formatCurrency(totalGrossRevenue, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">MRR & Saldo:</span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(mrr, selectedCurrency)} • {formatCurrency(availableBalance, selectedCurrency)}
                </span>
              </div>
            </div>

            {/* Persona Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Persona Conversacional
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isConnected}
                    onClick={() => setPersona(p.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer disabled:opacity-60 ${
                      persona === p.id
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{p.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice & Thinking Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Voz Gemini
                </label>
                <select
                  value={voiceName}
                  disabled={isConnected}
                  onChange={(e) => setVoiceName(e.target.value as LiveVoiceName)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} — {v.tone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Modo de Raciocínio
                </label>
                <button
                  type="button"
                  disabled={isConnected}
                  onClick={() => setExtendedThinking(!extendedThinking)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    extendedThinking
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>{extendedThinking ? 'Extended Ativo' : 'Baja Latência'}</span>
                </button>
              </div>
            </div>

            {/* Connection Controls */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Status do Áudio:</span>
                <span className="font-bold text-emerald-400">
                  {status === 'idle' && 'Pronto para conectar'}
                  {status === 'connecting' && 'Conectando ao Gemini Live...'}
                  {status === 'ready' && 'Sessão Ativa — Pode Falar'}
                  {status === 'listening' && 'Ouvindo seu microfone...'}
                  {status === 'speaking' && 'Consultora falando (24kHz PCM)...'}
                  {status === 'closed' && 'Sessão encerrada'}
                  {status === 'error' && 'Falha na conexão'}
                </span>
              </div>

              {/* Audio Level Meter */}
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${Math.round(micLevel * 100)}%` }}
                />
              </div>

              <div className="flex items-center gap-2">
                {!isConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleStartSession(true)}
                      disabled={status === 'connecting'}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Iniciar Voz (Microfone)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleStartSession(false)}
                      disabled={status === 'connecting'}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Conectar ouvindo áudio sem abrir microfone"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Só Áudio/Texto</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        isMuted
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{isMuted ? 'Microfone Mutado' : 'Mutar Microfone'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStopSession}
                      className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Encerrar</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Right Live Transcripts, Tools & Text Interruption */}
          <div className="lg:col-span-7 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[380px]">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Transcrição Bidirecional ao Vivo</span>
              </span>
              {toolEvents.length > 0 && (
                <span className="text-[11px] font-mono text-indigo-300 flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  <span>{toolEvents.length} ferramenta(s) chamada(s)</span>
                </span>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[340px]">
              {transcripts.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <Sparkles className="w-7 h-7 text-emerald-400 mx-auto" />
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Conecte o microfone (ou modo áudio/texto) e fale naturalmente em português. Você pode interromper a assistente a qualquer momento ou pedir para abrir seções do app.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={!isConnected}
                        onClick={() => handleSendText(undefined, prompt)}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-white transition cursor-pointer disabled:opacity-40 text-left"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                transcripts.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl text-xs leading-relaxed ${
                      t.role === 'user'
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-100 ml-8'
                        : t.role === 'tool'
                        ? 'bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 font-mono text-[11px]'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold uppercase">
                        {t.role === 'user'
                          ? 'Você'
                          : t.role === 'tool'
                          ? 'Tool Calling em Tempo Real'
                          : PERSONAS.find((p) => p.id === persona)?.title}
                      </span>
                      <span>{t.timestamp}</span>
                    </div>
                    <div>{t.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Text Input Fallback / Quick Command */}
            <form onSubmit={(e) => handleSendText(e)} className="p-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                disabled={!isConnected}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  isConnected
                    ? 'Digite um comando de voz ou pergunta rápida...'
                    : 'Inicie a sessão ao lado para conversar...'
                }
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isConnected || !textInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
