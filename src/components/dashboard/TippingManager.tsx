import React, { useState } from 'react';
import {
  Heart,
  Target,
  Gift,
  CheckCircle2,
  Edit2,
  Sparkles,
  QrCode,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL, formatDate } from '../../utils/formatters';
import { DailyGoalCard } from './DailyGoalCard';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

interface TippingManagerProps {
  onTestTipCheckout: () => void;
}

export const TippingManager: React.FC<TippingManagerProps> = ({ onTestTipCheckout }) => {
  const { tipGoal, updateTipGoal, transactions, creator } = useMonetization();

  const [isEditing, setIsEditing] = useState(false);
  const [goalTitle, setGoalTitle] = useState(tipGoal.title);
  const [goalTarget, setGoalTarget] = useState(tipGoal.targetAmount.toString());
  const [goalReward, setGoalReward] = useState(tipGoal.rewardDescription);

  const goalPercent = Math.min(
    100,
    Math.round((tipGoal.currentAmount / tipGoal.targetAmount) * 100)
  );

  // Tips list
  const recentTips = transactions.filter((t) => t.type === 'tip');

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    updateTipGoal({
      title: goalTitle,
      targetAmount: parseFloat(goalTarget) || 1000,
      rewardDescription: goalReward,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Apoio Direto, Gorjetas Pix & Metas
            </h2>
            <span className="text-xs bg-amber-500/10 text-amber-400 font-semibold px-2 py-0.5 rounded-md border border-amber-500/20">
              Taxa Reduzida
            </span>
            <ModalityFeeTooltip
              modality="tip"
              sampleAmountBRL={25}
              paymentMethodHint="pix"
              triggerLabel="Detalhes da taxa Pix"
              tone="amber"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Receba doações espontâneas da sua audiência estilo "Buy Me a Coffee", creditadas diretamente no seu Cartão Visa{' '}
            <strong className="text-blue-400 font-mono">•••• {creator.savedVisaCard?.last4 || '4829'}</strong>.
          </p>
        </div>

        <button
          onClick={onTestTipCheckout}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition cursor-pointer self-start sm:self-auto"
        >
          <Heart className="w-4 h-4 fill-current" />
          <span>Testar Envio de Gorjeta</span>
        </button>
      </div>

      {/* Daily Financial Goal Selector & Bar Chart */}
      <DailyGoalCard />

      {/* Goal Card with Dynamic Progress Bar */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Meta Comunitária de Arrecadação
              </span>
              <h3 className="text-base font-bold text-white">{tipGoal.title}</h3>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Fechar Edição' : 'Editar Meta'}</span>
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveGoal} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Título da Meta</label>
              <input
                type="text"
                required
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Alvo (R$)</label>
                <input
                  type="number"
                  step="10"
                  required
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Recompensa ao Bater 100%</label>
                <input
                  type="text"
                  required
                  value={goalReward}
                  onChange={(e) => setGoalReward(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg"
              >
                Salvar Meta
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">
                Progresso:{' '}
                <strong className="text-white font-mono">{formatBRL(tipGoal.currentAmount)}</strong> de{' '}
                <strong className="text-slate-300 font-mono">{formatBRL(tipGoal.targetAmount)}</strong>
              </span>
              <span className="font-bold text-amber-400 font-mono">{goalPercent}%</span>
            </div>

            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              />
            </div>

            <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Recompensa:</strong> {tipGoal.rewardDescription}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Wall of Supporters */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span>Mural de Apoiadores & Mensagens</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{recentTips.length} apoios recebidos</span>
        </div>

        <div className="space-y-3">
          {recentTips.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Nenhum apoio recebido ainda.</p>
          ) : (
            recentTips.map((tip) => (
              <div
                key={tip.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{tip.customerName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatDate(tip.createdAt)}
                    </span>
                  </div>
                  {tip.message && (
                    <p className="text-xs text-slate-300 italic">"{tip.message}"</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-black text-amber-400 font-mono">
                    + {formatBRL(tip.grossAmount)}
                  </span>
                  <div className="text-[10px] text-emerald-400 font-semibold">Pix Confirmado</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
