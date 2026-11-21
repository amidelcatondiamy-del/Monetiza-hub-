import { useState, useEffect, useCallback, useRef } from 'react';
import {
  cacheTransactionsToIDB,
  getCachedTransactionsFromIDB,
  cacheFinancialMetricsToIDB,
  getCachedFinancialMetricsFromIDB,
  getCacheMetadata,
  clearFinanceIDBCache,
  estimateStorageUsage,
  isIDBSupported,
  CachedFinancialMetrics,
  CacheMetadata,
} from '../services/indexedDbCache';
import { Transaction, Currency } from '../types/monetization';

export interface UseOfflineCacheOptions {
  transactions: Transaction[];
  totalGrossRevenue: number;
  totalNetRevenue: number;
  availableBalance: number;
  totalWithdrawn: number;
  totalSalesCount: number;
  mrr: number;
  averageTicket: number;
  selectedCurrency: Currency;
}

export interface UseOfflineCacheReturn {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOffline: boolean;
  cacheSupported: boolean;
  lastSyncAt: Date | null;
  cachedRecordsCount: number;
  storageUsage: string;
  isSyncing: boolean;
  cachedMetrics: CachedFinancialMetrics | null;
  offlineTransactions: Transaction[];
  toggleSimulatedOffline: () => void;
  forceSyncNow: () => Promise<void>;
  clearLocalCache: () => Promise<void>;
}

export function useOfflineCache(options: UseOfflineCacheOptions): UseOfflineCacheReturn {
  const {
    transactions,
    totalGrossRevenue,
    totalNetRevenue,
    availableBalance,
    totalWithdrawn,
    totalSalesCount,
    mrr,
    averageTicket,
    selectedCurrency,
  } = options;

  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [cachedRecordsCount, setCachedRecordsCount] = useState<number>(transactions.length);
  const [storageUsage, setStorageUsage] = useState<string>('42 KB');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cachedMetrics, setCachedMetrics] = useState<CachedFinancialMetrics | null>(null);
  const [offlineTransactions, setOfflineTransactions] = useState<Transaction[]>(transactions);

  const initialSyncDoneRef = useRef(false);

  const cacheSupported = isIDBSupported();
  const effectiveOffline = !isOnline || isSimulatedOffline;

  // Real browser online/offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save to IndexedDB
  const syncToIndexedDB = useCallback(async () => {
    if (!cacheSupported) return;

    try {
      setIsSyncing(true);

      // 1. Save transactions
      const res = await cacheTransactionsToIDB(transactions);
      setCachedRecordsCount(res.count);
      setLastSyncAt(new Date(res.timestamp));

      // 2. Save financial metrics snapshot
      const savedMetrics = await cacheFinancialMetricsToIDB({
        totalGrossRevenue,
        totalNetRevenue,
        availableBalance,
        totalWithdrawn,
        totalSalesCount,
        mrr,
        averageTicket,
        currency: selectedCurrency,
      });
      setCachedMetrics(savedMetrics);

      // 3. Storage estimate
      const est = await estimateStorageUsage();
      setStorageUsage(est.formattedUsed);
    } catch (err) {
      console.warn('Erro ao sincronizar com IndexedDB:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [
    cacheSupported,
    transactions,
    totalGrossRevenue,
    totalNetRevenue,
    availableBalance,
    totalWithdrawn,
    totalSalesCount,
    mrr,
    averageTicket,
    selectedCurrency,
  ]);

  // Load from IndexedDB
  const loadFromIndexedDB = useCallback(async () => {
    if (!cacheSupported) return;

    try {
      const [txs, metrics, meta] = await Promise.all([
        getCachedTransactionsFromIDB(),
        getCachedFinancialMetricsFromIDB(),
        getCacheMetadata(),
      ]);

      if (txs.length > 0) {
        setOfflineTransactions(txs);
        setCachedRecordsCount(txs.length);
      }
      if (metrics) {
        setCachedMetrics(metrics);
      }
      if (meta?.lastSyncAt) {
        setLastSyncAt(new Date(meta.lastSyncAt));
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do IndexedDB:', err);
    }
  }, [cacheSupported]);

  // Auto-sync when online or when transactions update
  useEffect(() => {
    if (!effectiveOffline) {
      syncToIndexedDB();
    } else {
      loadFromIndexedDB();
    }
  }, [effectiveOffline, transactions.length, totalGrossRevenue, syncToIndexedDB, loadFromIndexedDB]);

  // Initial load check on mount
  useEffect(() => {
    if (!initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      syncToIndexedDB();
    }
  }, [syncToIndexedDB]);

  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      if (next) {
        // When going offline, read from IndexedDB immediately to verify offline persistence
        loadFromIndexedDB();
      }
      return next;
    });
  }, [loadFromIndexedDB]);

  const forceSyncNow = useCallback(async () => {
    await syncToIndexedDB();
  }, [syncToIndexedDB]);

  const clearLocalCache = useCallback(async () => {
    if (!cacheSupported) return;
    await clearFinanceIDBCache();
    setCachedRecordsCount(0);
    setLastSyncAt(null);
    setCachedMetrics(null);
  }, [cacheSupported]);

  return {
    isOnline,
    isSimulatedOffline,
    effectiveOffline,
    cacheSupported,
    lastSyncAt,
    cachedRecordsCount,
    storageUsage,
    isSyncing,
    cachedMetrics,
    offlineTransactions: effectiveOffline ? offlineTransactions : transactions,
    toggleSimulatedOffline,
    forceSyncNow,
    clearLocalCache,
  };
}
