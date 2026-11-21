import React, { useState, useMemo } from 'react';
import { Calculator, Landmark, RotateCcw, ArrowRight } from 'lucide-react';
import { Currency } from '../../types/monetization';
import { formatCurrency } from '../../utils/formatters';
import { FeeTooltip } from '../common/FeeTooltip';

interface TaxSimulatorCardProps {
  projectedGrossMonthlyBRL: number;
  projectedFeesMonthlyBRL: number;
  currency: Currency;
}

type TaxProfileId =
  | 'br_simples'
  | 'br_autonomo'
  | 'ao_geral'
  | 'ao_simplificado'
  | 'custom';

type IncomeTaxBaseMode = 'gross' | 'after_platform_fees';

interface TaxPreset {
  id: TaxProfileId;
  label: string;
  regionLabel: string;
  description: string;
  defaultIrPercent: number;
  defaultIvaPercent: number;
  defaultIrBase: IncomeTaxBaseMode;
}

const TAX_PRESETS: TaxPreset[] = [
  {
    id: 'br_simples',
    label: 'Simples Nacional (BR)',
    regionLabel: 'Brasil · PJ',
    description: 'Alíquota unificada referência Anexo III para serviços e infoprodutos (IRPJ/CSLL + tributos municipais/consumo).',
    defaultIrPercent: 4.0,
    defaultIvaPercent: 2.0,
    defaultIrBase: 'gross',
  },
  {
    id: 'br_autonomo',
    label: 'Autônomo / IRPF (BR)',
    regionLabel: 'Brasil · PF',
    description: 'Retenção estimada de IRPF na fonte / Carnê-Leão sobre rendimento após taxas + ISS local.',
    defaultIrPercent: 15.0,
    defaultIvaPercent: 2.0,
    defaultIrBase: 'after_platform_fees',
  },
  {
    id: 'ao_geral',
    label: 'Regime Geral (AO)',
    regionLabel: 'Angola · IRT + IVA',
    description: 'Retenção na fonte de Imposto Industrial / IRT (6,5%) combinada com IVA padrão de 14% em Angola.',
    defaultIrPercent: 6.5,
    defaultIvaPercent: 14.0,
    defaultIrBase: 'gross',
  },
  {
    id: 'ao_simplificado',
    label: 'Regime Simplificado (AO)',
    regionLabel: 'Angola · PME',
    description: 'Tributação simplificada de 7% sobre o volume de faturação sem liquidação separada de IVA.',
    defaultIrPercent: 7.0,
    defaultIvaPercent: 0.0,
    defaultIrBase: 'gross',
  },
  {
    id: 'custom',
    label: 'Alíquota Personalizada',
    regionLabel: 'Livre',
    description: 'Defina manualmente os percentuais de retenção de IR e IVA/ISS conforme seu contador.',
    defaultIrPercent: 10.0,
    defaultIvaPercent: 5.0,
    defaultIrBase: 'after_platform_fees',
  },
];

export const TaxSimulatorCard: React.FC<TaxSimulatorCardProps> = ({
  projectedGrossMonthlyBRL,
  projectedFeesMonthlyBRL,
  currency,
}) => {
  const [revenueSource, setRevenueSource] = useState<'calculator' | 'custom'>('calculator');
  const [customGrossInput, setCustomGrossInput] = useState<number>(12000);
  const [selectedProfile, setSelectedProfile] = useState<TaxProfileId>(
    currency === 'AOA' ? 'ao_geral' : 'br_simples'
  );
  const [irPercent, setIrPercent] = useState<number>(currency === 'AOA' ? 6.5 : 4.0);
  const [ivaPercent, setIvaPercent] = useState<number>(currency === 'AOA' ? 14.0 : 2.0);
  const [irBaseMode, setIrBaseMode] = useState<IncomeTaxBaseMode>('gross');
  const [deductOptionalExpensesBRL, setDeductOptionalExpensesBRL] = useState<number>(0);

  const handleSelectProfile = (preset: TaxPreset) => {
    setSelectedProfile(preset.id);
    if (preset.id !== 'custom') {
      setIrPercent(preset.defaultIrPercent);
      setIvaPercent(preset.defaultIvaPercent);
      setIrBaseMode(preset.defaultIrBase);
    }
  };

  const handleReset = () => {
    const fallback = TAX_PRESETS.find((p) => p.id === (currency === 'AOA' ? 'ao_geral' : 'br_simples'))!;
    setRevenueSource('calculator');
    setSelectedProfile(fallback.id);
    setIrPercent(fallback.defaultIrPercent);
    setIvaPercent(fallback.defaultIvaPercent);
    setIrBaseMode(fallback.defaultIrBase);
    setDeductOptionalExpensesBRL(0);
  };

  // Effective fee ratio derived from main MonetizationCalculator simulation
  const impliedFeeRate = useMemo(() => {
    if (projectedGrossMonthlyBRL <= 0) return 0.049;
    return Math.min(0.35, Math.max(0, projectedFeesMonthlyBRL / projectedGrossMonthlyBRL));
  }, [projectedGrossMonthlyBRL, projectedFeesMonthlyBRL]);

  const calculation = useMemo(() => {
    const grossMonthly =
      revenueSource === 'calculator'
        ? Math.max(0, projectedGrossMonthlyBRL)
        : Math.max(0, Number.isFinite(customGrossInput) ? customGrossInput : 0);

    const platformFees =
      revenueSource === 'calculator'
        ? Math.max(0, projectedFeesMonthlyBRL)
        : Number((grossMonthly * impliedFeeRate).toFixed(2));

    const netBeforeTax = Math.max(0, grossMonthly - platformFees);
    const deductibleOpCost = Math.max(0, Number.isFinite(deductOptionalExpensesBRL) ? deductOptionalExpensesBRL : 0);

    // IVA / Indirect consumption tax applies on gross revenue
    const safeIvaPct = Math.max(0, Math.min(40, Number.isFinite(ivaPercent) ? ivaPercent : 0));
    const safeIrPct = Math.max(0, Math.min(50, Number.isFinite(irPercent) ? irPercent : 0));

    const ivaAmount = Number(((grossMonthly * safeIvaPct) / 100).toFixed(2));

    // IR base: either gross or net after platform fees & optional deductible costs
    const irBase =
      irBaseMode === 'gross'
        ? Math.max(0, grossMonthly - deductibleOpCost)
        : Math.max(0, netBeforeTax - deductibleOpCost);

    const irAmount = Number(((irBase * safeIrPct) / 100).toFixed(2));
    const totalTaxes = Number((ivaAmount + irAmount).toFixed(2));
    const netFinalMonthly = Math.max(0, Number((netBeforeTax - totalTaxes).toFixed(2)));

    const effectiveTaxPct = grossMonthly > 0 ? (totalTaxes / grossMonthly) * 100 : 0;
    const totalDeductionPct = grossMonthly > 0 ? ((platformFees + totalTaxes) / grossMonthly) * 100 : 0;
    const keepMarginPct = grossMonthly > 0 ? (netFinalMonthly / grossMonthly) * 100 : 0;

    // Distribution bar segments (% of gross)
    const feesBarPct = grossMonthly > 0 ? Math.min(100, (platformFees / grossMonthly) * 100) : 0;
    const ivaBarPct = grossMonthly > 0 ? Math.min(100 - feesBarPct, (ivaAmount / grossMonthly) * 100) : 0;
    const irBarPct =
      grossMonthly > 0 ? Math.min(100 - feesBarPct - ivaBarPct, (irAmount / grossMonthly) * 100) : 0;
    const netBarPct = Math.max(0, 100 - feesBarPct - ivaBarPct - irBarPct);

    return {
      grossMonthly,
      platformFees,
      netBeforeTax,
      ivaAmount,
      irAmount,
      totalTaxes,
      netFinalMonthly,
      effectiveTaxPct,
      totalDeductionPct,
      keepMarginPct,
      feesBarPct,
      ivaBarPct,
      irBarPct,
      netBarPct,
      annualGross: grossMonthly * 12,
      annualTaxes: totalTaxes * 12,
      annualNet: netFinalMonthly * 12,
    };
  }, [
    revenueSource,
    projectedGrossMonthlyBRL,
    projectedFeesMonthlyBRL,
    customGrossInput,
    impliedFeeRate,
    ivaPercent,
    irPercent,
    irBaseMode,
    deductOptionalExpensesBRL,
  ]);

  const activePreset = TAX_PRESETS.find((p) => p.id === selectedProfile) || TAX_PRESETS[0];

  return (
    <section
      aria-labelledby="tax-simulator-heading"
      className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              id="tax-simulator-heading"
              className="text-base font-bold text-white tracking-tight flex items-center gap-2"
            >
              <Landmark className="w-4 h-4 text-amber-400" />
              <span>Simulador Fiscal (IR & IVA)</span>
            </h3>
            <span className="text-xs text-slate-400">
              · Estimativa de retenção tributária e receita líquida real
            </span>
            <FeeTooltip
              title="Como o Simulador Fiscal calcula IR e IVA"
              subtitle="Separação entre taxas transacionais e tributos fiscais"
              formula="Receita Líquida Final = Bruto − Taxas Gateway/Plat. − IVA − IR"
              breakdown={[
                {
                  label: 'IVA / ISS (Consumo)',
                  value: `${ivaPercent.toFixed(1)}% sobre o faturamento bruto`,
                  tone: 'amber',
                },
                {
                  label: 'IR / IRT / Simples (Renda)',
                  value: `${irPercent.toFixed(1)}% sobre ${
                    irBaseMode === 'gross' ? 'faturamento bruto' : 'saldo pós-taxas'
                  }`,
                  tone: 'rose',
                },
                {
                  label: 'Carga Tributária Efetiva',
                  value: `${calculation.effectiveTaxPct.toFixed(1)}% do bruto`,
                  tone: 'neutral',
                },
              ]}
              example={{
                label: 'Resumo da Simulação Atual',
                grossValue: formatCurrency(calculation.grossMonthly, currency),
                feeValue: formatCurrency(calculation.platformFees + calculation.totalTaxes, currency),
                netValue: formatCurrency(calculation.netFinalMonthly, currency),
              }}
              note="Os percentuais podem ser ajustados livremente para refletir o enquadramento fiscal da sua empresa ou país (Brasil ou Angola)."
              triggerLabel="Memória de cálculo"
              tone="amber"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Estime quanto fica retido em impostos sobre renda (IR/IRT) e consumo (IVA/ISS) além das taxas da plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Gross Source Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setRevenueSource('calculator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                revenueSource === 'calculator'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Usar Faturamento Simulado
            </button>
            <button
              type="button"
              onClick={() => setRevenueSource('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                revenueSource === 'custom'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Digitar Bruto Manual
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            title="Restaurar alíquotas padrão"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Resetar</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Controls (2 cols) + Net Take-Home Outcome (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls & Tax Regime Presets */}
        <div className="lg:col-span-2 space-y-5">
          {/* Gross Input Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Faturamento Bruto Mensal Base (em BRL base)
              </label>
              {revenueSource === 'calculator' ? (
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Sincronizado da simulação</span>
                  <span className="font-mono tabular-nums text-sm font-bold text-emerald-400">
                    {formatCurrency(calculation.grossMonthly, currency)}
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={customGrossInput}
                    onChange={(e) => setCustomGrossInput(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white font-mono tabular-nums focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[5000, 15000, 35000, 80000].map((presetAmt) => (
                      <button
                        key={presetAmt}
                        type="button"
                        onClick={() => setCustomGrossInput(presetAmt)}
                        className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono tabular-nums text-slate-300 cursor-pointer"
                      >
                        {formatCurrency(presetAmt, currency)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Despesas Dedutíveis / Custos Operacionais (opcional)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={deductOptionalExpensesBRL}
                onChange={(e) => setDeductOptionalExpensesBRL(Math.max(0, Number(e.target.value)))}
                placeholder="Ex: anúncios, ferramentas"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white font-mono tabular-nums focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Abatido apenas da base do IR quando aplicável ({formatCurrency(deductOptionalExpensesBRL, currency)}).
              </p>
            </div>
          </div>

          {/* Tax Regime Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-white">
                Enquadramento / Regime Fiscal de Referência
              </label>
              <span className="text-[11px] text-slate-400">{activePreset.regionLabel}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {TAX_PRESETS.map((preset) => {
                const active = selectedProfile === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectProfile(preset)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      active
                        ? 'bg-amber-500/10 border-amber-500/60 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white">{preset.label}</div>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                      IR {preset.defaultIrPercent}% · IVA {preset.defaultIvaPercent}%
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{activePreset.description}</p>
          </div>

          {/* Fine-grain Sliders for IR and IVA + IR Base Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Alíquota de IR / IRT (%)
                </label>
                <span className="text-sm font-bold text-orange-400 font-mono tabular-nums">
                  {irPercent.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                step="0.5"
                value={irPercent}
                onChange={(e) => {
                  setSelectedProfile('custom');
                  setIrPercent(Number(e.target.value));
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>0%</span>
                <span>Base: {irBaseMode === 'gross' ? 'Bruto' : 'Pós-taxas'}</span>
                <span>35%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Alíquota de IVA / ISS (%)
                </label>
                <span className="text-sm font-bold text-amber-400 font-mono tabular-nums">
                  {ivaPercent.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={ivaPercent}
                onChange={(e) => {
                  setSelectedProfile('custom');
                  setIvaPercent(Number(e.target.value));
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>0% (Isento)</span>
                <span>Sobre Bruto</span>
                <span>25%</span>
              </div>
            </div>
          </div>

          {/* Calculation Base Selector for IR */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-300 font-medium">Base de incidência do IR / IRT:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setIrBaseMode('gross')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  irBaseMode === 'gross'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Faturamento Bruto
              </button>
              <button
                type="button"
                onClick={() => setIrBaseMode('after_platform_fees')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  irBaseMode === 'after_platform_fees'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Líquido Pós-Taxas
              </button>
            </div>
          </div>

          {/* Visual Stacked Breakdown Bar (100% of Gross Revenue) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Composição do Faturamento Bruto (100%)
              </span>
              <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                Margem final no bolso: {calculation.keepMarginPct.toFixed(1)}%
              </span>
            </div>

            <div className="h-3.5 w-full rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex">
              {calculation.netBarPct > 0 && (
                <div
                  style={{ width: `${calculation.netBarPct}%` }}
                  className="bg-emerald-500 h-full transition-all duration-300"
                  title={`Receita Líquida Final: ${formatCurrency(calculation.netFinalMonthly, currency)}`}
                />
              )}
              {calculation.ivaBarPct > 0 && (
                <div
                  style={{ width: `${calculation.ivaBarPct}%` }}
                  className="bg-amber-500 h-full transition-all duration-300"
                  title={`Retenção IVA / ISS: ${formatCurrency(calculation.ivaAmount, currency)}`}
                />
              )}
              {calculation.irBarPct > 0 && (
                <div
                  style={{ width: `${calculation.irBarPct}%` }}
                  className="bg-orange-500 h-full transition-all duration-300"
                  title={`Retenção IR / IRT: ${formatCurrency(calculation.irAmount, currency)}`}
                />
              )}
              {calculation.feesBarPct > 0 && (
                <div
                  style={{ width: `${calculation.feesBarPct}%` }}
                  className="bg-rose-500 h-full transition-all duration-300"
                  title={`Taxas Gateway + Plataforma: ${formatCurrency(calculation.platformFees, currency)}`}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                <span>Líquido Real ({calculation.keepMarginPct.toFixed(1)}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                <span>IVA / ISS ({ivaPercent.toFixed(1)}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
                <span>IR / IRT ({calculation.grossMonthly > 0 ? ((calculation.irAmount / calculation.grossMonthly) * 100).toFixed(1) : '0.0'}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                <span>Taxas Plat./Gateway ({calculation.feesBarPct.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Fiscal Deduction Summary Panel */}
        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Receita Líquida Pós-Impostos
                </span>
                <Calculator className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono tabular-nums mt-2">
                {formatCurrency(calculation.netFinalMonthly, currency)}
                <span className="text-xs font-normal text-slate-400"> /mês</span>
              </div>
              <div className="text-xs text-slate-400 font-mono tabular-nums mt-1">
                Projeção anual líquida:{' '}
                <strong className="text-emerald-400">
                  {formatCurrency(calculation.annualNet, currency)}
                </strong>
              </div>
            </div>

            {/* Step-by-step Fiscal Waterfall */}
            <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Faturamento Bruto Mensal</span>
                <span className="font-mono tabular-nums font-bold text-white">
                  {formatCurrency(calculation.grossMonthly, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">(−) Taxas Gateway & Plataforma</span>
                <span className="font-mono tabular-nums font-semibold text-rose-400">
                  -{formatCurrency(calculation.platformFees, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Subtotal Pós-Taxas</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {formatCurrency(calculation.netBeforeTax, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">(−) Retenção IVA / ISS ({ivaPercent.toFixed(1)}%)</span>
                <span className="font-mono tabular-nums font-semibold text-amber-400">
                  -{formatCurrency(calculation.ivaAmount, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">(−) Retenção IR / IRT ({irPercent.toFixed(1)}%)</span>
                <span className="font-mono tabular-nums font-semibold text-orange-400">
                  -{formatCurrency(calculation.irAmount, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 font-bold">
                <span className="text-amber-300">Total Retido em Impostos (IR+IVA)</span>
                <span className="font-mono tabular-nums text-amber-300">
                  -{formatCurrency(calculation.totalTaxes, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Annualized Tax Reserve Recommendation */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span>Reserva Fiscal Recomendada</span>
                <span className="font-mono tabular-nums text-amber-300">
                  {calculation.effectiveTaxPct.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Separe{' '}
                <strong className="text-white font-mono tabular-nums">
                  {formatCurrency(calculation.totalTaxes, currency)}/mês
                </strong>{' '}
                (<ArrowRight className="w-3 h-3 inline text-slate-500" />{' '}
                <span className="font-mono tabular-nums text-slate-300">
                  {formatCurrency(calculation.annualTaxes, currency)}/ano
                </span>
                ) antes de sacar seus rendimentos.
              </p>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Simulação orientativa para planejamento financeiro. Confirme as faixas exatas de IR e IVA com seu contador.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
