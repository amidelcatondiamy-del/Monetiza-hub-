import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Download,
  Copy,
  Check,
  Clock,
  Tag,
  AlertCircle,
  ExternalLink,
  Award,
  Smartphone,
  FileText,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import {
  formatCurrency,
  convertFromBRL,
  CURRENCY_SYMBOLS,
} from '../../utils/formatters';
import { PaymentMethod } from '../../types/monetization';
import { ModalityFeeTooltip } from '../common/FeeTooltip';
import {
  RealPaymentMethod,
  RealSaleOrder,
  SalesGatewayReadiness,
  createRealSaleCheckoutApi,
  fetchSalesStatusApi,
  verifyRealSaleOrderApi,
} from '../../services/salesClient';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGatewaySetup?: () => void;
  checkoutItem: {
    type: 'product_sale' | 'subscription' | 'tip' | 'paywall_unlock' | 'in_app_purchase';
    id?: string;
    title: string;
    price: number;
    description?: string;
    contentUrl?: string;
  } | null;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOpenGatewaySetup,
  checkoutItem,
}) => {
  const {
    validateCoupon,
    selectedCurrency,
    calculateCheckoutFee,
    syncRealOrderToLedger,
    realOrders,
  } = useMonetization();

  const [paymentMethod, setPaymentMethod] = useState<RealPaymentMethod>(() => {
    if (selectedCurrency === 'AOA') return 'multicaixa';
    if (selectedCurrency === 'USD' || selectedCurrency === 'EUR') return 'credit_card';
    return 'pix';
  });

  // Real Buyer Fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [gatewayConfigMissing, setGatewayConfigMissing] = useState<{
    provider: string;
    missingEnvVars: string[];
  } | null>(null);

  // Multicaixa Express (Angola)
  const [multicaixaPhone, setMulticaixaPhone] = useState('');

  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercentage: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Server Checkout State
  const [readiness, setReadiness] = useState<SalesGatewayReadiness | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifyingOrder, setIsVerifyingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<RealSaleOrder | null>(null);
  const [copiedField, setCopiedField] = useState<'pix' | 'boleto' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setGatewayConfigMissing(null);
    fetchSalesStatusApi().then((status) => {
      if (status) setReadiness(status);
    });
  }, [isOpen]);

  // Synchronize with SSE realOrders updates (e.g., when webhook marks a pending Pix/Multicaixa order as approved)
  useEffect(() => {
    if (!activeOrder) return;
    const updated = realOrders.find((o) => o.id === activeOrder.id);
    if (updated && (updated.status !== activeOrder.status || updated.updatedAt !== activeOrder.updatedAt)) {
      setActiveOrder(updated);
    }
  }, [realOrders, activeOrder]);

  // Active polling while an async order (Pix / Boleto / Multicaixa GPO) is pending
  useEffect(() => {
    if (!isOpen || !activeOrder || activeOrder.status !== 'pending') return;
    const intervalId = window.setInterval(async () => {
      const check = await verifyRealSaleOrderApi(activeOrder.id);
      if (check.ok && check.order) {
        setActiveOrder(check.order);
        syncRealOrderToLedger(check.order);
      }
    }, 4500);
    return () => window.clearInterval(intervalId);
  }, [isOpen, activeOrder?.id, activeOrder?.status]);

  if (!isOpen || !checkoutItem) return null;

  const discountPercent = appliedCoupon ? appliedCoupon.discountPercentage : 0;
  const finalPrice = Math.max(
    1,
    Number((checkoutItem.price * (1 - discountPercent / 100)).toFixed(2))
  );

  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) return;
    const valid = validateCoupon(couponCode, checkoutItem.id);
    if (valid) {
      setAppliedCoupon({ code: valid.code, discountPercentage: valid.discountPercentage });
      setCouponError('');
    } else {
      setAppliedCoupon(null);
      setCouponError('Cupom inválido, expirado, esgotado ou não aplicável a este item.');
    }
  };

  const handleFormatCard = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    const parts = clean.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : clean);
  };

  const handleFormatExpiry = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setCardExpiry(clean);
    }
  };

  const handleCopyText = (text: string, field: 'pix' | 'boleto') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 2000);
  };

  const handleManualVerifyOrder = async () => {
    if (!activeOrder) return;
    setIsVerifyingOrder(true);
    setFormError(null);
    const res = await verifyRealSaleOrderApi(activeOrder.id);
    setIsVerifyingOrder(false);
    if (res.order) {
      setActiveOrder(res.order);
      syncRealOrderToLedger(res.order);
      if (res.order.status === 'pending') {
        setFormError(
          'Pagamento ainda aguardando confirmação bancária/gateway. Assim que liquidar, será confirmado automaticamente.'
        );
      }
    } else if (res.error) {
      setFormError(res.error);
    }
  };

  const handleConfirmPayment = async () => {
    setFormError(null);
    setGatewayConfigMissing(null);

    if (!customerName.trim() || customerName.trim().length < 2) {
      setFormError('Informe seu nome completo para emissão do pedido.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setFormError('Informe um endereço de e-mail válido para entrega e comprovante.');
      return;
    }

    if (paymentMethod === 'multicaixa') {
      const digits = multicaixaPhone.replace(/\D/g, '');
      const clean9 = digits.startsWith('244') && digits.length === 12 ? digits.slice(3) : digits;
      if (clean9.length !== 9 || !clean9.startsWith('9')) {
        setFormError('Informe um número Multicaixa Express válido de 9 dígitos (ex: 923 456 789).');
        return;
      }
    }

    let parsedExpMonth = '';
    let parsedExpYear = '';
    if (paymentMethod === 'credit_card' || paymentMethod === 'stripe') {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard.length < 13) {
        setFormError('Informe um número de cartão válido.');
        return;
      }
      if (!cardHolder.trim()) {
        setFormError('Informe o nome do titular impresso no cartão.');
        return;
      }
      const expParts = cardExpiry.split('/');
      if (expParts.length !== 2 || expParts[0].length !== 2 || expParts[1].length < 2) {
        setFormError('Informe a validade do cartão no formato MM/AA.');
        return;
      }
      parsedExpMonth = expParts[0];
      parsedExpYear = expParts[1].length === 2 ? `20${expParts[1]}` : expParts[1];
      if (cardCvv.trim().length < 3) {
        setFormError('Informe o código de segurança CVV.');
        return;
      }
    }

    setIsProcessing(true);

    const { fee, netAmount } = calculateCheckoutFee(
      finalPrice,
      paymentMethod as PaymentMethod
    );

    const chargedAmount =
      paymentMethod === 'multicaixa' ? convertFromBRL(finalPrice, 'AOA') : finalPrice;

    const result = await createRealSaleCheckoutApi({
      type: checkoutItem.type,
      itemId: checkoutItem.id,
      title: checkoutItem.title,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerDocument: customerDocument.replace(/\D/g, '') || undefined,
      customerPhone: paymentMethod === 'multicaixa' ? multicaixaPhone.trim() : undefined,
      grossAmount: finalPrice,
      fee,
      netAmount,
      currency: selectedCurrency,
      chargedAmount,
      paymentMethod,
      installments:
        paymentMethod === 'credit_card' || paymentMethod === 'stripe'
          ? installments
          : undefined,
      card:
        paymentMethod === 'credit_card' || paymentMethod === 'stripe'
          ? {
              number: cardNumber.replace(/\s+/g, ''),
              holderName: cardHolder.trim().toUpperCase(),
              expMonth: parsedExpMonth,
              expYear: parsedExpYear,
              cvv: cardCvv.trim(),
            }
          : undefined,
      couponCode: appliedCoupon?.code,
      message: checkoutItem.type === 'tip' ? tipMessage.trim() || undefined : undefined,
    });

    setIsProcessing(false);

    if (!result.ok || !result.order) {
      if (result.code === 'GATEWAY_NOT_CONFIGURED') {
        setGatewayConfigMissing({
          provider: (result.provider || paymentMethod).toUpperCase(),
          missingEnvVars: result.missingEnvVars || [],
        });
      }
      setFormError(
        result.error || 'Não foi possível processar o pagamento no gateway configurado.'
      );
      return;
    }

    syncRealOrderToLedger(result.order);
    setActiveOrder(result.order);
  };

  const handleCloseAll = () => {
    setActiveOrder(null);
    setFormError(null);
    setGatewayConfigMissing(null);
    onClose();
  };

  const isBrConfigured = Boolean(readiness?.brGateway.configured);
  const isAngolaConfigured = Boolean(readiness?.angolaPsp.configured);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight">
              Checkout Real & Auditado
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Gateway Live</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleCloseAll}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STATE 1: REAL APPROVED SALE RECEIPT */}
        {activeOrder && activeOrder.status === 'approved' ? (
          <div className="p-6 text-center space-y-5 animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                Pagamento Real Confirmado!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pedido <strong className="text-white font-mono">{activeOrder.id}</strong> liquidado
                via{' '}
                <strong className="text-emerald-400 uppercase font-mono">
                  {activeOrder.gatewayProvider} ({activeOrder.gatewayMode})
                </strong>
                .
              </p>
              <div className="mt-2 text-xs text-blue-300 bg-blue-950/50 py-1.5 px-3 rounded-xl border border-blue-500/30 inline-flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  ID Gateway: <strong>{activeOrder.externalChargeId}</strong>
                </span>
              </div>
              <div className="mt-2 text-xs text-emerald-300 bg-emerald-500/10 py-1.5 px-3 rounded-xl border border-emerald-500/20 font-medium">
                {activeOrder.gatewayMessage}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2.5">
              <div className="flex justify-between text-xs gap-3">
                <span className="text-slate-400">Item Adquirido:</span>
                <span className="font-bold text-white text-right">{activeOrder.title}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Valor Pago:</span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(activeOrder.grossAmount, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Comprador:</span>
                <span className="text-slate-200 font-mono">{activeOrder.customerEmail}</span>
              </div>

              {checkoutItem.contentUrl && (
                <div className="pt-2 border-t border-slate-800">
                  <a
                    href={checkoutItem.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/25"
                  >
                    <Download className="w-4 h-4" />
                    <span>Acessar / Baixar Produto</span>
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCloseAll}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Concluir e Fechar
            </button>
          </div>
        ) : activeOrder && activeOrder.status === 'pending' ? (
          /* STATE 2: REAL ASYNC PAYMENT AWAITING GATEWAY / BANK SETTLEMENT (PIX / BOLETO / MULTICAIXA) */
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Aguardando Pagamento Real</span>
                </div>
                <div className="text-xs font-bold text-white mt-0.5">{activeOrder.title}</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Pedido: {activeOrder.id} · Gateway ID: {activeOrder.externalChargeId}
                </div>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-base font-extrabold text-emerald-400">
                  {formatCurrency(activeOrder.grossAmount, selectedCurrency)}
                </div>
                <div className="text-[10px] text-slate-500 uppercase">
                  {activeOrder.gatewayProvider}
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Real Pix QR Code & Copia-e-Cola */}
            {activeOrder.paymentMethod === 'pix' && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-center">
                {activeOrder.pixQrCodeBase64 ? (
                  <img
                    src={activeOrder.pixQrCodeBase64}
                    alt="QR Code Pix Real"
                    className="w-44 h-44 mx-auto rounded-xl bg-white p-2"
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                    Utilize o código Pix Copia-e-Cola abaixo emitido pelo gateway{' '}
                    <strong className="text-white uppercase">{activeOrder.gatewayProvider}</strong>.
                  </div>
                )}

                {activeOrder.pixQrCode && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-300 break-all max-h-20 overflow-y-auto text-left">
                      {activeOrder.pixQrCode}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(activeOrder.pixQrCode!, 'pix')}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedField === 'pix' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Código Pix Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Pix Copia-e-Cola</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {activeOrder.ticketUrl && (
                  <a
                    href={activeOrder.ticketUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Página de Pagamento no Gateway</span>
                  </a>
                )}
              </div>
            )}

            {/* Real Boleto Bancário Details */}
            {activeOrder.paymentMethod === 'boleto' && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Boleto Registrado no Gateway</span>
                </div>
                {activeOrder.boletoBarcode && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 break-all">
                      {activeOrder.boletoBarcode}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(activeOrder.boletoBarcode!, 'boleto')}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedField === 'boleto' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Linha Digitável Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Linha Digitável</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                {(activeOrder.boletoUrl || activeOrder.ticketUrl) && (
                  <a
                    href={activeOrder.boletoUrl || activeOrder.ticketUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visualizar / Imprimir Boleto PDF</span>
                  </a>
                )}
              </div>
            )}

            {/* Real Multicaixa Express GPO Pending */}
            {activeOrder.paymentMethod === 'multicaixa' && (
              <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 space-y-2 text-xs text-slate-300">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Pedido GPO Enviado ao Multicaixa Express</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Abra o aplicativo <strong className="text-white">Multicaixa Express</strong> no
                  telemóvel <span className="font-mono text-white">{multicaixaPhone}</span> e
                  autorize a cobrança de{' '}
                  <strong className="font-mono text-emerald-400">
                    {activeOrder.chargedAmount.toLocaleString('pt-AO')} AOA
                  </strong>
                  .
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleManualVerifyOrder}
                disabled={isVerifyingOrder}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingOrder ? 'animate-spin' : ''}`} />
                <span>
                  {isVerifyingOrder
                    ? 'Consultando Gateway...'
                    : 'Já paguei — Verificar Confirmação'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Trocar Método
              </button>
            </div>
          </div>
        ) : (
          /* STATE 3: REAL CHECKOUT FORM */
          <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
            {/* Item Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Resumo do Pedido ({CURRENCY_SYMBOLS[selectedCurrency].flag} {selectedCurrency})
                </span>
                <h4 className="text-xs font-bold text-white line-clamp-1">{checkoutItem.title}</h4>
              </div>
              <div className="text-right">
                <div className="text-base font-extrabold text-emerald-400 font-mono tabular-nums">
                  {formatCurrency(finalPrice, selectedCurrency)}
                </div>
                {appliedCoupon && (
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    -{appliedCoupon.discountPercentage}% ({appliedCoupon.code})
                  </span>
                )}
              </div>
            </div>

            {/* Gateway Error / Configuration Needed Banner */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-relaxed">{formError}</span>
                </div>
                {gatewayConfigMissing && (
                  <div className="pt-2 border-t border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] text-rose-300 font-mono">
                      Variáveis em falta: {gatewayConfigMissing.missingEnvVars.join(', ') || 'Gateway API Token'}
                    </div>
                    {onOpenGatewaySetup && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseAll();
                          onOpenGatewaySetup();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Settings className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Configurar Credenciais do Gateway</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Real Customer Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do comprador"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">E-mail para Acesso *</label>
                <input
                  type="email"
                  required
                  placeholder="email@comprador.com"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {paymentMethod !== 'multicaixa' && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  CPF / CNPJ do Pagador (exigido por gateways brasileiros como Asaas / Pagar.me / Pix)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={customerDocument}
                  onChange={(e) => setCustomerDocument(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {checkoutItem.type === 'tip' && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Mensagem de Apoio (opcional)
                </label>
                <input
                  type="text"
                  value={tipMessage}
                  onChange={(e) => setTipMessage(e.target.value)}
                  placeholder="Deixe uma mensagem para o criador..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Método de Pagamento Real
                </label>
                <ModalityFeeTooltip
                  modality={checkoutItem.type}
                  sampleAmountBRL={finalPrice}
                  paymentMethodHint={paymentMethod as PaymentMethod}
                  triggerLabel="Taxas"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('pix');
                    setFormError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-600/15 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">PIX</div>
                      <div className="text-[10px] text-slate-400">
                        {isBrConfigured ? readiness?.brGateway.provider.toUpperCase() : 'Configurar BR'}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('credit_card');
                    setFormError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'credit_card'
                      ? 'bg-blue-600/15 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Cartão de Crédito</div>
                      <div className="text-[10px] text-slate-400">
                        {isBrConfigured ? readiness?.brGateway.provider.toUpperCase() : 'Configurar BR'}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('boleto');
                    setFormError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'boleto'
                      ? 'bg-teal-600/15 border-teal-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Boleto Bancário</div>
                      <div className="text-[10px] text-slate-400">
                        {isBrConfigured ? readiness?.brGateway.provider.toUpperCase() : 'Configurar BR'}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('multicaixa');
                    setFormError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'multicaixa'
                      ? 'bg-amber-600/15 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Multicaixa Express</div>
                      <div className="text-[10px] text-slate-400">
                        {isAngolaConfigured ? readiness?.angolaPsp.provider.toUpperCase() : 'Configurar PSP'}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Server Readiness Hint */}
            {((paymentMethod === 'multicaixa' && !isAngolaConfigured) ||
              (paymentMethod !== 'multicaixa' && !isBrConfigured)) &&
              readiness && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-center justify-between gap-2">
                  <span>
                    As credenciais reais deste gateway ainda não estão ativas no servidor. Configure-as para processar cobranças reais sem simulação.
                  </span>
                  {onOpenGatewaySetup && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseAll();
                        onOpenGatewaySetup();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Configurar
                    </button>
                  )}
                </div>
              )}

            {/* Multicaixa Phone Field */}
            {paymentMethod === 'multicaixa' && (
              <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 space-y-2">
                <label className="block text-[11px] font-semibold text-amber-300">
                  Telemóvel Multicaixa Express (Angola)
                </label>
                <input
                  type="text"
                  value={multicaixaPhone}
                  onChange={(e) => {
                    setMulticaixaPhone(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="923 456 789"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <div className="text-[10px] text-slate-400">
                  Será enviado um pedido GPO oficial em Kwanzas ({convertFromBRL(finalPrice, 'AOA').toLocaleString('pt-AO')} AOA) ao seu aplicativo.
                </div>
              </div>
            )}

            {/* Credit Card Fields */}
            {(paymentMethod === 'credit_card' || paymentMethod === 'stripe') && (
              <div className="p-4 bg-slate-950 rounded-xl border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-400">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Dados do Cartão (Processamento via Gateway Servidor)</span>
                  </span>
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Número do Cartão</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => {
                      handleFormatCard(e.target.value);
                      setFormError(null);
                    }}
                    placeholder="0000 0000 0000 0000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[11px] text-slate-400 mb-1">Titular</label>
                    <input
                      type="text"
                      value={cardHolder}
                      placeholder="NOME NO CARTÃO"
                      onChange={(e) => {
                        setCardHolder(e.target.value.toUpperCase());
                        setFormError(null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Validade</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => {
                        handleFormatExpiry(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="MM/AA"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">CVV</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => {
                        setCardCvv(e.target.value.replace(/\D/g, ''));
                        setFormError(null);
                      }}
                      placeholder="000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Parcelamento</label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 6, 10, 12].map((count) => (
                      <option key={count} value={count}>
                        {count}x de {formatCurrency(finalPrice / count, selectedCurrency)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Coupon field */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cupom de desconto (ex: MONETIZA20)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer whitespace-nowrap shrink-0"
              >
                Aplicar
              </button>
            </div>
            {couponError && <p className="text-[11px] text-rose-400">{couponError}</p>}

            {/* Trust Ribbon */}
            <div className="flex items-center gap-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <Award className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Cobrança executada diretamente no servidor via gateway configurado e registrada com rastreio em tempo real.
              </span>
            </div>

            {/* Confirm Real Charge Button */}
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Gerando Cobrança Real no Gateway...</span>
                </>
              ) : (
                <>
                  <span>
                    Pagar {formatCurrency(finalPrice, selectedCurrency)} Agora
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
