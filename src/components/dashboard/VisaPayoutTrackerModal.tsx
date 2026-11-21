import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Copy,
  Check,
  Building,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface VisaPayoutTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupport: () => void;
}

export const VisaPayoutTrackerModal: React.FC<VisaPayoutTrackerModalProps> = ({
  isOpen,
  onClose,
  onOpenSupport,
}) => {
  const {
    withdrawals,
    settleVisaWithdrawalNow,
    selectedCurrency,
    creator,
  } = useMonetization();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  // Find the latest Visa withdrawal, or fallback to the first completed one
  const visaWithdrawal = withdrawals.find((w) => w.destinationType === 'visa_card') || withdrawals[0];

  const isAlreadySettled = visaWithdrawal?.status === 'completed' && visaWithdrawal?.visaDetails?.settlementStatus === 'credited';

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAccelerateSettlement = () => {
    if (!visaWithdrawal) return;
    setIsAccelerating(true);
    setSuccessBanner(null);

    setTimeout(() => {
      const res = settleVisaWithdrawalNow(visaWithdrawal.id);
      setIsAccelerating(false);
      setSuccessBanner(res.message);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Rastreador de Saque Visa Direct</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Visa Direct
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditoria e acompanhamento em tempo real do depósito no seu cartão
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
          {/* Success Banner */}
          {successBanner && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* Transfer Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Valor Solicitado para Saque
                </span>
                <div className="text-2xl font-black text-white font-mono">
                  {formatCurrency(visaWithdrawal?.amount || 1850.0, selectedCurrency)}
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isAlreadySettled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isAlreadySettled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Liquidado no Cartão</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span>Em Compensação Bancária</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Cartão de Destino:</span>
                <div className="font-mono font-bold text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>•••• •••• •••• {creator.savedVisaCard?.last4 || '4829'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">Titular do Cartão:</span>
                <div className="font-bold text-slate-200 mt-0.5 uppercase">
                  {creator.savedVisaCard?.holderName || 'AMIDEL CATONDI'}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">Código de Autorização Visa:</span>
                <div className="font-mono text-emerald-400 font-bold text-[11px] flex items-center gap-1 mt-0.5">
                  <span>{visaWithdrawal?.visaDetails?.authorizationCode || 'AUTH-VISA-984210'}</span>
                  <button
                    onClick={() => handleCopy(visaWithdrawal?.visaDetails?.authorizationCode || 'AUTH-VISA-984210', 'auth')}
                    className="hover:text-white"
                  >
                    {copiedField === 'auth' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">Protocolo ARN da Rede:</span>
                <div className="font-mono text-slate-300 text-[11px] flex items-center gap-1 mt-0.5">
                  <span>{visaWithdrawal?.visaDetails?.networkReference || 'ARN-VISA-984210-BR4829'}</span>
                  <button
                    onClick={() => handleCopy(visaWithdrawal?.visaDetails?.networkReference || 'ARN-VISA-984210-BR4829', 'arn')}
                    className="hover:text-white"
                  >
                    {copiedField === 'arn' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Step Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Etapas da Transferência Bancária:
            </h4>

            <div className="space-y-2.5">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border border-emerald-500/30">
                <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">1. Solicitação de Saque Emitida</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Concluído</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    O MonetizaHub registrou o pedido de saque para o Cartão Visa final 4829.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border border-emerald-500/30">
                <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">2. Validação Antifraude & Chave Visa</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Verificado</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Os dados cadastrais de Amidel Catondi e a criptografia do cartão foram validados com sucesso.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border border-emerald-500/30">
                <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">3. Autorização Internacional Visa Direct</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Aprovado</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    A rede mundial da Visa confirmou os fundos sob código <strong>AUTH-VISA-984210</strong>.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border ${
                isAlreadySettled ? 'border-emerald-500/30' : 'border-blue-500/40 bg-blue-950/10'
              }`}>
                <div className={`p-1.5 rounded-full mt-0.5 shrink-0 ${
                  isAlreadySettled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {isAlreadySettled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 animate-spin" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">4. Transmissão para o Banco Emissor</span>
                    <span className={`text-[10px] font-mono ${isAlreadySettled ? 'text-emerald-400' : 'text-blue-400 font-bold'}`}>
                      {isAlreadySettled ? 'Liquidado' : 'Processando Banco'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Remessa entregue aos servidores do banco emissor do cartão para lançamento em conta.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className={`flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border ${
                isAlreadySettled ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800'
              }`}>
                <div className={`p-1.5 rounded-full mt-0.5 shrink-0 ${
                  isAlreadySettled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">5. Saldo Disponível na Fatura / Conta</span>
                    <span className={`text-[10px] font-mono ${isAlreadySettled ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                      {isAlreadySettled ? 'Depositado com Sucesso' : 'Aguardando Lançamento'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    O valor é lançado como crédito positivo no extrato ou limite disponível do seu cartão.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action to accelerate and settle now */}
          {!isAlreadySettled ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/50 space-y-3">
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Deseja acelerar a compensação bancária imediatamente?
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Se o seu banco ainda não atualizou a notificação no celular, clique no botão abaixo para forçar a confirmação imediata da liquidação Visa Direct.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAccelerateSettlement}
                disabled={isAccelerating}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-blue-600/20 active:scale-98 disabled:opacity-50"
              >
                {isAccelerating ? (
                  <span>Comunicando com a Rede Bancária Visa...</span>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>Confirmar & Liquidar Depósito no Cartão Visa Agora</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Depósito Liquidado e Confirmado na Rede Visa!</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                A transferência para o cartão de <strong>{creator.name}</strong> (final <strong>4829</strong>) foi quitada com sucesso. O valor já se encontra abatido ou somado ao seu limite bancário.
              </p>
            </div>
          )}

          {/* Educational notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-slate-300">
                Prazos normais de liquidação bancária internacional:
              </span>
              <p>
                As transferências Visa Direct são enviadas no mesmo instante. Dependendo do seu banco emissor (BAI, BPC, Millennium, Bradesco, etc.), o extrato do cartão pode levar de 30 minutos a 2 horas úteis para refletir na tela do app do seu banco.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[11px]">
          <button
            onClick={onOpenSupport}
            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Falar com o Suporte 24/7 de Saques</span>
          </button>

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
