import React, { useState } from 'react';
import {
  Users,
  Plus,
  Check,
  Star,
  Edit2,
  Trash2,
  Shield,
  Zap,
  TrendingUp,
  X,
  CreditCard,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL } from '../../utils/formatters';
import { SubscriptionTier } from '../../types/monetization';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

interface SubscriptionsManagerProps {
  onTestSubscriptionCheckout: (tier: SubscriptionTier) => void;
}

export const SubscriptionsManager: React.FC<SubscriptionsManagerProps> = ({
  onTestSubscriptionCheckout,
}) => {
  const { tiers, updateTier, addTier, deleteTier, mrr, totalMembersCount, creator } = useMonetization();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('49.90');
  const [yearlyPrice, setYearlyPrice] = useState('499.00');
  const [badge, setBadge] = useState('Membro VIP');
  const [perksText, setPerksText] = useState('Acesso a lives semanais\nGrupo privado no Telegram\nDesconto de 20% em produtos');
  const [popular, setPopular] = useState(false);

  const handleOpenNew = () => {
    setEditingTierId(null);
    setName('');
    setTagline('');
    setMonthlyPrice('49.90');
    setYearlyPrice('499.00');
    setBadge('Membro VIP');
    setPerksText('Acesso a lives semanais\nGrupo privado no Telegram\nDesconto de 20% em produtos');
    setPopular(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: SubscriptionTier) => {
    setEditingTierId(t.id);
    setName(t.name);
    setTagline(t.tagline);
    setMonthlyPrice(t.monthlyPrice.toString());
    setYearlyPrice(t.yearlyPrice.toString());
    setBadge(t.badge);
    setPerksText(t.perks.join('\n'));
    setPopular(!!t.popular);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const perks = perksText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    if (editingTierId) {
      updateTier(editingTierId, {
        name,
        tagline,
        monthlyPrice: parseFloat(monthlyPrice) || 0,
        yearlyPrice: parseFloat(yearlyPrice) || 0,
        badge,
        perks,
        popular,
      });
    } else {
      addTier({
        name,
        tagline,
        monthlyPrice: parseFloat(monthlyPrice) || 0,
        yearlyPrice: parseFloat(yearlyPrice) || 0,
        color: 'from-emerald-500 to-teal-700',
        badge,
        perks,
        popular,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with MRR Highlights & Visa Payout Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Clube de Assinaturas Recorrentes (MRR)
            </h2>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded-md border border-indigo-500/20">
              Receita Mensal Previsível
            </span>
            <ModalityFeeTooltip
              modality="subscription"
              triggerLabel="Taxas da assinatura"
              tone="indigo"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gere receita recorrente todo mês. Ganhos transferidos diretamente para o seu Cartão Visa{' '}
            <strong className="text-blue-400 font-mono">•••• {creator.savedVisaCard?.last4 || '4829'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              MRR Consolidado
            </div>
            <div className="text-xl font-black text-indigo-400 font-mono tabular-nums">
              {formatBRL(mrr)}
              <span className="text-xs text-slate-400 font-normal">/mês</span>
            </div>
          </div>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Nível VIP</span>
          </button>
        </div>
      </div>

      {/* Subscription Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((tier) => {
          const tierMRR = tier.monthlyPrice * tier.activeMembers;

          return (
            <div
              key={tier.id}
              className={`bg-slate-900/90 rounded-2xl border flex flex-col justify-between overflow-hidden transition relative ${
                tier.popular
                  ? 'border-emerald-500/60 shadow-xl shadow-emerald-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {tier.popular && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-[10px] uppercase tracking-wider py-1 text-center">
                  Mais Popular da Comunidade
                </div>
              )}

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {tier.badge}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(tier)}
                      className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {tiers.length > 1 && (
                      <button
                        onClick={() => deleteTier(tier.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{tier.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{tier.tagline}</p>
                </div>

                {/* Price */}
                <div className="pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-2xl font-black text-white font-mono tabular-nums">
                      {formatBRL(tier.monthlyPrice)}
                      <span className="text-xs font-normal text-slate-400"> /mês</span>
                    </div>
                    <ModalityFeeTooltip
                      modality="subscription"
                      sampleAmountBRL={tier.monthlyPrice}
                      iconOnly
                      tone="indigo"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    ou {formatBRL(tier.yearlyPrice)} cobrado anualmente
                  </div>
                </div>

                {/* Stats */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex justify-between font-mono">
                  <span className="text-slate-400">Assinantes Ativos:</span>
                  <strong className="text-white">{tier.activeMembers} membros</strong>
                </div>

                {/* Perks list */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Benefícios Inclusos:
                  </div>
                  {tier.perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="p-4 bg-slate-950/70 border-t border-slate-800">
                <button
                  onClick={() => onTestSubscriptionCheckout(tier)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Testar Assinatura VIP</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-slate-200">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingTierId ? 'Editar Plano de Assinatura' : 'Criar Novo Plano VIP'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Comunidade VIP & Mastermind"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Slogan / Descrição Curta
                </label>
                <input
                  type="text"
                  required
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Ex: Para criadores que desejam atingir múltiplos 5 dígitos."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço Anual com Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={yearlyPrice}
                    onChange={(e) => setYearlyPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Benefícios (um por linha)
                </label>
                <textarea
                  rows={4}
                  required
                  value={perksText}
                  onChange={(e) => setPerksText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="popularCheck"
                  checked={popular}
                  onChange={(e) => setPopular(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="popularCheck" className="text-xs text-slate-300">
                  Destacar como Plano Mais Popular
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                >
                  Salvar Nível
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
