import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import {
  formatCurrency,
  convertFromBRL,
  convertToBRL,
  CURRENCY_SYMBOLS,
} from '../../utils/formatters';
import { WithdrawalRequest } from '../../types/monetization';
import {
  AngolaPspStatus,
  executeExpressPayoutApi,
  fetchAngolaPspStatus,
} from '../../services/angolaPspClient';
import { PspConfigurationWizard } from './PspConfigurationWizard';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

const ANGOLAN_BANKS = [
  'Banco BAI Angola',
  'BFA - Banco de Fomento Angola',
  'Banco BIC',
  'Millennium Atlântico',
  'Standard Bank Angola',
  'Banco Sol',
  'Banco Keve',
];

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVisaTracker?: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  onOpenVisaTracker,
}) => {
  const {
    availableBalance,
    creator,
    updateCreatorProfile,
    requestWithdrawal,
    addInstantBalance,
    selectedCurrency,
  } = useMonetization();

  const resolvePreferredMethod = (): 'visa_card' | 'express' | 'pix' | 'ted' => {
    if (
      creator.preferredPayoutChannel === 'express' ||
      creator.preferredPayoutChannel === 'visa_card' ||
      creator.preferredPayoutChannel === 'ted' ||
      creator.preferredPayoutChannel === 'pix'
    ) {
      return creator.preferredPayoutChannel;
    }
    if (creator.autoPayoutExpress || selectedCurrency === 'AOA') {
      return 'express';
    }
    return 'visa_card';
  };

  const [payoutMethod, setPayoutMethod] = useState<'visa_card' | 'express' | 'pix' | 'ted'>(
    resolvePreferredMethod
  );
  const [amount, setAmount] = useState<string>(
    convertFromBRL(availableBalance > 0 ? availableBalance * 0.5 : 250, selectedCurrency).toFixed(2)
  );
  const [isExactFullBalance, setIsExactFullBalance] = useState(false);

  // Visa form state
  const [visaCardNumber, setVisaCardNumber] = useState(
    creator.savedVisaCard ? `4000 1234 5678 ${creator.savedVisaCard.last4}` : '4111 2222 3333 4829'
  );
  const [visaHolderName, setVisaHolderName] = useState(
    creator.savedVisaCard?.holderName || creator.name.toUpperCase()
  );
  const [visaExpiry, setVisaExpiry] = useState(
    creator.savedVisaCard?.expiryDate || '09/29'
  );

  // Express state (Multicaixa Express / Switch EMIS Angola)
  const [expressPhone, setExpressPhone] = useState(
    creator.expressPhone || creator.phone || '+244 923 456 789'
  );
  const [expressBankName, setExpressBankName] = useState(
    creator.expressBankName || 'Banco BAI Angola'
  );
  const [expressIban, setExpressIban] = useState(creator.expressIban || '');
  const [pspStatus, setPspStatus] = useState<AngolaPspStatus | null>(null);

  // Pix state
  const [pixKey, setPixKey] = useState(creator.pixKey || '');

  // Bank TED state
  const [bankCode, setBankCode] = useState(
    creator.bankAccount?.bankName || '001 - Banco do Brasil'
  );
  const [bankAgency, setBankAgency] = useState(creator.bankAccount?.agency || '0001');
  const [bankAccount, setBankAccount] = useState(
    creator.bankAccount?.accountNumber || '1234567-8'
  );

  // Status & Receipt state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completedWithdrawal, setCompletedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPayoutMethod(resolvePreferredMethod());
    if (creator.bankAccount?.bankName) setBankCode(creator.bankAccount.bankName);
    if (creator.bankAccount?.agency) setBankAgency(creator.bankAccount.agency);
    if (creator.bankAccount?.accountNumber) setBankAccount(creator.bankAccount.accountNumber);
    if (creator.expressPhone) setExpressPhone(creator.expressPhone);
    if (creator.expressBankName) setExpressBankName(creator.expressBankName);
    if (creator.savedVisaCard?.last4) {
      setVisaCardNumber(
        creator.savedVisaCard.fullCardNumber || `4000 1234 5678 ${creator.savedVisaCard.last4}`
      );
      setVisaHolderName(creator.savedVisaCard.holderName);
      setVisaExpiry(creator.savedVisaCard.expiryDate);
    }
    fetchAngolaPspStatus().then((status) => {
      if (status) setPspStatus(status);
    });
  }, [
    isOpen,
    creator.preferredPayoutChannel,
    creator.bankAccount?.bankName,
    creator.bankAccount?.agency,
    creator.bankAccount?.accountNumber,
    creator.expressPhone,
    creator.expressBankName,
    creator.savedVisaCard?.last4,
  ]);

  if (!isOpen) return null;

  const numInputAmount = parseFloat(amount.replace(',', '.')) || 0;
  const numAmountBRL = isExactFullBalance
    ? availableBalance
    : convertToBRL(numInputAmount, selectedCurrency);

  const handlePercentageSelect = (percent: number) => {
    if (percent === 1) {
      setIsExactFullBalance(true);
      setAmount(convertFromBRL(availableBalance, selectedCurrency).toFixed(2));
    } else {
      setIsExactFullBalance(false);
      setAmount(convertFromBRL(availableBalance * percent, selectedCurrency).toFixed(2));
    }
    setErrorMessage('');
  };

  const handleFormatCard = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    const parts = clean.match(/.{1,4}/g);
    setVisaCardNumber(parts ? parts.join(' ') : clean);
  };

  const handleFormatExpiry = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) {
      setVisaExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setVisaExpiry(clean);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    if (numInputAmount <= 0 || numAmountBRL <= 0) {
      setErrorMessage('Informe um valor de saque válido.');
      return;
    }

    const safeAmountBRL =
      isExactFullBalance || Math.abs(numAmountBRL - availableBalance) < 0.05
        ? availableBalance
        : numAmountBRL;

    if (safeAmountBRL > availableBalance + 0.01) {
      setErrorMessage(
        `O valor não pode exceder o saldo disponível (${formatCurrency(
          availableBalance,
          selectedCurrency
        )}).`
      );
      return;
    }

    let destinationKey = '';
    let visaDetails: { holderName: string; last4: string } | undefined;
    let expressDetails:
      | {
          phoneOrId: string;
          network: string;
          bankName?: string;
          iban?: string;
          pspTransactionId?: string;
          pspProvider?: string;
          isLivePsp?: boolean;
          settlementStatus?: 'processing' | 'authorized' | 'credited';
        }
      | undefined;

    if (payoutMethod === 'visa_card') {
      const cleanNum = visaCardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 16) {
        setErrorMessage('Informe um número de cartão Visa válido (16 dígitos).');
        return;
      }
      if (!visaHolderName.trim()) {
        setErrorMessage('Informe o nome do titular como está impresso no cartão Visa.');
        return;
      }
      destinationKey = `•••• •••• •••• ${cleanNum.slice(-4)}`;
      visaDetails = {
        holderName: visaHolderName.toUpperCase(),
        last4: cleanNum.slice(-4),
      };
    } else if (payoutMethod === 'express') {
      if (!expressPhone.trim()) {
        setErrorMessage('Informe o número de telefone ou ID associado ao Multicaixa Express.');
        return;
      }
      const cleanIban = expressIban.trim().toUpperCase();
      destinationKey = expressPhone.trim();
      expressDetails = {
        phoneOrId: expressPhone.trim(),
        network: pspStatus?.configured
          ? `PSP ${pspStatus.provider.toUpperCase()} (${pspStatus.mode})`
          : 'Simulação Sandbox Local (Sem PSP Real)',
        bankName: expressBankName,
        iban: cleanIban || undefined,
        isLivePsp: Boolean(pspStatus?.configured),
      };
      updateCreatorProfile({
        expressPhone: expressPhone.trim(),
        expressBankName,
        expressIban: cleanIban,
      });
    } else if (payoutMethod === 'pix') {
      if (!pixKey.trim()) {
        setErrorMessage('Informe uma chave Pix válida.');
        return;
      }
      destinationKey = pixKey.trim();
    } else {
      if (!bankAgency.trim() || !bankAccount.trim()) {
        setErrorMessage('Preencha os dados bancários completos para o TED.');
        return;
      }
      destinationKey = `${bankCode} / Ag: ${bankAgency} / CC: ${bankAccount}`;
    }

    setIsSubmitting(true);

    if (payoutMethod === 'express' && pspStatus?.configured) {
      const safeAOA = convertFromBRL(Math.min(safeAmountBRL, availableBalance), 'AOA');
      const apiRes = await executeExpressPayoutApi({
        amountAOA: safeAOA,
        phone: expressPhone.trim(),
        bankName: expressBankName,
        iban: expressIban.trim().toUpperCase() || undefined,
        reference: `MH-WD-${Date.now()}`,
        beneficiaryName: creator.name,
      });

      if (!apiRes.success || !apiRes.payout) {
        setIsSubmitting(false);
        setErrorMessage(
          apiRes.error || 'O provedor PSP recusou o saque. Verifique as credenciais e o saldo na conta comerciante.'
        );
        return;
      }

      const result = requestWithdrawal({
        amount: Math.min(safeAmountBRL, availableBalance),
        destinationType: payoutMethod,
        destinationKey,
        expressDetails: {
          ...expressDetails!,
          pspTransactionId: apiRes.payout.pspTransactionId,
          pspProvider: apiRes.payout.provider,
          isLivePsp: true,
          settlementStatus: apiRes.payout.status === 'credited' ? 'credited' : 'processing',
        },
      });

      setIsSubmitting(false);
      if (result.success && result.withdrawal) {
        setCompletedWithdrawal(result.withdrawal);
      } else {
        setErrorMessage(result.error || 'Falha ao registrar saque.');
      }
      return;
    }

    // Local sandbox simulation
    setTimeout(() => {
      const result = requestWithdrawal({
        amount: Math.min(safeAmountBRL, availableBalance),
        destinationType: payoutMethod,
        destinationKey,
        visaDetails,
        expressDetails,
      });

      setIsSubmitting(false);

      if (result.success && result.withdrawal) {
        setCompletedWithdrawal(result.withdrawal);
      } else {
        setErrorMessage(result.error || 'Falha ao processar saque.');
      }
    }, 650);
  };

  const handleCopyReceipt = () => {
    if (completedWithdrawal) {
      navigator.clipboard.writeText(completedWithdrawal.receiptNumber);
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2000);
    }
  };

  const handleResetAndClose = () => {
    setCompletedWithdrawal(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-white tracking-tight">
                Resgatar Saldo do Criador
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
                Taxa Zero
              </span>
              <ModalityFeeTooltip
                modality="withdrawal"
                sampleAmountBRL={numAmountBRL > 0 ? numAmountBRL : 250}
                triggerLabel="Política de taxas"
                tone="emerald"
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Transfira seus ganhos diretamente para o cartão Visa, Pix ou conta bancária.
            </p>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {completedWithdrawal ? (
          /* Receipt Screen */
          <div className="p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Saque Simulado Registrado (Sandbox)</h3>
              <p className="text-xs text-slate-400 mt-1">
                {completedWithdrawal.destinationType === 'visa_card'
                  ? 'Registro simulado no painel para Visa Direct. Nenhuma transferência bancária real foi enviada.'
                  : completedWithdrawal.destinationType === 'express'
                  ? 'Simulação concluída no painel (sem conexão real com o app Multicaixa Express / rede EMIS). Para envios reais, integre uma API de PSP angolano licenciado com saldo real.'
                  : 'Simulação registrada no painel. Nenhuma transferência bancária real foi executada.'}
              </p>
            </div>

            {/* Receipt Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2.5 font-mono">
              <div className="flex justify-between text-slate-400 font-sans">
                <span>Comprovante</span>
                <button
                  onClick={handleCopyReceipt}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono text-xs cursor-pointer"
                >
                  {completedWithdrawal.receiptNumber}
                  {copiedReceipt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {completedWithdrawal.visaDetails && (
                <div className="flex justify-between py-1 border-t border-slate-800 font-sans">
                  <span className="text-slate-400">Autorização Visa</span>
                  <span className="text-cyan-400 font-mono font-semibold">
                    {completedWithdrawal.visaDetails.authorizationCode}
                  </span>
                </div>
              )}

              {completedWithdrawal.expressDetails && (
                <>
                  <div className="flex justify-between py-1 border-t border-slate-800 font-sans">
                    <span className="text-slate-400">Referência EMIS</span>
                    <span className="text-amber-400 font-mono font-semibold">
                      {completedWithdrawal.expressDetails.emisReference || 'EMIS-AO-OK'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-slate-800 font-sans">
                    <span className="text-slate-400">Autorização Express</span>
                    <span className="text-cyan-400 font-mono font-semibold">
                      {completedWithdrawal.expressDetails.authorizationCode}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-slate-800 font-sans">
                    <span className="text-slate-400">Banco Destino</span>
                    <span className="text-white font-semibold">
                      {completedWithdrawal.expressDetails.bankName || expressBankName}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between py-1 border-t border-slate-800 font-sans">
                <span className="text-slate-400">Destino</span>
                <span className="text-white font-semibold">
                  {completedWithdrawal.destinationType === 'visa_card'
                    ? `Cartão Visa ${completedWithdrawal.destinationKey}`
                    : completedWithdrawal.destinationType === 'express'
                    ? `Multicaixa Express ${completedWithdrawal.destinationKey}`
                    : completedWithdrawal.destinationKey}
                </span>
              </div>

              <div className="flex justify-between py-1 border-t border-slate-800 font-sans items-center">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>Taxa de Saque</span>
                  <ModalityFeeTooltip modality="withdrawal" sampleAmountBRL={completedWithdrawal.amount} iconOnly tone="emerald" />
                </span>
                <span className="text-emerald-400 font-semibold font-mono">
                  {formatCurrency(0, selectedCurrency)} (Grátis)
                </span>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-800 font-sans text-sm font-bold">
                <span className="text-white">Valor Liquidado</span>
                <span className="text-emerald-400 font-mono tabular-nums">
                  {formatCurrency(completedWithdrawal.amount, selectedCurrency)}
                </span>
              </div>
            </div>

            {completedWithdrawal.destinationType === 'visa_card' && onOpenVisaTracker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVisaTracker();
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Acompanhar Depósito no Rastreador Visa Direct</span>
              </button>
            )}

            <button
              onClick={handleResetAndClose}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              Concluir & Voltar ao Painel
            </button>
          </div>
        ) : (
          /* Form Screen */
          <div className="p-6 space-y-5">
            {/* Visa tracker notice shortcut */}
            {onOpenVisaTracker && (
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Já solicitou um saque para o Cartão Visa?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVisaTracker();
                  }}
                  className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-2 transition cursor-pointer text-xs"
                >
                  Rastrear Depósito →
                </button>
              </div>
            )}

            {/* Balance Badge */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Saldo Líquido Disponível
                </span>
                <div className="text-2xl font-black text-white font-mono tabular-nums">
                  {formatCurrency(availableBalance, selectedCurrency)}
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div className="text-emerald-400 font-semibold flex items-center gap-1 justify-end mb-1">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>24/7 Ativo</span>
                </div>
                {availableBalance < 500 && (
                  <button
                    type="button"
                    onClick={() => {
                      addInstantBalance(1000);
                      setIsExactFullBalance(false);
                      setAmount(convertFromBRL(500, selectedCurrency).toFixed(2));
                    }}
                    className="text-[10px] text-emerald-300 hover:text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold cursor-pointer transition"
                  >
                    + Saldo para Teste
                  </button>
                )}
              </div>
            </div>

            {/* Payout Method Tabs (Preferred method highlighted!) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Método de Recebimento
                </label>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Preferência:{' '}
                  {resolvePreferredMethod() === 'express'
                    ? 'Multicaixa'
                    : resolvePreferredMethod() === 'visa_card'
                    ? 'Visa'
                    : resolvePreferredMethod() === 'ted'
                    ? 'Transferência Bancária'
                    : 'Pix'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Tab 1: Visa Card */}
                <button
                  type="button"
                  onClick={() => setPayoutMethod('visa_card')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    payoutMethod === 'visa_card'
                      ? 'bg-blue-600/10 border-blue-500 text-white shadow-md shadow-blue-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CreditCard
                      className={`w-4 h-4 ${
                        payoutMethod === 'visa_card' ? 'text-blue-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="text-[10px] font-black text-blue-400 tracking-wider">
                      VISA
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Cartão Visa</div>
                    <div className="text-[10px] text-slate-400">Visa Direct</div>
                  </div>
                </button>

                {/* Tab 2: Express */}
                <button
                  type="button"
                  onClick={() => setPayoutMethod('express')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    payoutMethod === 'express'
                      ? 'bg-amber-600/10 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Zap
                      className={`w-4 h-4 ${
                        payoutMethod === 'express' ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="text-[10px] font-black text-amber-400 tracking-wider">
                      EXPRESS
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Express</div>
                    <div className="text-[10px] text-slate-400">Instantâneo 24/7</div>
                  </div>
                </button>

                {/* Tab 3: Pix */}
                <button
                  type="button"
                  onClick={() => setPayoutMethod('pix')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    payoutMethod === 'pix'
                      ? 'bg-emerald-600/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                    <div className="flex items-center justify-between mb-2">
                    <QrCode
                      className={`w-4 h-4 ${
                        payoutMethod === 'pix' ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="text-[10px] font-black text-emerald-400 tracking-wider">
                      PIX
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">PIX</div>
                    <div className="text-[10px] text-slate-400">Instantâneo</div>
                  </div>
                </button>

                {/* Tab 4: TED */}
                <button
                  type="button"
                  onClick={() => setPayoutMethod('ted')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    payoutMethod === 'ted'
                      ? 'bg-purple-600/10 border-purple-500 text-white shadow-md shadow-purple-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Building
                      className={`w-4 h-4 ${
                        payoutMethod === 'ted' ? 'text-purple-400' : 'text-slate-500'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">TED Bancário</div>
                    <div className="text-[10px] text-slate-400">Conta corrente</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Destination Form Fields */}
            {payoutMethod === 'visa_card' && (
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Crédito via Visa Direct
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setVisaCardNumber('4111 2222 3333 4829');
                      setVisaHolderName('AMIDEL CATONDI');
                      setVisaExpiry('11/29');
                    }}
                    className="text-[10px] text-blue-300 hover:text-blue-200 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30 transition cursor-pointer"
                  >
                    + Preencher Visa de Teste
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Número do Cartão Visa
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={visaCardNumber}
                      onChange={(e) => handleFormatCard(e.target.value)}
                      placeholder="4000 0000 0000 0000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400">
                      VISA
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Nome Impresso no Cartão
                    </label>
                    <input
                      type="text"
                      value={visaHolderName}
                      onChange={(e) => setVisaHolderName(e.target.value.toUpperCase())}
                      placeholder="NOME COMO NO CARTAO"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Validade (MM/AA)
                    </label>
                    <input
                      type="text"
                      value={visaExpiry}
                      onChange={(e) => handleFormatExpiry(e.target.value)}
                      placeholder="MM/AA"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {payoutMethod === 'express' && (
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-amber-500/40 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Multicaixa Express • Cai na Hora (Switch EMIS)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setExpressPhone('+244 923 456 789');
                      setExpressBankName('Banco BAI Angola');
                    }}
                    className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 transition cursor-pointer"
                  >
                    + Preencher Express de Teste
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Número de Telefone Express
                    </label>
                    <input
                      type="text"
                      value={expressPhone}
                      onChange={(e) => setExpressPhone(e.target.value)}
                      placeholder="+244 923 456 789"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Banco Associado (EMIS Angola)
                    </label>
                    <select
                      value={expressBankName}
                      onChange={(e) => setExpressBankName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      {ANGOLAN_BANKS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    IBAN Angolano (AO06... — opcional para repasse via PSP)
                  </label>
                  <input
                    type="text"
                    value={expressIban}
                    onChange={(e) => setExpressIban(e.target.value.toUpperCase())}
                    placeholder="AO06 0040 0000 1234 5678 9012 3"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                {pspStatus?.configured ? (
                  <p className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-2">
                    <strong>PSP Conectado ({pspStatus.provider.toUpperCase()} • {pspStatus.mode.toUpperCase()}):</strong> O saque será enviado diretamente pelas rotas autenticadas do servidor backend.
                  </p>
                ) : (
                  <div className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span>
                      <strong>Modo Sandbox Local:</strong> Servidor pronto, mas faltam variáveis de ambiente ({pspStatus?.missingEnvVars?.join(', ') || 'ANGOLA_PSP_API_KEY'}).
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsWizardOpen(true)}
                      className="text-[10px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-2 py-1 rounded transition cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
                    >
                      Assistente PSP →
                    </button>
                  </div>
                )}
              </div>
            )}

            {payoutMethod === 'pix' && (
              <div className="space-y-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800 animate-in fade-in duration-150">
                <label className="block text-xs font-semibold text-slate-300">
                  Chave Pix de Destino
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400">
                  A chave deve estar registrada no mesmo CPF do titular da conta.
                </p>
              </div>
            )}

            {payoutMethod === 'ted' && (
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Instituição Bancária</label>
                  <select
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="001 - Banco do Brasil">001 - Banco do Brasil</option>
                    <option value="260 - Nu Pagamentos (Nubank)">260 - Nu Pagamentos (Nubank)</option>
                    <option value="033 - Santander">033 - Santander</option>
                    <option value="341 - Itaú Unibanco">341 - Itaú Unibanco</option>
                    <option value="104 - Caixa Econômica">104 - Caixa Econômica</option>
                    <option value="077 - Banco Inter">077 - Banco Inter</option>
                    {creator.bankAccount?.bankName &&
                      ![
                        '001 - Banco do Brasil',
                        '260 - Nu Pagamentos (Nubank)',
                        '033 - Santander',
                        '341 - Itaú Unibanco',
                        '104 - Caixa Econômica',
                        '077 - Banco Inter',
                      ].includes(creator.bankAccount.bankName) && (
                        <option value={creator.bankAccount.bankName}>
                          {creator.bankAccount.bankName}
                        </option>
                      )}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Agência</label>
                    <input
                      type="text"
                      value={bankAgency}
                      onChange={(e) => setBankAgency(e.target.value)}
                      placeholder="0001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Conta com Dígito</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="12345-6"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Amount Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Valor a Sacar ({CURRENCY_SYMBOLS[selectedCurrency].symbol})
                </label>
                <div className="flex items-center gap-1.5">
                  {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageSelect(pct)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    >
                      {pct * 100}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm font-mono">
                  {CURRENCY_SYMBOLS[selectedCurrency].symbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => {
                    setIsExactFullBalance(false);
                    setAmount(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-base font-bold text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              {payoutMethod === 'express' && numAmountBRL > 0 && selectedCurrency !== 'AOA' && (
                <div className="mt-1.5 text-[11px] text-amber-400 font-mono tabular-nums">
                  Equivalente EMIS em Kwanzas: {formatCurrency(numAmountBRL, 'AOA')}
                </div>
              )}
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || availableBalance <= 0}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                isSubmitting || availableBalance <= 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : payoutMethod === 'express'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : payoutMethod === 'visa_card'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Processando Transferência...</span>
                </>
              ) : (
                <>
                  <span>
                    Confirmar Saque de{' '}
                    {formatCurrency(numAmountBRL > 0 ? numAmountBRL : 0, selectedCurrency)}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <PspConfigurationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onStatusRefreshed={(status) => setPspStatus(status)}
      />
    </div>
  );
};
