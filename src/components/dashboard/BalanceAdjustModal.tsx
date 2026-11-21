import React, { useState } from 'react';
import {
  X,
  Wallet,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency } from '../../utils/formatters';

interface BalanceAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BalanceAdjustModal: React.FC<BalanceAdjustModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    availableBalance,
    setCustomAvailableBalance,
    syncAndResetHealthyBalance,
    selectedCurrency,
  } = useMonetization();

  const [targetAmount, setTargetAmount] = useState<string>(
    availableBalance > 0 ? availableBalance.toString() : '5000'
  );
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const presets = [5000, 10000, 15500, 25000];

  const handleApplyPreset = (val: number) => {
    setTargetAmount(val.toString());
  };

  const handleSaveCustomBalance = () => {
    const num = parseFloat(targetAmount);
    if (isNaN(num) || num < 0) return;

    setCustomAvailableBalance(num);
    setSuccessNotice(`Saldo disponível ajustado com sucesso para ${formatCurrency(num, selectedCurrency)}!`);
    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 1800);
  };

  const handleResetHealthy = () => {
    syncAndResetHealthyBalance();
    setSuccessNotice('Cache do navegador sincronizado com sucesso! Dados saudáveis recarregados.');
    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                Ajustar & Sincronizar Saldo
              </h3>
              <p className="text-xs text-slate-400">
                Defina o valor exato desejado para saque imediato
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Saldo Atual na Tela:</span>
          <span className="text-lg font-black text-white font-mono">
            {formatCurrency(availableBalance, selectedCurrency)}
          </span>
        </div>

        {/* Success Alert */}
        {successNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-300">
            Selecione um valor rápido:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold font-mono transition cursor-pointer ${
                  targetAmount === p.toString()
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                }`}
              >
                {formatCurrency(p, selectedCurrency)}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">
            Ou digite qualquer valor personalizado:
          </label>
          <div className="relative">
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Ex: 10000"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleSaveCustomBalance}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-98"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Confirmar & Sincronizar Novo Saldo</span>
          </button>

          <button
            type="button"
            onClick={handleResetHealthy}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Limpar qualquer cache residual e carregar o pacote oficial de vendas"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar & Limpar Cache do Navegador</span>
          </button>
        </div>
      </div>
    </div>
  );
};
