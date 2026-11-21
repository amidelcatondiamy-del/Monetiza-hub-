import React, { useState, useMemo } from 'react';
import {
  CreditCard,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { useMonetization } from '../../context/MonetizationContext';
import { ModalityFeeTooltip, FeeTooltip } from '../common/FeeTooltip';
import { TaxSimulatorCard } from './TaxSimulatorCard';

export const MonetizationCalculator: React.FC = () => {
  const {
    platformAdminSettings,
    appSubscription,
    monetizationModels,
    selectedCurrency,
  } = useMonetization();

  const [audienceSize, setAudienceSize] = useState<number>(15000);
  const [niche, setNiche] = useState<string>('finance');
  const [productPrice, setProductPrice] = useState<number>(97);
  const [subscriptionPrice, setSubscriptionPrice] = useState<number>(39);

  const niches = [
    { id: 'finance', name: 'Finanças & Negócios', multiplier: 1.4 },
    { id: 'tech', name: 'Tecnologia & Programação', multiplier: 1.3 },
    { id: 'fitness', name: 'Saúde & Fitness', multiplier: 1.0 },
    { id: 'career', name: 'Educação & Idiomas', multiplier: 1.1 },
    { id: 'lifestyle', name: 'Lifestyle & Entretenimento', multiplier: 0.8 },
  ];

  const currentNicheMultiplier =
    niches.find((n) => n.id === niche)?.multiplier || 1.0;

  const isProActive = appSubscription.status === 'active' && appSubscription.tier !== 'free';

  // Projections + exact fee breakdown per modality
  const {
    monthlyBuyers,
    subscribers,
    tipsCount,
    infoproductMonthly,
    infoproductFees,
    membershipsMonthly,
    membershipsFees,
    tipsMonthly,
    tipsFees,
    sponsorshipsMonthly,
    sponsorshipFees,
    totalMonthlyEstimate,
    totalMonthlyFees,
    totalMonthlyNet,
    totalAnnualNet,
  } = useMemo(() => {
    const cardRate = (isProActive ? platformAdminSettings.proFeePercent : platformAdminSettings.platformFeePercent) / 100;
    const pixRate = (isProActive ? platformAdminSettings.proFeePercent : platformAdminSettings.pixFeePercent) / 100;
    const fixedPerCardTx = isProActive ? 0 : 0.5;
    const adPlatformShareRate = (100 - monetizationModels.adRevenueShareCreatorPct) / 100;

    // 1. Infoproducts (approx 50% Pix, 50% Card)
    const buyersCount = Math.max(1, Math.round(audienceSize * 0.008 * currentNicheMultiplier));
    const infoGross = buyersCount * productPrice;
    const blendedInfoRate = (pixRate + cardRate) / 2;
    const infoFees = Number((infoGross * blendedInfoRate + (buyersCount * 0.5) * fixedPerCardTx).toFixed(2));

    // 2. Memberships (predominantly Card/Recurring)
    const subsCount = Math.max(2, Math.round(audienceSize * 0.004 * currentNicheMultiplier));
    const subsGross = subsCount * subscriptionPrice;
    const subsFees = Number((subsGross * cardRate + subsCount * fixedPerCardTx).toFixed(2));

    // 3. Tips via Pix
    const tipsCnt = Math.max(1, Math.round(audienceSize * 0.001));
    const tipsGross = tipsCnt * 25;
    const tipsFeeAmt = Number((tipsGross * pixRate).toFixed(2));

    // 4. Sponsorships & Ads (Revenue Share)
    const adsGross = (audienceSize / 1000) * 35 * currentNicheMultiplier;
    const adsFees = Number((adsGross * adPlatformShareRate).toFixed(2));

    const totalGross = infoGross + subsGross + tipsGross + adsGross;
    const totalFees = infoFees + subsFees + tipsFeeAmt + adsFees;
    const totalNet = Math.max(0, totalGross - totalFees);

    return {
      monthlyBuyers: buyersCount,
      subscribers: subsCount,
      tipsCount: tipsCnt,
      infoproductMonthly: infoGross,
      infoproductFees: infoFees,
      membershipsMonthly: subsGross,
      membershipsFees: subsFees,
      tipsMonthly: tipsGross,
      tipsFees: tipsFeeAmt,
      sponsorshipsMonthly: adsGross,
      sponsorshipFees: adsFees,
      totalMonthlyEstimate: totalGross,
      totalMonthlyFees: totalFees,
      totalMonthlyNet: totalNet,
      totalAnnualNet: totalNet * 12,
    };
  }, [
    audienceSize,
    currentNicheMultiplier,
    productPrice,
    subscriptionPrice,
    isProActive,
    platformAdminSettings.platformFeePercent,
    platformAdminSettings.pixFeePercent,
    platformAdminSettings.proFeePercent,
    monetizationModels.adRevenueShareCreatorPct,
  ]);

  const effectiveAvgFeePct =
    totalMonthlyEstimate > 0 ? ((totalMonthlyFees / totalMonthlyEstimate) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Simulador de Potencial de Receita
            </h2>
            <span className="text-xs text-emerald-400 font-medium">
              · Projeções em Tempo Real
            </span>
            <ModalityFeeTooltip
              modality="all_summary"
              triggerLabel="Como calculamos as taxas"
              tone="emerald"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Descubra quanto você fatura no bruto e no líquido após descontar taxas do gateway e da plataforma por modalidade.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 font-medium whitespace-nowrap shrink-0">
          <CreditCard className="w-4 h-4" />
          <span>Saques com Taxa Zero</span>
          <ModalityFeeTooltip modality="withdrawal" iconOnly tone="emerald" />
        </div>
      </div>

      {/* Grid: Controls & Outcome */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-6">
          {/* Audience Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-white">
                Tamanho da Audiência (Seguidores / Inscritos)
              </label>
              <span className="text-base font-extrabold text-emerald-400 font-mono tabular-nums">
                {formatNumber(audienceSize)}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="250000"
              step="1000"
              value={audienceSize}
              onChange={(e) => setAudienceSize(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono tabular-nums mt-1">
              <span>1.000</span>
              <span>50.000</span>
              <span>100.000</span>
              <span>250.000+</span>
            </div>
          </div>

          {/* Niche selector */}
          <div>
            <label className="block text-xs font-bold text-white mb-2">
              Nicho de Atuação
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {niches.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNiche(n.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                    niche === n.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {n.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product & Membership inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1">
                <span>Preço Médio do Infoproduto</span>
                <ModalityFeeTooltip
                  modality="product_sale"
                  sampleAmountBRL={productPrice}
                  iconOnly
                />
              </label>
              <input
                type="number"
                value={productPrice}
                onChange={(e) => setProductPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1">
                <span>Mensalidade do Clube VIP (/mês)</span>
                <ModalityFeeTooltip
                  modality="subscription"
                  sampleAmountBRL={subscriptionPrice}
                  iconOnly
                />
              </label>
              <input
                type="number"
                value={subscriptionPrice}
                onChange={(e) => setSubscriptionPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Projected Earnings Panel */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Potencial Líquido Estimado
              </span>
              <FeeTooltip
                title="Detalhamento Líquido da Simulação"
                subtitle="Receita Bruta menos taxas do Gateway e da Plataforma"
                formula="Líquido = Bruto Total − (Taxas Transação + Fatia Ads)"
                breakdown={[
                  {
                    label: `Infoprodutos (${monthlyBuyers} vendas/mês)`,
                    value: `-${formatCurrency(infoproductFees, selectedCurrency)}`,
                    tone: 'rose',
                  },
                  {
                    label: `Assinaturas VIP (${subscribers} assinantes)`,
                    value: `-${formatCurrency(membershipsFees, selectedCurrency)}`,
                    tone: 'rose',
                  },
                  {
                    label: `Gorjetas Pix (${tipsCount} apoios)`,
                    value: `-${formatCurrency(tipsFees, selectedCurrency)}`,
                    tone: 'rose',
                  },
                  {
                    label: `Ads / Patrocínios (${100 - monetizationModels.adRevenueShareCreatorPct}% rede)`,
                    value: `-${formatCurrency(sponsorshipFees, selectedCurrency)}`,
                    tone: 'rose',
                  },
                ]}
                example={{
                  label: 'Resumo Mensal Consolidado',
                  grossValue: formatCurrency(totalMonthlyEstimate, selectedCurrency),
                  feeValue: `${formatCurrency(totalMonthlyFees, selectedCurrency)} (${effectiveAvgFeePct}%)`,
                  netValue: formatCurrency(totalMonthlyNet, selectedCurrency),
                }}
                note="Os valores líquidos consideram taxas configuradas atualmente para Pix, Cartão/Express e divisão de anúncios."
                triggerLabel="Ver dedução"
                tone="emerald"
              />
            </div>
            <div className="text-3xl font-black text-white font-mono tabular-nums mt-2">
              {formatCurrency(totalMonthlyNet, selectedCurrency)}
              <span className="text-xs text-slate-400 font-normal"> /mês</span>
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums mt-1">
              Bruto: {formatCurrency(totalMonthlyEstimate, selectedCurrency)} · Anual líquido:{' '}
              <strong className="text-emerald-400">{formatCurrency(totalAnnualNet, selectedCurrency)}</strong>
            </div>

            <div className="mt-5 space-y-3 pt-4 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span>Infoprodutos & E-books</span>
                  <ModalityFeeTooltip
                    modality="product_sale"
                    sampleAmountBRL={productPrice}
                    iconOnly
                  />
                </span>
                <div className="text-right font-mono tabular-nums">
                  <div className="font-bold text-white">
                    {formatCurrency(infoproductMonthly, selectedCurrency)}
                  </div>
                  <div className="text-[10px] text-rose-400/90">
                    -{formatCurrency(infoproductFees, selectedCurrency)} taxas
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span>Clube de Membros (MRR)</span>
                  <ModalityFeeTooltip
                    modality="subscription"
                    sampleAmountBRL={subscriptionPrice}
                    iconOnly
                  />
                </span>
                <div className="text-right font-mono tabular-nums">
                  <div className="font-bold text-white">
                    {formatCurrency(membershipsMonthly, selectedCurrency)}
                  </div>
                  <div className="text-[10px] text-rose-400/90">
                    -{formatCurrency(membershipsFees, selectedCurrency)} taxas
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span>Gorjetas & Apoios Pix</span>
                  <ModalityFeeTooltip
                    modality="tip"
                    sampleAmountBRL={25}
                    paymentMethodHint="pix"
                    iconOnly
                  />
                </span>
                <div className="text-right font-mono tabular-nums">
                  <div className="font-bold text-white">
                    {formatCurrency(tipsMonthly, selectedCurrency)}
                  </div>
                  <div className="text-[10px] text-rose-400/90">
                    -{formatCurrency(tipsFees, selectedCurrency)} taxas
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span>Patrocínios & Ads</span>
                  <ModalityFeeTooltip
                    modality="ads"
                    sampleAmountBRL={sponsorshipsMonthly}
                    iconOnly
                  />
                </span>
                <div className="text-right font-mono tabular-nums">
                  <div className="font-bold text-white">
                    {formatCurrency(sponsorshipsMonthly, selectedCurrency)}
                  </div>
                  <div className="text-[10px] text-rose-400/90">
                    -{formatCurrency(sponsorshipFees, selectedCurrency)} rede
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
            Taxa média combinada desta simulação:{' '}
            <strong className="text-emerald-400 font-mono tabular-nums">{effectiveAvgFeePct}%</strong>
            {isProActive
              ? ' (benefício do Plano Pro ativo reduzindo tarifas).'
              : ' (ative o Plano Pro para isenção da taxa fixa por venda).'}
          </div>
        </div>
      </div>

      {/* Simulador Fiscal (Retenção de IR / IVA e Receita Líquida Real) */}
      <TaxSimulatorCard
        projectedGrossMonthlyBRL={totalMonthlyEstimate}
        projectedFeesMonthlyBRL={totalMonthlyFees}
        currency={selectedCurrency}
      />
    </div>
  );
};
