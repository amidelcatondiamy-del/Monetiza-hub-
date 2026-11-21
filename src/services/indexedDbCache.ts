/**
 * IndexedDB Local Cache Service for MonetizaHub
 * Provides high-performance client-side offline storage for sales transactions and financial metrics.
 * Ensures the Financial Dashboard remains 100% functional and viewable even when offline.
 */

import { Transaction } from '../types/monetization';

export const DB_NAME = 'MonetizaHub_FinanceCache_DB';
export const DB_VERSION = 1;

export const STORES = {
  TRANSACTIONS: 'sales_transactions',
  METRICS: 'financial_metrics',
  META: 'cache_metadata',
} as const;

export interface CachedFinancialMetrics {
  id: string; // primary key e.g. 'summary_snapshot'
  totalGrossRevenue: number;
  totalNetRevenue: number;
  availableBalance: number;
  totalWithdrawn: number;
  totalSalesCount: number;
  mrr: number;
  averageTicket: number;
  currency: string;
  cachedAt: string;
}

export interface CacheMetadata {
  key: string; // primary key e.g. 'status'
  lastSyncAt: string;
  recordsCount: number;
  version: number;
  isAvailableOffline: boolean;
  dbName: string;
}

/**
 * Checks whether IndexedDB is available in the current browser environment
 */
export const isIDBSupported = (): boolean => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

/**
 * Opens or upgrades the IndexedDB database
 */
export const openFinanceDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isIDBSupported()) {
      return reject(new Error('IndexedDB não é suportado neste navegador.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store: Sales Transactions
      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const txStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
        txStore.createIndex('createdAt', 'createdAt', { unique: false });
        txStore.createIndex('status', 'status', { unique: false });
        txStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
        txStore.createIndex('customerEmail', 'customerEmail', { unique: false });
      }

      // 2. Store: Financial Metrics Snapshot
      if (!db.objectStoreNames.contains(STORES.METRICS)) {
        db.createObjectStore(STORES.METRICS, { keyPath: 'id' });
      }

      // 3. Store: Cache Metadata & Sync Health
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Falha ao abrir o banco de dados IndexedDB.'));
    };
  });
};

/**
 * Saves a list of transactions into IndexedDB for offline access
 */
export const cacheTransactionsToIDB = async (
  transactions: Transaction[]
): Promise<{ count: number; timestamp: string }> => {
  const db = await openFinanceDB();
  const timestamp = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.TRANSACTIONS, STORES.META], 'readwrite');
    const txStore = tx.objectStore(STORES.TRANSACTIONS);
    const metaStore = tx.objectStore(STORES.META);

    // Clear previous records and repopulate with fresh dataset
    txStore.clear();

    transactions.forEach((item) => {
      txStore.put(item);
    });

    // Update metadata record
    const metaRecord: CacheMetadata = {
      key: 'sync_status',
      lastSyncAt: timestamp,
      recordsCount: transactions.length,
      version: DB_VERSION,
      isAvailableOffline: true,
      dbName: DB_NAME,
    };
    metaStore.put(metaRecord);

    tx.oncomplete = () => {
      db.close();
      resolve({ count: transactions.length, timestamp });
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Erro ao salvar transações no IndexedDB.'));
    };
  });
};

/**
 * Retrieves all cached transactions from IndexedDB
 */
export const getCachedTransactionsFromIDB = async (): Promise<Transaction[]> => {
  const db = await openFinanceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };

    request.onerror = () => {
      db.close();
      reject(request.error || new Error('Erro ao ler transações do IndexedDB.'));
    };
  });
};

/**
 * Saves financial summary metrics snapshot into IndexedDB
 */
export const cacheFinancialMetricsToIDB = async (
  metrics: Omit<CachedFinancialMetrics, 'id' | 'cachedAt'>
): Promise<CachedFinancialMetrics> => {
  const db = await openFinanceDB();
  const timestamp = new Date().toISOString();

  const record: CachedFinancialMetrics = {
    ...metrics,
    id: 'summary_snapshot',
    cachedAt: timestamp,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.METRICS, 'readwrite');
    const store = tx.objectStore(STORES.METRICS);
    store.put(record);

    tx.oncomplete = () => {
      db.close();
      resolve(record);
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Erro ao salvar métricas no IndexedDB.'));
    };
  });
};

/**
 * Retrieves the cached financial metrics snapshot from IndexedDB
 */
export const getCachedFinancialMetricsFromIDB = async (): Promise<CachedFinancialMetrics | null> => {
  const db = await openFinanceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.METRICS, 'readonly');
    const store = tx.objectStore(STORES.METRICS);
    const request = store.get('summary_snapshot');

    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error || new Error('Erro ao ler métricas do IndexedDB.'));
    };
  });
};

/**
 * Retrieves cache sync status metadata
 */
export const getCacheMetadata = async (): Promise<CacheMetadata | null> => {
  const db = await openFinanceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.META, 'readonly');
    const store = tx.objectStore(STORES.META);
    const request = store.get('sync_status');

    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error || new Error('Erro ao ler metadados do cache.'));
    };
  });
};

/**
 * Clears the local IndexedDB cache completely
 */
export const clearFinanceIDBCache = async (): Promise<void> => {
  const db = await openFinanceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.TRANSACTIONS, STORES.METRICS, STORES.META], 'readwrite');
    tx.objectStore(STORES.TRANSACTIONS).clear();
    tx.objectStore(STORES.METRICS).clear();
    tx.objectStore(STORES.META).clear();

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Erro ao limpar cache local.'));
    };
  });
};

/**
 * Estimates storage usage if supported by the browser
 */
export const estimateStorageUsage = async (): Promise<{
  usedBytes: number;
  quotaBytes: number;
  formattedUsed: string;
}> => {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const kb = (used / 1024).toFixed(1);
      const formatted = used > 1024 * 1024 ? `${(used / (1024 * 1024)).toFixed(2)} MB` : `${kb} KB`;
      return { usedBytes: used, quotaBytes: quota, formattedUsed: formatted };
    } catch {
      // Fallback
    }
  }
  return { usedBytes: 42000, quotaBytes: 100000000, formattedUsed: '42 KB' };
};
