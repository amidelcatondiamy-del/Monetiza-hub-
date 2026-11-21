import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  X,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Bot,
  Flame,
  Check,
  Tag,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { AITipCategory, AITipFrequency } from '../../types/monetization';
import { AITipsPdfExportModal } from './AITipsPdfExportModal';

export const AIConversionTipsCard: React.FC = () => {
  const {
    aiTips,
    aiSettings,
    applyAITip,
    dismissAITip,
    updateAISettings,
    regenerateAITips,
    totalGrossRevenue,
    averageTicket,
    products,
    affiliates,
  } = useMonetization();

  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const activeTips = aiTips.filter(
    (t) => !t.isDismissed && aiSettings.prioritizedTopics.includes(t.category)
  );

  const handleApply = (tipId: string) => {
    const res = applyAITip(tipId);
    if (res.success) {
      setNotificationMsg(res.message);
      setTimeout(() => setNotificationMsg(null), 5000);
    }
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      regenerateAITips();
      setIsRegenerating(false);
      setNotificationMsg('Novas sugestões geradas com base no tráfego e vendas mais recentes!');
      setTimeout(() => setNotificationMsg(null), 5000);
    }, 800);
  };

  const handleToggleTopic = (topic: AITipCategory) => {
    const current = aiSettings.prioritizedTopics;
    let next: AITipCategory[];
    if (current.includes(topic)) {
      if (current.length === 1) return; // Keep at least one
      next = current.filter((t) => t !== topic);
    } else {
      next = [...current, topic];
    }
    updateAISettings({ prioritizedTopics: next });
  };

  const getCategoryBadge = (cat: AITipCategory) => {
    switch (cat) {
      case 'pricing':
        return { label: 'Preços & Combos', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'affiliates':
        return { label: 'Afiliados & Parcerias', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'retention':
        return { label: 'Retenção & Membros', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'revenue':
        return { label: 'Receita & Faturamento', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'storefront':
        return { label: 'Vitrine & Carrinho', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/30 rounded-2xl p-5 sm:p-6 border border-slate-800 hover:border-slate-700/80 transition-all shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Bot className="w-6 h-6 animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Dicas de Inteligência Artificial</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/40">
                Copiloto Ativo • {aiSettings.frequency === 'daily' ? 'Diário' : aiSettings.frequency === 'weekly' ? 'Semanal' : 'Tempo Real'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sugestões orientadas a dados para alavancar a taxa de conversão e receita do catálogo
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition cursor-pointer disabled:opacity-50"
            title="Atualizar dicas com IA"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportPdfOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold border border-indigo-500/35 transition cursor-pointer shadow-sm active:scale-95"
            title="Exportar resumo estratégico das sugestões geradas para formato PDF para revisão offline"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exportar PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isControlPanelOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Painel de Controle</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {notificationMsg && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PAINEL DE CONTROLE DE INTELIGÊNCIA ARTIFICIAL */}
      {isControlPanelOpen && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Configurações do Algoritmo de IA
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Modelo: <strong className="text-indigo-400">{aiSettings.model}</strong>
            </span>
          </div>

          {/* 1. Frequency Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Frequência de Análise & Novas Sugestões
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['realtime', 'daily', 'weekly'] as AITipFrequency[]).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => updateAISettings({ frequency: freq })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    aiSettings.frequency === freq
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {freq === 'realtime' && 'Em Tempo Real'}
                  {freq === 'daily' && 'Diária (Recomendado)'}
                  {freq === 'weekly' && 'Semanal'}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Topic Prioritization */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Tópicos de Análise Prioritários (Selecione quais áreas a IA deve focar)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { id: 'pricing', label: 'Preços & Combos', desc: 'Sugerir aumento em itens de alta procura' },
                { id: 'revenue', label: 'Receita & Faturamento', desc: 'Otimização de janelas e picos de compra' },
                { id: 'affiliates', label: 'Engajamento de Afiliados', desc: 'Bonificação para parceiros que geram tráfego' },
                { id: 'retention', label: 'Retenção de Membros', desc: 'Combater churn e elevar renovações VIP' },
                { id: 'storefront', label: 'Conversão da Vitrine', desc: 'Recuperação de visitantes e carrinhos' },
              ].map((topic) => {
                const isSelected = aiSettings.prioritizedTopics.includes(topic.id as AITipCategory);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleToggleTopic(topic.id as AITipCategory)}
                    className={`p-2.5 rounded-xl text-left transition cursor-pointer border flex items-start gap-2 ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500/60 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        isSelected ? 'bg-indigo-500 text-white' : 'border border-slate-700'
                      }`}
                    >
                      {isSelected && '✓'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{topic.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{topic.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tips List */}
      <div className="mt-4 space-y-3">
        {activeTips.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800">
            Nenhuma sugestão pendente para os filtros selecionados. Clique em "Atualizar" para gerar novas análises.
          </div>
        ) : (
          activeTips.map((tip) => {
            const catBadge = getCategoryBadge(tip.category);
            return (
              <div
                key={tip.id}
                className={`p-4 rounded-xl border transition-all ${
                  tip.isApplied
                    ? 'bg-slate-950/50 border-emerald-500/30 opacity-80'
                    : 'bg-slate-950/80 border-slate-800 hover:border-indigo-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catBadge.color}`}>
                        {catBadge.label}
                      </span>
                      {tip.impact === 'critical' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          Impacto Imediato
                        </span>
                      )}
                      {tip.impact === 'high' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Alto Impacto
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        ⚡ {tip.metricImpactEstimate}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{tip.title}</span>
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {tip.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:self-center shrink-0">
                    {tip.isApplied ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Aplicado</span>
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApply(tip.id)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>{tip.actionLabel}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissAITip(tip.id)}
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
                          title="Descartar sugestão"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Exportação do Resumo Estratégico em PDF */}
      <AITipsPdfExportModal
        isOpen={isExportPdfOpen}
        onClose={() => setIsExportPdfOpen(false)}
      />
    </div>
  );
};
