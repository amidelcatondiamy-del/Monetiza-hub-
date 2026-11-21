import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Gift,
  Lock,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Unlock,
  Wallet,
  Zap,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { RewardActionId, RewardBenefitType, RewardTierLevel } from '../../types/monetization';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface RewardsSystemTabProps {
  onNavigateTab?: (tabId: string) => void;
}

const TIER_META: Record<
  RewardTierLevel,
  { label: string; minXp: number; nextXp: number | null; multiplier: string; badgeClass: string; perk: string }
> = {
  bronze: {
    label: 'Bronze Criador',
    minXp: 0,
    nextXp: 500,
    multiplier: '1.0x MC',
    badgeClass: 'bg-amber-900/30 text-amber-300 border-amber-700/50',
    perk: 'Acesso ao catálogo básico e check-in diário',
  },
  silver: {
    label: 'Prata Impulso',
    minXp: 500,
    nextXp: 1500,
    multiplier: '1.1x MC',
    badgeClass: 'bg-slate-700/40 text-slate-200 border-slate-500/50',
    perk: '+10% bônus em moedas e liberação de bônus em carteira',
  },
  gold: {
    label: 'Ouro Estratégico',
    minXp: 1500,
    nextXp: 3000,
    multiplier: '1.25x MC',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    perk: '+25% bônus em moedas e acesso ao Passe Pro / Taxa Zero',
  },
  diamond: {
    label: 'Diamante Elite',
    minXp: 3000,
    nextXp: null,
    multiplier: '1.5x MC',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    perk: '+50% bônus máximo em todas as ações do aplicativo',
  },
};

const TIER_ORDER: RewardTierLevel[] = ['bronze', 'silver', 'gold', 'diamond'];

const BENEFIT_LABELS: Record<RewardBenefitType, string> = {
  feature_unlock: 'Recurso Desbloqueado',
  wallet_bonus: 'Saldo em Dinheiro',
  coupon_perk: 'Cupom Promocional',
  visibility_boost: 'Boost na Vitrine',
  vip_access: 'Acesso Recorrente VIP',
  fee_waiver: 'Isenção de Taxa',
};

export const RewardsSystemTab: React.FC<RewardsSystemTabProps> = ({ onNavigateTab }) => {
  const {
    monetiCoins,
    rewardXp,
    rewardTier,
    rewardStreakDays,
    lastDailyCheckinDate,
    rewardActions,
    rewardCatalog,
    rewardHistory,
    redeemedRewardIds,
    performDailyCheckin,
    awardActionReward,
    redeemRewardItem,
    selectedCurrency,
    isAdsRemoved,
  } = useMonetization();

  const [subTab, setSubTab] = useState<'catalog' | 'actions' | 'history'>('catalog');
  const [actionCategoryFilter, setActionCategoryFilter] = useState<string>('all');
  const [feedbackBanner, setFeedbackBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const alreadyCheckedInToday = lastDailyCheckinDate === todayStr;

  const tierInfo = TIER_META[rewardTier];
  const tierProgressPct = tierInfo.nextXp
    ? Math.min(
        100,
        Math.max(0, Math.round(((rewardXp - tierInfo.minXp) / (tierInfo.nextXp - tierInfo.minXp)) * 100))
      )
    : 100;

  const currentTierIdx = TIER_ORDER.indexOf(rewardTier);

  const handleCheckin = () => {
    const res = performDailyCheckin();
    setFeedbackBanner({ ok: res.success, text: res.message });
  };

  const handleSimulateAction = (actionId: RewardActionId) => {
    const res = awardActionReward(actionId, 'Ação verificada');
    if (res.success) {
      setFeedbackBanner({
        ok: true,
        text: `Ação recompensada! +${res.coinsAwarded} MonetiCoins e +${res.xpAwarded} XP creditados.`,
      });
    }
  };

  const handleRedeem = (rewardId: string) => {
    const res = redeemRewardItem(rewardId);
    setFeedbackBanner({ ok: res.success, text: res.message });
  };

  const filteredActions = rewardActions.filter((a) =>
    actionCategoryFilter === 'all' ? true : a.category === actionCategoryFilter
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Summary */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Sistema de Recompensas & Clube MonetiCoins
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Economia interna de moeda virtual (<strong className="text-amber-300">MonetiCoins / MC</strong>) e XP para incentivar retenção diária, compras na vitrine, avaliações e criação de ofertas com resgates reais dentro do app.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCheckin}
              disabled={alreadyCheckedInToday}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                alreadyCheckedInToday
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              }`}
            >
              {alreadyCheckedInToday ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Check-in de Hoje Concluído</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  <span>Check-in Diário (+{25 + Math.min(50, (rewardStreakDays + 1) * 5)} MC)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Saldo em Moeda Virtual
            </span>
            <div className="text-2xl font-black text-amber-300 mt-1 tabular-nums flex items-baseline gap-1.5">
              <span>{formatNumber(monetiCoins)}</span>
              <span className="text-xs font-bold text-amber-400/80">MC</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              100 MC ≈ {formatCurrency(7.15, selectedCurrency)} em benefícios
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Nível de Fidelidade
            </span>
            <div className="text-lg font-extrabold text-white mt-1 flex items-center gap-2">
              <span>{tierInfo.label}</span>
              <span className="text-[11px] font-mono text-emerald-400">{tierInfo.multiplier}</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${tierProgressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
                <span>{formatNumber(rewardXp)} XP</span>
                <span>{tierInfo.nextXp ? `Meta: ${formatNumber(tierInfo.nextXp)} XP` : 'Nível Máximo'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Sequência Diária (Streak)
            </span>
            <div className="text-2xl font-black text-white mt-1 tabular-nums flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span>{rewardStreakDays} dias</span>
            </div>
            <span className="text-[11px] text-orange-300/90 block mt-1">
              +{Math.min(50, rewardStreakDays * 5)} MC extras por check-in
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Recursos Desbloqueados
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">
              {redeemedRewardIds.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              {isAdsRemoved ? 'Modo Sem Anúncios ativo' : 'Desbloqueie recursos com MC'}
            </span>
          </div>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSubTab('catalog')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                subTab === 'catalog'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Catálogo de Recompensas ({rewardCatalog.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('actions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                subTab === 'actions'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ações Recompensadas ({rewardActions.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                subTab === 'history'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Extrato de MonetiCoins ({rewardHistory.length})
            </button>
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('models')}
              className="text-xs font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Ver Integração com Fontes de Receita</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {feedbackBanner && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedbackBanner.ok
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/50 border-amber-500/40 text-amber-200'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-white text-[11px] font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* TAB 1: REWARDS CATALOG */}
      {subTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rewardCatalog.map((item) => {
            const isAlreadyUnlocked = !item.repeatable && redeemedRewardIds.includes(item.id);
            const minTierIdx = item.minTier ? TIER_ORDER.indexOf(item.minTier) : 0;
            const meetsTier = currentTierIdx >= minTierIdx;
            const hasCoins = monetiCoins >= item.costCoins;
            const canRedeem = !isAlreadyUnlocked && meetsTier && hasCoins;

            return (
              <div
                key={item.id}
                className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      {BENEFIT_LABELS[item.benefitType]}
                    </span>
                    <span className="text-xs font-black font-mono text-amber-300 tabular-nums whitespace-nowrap">
                      {formatNumber(item.costCoins)} MC
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.description}</p>

                  <div className="mt-4 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Entrega imediata:</span>
                    <span className="font-bold text-slate-200">{item.valueHighlight}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    {item.minTier ? `Mínimo: ${TIER_META[item.minTier].label.split(' ')[0]}` : 'Todos os níveis'}
                  </span>

                  {isAlreadyUnlocked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ativado na Conta</span>
                    </span>
                  ) : !meetsTier ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Requer {TIER_META[item.minTier!].label.split(' ')[0]}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRedeem(item.id)}
                      disabled={!canRedeem}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                        canRedeem
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{hasCoins ? 'Resgatar Agora' : `Faltam ${item.costCoins - monetiCoins} MC`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: REWARDED ACTIONS MATRIX */}
      {subTab === 'actions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 border border-slate-800 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Matriz de Ações Recompensadas do Usuário
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Eventos reais disparados durante o uso do MonetizaHub (Vitrine, Checkout, Avaliações e Studio) creditam MC + XP automaticamente.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'engajamento', label: 'Engajamento' },
                { id: 'monetizacao', label: 'Monetização' },
                { id: 'comunidade', label: 'Comunidade' },
                { id: 'criacao', label: 'Criação' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActionCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    actionCategoryFilter === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-bold">Ação do Usuário</th>
                    <th className="py-3 px-4 font-bold">Público</th>
                    <th className="py-3 px-4 font-bold">Frequência</th>
                    <th className="py-3 px-4 font-bold text-right">Moeda Virtual</th>
                    <th className="py-3 px-4 font-bold text-right">XP de Nível</th>
                    <th className="py-3 px-4 font-bold text-right">Testar Gatilho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredActions.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{rule.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                          {rule.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                        {rule.eligibleTarget}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{rule.cadence}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300 tabular-nums whitespace-nowrap">
                        +{rule.coinsReward} MC
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-300 tabular-nums whitespace-nowrap">
                        +{rule.xpReward} XP
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            rule.id === 'daily_checkin'
                              ? handleCheckin()
                              : handleSimulateAction(rule.id)
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                        >
                          Creditar Ação
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REWARDS LEDGER */}
      {subTab === 'history' && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Histórico de Ganhos e Resgates</h3>
            <span className="text-xs text-slate-400 tabular-nums">
              Últimos {rewardHistory.length} registros
            </span>
          </div>
          <div className="divide-y divide-slate-800/80">
            {rewardHistory.map((tx) => (
              <div
                key={tx.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{tx.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{new Date(tx.timestamp).toLocaleString('pt-BR')}</span>
                    {tx.badgeLabel && (
                      <span className="text-slate-500">• {tx.badgeLabel}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <div
                    className={`text-sm font-black font-mono ${
                      tx.coinsDelta >= 0 ? 'text-amber-300' : 'text-rose-400'
                    }`}
                  >
                    {tx.coinsDelta >= 0 ? `+${tx.coinsDelta}` : tx.coinsDelta} MC
                  </div>
                  {tx.xpDelta > 0 && (
                    <div className="text-[10px] font-mono text-indigo-300">+{tx.xpDelta} XP</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
