import React, { useState } from 'react';
import {
  X,
  FileDown,
  Printer,
  Sparkles,
  Bot,
  CheckCircle2,
  Copy,
  Check,
  Flame,
  Zap,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  Sliders,
  Calendar,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { downloadAITipsPDF } from '../../utils/aiTipsPdfGenerator';
import { formatBRL } from '../../utils/formatters';
import { AITipCategory } from '../../types/monetization';

interface AITipsPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AITipsPdfExportModal: React.FC<AITipsPdfExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    creator,
    aiTips,
    aiSettings,
    totalGrossRevenue,
    averageTicket,
    products,
    affiliates,
    availableBalance,
  } = useMonetization();

  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const activeTips = aiTips.filter(
    (t) => !t.isDismissed && aiSettings.prioritizedTopics.includes(t.category)
  );

  const reportId = `REL-IA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const reportContext = {
    tips: activeTips,
    creator,
    aiSettings,
    stats: {
      totalGrossRevenue,
      averageTicket,
      activeProductsCount: products.filter((p) => p.isPublished).length,
      activeAffiliatesCount: affiliates.filter((a) => a.status === 'active').length,
      availableBalance,
    },
  };

  const handleDownload = () => {
    downloadAITipsPDF(reportContext);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const textLines = [
      `MONETIZAHUB • RESUMO ESTRATÉGICO DE IA (REVISÃO OFFLINE)`,
      `Protocolo: ${reportId} | Emissão: ${dateFormatted}`,
      `Criador: ${creator.name} (@${creator.handle})`,
      `Modelo: ${aiSettings.model} | Frequência: ${aiSettings.frequency}`,
      `Receita Bruta: ${formatBRL(totalGrossRevenue)} | Ticket Médio: ${formatBRL(averageTicket)}`,
      `--------------------------------------------------`,
      `SUGESTÕES ESTRATÉGICAS (${activeTips.length} ATIVAS):`,
      ...activeTips.map((tip, idx) => (
        `\n[#${idx + 1}] ${tip.title.toUpperCase()}\nCategoria: ${tip.category} | Impacto: ${tip.impact} | Projeção: ${tip.metricImpactEstimate}\nDiagnóstico: ${tip.description}\nAção Recomendada: ${tip.actionLabel}`
      )),
      `\n--------------------------------------------------`,
      `Espaço de anotações offline e plano de ação assinado por ${creator.name}.`,
    ].join('\n');

    navigator.clipboard.writeText(textLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative text-slate-200">
        {/* Modal Toolbar (Screen Only) */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Exportar Resumo Estratégico em PDF
                </h2>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 rounded border border-indigo-500/20">
                  Revisão Offline
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
                  PDF Vetorial
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gere um relatório executivo pronto para impressão ou revisão sem conexão com internet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition cursor-pointer"
              title="Copiar texto do resumo"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition cursor-pointer"
              title="Imprimir com o navegador"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-95"
              title="Baixar arquivo PDF nativo"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Baixar Arquivo PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="px-6 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 print:hidden animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Arquivo <strong>resumo_estrategico_ia_{creator.handle}.pdf</strong> baixado com sucesso!</span>
            </div>
            <span className="text-[10px] text-emerald-400">Pronto para leitura offline</span>
          </div>
        )}

        {/* Printable & Scrollable Report Preview */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-900/60 print:bg-white print:text-black print:p-0 print:m-0">
          {/* Printable Header */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 print:border-gray-300 print:bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 print:border-gray-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white print:bg-indigo-600">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-lg font-black text-white print:text-black tracking-tight">
                    Monetiza<span className="text-indigo-400 print:text-indigo-700">Hub</span>
                  </span>
                  <p className="text-xs text-slate-400 print:text-gray-600">
                    Copiloto de Inteligência Artificial • Relatório Estratégico Oficial
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right font-mono text-xs">
                <div className="text-white print:text-black font-bold">{reportId}</div>
                <div className="text-slate-400 print:text-gray-600">{dateFormatted}</div>
                <div className="text-emerald-400 print:text-emerald-700 font-semibold">
                  Auditoria Offline Válida
                </div>
              </div>
            </div>

            {/* Creator & Copilot Configuration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/80 print:bg-gray-50 p-4 rounded-xl border border-slate-800 print:border-gray-300 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 print:text-gray-500 uppercase tracking-wider font-semibold">
                  Criador de Conteúdo / Titular:
                </span>
                <div className="font-bold text-white print:text-black text-sm mt-0.5">{creator.name}</div>
                <div className="text-slate-300 print:text-gray-700">@{creator.handle} • {creator.category}</div>
                <div className="text-slate-400 print:text-gray-600">{creator.email}</div>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] text-slate-400 print:text-gray-500 uppercase tracking-wider font-semibold">
                  Configurações do Algoritmo:
                </span>
                <div className="text-indigo-400 print:text-indigo-700 font-bold mt-0.5">
                  Modelo: {aiSettings.model}
                </div>
                <div className="text-slate-300 print:text-gray-700">
                  Frequência: {aiSettings.frequency === 'daily' ? 'Diária (Recomendada)' : aiSettings.frequency === 'weekly' ? 'Semanal' : 'Em Tempo Real'}
                </div>
                <div className="text-[11px] text-emerald-400 print:text-emerald-700 font-medium">
                  {aiSettings.prioritizedTopics.length} Tópicos Prioritários Monitorados
                </div>
              </div>
            </div>

            {/* Business Context Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/90 print:bg-gray-100 border border-slate-800 print:border-gray-300">
                <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-sans">Receita Bruta</span>
                <div className="text-base font-extrabold text-emerald-400 print:text-emerald-700 mt-1 font-mono">
                  {formatBRL(totalGrossRevenue)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 print:bg-gray-100 border border-slate-800 print:border-gray-300">
                <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-sans">Ticket Médio</span>
                <div className="text-base font-extrabold text-blue-400 print:text-blue-700 mt-1 font-mono">
                  {formatBRL(averageTicket)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 print:bg-gray-100 border border-slate-800 print:border-gray-300">
                <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-sans">Catálogo Ativo</span>
                <div className="text-base font-extrabold text-purple-400 print:text-purple-700 mt-1 font-mono">
                  {products.filter((p) => p.isPublished).length} itens
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 print:bg-gray-100 border border-slate-800 print:border-gray-300">
                <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-sans">Afiliados Ativos</span>
                <div className="text-base font-extrabold text-amber-400 print:text-amber-700 mt-1 font-mono">
                  {affiliates.filter((a) => a.status === 'active').length} parceiros
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Suggestions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Sugestões Estratégicas para Revisão Offline ({activeTips.length} itens)
              </h3>
              <span className="text-xs text-slate-400 print:text-gray-600 font-mono">
                Impacto acumulado projetado: <strong className="text-emerald-400 print:text-emerald-700">+22% a +35%</strong>
              </span>
            </div>

            <div className="space-y-3">
              {activeTips.map((tip, idx) => {
                const badge = getCategoryBadge(tip.category);
                return (
                  <div
                    key={tip.id}
                    className="p-5 rounded-2xl bg-slate-950 print:bg-white border border-slate-800 print:border-gray-300 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 print:border-gray-200 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 print:bg-gray-200 px-2 py-0.5 rounded border border-slate-800 print:border-gray-300">
                          #{idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}>
                          {badge.label}
                        </span>
                        {tip.impact === 'critical' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Impacto Imediato
                          </span>
                        )}
                        {tip.impact === 'high' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Alto Impacto
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-mono font-bold text-emerald-400 print:text-emerald-700">
                        ⚡ Retorno Estimado: {tip.metricImpactEstimate}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white print:text-black">
                        {tip.title}
                      </h4>
                      <p className="text-xs text-slate-300 print:text-gray-700 mt-1 leading-relaxed">
                        {tip.description}
                      </p>
                    </div>

                    {/* Step-by-step Action plan */}
                    <div className="p-3 bg-slate-900/80 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-200 text-xs space-y-1">
                      <div className="font-bold text-slate-200 print:text-black flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ação Recomendada pela IA: {tip.actionLabel}</span>
                      </div>
                      <p className="text-slate-400 print:text-gray-600 text-[11px]">
                        Passos para execução: 1. Ajustar preço/condição no painel de produtos • 2. Disparar notificação por e-mail/push aos clientes cadastrados • 3. Monitorar taxa de conversão nas próximas 48h.
                      </p>
                    </div>

                    {/* Offline Checklist for Creator Review */}
                    <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 print:text-gray-600 border-t border-slate-800/60 print:border-gray-200">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" className="rounded border-slate-700 print:border-gray-400" />
                        <span>Aprovado para aplicar imediatamente</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" className="rounded border-slate-700 print:border-gray-400" />
                        <span>Ajustar parâmetros antes de executar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" className="rounded border-slate-700 print:border-gray-400" />
                        <span>Descartar / Postergar</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Notes & Signature Space */}
          <div className="p-5 rounded-2xl bg-slate-950 print:bg-white border border-slate-800 print:border-gray-300 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider">
              Anotações & Validação Estratégica do Criador (Offline)
            </h3>
            <div className="border border-dashed border-slate-700 print:border-gray-400 rounded-xl p-4 min-h-[90px] bg-slate-900/40 print:bg-gray-50 text-xs text-slate-500 print:text-gray-500">
              Espaço reservado para observações manuais durante reuniões, notas de alinhamento com equipe de marketing e metas de faturamento...
            </div>

            <div className="pt-3 border-t border-slate-800 print:border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 print:text-gray-600 gap-3">
              <div>
                Revisado por: <strong className="text-white print:text-black">{creator.name}</strong> (@{creator.handle})
              </div>
              <div>
                Data de Conclusão: __________________ &nbsp;&nbsp;&nbsp; Assinatura: __________________
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-2 text-center text-[10px] text-slate-500 print:text-gray-500 border-t border-slate-800 print:border-gray-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Documento confidencial gerado pelo Copiloto de IA MonetizaHub.</span>
            </div>
            <span>Página 1 de 1 • Imprimível em formato A4</span>
          </div>
        </div>

        {/* Modal Footer (Screen Only) */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Resumo 100% privado e acessível sem internet</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Fechar Visualização
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              <span>Baixar Relatório em PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
