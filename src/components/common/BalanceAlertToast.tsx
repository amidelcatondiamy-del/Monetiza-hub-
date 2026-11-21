import React, { useEffect, useState } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  CheckCircle2,
  ArrowUpRight,
  X,
  Sparkles,
  Wallet,
  Settings,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL } from '../../utils/formatters';

interface BalanceAlertToastProps {
  onOpenWithdraw?: () => void;
  onOpenSettings?: () => void;
}

export const BalanceAlertToast: React.FC<BalanceAlertToastProps> = ({
  onOpenWithdraw,
  onOpenSettings,
}) => {
  const { activeBalanceAlert, clearActiveBalanceAlert } = useMonetization();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!activeBalanceAlert) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const duration = 9000;
    const intervalTime = 100;
    const startTime = Date.now();

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remainingPercent);
    }, intervalTime);

    const dismissTimer = setTimeout(() => {
      clearActiveBalanceAlert();
    }, duration);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(dismissTimer);
    };
  }, [activeBalanceAlert, clearActiveBalanceAlert]);

  if (!activeBalanceAlert) return null;

  const { threshold, currentBalance, channel, destinationEmail, timestamp } = activeBalanceAlert;

  const channelLabel =
    channel === 'both'
      ? 'E-mail + Notificação Push'
      : channel === 'email'
      ? 'Notificação por E-mail'
      : 'Notificação Push';

  return (
    <div className="fixed top-5 right-4 sm:right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500/50 rounded-2xl p-4 shadow-2xl shadow-emerald-500/20 text-white relative overflow-hidden">
        {/* Animated Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide uppercase">
                  Alerta de Saldo Mínimo Atingido!
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Simulação Ativa
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Disparado às {timestamp}</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">{channelLabel}</span>
              </p>
            </div>
          </div>

          <button
            onClick={clearActiveBalanceAlert}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alert Channel Badge details */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Canal de disparo:</span>
            <div className="flex items-center gap-1.5 text-slate-200 font-medium">
              {channel === 'email' && <Mail className="w-3.5 h-3.5 text-indigo-400" />}
              {channel === 'push' && <Smartphone className="w-3.5 h-3.5 text-amber-400" />}
              {channel === 'both' && (
                <>
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                </>
              )}
              <span className="text-[11px]">{channelLabel}</span>
            </div>
          </div>

          {(channel === 'email' || channel === 'both') && destinationEmail && (
            <div className="flex items-center justify-between text-[11px] border-t border-slate-800/80 pt-1">
              <span className="text-slate-400">Destinatário:</span>
              <span className="font-mono text-indigo-300 truncate max-w-[200px]">
                {destinationEmail}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] border-t border-slate-800/80 pt-1">
            <span className="text-slate-400">Meta configurada:</span>
            <span className="font-mono font-semibold text-slate-300">
              {formatBRL(threshold)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold border-t border-slate-800/80 pt-1.5">
            <span className="text-white">Saldo Disponível Atual:</span>
            <span className="font-mono text-emerald-400 text-sm">
              {formatBRL(currentBalance)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 flex items-center gap-2">
          {onOpenWithdraw && (
            <button
              onClick={() => {
                clearActiveBalanceAlert();
                onOpenWithdraw();
              }}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Solicitar Saque (Pix / Visa)</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={() => {
                clearActiveBalanceAlert();
                onOpenSettings();
              }}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center justify-center gap-1 transition cursor-pointer"
              title="Ajustar limite em Configurações"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Ajustar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
