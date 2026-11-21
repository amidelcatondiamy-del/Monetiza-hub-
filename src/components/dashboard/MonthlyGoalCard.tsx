import React, { useState } from 'react';
import {
  Target,
  Heart,
  Share2,
  Settings,
  Sparkles,
  CheckCircle2,
  Clock,
  Users,
  Gift,
  Copy,
  Check,
  Calendar,
  X,
  TrendingUp,
  DollarSign,
  Zap,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL, formatCurrency } from '../../utils/formatters';

interface MonthlyGoalCardProps {
  onNavigateTab?: (tab: string) => void;
}

export const MonthlyGoalCard: React.FC<MonthlyGoalCardProps> = ({ onNavigateTab }) => {
  const {
    tipGoal,
    updateTipGoal,
    contributeToGoal,
    selectedCurrency,
    creator,
  } = useMonetization();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customPledgeAmount, setCustomPledgeAmount] = useState<string>('50');
  const [customSupporterName, setCustomSupporterName] = useState<string>('');
  const [showPledgeForm, setShowPledgeForm] = useState(false);

  // Edit Goal Form State
  const [editTitle, setEditTitle] = useState(tipGoal.title);
  const [editTargetAmount, setEditTargetAmount] = useState(tipGoal.targetAmount.toString());
  const [editMonthReference, setEditMonthReference] = useState(tipGoal.monthReference || 'Novembro de 2026');
  const [editDeadline, setEditDeadline] = useState(tipGoal.deadline || '2026-11-30');
  const [editReward, setEditReward] = useState(tipGoal.rewardDescription);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculate Progress
  const target = Math.max(1, tipGoal.targetAmount);
  const current = tipGoal.currentAmount;
  const progressPercent = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);
  const supporters = tipGoal.supportersCount || 48;

  // Calculate days remaining
  const calculateDaysLeft = () => {
    if (!tipGoal.deadline) return 14;
    const diff = new Date(tipGoal.deadline).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };
  const daysLeft = calculateDaysLeft();

  const handleOpenEdit = () => {
    setEditTitle(tipGoal.title);
    setEditTargetAmount(tipGoal.targetAmount.toString());
    setEditMonthReference(tipGoal.monthReference || 'Novembro de 2026');
    setEditDeadline(tipGoal.deadline || '2026-11-30');
    setEditReward(tipGoal.rewardDescription);
    setIsEditModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = Math.max(100, parseFloat(editTargetAmount) || 5000);
    updateTipGoal({
      title: editTitle.trim() || 'Meta Mensal de Arrecadação',
      targetAmount: parsedTarget,
      monthReference: editMonthReference.trim() || 'Novembro de 2026',
      deadline: editDeadline,
      rewardDescription: editReward.trim() || 'Recompensa especial liberada para toda a comunidade!',
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditModalOpen(false);
    }, 900);
  };

  const handleQuickContribution = (amount: number, name?: string) => {
    const supporterName = name || (creator.name ? `Seguidor fã de ${creator.name.split(' ')[0]}` : 'Seguidor Apoiador');
    contributeToGoal(amount, supporterName, `Contribuição rápida de ${formatCurrency(amount, selectedCurrency)} para ajudar a bater a meta!`);
  };

  const handleCopyLink = () => {
    const goalUrl = `https://monetizahub.com.br/@${creator.handle || 'amidelcatondi'}/meta-mensal`;
    navigator.clipboard?.writeText(goalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎯 Ajude a bater a ${tipGoal.title}! Já alcançamos ${progressPercent}% do objetivo. Acesse e apoie: https://monetizahub.com.br/@${creator.handle || 'amidelcatondi'}/meta-mensal`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Milestones definition
  const milestones = [
    { percent: 25, label: '25% - Início', unlocked: progressPercent >= 25 },
    { percent: 50, label: '50% - Meio', unlocked: progressPercent >= 50 },
    { percent: 75, label: '75% - Reta Final', unlocked: progressPercent >= 75 },
    { percent: 100, label: '100% - Meta Batida!', unlocked: progressPercent >= 100 },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Decorative Glow Background */}
      <div className="absolute -right-20 -top-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <Target className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Meta de Arrecadação Mensal
            </span>
            <span className="text-[11px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-700/60 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>{tipGoal.monthReference || 'Novembro de 2026'}</span>
            </span>
            {progressPercent >= 100 ? (
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Meta Conquistada!</span>
              </span>
            ) : (
              <span className="text-[11px] bg-amber-500/10 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
                Ativa no Perfil
              </span>
            )}
          </div>

          <h2 className="text-lg font-extrabold text-white tracking-tight mt-1">
            {tipGoal.title}
          </h2>
          <p className="text-xs text-slate-400">
            Campanha oficial de financiamento coletivo e apoio dos seguidores de <strong className="text-slate-200">{creator.name}</strong>.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition cursor-pointer"
            title="Copiar link da meta para divulgar nas redes sociais"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
            title="Compartilhar meta diretamente no WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Divulgar no WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleOpenEdit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-md shadow-amber-500/20"
            title="Definir novo valor alvo, título ou recompensa da meta"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Definir / Editar Meta</span>
          </button>
        </div>
      </div>

      {/* Progress Numbers & Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-5">
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Total Arrecadado</span>
          <div className="text-xl font-black text-emerald-400 font-mono tabular-nums mt-0.5">
            {formatCurrency(current, selectedCurrency)}
          </div>
          <span className="text-[10px] text-slate-500">De seguidores e apoiadores</span>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Valor Alvo</span>
          <div className="text-xl font-black text-white font-mono tabular-nums mt-0.5">
            {formatCurrency(target, selectedCurrency)}
          </div>
          <span className="text-[10px] text-slate-500">Objetivo para o mês</span>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Falta Arrecadar</span>
          <div className="text-xl font-black text-amber-400 font-mono tabular-nums mt-0.5">
            {formatCurrency(remaining, selectedCurrency)}
          </div>
          <span className="text-[10px] text-slate-500">{progressPercent}% já garantido</span>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Engajamento Comunitário</span>
          <div className="text-xl font-black text-indigo-400 font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>{supporters}</span>
          </div>
          <span className="text-[10px] text-slate-500">{daysLeft} dias restantes para encerrar</span>
        </div>
      </div>

      {/* Main Visual Progress Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base font-mono">
              {progressPercent}%
            </span>
            <span className="text-slate-400 font-medium">da meta alcançada</span>
          </div>
          <div className="text-right text-xs font-mono">
            {remaining > 0 ? (
              <span className="text-amber-400 font-semibold">
                Faltam apenas {formatCurrency(remaining, selectedCurrency)}
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">
                🎉 Objetivo superado com sucesso!
              </span>
            )}
          </div>
        </div>

        {/* Enhanced Progress Track with dynamic glow */}
        <div className="relative w-full bg-slate-950 h-5 rounded-full p-1 border border-slate-700/80 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 rounded-full transition-all duration-700 ease-out relative shadow-[0_0_12px_rgba(52,211,153,0.4)]"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Beacon dot */}
            {progressPercent > 3 && (
              <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md animate-ping" />
            )}
          </div>
        </div>

        {/* Milestone Badges on Track */}
        <div className="grid grid-cols-4 gap-1 pt-1 text-[11px] font-mono">
          {milestones.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1 text-[10px] ${
                m.unlocked ? 'text-emerald-400 font-bold' : 'text-slate-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${m.unlocked ? 'bg-emerald-400' : 'bg-slate-700'}`} />
              <span className="truncate">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reward Card: Collective Incentive */}
      <div className="mt-5 p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Recompensa Prometida aos Seguidores</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                Incentivo Coletivo
              </span>
            </div>
            <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
              {tipGoal.rewardDescription}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenEdit}
          className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0 self-start sm:self-center font-medium cursor-pointer"
        >
          Editar Recompensa
        </button>
      </div>

      {/* Follower Engagement Section: Direct Quick Contributions */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
              <span>Incentivar Apoio de Seguidores (Contribuições Imediatas)</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Teste ou registre apoios Pix para ver a barra de progresso avançar instantaneamente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPledgeForm(!showPledgeForm)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold self-start sm:self-auto cursor-pointer"
          >
            {showPledgeForm ? 'Ocultar Opções Personalizadas' : '+ Contribuição Personalizada'}
          </button>
        </div>

        {/* Quick buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[15, 25, 50, 100, 250].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickContribution(val)}
              className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer group shadow-sm active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:text-emerald-400" />
              <span>+ {formatCurrency(val, selectedCurrency)}</span>
            </button>
          ))}
        </div>

        {/* Expandable Custom Contribution form */}
        {showPledgeForm && (
          <div className="mt-3 p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-2.5 animate-fadeIn">
            <div className="w-full sm:w-1/3">
              <label className="block text-[10px] text-slate-400 mb-1">Nome do Apoiador:</label>
              <input
                type="text"
                value={customSupporterName}
                onChange={(e) => setCustomSupporterName(e.target.value)}
                placeholder="Ex: Carlos Oliveira"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="w-full sm:w-1/3">
              <label className="block text-[10px] text-slate-400 mb-1">Valor do Apoio (R$):</label>
              <input
                type="number"
                min="5"
                value={customPledgeAmount}
                onChange={(e) => setCustomPledgeAmount(e.target.value)}
                placeholder="50"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="w-full sm:w-1/3 self-end">
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(customPledgeAmount) || 25;
                  handleQuickContribution(val, customSupporterName.trim() || undefined);
                  setCustomSupporterName('');
                }}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Registrar Apoio Pix</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Definir / Editar Meta Mensal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Target className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Definir Meta de Arrecadação Mensal
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure o objetivo que será exibido no seu painel e na vitrine dos seguidores.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título da Meta / Objetivo
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ex: Meta de Novembro: Novo Setup 4K & Mentoria Aberta"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mês de Referência
                  </label>
                  <input
                    type="text"
                    required
                    value={editMonthReference}
                    onChange={(e) => setEditMonthReference(e.target.value)}
                    placeholder="Ex: Novembro de 2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data Limite (Prazo)
                  </label>
                  <input
                    type="date"
                    required
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Target Amount Presets & Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor Alvo Desejado (R$)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[2500, 5000, 10000, 20000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditTargetAmount(preset.toString())}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition ${
                        parseFloat(editTargetAmount) === preset
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      R$ {preset.toLocaleString('pt-BR')}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-xs text-slate-500 font-mono">R$</span>
                  <input
                    type="number"
                    min="100"
                    required
                    value={editTargetAmount}
                    onChange={(e) => setEditTargetAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Reward description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recompensa Prometida aos Apoiadores (Gatilho de Conversão)
                </label>
                <textarea
                  rows={3}
                  required
                  value={editReward}
                  onChange={(e) => setEditReward(e.target.value)}
                  placeholder="Ex: Quando batermos a meta, farei uma Masterclass gratuita ao vivo de 3 horas para todos os apoiadores!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Metas com recompensas claras convertem até 3,4x mais contribuições de seguidores.
                </span>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Meta Salva com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" />
                      <span>Salvar Meta Mensal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
