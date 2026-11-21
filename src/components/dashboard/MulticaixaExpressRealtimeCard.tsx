import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Smartphone,
  Building2,
  CheckCircle2,
  ArrowRight,
  Lock,
  Copy,
  Check,
  AlertCircle,
  Clock,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Server,
  RefreshCw,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import {
  formatCurrency,
  convertFromBRL,
  convertToBRL,
  CURRENCY_SYMBOLS,
  formatDate,
} from '../../utils/formatters';
import { WithdrawalRequest } from '../../types/monetization';
import {
  AngolaPspStatus,
  ServerSettlementRecord,
  executeExpressPayoutApi,
  fetchAngolaPspStatus,
  fetchExpressLedgerApi,
  queryExpressTransactionApi,
  subscribeExpressStream,
} from '../../services/angolaPspClient';
import { PspConfigurationWizard } from './PspConfigurationWizard';

const ANGOLAN_BANKS = [
  'Banco BAI Angola',
  'BFA - Banco de Fomento Angola',
  'Banco BIC',
  'Millennium Atlântico',
  'Standard Bank Angola',
  'Banco Sol',
  'Banco Keve',
];

const PIPELINE_STEPS = [
  { id: 1, title: 'Validação de Destino & Saldo', detail: 'Conferência de MSISDN / IBAN AO06' },
  { id: 2, title: 'Chamada Segura ao Backend (/api)', detail: 'Autenticação server-side com PSP' },
  { id: 3, title: 'Processamento EMIS / PSP', detail: 'Ordem enviada com Idempotency-Key' },
  { id: 4, title: 'Registro de Liquidação', detail: 'Atualização do comprovante no painel' },
];

interface MulticaixaExpressRealtimeCardProps {
  onOpenFullWithdraw?: () => void;
}

export const MulticaixaExpressRealtimeCard: React.FC<MulticaixaExpressRealtimeCardProps> = ({
  onOpenFullWithdraw,
}) => {
  const {
    creator,
    updateCreatorProfile,
    availableBalance,
    withdrawals,
    requestWithdrawal,
    reconcileExpressSettlement,
    addInstantBalance,
    selectedCurrency,
  } = useMonetization();

  const isAutoExpress =
    creator.autoPayoutExpress ?? creator.preferredPayoutChannel === 'express';

  const [expressPhone, setExpressPhone] = useState(
    creator.expressPhone || creator.phone || '+244 923 456 789'
  );
  const [expressBankName, setExpressBankName] = useState(
    creator.expressBankName || 'Banco BAI Angola'
  );
  const [expressIban, setExpressIban] = useState(creator.expressIban || '');
  const [profileSaved, setProfileSaved] = useState(false);

  const [pspStatus, setPspStatus] = useState<AngolaPspStatus | null>(null);
  const [checkingPsp, setCheckingPsp] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [serverLedger, setServerLedger] = useState<ServerSettlementRecord[]>([]);
  const [queryingTxId, setQueryingTxId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Input stored as string in the currently selectedCurrency
  const [amountInput, setAmountInput] = useState<string>(() => {
    const halfBRL = availableBalance > 0 ? availableBalance * 0.5 : 250;
    return convertFromBRL(halfBRL, selectedCurrency).toFixed(2);
  });
  const [isExactFullBalance, setIsExactFullBalance] = useState(false);

  // Real-time / Sandbox pipeline state
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lastReceipt, setLastReceipt] = useState<WithdrawalRequest | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const timersRef = useRef<number[]>([]);

  const loadPspStatus = async () => {
    setCheckingPsp(true);
    const status = await fetchAngolaPspStatus();
    setPspStatus(status);
    setCheckingPsp(false);
  };

  useEffect(() => {
    loadPspStatus();
    fetchExpressLedgerApi().then((items) => setServerLedger(items));

    const unsubscribe = subscribeExpressStream(
      (eventName, payload) => {
        if (Array.isArray(payload.ledger)) {
          setServerLedger(payload.ledger);
        }
        if (eventName === 'settlement_updated' && payload.record) {
          reconcileExpressSettlement({
            pspTransactionId: payload.record.pspTransactionId,
            reference: payload.record.reference,
            status: payload.record.status,
          });
        }
      },
      (connected) => setStreamConnected(connected)
    );

    return () => {
      unsubscribe();
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const handleQueryTransactionStatus = async (txId: string) => {
    setQueryingTxId(txId);
    const res = await queryExpressTransactionApi(txId);
    setQueryingTxId(null);
    if (res.success && res.transaction) {
      reconcileExpressSettlement({
        pspTransactionId: res.transaction.pspTransactionId,
        reference: res.transaction.reference,
        status: res.transaction.status,
      });
      const updated = await fetchExpressLedgerApi();
      setServerLedger(updated);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  // Keep input synchronized if currency changes
  useEffect(() => {
    const suggestedBRL =
      availableBalance > 0 ? Math.min(availableBalance, Math.max(availableBalance * 0.5, 50)) : 250;
    setAmountInput(convertFromBRL(suggestedBRL, selectedCurrency).toFixed(2));
    setIsExactFullBalance(false);
  }, [selectedCurrency]);

  const expressWithdrawals = withdrawals
    .filter((w) => w.destinationType === 'express')
    .slice(0, 4);

  const parsedInput = parseFloat(amountInput.replace(',', '.')) || 0;
  const amountInBRL = isExactFullBalance
    ? availableBalance
    : convertToBRL(parsedInput, selectedCurrency);
  const amountInAOA = convertFromBRL(amountInBRL, 'AOA');

  const handleSelectPercent = (pct: number) => {
    setErrorMsg('');
    if (pct === 1) {
      setIsExactFullBalance(true);
      setAmountInput(convertFromBRL(availableBalance, selectedCurrency).toFixed(2));
    } else {
      setIsExactFullBalance(false);
      setAmountInput(convertFromBRL(availableBalance * pct, selectedCurrency).toFixed(2));
    }
  };

  const handleSaveExpressBinding = () => {
    if (!expressPhone.trim()) {
      setErrorMsg('Informe o número Multicaixa Express (+244...) antes de guardar.');
      return;
    }
    setErrorMsg('');
    updateCreatorProfile({
      expressPhone: expressPhone.trim(),
      expressBankName,
      expressIban: expressIban.trim().toUpperCase(),
    });
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 2200);
  };

  const handleToggleAutoPayout = () => {
    const next = !isAutoExpress;
    updateCreatorProfile({
      autoPayoutExpress: next,
      preferredPayoutChannel: next ? 'express' : 'visa_card',
      expressPhone: expressPhone.trim() || '+244 923 456 789',
      expressBankName,
      expressIban: expressIban.trim().toUpperCase(),
    });
  };

  const handleExecuteWithdraw = async (forceSandbox: boolean) => {
    setErrorMsg('');
    if (availableBalance <= 0) {
      setErrorMsg('Saldo disponível zerado. Adicione saldo de teste ou receba uma venda.');
      return;
    }
    if (!expressPhone.trim() || expressPhone.replace(/\D/g, '').length < 9) {
      setErrorMsg('Informe um número de telemóvel angolano válido (ex: +244 923 456 789).');
      return;
    }
    if (parsedInput <= 0 || amountInBRL <= 0) {
      setErrorMsg('Informe um valor válido para sacar.');
      return;
    }

    const safeAmountBRL =
      isExactFullBalance || Math.abs(amountInBRL - availableBalance) < 0.05
        ? availableBalance
        : amountInBRL;

    if (safeAmountBRL > availableBalance + 0.01) {
      setErrorMsg(
        `O valor excede o saldo líquido disponível (${formatCurrency(
          availableBalance,
          selectedCurrency
        )}).`
      );
      return;
    }

    const cleanIban = expressIban.trim().toUpperCase();
    updateCreatorProfile({
      expressPhone: expressPhone.trim(),
      expressBankName,
      expressIban: cleanIban,
    });

    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    const useRealPsp = !forceSandbox && Boolean(pspStatus?.configured);

    if (useRealPsp) {
      setIsProcessing(true);
      setActiveStep(2);
      setLastReceipt(null);

      const safeAOA = convertFromBRL(safeAmountBRL, 'AOA');
      const apiRes = await executeExpressPayoutApi({
        amountAOA: safeAOA,
        phone: expressPhone.trim(),
        bankName: expressBankName,
        iban: cleanIban || undefined,
        reference: `MH-EXP-${Date.now()}`,
        beneficiaryName: creator.name,
      });

      if (!apiRes.success || !apiRes.payout) {
        setIsProcessing(false);
        setActiveStep(0);
        setErrorMsg(
          apiRes.error || 'O provedor PSP recusou a transferência. Verifique credenciais e saldo na conta comerciante.'
        );
        return;
      }

      setActiveStep(4);
      const payoutData = apiRes.payout;
      const res = requestWithdrawal({
        amount: Math.min(safeAmountBRL, availableBalance),
        destinationType: 'express',
        destinationKey: expressPhone.trim(),
        expressDetails: {
          phoneOrId: expressPhone.trim(),
          network: `PSP ${payoutData.provider.toUpperCase()} (${payoutData.mode})`,
          bankName: expressBankName,
          iban: cleanIban || undefined,
          pspTransactionId: payoutData.pspTransactionId,
          pspProvider: payoutData.provider,
          isLivePsp: true,
          settlementStatus: payoutData.status === 'credited' ? 'credited' : 'processing',
        },
      });

      setIsProcessing(false);
      setActiveStep(0);

      if (res.success && res.withdrawal) {
        setLastReceipt(res.withdrawal);
        const remaining = Math.max(0, availableBalance - res.withdrawal.amount);
        setIsExactFullBalance(false);
        setAmountInput(
          convertFromBRL(remaining > 0 ? remaining * 0.5 : 0, selectedCurrency).toFixed(2)
        );
      } else {
        setErrorMsg(res.error || 'Falha ao registrar comprovante local.');
      }
      return;
    }

    // Explicit local Sandbox simulation when server PSP is not configured
    setIsProcessing(true);
    setActiveStep(1);
    setLastReceipt(null);

    const t1 = window.setTimeout(() => setActiveStep(2), 250);
    const t2 = window.setTimeout(() => setActiveStep(3), 550);
    const t3 = window.setTimeout(() => setActiveStep(4), 850);
    const t4 = window.setTimeout(() => {
      const res = requestWithdrawal({
        amount: Math.min(safeAmountBRL, availableBalance),
        destinationType: 'express',
        destinationKey: expressPhone.trim(),
        expressDetails: {
          phoneOrId: expressPhone.trim(),
          network: 'Simulação Sandbox Local (Sem PSP Real)',
          bankName: expressBankName,
          iban: cleanIban || undefined,
          isLivePsp: false,
          settlementStatus: 'credited',
        },
      });

      setIsProcessing(false);
      setActiveStep(0);

      if (res.success && res.withdrawal) {
        setLastReceipt(res.withdrawal);
        const remaining = Math.max(0, availableBalance - res.withdrawal.amount);
        setIsExactFullBalance(false);
        setAmountInput(
          convertFromBRL(remaining > 0 ? remaining * 0.5 : 0, selectedCurrency).toFixed(2)
        );
      } else {
        setErrorMsg(res.error || 'Falha ao registrar simulação.');
      }
    }, 1100);

    timersRef.current.push(t1, t2, t3, t4);
  };

  const handleCopyReceipt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    window.setTimeout(() => setCopiedReceipt(false), 1800);
  };

  const currencyMeta = CURRENCY_SYMBOLS[selectedCurrency];
  const pspConfigured = Boolean(pspStatus?.configured);

  return (
    <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              {pspConfigured
                ? `Multicaixa Express • ${pspStatus?.provider.toUpperCase()} (${pspStatus?.mode.toUpperCase()})`
                : 'Multicaixa Express • Simulação Sandbox'}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                pspConfigured
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Server className="w-3 h-3" />
              {pspConfigured ? 'Backend PSP Conectado' : 'Backend Pronto (Aguardando Credenciais PSP)'}
            </span>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Integração Multicaixa Express & Repasse Bancário (Angola)
          </h3>
          <p className="text-xs text-slate-400">
            {pspConfigured
              ? 'As ordens de saque são enviadas com segurança pelo servidor backend diretamente para o seu provedor PSP configurado.'
              : 'Rotas de backend (/api/multicaixa-express/*) estruturadas. Configure as variáveis de ambiente do seu PSP angolano para ativar transferências reais.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleAutoPayout}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              isAutoExpress
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span
              className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                isAutoExpress ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-white" />
            </span>
            <span>Auto-Repasse Express</span>
          </button>

          {onOpenFullWithdraw && (
            <button
              type="button"
              onClick={onOpenFullWithdraw}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Outros Métodos</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Server PSP Environment Readiness Strip */}
      <div
        className={`rounded-xl border p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs ${
          pspConfigured
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
            : 'bg-slate-950 border-slate-800 text-slate-300'
        }`}
      >
        <div className="space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <ShieldCheck
              className={`w-4 h-4 shrink-0 ${pspConfigured ? 'text-emerald-400' : 'text-amber-400'}`}
            />
            <span>
              {pspConfigured
                ? `Gateway PSP Ativo no Servidor: ${pspStatus?.provider.toUpperCase()} (Modo ${pspStatus?.mode.toUpperCase()})`
                : 'Credenciais do PSP Angolano não configuradas nas variáveis de ambiente do servidor'}
            </span>
          </div>
          {!pspConfigured && pspStatus?.missingEnvVars && pspStatus.missingEnvVars.length > 0 && (
            <div className="text-[11px] text-slate-400 font-mono">
              Variáveis necessárias no servidor (.env / Secrets):{' '}
              <span className="text-amber-300">{pspStatus.missingEnvVars.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Assistente de Configuração PSP</span>
          </button>
          <button
            type="button"
            onClick={loadPspStatus}
            disabled={checkingPsp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingPsp ? 'animate-spin' : ''}`} />
            <span>Verificar Servidor PSP</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-4">
          {/* Available Balance */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Saldo Disponível no Painel
              </div>
              <div className="flex flex-wrap items-baseline gap-2.5 mt-1">
                <span className="text-2xl font-black text-white font-mono tabular-nums">
                  {formatCurrency(availableBalance, selectedCurrency)}
                </span>
                {selectedCurrency !== 'AOA' && (
                  <span className="text-xs font-mono tabular-nums text-amber-400 font-semibold">
                    ≈ {formatCurrency(availableBalance, 'AOA')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {availableBalance < 200 && (
                <button
                  type="button"
                  onClick={() => {
                    addInstantBalance(1000);
                    setIsExactFullBalance(false);
                    setAmountInput(convertFromBRL(500, selectedCurrency).toFixed(2));
                    setErrorMsg('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  + Adicionar Saldo Teste
                </button>
              )}
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-nowrap shrink-0">
                {pspConfigured ? 'API PSP Online' : 'Modo Sandbox'}
              </div>
            </div>
          </div>

          {/* Account Binding */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                Dados de Destino Multicaixa Express / Banco
              </span>
              <button
                type="button"
                onClick={handleSaveExpressBinding}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-amber-300 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                {profileSaved ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Dados Guardados</span>
                  </>
                ) : (
                  <span>Guardar Dados</span>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Número de Telemóvel Express
                </label>
                <div className="relative">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={expressPhone}
                    onChange={(e) => {
                      setExpressPhone(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="+244 923 456 789"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Banco Associado (Angola / EMIS)
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={expressBankName}
                    onChange={(e) => setExpressBankName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {ANGOLAN_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                IBAN Angolano (AO06... — opcional para repasses bancários via PSP)
              </label>
              <input
                type="text"
                value={expressIban}
                onChange={(e) => setExpressIban(e.target.value.toUpperCase())}
                placeholder="AO06 0040 0000 1234 5678 9012 3"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Withdrawal Amount + Submit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300">
                Valor do Saque ({currencyMeta.symbol})
              </label>
              <div className="flex items-center gap-1.5">
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleSelectPercent(pct)}
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {pct * 100}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-amber-400">
                  {currencyMeta.symbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountInput}
                  onChange={(e) => {
                    setIsExactFullBalance(false);
                    setAmountInput(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-3 py-2.5 text-sm font-bold text-white font-mono tabular-nums focus:outline-none focus:border-amber-500"
                />
              </div>

              {pspConfigured ? (
                <button
                  type="button"
                  onClick={() => handleExecuteWithdraw(false)}
                  disabled={isProcessing || availableBalance <= 0}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                    isProcessing || availableBalance <= 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Enviando ao PSP...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Enviar Saque Real via PSP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleExecuteWithdraw(true)}
                  disabled={isProcessing || availableBalance <= 0}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                    isProcessing || availableBalance <= 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Simulando Fluxo...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Simular Fluxo (Modo Teste)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            {parsedInput > 0 && selectedCurrency !== 'AOA' && (
              <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center justify-between">
                <span>Equivalente em Kwanzas (AOA):</span>
                <span className="text-amber-400 font-semibold">
                  {formatCurrency(amountInAOA, 'AOA', false)}
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Pipeline / Receipt / Ledger */}
        <div className="lg:col-span-5 space-y-4">
          {isProcessing ? (
            <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  {pspConfigured ? 'Executando Transferência via PSP' : 'Simulando Fluxo (Sandbox)'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Etapa {activeStep}/4
                </span>
              </div>
              <div className="space-y-2.5">
                {PIPELINE_STEPS.map((step) => {
                  const done = activeStep > step.id;
                  const current = activeStep === step.id;
                  return (
                    <div
                      key={step.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition ${
                        done
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : current
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : current ? (
                        <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-700 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">{step.title}</div>
                        <div className="text-[10px] opacity-80">{step.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : lastReceipt ? (
            <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {lastReceipt.expressDetails?.isLivePsp
                    ? 'Ordem Enviada ao PSP Angola'
                    : 'Saque Simulado Registrado (Sandbox)'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyReceipt(lastReceipt.receiptNumber)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 hover:text-emerald-200 cursor-pointer"
                >
                  <span>{lastReceipt.receiptNumber}</span>
                  {copiedReceipt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Destino Express</span>
                  <span className="font-mono text-white font-semibold">
                    {lastReceipt.destinationKey}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Banco</span>
                  <span className="text-slate-200 font-medium">
                    {lastReceipt.expressDetails?.bankName || expressBankName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {lastReceipt.expressDetails?.isLivePsp ? 'ID Transação PSP' : 'Ref. Teste'}
                  </span>
                  <span className="font-mono text-amber-400">
                    {lastReceipt.expressDetails?.pspTransactionId ||
                      lastReceipt.expressDetails?.emisReference ||
                      'EMIS-AO-OK'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estado</span>
                  <span className="font-mono text-cyan-400">
                    {lastReceipt.status === 'processing' ? 'Aguardando Webhook PSP' : 'Concluído'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 font-bold text-sm">
                  <span className="text-white">
                    {lastReceipt.expressDetails?.isLivePsp ? 'Valor Enviado' : 'Valor Simulado'}
                  </span>
                  <span className="font-mono tabular-nums text-emerald-400">
                    {formatCurrency(lastReceipt.netAmount, selectedCurrency)}
                  </span>
                </div>
                {!lastReceipt.expressDetails?.isLivePsp && (
                  <p className="text-[10px] text-slate-400 pt-1">
                    Aviso: sem credenciais de um PSP angolano configuradas no servidor, nenhum valor é enviado ao app externo Multicaixa Express.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Arquitetura de Repasse Multicaixa Express
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    pspConfigured
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {pspConfigured ? 'PSP ATIVO' : 'SANDBOX'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {pspConfigured
                  ? `Backend conectado ao provedor ${pspStatus?.provider.toUpperCase()} com assinatura HMAC de webhook para confirmar liquidações em ${expressPhone}.`
                  : 'As rotas /api/multicaixa-express/charges, /api/multicaixa-express/payouts e /api/webhooks/angola-psp estão ativas no servidor esperando as credenciais do seu PSP.'}
              </p>
            </div>
          )}

          {/* Express Ledger */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Registos Multicaixa Express
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {expressWithdrawals.length} registo(s)
              </span>
            </div>

            {expressWithdrawals.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                Nenhum registo Express ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {expressWithdrawals.map((wd) => (
                  <div
                    key={wd.id}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            wd.expressDetails?.isLivePsp ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        />
                        <span className="font-mono font-semibold text-white truncate">
                          {wd.destinationKey}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {wd.expressDetails?.bankName || 'Banco BAI Angola'} •{' '}
                        <span className="font-mono text-amber-400">
                          {wd.expressDetails?.pspTransactionId ||
                            wd.expressDetails?.emisReference ||
                            wd.receiptNumber}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatDate(wd.settledAt || wd.requestedAt)}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="font-mono tabular-nums font-bold text-emerald-400">
                        {formatCurrency(wd.netAmount, selectedCurrency)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {wd.expressDetails?.isLivePsp
                          ? wd.status === 'processing'
                            ? 'Em processamento PSP'
                            : 'Liquidado PSP'
                          : 'Simulado (Sandbox)'}
                      </div>
                      {wd.expressDetails?.isLivePsp &&
                        wd.status === 'processing' &&
                        wd.expressDetails.pspTransactionId && (
                          <button
                            type="button"
                            onClick={() =>
                              handleQueryTransactionStatus(wd.expressDetails!.pspTransactionId!)
                            }
                            disabled={queryingTxId === wd.expressDetails.pspTransactionId}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold cursor-pointer"
                          >
                            {queryingTxId === wd.expressDetails.pspTransactionId
                              ? 'Consultando...'
                              : 'Consultar PSP'}
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Server SSE & Webhook Events Stream */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200">
                Stream Tempo Real (SSE & Webhooks PSP)
              </span>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                  streamConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {streamConnected ? 'SSE Conectado' : 'Reconectando SSE'}
              </span>
            </div>
            {serverLedger.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Nenhum evento de cobrança/saque recebido pelo servidor ainda. Eventos enviados ao PSP e webhooks aparecem aqui automaticamente.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {serverLedger.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-slate-900/70 border border-slate-800/80 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-white truncate">
                        [{item.kind === 'payout' ? 'SAQUE' : 'COBRANÇA'}] {item.pspTransactionId}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{item.message}</div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                        item.status === 'credited'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : item.status === 'failed'
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PspConfigurationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onStatusRefreshed={(status) => setPspStatus(status)}
      />
    </section>
  );
};
