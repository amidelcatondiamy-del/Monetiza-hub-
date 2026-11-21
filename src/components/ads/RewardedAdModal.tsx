import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Gift,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency } from '../../utils/formatters';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    claimRewardedAdReward,
    selectedCurrency,
    availableBalance,
    getWinningAdNetwork,
  } = useMonetization();

  const totalDuration = 15;
  const [secondsRemaining, setSecondsRemaining] = useState(totalDuration);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string>('');
  const [showExitWarning, setShowExitWarning] = useState(false);
  const hasClaimedRef = useRef(false);
  const claimRewardRef = useRef(claimRewardedAdReward);
  claimRewardRef.current = claimRewardedAdReward;

  const winningNetwork = getWinningAdNetwork('rewarded_video');

  useEffect(() => {
    if (isOpen) {
      hasClaimedRef.current = false;
      setSecondsRemaining(totalDuration);
      setIsPlaying(true);
      setIsCompleted(false);
      setShowExitWarning(false);
      setRewardMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isPlaying || isCompleted) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, isCompleted]);

  useEffect(() => {
    if (!isOpen || secondsRemaining !== 0 || hasClaimedRef.current) return;
    hasClaimedRef.current = true;
    setIsCompleted(true);
    const res = claimRewardRef.current('balance');
    setRewardMessage(res.message);
  }, [isOpen, secondsRemaining]);

  if (!isOpen) return null;

  const progressPercentage = Math.round(
    ((totalDuration - secondsRemaining) / totalDuration) * 100
  );

  const handleAttemptClose = () => {
    if (isCompleted) {
      onClose();
    } else {
      setIsPlaying(false);
      setShowExitWarning(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Bar */}
        <div className="bg-slate-950/95 px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <Gift className="w-4 h-4" />
            </span>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                Vídeo Recompensado · {winningNetwork?.shortLabel || 'AdMob'}
              </span>
              <span className="text-[11px] text-amber-400 block font-mono tabular-nums">
                Recompensa: +R$ 5,00 no Saldo Real
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isCompleted ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-mono tabular-nums border border-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>{secondsRemaining}s</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Concluído</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleAttemptClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean Vector/Gradient Video Player Simulation Canvas */}
        <div className="relative h-60 sm:h-68 bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950/60 overflow-hidden flex flex-col justify-between p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 text-[11px] font-semibold text-amber-300 border border-amber-500/30 truncate">
              {winningNetwork?.name || 'Google AdMob'} Rewards
            </span>

            <div className="flex items-center gap-1.5">
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700 cursor-pointer"
                  title={isPlaying ? 'Pausar vídeo' : 'Retomar vídeo'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700 cursor-pointer"
                title={isMuted ? 'Ativar áudio' : 'Silenciar'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <div className="px-2 py-1 rounded-lg bg-slate-950/80 text-white text-[10px] font-mono border border-slate-800">
                HD 1080p
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              Parceria Publicitária Verificada
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Automação de Vendas & Pagamentos Instantâneos
            </h3>
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              Conheça ferramentas para criadores e infoprodutores com liquidação global e cobertura multicanal.
            </p>
          </div>

          {/* Progress Bar Line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Reward Status or Warning */}
        <div className="p-5 sm:p-6 space-y-4">
          {isCompleted ? (
            <div className="text-center space-y-3 py-1">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Gift className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">
                  Recompensa Desbloqueada com Sucesso
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  {rewardMessage || 'Você recebeu R$ 5,00 creditados instantaneamente no seu Saldo Disponível para saque.'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs flex items-center justify-between">
                <span className="text-slate-400">Novo Saldo Disponível:</span>
                <span className="text-emerald-400 font-bold text-sm tabular-nums">
                  {formatCurrency(availableBalance, selectedCurrency)}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition cursor-pointer"
              >
                Voltar ao Aplicativo
              </button>
            </div>
          ) : showExitWarning ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>Anúncio incompleto</span>
              </div>
              <p className="text-xs text-slate-300">
                Faltam apenas <strong className="font-mono">{secondsRemaining} segundos</strong>. Se fechar agora, o bônus de <strong>+R$ 5,00</strong> não será creditado.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowExitWarning(false);
                    setIsPlaying(true);
                  }}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                >
                  Continuar Assistindo ({secondsRemaining}s)
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Sair Sem Recompensa
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {isPlaying
                      ? 'Assista até o final para resgatar sua recompensa'
                      : 'Reprodução pausada'}
                  </span>
                </span>
                <span className="font-mono font-bold text-white tabular-nums">{progressPercentage}%</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 gap-2">
                <span className="truncate">
                  {winningNetwork
                    ? `${winningNetwork.name} · ${winningNetwork.unitSlots.rewardedPlacementId}`
                    : 'Google AdMob Rewarded Video'}
                </span>
                <span className="text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Opt-in Seguro</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
