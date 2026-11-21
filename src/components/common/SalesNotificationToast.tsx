import React, { useEffect } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL } from '../../utils/formatters';

export const SalesNotificationToast: React.FC = () => {
  const { activeToast, clearActiveToast, creator } = useMonetization();

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      clearActiveToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast, clearActiveToast]);

  if (!activeToast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl shadow-emerald-500/10 text-white relative backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                  Venda Aprovada!
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Agora</span>
              </div>

              <div className="text-base font-extrabold text-white font-mono tabular-nums">
                + {formatBRL(activeToast.amount)}
              </div>

              <p className="text-xs text-slate-200 line-clamp-1 font-semibold">
                {activeToast.title}
              </p>

              <p className="text-[11px] text-slate-400">
                Comprador: <strong className="text-slate-300">{activeToast.customerName}</strong>
              </p>

              <div className="pt-1 text-[10px] text-blue-400 flex items-center gap-1 font-medium">
                <CreditCard className="w-3 h-3" />
                <span>Creditado no seu Cartão Visa (•••• {creator.savedVisaCard?.last4 || '4829'})</span>
              </div>
            </div>
          </div>

          <button
            onClick={clearActiveToast}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
