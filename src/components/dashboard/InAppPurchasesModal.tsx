import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Award,
  CheckCircle2,
  CreditCard,
  QrCode,
  Lock,
  ArrowRight,
  Check,
  Smartphone,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency } from '../../utils/formatters';
import { InAppFeature, PaymentMethod } from '../../types/monetization';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

interface InAppPurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InAppPurchasesModal: React.FC<InAppPurchasesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    inAppFeatures,
    purchasedFeatureIds,
    purchaseInAppFeature,
    selectedCurrency,
    creator,
  } = useMonetization();

  const [selectedFeature, setSelectedFeature] = useState<InAppFeature | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSelectFeature = (feature: InAppFeature) => {
    setSelectedFeature(feature);
    setFeedbackMessage(null);
  };

  const handleCompletePurchase = () => {
    if (!selectedFeature) return;

    setIsProcessing(true);
    setFeedbackMessage(null);

    setTimeout(() => {
      const res = purchaseInAppFeature(selectedFeature.id, paymentMethod);
      setIsProcessing(false);
      if (res.success) {
        setFeedbackMessage({ type: 'success', text: res.message });
      } else {
        setFeedbackMessage({ type: 'error', text: res.message });
      }
    }, 600);
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Award':
        return <Award className="w-5 h-5 text-yellow-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Compras no Aplicativo & Recursos Pro</span>
                <ModalityFeeTooltip
                  modality="in_app_purchase"
                  sampleAmountBRL={selectedFeature?.price || 49.9}
                  paymentMethodHint={paymentMethod}
                  triggerLabel="Taxas In-App"
                  tone="amber"
                />
              </h2>
              <p className="text-xs text-slate-400">
                Desbloqueie ferramentas avançadas para turbinar as vendas de {creator.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* How to access and buy instructions */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Como acessar e concluir uma compra no aplicativo:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Selecione o recurso desejado abaixo (Remover Anúncios, Suíte Pro ou Selo VIP).</li>
              <li>Escolha a forma de pagamento (Cartão Visa salvo ou Pix instantâneo).</li>
              <li>Clique em <strong>"Concluir Compra no App"</strong> para ativar o recurso imediatamente na sua conta.</li>
            </ol>
          </div>

          {/* Feedback Banner */}
          {feedbackMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* Feature List */}
          <div className="grid grid-cols-1 gap-3.5">
            {inAppFeatures.map((feature) => {
              const isPurchased = purchasedFeatureIds.includes(feature.id);
              const isSelected = selectedFeature?.id === feature.id;

              return (
                <div
                  key={feature.id}
                  onClick={() => !isPurchased && handleSelectFeature(feature)}
                  className={`p-4 rounded-2xl border transition text-left relative ${
                    isPurchased
                      ? 'bg-slate-950/40 border-emerald-500/40 opacity-90'
                      : isSelected
                      ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-amber-500 shadow-lg shadow-amber-500/10 cursor-pointer'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                        {renderIcon(feature.iconName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-sm">
                            {feature.title}
                          </h3>
                          {feature.badge && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {feature.badge}
                            </span>
                          )}
                          {isPurchased && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Ativo no App
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {feature.description}
                        </p>

                        <ul className="mt-2.5 space-y-1">
                          {feature.features.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-[11px] text-slate-300 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-white font-mono">
                        {formatCurrency(feature.price, selectedCurrency)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {feature.periodLabel}
                      </div>

                      {isPurchased ? (
                        <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                          <span>Instalado</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFeature(feature);
                          }}
                          className={`mt-2 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isSelected ? 'Selecionado' : 'Comprar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Drawer when item selected */}
          {selectedFeature && !purchasedFeatureIds.includes(selectedFeature.id) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-amber-500/40 space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Finalizar Compra
                  </span>
                  <div className="text-sm font-extrabold text-white">
                    {selectedFeature.title} — {formatCurrency(selectedFeature.price, selectedCurrency)}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  Cartão Visa ou Pix
                </div>
              </div>

              {/* Payment selector - Stripe, PayPal, Visa Direct, Pix */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-2">
                  Selecione o Gateway de Pagamento Seguro:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold transition cursor-pointer text-center ${
                      paymentMethod === 'credit_card'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] text-slate-300 font-medium">Cartão Visa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('multicaixa')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold transition cursor-pointer text-center ${
                      paymentMethod === 'multicaixa'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] text-slate-300 font-medium">Express (AO)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold transition cursor-pointer text-center ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] text-slate-300 font-medium">PIX Banco Central</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold transition cursor-pointer text-center ${
                      paymentMethod === 'stripe'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-black text-xs text-indigo-400 tracking-wider">
                      <span>stripe</span>
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium">Stripe Global</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold transition cursor-pointer text-center ${
                      paymentMethod === 'paypal'
                        ? 'bg-sky-600/20 border-sky-500 text-sky-300 ring-1 ring-sky-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-black text-xs text-sky-400">
                      <span>PayPal</span>
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium">PayPal</span>
                  </button>
                </div>
              </div>

              {/* Multicaixa Express phone notification banner */}
              {paymentMethod === 'multicaixa' && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-500/30 flex items-center justify-between text-[11px] animate-fadeIn">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Autorização enviada via push para o Multicaixa Express (923 456 789).</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-semibold">
                    EMIS Angola OK
                  </span>
                </div>
              )}


              {/* Stripe encrypted card mock fields */}
              {paymentMethod === 'stripe' && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-indigo-500/30 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Criptografia Stripe Elements (256-bit AES)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Token: tok_1N8x...99v</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        readOnly
                        value="•••• •••• •••• 4829"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        readOnly
                        value="CVC •••"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PayPal protection banner */}
              {paymentMethod === 'paypal' && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-sky-500/30 flex items-center justify-between text-[11px] animate-fadeIn">
                  <div className="flex items-center gap-2 text-sky-300">
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Conectado à conta PayPal (amidelcatondiamy@gmail.com)</span>
                  </div>
                  <span className="text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded font-semibold">
                    Proteção ao Comprador
                  </span>
                </div>
              )}

              {/* Security guarantee line */}
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Dados de pagamento 100% criptografados em trânsito e em repouso (PCI-DSS Nível 1).</span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleCompletePurchase}
                disabled={isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Processando Compra Segura...</span>
                ) : (
                  <>
                    <span>
                      Pagar {formatCurrency(selectedFeature.price, selectedCurrency)} via{' '}
                      {paymentMethod === 'stripe'
                        ? 'Stripe'
                        : paymentMethod === 'paypal'
                        ? 'PayPal'
                        : paymentMethod === 'pix'
                        ? 'Pix'
                        : 'Visa Direct'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Transação segura e criptografada com garantia de 7 dias</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
