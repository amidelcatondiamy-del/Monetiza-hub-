import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  CreditCard,
  Bell,
  ShieldCheck,
  Check,
  Save,
  Volume2,
  VolumeX,
  Mail,
  Smartphone,
  Globe,
  Building,
  QrCode,
  FileText,
  Lock,
  CheckCircle2,
  DollarSign,
  Send,
  Sparkles,
  History,
  Zap,
  Clock,
  Filter,
  CheckCheck,
  Trash2,
  ArrowUpRight,
  ShieldAlert,
  KeyRound,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  HardDrive,
  Unlock,
  Sun,
  Moon,
  Monitor,
  Palette,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { NotificationChannelChoice, ThemePreference } from '../../types/monetization';
import { PspConfigurationWizard } from './PspConfigurationWizard';
import { PayoutAuditSection } from './PayoutAuditSection';
import {
  formatAccountNumberInput,
  formatAgencyInput,
  formatDocumentInput,
  POPULAR_BANKS,
  validateBankAccountForm,
} from '../../utils/bankAccountValidation';

export type SettingsTabId =
  | 'profile'
  | 'appearance'
  | 'payouts'
  | 'banking'
  | 'payoutAudit'
  | 'notifications'
  | 'history'
  | 'security';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'payouts',
}) => {
  const {
    creator,
    saveEncryptedCreatorSettings,
    creatorVaultStatus,
    encryptedCreatorEnvelope,
    reencryptCreatorVault,
    unlockCreatorVault,
    lockCreatorVault,
    clearCustomVaultPassphrase,
    syncCreatorVaultToDatabase,
    soundActive,
    toggleSound,
    notificationSettings,
    triggerNotificationTest,
    triggerSimulatedBalanceAlert,
    availableBalance,
    notificationHistory,
    clearNotificationHistory,
    withdrawals,
    themePreference,
    resolvedTheme,
    systemTheme,
    setThemePreference,
  } = useMonetization();

  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  // Profile data
  const [name, setName] = useState(creator.name);
  const [email, setEmail] = useState(creator.email || 'amidelcatondiamy@gmail.com');
  const [phone, setPhone] = useState(creator.phone || '(11) 98765-4321');
  const [documentNumber, setDocumentNumber] = useState(creator.documentNumber || '123.456.789-00');
  const [handle, setHandle] = useState(creator.handle);
  const [tagline, setTagline] = useState(creator.tagline);
  const [bio, setBio] = useState(creator.bio);
  const [category, setCategory] = useState(creator.category);
  const [instagram, setInstagram] = useState(creator.socials.instagram || '');
  const [youtube, setYoutube] = useState(creator.socials.youtube || '');

  // Payout defaults: Visa card
  const [visaHolder, setVisaHolder] = useState(
    creator.savedVisaCard?.holderName || (creator.name || 'TITULAR DO CARTAO').toUpperCase()
  );
  const [visaNumber, setVisaNumber] = useState(
    creator.savedVisaCard?.fullCardNumber || `4111 2222 3333 ${creator.savedVisaCard?.last4 || '4829'}`
  );
  const [visaExpiry, setVisaExpiry] = useState(creator.savedVisaCard?.expiryDate || '09/29');

  // Payout defaults: Express (Multicaixa Express / Switch EMIS Angola)
  const [expressPhone, setExpressPhone] = useState(
    creator.expressPhone || creator.phone || '+244 923 456 789'
  );
  const [expressBankName, setExpressBankName] = useState(
    creator.expressBankName || 'Banco BAI Angola'
  );
  const [preferredPayoutMethod, setPreferredPayoutMethod] = useState<
    'express' | 'visa_card' | 'ted'
  >(() => {
    if (creator.preferredPayoutChannel === 'visa_card') return 'visa_card';
    if (creator.preferredPayoutChannel === 'ted') return 'ted';
    if (creator.preferredPayoutChannel === 'express') return 'express';
    return creator.autoPayoutExpress ? 'express' : 'visa_card';
  });
  const [autoFlowWithdrawals, setAutoFlowWithdrawals] = useState<boolean>(
    creator.autoFlowWithdrawals ?? true
  );
  const [autoPayoutExpress, setAutoPayoutExpress] = useState<boolean>(
    creator.autoPayoutExpress ?? creator.preferredPayoutChannel === 'express'
  );
  const [withdrawPrefError, setWithdrawPrefError] = useState<string | null>(null);

  // Pix key
  const [pixKey, setPixKey] = useState(creator.pixKey || 'amidelcatondiamy@gmail.com');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'email' | 'phone' | 'random'>(
    creator.pixKeyType || 'email'
  );

  // Bank Account (Conta Bancária Principal)
  const [bankName, setBankName] = useState(
    creator.bankAccount?.bankName || '260 - Nu Pagamentos S.A. (Nubank)'
  );
  const [agency, setAgency] = useState(creator.bankAccount?.agency || '0001');
  const [accountNumber, setAccountNumber] = useState(
    creator.bankAccount?.accountNumber || '1234567-8'
  );
  const [accountType, setAccountType] = useState<'corrente' | 'poupanca'>(
    creator.bankAccount?.accountType || 'corrente'
  );
  const [bankDocumentNumber, setBankDocumentNumber] = useState(
    creator.bankAccount?.documentNumber || creator.documentNumber || ''
  );
  const [bankTouched, setBankTouched] = useState<{
    bankName?: boolean;
    agency?: boolean;
    accountNumber?: boolean;
    documentNumber?: boolean;
  }>({});
  const [bankSubmitError, setBankSubmitError] = useState<string | null>(null);
  const [bankSavedNotice, setBankSavedNotice] = useState<boolean>(false);

  // Campo 'Alerta de Saldo Mínimo' & Notificações
  const [minBalanceAlertEnabled, setMinBalanceAlertEnabled] = useState<boolean>(
    notificationSettings.minBalanceAlertEnabled ?? notificationSettings.enabled ?? true
  );
  const [minBalanceThreshold, setMinBalanceThreshold] = useState<number>(
    notificationSettings.minBalanceThreshold ?? notificationSettings.minWithdrawalThreshold ?? 1000
  );
  const [minBalanceChannel, setMinBalanceChannel] = useState<NotificationChannelChoice>(
    notificationSettings.minBalanceChannel ||
      (notificationSettings.emailAlerts && notificationSettings.pushAlerts
        ? 'both'
        : notificationSettings.emailAlerts
        ? 'email'
        : 'push')
  );
  const [smsAlerts, setSmsAlerts] = useState(notificationSettings.smsAlerts ?? false);
  const [destinationEmail, setDestinationEmail] = useState(
    notificationSettings.destinationEmail || email || creator.email || 'amidelcatondiamy@gmail.com'
  );
  const [screenToasts, setScreenToasts] = useState(true);
  const [testNotificationResult, setTestNotificationResult] = useState<string | null>(null);

  // History Tab Filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'email' | 'push'>('all');
  const [historySearch, setHistorySearch] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isEncryptingSaving, setIsEncryptingSaving] = useState(false);
  const [saveSecurityError, setSaveSecurityError] = useState<string | null>(null);
  const [isPspWizardOpen, setIsPspWizardOpen] = useState(false);

  // Security & AES-256 Vault controls
  const [unlockPassphraseInput, setUnlockPassphraseInput] = useState('');
  const [newPassphraseInput, setNewPassphraseInput] = useState('');
  const [showPassphraseChars, setShowPassphraseChars] = useState(false);
  const [vaultActionNotice, setVaultActionNotice] = useState<string | null>(null);
  const [vaultActionError, setVaultActionError] = useState<string | null>(null);
  const [isVaultBusy, setIsVaultBusy] = useState(false);
  const [showRawEncryptedJson, setShowRawEncryptedJson] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setWithdrawPrefError(null);
    setSaveSecurityError(null);
    setVaultActionNotice(null);
    setVaultActionError(null);
    setName(creator.name);
    setEmail(creator.email || '');
    setPhone(creator.phone || '');
    setDocumentNumber(creator.documentNumber || '');
    setHandle(creator.handle);
    setTagline(creator.tagline);
    setBio(creator.bio);
    setCategory(creator.category);
    setInstagram(creator.socials.instagram || '');
    setYoutube(creator.socials.youtube || '');
    setVisaHolder(
      creator.savedVisaCard?.holderName || (creator.name || 'TITULAR DO CARTAO').toUpperCase()
    );
    setVisaNumber(
      creator.savedVisaCard?.fullCardNumber ||
        `4111 2222 3333 ${creator.savedVisaCard?.last4 || '4829'}`
    );
    setVisaExpiry(creator.savedVisaCard?.expiryDate || '09/29');
    setExpressPhone(creator.expressPhone || creator.phone || '');
    setExpressBankName(creator.expressBankName || 'Banco BAI Angola');
    setPixKey(creator.pixKey || '');
    setPixKeyType(creator.pixKeyType || 'email');
    setBankName(creator.bankAccount?.bankName || '260 - Nu Pagamentos S.A. (Nubank)');
    setAgency(creator.bankAccount?.agency || '0001');
    setAccountNumber(creator.bankAccount?.accountNumber || '1234567-8');
    setAccountType(creator.bankAccount?.accountType || 'corrente');
    setBankDocumentNumber(creator.bankAccount?.documentNumber || creator.documentNumber || '');
    setDestinationEmail(
      notificationSettings.destinationEmail || creator.email || 'amidelcatondiamy@gmail.com'
    );
    setPreferredPayoutMethod(
      creator.preferredPayoutChannel === 'visa_card'
        ? 'visa_card'
        : creator.preferredPayoutChannel === 'ted'
        ? 'ted'
        : creator.preferredPayoutChannel === 'express'
        ? 'express'
        : creator.autoPayoutExpress
        ? 'express'
        : 'visa_card'
    );
    setAutoFlowWithdrawals(creator.autoFlowWithdrawals ?? true);
    setAutoPayoutExpress(
      creator.autoPayoutExpress ?? creator.preferredPayoutChannel === 'express'
    );
    setMinBalanceAlertEnabled(
      notificationSettings.minBalanceAlertEnabled ?? notificationSettings.enabled ?? true
    );
    setMinBalanceThreshold(
      notificationSettings.minBalanceThreshold ?? notificationSettings.minWithdrawalThreshold ?? 1000
    );
    setMinBalanceChannel(
      notificationSettings.minBalanceChannel ||
        (notificationSettings.emailAlerts && notificationSettings.pushAlerts
          ? 'both'
          : notificationSettings.emailAlerts
          ? 'email'
          : 'push')
    );
  }, [isOpen, initialTab, creatorVaultStatus.locked, creator.savedVisaCard?.last4, creator.email, creator.pixKey, creator.bankAccount?.accountNumber]);

  if (!isOpen) return null;

  const handleFormatCard = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    const parts = clean.match(/.{1,4}/g);
    setVisaNumber(parts ? parts.join(' ') : clean);
  };

  const handleFormatExpiry = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) {
      setVisaExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setVisaExpiry(clean);
    }
  };

  const bankValidation = validateBankAccountForm({
    bankName,
    agency,
    accountNumber,
    documentNumber: bankDocumentNumber,
  });

  const hasBankingInteraction =
    activeTab === 'banking' ||
    Boolean(
      bankTouched.bankName ||
        bankTouched.agency ||
        bankTouched.accountNumber ||
        bankTouched.documentNumber
    );

  const handleSavePrimaryBankAccount = async () => {
    if (creatorVaultStatus.locked) {
      setBankSubmitError('Desbloqueie o cofre AES-256 antes de alterar e salvar dados bancários.');
      return;
    }

    setBankTouched({
      bankName: true,
      agency: true,
      accountNumber: true,
      documentNumber: true,
    });

    if (!bankValidation.valid) {
      setBankSavedNotice(false);
      setBankSubmitError(
        'Corrija os formatos destacados abaixo (Banco, Agência, Conta e CPF/CNPJ/BI) antes de salvar.'
      );
      return;
    }

    setBankSubmitError(null);
    setIsEncryptingSaving(true);
    setDocumentNumber(bankDocumentNumber.trim());

    const result = await saveEncryptedCreatorSettings({
      documentNumber: bankDocumentNumber.trim(),
      bankAccount: {
        bankName: bankName.trim(),
        agency: agency.trim().toUpperCase(),
        accountNumber: accountNumber.trim().toUpperCase(),
        accountType,
        documentNumber: bankDocumentNumber.trim(),
      },
    });
    setIsEncryptingSaving(false);

    if (!result.success) {
      setBankSubmitError(result.error || 'Falha ao criptografar e salvar dados bancários.');
      return;
    }

    setBankSavedNotice(true);
    window.setTimeout(() => setBankSavedNotice(false), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creatorVaultStatus.locked) {
      setSaveSecurityError('Desbloqueie o cofre AES-256-GCM antes de salvar alterações.');
      return;
    }

    const parsedMinThreshold = Number(minBalanceThreshold);
    if (minBalanceAlertEnabled && (!Number.isFinite(parsedMinThreshold) || parsedMinThreshold <= 0)) {
      setActiveTab('payouts');
      setWithdrawPrefError('Informe um limite de saldo mínimo maior que R$ 0,00 para ativar os alertas automáticos.');
      return;
    }

    if (
      minBalanceAlertEnabled &&
      (minBalanceChannel === 'email' || minBalanceChannel === 'both') &&
      (!destinationEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinationEmail.trim()))
    ) {
      setActiveTab('payouts');
      setWithdrawPrefError('Informe um e-mail de destino válido para receber os alertas automáticos de saldo.');
      return;
    }

    if (
      (hasBankingInteraction || preferredPayoutMethod === 'ted') &&
      !bankValidation.valid
    ) {
      setActiveTab('banking');
      setBankTouched({
        bankName: true,
        agency: true,
        accountNumber: true,
        documentNumber: true,
      });
      setBankSubmitError(
        preferredPayoutMethod === 'ted'
          ? 'Você escolheu Transferência Bancária como método preferencial. Preencha e valide sua Conta Bancária Principal antes de salvar.'
          : 'Corrija os campos da Conta Bancária Principal antes de salvar seus dados.'
      );
      return;
    }

    setWithdrawPrefError(null);
    setBankSubmitError(null);
    setSaveSecurityError(null);
    const cleanCard = visaNumber.replace(/\D/g, '');
    const last4Digits = cleanCard.length >= 4 ? cleanCard.slice(-4) : '4829';
    const resolvedDocNumber = bankValidation.valid
      ? bankDocumentNumber.trim()
      : documentNumber;
    const effectiveAutoExpress =
      preferredPayoutMethod === 'express' && (autoPayoutExpress || autoFlowWithdrawals);
    const effectiveAutoVisa =
      preferredPayoutMethod === 'visa_card' && autoFlowWithdrawals;

    const safeMinThreshold = Number.isFinite(parsedMinThreshold) && parsedMinThreshold > 0
      ? parsedMinThreshold
      : 1000;

    setIsEncryptingSaving(true);
    const encryptResult = await saveEncryptedCreatorSettings(
      {
        name,
        email,
        phone,
        documentNumber: resolvedDocNumber,
        handle,
        tagline,
        bio,
        category,
        expressPhone: expressPhone.trim(),
        expressBankName,
        autoPayoutExpress: effectiveAutoExpress,
        autoPayoutVisa: effectiveAutoVisa,
        autoFlowWithdrawals,
        preferredPayoutChannel: preferredPayoutMethod,
        pixKey,
        pixKeyType,
        socials: {
          ...creator.socials,
          instagram,
          youtube,
        },
        savedVisaCard: {
          holderName: visaHolder.toUpperCase(),
          last4: last4Digits,
          expiryDate: visaExpiry,
          cardBrand: 'Visa',
          fullCardNumber: visaNumber,
        },
        bankAccount: {
          bankName: bankName.trim(),
          agency: agency.trim().toUpperCase(),
          accountNumber: accountNumber.trim().toUpperCase(),
          accountType,
          documentNumber: bankDocumentNumber.trim() || creator.bankAccount?.documentNumber,
        },
      },
      {
        enabled: minBalanceAlertEnabled,
        minWithdrawalThreshold: safeMinThreshold,
        emailAlerts: minBalanceChannel === 'email' || minBalanceChannel === 'both',
        pushAlerts: minBalanceChannel === 'push' || minBalanceChannel === 'both',
        smsAlerts,
        destinationEmail: destinationEmail.trim(),
        minBalanceAlertEnabled,
        minBalanceThreshold: safeMinThreshold,
        minBalanceChannel,
      }
    );
    setIsEncryptingSaving(false);

    if (!encryptResult.success) {
      setSaveSecurityError(
        encryptResult.error || 'Erro ao criptografar os dados em AES-256-GCM.'
      );
      return;
    }

    if (minBalanceAlertEnabled && availableBalance >= safeMinThreshold) {
      triggerSimulatedBalanceAlert({
        threshold: safeMinThreshold,
        channel: minBalanceChannel,
        email: destinationEmail.trim(),
        force: true,
      });
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative text-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Dados Cadastrais & Recebimento de Ganhos
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded border transition cursor-pointer whitespace-nowrap shrink-0 ${
                  creatorVaultStatus.locked
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>
                  {creatorVaultStatus.locked ? 'Cofre AES-256 Trancado' : 'AES-256-GCM Ativo'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20 transition cursor-pointer whitespace-nowrap shrink-0"
                title="Alternar tema Claro, Escuro ou Sistema"
              >
                {resolvedTheme === 'light' ? (
                  <Sun className="w-3 h-3 text-amber-400" />
                ) : (
                  <Moon className="w-3 h-3 text-indigo-400" />
                )}
                <span>
                  Tema:{' '}
                  {themePreference === 'system'
                    ? `Sistema (${systemTheme === 'light' ? 'Claro' : 'Escuro'})`
                    : themePreference === 'light'
                    ? 'Claro'
                    : 'Escuro'}
                </span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dados bancários, fiscais e credenciais são criptografados em AES-256-GCM antes de gravar localmente e no banco.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'payouts'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            <span>Saque no Cartão Visa & Express</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('banking')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'banking'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-purple-400" />
            <span>Conta Bancária Principal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payoutAudit')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'payoutAudit'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auditoria de Repasses</span>
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
              ({withdrawals.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dados Pessoais & Fiscais</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-indigo-400" />
            <span>Alertas & Som</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Auditoria de Alertas</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-1.5 py-0.2 rounded-full border border-amber-500/30">
              {notificationHistory.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-amber-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Aparência & Tema</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'security'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Criptografia AES-256</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {creatorVaultStatus.locked && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-200">
                      Cofre AES-256-GCM Trancado com Frase-Senha Pessoal
                    </h3>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      Seus dados bancários e credenciais permanecem criptografados e mascarados. Informe sua frase-senha para descriptografar e editar.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type={showPassphraseChars ? 'text' : 'password'}
                  value={unlockPassphraseInput}
                  onChange={(e) => setUnlockPassphraseInput(e.target.value)}
                  placeholder="Digite sua frase-senha do cofre AES-256"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={isVaultBusy}
                  onClick={async () => {
                    setVaultActionError(null);
                    setVaultActionNotice(null);
                    setIsVaultBusy(true);
                    const res = await unlockCreatorVault(unlockPassphraseInput);
                    setIsVaultBusy(false);
                    if (!res.success) {
                      setVaultActionError(res.error || 'Frase-senha inválida.');
                    } else {
                      setUnlockPassphraseInput('');
                      setVaultActionNotice('Cofre AES-256-GCM descriptografado com sucesso!');
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isVaultBusy ? 'Desbloqueando...' : 'Desbloquear Cofre'}</span>
                </button>
              </div>
              {vaultActionError && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{vaultActionError}</span>
                </p>
              )}
            </div>
          )}

          {/* TAB: PAYOUTS (PREFERÊNCIAS DE SAQUE, VISA, EXPRESS & PIX) */}
          {activeTab === 'payouts' && (
            <div className="space-y-4">
              {/* Preferências de Saque */}
              <div className="bg-slate-950 p-5 rounded-xl border border-emerald-500/30 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Preferências de Saque</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Configure o limite de saldo mínimo para alertas automáticos e o método preferencial para automatizar o fluxo financeiro.
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap shrink-0 ${
                      autoFlowWithdrawals
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{autoFlowWithdrawals ? 'Fluxo Automatizado' : 'Fluxo Manual'}</span>
                  </span>
                </div>

                {/* Método Preferencial */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Método Preferencial de Recebimento
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Multicaixa */}
                    <button
                      type="button"
                      onClick={() => {
                        setPreferredPayoutMethod('express');
                        setAutoPayoutExpress(true);
                        setWithdrawPrefError(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                        preferredPayoutMethod === 'express'
                          ? 'bg-amber-500/10 border-amber-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Zap
                            className={`w-3.5 h-3.5 ${
                              preferredPayoutMethod === 'express' ? 'text-amber-400' : 'text-slate-400'
                            }`}
                          />
                          <span className="text-xs font-bold">Multicaixa</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-400">EXPRESS</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {expressPhone.trim() || 'Informe o nº Express abaixo'}
                      </p>
                    </button>

                    {/* Visa */}
                    <button
                      type="button"
                      onClick={() => {
                        setPreferredPayoutMethod('visa_card');
                        setAutoPayoutExpress(false);
                        setWithdrawPrefError(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                        preferredPayoutMethod === 'visa_card'
                          ? 'bg-blue-500/10 border-blue-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <CreditCard
                            className={`w-3.5 h-3.5 ${
                              preferredPayoutMethod === 'visa_card' ? 'text-blue-400' : 'text-slate-400'
                            }`}
                          />
                          <span className="text-xs font-bold">Visa</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-blue-400">DIRECT</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        Cartão •••• {visaNumber.replace(/\D/g, '').slice(-4) || '4829'}
                      </p>
                    </button>

                    {/* Transferência Bancária */}
                    <button
                      type="button"
                      onClick={() => {
                        setPreferredPayoutMethod('ted');
                        setAutoPayoutExpress(false);
                        setWithdrawPrefError(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                        preferredPayoutMethod === 'ted'
                          ? 'bg-purple-500/10 border-purple-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Building
                            className={`w-3.5 h-3.5 ${
                              preferredPayoutMethod === 'ted' ? 'text-purple-400' : 'text-slate-400'
                            }`}
                          />
                          <span className="text-xs font-bold">Transferência Bancária</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-purple-400">TED/IBAN</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {bankValidation.valid
                          ? `${bankName.split(' - ')[0]} • Ag ${agency}`
                          : 'Requer conta bancária'}
                      </p>
                    </button>
                  </div>

                  {preferredPayoutMethod === 'ted' && !bankValidation.valid && (
                    <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-2 text-[11px] text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Complete os dados da Conta Bancária Principal para usar Transferência Bancária.</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('banking')}
                        className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Configurar Conta
                      </button>
                    </div>
                  )}
                </div>

                {/* Limite de Saldo Mínimo para Alertas Automáticos */}
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Limite de Saldo Mínimo para Alertas Automáticos
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Dispara aviso automático por {minBalanceChannel === 'both' ? 'E-mail e Push' : minBalanceChannel === 'email' ? 'E-mail' : 'Push'} quando o saldo disponível atingir a meta.
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Ativar alerta automático de saldo mínimo"
                      onClick={() => {
                        setMinBalanceAlertEnabled(!minBalanceAlertEnabled);
                        setWithdrawPrefError(null);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        minBalanceAlertEnabled ? 'bg-emerald-600' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                          minBalanceAlertEnabled ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {minBalanceAlertEnabled && (
                    <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-400">
                          Saldo atual disponível:{' '}
                          <strong className="font-mono tabular-nums text-emerald-400">
                            R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </span>
                        {availableBalance >= (Number(minBalanceThreshold) || 0) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Meta atingida</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono tabular-nums text-slate-400">
                            Faltam R$ {Math.max(0, (Number(minBalanceThreshold) || 0) - availableBalance).toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {[250, 500, 1000, 2500, 5000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setMinBalanceThreshold(preset);
                              setWithdrawPrefError(null);
                            }}
                            className={`py-1.5 px-1 rounded-lg text-[11px] font-mono tabular-nums font-bold border transition cursor-pointer ${
                              minBalanceThreshold === preset
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            R$ {preset.toLocaleString('pt-BR')}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="withdraw-pref-min-balance"
                            className="block text-[10px] font-semibold text-slate-300 mb-1"
                          >
                            Valor Mínimo do Saldo (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono font-bold">
                              R$
                            </span>
                            <input
                              id="withdraw-pref-min-balance"
                              type="number"
                              min="1"
                              step="50"
                              value={minBalanceThreshold}
                              onChange={(e) => {
                                setMinBalanceThreshold(Math.max(0, Number(e.target.value) || 0));
                                setWithdrawPrefError(null);
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="withdraw-pref-alert-channel"
                            className="block text-[10px] font-semibold text-slate-300 mb-1"
                          >
                            Canal de Disparo Automático
                          </label>
                          <select
                            id="withdraw-pref-alert-channel"
                            value={minBalanceChannel}
                            onChange={(e) => {
                              setMinBalanceChannel(e.target.value as NotificationChannelChoice);
                              setWithdrawPrefError(null);
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="both">E-mail + Notificação Push</option>
                            <option value="email">Somente E-mail</option>
                            <option value="push">Somente Notificação Push</option>
                          </select>
                        </div>
                      </div>

                      {(minBalanceChannel === 'email' || minBalanceChannel === 'both') && (
                        <div>
                          <label
                            htmlFor="withdraw-pref-alert-email"
                            className="block text-[10px] font-semibold text-slate-300 mb-1"
                          >
                            E-mail para Recebimento de Alertas Automáticos
                          </label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                            <input
                              id="withdraw-pref-alert-email"
                              type="email"
                              value={destinationEmail}
                              onChange={(e) => {
                                setDestinationEmail(e.target.value);
                                setWithdrawPrefError(null);
                              }}
                              placeholder="seuemail@exemplo.com"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Automação do Fluxo Financeiro */}
                <label className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80 cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Automatizar Fluxo Financeiro com Método Preferencial
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Pré-seleciona automaticamente{' '}
                      <strong className="text-slate-200">
                        {preferredPayoutMethod === 'express'
                          ? 'Multicaixa'
                          : preferredPayoutMethod === 'visa_card'
                          ? 'Visa'
                          : 'Transferência Bancária'}
                      </strong>{' '}
                      ao solicitar saque e roteia os repasses elegíveis automaticamente.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoFlowWithdrawals}
                    onChange={(e) => setAutoFlowWithdrawals(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                  />
                </label>

                {withdrawPrefError && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{withdrawPrefError}</span>
                  </div>
                )}
              </div>

              {/* Highlight Visa Direct */}
              <div className="bg-gradient-to-br from-blue-950/40 via-slate-950 to-slate-950 p-5 rounded-2xl border border-blue-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Cartão Visa para Recebimento Direto</h3>
                      <p className="text-[10px] text-slate-400">Crédito rápido através da rede Visa Direct</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 font-mono">
                    VISA DIRECT
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Número do Cartão Visa (16 Dígitos)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={visaNumber}
                      onChange={(e) => handleFormatCard(e.target.value)}
                      placeholder="4000 1234 5678 9010"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-blue-400">
                      VISA
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Nome Impresso no Cartão
                    </label>
                    <input
                      type="text"
                      value={visaHolder}
                      onChange={(e) => setVisaHolder(e.target.value.toUpperCase())}
                      placeholder="SEU NOME NO CARTAO"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Validade (MM/AA)
                    </label>
                    <input
                      type="text"
                      value={visaExpiry}
                      onChange={(e) => handleFormatExpiry(e.target.value)}
                      placeholder="MM/AA"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Multicaixa Express / Rede Express Instantânea */}
              <div className="bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 p-5 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Multicaixa Express / Rede Express Instantânea</h3>
                      <p className="text-[10px] text-slate-400">Levantamento com confirmação em 0s diretamente no celular</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                    EXPRESS 0s
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Número de Telefone / ID Multicaixa Express
                    </label>
                    <div className="relative">
                      <Smartphone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={expressPhone}
                        onChange={(e) => setExpressPhone(e.target.value)}
                        placeholder="+244 923 456 789 ou Nº Express"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Banco Associado (EMIS Angola)
                    </label>
                    <select
                      value={expressBankName}
                      onChange={(e) => setExpressBankName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Banco BAI Angola">Banco BAI Angola</option>
                      <option value="BFA - Banco de Fomento Angola">BFA - Banco de Fomento Angola</option>
                      <option value="Banco BIC">Banco BIC</option>
                      <option value="Millennium Atlântico">Millennium Atlântico</option>
                      <option value="Standard Bank Angola">Standard Bank Angola</option>
                      <option value="Banco Sol">Banco Sol</option>
                      <option value="Banco Keve">Banco Keve</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Repasse Automático na Hora via Multicaixa Express
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Liquidar cada nova venda diretamente para sua conta Express via Switch EMIS.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPayoutExpress}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setAutoPayoutExpress(next);
                      if (next) setPreferredPayoutMethod('express');
                    }}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </label>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Precisa obter credenciais na AppyPay, ProxyPay ou EMIS GPO?
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPspWizardOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Assistente PSP</span>
                  </button>
                </div>
              </div>

              {/* PIX Config */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Chave Pix Principal</h3>
                      <p className="text-[10px] text-slate-400">Para resgates instantâneos 24 horas</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Taxa 0%</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Tipo de Chave</label>
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value as 'cpf' | 'email' | 'phone' | 'random')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="email">E-mail</option>
                      <option value="cpf">CPF / CNPJ</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatória</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Chave Pix</label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="ex: amidelcatondiamy@gmail.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONTA BANCÁRIA PRINCIPAL (VALIDADA) */}
          {activeTab === 'banking' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">
                        Conta Bancária Principal do Criador
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Validação automática de formato antes de salvar (Brasil TED/Pix e Angola IBAN/BI).
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${
                      bankValidation.valid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    {bankValidation.valid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Dados Validados</span>
                      </>
                    ) : (
                      <span>Preenchimento Obrigatório</span>
                    )}
                  </span>
                </div>

                {/* Nome do Banco */}
                <div className="space-y-1">
                  <label
                    htmlFor="primary-bank-name"
                    className="block text-[11px] font-semibold text-slate-300"
                  >
                    Nome do Banco
                  </label>
                  <input
                    id="primary-bank-name"
                    type="text"
                    list="creator-primary-bank-presets"
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      setBankTouched((prev) => ({ ...prev, bankName: true }));
                      setBankSubmitError(null);
                    }}
                    onBlur={() => setBankTouched((prev) => ({ ...prev, bankName: true }))}
                    placeholder="Ex: 260 - Nu Pagamentos S.A. (Nubank) ou Banco BAI Angola"
                    className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none ${
                      bankTouched.bankName && bankValidation.errors.bankName
                        ? 'border-rose-500/70 focus:border-rose-400'
                        : 'border-slate-700 focus:border-purple-500'
                    }`}
                  />
                  <datalist id="creator-primary-bank-presets">
                    {POPULAR_BANKS.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                  {bankTouched.bankName && bankValidation.errors.bankName && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{bankValidation.errors.bankName}</span>
                    </p>
                  )}
                </div>

                {/* Agência, Conta e Tipo de Conta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="primary-bank-agency"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Agência
                    </label>
                    <input
                      id="primary-bank-agency"
                      type="text"
                      value={agency}
                      onChange={(e) => {
                        setAgency(formatAgencyInput(e.target.value));
                        setBankTouched((prev) => ({ ...prev, agency: true }));
                        setBankSubmitError(null);
                      }}
                      onBlur={() => setBankTouched((prev) => ({ ...prev, agency: true }))}
                      placeholder="0001 ou 1234-5"
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none ${
                        bankTouched.agency && bankValidation.errors.agency
                          ? 'border-rose-500/70 focus:border-rose-400'
                          : 'border-slate-700 focus:border-purple-500'
                      }`}
                    />
                    {bankTouched.agency && bankValidation.errors.agency && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{bankValidation.errors.agency}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="primary-bank-account"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Conta
                    </label>
                    <input
                      id="primary-bank-account"
                      type="text"
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(formatAccountNumberInput(e.target.value));
                        setBankTouched((prev) => ({ ...prev, accountNumber: true }));
                        setBankSubmitError(null);
                      }}
                      onBlur={() => setBankTouched((prev) => ({ ...prev, accountNumber: true }))}
                      placeholder="1234567-8"
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none ${
                        bankTouched.accountNumber && bankValidation.errors.accountNumber
                          ? 'border-rose-500/70 focus:border-rose-400'
                          : 'border-slate-700 focus:border-purple-500'
                      }`}
                    />
                    {bankTouched.accountNumber && bankValidation.errors.accountNumber && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{bankValidation.errors.accountNumber}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="primary-bank-type"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Tipo de Conta
                    </label>
                    <select
                      id="primary-bank-type"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as 'corrente' | 'poupanca')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Conta Poupança</option>
                    </select>
                  </div>
                </div>

                {/* CPF / CNPJ / BI */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="primary-bank-document"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      CPF / CNPJ / BI do Titular
                    </label>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        !bankValidation.errors.documentNumber
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {bankValidation.detectedDocType === 'cpf'
                        ? 'Formato CPF (11 dígitos)'
                        : bankValidation.detectedDocType === 'cnpj'
                        ? 'Formato CNPJ (14 dígitos)'
                        : bankValidation.detectedDocType === 'bi'
                        ? 'Formato BI Angola'
                        : 'CPF, CNPJ ou BI'}
                    </span>
                  </div>
                  <input
                    id="primary-bank-document"
                    type="text"
                    value={bankDocumentNumber}
                    onChange={(e) => {
                      setBankDocumentNumber(formatDocumentInput(e.target.value));
                      setBankTouched((prev) => ({ ...prev, documentNumber: true }));
                      setBankSubmitError(null);
                    }}
                    onBlur={() => setBankTouched((prev) => ({ ...prev, documentNumber: true }))}
                    placeholder="CPF (000.000.000-00), CNPJ (00.000.000/0001-00) ou BI (001234567LA042)"
                    className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none ${
                      bankTouched.documentNumber && bankValidation.errors.documentNumber
                        ? 'border-rose-500/70 focus:border-rose-400'
                        : 'border-slate-700 focus:border-purple-500'
                    }`}
                  />
                  {bankTouched.documentNumber && bankValidation.errors.documentNumber ? (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{bankValidation.errors.documentNumber}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Aceita CPF válido (11 dígitos), CNPJ válido (14 dígitos) ou Bilhete de Identidade de Angola (9 dígitos + 2 letras + 3 dígitos).
                    </p>
                  )}
                </div>

                {bankSubmitError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bankSubmitError}</span>
                  </div>
                )}

                {bankSavedNotice && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Conta bancária principal validada e salva com sucesso!</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Os dígitos verificadores de CPF/CNPJ e o padrão de BI são conferidos antes da gravação.
                  </span>
                  <button
                    type="button"
                    onClick={handleSavePrimaryBankAccount}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Validar e Salvar Conta Bancária</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROFILE & FISCAL */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Completo / Razão Social
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    CPF ou CNPJ (Fiscal)
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail de Notificação de Vendas
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Usuário (@Handle)
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria de Conteúdo
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tagline / Frase de Impacto
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Biografia do Criador
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quick Theme Preference Selector inside User Profile Settings */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Tema da Interface
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Salvo automaticamente no armazenamento local do navegador.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('appearance')}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    Ver pré-visualização completa →
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'light', label: 'Claro', Icon: Sun },
                      { id: 'dark', label: 'Escuro', Icon: Moon },
                      { id: 'system', label: 'Sistema', Icon: Monitor },
                    ] as Array<{ id: ThemePreference; label: string; Icon: typeof Sun }>
                  ).map(({ id, label, Icon }) => {
                    const isSelected = themePreference === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setThemePreference(id)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: APPEARANCE & THEME */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Seletor de Tema da Interface
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Escolha entre modo Claro, Escuro ou sincronizado com o Sistema Operacional. As paletas de cores, gráficos, bordas e contrastes são ajustados instantaneamente.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvo no Armazenamento Local</span>
                  </span>
                </div>

                {/* 3 Theme Mode Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        id: 'light' as ThemePreference,
                        title: 'Modo Claro',
                        subtitle: 'Fundo claro e alta legibilidade diurna',
                        Icon: Sun,
                        previewBg: '#f1f5f9',
                        previewCard: '#ffffff',
                        previewBorder: '#cbd5e1',
                        previewText: '#0f172a',
                        previewAccent: '#059669',
                      },
                      {
                        id: 'dark' as ThemePreference,
                        title: 'Modo Escuro',
                        subtitle: 'Contraste profundo ideal para análise contínua',
                        Icon: Moon,
                        previewBg: '#020617',
                        previewCard: '#0f172a',
                        previewBorder: '#1e293b',
                        previewText: '#f8fafc',
                        previewAccent: '#10b981',
                      },
                      {
                        id: 'system' as ThemePreference,
                        title: 'Seguir Sistema',
                        subtitle: `Detectado agora: ${systemTheme === 'light' ? 'Claro' : 'Escuro'}`,
                        Icon: Monitor,
                        previewBg: systemTheme === 'light' ? '#f1f5f9' : '#020617',
                        previewCard: systemTheme === 'light' ? '#ffffff' : '#0f172a',
                        previewBorder: systemTheme === 'light' ? '#cbd5e1' : '#1e293b',
                        previewText: systemTheme === 'light' ? '#0f172a' : '#f8fafc',
                        previewAccent: '#6366f1',
                      },
                    ]
                  ).map((option) => {
                    const isSelected = themePreference === option.id;
                    const OptionIcon = option.Icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setThemePreference(option.id)}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/25 shadow-lg'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Mini UI Mockup Preview */}
                        <div
                          className="w-full h-20 rounded-xl p-2.5 border flex flex-col justify-between overflow-hidden"
                          style={{
                            backgroundColor: option.previewBg,
                            borderColor: option.previewBorder,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="h-2 w-12 rounded-full"
                              style={{ backgroundColor: option.previewText, opacity: 0.75 }}
                            />
                            <span
                              className="h-2.5 w-6 rounded-full"
                              style={{ backgroundColor: option.previewAccent }}
                            />
                          </div>
                          <div
                            className="rounded-lg p-2 border flex items-center justify-between"
                            style={{
                              backgroundColor: option.previewCard,
                              borderColor: option.previewBorder,
                            }}
                          >
                            <div className="space-y-1">
                              <div
                                className="h-1.5 w-14 rounded-full"
                                style={{ backgroundColor: option.previewText, opacity: 0.8 }}
                              />
                              <div
                                className="h-1.5 w-9 rounded-full"
                                style={{ backgroundColor: option.previewText, opacity: 0.35 }}
                              />
                            </div>
                            <span
                              className="w-4 h-4 rounded-md"
                              style={{ backgroundColor: option.previewAccent }}
                            />
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <OptionIcon
                                className={`w-4 h-4 ${
                                  isSelected ? 'text-emerald-400' : 'text-slate-400'
                                }`}
                              />
                              <span className="text-xs font-bold text-white">
                                {option.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                              {option.subtitle}
                            </p>
                          </div>

                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Palette Status & Token Breakdown */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-300">
                      Paleta Ativa Aplicada:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {resolvedTheme === 'light'
                        ? 'Paleta Clara (High-Contrast Light)'
                        : 'Paleta Escura (Deep Slate Dark)'}
                      {themePreference === 'system' ? ' · Sincronizada com OS' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-md bg-slate-950 border border-slate-700 shrink-0" />
                      <div className="min-w-0">
                        <span className="block font-semibold text-white truncate">Fundo Base</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {resolvedTheme === 'light' ? '#F1F5F9' : '#020617'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-md bg-slate-900 border border-slate-700 shrink-0" />
                      <div className="min-w-0">
                        <span className="block font-semibold text-white truncate">Cartões</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {resolvedTheme === 'light' ? '#FFFFFF' : '#0F172A'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-md bg-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="block font-semibold text-white truncate">Primária</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {resolvedTheme === 'light' ? '#059669' : '#10B981'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-md bg-indigo-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="block font-semibold text-white truncate">Análise / VIP</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {resolvedTheme === 'light' ? '#4F46E5' : '#6366F1'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {/* Alerta de Saldo Mínimo Control Card */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Alerta de Saldo Mínimo
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
                          Notificação Financeira
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Defina um valor monetário de saldo para receber avisos imediatos por e-mail ou notificação push quando seu saldo atingir a meta.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMinBalanceAlertEnabled(!minBalanceAlertEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      minBalanceAlertEnabled ? 'bg-emerald-600' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        minBalanceAlertEnabled ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {minBalanceAlertEnabled && (
                  <div className="space-y-3.5 pt-1">
                    {/* Current balance vs threshold progress */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-xs">
                      <span className="text-slate-400">Saldo atual disponível:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">
                          R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {availableBalance >= minBalanceThreshold ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Limite Atingido! (+R$ {(availableBalance - minBalanceThreshold).toFixed(2)})</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Faltam R$ {(minBalanceThreshold - availableBalance).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Presets and Custom Monetary Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Valor Monetário do Saldo Mínimo:
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Meta selecionada: <strong className="text-white font-mono">R$ {minBalanceThreshold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </span>
                      </div>

                      {/* Quick monetary presets */}
                      <div className="grid grid-cols-5 gap-1.5 mb-2">
                        {[250, 500, 1000, 2500, 5000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setMinBalanceThreshold(preset)}
                            className={`py-1.5 px-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                              minBalanceThreshold === preset
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            R$ {preset.toLocaleString('pt-BR')}
                          </button>
                        ))}
                      </div>

                      {/* Custom monetary input */}
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">R$</span>
                        <input
                          type="number"
                          min="1"
                          step="50"
                          value={minBalanceThreshold}
                          onChange={(e) => setMinBalanceThreshold(Math.max(0, Number(e.target.value) || 0))}
                          placeholder="Digite o valor monetário limite desejado"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Escolha do Canal de Notificação: E-mail ou Push */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Escolha entre Notificações por E-mail ou Push:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Option: E-mail */}
                        <button
                          type="button"
                          onClick={() => setMinBalanceChannel('email')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            minBalanceChannel === 'email'
                              ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1 rounded-lg ${minBalanceChannel === 'email' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-white">E-mail</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2">
                            Alerta enviado para sua caixa de entrada
                          </p>
                        </button>

                        {/* Option: Push */}
                        <button
                          type="button"
                          onClick={() => setMinBalanceChannel('push')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            minBalanceChannel === 'push'
                              ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1 rounded-lg ${minBalanceChannel === 'push' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                              <Smartphone className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-white">Push</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2">
                            Notificação direta no navegador/celular
                          </p>
                        </button>

                        {/* Option: Ambos */}
                        <button
                          type="button"
                          onClick={() => setMinBalanceChannel('both')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            minBalanceChannel === 'both'
                              ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1 rounded-lg ${minBalanceChannel === 'both' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-white">E-mail + Push</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2">
                            Disparo simultâneo nos dois canais
                          </p>
                        </button>
                      </div>

                      {/* Destination Email Input if email is active */}
                      {(minBalanceChannel === 'email' || minBalanceChannel === 'both') && (
                        <div className="pt-2">
                          <label className="block text-[10px] text-slate-400 mb-1">
                            E-mail de destino para recebimento do alerta de saldo:
                          </label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                            <input
                              type="email"
                              value={destinationEmail}
                              onChange={(e) => setDestinationEmail(e.target.value)}
                              placeholder="seuemail@exemplo.com"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Push Browser permission status indicator */}
                      {(minBalanceChannel === 'push' || minBalanceChannel === 'both') && (
                        <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-2">
                            <Bell className="w-3.5 h-3.5 text-amber-400" />
                            <span>Simulação de Push no Navegador:</span>
                          </div>
                          <span className="text-[10px] bg-amber-500/10 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/20">
                            Pronto para disparo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botão para Disparar Notificação Simulada */}
                    <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const res = triggerSimulatedBalanceAlert({
                            threshold: Number(minBalanceThreshold) || 1000,
                            channel: minBalanceChannel,
                            email: destinationEmail,
                            force: true,
                          });
                          setTestNotificationResult(res.message);
                          setTimeout(() => setTestNotificationResult(null), 5000);
                        }}
                        className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Disparar Notificação Simulada Agora</span>
                      </button>

                      {testNotificationResult && (
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg animate-in fade-in">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="line-clamp-1">Alerta disparado na tela com sucesso!</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* General Sound & Screen Card Notifications */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Som de Caixa Registradora</div>
                    <div className="text-[10px] text-slate-400">Tocar áudio suave a cada nova venda ou confirmação de pagamento</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    soundActive ? 'bg-emerald-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      soundActive ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Cards de Venda em Tempo Real</div>
                    <div className="text-[10px] text-slate-400">Exibir notificação flutuante com nome do pagador e método</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenToasts(!screenToasts)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    screenToasts ? 'bg-emerald-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      screenToasts ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB: AUDITORIA DE ALERTAS (HISTÓRICO DAS ÚLTIMAS 10 NOTIFICAÇÕES COM DINHEIRO REAL) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Header Card */}
              <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">Auditoria de Alertas & Notificações</h3>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/30">
                          Últimas {notificationHistory.length} Disparadas
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                          Dinheiro Real
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Registro cronológico auditável de alertas de saldo mínimo e transações enviados por E-mail ou Push, com motivo detalhado e valores reais.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const res = triggerSimulatedBalanceAlert({
                        threshold: Number(minBalanceThreshold) || 1000,
                        channel: minBalanceChannel,
                        email: destinationEmail,
                        force: true,
                      });
                      setTestNotificationResult(res.message);
                      setTimeout(() => setTestNotificationResult(null), 4000);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Disparar Novo Alerta de Teste</span>
                  </button>
                </div>

                {testNotificationResult && (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Novo alerta disparado e auditado com sucesso no topo da lista!</span>
                  </div>
                )}

                {/* Key Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total em Dinheiro Real</span>
                    <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                      R$ {notificationHistory.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-500">Valores reais auditados</span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Taxa de Entrega</span>
                    <div className="text-base font-bold font-mono text-white mt-0.5 flex items-center gap-1.5">
                      <span>100%</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-normal">
                        200 OK
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">Sem falhas de entrega</span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Canais Utilizados</span>
                    <div className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1 text-indigo-400">
                        <Mail className="w-3 h-3" /> E-mail
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <Smartphone className="w-3 h-3" /> Push
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">Disparo multicanal</span>
                  </div>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      historyFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Todas ({notificationHistory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('email')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      historyFilter === 'email'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Mail className="w-3 h-3 text-indigo-400" />
                    <span>E-mail ({notificationHistory.filter((i) => i.channel === 'email' || i.channel === 'both').length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('push')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      historyFilter === 'push'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3 h-3 text-amber-400" />
                    <span>Push ({notificationHistory.filter((i) => i.channel === 'push' || i.channel === 'both').length})</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Histórico retido para fins de compliance e auditoria</span>
                </div>
              </div>

              {/* Notification Audit List */}
              <div className="space-y-3">
                {notificationHistory
                  .filter((item) => {
                    if (historyFilter === 'email') return item.channel === 'email' || item.channel === 'both';
                    if (historyFilter === 'push') return item.channel === 'push' || item.channel === 'both';
                    return true;
                  })
                  .slice(0, 10)
                  .map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-2.5"
                    >
                      {/* Top Row: Badges, Date, and Protocol */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            #{index + 1}
                          </span>

                          {/* Channel Badge */}
                          {item.channel === 'email' ? (
                            <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                              <Mail className="w-3 h-3" /> E-mail
                            </span>
                          ) : item.channel === 'push' ? (
                            <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                              <Smartphone className="w-3 h-3" /> Notificação Push
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> E-mail + Push
                            </span>
                          )}

                          {/* Delivery Status */}
                          <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Entregue (200 OK)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {item.displayTime}
                          </span>
                          <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
                            {item.authCode}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Title & Real Money Amount */}
                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Destino: {item.destination}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-emerald-500 uppercase font-semibold tracking-wider block">
                            Dinheiro Real
                          </span>
                          <span className="text-sm font-extrabold font-mono text-emerald-400">
                            R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Reason Card: "Por que foi alertado" */}
                      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                        <div className="p-1 rounded bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                          <Bell className="w-3 h-3" />
                        </div>
                        <div>
                          <strong className="text-amber-300 font-semibold text-[11px] block">
                            Por que você foi alertado:
                          </strong>
                          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                            {item.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                {notificationHistory.length === 0 && (
                  <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-400">
                    <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs">Nenhuma notificação registrada ainda.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: AUDITORIA DE REPASSES */}
          {activeTab === 'payoutAudit' && <PayoutAuditSection />}

          {/* TAB: CRIPTOGRAFIA AES-256-GCM */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      Camada de Criptografia AES-256-GCM em Repouso
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Todos os dados bancários, fiscais, chave Pix, cartão Visa e e-mail de alertas são cifrados no navegador via Web Crypto API antes da gravação local e no banco de dados.
                    </p>
                  </div>
                  <div className="text-right font-mono text-[11px] tabular-nums">
                    <div className="text-emerald-400 font-bold">{creatorVaultStatus.algorithm}</div>
                    <div className="text-slate-400">{creatorVaultStatus.kdf}</div>
                  </div>
                </div>

                {/* Telemetry Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Impressão Digital da Chave</span>
                    <span className="text-xs font-mono font-bold text-white tabular-nums mt-1 block truncate">
                      {creatorVaultStatus.keyFingerprint}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-slate-400" />
                      <span>Armazenamento Local</span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 mt-1 block">
                      {creatorVaultStatus.localEncrypted ? 'Cifrado (Zero Texto Puro)' : 'Pendente'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Database className="w-3 h-3 text-slate-400" />
                      <span>Banco de Dados</span>
                    </span>
                    <span
                      className={`text-xs font-semibold mt-1 block ${
                        creatorVaultStatus.databaseSynced ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {creatorVaultStatus.databaseSynced
                        ? 'Dupla Cifra AES-256 Ativa'
                        : 'Aguardando Sincronização'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Última Cifragem</span>
                    <span className="text-xs font-mono text-slate-200 tabular-nums mt-1 block">
                      {creatorVaultStatus.lastEncryptedAt
                        ? new Date(creatorVaultStatus.lastEncryptedAt).toLocaleString('pt-BR')
                        : 'Agora'}
                    </span>
                  </div>
                </div>

                {/* Protected Fields Summary */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300">
                    Campos protegidos com AES-256-GCM ({creatorVaultStatus.encryptedFields.length} grupos)
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    {creatorVaultStatus.encryptedFields.join(' · ')}
                  </div>
                  {creatorVaultStatus.serverStorageInfo && (
                    <div className="text-[11px] font-mono tabular-nums text-slate-400 pt-1">
                      Banco: IV {creatorVaultStatus.serverStorageInfo.ivHexPreview}… · Tag GCM{' '}
                      {creatorVaultStatus.serverStorageInfo.authTagLengthBytes * 8} bits · Payload{' '}
                      {creatorVaultStatus.serverStorageInfo.payloadBytes} bytes
                    </div>
                  )}
                </div>

                {/* Key Rotation & Database Sync Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isVaultBusy || creatorVaultStatus.locked}
                      onClick={async () => {
                        setVaultActionError(null);
                        setVaultActionNotice(null);
                        setIsVaultBusy(true);
                        const res = await reencryptCreatorVault({ rotateDeviceKey: true });
                        setIsVaultBusy(false);
                        if (res.success) {
                          setVaultActionNotice(
                            'Chave rotacionada com novo Salt/IV aleatórios e re-criptografada em AES-256-GCM.'
                          );
                        } else {
                          setVaultActionError(res.error || 'Erro ao rotacionar chave.');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Rotacionar Chave & Re-criptografar</span>
                    </button>

                    <button
                      type="button"
                      disabled={isVaultBusy || creatorVaultStatus.locked}
                      onClick={async () => {
                        setVaultActionError(null);
                        setVaultActionNotice(null);
                        setIsVaultBusy(true);
                        const res = await syncCreatorVaultToDatabase();
                        setIsVaultBusy(false);
                        if (res.success) {
                          setVaultActionNotice(
                            'Cofre AES-256-GCM sincronizado e cifrado em disco no banco de dados.'
                          );
                        } else {
                          setVaultActionError(res.error || 'Erro ao sincronizar cofre.');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <Database className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Sincronizar Banco</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRawEncryptedJson((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {showRawEncryptedJson ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    <span>{showRawEncryptedJson ? 'Ocultar Envelope' : 'Inspecionar Payload Local'}</span>
                  </button>
                </div>
              </div>

              {/* Optional Custom Passphrase Protection */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Frase-Senha Pessoal do Cofre (Opcional)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Defina uma frase-senha própria para derivação PBKDF2-SHA256 ou use a chave criptográfica automática do dispositivo.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-300">
                    {creatorVaultStatus.hasCustomPassphrase ? 'Modo: Frase-Senha Ativa' : 'Modo: Chave do Dispositivo'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassphraseChars ? 'text' : 'password'}
                      value={newPassphraseInput}
                      onChange={(e) => setNewPassphraseInput(e.target.value)}
                      placeholder="Nova frase-senha (mín. 6 caracteres)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-9 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphraseChars((v) => !v)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                      aria-label="Alternar visibilidade da frase-senha"
                    >
                      {showPassphraseChars ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isVaultBusy || creatorVaultStatus.locked || newPassphraseInput.trim().length < 6}
                    onClick={async () => {
                      setVaultActionError(null);
                      setVaultActionNotice(null);
                      setIsVaultBusy(true);
                      const res = await reencryptCreatorVault({
                        customPassphrase: newPassphraseInput.trim(),
                      });
                      setIsVaultBusy(false);
                      if (res.success) {
                        setNewPassphraseInput('');
                        setVaultActionNotice(
                          'Frase-senha aplicada! Dados re-criptografados em AES-256-GCM no armazenamento local e no banco.'
                        );
                      } else {
                        setVaultActionError(res.error || 'Não foi possível aplicar frase-senha.');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    Aplicar Frase-Senha
                  </button>

                  {creatorVaultStatus.hasCustomPassphrase && !creatorVaultStatus.locked && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          lockCreatorVault();
                          setVaultActionNotice('Cofre trancado. Os campos sensíveis foram mascarados.');
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Trancar Agora
                      </button>
                      <button
                        type="button"
                        disabled={isVaultBusy}
                        onClick={async () => {
                          setVaultActionError(null);
                          setVaultActionNotice(null);
                          setIsVaultBusy(true);
                          const res = await clearCustomVaultPassphrase();
                          setIsVaultBusy(false);
                          if (res.success) {
                            setVaultActionNotice(
                              'Frase-senha removida. Cofre re-criptografado com chave automática do dispositivo.'
                            );
                          } else {
                            setVaultActionError(res.error || 'Falha ao remover frase-senha.');
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Voltar para Chave Automática
                      </button>
                    </>
                  )}
                </div>

                {vaultActionNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{vaultActionNotice}</span>
                  </div>
                )}

                {vaultActionError && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{vaultActionError}</span>
                  </div>
                )}

                {creatorVaultStatus.lastError && !vaultActionError && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{creatorVaultStatus.lastError}</span>
                  </div>
                )}
              </div>

              {/* Real Encrypted Envelope Inspector */}
              {showRawEncryptedJson && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Envelope gravado em localStorage (sem texto puro sensível)</span>
                    <span className="font-mono text-emerald-400">
                      {encryptedCreatorEnvelope?.format || 'monetizahub_aes256_vault_v1'}
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 overflow-x-auto max-h-64">
                    {JSON.stringify(
                      encryptedCreatorEnvelope
                        ? {
                            format: encryptedCreatorEnvelope.format,
                            maskedProfile: {
                              email: encryptedCreatorEnvelope.maskedProfile.email,
                              phone: encryptedCreatorEnvelope.maskedProfile.phone,
                              documentNumber: encryptedCreatorEnvelope.maskedProfile.documentNumber,
                              pixKey: encryptedCreatorEnvelope.maskedProfile.pixKey,
                              savedVisaCard: encryptedCreatorEnvelope.maskedProfile.savedVisaCard,
                              bankAccount: encryptedCreatorEnvelope.maskedProfile.bankAccount,
                            },
                            encryptedVault: {
                              ...encryptedCreatorEnvelope.encryptedVault,
                              ciphertext: `${encryptedCreatorEnvelope.encryptedVault.ciphertext.slice(0, 96)}... (${encryptedCreatorEnvelope.encryptedVault.ciphertext.length} chars)`,
                            },
                          }
                        : { status: 'Criptografando...' },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          )}

          {saveSecurityError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveSecurityError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-300 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono tabular-nums">
                AES-256-GCM · {creatorVaultStatus.keyFingerprint}
              </span>
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isEncryptingSaving || creatorVaultStatus.locked}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>
                  {isEncryptingSaving
                    ? 'Criptografando (AES-256)...'
                    : savedSuccess
                    ? 'Criptografado (AES-256) e Salvo!'
                    : 'Salvar Todos os Meus Dados'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <PspConfigurationWizard
        isOpen={isPspWizardOpen}
        onClose={() => setIsPspWizardOpen(false)}
      />
    </div>
  );
};
