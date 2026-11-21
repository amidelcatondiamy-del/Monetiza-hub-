import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { PriceExperiment, PriceExperimentVariant } from '../../types/monetization';

interface ExperimentsTabProps {
  onNotify: (msg: string) => void;
}

/**
 * Computes two-proportion z-test confidence comparing a test variant against control.
 */
const computeConfidencePct = (
  control: PriceExperimentVariant,
  variant: PriceExperimentVariant
): number => {
  if (variant.id === control.id || control.views < 20 || variant.views < 20) {
    return 0;
  }
  const p1 = control.conversions / control.views;
  const p2 = variant.conversions / variant.views;
  const pooled = (control.conversions + variant.conversions) / (control.views + variant.views);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / control.views + 1 / variant.views));
  if (se === 0) return 0;
  const z = Math.abs(p2 - p1) / se;
  // Approximate normal CDF for common z thresholds cleanly
  if (z >= 2.58) return 99;
  if (z >= 1.96) return 95;
  if (z >= 1.645) return 90;
  if (z >= 1.28) return 80;
  return Math.min(79, Math.round(z * 50));
};

export const ExperimentsTab: React.FC<ExperimentsTabProps> = ({ onNotify }) => {
  const {
    products,
    priceExperiments,
    createPriceExperiment,
    togglePriceExperimentStatus,
    simulatePriceExperimentTraffic,
    applyExperimentWinningPrice,
    deletePriceExperiment,
    selectedCurrency,
  } = useMonetization();

  // New Experiment Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const defaultProduct = products[0];
  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProduct?.id || '');
  const [variantBPrice, setVariantBPrice] = useState<string>(
    defaultProduct ? Math.max(5, Math.round(defaultProduct.price * 0.8)).toFixed(2) : '77.00'
  );
  const [variantBLabel, setVariantBLabel] = useState<string>('Desconto Estratégico (-20%)');
  const [includeVariantC, setIncludeVariantC] = useState<boolean>(true);
  const [variantCPrice, setVariantCPrice] = useState<string>(
    defaultProduct ? Math.round(defaultProduct.price * 1.25).toFixed(2) : '120.00'
  );
  const [variantCLabel, setVariantCLabel] = useState<string>('Posicionamento Premium (+25%)');

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setVariantBPrice(Math.max(5, Math.round(prod.price * 0.8)).toFixed(2));
      setVariantCPrice(Math.round(prod.price * 1.25).toFixed(2));
    }
  };

  const handleCreateExperiment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const bPrice = Math.max(1, parseFloat(variantBPrice) || selectedProduct.price * 0.8);
    const variants: Array<{ label: string; price: number; isControl?: boolean }> = [
      {
        label: 'Controle (Atual)',
        price: selectedProduct.price,
        isControl: true,
      },
      {
        label: variantBLabel.trim() || 'Variante B',
        price: bPrice,
      },
    ];

    if (includeVariantC) {
      const cPrice = Math.max(1, parseFloat(variantCPrice) || selectedProduct.price * 1.25);
      variants.push({
        label: variantCLabel.trim() || 'Variante C',
        price: cPrice,
      });
    }

    const res = createPriceExperiment({
      productId: selectedProduct.id,
      variants,
    });

    if (res.success) {
      setShowBuilder(false);
      onNotify(`Experimento de preço iniciado para "${selectedProduct.title}".`);
    }
  };

  // Global summary KPIs across all experiments
  const summary = useMemo(() => {
    const runningCount = priceExperiments.filter((e) => e.status === 'running').length;
    let totalViews = 0;
    let bestConvLift = 0;
    let bestRpvLift = 0;

    priceExperiments.forEach((exp) => {
      const control = exp.variants.find((v) => v.isControl) || exp.variants[0];
      if (!control || control.views === 0) return;
      const controlConv = control.conversions / control.views;
      const controlRpv = (control.conversions * control.price) / control.views;

      exp.variants.forEach((v) => {
        totalViews += v.views;
        if (v.id === control.id || v.views === 0) return;
        const conv = v.conversions / v.views;
        const rpv = (v.conversions * v.price) / v.views;
        if (controlConv > 0) {
          const convLift = ((conv - controlConv) / controlConv) * 100;
          if (convLift > bestConvLift) bestConvLift = convLift;
        }
        if (controlRpv > 0) {
          const rpvLift = ((rpv - controlRpv) / controlRpv) * 100;
          if (rpvLift > bestRpvLift) bestRpvLift = rpvLift;
        }
      });
    });

    return {
      runningCount,
      totalCount: priceExperiments.length,
      totalViews,
      bestConvLift,
      bestRpvLift,
    };
  }, [priceExperiments]);

  const getWinnerVariantId = (exp: PriceExperiment): string => {
    let bestId = exp.variants[0]?.id || '';
    let bestRpv = -1;
    exp.variants.forEach((v) => {
      const rpv = v.views > 0 ? (v.conversions * v.price) / v.views : 0;
      if (rpv > bestRpv) {
        bestRpv = rpv;
        bestId = v.id;
      }
    });
    return bestId;
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Summary Header */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Experimentos de Precificação (Testes A/B de Conversão)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                Teste múltiplos pontos de preço para seus produtos digitais, compare a taxa de conversão e a receita por visitante em tempo real e aplique o preço vencedor com um clique.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowBuilder((prev) => !prev)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Experimento de Preço</span>
          </button>
        </div>

        {/* Tabular KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Testes em Execução
            </span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
              {summary.runningCount} / {summary.totalCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Experimentos configurados</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Melhor Ganho de Conversão
            </span>
            <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
              +{summary.bestConvLift.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Sobre o preço de controle</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Melhor Receita / Visita (RPV)
            </span>
            <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums mt-1">
              +{summary.bestRpvLift.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Impacto líquido por acesso</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Amostra Total Avaliada
            </span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
              {formatNumber(summary.totalViews)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Visualizações distribuídas</div>
          </div>
        </div>
      </div>

      {/* New Price Experiment Builder */}
      {showBuilder && (
        <form
          onSubmit={handleCreateExperiment}
          className="bg-slate-900/95 rounded-2xl p-6 border border-sky-500/40 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-white">
                Configurar Novo Teste de Precificação
              </h4>
              <p className="text-xs text-slate-400">
                O preço atual do produto será usado como grupo de Controle automaticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Produto Digital Testado
              </label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {products.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.title} ({formatCurrency(prod.price, selectedCurrency)})
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <div className="text-[11px] text-slate-400 mt-1.5 font-mono tabular-nums">
                  Controle: {formatCurrency(selectedProduct.price, selectedCurrency)} • Conversão base:{' '}
                  {selectedProduct.viewsCount > 0
                    ? ((selectedProduct.salesCount / selectedProduct.viewsCount) * 100).toFixed(1)
                    : '6.0'}
                  %
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300">
                Variante B (Rótulo & Preço em {selectedCurrency})
              </label>
              <input
                type="text"
                required
                value={variantBLabel}
                onChange={(e) => setVariantBLabel(e.target.value)}
                placeholder="Ex: Ponto Acessível"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={variantBPrice}
                onChange={(e) => setVariantBPrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300">
                  Variante C (Opcional)
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVariantC}
                    onChange={(e) => setIncludeVariantC(e.target.checked)}
                    className="w-3.5 h-3.5 accent-sky-500 rounded cursor-pointer"
                  />
                  <span>Incluir 3º preço</span>
                </label>
              </div>
              <input
                type="text"
                disabled={!includeVariantC}
                value={variantCLabel}
                onChange={(e) => setVariantCLabel(e.target.value)}
                placeholder="Ex: Ancoragem Premium"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-40 focus:outline-none focus:border-sky-500"
              />
              <input
                type="number"
                step="0.01"
                min="1"
                disabled={!includeVariantC}
                value={variantCPrice}
                onChange={(e) => setVariantCPrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono tabular-nums disabled:opacity-40 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              Iniciar Experimento A/B
            </button>
          </div>
        </form>
      )}

      {/* Experiments List */}
      {priceExperiments.length === 0 ? (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-10 text-center space-y-3">
          <FlaskConical className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="text-sm font-bold text-white">Nenhum experimento de preço ativo</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Crie seu primeiro teste A/B para descobrir qual faixa de preço gera a melhor conversão e maior receita por visitante.
          </p>
          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
          >
            Criar Primeiro Experimento
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {priceExperiments.map((exp) => {
            const control = exp.variants.find((v) => v.isControl) || exp.variants[0];
            const controlConvRate = control && control.views > 0 ? (control.conversions / control.views) * 100 : 0;
            const controlRpv = control && control.views > 0 ? (control.conversions * control.price) / control.views : 0;
            const winnerId = getWinnerVariantId(exp);
            const maxConvRate = Math.max(
              1,
              ...exp.variants.map((v) => (v.views > 0 ? (v.conversions / v.views) * 100 : 0))
            );
            const maxRpv = Math.max(
              1,
              ...exp.variants.map((v) => (v.views > 0 ? (v.conversions * v.price) / v.views : 0))
            );

            return (
              <div
                key={exp.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden"
              >
                {/* Experiment Header */}
                <div className="p-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-950/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {exp.productTitle}
                      </h4>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          exp.status === 'running'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : exp.status === 'completed'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/25'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {exp.status === 'running'
                          ? 'Em Execução'
                          : exp.status === 'completed'
                          ? 'Preço Aplicado'
                          : 'Pausado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>Divisão de tráfego: {exp.trafficSplitLabel}</span>
                      <span>•</span>
                      <span>Iniciado em {formatDate(exp.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {exp.status === 'running' && (
                      <button
                        type="button"
                        onClick={() => {
                          simulatePriceExperimentTraffic(exp.id, 100);
                          onNotify('Novo lote de +100 visitas por variante registrado.');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Simular +100 Visitas/Var</span>
                      </button>
                    )}

                    {exp.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => togglePriceExperimentStatus(exp.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        {exp.status === 'running' ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pausar</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Retomar</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        deletePriceExperiment(exp.id);
                        onNotify('Experimento removido.');
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer"
                      title="Excluir experimento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Variants Side-by-Side Comparison */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {exp.variants.map((variant) => {
                    const convRate = variant.views > 0 ? (variant.conversions / variant.views) * 100 : 0;
                    const revenue = variant.conversions * variant.price;
                    const rpv = variant.views > 0 ? revenue / variant.views : 0;
                    const convDeltaPct =
                      controlConvRate > 0 ? ((convRate - controlConvRate) / controlConvRate) * 100 : 0;
                    const rpvDeltaPct =
                      controlRpv > 0 ? ((rpv - controlRpv) / controlRpv) * 100 : 0;
                    const confidence = control ? computeConfidencePct(control, variant) : 0;
                    const isWinner = variant.id === winnerId;
                    const isApplied = exp.appliedVariantId === variant.id;

                    return (
                      <div
                        key={variant.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 ${
                          isApplied
                            ? 'bg-emerald-950/20 border-emerald-500/50'
                            : isWinner
                            ? 'bg-slate-950/90 border-sky-500/50'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Variant Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                <span>{variant.label}</span>
                                {isWinner && (
                                  <span className="text-[10px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    Melhor RPV
                                  </span>
                                )}
                                {isApplied && (
                                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    Ativo no Produto
                                  </span>
                                )}
                              </div>
                              <div className="text-xl font-bold text-white font-mono tabular-nums mt-1">
                                {formatCurrency(variant.price, selectedCurrency)}
                              </div>
                            </div>

                            {!variant.isControl && confidence > 0 && (
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                                  confidence >= 95
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                                    : 'bg-slate-900 text-slate-400 border-slate-700'
                                }`}
                              >
                                {confidence}% conf.
                              </span>
                            )}
                          </div>

                          {/* Conversion Rate Bar & Lift */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Taxa de Conversão</span>
                              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                                <span className="font-bold text-white">{convRate.toFixed(2)}%</span>
                                {!variant.isControl && (
                                  <span
                                    className={`text-[11px] font-semibold flex items-center ${
                                      convDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {convDeltaPct >= 0 ? (
                                      <ArrowUpRight className="w-3 h-3" />
                                    ) : (
                                      <ArrowDownRight className="w-3 h-3" />
                                    )}
                                    {convDeltaPct >= 0 ? '+' : ''}
                                    {convDeltaPct.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isWinner ? 'bg-sky-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${Math.min(100, (convRate / maxConvRate) * 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Revenue Per Visit Bar & Lift */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Receita / Visita (RPV)</span>
                              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                                <span className="font-bold text-emerald-400">
                                  {formatCurrency(rpv, selectedCurrency)}
                                </span>
                                {!variant.isControl && (
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      rpvDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    ({rpvDeltaPct >= 0 ? '+' : ''}
                                    {rpvDeltaPct.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${Math.min(100, (rpv / maxRpv) * 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Raw Counts */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono tabular-nums">
                            <div>
                              <span className="text-slate-500 block">Visitas</span>
                              <span className="text-slate-200 font-semibold">
                                {formatNumber(variant.views)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Vendas</span>
                              <span className="text-slate-200 font-semibold">
                                {formatNumber(variant.conversions)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Receita</span>
                              <span className="text-emerald-400 font-semibold">
                                {formatCurrency(revenue, selectedCurrency)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Apply Price CTA */}
                        <button
                          type="button"
                          disabled={isApplied}
                          onClick={() => {
                            const res = applyExperimentWinningPrice(exp.id, variant.id);
                            if (res.success) {
                              onNotify(res.message);
                            }
                          }}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                            isApplied
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 cursor-default'
                              : isWinner
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Preço Aplicado na Vitrine</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Aplicar {formatCurrency(variant.price, selectedCurrency)}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
