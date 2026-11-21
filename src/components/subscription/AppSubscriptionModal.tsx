import React, { useState } from 'react';
import {
  X,
  Crown,
  CheckCircle2,
  Sparkles,
  Zap,
  CreditCard,
  ShieldCheck,
  Calendar,
  Receipt,
  Download,
  AlertCircle,
  HelpCircle,
  Check,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { AppBillingCycle, AppSubscriptionTier, PaymentMethod } from '../../types/monetization';
import { formatCurrency } from '../../utils/formatters';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

interface AppSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSubscriptionModal: React.FC<AppSubscriptionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    appSubscription,
    subscribeToAppPlan,
    cancelAppSubscription,
    changeAppSubscriptionCycle,
    creator,
    selectedCurrency,
  } = useMonetization();

  const [selectedCycle, setSelectedCycle] = useState<AppBillingCycle>(
    appSubscription?.billingCycle || 'annual'
  );
  const [selectedTier, setSelectedTier] = useState<AppSubscriptionTier>('pro');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSubscribed = appSubscription && appSubscription.status === 'active';

  const handleSubscribe = (tier: AppSubscriptionTier) => {
    const res = subscribeToAppPlan({
      tier,
      billingCycle: selectedCycle,
      paymentMethod: selectedPaymentMethod,
      cardLast4: creator.savedVisaCard?.last4 || '4829',
    });
    if (res.success) {
      setSuccessNotice(res.message);
      setTimeout(() => setSuccessNotice(null), 6000);
    }
  };

  const handleToggleAutoRenew = () => {
    if (appSubscription.renewsAutomatically) {
      cancelAppSubscription();
      setSuccessNotice('A renovação automática foi cancelada. Seu plano continuará ativo até o final do período vigente.');
      setTimeout(() => setSuccessNotice(null), 5000);
    } else {
      subscribeToAppPlan({
        tier: appSubscription.tier,
        billingCycle: appSubscription.billingCycle,
        paymentMethod: appSubscription.paymentMethod,
        cardLast4: appSubscription.savedCardLast4,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Assinatura MonetizaHub Pro & Ultra
                </h2>
                <ModalityFeeTooltip
                  modality="in_app_purchase"
                  triggerLabel="Benefício nas taxas"
                  tone="amber"
                />
                {isSubscribed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Plano {appSubscription.tier.toUpperCase()} Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Desbloqueie acesso completo aos recursos premium e experiência 100% livre de anúncios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Success Notice */}
          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successNotice}</span>
              </div>
              <button onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-emerald-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Billing Cycle Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setSelectedCycle('monthly')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCycle === 'monthly'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Faturamento Mensal
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle('annual')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedCycle === 'annual'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Anual (32% OFF)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-amber-300 font-mono">
                2 Meses Grátis
              </span>
            </button>
          </div>

          {/* Subscription Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* PLAN 1: MONETIZAHUB PRO */}
            <div
              className={`rounded-2xl p-5 border transition flex flex-col justify-between relative ${
                isSubscribed && appSubscription.tier === 'pro'
                  ? 'bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Mais Popular
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">MonetizaHub Pro</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white font-mono">
                      {selectedCycle === 'annual'
                        ? formatCurrency(399.0, selectedCurrency)
                        : formatCurrency(49.0, selectedCurrency)}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {selectedCycle === 'annual' ? 'cobrado anualmente (R$ 33,25/mês)' : 'cobrado mensalmente'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Ideal para criadores em crescimento que desejam remover anúncios, zerar taxas de saque e turbinar conversão com IA.
                </p>

                {/* Benefits Checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>100% Livre de Anúncios:</strong> Sem anúncios intersticiais ou banners</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Taxa de Saque 0%:</strong> Repasse integral no Cartão Visa e Pix</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Copiloto de IA Ilimitado:</strong> Recomendações de preços e conversão</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Vitrine Whitelabel:</strong> Remova a marca da plataforma</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Análise de Usuário:</strong> Funis, coortes e pontos de oferta ideais</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Selo Criador Verificado Pro</strong> na vitrine e perfil</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-800">
                {isSubscribed && appSubscription.tier === 'pro' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-xl bg-slate-800 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Seu Plano Atual Ativo</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubscribe('pro')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                  >
                    Assinar MonetizaHub Pro ({selectedCycle === 'annual' ? 'Anual' : 'Mensal'})
                  </button>
                )}
              </div>
            </div>

            {/* PLAN 2: MONETIZAHUB ULTRA VIP */}
            <div
              className={`rounded-2xl p-5 border transition flex flex-col justify-between relative ${
                isSubscribed && appSubscription.tier === 'ultra'
                  ? 'bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      Escala Total
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">MonetizaHub Ultra VIP</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-indigo-300 font-mono">
                      {selectedCycle === 'annual'
                        ? formatCurrency(749.0, selectedCurrency)
                        : formatCurrency(89.0, selectedCurrency)}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {selectedCycle === 'annual' ? 'cobrado anualmente (R$ 62,40/mês)' : 'cobrado mensalmente'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Para criadores de alto faturamento que necessitam de acompanhamento executivo, consultoria 1 a 1 e prioridade máxima de liquidação.
                </p>

                {/* Benefits Checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Todos os benefícios do Plano Pro inclusos</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Consultoria Mensal 1 a 1:</strong> Análise de funis e estratégia via Google Meet</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Gerente de Conta VIP 24/7</strong> dedicado no WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Esteira Prioritária Visa Direct:</strong> Liquidação em até 60 segundos</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Acesso Antecipado:</strong> Beta de novos recursos e integrações</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-800">
                {isSubscribed && appSubscription.tier === 'ultra' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-xl bg-slate-800 text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Seu Plano Atual Ativo</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubscribe('ultra')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                  >
                    Assinar MonetizaHub Ultra ({selectedCycle === 'annual' ? 'Anual' : 'Mensal'})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SUBSCRIPTION MANAGEMENT CENTER */}
          {isSubscribed && (
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Gerenciamento da Sua Assinatura</span>
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  Renovação automática:{' '}
                  <strong className={appSubscription.renewsAutomatically ? 'text-emerald-400' : 'text-amber-400'}>
                    {appSubscription.renewsAutomatically ? 'Ativada' : 'Pausada'}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Plano & Ciclo</span>
                  <div className="font-bold text-white mt-0.5">
                    {appSubscription.tier.toUpperCase()} ({appSubscription.billingCycle === 'annual' ? 'Anual' : 'Mensal'})
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Cartão de Cobrança</span>
                  <div className="font-bold text-blue-400 font-mono mt-0.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Visa •••• {appSubscription.savedCardLast4 || '4829'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Próxima Renovação</span>
                  <div className="font-bold text-slate-200 font-mono mt-0.5">
                    {new Date(appSubscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Management Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={handleToggleAutoRenew}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold transition cursor-pointer"
                >
                  {appSubscription.renewsAutomatically ? 'Cancelar Renovação Automática' : 'Reativar Renovação Automática'}
                </button>

                <div className="text-[11px] text-slate-400">
                  Precisa de suporte com a fatura? Contate nosso time 24/7.
                </div>
              </div>

              {/* Invoice & Receipts History */}
              <div className="pt-3 border-t border-slate-800/80">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Histórico de Faturas & Recibos Fiscais
                </h5>
                <div className="divide-y divide-slate-800 border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/40 text-xs">
                  {appSubscription.invoices.map((inv) => (
                    <div key={inv.id} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">{inv.planName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {inv.receiptNumber} • {inv.date}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400">
                          {formatCurrency(inv.amount, selectedCurrency)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Pago
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Garantia de 7 dias ou seu dinheiro de volta. Cancele quando quiser sem multas.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
