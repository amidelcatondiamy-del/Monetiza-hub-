import React from 'react';
import {
  Award,
  Trophy,
  Flame,
  DollarSign,
  Users,
  Star,
  CreditCard,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Lock,
  Gift,
  Zap,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { CreatorBadge, BadgeRarity } from '../../types/monetization';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface CreatorBadgesCardProps {
  onOpenAchievements?: () => void;
}

export const CreatorBadgesCard: React.FC<CreatorBadgesCardProps> = ({ onOpenAchievements }) => {
  const {
    badges,
    unlockedBadgesCount,
    totalBadgesCount,
    setIsAchievementsModalOpen,
    currentUser,
    selectedCurrency,
  } = useMonetization();

  const handleOpen = () => {
    if (onOpenAchievements) {
      onOpenAchievements();
    } else {
      setIsAchievementsModalOpen(true);
    }
  };

  const unclaimedCount = badges.filter((b) => b.unlocked && !b.claimed).length;
  const progressPercent = Math.round((unlockedBadgesCount / (totalBadgesCount || 1)) * 100);

  // Compute creator rank title based on unlocked count
  const creatorRank =
    unlockedBadgesCount >= 8
      ? { title: 'Mestre Diamante', color: 'from-amber-400 to-yellow-500' }
      : unlockedBadgesCount >= 5
      ? { title: 'Criador Elite Pro', color: 'from-purple-400 to-indigo-400' }
      : unlockedBadgesCount >= 2
      ? { title: 'Criador em Ascensão', color: 'from-emerald-400 to-teal-400' }
      : { title: 'Iniciante Promissor', color: 'from-blue-400 to-indigo-400' };

  // Render icon dynamically
  const renderBadgeIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'DollarSign':
        return <DollarSign className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Trophy':
        return <Trophy className={className} />;
      case 'Users':
        return <Users className={className} />;
      case 'CreditCard':
        return <CreditCard className={className} />;
      case 'Star':
        return <Star className={className} />;
      case 'ShoppingBag':
        return <ShoppingBag className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      case 'Award':
      default:
        return <Award className={className} />;
    }
  };

  const getRarityBadge = (rarity: BadgeRarity) => {
    switch (rarity) {
      case 'legendary':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Lendário
          </span>
        );
      case 'epic':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
            Épico
          </span>
        );
      case 'rare':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
            Raro
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
            Comum
          </span>
        );
    }
  };

  // Curated showcase badges (Primeiros R$ 1.000, Assíduo nas Vendas, Criador 5 Estrelas, Império 50k)
  const spotlightBadges = badges.slice(0, 4);

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-purple-950/20 rounded-2xl p-5 sm:p-6 border border-slate-800 hover:border-slate-700/80 transition-all shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-blue-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Conquistas & Badges do Criador
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r ${creatorRank.color} text-slate-950 shadow-sm`}>
                {creatorRank.title}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ganhe reconhecimento público, selos na vitrine e resgate pontos de fidelidade
            </p>
          </div>
        </div>

        {/* Action Button & Loyalty Points */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentUser.loyaltyPoints || 450} pts</span>
          </div>

          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-purple-600/25 transition cursor-pointer"
          >
            <span>Ver Todas ({unlockedBadgesCount}/{totalBadgesCount})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Unclaimed Rewards Banner */}
      {unclaimedCount > 0 && (
        <div
          onClick={handleOpen}
          className="mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-purple-500/15 border border-amber-500/40 flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400/60 transition group"
        >
          <div className="flex items-center gap-2.5 text-xs text-amber-200">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-300">
              <Gift className="w-4 h-4" />
            </span>
            <span>
              <strong>{unclaimedCount} {unclaimedCount === 1 ? 'conquista desbloqueada' : 'conquistas desbloqueadas'}</strong> aguardando resgate de pontos!
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
            <span>Resgatar agora</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Progresso Geral das Conquistas</span>
          <span className="font-mono font-bold text-slate-200">
            {unlockedBadgesCount} de {totalBadgesCount} desbloqueadas ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-purple-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Spotlight Badge Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {spotlightBadges.map((badge) => {
          const isComplete = badge.unlocked;
          const pct = Math.min(
            100,
            Math.round((badge.currentProgress / (badge.maxProgress || 1)) * 100)
          );

          return (
            <div
              key={badge.id}
              onClick={handleOpen}
              className={`p-3.5 rounded-xl border transition cursor-pointer relative overflow-hidden group ${
                isComplete
                  ? 'bg-slate-900/80 border-slate-700/80 hover:border-purple-500/50 hover:bg-slate-800/80'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Badge Corner Glow */}
              {isComplete && (
                <div
                  className={`absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br ${badge.gradient} opacity-20 blur-xl pointer-events-none group-hover:opacity-35 transition`}
                />
              )}

              <div className="flex items-start justify-between gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br ${
                    isComplete ? badge.gradient : 'from-slate-800 to-slate-900 text-slate-500'
                  }`}
                >
                  {isComplete ? (
                    renderBadgeIcon(badge.iconName, 'w-4 h-4')
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500" />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {getRarityBadge(badge.rarity)}
                  {isComplete && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
              </div>

              <div className="mt-2.5">
                <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition line-clamp-1">
                  {badge.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {badge.subtitle}
                </p>
              </div>

              {/* Progress */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Progresso</span>
                  <span className="font-mono text-slate-300">
                    {badge.unit === 'R$'
                      ? formatCurrency(badge.currentProgress, selectedCurrency)
                      : `${formatNumber(badge.currentProgress)} / ${formatNumber(badge.maxProgress)} ${badge.unit}`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isComplete
                        ? 'bg-emerald-400'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Perk highlight */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 line-clamp-1 max-w-[120px]">
                  🎁 +{badge.rewardPoints} pts
                </span>
                <span className={`font-semibold ${isComplete ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isComplete ? 'Desbloqueado' : 'Em andamento'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
