import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Users,
  DollarSign,
  FileText,
  Settings,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Ban,
  Eye,
  EyeOff,
  Star,
  Trash2,
  Plus,
  Download,
  Save,
  Check,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  CreditCard,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import {
  Currency,
  GatewayProvider,
  PlatformAdminSettings,
  TransactionStatus,
  UserAccount,
  WithdrawalRequest,
} from '../../types/monetization';
import { formatCurrency } from '../../utils/formatters';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

type AdminSection = 'overview' | 'users' | 'finance' | 'content' | 'settings';

interface AdminDashboardProps {
  onNavigateToStudio?: () => void;
  onNavigateToStore?: () => void;
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToStudio,
  onNavigateToStore,
}) => {
  const {
    allUsers,
    currentUser,
    switchUser,
    adminUpdateUser,
    adminCreateUser,
    adminDeleteUser,
    transactions,
    withdrawals,
    adminUpdateTransactionStatus,
    adminUpdateWithdrawalStatus,
    products,
    posts,
    updateProduct,
    deleteProduct,
    adminToggleProductVisibility,
    adminToggleProductFeatured,
    adminUpdateGatedPost,
    adminDeleteGatedPost,
    totalGrossRevenue,
    totalNetRevenue,
    totalGatewayFees,
    realNetProfit,
    selectedCurrency,
    platformAdminSettings,
    updatePlatformAdminSettings,
    adminAuditLogs,
    monetizationModels,
    updateMonetizationModels,
    gatewaySettings,
    updateGatewayConfig,
    toggleGatewayMode,
    addAdminAuditLog,
  } = useMonetization();

  const [section, setSection] = useState<AdminSection>('overview');

  // Overview audit filter
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<
    'all' | 'users' | 'finance' | 'content' | 'settings'
  >('all');

  // Users state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'creator' | 'client' | 'admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'all' | 'active' | 'pending_kyc' | 'suspended'
  >('all');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'creator' | 'client' | 'admin'>('creator');
  const [newUserCategory, setNewUserCategory] = useState('Negócios Digitais');
  const [newUserKyc, setNewUserKyc] = useState(true);
  const [newUserError, setNewUserError] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Finance state
  const [financeMode, setFinanceMode] = useState<'transactions' | 'withdrawals'>('transactions');
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [wdStatusFilter, setWdStatusFilter] = useState<'all' | WithdrawalRequest['status']>('all');

  // Content state
  const [contentSearch, setContentSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'product' | 'post'>('all');
  const [contentVisFilter, setContentVisFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState<string>('');
  const [confirmDeleteContentId, setConfirmDeleteContentId] = useState<string | null>(null);

  // Global settings draft state
  const [settingsDraft, setSettingsDraft] = useState<PlatformAdminSettings>(platformAdminSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Derived metrics
  const userStats = useMemo(() => {
    const active = allUsers.filter((u) => (u.status || 'active') === 'active').length;
    const pendingKyc = allUsers.filter(
      (u) => u.status === 'pending_kyc' || u.kycVerified === false
    ).length;
    const suspended = allUsers.filter((u) => u.status === 'suspended').length;
    return { total: allUsers.length, active, pendingKyc, suspended };
  }, [allUsers]);

  const financeStats = useMemo(() => {
    const approvedTxs = transactions.filter((t) => t.status === 'approved').length;
    const pendingTxs = transactions.filter((t) => t.status === 'pending').length;
    const refundedTxs = transactions.filter((t) => t.status === 'refunded').length;
    const processingWd = withdrawals.filter((w) => w.status === 'processing');
    const processingWdAmount = processingWd.reduce((s, w) => s + w.amount, 0);
    const failedOrReversedWd = withdrawals.filter(
      (w) => w.status === 'failed' || w.status === 'reversed'
    ).length;
    return {
      approvedTxs,
      pendingTxs,
      refundedTxs,
      processingWdCount: processingWd.length,
      processingWdAmount,
      failedOrReversedWd,
    };
  }, [transactions, withdrawals]);

  const contentStats = useMemo(() => {
    const publishedProducts = products.filter((p) => p.isPublished).length;
    const publishedPosts = posts.filter((p) => p.isPublished !== false).length;
    const totalPublished = publishedProducts + publishedPosts;
    const totalHidden = products.length - publishedProducts + (posts.length - publishedPosts);
    return {
      totalItems: products.length + posts.length,
      totalPublished,
      totalHidden,
    };
  }, [products, posts]);

  // Filtered lists
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      const effectiveStatus = u.status || 'active';
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (userStatusFilter !== 'all' && effectiveStatus !== userStatusFilter) return false;
      if (q) {
        const hay = `${u.name} ${u.email} ${u.handle} ${u.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allUsers, userSearch, userRoleFilter, userStatusFilter]);

  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (txStatusFilter !== 'all' && tx.status !== txStatusFilter) return false;
      if (q) {
        const hay = `${tx.id} ${tx.title} ${tx.customerName} ${tx.customerEmail} ${tx.paymentMethod}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, txSearch, txStatusFilter]);

  const filteredWithdrawals = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return [...withdrawals]
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
      .filter((wd) => {
        if (wdStatusFilter !== 'all' && wd.status !== wdStatusFilter) return false;
        if (q) {
          const hay = `${wd.receiptNumber} ${wd.destinationKey} ${wd.destinationType} ${wd.failureReason || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [withdrawals, txSearch, wdStatusFilter]);

  const unifiedContentItems = useMemo(() => {
    const q = contentSearch.trim().toLowerCase();
    const productRows = products.map((p) => ({
      kind: 'product' as const,
      id: p.id,
      title: p.title,
      category: p.type.toUpperCase(),
      price: p.price,
      isPublished: p.isPublished,
      featured: Boolean(p.featured),
      engagementLabel: `${p.salesCount} vendas · ${p.viewsCount} visualizações`,
    }));
    const postRows = posts.map((post) => ({
      kind: 'post' as const,
      id: post.id,
      title: post.title,
      category: 'PAYWALL',
      price: post.unlockPrice,
      isPublished: post.isPublished !== false,
      featured: false,
      engagementLabel: `${post.reads} leituras · ${post.unlockedUserEmails.length} desbloqueios`,
    }));

    return [...productRows, ...postRows].filter((item) => {
      if (contentTypeFilter !== 'all' && item.kind !== contentTypeFilter) return false;
      if (contentVisFilter === 'published' && !item.isPublished) return false;
      if (contentVisFilter === 'hidden' && item.isPublished) return false;
      if (q && !`${item.title} ${item.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, posts, contentSearch, contentTypeFilter, contentVisFilter]);

  const filteredAuditLogs = useMemo(() => {
    if (auditCategoryFilter === 'all') return adminAuditLogs;
    return adminAuditLogs.filter((item) => item.category === auditCategoryFilter);
  }, [adminAuditLogs, auditCategoryFilter]);

  // Handlers
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      setNewUserError('Informe o nome completo do usuário.');
      return;
    }
    if (!newUserEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail.trim())) {
      setNewUserError('Informe um endereço de e-mail válido.');
      return;
    }
    setNewUserError(null);
    adminCreateUser({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      category: newUserCategory,
      kycVerified: newUserKyc,
    });
    setNewUserName('');
    setNewUserEmail('');
    setShowNewUserForm(false);
  };

  const handleSaveGlobalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      settingsDraft.platformFeePercent < 0 ||
      settingsDraft.platformFeePercent > 40 ||
      settingsDraft.pixFeePercent < 0 ||
      settingsDraft.pixFeePercent > 40
    ) {
      setSettingsError('As taxas da plataforma devem estar entre 0% e 40%.');
      return;
    }
    if (
      settingsDraft.minWithdrawalAmount < 1 ||
      settingsDraft.maxDailyWithdrawalAmount < settingsDraft.minWithdrawalAmount
    ) {
      setSettingsError(
        'O limite diário deve ser maior ou igual ao valor mínimo de saque (mín. R$ 1,00).'
      );
      return;
    }
    if (
      !settingsDraft.supportEmail.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settingsDraft.supportEmail.trim())
    ) {
      setSettingsError('Informe um e-mail de suporte oficial válido.');
      return;
    }

    setSettingsError(null);
    updatePlatformAdminSettings(settingsDraft);
    setSettingsSaved(true);
    window.setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleExportAdminReportCsv = () => {
    const rows = [
      ['Categoria', 'Identificador', 'Descrição / Titular', 'Status', 'Valor (BRL)', 'Data'],
      ...transactions.map((t) => [
        'Transação',
        t.id,
        `${t.customerName} - ${t.title}`,
        t.status,
        t.grossAmount.toFixed(2),
        t.createdAt,
      ]),
      ...withdrawals.map((w) => [
        'Saque',
        w.receiptNumber,
        `${w.destinationType} - ${w.destinationKey}`,
        w.status,
        w.amount.toFixed(2),
        w.requestedAt,
      ]),
    ];
    const csv = rows
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monetizahub-admin-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addAdminAuditLog({
      actorName: currentUser?.name || 'Admin',
      action: 'Relatório global de auditoria exportado em CSV',
      target: `${transactions.length} transações · ${withdrawals.length} saques`,
      category: 'finance',
      severity: 'info',
    });
  };

  const handleSaveInlinePrice = (kind: 'product' | 'post', id: string) => {
    const parsed = Number(editingPriceVal.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setEditingPriceId(null);
      return;
    }
    if (kind === 'product') {
      const prod = products.find((p) => p.id === id);
      updateProduct(id, { price: Number(parsed.toFixed(2)) });
      if (prod) {
        addAdminAuditLog({
          actorName: currentUser?.name || 'Admin',
          action: `Preço do produto ajustado para R$ ${parsed.toFixed(2)}`,
          target: prod.title,
          category: 'content',
          severity: 'info',
        });
      }
    } else {
      adminUpdateGatedPost(id, { unlockPrice: Number(parsed.toFixed(2)) });
    }
    setEditingPriceId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Painel Administrativo
            </h1>
            <span className="text-xs text-slate-400">
              · {platformAdminSettings.platformName} Governança & Compliance
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento global de usuários, fluxo financeiro, moderação de conteúdo e regras da plataforma.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onNavigateToStudio && (
            <button
              type="button"
              onClick={onNavigateToStudio}
              className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Voltar ao Estúdio
            </button>
          )}
          {onNavigateToStore && (
            <button
              type="button"
              onClick={onNavigateToStore}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Ver Vitrine</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleExportAdminReportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Auditoria CSV</span>
          </button>
        </div>
      </div>

      {/* Global Maintenance Alert if enabled */}
      {platformAdminSettings.maintenanceMode && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Modo Manutenção Ativo:</strong> A vitrine pública exibe aviso de manutenção controlada enquanto ajustes administrativos são aplicados.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              updatePlatformAdminSettings({ maintenanceMode: false });
              setSettingsDraft((prev) => ({ ...prev, maintenanceMode: false }));
            }}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition cursor-pointer whitespace-nowrap shrink-0"
          >
            Desativar Manutenção
          </button>
        </div>
      )}

      {/* 4-Column Global KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Volume Bruto Monitorado</span>
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">
            {formatCurrency(totalGrossRevenue, selectedCurrency)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center gap-1.5">
            <span>{financeStats.approvedTxs} aprovadas</span>
            <span aria-hidden="true">·</span>
            <span>{financeStats.pendingTxs} pendentes</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Contas & Verificação KYC</span>
            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">
            {userStats.total} usuários
          </div>
          <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center gap-1.5">
            <span>{userStats.active} ativos</span>
            <span aria-hidden="true">·</span>
            <span>{userStats.pendingKyc} KYC pendente</span>
            <span aria-hidden="true">·</span>
            <span>{userStats.suspended} suspensos</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Fila de Repasses</span>
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">
            {financeStats.processingWdCount} em aberto
          </div>
          <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center gap-1.5">
            <span>{formatCurrency(financeStats.processingWdAmount, selectedCurrency)}</span>
            <span aria-hidden="true">·</span>
            <span>{financeStats.failedOrReversedWd} falhas/estornos</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Catálogo & Paywall</span>
            <FileText className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">
            {contentStats.totalPublished}/{contentStats.totalItems} ativos
          </div>
          <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center gap-1.5">
            <span>{products.length} produtos</span>
            <span aria-hidden="true">·</span>
            <span>{posts.length} paywalls</span>
            <span aria-hidden="true">·</span>
            <span>{contentStats.totalHidden} ocultos</span>
          </div>
        </div>
      </div>

      {/* Admin Sub-Navigation Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        {(
          [
            { id: 'overview', label: 'Visão Geral & Auditoria', Icon: ShieldCheck },
            { id: 'users', label: `Usuários (${userStats.total})`, Icon: Users },
            {
              id: 'finance',
              label: `Transações & Repasses (${transactions.length + withdrawals.length})`,
              Icon: DollarSign,
            },
            { id: 'content', label: `Conteúdo (${contentStats.totalItems})`, Icon: FileText },
            { id: 'settings', label: 'Configurações Gerais', Icon: Settings },
          ] as Array<{ id: AdminSection; label: string; Icon: React.ComponentType<{ className?: string }> }>
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              section === id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* SECTION 1: OVERVIEW & GOVERNANCE AUDIT LOG */}
      {section === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Left 2 cols: Financial breakdown + Audit log */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white">Resumo Financeiro da Plataforma</h2>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  Taxa padrão: {platformAdminSettings.platformFeePercent}% · Pix:{' '}
                  {platformAdminSettings.pixFeePercent}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400 block">Receita Bruta</span>
                  <strong className="text-sm font-bold text-white font-mono tabular-nums mt-1 block">
                    {formatCurrency(totalGrossRevenue, selectedCurrency)}
                  </strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400 block">Repassado Líquido</span>
                  <strong className="text-sm font-bold text-emerald-400 font-mono tabular-nums mt-1 block">
                    {formatCurrency(totalNetRevenue, selectedCurrency)}
                  </strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400 block">Taxas Retidas</span>
                  <strong className="text-sm font-bold text-amber-400 font-mono tabular-nums mt-1 block">
                    {formatCurrency(totalGatewayFees, selectedCurrency)}
                  </strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400 block">Lucro Operacional Real</span>
                  <strong className="text-sm font-bold text-white font-mono tabular-nums mt-1 block">
                    {formatCurrency(realNetProfit, selectedCurrency)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Governance Audit Trail */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Trilha de Auditoria Administrativa
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Registro cronológico de alterações de usuários, finanças, moderação e configurações.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {(
                    [
                      { id: 'all', label: 'Todos' },
                      { id: 'users', label: 'Usuários' },
                      { id: 'finance', label: 'Financeiro' },
                      { id: 'content', label: 'Conteúdo' },
                      { id: 'settings', label: 'Sistema' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAuditCategoryFilter(cat.id)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                        auditCategoryFilter === cat.id
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                      <th className="py-2.5 px-3 whitespace-nowrap">Data & Hora</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Responsável</th>
                      <th className="py-2.5 px-3">Ação Executada</th>
                      <th className="py-2.5 px-3">Alvo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredAuditLogs.slice(0, 12).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-950/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono tabular-nums text-[11px] text-slate-400 whitespace-nowrap">
                          {formatShortDate(log.timestamp)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 font-semibold whitespace-nowrap">
                          {log.actorName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            {log.severity === 'critical' ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : log.severity === 'warning' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span>{log.action}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {log.target}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column: Operational queues */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white pb-3 border-b border-slate-800">
              Filas Operacionais
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/70">
                <div>
                  <div className="font-semibold text-white">Verificações KYC Pendentes</div>
                  <div className="text-[11px] text-slate-400">
                    {userStats.pendingKyc} conta(s) aguardando revisão documental
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserStatusFilter('pending_kyc');
                    setSection('users');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Revisar
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/70">
                <div>
                  <div className="font-semibold text-white">Saques em Processamento</div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                    {financeStats.processingWdCount} solicitações ·{' '}
                    {formatCurrency(financeStats.processingWdAmount, selectedCurrency)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFinanceMode('withdrawals');
                    setWdStatusFilter('processing');
                    setSection('finance');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Gerenciar
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/70">
                <div>
                  <div className="font-semibold text-white">Moderação de Catálogo</div>
                  <div className="text-[11px] text-slate-400">
                    {contentStats.totalPublished} ativos · {contentStats.totalHidden} pausados
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSection('content')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Moderar
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-white">Regras de Taxas & Gateways</div>
                  <div className="text-[11px] text-slate-400">
                    {platformAdminSettings.kycRequiredForPayouts
                      ? 'KYC obrigatório ativo'
                      : 'KYC flexível'}{' '}
                    · Saque mín. R$ {platformAdminSettings.minWithdrawalAmount}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSection('settings')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Configurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: USERS MANAGEMENT */}
      {section === 'users' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Gerenciamento de Usuários</h2>
                <p className="text-xs text-slate-400">
                  Controle perfis de acesso, aprovação KYC, suspensão de contas e criação de novos operadores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewUserForm((prev) => !prev);
                  setNewUserError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showNewUserForm ? 'Fechar Formulário' : 'Novo Usuário'}</span>
              </button>
            </div>

            {showNewUserForm && (
              <form
                onSubmit={handleCreateUserSubmit}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ex: Beatriz Oliveira"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="beatriz@exemplo.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Função
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) =>
                        setNewUserRole(e.target.value as 'creator' | 'client' | 'admin')
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="creator">Criador</option>
                      <option value="client">Cliente / Comprador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Categoria
                    </label>
                    <input
                      type="text"
                      value={newUserCategory}
                      onChange={(e) => setNewUserCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUserKyc}
                      onChange={(e) => setNewUserKyc(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span>Aprovar verificação KYC imediatamente</span>
                  </label>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
                  >
                    Cadastrar Usuário
                  </button>
                </div>

                {newUserError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{newUserError}</span>
                  </p>
                )}
              </form>
            )}

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar usuário por nome, e-mail, @handle ou categoria..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <select
                aria-label="Filtrar por papel"
                value={userRoleFilter}
                onChange={(e) =>
                  setUserRoleFilter(e.target.value as 'all' | 'creator' | 'client' | 'admin')
                }
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todas as Funções</option>
                <option value="creator">Criadores</option>
                <option value="client">Clientes</option>
                <option value="admin">Administradores</option>
              </select>
              <select
                aria-label="Filtrar por status"
                value={userStatusFilter}
                onChange={(e) =>
                  setUserStatusFilter(
                    e.target.value as 'all' | 'active' | 'pending_kyc' | 'suspended'
                  )
                }
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativos</option>
                <option value="pending_kyc">KYC Pendente</option>
                <option value="suspended">Suspensos</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  Nenhum usuário encontrado para os filtros aplicados.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUserSearch('');
                    setUserRoleFilter('all');
                    setUserStatusFilter('all');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                      <th className="py-2.5 px-3">Usuário</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Função</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Verificação KYC</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Status da Conta</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Vitrine</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.map((user: UserAccount) => {
                      const status = user.status || 'active';
                      const isCurrent = user.id === currentUser?.id;
                      const isKycOk = user.kycVerified !== false;

                      return (
                        <tr key={user.id} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-mono text-emerald-400">
                                  (Sessão atual)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {user.email} · @{user.handle}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <select
                              aria-label={`Função de ${user.name}`}
                              value={user.role}
                              onChange={(e) =>
                                adminUpdateUser(user.id, {
                                  role: e.target.value as 'creator' | 'client' | 'admin',
                                })
                              }
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="creator">Criador</option>
                              <option value="client">Cliente</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                adminUpdateUser(user.id, {
                                  kycVerified: !isKycOk,
                                  status:
                                    !isKycOk && status === 'pending_kyc' ? 'active' : status,
                                })
                              }
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                                isKycOk ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {isKycOk ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>KYC Aprovado</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Aprovar KYC</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {status === 'suspended' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                                <Ban className="w-3.5 h-3.5" />
                                <span>Suspenso</span>
                              </span>
                            ) : status === 'pending_kyc' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>KYC Pendente</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Ativo</span>
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                            {user.showcaseItems?.length || 0} itens
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => switchUser(user.id)}
                                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  Assumir Sessão
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  adminUpdateUser(user.id, {
                                    status: status === 'suspended' ? 'active' : 'suspended',
                                  })
                                }
                                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                                  status === 'suspended'
                                    ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {status === 'suspended' ? 'Reativar' : 'Suspender'}
                              </button>

                              {!isCurrent &&
                                (confirmDeleteUserId === user.id ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      adminDeleteUser(user.id);
                                      setConfirmDeleteUserId(null);
                                    }}
                                    className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                                  >
                                    Confirmar
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label={`Remover ${user.name}`}
                                    onClick={() => setConfirmDeleteUserId(user.id)}
                                    className="p-1.5 rounded-md bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: FINANCIAL TRANSACTIONS & WITHDRAWALS */}
      {section === 'finance' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Monitoramento de Transações & Repasses
                </h2>
                <p className="text-xs text-slate-400">
                  Aprove cobranças pendentes, processe estornos e controle liquidações de saques em tempo real.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFinanceMode('transactions')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    financeMode === 'transactions'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Transações ({transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceMode('withdrawals')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    financeMode === 'withdrawals'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Solicitações de Saque ({withdrawals.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder={
                    financeMode === 'transactions'
                      ? 'Buscar por ID, cliente, e-mail, título ou método...'
                      : 'Buscar por comprovante, destino ou motivo de falha...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {financeMode === 'transactions' ? (
                <select
                  aria-label="Filtrar transações por status"
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value as 'all' | TransactionStatus)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="approved">Aprovada</option>
                  <option value="pending">Pendente</option>
                  <option value="refunded">Estornada</option>
                </select>
              ) : (
                <select
                  aria-label="Filtrar saques por status"
                  value={wdStatusFilter}
                  onChange={(e) =>
                    setWdStatusFilter(e.target.value as 'all' | WithdrawalRequest['status'])
                  }
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="processing">Processando</option>
                  <option value="completed">Sucesso</option>
                  <option value="failed">Falha</option>
                  <option value="reversed">Estornado</option>
                </select>
              )}
            </div>
          </div>

          {financeMode === 'transactions' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhuma transação encontrada para os filtros aplicados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                        <th className="py-2.5 px-3 whitespace-nowrap">Data & ID</th>
                        <th className="py-2.5 px-3">Pagador & Item</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Método</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Bruto / Líq.</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredTransactions.slice(0, 25).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-mono tabular-nums text-[11px] text-slate-200">
                              {formatShortDate(tx.createdAt)}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">{tx.id}</div>
                          </td>
                          <td className="py-2.5 px-3 max-w-[260px]">
                            <div className="font-semibold text-white truncate">{tx.title}</div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {tx.customerName} · {tx.customerEmail}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono uppercase text-[11px] text-slate-300">
                            {tx.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums">
                            <div className="font-semibold text-white">
                              {formatCurrency(tx.grossAmount, selectedCurrency)}
                            </div>
                            <div className="text-[10px] text-emerald-400">
                              Líq: {formatCurrency(tx.netAmount, selectedCurrency)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {tx.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprovada</span>
                              </span>
                            ) : tx.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pendente</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Estornada</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {tx.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => adminUpdateTransactionStatus(tx.id, 'approved')}
                                  className="px-2 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  Aprovar
                                </button>
                              )}
                              {tx.status !== 'refunded' && (
                                <button
                                  type="button"
                                  onClick={() => adminUpdateTransactionStatus(tx.id, 'refunded')}
                                  className="px-2 py-1 rounded-md bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  Estornar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {filteredWithdrawals.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhuma solicitação de saque encontrada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                        <th className="py-2.5 px-3 whitespace-nowrap">Data & Comprovante</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Método</th>
                        <th className="py-2.5 px-3">Destino</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Valor</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredWithdrawals.map((wd) => (
                        <tr key={wd.id} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-mono tabular-nums text-[11px] text-slate-200">
                              {formatShortDate(wd.requestedAt)}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {wd.receiptNumber}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-200">
                            {wd.destinationType === 'express'
                              ? 'Multicaixa Express'
                              : wd.destinationType === 'visa_card'
                              ? 'Visa Direct'
                              : wd.destinationType === 'ted'
                              ? 'Transferência Bancária'
                              : wd.destinationType.toUpperCase()}
                          </td>
                          <td className="py-2.5 px-3 max-w-[220px]">
                            <div className="font-mono text-[11px] text-slate-300 truncate">
                              {wd.destinationKey}
                            </div>
                            {wd.failureReason && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {wd.failureReason}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums font-semibold text-white">
                            {formatCurrency(wd.amount, selectedCurrency)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {wd.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Sucesso</span>
                              </span>
                            ) : wd.status === 'processing' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Processando</span>
                              </span>
                            ) : wd.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Falha</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Estornado</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {wd.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => adminUpdateWithdrawalStatus(wd.id, 'completed')}
                                  className="px-2 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  Liquidar
                                </button>
                              )}
                              {wd.status !== 'failed' && (
                                <button
                                  type="button"
                                  onClick={() => adminUpdateWithdrawalStatus(wd.id, 'failed')}
                                  className="px-2 py-1 rounded-md bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  Falha
                                </button>
                              )}
                              {wd.status !== 'reversed' && (
                                <button
                                  type="button"
                                  onClick={() => adminUpdateWithdrawalStatus(wd.id, 'reversed')}
                                  className="px-2 py-1 rounded-md bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  Estornar Saldo
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: CONTENT MODERATION */}
      {section === 'content' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                Moderação de Conteúdo & Catálogo
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie visibilidade, preço, destaque editorial e remoção de produtos digitais e artigos paywall.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  placeholder="Buscar por título ou categoria..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <select
                aria-label="Filtrar por tipo de conteúdo"
                value={contentTypeFilter}
                onChange={(e) =>
                  setContentTypeFilter(e.target.value as 'all' | 'product' | 'post')
                }
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todos os Tipos</option>
                <option value="product">Produtos Digitais</option>
                <option value="post">Artigos Paywall</option>
              </select>
              <select
                aria-label="Filtrar por visibilidade"
                value={contentVisFilter}
                onChange={(e) =>
                  setContentVisFilter(e.target.value as 'all' | 'published' | 'hidden')
                }
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Qualquer Status</option>
                <option value="published">Publicados</option>
                <option value="hidden">Pausados / Ocultos</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {unifiedContentItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum item de conteúdo encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                      <th className="py-2.5 px-3">Título & Engajamento</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Tipo</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Preço</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Moderação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {unifiedContentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-950/50 transition-colors">
                        <td className="py-2.5 px-3 max-w-[300px]">
                          <div className="font-semibold text-white truncate">{item.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {item.engagementLabel}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums">
                          {editingPriceId === item.id ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={editingPriceVal}
                                onChange={(e) => setEditingPriceVal(e.target.value)}
                                className="w-20 bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-xs text-white text-right"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlinePrice(item.kind, item.id)}
                                className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceId(item.id);
                                setEditingPriceVal(item.price.toFixed(2));
                              }}
                              title="Clique para ajustar o preço"
                              className="font-semibold text-white hover:text-emerald-400 underline decoration-dotted underline-offset-4 cursor-pointer"
                            >
                              {formatCurrency(item.price, selectedCurrency)}
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {item.isPublished ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Publicado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Pausado</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {item.kind === 'product' && (
                              <button
                                type="button"
                                onClick={() => adminToggleProductFeatured(item.id)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                                  item.featured
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <Star className="w-3 h-3" />
                                <span>{item.featured ? 'Destaque' : 'Destacar'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                item.kind === 'product'
                                  ? adminToggleProductVisibility(item.id)
                                  : adminUpdateGatedPost(item.id, {
                                      isPublished: !item.isPublished,
                                    })
                              }
                              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                            >
                              {item.isPublished ? 'Pausar' : 'Publicar'}
                            </button>

                            {confirmDeleteContentId === item.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.kind === 'product') {
                                    deleteProduct(item.id);
                                    addAdminAuditLog({
                                      actorName: currentUser?.name || 'Admin',
                                      action: 'Produto digital excluído pela moderação',
                                      target: item.title,
                                      category: 'content',
                                      severity: 'critical',
                                    });
                                  } else {
                                    adminDeleteGatedPost(item.id);
                                  }
                                  setConfirmDeleteContentId(null);
                                }}
                                className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                              >
                                Confirmar
                              </button>
                            ) : (
                              <button
                                type="button"
                                aria-label={`Excluir ${item.title}`}
                                onClick={() => setConfirmDeleteContentId(item.id)}
                                className="p-1.5 rounded-md bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: GLOBAL PLATFORM SETTINGS */}
      {section === 'settings' && (
        <form onSubmit={handleSaveGlobalSettings} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Fees & Withdrawal Policies */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-white">
                    Taxas & Limites Financeiros Globais
                  </h2>
                  <ModalityFeeTooltip
                    modality="all_summary"
                    triggerLabel="Impacto no checkout"
                    tone="emerald"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aplicados automaticamente no cálculo líquido do checkout e nas validações de saque.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nome da Plataforma
                  </label>
                  <input
                    type="text"
                    value={settingsDraft.platformName}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({ ...prev, platformName: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    E-mail Oficial de Suporte
                  </label>
                  <input
                    type="email"
                    value={settingsDraft.supportEmail}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({ ...prev, supportEmail: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Taxa Cartão/Geral (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="40"
                    value={settingsDraft.platformFeePercent}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        platformFeePercent: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Taxa PIX (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="40"
                    value={settingsDraft.pixFeePercent}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        pixFeePercent: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Taxa Plano Pro (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="40"
                    value={settingsDraft.proFeePercent}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        proFeePercent: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Saque Mínimo (R$)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={settingsDraft.minWithdrawalAmount}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        minWithdrawalAmount: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Limite Diário (R$)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="500"
                    value={settingsDraft.maxDailyWithdrawalAmount}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        maxDailyWithdrawalAmount: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Moeda Padrão
                  </label>
                  <select
                    value={settingsDraft.defaultCurrency}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        defaultCurrency: e.target.value as Currency,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="BRL">BRL (Real)</option>
                    <option value="AOA">AOA (Kwanza)</option>
                    <option value="USD">USD (Dólar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Security & Governance Switches */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white">
                  Segurança, KYC & Operação do Aplicativo
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Regras de conformidade aplicadas em toda a experiência de criadores e compradores.
                </p>
              </div>

              {(
                [
                  {
                    key: 'kycRequiredForPayouts',
                    title: 'Exigir Verificação KYC antes de Sacar',
                    desc: 'Impede solicitações de saque de contas cujo KYC ainda esteja pendente.',
                  },
                  {
                    key: 'autoSettlementEnabled',
                    title: 'Liquidação Automática de Repasses Elegíveis',
                    desc: 'Processa repasses instantâneos via Multicaixa Express e Visa Direct sem fila manual.',
                  },
                  {
                    key: 'contentAutoModeration',
                    title: 'Revisão Automática de Novos Conteúdos',
                    desc: 'Monitora títulos, preços e links em produtos digitais e posts paywall.',
                  },
                  {
                    key: 'newCreatorSignupsEnabled',
                    title: 'Permitir Novos Cadastros de Criadores',
                    desc: 'Habilita o registro de novas contas de criadores e vitrines públicas.',
                  },
                  {
                    key: 'maintenanceMode',
                    title: 'Modo Manutenção na Vitrine Pública',
                    desc: 'Exibe aviso operacional de manutenção para visitantes durante janelas técnicas.',
                  },
                ] as Array<{
                  key: keyof Pick<
                    PlatformAdminSettings,
                    | 'kycRequiredForPayouts'
                    | 'autoSettlementEnabled'
                    | 'contentAutoModeration'
                    | 'newCreatorSignupsEnabled'
                    | 'maintenanceMode'
                  >;
                  title: string;
                  desc: string;
                }>
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between gap-3 py-2 border-b border-slate-800/70 last:border-b-0 cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{item.title}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settingsDraft[item.key])}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Monetization Modules & Gateways */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white">Módulos de Monetização Ativos</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ative ou pause globalmente os pilares de receita disponíveis para criadores.
                </p>
              </div>

              {(
                [
                  { key: 'adsEnabled', label: 'Anúncios & Rede de Ads (eCPM / Vídeo Premiado)' },
                  { key: 'subscriptionsEnabled', label: 'Clube de Assinaturas VIP Recorrentes' },
                  { key: 'exclusiveContentPaywallEnabled', label: 'Artigos Fechados (Paywall)' },
                  { key: 'donationsEnabled', label: 'Gorjetas & Metas de Arrecadação' },
                  {
                    key: 'followerInAppPurchasesEnabled',
                    label: 'Compras In-App de Seguidores',
                  },
                ] as const
              ).map((mod) => (
                <label
                  key={mod.key}
                  className="flex items-center justify-between gap-3 py-1.5 cursor-pointer text-xs"
                >
                  <span className="text-slate-200 font-medium">{mod.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(monetizationModels[mod.key])}
                    onChange={(e) => {
                      updateMonetizationModels({ [mod.key]: e.target.checked });
                      addAdminAuditLog({
                        actorName: currentUser?.name || 'Admin',
                        action: `${mod.label} ${e.target.checked ? 'ativado' : 'pausado'}`,
                        target: 'Módulos de Monetização',
                        category: 'settings',
                        severity: 'info',
                      });
                    }}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                  />
                </label>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Gateways de Pagamento Configurados
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controle habilitação e alternância Sandbox / Produção em tempo real.
                  </p>
                </div>
                <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {(
                [
                  { provider: 'stripe' as GatewayProvider, cfg: gatewaySettings.stripe },
                  { provider: 'paypal' as GatewayProvider, cfg: gatewaySettings.paypal },
                  { provider: 'visa_direct' as GatewayProvider, cfg: gatewaySettings.visaDirect },
                  {
                    provider: 'multicaixa_express' as GatewayProvider,
                    cfg: gatewaySettings.multicaixaExpress,
                  },
                ]
              ).map(({ provider, cfg }) => (
                <div
                  key={provider}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-800/70 last:border-b-0 text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{cfg.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {cfg.complianceLevel} · {cfg.mode === 'live' ? 'Produção' : 'Sandbox'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        toggleGatewayMode(provider);
                        addAdminAuditLog({
                          actorName: currentUser?.name || 'Admin',
                          action: `Modo de gateway alternado (${cfg.name})`,
                          target: cfg.mode === 'live' ? 'sandbox' : 'live',
                          category: 'settings',
                          severity: 'warning',
                        });
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200 transition cursor-pointer whitespace-nowrap"
                    >
                      {cfg.mode === 'live' ? 'LIVE' : 'SANDBOX'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateGatewayConfig(provider, { enabled: !cfg.enabled });
                        addAdminAuditLog({
                          actorName: currentUser?.name || 'Admin',
                          action: `Gateway ${cfg.name} ${!cfg.enabled ? 'ativado' : 'desativado'}`,
                          target: provider,
                          category: 'settings',
                          severity: !cfg.enabled ? 'info' : 'warning',
                        });
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                        cfg.enabled
                          ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                      }`}
                    >
                      {cfg.enabled ? 'Ativo' : 'Desativado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {settingsError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{settingsError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Alterações registradas na Trilha de Auditoria Administrativa.</span>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              {settingsSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>
                {settingsSaved
                  ? 'Configurações Globais Salvas!'
                  : 'Salvar Configurações Gerais'}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
