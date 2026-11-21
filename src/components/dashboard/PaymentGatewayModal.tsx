import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Globe,
  Key,
  Shield,
  Layers,
  FileCode,
  DollarSign,
  Smartphone,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import {
  GatewayProvider,
  GatewayConfigItem,
  SecurityComplianceItem,
  IntegrationStepGuide,
} from '../../types/monetization';
import { securityComplianceItems, integrationStepGuides } from '../../data/mockData';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    gatewaySettings,
    updateGatewayConfig,
    toggleGatewayMode,
    simulateGatewayTransaction,
    availableBalance,
  } = useMonetization();

  const [activeTab, setActiveTab] = useState<'providers' | 'security' | 'guide' | 'simulator'>('providers');
  const [selectedProvider, setSelectedProvider] = useState<GatewayProvider>('stripe');
  const [activeGuideStep, setActiveGuideStep] = useState<number>(1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});

  // Simulator state
  const [simAmount, setSimAmount] = useState<number>(149.0);
  const [simRequire3DS, setSimRequire3DS] = useState<boolean>(true);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    token: string;
    authCode: string;
    message: string;
    stepDetails?: string[];
  } | null>(null);

  const getProviderConfig = (provider: GatewayProvider): GatewayConfigItem => {
    switch (provider) {
      case 'stripe':
        return gatewaySettings.stripe;
      case 'paypal':
        return gatewaySettings.paypal;
      case 'visa_direct':
        return gatewaySettings.visaDirect;
      case 'multicaixa_express':
        return gatewaySettings.multicaixaExpress;
    }
  };

  const currentConfig = getProviderConfig(selectedProvider);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleShowKey = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleRunSimulation = () => {
    setSimLoading(true);
    setSimResult(null);

    setTimeout(() => {
      const res = simulateGatewayTransaction({
        provider: selectedProvider,
        amount: simAmount,
        require3DS: simRequire3DS,
      });

      setSimResult({
        ...res,
        stepDetails: [
          '1. Tokenização no cliente (Client-side token gerado sem expor PAN/CVV)',
          '2. PaymentIntent criado com chave Idempotency-Key no backend',
          simRequire3DS
            ? '3. Desafio 3D Secure 2.0 (SCA) verificado pelo banco emissor (Liability Shift aplicado)'
            : '3. Análise de risco Stripe Radar / PayPal Fraud AI aprovada (Risco: Muito Baixo)',
          '4. Webhook assinado com HMAC-SHA256 processado e saldo creditado',
        ],
      });
      setSimLoading(false);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative text-slate-200 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Gateway de Pagamento Seguro & Anti-Fraude
                </h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> PCI-DSS Nível 1
                </span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 rounded border border-indigo-500/20">
                  3D Secure 2.0 (SCA)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Infraestrutura de pagamentos com tokenização Zero-Data, criptografia TLS 1.3 / AES-256 e liquidação direta em dinheiro real.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('providers')}
            className={`pb-3 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'providers'
                ? 'border-indigo-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
            <span>Provedores (Stripe & PayPal)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'security'
                ? 'border-emerald-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Padrões de Segurança & Compliance</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'guide'
                ? 'border-blue-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>Passo a Passo de Integração (4 Etapas)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-amber-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulador 3DS2 & Token</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: PROVIDERS CONFIGURATION */}
          {activeTab === 'providers' && (
            <div className="space-y-5">
              {/* Provider Selection Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'stripe' as GatewayProvider, label: 'Stripe', sub: 'Cartões & Wallets', color: 'indigo' },
                  { id: 'paypal' as GatewayProvider, label: 'PayPal', sub: 'Carteira & Internacional', color: 'blue' },
                  { id: 'visa_direct' as GatewayProvider, label: 'Visa Direct', sub: 'Levantamento no Cartão', color: 'teal' },
                  { id: 'multicaixa_express' as GatewayProvider, label: 'Multicaixa Express', sub: 'Rede Express 0s', color: 'amber' },
                ].map((item) => {
                  const isSelected = selectedProvider === item.id;
                  const cfg = getProviderConfig(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedProvider(item.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-indigo-500 shadow-lg text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white">{item.label}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                            cfg?.mode === 'live'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {cfg?.mode || 'LIVE'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{item.sub}</p>
                    </button>
                  );
                })}
              </div>

              {/* Provider Detail Card */}
              {currentConfig && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{currentConfig.name}</h3>
                        <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                          {currentConfig.complianceLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Configuração de chaves de API restritas, webhooks e parâmetros de anti-fraude.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Ambiente:</span>
                      <button
                        type="button"
                        onClick={() => toggleGatewayMode(selectedProvider)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 ${
                          currentConfig.mode === 'live'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                            : 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                        }`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{currentConfig.mode === 'live' ? 'Produção (Live)' : 'Sandbox (Testes)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* API Credentials */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                        <span>Chave Pública do Cliente (Publishable Key / Client ID)</span>
                        <span className="text-[10px] text-emerald-400">Segura para uso no Frontend</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={currentConfig.publishableKey}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy(currentConfig.publishableKey, 101)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                        >
                          {copiedIndex === 101 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                          <span>Chave Secreta do Backend (Secret Key)</span>
                          <span className="text-[10px] text-rose-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Restrita ao Servidor
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type={showKeys['sec'] ? 'text' : 'password'}
                            readOnly
                            value={currentConfig.secretKeyMasked}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowKey('sec')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                          >
                            {showKeys['sec'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                          <span>Segredo de Assinatura Webhook (HMAC-SHA256)</span>
                          <span className="text-[10px] text-teal-400">Validação Criptográfica</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showKeys['wh'] ? 'text' : 'password'}
                            readOnly
                            value={currentConfig.webhookSecretMasked}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowKey('wh')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                          >
                            {showKeys['wh'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Features Checkpoints */}
                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300 block mb-2">Recursos de Segurança & Compliance Ativos:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-slate-300">Tokenização Zero-Data</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-slate-300">Autenticação 3DS2 / SCA</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-slate-300">Radar Anti-Fraude Ativo</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-slate-300">Liquidação Imediata</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-slate-300">Webhook HMAC-SHA256</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-slate-300">Chaves com Idempotência</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECURITY & DATA COMPLIANCE STANDARDS */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-950/30 via-slate-950 to-slate-950 p-4 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Padrões de Proteção de Dados e Segurança de Pagamentos
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Garantia estrita de que a aplicação atende aos mais elevados padrões mundiais de segurança financeira.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  100% AUDITADO
                </span>
              </div>

              <div className="space-y-3">
                {securityComplianceItems.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white">{sec.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {sec.standard}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed pl-7">
                      {sec.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP INTEGRATION GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              {/* Step Navigation Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {integrationStepGuides.map((guide) => (
                  <button
                    key={guide.step}
                    type="button"
                    onClick={() => setActiveGuideStep(guide.step)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      activeGuideStep === guide.step
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold text-blue-400 block mb-0.5">
                      ETAPA 0{guide.step}
                    </span>
                    <span className="text-xs font-bold line-clamp-1 text-white">{guide.title}</span>
                  </button>
                ))}
              </div>

              {/* Active Step Details */}
              {(() => {
                const stepData = integrationStepGuides.find((g) => g.step === activeGuideStep);
                if (!stepData) return null;
                return (
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          Passo {stepData.step} de 4
                        </span>
                        <h3 className="text-sm font-bold text-white">{stepData.title}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{stepData.subtitle}</p>
                    </div>

                    {/* Technical details list */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        Detalhes Técnicos de Implementação:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {stepData.technicalDetails.map((td, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-400 font-bold">•</span>
                            <span>{td}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Security Considerations Callout */}
                    <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Considerações Críticas de Segurança:</span>
                      </div>
                      <ul className="space-y-1 text-xs text-amber-200/90 pl-5 list-disc">
                        {stepData.securityConsiderations.map((sc, i) => (
                          <li key={i}>{sc}</li>
                        ))}
                      </ul>
                    </div>

                    {/* User Flow Explanation */}
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                      <span className="font-bold text-slate-200 block mb-0.5">Fluxo da Experiência do Usuário:</span>
                      <p className="text-slate-400">{stepData.userFlowExplanation}</p>
                    </div>

                    {/* Code Snippet */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">Snippet de Código Recomendado</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(stepData.codeSnippet, stepData.step)}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition cursor-pointer"
                        >
                          {copiedIndex === stepData.step ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Código</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                        {stepData.codeSnippet}
                      </pre>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 4: 3DS2 & TOKEN CHECKOUT SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 p-4 rounded-2xl border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Simulador Interativo de Checkout Seguro & 3D Secure 2.0
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Teste o fluxo completo de pagamento: tokenização no cliente, verificação biométrica 3DS2 pelo banco emissor e webhook criptografado creditando dinheiro real no saldo do criador.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Form Simulator */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Parâmetros da Transação de Teste
                  </h4>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Valor Monetário (Dinheiro Real):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate-400">R$</span>
                      <input
                        type="number"
                        min="10"
                        step="10"
                        value={simAmount}
                        onChange={(e) => setSimAmount(Math.max(1, Number(e.target.value) || 0))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-white block">Exigir Desafio 3D Secure 2.0 (SCA)</span>
                      <span className="text-[10px] text-slate-400">Simula confirmação de duas etapas do banco</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSimRequire3DS(!simRequire3DS)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        simRequire3DS ? 'bg-amber-600' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                          simRequire3DS ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={simLoading}
                    onClick={handleRunSimulation}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {simLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Autenticando via 3DS2 & Tokenizando...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Executar Pagamento com Token & 3DS2</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Simulation Output Card */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                      Status do Processamento em Tempo Real
                    </h4>

                    {simResult ? (
                      <div className="space-y-3 animate-in fade-in">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold block">Transação Aprovada com Sucesso!</span>
                            <span className="text-[11px] text-emerald-200/80">{simResult.message}</span>
                          </div>
                        </div>

                        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Token PCI Seguro:</span>
                            <span className="text-indigo-400 font-bold">{simResult.token}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Protocolo de Autorização:</span>
                            <span className="text-teal-400 font-bold">{simResult.authCode}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Valor em Dinheiro Real:</span>
                            <span className="text-emerald-400 font-bold">
                              R$ {simAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {simResult.stepDetails && (
                          <div className="space-y-1 text-[11px] text-slate-300">
                            {simResult.stepDetails.map((detail, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-500 text-xs">
                        <Shield className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p>Clique em "Executar Pagamento com Token & 3DS2" para disparar a simulação ao vivo.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Em conformidade com PCI-DSS v4.0 e SCA Bancário</span>
                    <span className="font-mono text-emerald-400">Liability Shift: Ativo</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Processamento blindado com isolamento de dados do cliente</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
};
