import React, { useState } from 'react';
import {
  X,
  Award,
  Trophy,
  Flame,
  DollarSign,
  Users,
  Star,
  Sparkles,
  CreditCard,
  ShoppingBag,
  CheckCircle2,
  Lock,
  Gift,
  Share2,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { CreatorBadge, BadgeCategory, BadgeRarity } from '../../types/monetization';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface CreatorAchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatorAchievementsModal: React.FC<CreatorAchievementsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    badges,
    claimBadgeReward,
    unlockedBadgesCount,
    totalBadgesCount,
    currentUser,
    selectedCurrency,
    creator,
  } = useMonetization();

  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all');
  const [copiedBadgeId, setCopiedBadgeId] = useState<string | null>(null);
  const [selectedBadgeDetail, setSelectedBadgeDetail] = useState<CreatorBadge | null>(null);

  if (!isOpen) return null;

  const filteredBadges = badges.filter((b) => {
    if (selectedCategory === 'all') return true;
    return b.category === selectedCategory;
  });

  const overallProgressPercent = Math.round(
    (unlockedBadgesCount / (totalBadgesCount || 1)) * 100
  );

  const getRarityBadge = (rarity: BadgeRarity) => {
    switch (rarity) {
      case 'legendary':
        return {
          label: 'Lendário',
          classes: 'bg-gradient-to-r from-amber-500/20 to-red-500/20 text-amber-300 border-amber-500/40',
        };
      case 'epic':
        return {
          label: 'Épico',
          classes: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
      case 'rare':
        return {
          label: 'Raro',
          classes: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        };
      default:
        return {
          label: 'Comum',
          classes: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const renderBadgeIcon = (iconName: string, className = 'w-6 h-6') => {
    switch (iconName) {
      case 'DollarSign':
        return <DollarSign className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Trophy':
        return <Trophy className={className} />;
      case 'Users':
        return <Users className={className} />;
      case 'Star':
        return <Star className={className} />;
      case 'CreditCard':
        return <CreditCard className={className} />;
      case 'ShoppingBag':
        return <ShoppingBag className={className} />;
      case 'Award':
        return <Award className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const handleShareBadge = (badge: CreatorBadge) => {
    const text = `🏆 Desbloqueei a conquista "${badge.title}" no MonetizaHub! (${badge.description}) #MonetizaHub #CriadorDigital`;
    navigator.clipboard.writeText(text);
    setCopiedBadgeId(badge.id);
    setTimeout(() => setCopiedBadgeId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 p-6 border-b border-slate-800 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Conquistas & Badges do Criador
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold font-mono border border-amber-500/30">
                    Nível Ouro Alpha
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Desbloqueie marcos de faturamento, vendas e reputação para ganhar pontos VIP e benefícios exclusivos.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Overall Progress Bar Card */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Progresso Geral da Carreira</span>
                </span>
                <span className="font-mono text-white font-bold">
                  {unlockedBadgesCount} de {totalBadgesCount} Conquistas ({overallProgressPercent}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${overallProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 sm:border-l sm:border-slate-800 sm:pl-4 self-stretch justify-between sm:justify-start">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Pontos VIP
                </span>
                <span className="text-base font-black text-amber-400 font-mono">
                  {formatNumber(currentUser?.loyaltyPoints || 450)} pts
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          {[
            { id: 'all', label: 'Todas as Conquistas', count: badges.length },
            { id: 'revenue', label: 'Faturamento', count: badges.filter((b) => b.category === 'revenue').length },
            { id: 'sales', label: 'Vendas & Tração', count: badges.filter((b) => b.category === 'sales').length },
            { id: 'community', label: 'Comunidade & MRR', count: badges.filter((b) => b.category === 'community').length },
            { id: 'reputation', label: 'Reputação & Avaliações', count: badges.filter((b) => b.category === 'reputation').length },
            { id: 'features', label: 'Recursos & Vitrine', count: badges.filter((b) => b.category === 'features').length },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedCategory === cat.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Badges Grid View */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBadges.map((badge) => {
              const rarityMeta = getRarityBadge(badge.rarity);
              const progressPct = Math.min(
                100,
                Math.round((badge.currentProgress / badge.maxProgress) * 100)
              );

              return (
                <div
                  key={badge.id}
                  className={`rounded-2xl p-5 border transition flex flex-col justify-between relative overflow-hidden group ${
                    badge.unlocked
                      ? 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40 shadow-lg'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Subtle Gradient Accent */}
                  <div
                    className={`absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-br ${badge.gradient} opacity-10 rounded-full blur-2xl pointer-events-none`}
                  />

                  <div>
                    {/* Badge Header: Icon + Titles + Rarity */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0 bg-gradient-to-br ${
                            badge.unlocked ? badge.gradient : 'from-slate-800 to-slate-900 text-slate-500'
                          }`}
                        >
                          {badge.unlocked ? (
                            renderBadgeIcon(badge.iconName, 'w-6 h-6')
                          ) : (
                            <Lock className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-white tracking-tight">
                              {badge.title}
                            </h3>
                            {badge.unlocked && (
                              <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400" title="Conquista desbloqueada!">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-amber-400 font-medium">
                            {badge.subtitle}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0 ${rarityMeta.classes}`}
                      >
                        {rarityMeta.label}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                      {badge.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-3.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Progresso</span>
                        <span className={badge.unlocked ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                          {badge.unit === 'R$'
                            ? `${formatCurrency(badge.currentProgress, selectedCurrency)} / ${formatCurrency(badge.maxProgress, selectedCurrency)}`
                            : `${badge.currentProgress} / ${badge.maxProgress} ${badge.unit}`}{' '}
                          ({progressPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            badge.unlocked
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Perk Box */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">Benefício do Criador:</strong>{' '}
                        <span>{badge.perkDescription}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Claim Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <Gift className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-400 font-bold">+{badge.rewardPoints} pts</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {badge.unlocked && (
                        <button
                          onClick={() => handleShareBadge(badge)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-xs flex items-center gap-1"
                          title="Copiar texto para compartilhar"
                        >
                          {copiedBadgeId === badge.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[11px] text-emerald-400">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">Compartilhar</span>
                            </>
                          )}
                        </button>
                      )}

                      {badge.unlocked ? (
                        badge.claimed ? (
                          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            <span>Resgatado</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => claimBadgeReward(badge.id)}
                            className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-1"
                          >
                            <Gift className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Resgatar Recompensa</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Em progresso</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
