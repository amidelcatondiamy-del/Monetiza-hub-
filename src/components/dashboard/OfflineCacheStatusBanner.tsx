import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Sparkles,
  Layers,
  Clock,
  Trash2,
  X,
} from 'lucide-react';
import { UseOfflineCacheReturn } from '../../hooks/useOfflineCache';

interface OfflineCacheStatusBannerProps {
  offlineState: UseOfflineCacheReturn;
}

export const OfflineCacheStatusBanner: React.FC<OfflineCacheStatusBannerProps> = ({ offlineState }) => {
  const {
    isOnline,
    isSimulatedOffline,
    effectiveOffline,
    lastSyncAt,
    cachedRecordsCount,
    storageUsage,
    isSyncing,
    toggleSimulatedOffline,
    forceSyncNow,
    clearLocalCache,
  } = offlineState;

  const [showDiagModal, setShowDiagModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const formattedSyncTime = lastSyncAt
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(lastSyncAt)
    : 'Recentemente';

  return (
    <>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-emerald-500/40 shadow-2xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Status Container */}
      <div className="space-y-3">
        {/* Offline Banner (Shown when disconnected or in simulated offline mode) */}
        {effectiveOffline ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/50 border border-amber-500/40 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
              <div className="flex items-start sm:items-center gap-3">
                <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5 sm:mt-0 animate-pulse">
                  <WifiOff className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {isSimulatedOffline ? 'Modo Offline Simulado Ativo (IndexedDB)' : 'Sem Conexão à Internet (Modo Offline Ativo)'}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                      <Database className="w-3 h-3" />
                      <span>{cachedRecordsCount} vendas salvas no IndexedDB</span>
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 mt-0.5">
                    Você está navegando com o cache local do <strong>IndexedDB</strong>. Os dados de vendas, faturamento bruto/líquido e histórico de transações continuam disponíveis normalmente.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowDiagModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ver Banco Local</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleSimulatedOffline();
                    showNotification(effectiveOffline ? 'Conexão restabelecida!' : 'Modo offline ativado.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{isSimulatedOffline ? 'Restaurar Modo Online' : 'Alternar Conexão'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Online Bar: IndexedDB Health & Offline Readiness */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  Cache Offline IndexedDB:
                </span>
                <span className="text-slate-300">
                  <strong className="text-emerald-400 font-mono">{cachedRecordsCount}</strong> transações prontas para acesso sem internet
                </span>
                <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
                  • Sincronizado às {formattedSyncTime} ({storageUsage})
                </span>
              </div>
            </div>

            {/* Offline Control Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  await forceSyncNow();
                  showNotification('IndexedDB sincronizado com sucesso!');
                }}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-50"
                title="Forçar atualização dos dados locais no IndexedDB"
              >
                <RefreshCw className={`w-3 h-3 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Salvando...' : 'Sincronizar'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleSimulatedOffline();
                  showNotification('Modo offline ativado para teste do IndexedDB!');
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-[11px] font-bold border border-indigo-500/30 transition cursor-pointer"
                title="Simular perda de internet para verificar o Painel Financeiro funcionando com IndexedDB"
              >
                <WifiOff className="w-3 h-3 text-indigo-400" />
                <span>Testar Sem Internet (Offline)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDiagModal(true)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Diagnóstico do Banco de Dados Local IndexedDB"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* IndexedDB Diagnostic & Cache Inspection Modal */}
      {showDiagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Database className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Diagnóstico do Serviço de Cache IndexedDB
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Armazenamento estruturado de vendas e métricas offline no navegador.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDiagModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Storage Schema Specs */}
            <div className="space-y-3 font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Banco de Dados:</span>
                  <strong className="text-white font-bold">MonetizaHub_FinanceCache_DB (v1)</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Status da Conexão:</span>
                  <strong className={effectiveOffline ? 'text-amber-400' : 'text-emerald-400'}>
                    {effectiveOffline ? 'Offline (Lendo do IndexedDB)' : 'Online (Sincronizado)'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Transações no Cache:</span>
                  <strong className="text-emerald-400 font-bold">{cachedRecordsCount} registros</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Espaço Utilizado:</span>
                  <strong className="text-indigo-400">{storageUsage}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Última Sincronização:</span>
                  <strong className="text-slate-400">{formattedSyncTime}</strong>
                </div>
              </div>

              {/* Stores Breakdown */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Object Stores Criadas:
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>1. sales_transactions (key: id)</span>
                    <span className="text-emerald-400">Ativa ({cachedRecordsCount} itens)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>2. financial_metrics (key: id)</span>
                    <span className="text-emerald-400">Ativa (Snapshot D+0)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>3. cache_metadata (key: key)</span>
                    <span className="text-emerald-400">Ativa (Sync Status)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Offline Capability Guarantee */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-white">Garantia Offline:</strong> Sempre que sua conexão cair ou você estiver em deslocamento, o <strong>Painel Financeiro</strong> continuará abrindo e renderizando o histórico de vendas, gráficos e faturamento diretamente da memória persistente do seu dispositivo.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  await clearLocalCache();
                  showNotification('Cache local limpo.');
                  setShowDiagModal(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Cache</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDiagModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
