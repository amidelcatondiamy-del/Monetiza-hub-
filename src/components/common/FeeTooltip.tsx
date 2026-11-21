import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency } from '../../utils/formatters';
import { PaymentMethod } from '../../types/monetization';

export type MonetizationModality =
  | 'product_sale'
  | 'subscription'
  | 'tip'
  | 'paywall_unlock'
  | 'in_app_purchase'
  | 'ads'
  | 'affiliate'
  | 'withdrawal'
  | 'all_summary';

export interface FeeBreakdownLine {
  label: string;
  value: string;
  tone?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'neutral';
}

export interface FeeTooltipProps {
  title: string;
  subtitle?: string;
  formula?: string;
  breakdown: FeeBreakdownLine[];
  example?: {
    label: string;
    grossValue: string;
    feeValue: string;
    netValue: string;
  };
  note?: string;
  triggerLabel?: string;
  iconOnly?: boolean;
  tone?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate';
  className?: string;
}

const TONE_TEXT: Record<NonNullable<FeeBreakdownLine['tone']>, string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-300',
  rose: 'text-rose-400',
  indigo: 'text-indigo-300',
  neutral: 'text-slate-200',
};

export const FeeTooltip: React.FC<FeeTooltipProps> = ({
  title,
  subtitle,
  formula,
  breakdown,
  example,
  note,
  triggerLabel,
  iconOnly = false,
  tone = 'slate',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const popoverWidth = Math.min(340, window.innerWidth - 24);
    const estimatedHeight = popoverRef.current?.offsetHeight || 260;

    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'top' | 'bottom' =
      spaceBelow < estimatedHeight + 16 && rect.top > estimatedHeight + 16 ? 'top' : 'bottom';

    const top =
      placement === 'bottom'
        ? Math.min(window.innerHeight - estimatedHeight - 12, rect.bottom + 8)
        : Math.max(12, rect.top - estimatedHeight - 8);

    const rawLeft = rect.left + rect.width / 2 - popoverWidth / 2;
    const left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, rawLeft));

    setCoords({ top, left, placement });
  }, []);

  const clearCloseTimer = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openTooltip = () => {
    clearCloseTimer();
    setIsOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 140);
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);

    const handleScrollOrResize = () => updatePosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const triggerToneClass =
    tone === 'emerald'
      ? 'text-emerald-400 hover:text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
      : tone === 'indigo'
      ? 'text-indigo-300 hover:text-indigo-200 border-indigo-500/30 bg-indigo-500/10'
      : tone === 'amber'
      ? 'text-amber-300 hover:text-amber-200 border-amber-500/30 bg-amber-500/10'
      : tone === 'rose'
      ? 'text-rose-300 hover:text-rose-200 border-rose-500/30 bg-rose-500/10'
      : 'text-slate-400 hover:text-emerald-300 border-slate-700/70 bg-slate-900/80';

  return (
    <span className={`inline-flex items-center align-middle ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={title}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          clearCloseTimer();
          setIsOpen((prev) => !prev);
        }}
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleClose}
        onFocus={openTooltip}
        onBlur={scheduleClose}
        className={`inline-flex items-center gap-1 rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
          iconOnly || !triggerLabel
            ? 'p-1'
            : 'px-2 py-0.5 text-[11px] font-medium'
        } ${triggerToneClass}`}
      >
        <Info className="w-3.5 h-3.5 shrink-0" />
        {!iconOnly && triggerLabel && <span>{triggerLabel}</span>}
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            id={tooltipId}
            role="tooltip"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: 'min(340px, calc(100vw - 24px))',
              zIndex: 9999,
            }}
            className="bg-slate-950 border border-slate-700/90 rounded-xl shadow-2xl shadow-black/70 p-4 text-left text-slate-200 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-snug">{title}</div>
                {subtitle && (
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {subtitle}
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label="Fechar explicação"
                onClick={() => setIsOpen(false)}
                className="p-0.5 rounded text-slate-500 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Formula highlight */}
            {formula && (
              <div className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono tabular-nums text-emerald-300 leading-relaxed">
                {formula}
              </div>
            )}

            {/* Breakdown rows */}
            <div className="space-y-1.5 text-[11px]">
              {breakdown.map((row, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">{row.label}</span>
                  <span
                    className={`font-mono tabular-nums font-semibold shrink-0 ${
                      TONE_TEXT[row.tone || 'neutral']
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Concrete simulation example */}
            {example && (
              <div className="pt-2.5 border-t border-slate-800 space-y-1 text-[11px]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {example.label}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Valor Bruto:</span>
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {example.grossValue}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Taxas Totais (Gateway + Plataforma):</span>
                  <span className="font-mono tabular-nums text-rose-400 font-semibold">
                    -{example.feeValue}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/70">
                  <span className="text-slate-200 font-semibold">Líquido ao Criador:</span>
                  <span className="font-mono tabular-nums text-emerald-400 font-bold">
                    {example.netValue}
                  </span>
                </div>
              </div>
            )}

            {/* Explanatory note */}
            {note && (
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800/70">
                {note}
              </p>
            )}
          </div>,
          document.body
        )}
    </span>
  );
};

interface ModalityFeeTooltipProps {
  modality: MonetizationModality;
  sampleAmountBRL?: number;
  paymentMethodHint?: PaymentMethod;
  affiliateCommissionPct?: number;
  triggerLabel?: string;
  iconOnly?: boolean;
  tone?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate';
  className?: string;
}

export const ModalityFeeTooltip: React.FC<ModalityFeeTooltipProps> = ({
  modality,
  sampleAmountBRL,
  paymentMethodHint,
  affiliateCommissionPct = 30,
  triggerLabel,
  iconOnly = false,
  tone,
  className = '',
}) => {
  const {
    platformAdminSettings,
    appSubscription,
    monetizationModels,
    selectedCurrency,
  } = useMonetization();

  const isProActive = appSubscription.status === 'active' && appSubscription.tier !== 'free';
  const pixPct = platformAdminSettings.pixFeePercent;
  const cardPct = platformAdminSettings.platformFeePercent;
  const proPct = platformAdminSettings.proFeePercent;
  const adCreatorPct = monetizationModels.adRevenueShareCreatorPct;
  const adPlatformPct = 100 - adCreatorPct;

  // Component split: gateway underlying fee vs platform margin
  const pixGatewayPart = Math.min(pixPct, 0.7);
  const pixPlatformPart = Math.max(0, Number((pixPct - pixGatewayPart).toFixed(2)));

  const cardGatewayPart = Math.min(cardPct, 2.99);
  const cardPlatformPart = Math.max(0, Number((cardPct - cardGatewayPart).toFixed(2)));
  const cardFixedBRL = isProActive ? 0 : 0.5;

  const gross = sampleAmountBRL && sampleAmountBRL > 0 ? sampleAmountBRL : 100;
  const isPix = paymentMethodHint === 'pix' || modality === 'tip';
  const activePct = isProActive ? proPct : isPix ? pixPct : cardPct;
  const activeFixed = isProActive || isPix ? 0 : cardFixedBRL;
  const calculatedFeeBRL = Number(((gross * activePct) / 100 + activeFixed).toFixed(2));
  const calculatedNetBRL = Math.max(0, Number((gross - calculatedFeeBRL).toFixed(2)));

  const defaultBreakdown: FeeBreakdownLine[] = [
    {
      label: `Pix Instantâneo (Gateway ${pixGatewayPart.toFixed(2)}% + Plataforma ${pixPlatformPart.toFixed(2)}%)`,
      value: `${pixPct.toFixed(1)}% · ${formatCurrency(0, selectedCurrency)} fixo`,
      tone: 'emerald',
    },
    {
      label: `Cartão / Stripe / Express (Gateway ${cardGatewayPart.toFixed(2)}% + Plataforma ${cardPlatformPart.toFixed(2)}%)`,
      value: `${cardPct.toFixed(1)}% + ${formatCurrency(0.5, selectedCurrency)}`,
      tone: 'indigo',
    },
    {
      label: `Plano MonetizaHub Pro/Ultra (${isProActive ? 'Ativo na conta' : 'Opcional'})`,
      value: `${proPct.toFixed(1)}% · isento de taxa fixa`,
      tone: 'amber',
    },
  ];

  if (modality === 'ads') {
    const creatorShare = Number(((gross * adCreatorPct) / 100).toFixed(2));
    const platformShare = Math.max(0, Number((gross - creatorShare).toFixed(2)));
    return (
      <FeeTooltip
        title="Taxas & Divisão em Anúncios e Patrocínios"
        subtitle="Modelo de Revenue Share sem custo fixo por impressão"
        formula={`Líquido Criador = Receita Bruta × ${adCreatorPct}%`}
        breakdown={[
          {
            label: 'Repasse Direto ao Criador',
            value: `${adCreatorPct}%`,
            tone: 'emerald',
          },
          {
            label: 'Rede Anunciante + Mediação + Plataforma',
            value: `${adPlatformPct}%`,
            tone: 'neutral',
          },
          {
            label: 'Tarifa Fixa / Gateway sobre Impressões',
            value: `${formatCurrency(0, selectedCurrency)} (isento)`,
            tone: 'emerald',
          },
        ]}
        example={{
          label: `Simulação sobre ${formatCurrency(gross, selectedCurrency)} em Ads`,
          grossValue: formatCurrency(gross, selectedCurrency),
          feeValue: `${formatCurrency(platformShare, selectedCurrency)} (${adPlatformPct}%)`,
          netValue: `${formatCurrency(creatorShare, selectedCurrency)} (${adCreatorPct}%)`,
        }}
        note="Não há taxa de gateway nessa modalidade: a plataforma retém apenas a fatia configurada de mediação e auditoria antifraude."
        triggerLabel={triggerLabel}
        iconOnly={iconOnly}
        tone={tone || 'indigo'}
        className={className}
      />
    );
  }

  if (modality === 'affiliate') {
    const feeTotal = Number(((gross * cardPct) / 100 + 0.5).toFixed(2));
    const afterProcessing = Math.max(0, gross - feeTotal);
    const affiliateCut = Number(((afterProcessing * affiliateCommissionPct) / 100).toFixed(2));
    const creatorNet = Math.max(0, Number((afterProcessing - affiliateCut).toFixed(2)));
    return (
      <FeeTooltip
        title="Cálculo em Vendas via Afiliados"
        subtitle="Dedução de processamento antes do split com o parceiro"
        formula="Líquido = (Bruto − Gateway − Plataforma) × (1 − Comissão%)"
        breakdown={[
          {
            label: 'Pix (Gateway + Plataforma)',
            value: `${pixPct.toFixed(1)}%`,
            tone: 'emerald',
          },
          {
            label: 'Cartão / Express (Gateway + Plataforma)',
            value: `${cardPct.toFixed(1)}% + ${formatCurrency(0.5, selectedCurrency)}`,
            tone: 'indigo',
          },
          {
            label: `Comissão do Parceiro Afiliado`,
            value: `${affiliateCommissionPct}% sobre o saldo pós-taxa`,
            tone: 'amber',
          },
        ]}
        example={{
          label: `Venda de ${formatCurrency(gross, selectedCurrency)} (Cartão + ${affiliateCommissionPct}% Afiliado)`,
          grossValue: formatCurrency(gross, selectedCurrency),
          feeValue: `${formatCurrency(feeTotal + affiliateCut, selectedCurrency)} (Taxas + Comissão)`,
          netValue: formatCurrency(creatorNet, selectedCurrency),
        }}
        note="Cada parceiro pode ter um percentual de comissão próprio; a comissão é creditada automaticamente no ato da aprovação."
        triggerLabel={triggerLabel}
        iconOnly={iconOnly}
        tone={tone || 'emerald'}
        className={className}
      />
    );
  }

  if (modality === 'withdrawal') {
    return (
      <FeeTooltip
        title="Taxas de Saque & Liquidação Financeira"
        subtitle="Visa Direct · Multicaixa Express · PIX · Transferência Bancária"
        formula={`Valor Liquidado = Valor Solicitado − ${formatCurrency(0, selectedCurrency)}`}
        breakdown={[
          {
            label: 'Taxa da Plataforma no Saque',
            value: `0% · ${formatCurrency(0, selectedCurrency)}`,
            tone: 'emerald',
          },
          {
            label: 'Taxa do Canal de Liquidação (absorvida)',
            value: `${formatCurrency(0, selectedCurrency)}`,
            tone: 'emerald',
          },
          {
            label: 'Valor Mínimo por Resgate',
            value: formatCurrency(platformAdminSettings.minWithdrawalAmount, selectedCurrency),
            tone: 'neutral',
          },
          {
            label: 'Limite Diário de Segurança',
            value: formatCurrency(platformAdminSettings.maxDailyWithdrawalAmount, selectedCurrency),
            tone: 'neutral',
          },
        ]}
        example={{
          label: `Simulação de saque de ${formatCurrency(gross, selectedCurrency)}`,
          grossValue: formatCurrency(gross, selectedCurrency),
          feeValue: `${formatCurrency(0, selectedCurrency)} (Taxa Zero)`,
          netValue: formatCurrency(gross, selectedCurrency),
        }}
        note="As taxas de gateway + plataforma já são descontadas no momento da venda; ao sacar seu saldo disponível, você recebe 100% integral."
        triggerLabel={triggerLabel}
        iconOnly={iconOnly}
        tone={tone || 'emerald'}
        className={className}
      />
    );
  }

  const metaByModality: Record<
    Exclude<MonetizationModality, 'ads' | 'affiliate' | 'withdrawal'>,
    { title: string; subtitle: string; note: string; defaultTone: FeeTooltipProps['tone'] }
  > = {
    product_sale: {
      title: 'Taxas em Produtos Digitais & Vitrine',
      subtitle: 'Gateway Adquirente + Taxa da Plataforma aplicados por venda',
      note: 'Pagamentos via Pix isentam a tarifa fixa. Assinantes MonetizaHub Pro/Ultra pagam apenas a taxa reduzida unificada.',
      defaultTone: 'emerald',
    },
    subscription: {
      title: 'Taxas em Assinaturas VIP (MRR)',
      subtitle: 'Aplicadas a cada ciclo mensal ou anual cobrado do membro',
      note: 'Não há mensalidade fixa extra pela gestão de recorrência: incide apenas a taxa da transação (Gateway + Plataforma) quando a fatura é paga.',
      defaultTone: 'indigo',
    },
    tip: {
      title: 'Taxas em Gorjetas & Apoios Diretos',
      subtitle: 'Tarifa otimizada para micro-apoios instantâneos via Pix',
      note: 'Apoios via Pix têm taxa fixa zero, maximizando repasses mesmo em doações de baixo valor.',
      defaultTone: 'amber',
    },
    paywall_unlock: {
      title: 'Taxas em Paywall & Desbloqueio Avulso',
      subtitle: 'Microtransações para leitura única de artigos e relatórios',
      note: 'Assinantes VIP do nível exigido desbloqueiam sem cobrança avulsa; compras individuais seguem a tabela Gateway + Plataforma.',
      defaultTone: 'rose',
    },
    in_app_purchase: {
      title: 'Taxas em Compras In-App & Benefícios de Fã',
      subtitle: 'Ativação instantânea de emblemas, passes e recursos extras',
      note: 'Compras de seguidores na vitrine seguem Gateway + Plataforma. Upgrades Pro/Ultra da própria suíte reduzem suas taxas de venda para ' +
        `${proPct.toFixed(1)}%.`,
      defaultTone: 'amber',
    },
    all_summary: {
      title: 'Composição Geral das Taxas por Modalidade',
      subtitle: 'Cálculo transparente: Taxa do Gateway + Taxa da Plataforma',
      note: `Em Anúncios aplica-se divisão de ${adCreatorPct}% Criador / ${adPlatformPct}% Plataforma. Em Saques a taxa é 0% (grátis).`,
      defaultTone: 'slate',
    },
  };

  const meta = metaByModality[modality];

  const breakdownWithAdSummary: FeeBreakdownLine[] =
    modality === 'all_summary'
      ? [
          ...defaultBreakdown,
          {
            label: 'Anúncios & Patrocínios (Revenue Share)',
            value: `${adCreatorPct}% Criador · ${adPlatformPct}% Rede/Plat.`,
            tone: 'neutral',
          },
          {
            label: 'Saques (Visa Direct / Express / Pix / TED)',
            value: `0% · ${formatCurrency(0, selectedCurrency)}`,
            tone: 'emerald',
          },
        ]
      : defaultBreakdown;

  const formulaText = isProActive
    ? `Taxa Pro Ativa = ${proPct.toFixed(1)}% (Gateway + Plataforma) · R$ 0,00 fixo`
    : isPix
    ? `Taxa Pix = Gateway (${pixGatewayPart.toFixed(2)}%) + Plataforma (${pixPlatformPart.toFixed(2)}%) = ${pixPct.toFixed(1)}%`
    : `Taxa Cartão = Gateway (${cardGatewayPart.toFixed(2)}% + ${formatCurrency(0.5, selectedCurrency)}) + Plataforma (${cardPlatformPart.toFixed(2)}%)`;

  return (
    <FeeTooltip
      title={meta.title}
      subtitle={meta.subtitle}
      formula={formulaText}
      breakdown={breakdownWithAdSummary}
      example={
        modality === 'all_summary' && !sampleAmountBRL
          ? undefined
          : {
              label: `Exemplo nesta modalidade (${isProActive ? 'Plano Pro' : isPix ? 'Via Pix' : 'Via Cartão/Express'})`,
              grossValue: formatCurrency(gross, selectedCurrency),
              feeValue: formatCurrency(calculatedFeeBRL, selectedCurrency),
              netValue: formatCurrency(calculatedNetBRL, selectedCurrency),
            }
      }
      note={meta.note}
      triggerLabel={triggerLabel}
      iconOnly={iconOnly}
      tone={tone || meta.defaultTone}
      className={className}
    />
  );
};
