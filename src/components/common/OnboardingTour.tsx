import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CreditCard,
  ShoppingBag,
  Bot,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Compass,
  Zap,
  ShieldCheck,
  DollarSign,
  HelpCircle,
  ExternalLink,
  Store,
  Layers,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useMonetization } from '../../context/MonetizationContext';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVisaSettings: () => void;
  onOpenCreateShowcase: () => void;
  onNavigateTab?: (tabId: string) => void;
}

interface TourStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  keyInstructions: string[];
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  targetId?: string;
  highlightText?: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onOpenVisaSettings,
  onOpenCreateShowcase,
  onNavigateTab,
}) => {
  const { creator, completeOnboardingTour } = useMonetization();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Auto reset step index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const steps: TourStep[] = [
    {
      id: 'welcome',
      stepNumber: 1,
      totalSteps: 4,
      badge: 'Boas-Vindas ao Studio',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
      title: 'Bem-vindo(a) ao seu Painel de Monetização!',
      subtitle: 'Conecte audiência, produtos e receba repasses em dinheiro real.',
      description:
        `Olá, ${creator.name}! Este é o seu centro de comando completo. Aqui você gerencia seus ganhos com infoprodutos, assinaturas recorrentes, cobranças seguras via Stripe/PayPal e saques instantâneos. Preparamos este guia rápido de 2 minutos para você configurar o recebimento e publicar sua primeira oferta.`,
      keyInstructions: [
        'Acompanhe seu faturamento líquido e saldo disponível em tempo real.',
        'Receba valores com segurança internacional (PCI-DSS Nível 1 & 3DS2).',
        'Utilize o Copiloto de IA para otimizar preços e elevar suas conversões.',
      ],
      actionLabel: 'Começar Passo a Passo',
      actionIcon: <ArrowRight className="w-4 h-4" />,
    },
    {
      id: 'visa_config',
      stepNumber: 2,
      totalSteps: 4,
      badge: 'Etapa 1 de 2 • Essencial',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: <CreditCard className="w-5 h-5 text-blue-400" />,
      title: 'Como Configurar sua Conta & Cartão Visa',
      subtitle: 'Habilite repasses rápidos e saques com liquidação imediata via Visa Direct.',
      description:
        'Para que seus rendimentos entrem diretamente na sua conta ou cartão, configure seus dados de recebimento na aba "Saque no Cartão Visa & Express":',
      keyInstructions: [
        '1. Insira o Número do seu Cartão Visa (16 dígitos) e nome do titular.',
        '2. Opcionalmente, cadastre seu número Multicaixa Express (0s de espera) ou chave Pix.',
        '3. Ative o "Alerta de Saldo Mínimo" para ser notificado por E-mail ou Push quando atingir sua meta de saque.',
        '4. Todos os dados são protegidos com tokenização bancária e criptografia AES-256.',
      ],
      actionLabel: 'Abrir Configuração Visa & Saques Agora',
      actionIcon: <ExternalLink className="w-4 h-4 text-blue-300" />,
      onAction: () => {
        onOpenVisaSettings();
      },
      highlightText: 'Acesse em Configurações > Saque no Cartão Visa & Express',
    },
    {
      id: 'showcase_creation',
      stepNumber: 3,
      totalSteps: 4,
      badge: 'Etapa 2 de 2 • Faturamento',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: <ShoppingBag className="w-5 h-5 text-purple-400" />,
      title: 'Como Criar seu Primeiro Item na Vitrine',
      subtitle: 'Cadastre infoprodutos, mentorias, templates ou serviços para vender.',
      description:
        'Sua vitrine é o catálogo público onde seus seguidores e clientes compram seus produtos digitais ou contratam seus serviços:',
      keyInstructions: [
        '1. Clique em "Meu Perfil & Vitrine" ou vá até a aba "Produtos Digitais".',
        '2. Clique no botão "+ Adicionar Novo Item à Vitrine".',
        '3. Defina o Título, Categoria (E-book, Mentoria, Template, Software) e Preço em Dinheiro Real (R$).',
        '4. Insira a capa atraente e o link de acesso ou download seguro (Google Drive, Notion, PDF).',
        '5. Salve para disponibilizar imediatamente na sua Loja Pública com checkout instantâneo!',
      ],
      actionLabel: 'Criar Primeiro Item na Vitrine Agora',
      actionIcon: <Store className="w-4 h-4 text-purple-300" />,
      onAction: () => {
        onOpenCreateShowcase();
      },
      highlightText: 'Disponível em Meu Perfil & Vitrine e na aba Produtos Digitais',
    },
    {
      id: 'ai_copilot',
      stepNumber: 4,
      totalSteps: 4,
      badge: 'Dica Bônus • Inteligência Artificial',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: <Bot className="w-5 h-5 text-amber-400" />,
      title: 'Copiloto de IA & Próximos Passos',
      subtitle: 'Aumente o ticket médio e exporte resumos estratégicos para revisão offline.',
      description:
        'Parabéns! Você já domina a configuração de recebimento Visa e a publicação de itens na vitrine. Para acelerar seus resultados:',
      keyInstructions: [
        'Consulte as "Dicas de Inteligência Artificial" no painel para sugestões personalizadas de preços e combos.',
        'Exporte o "Resumo Estratégico em PDF" para revisar planos de ação offline.',
        'Monitore taxas de gateway e despesas operacionais no painel de "Custos & Lucro Real".',
        'Você pode reiniciar este tour guiado a qualquer momento clicando em "Tour de Boas-Vindas" no topo.',
      ],
      actionLabel: 'Ver Dicas de IA no Dashboard',
      actionIcon: <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />,
      onAction: () => {
        onNavigateTab?.('overview');
      },
    },
  ];

  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    // Trigger confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore if not supported
    }

    completeOnboardingTour();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Spotlight Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative text-slate-200 flex flex-col">
        {/* Top Progress & Action Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30">
              <Compass className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">
                  Tour Guiado de Boas-Vindas
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentStep.badgeColor}`}>
                  {currentStep.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Passo {currentStep.stepNumber} de {currentStep.totalSteps}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleComplete}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Pular Tour
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Progress Indicators (Bolinhas com Linhas) */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800/80 flex items-center justify-between">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-md'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <div className="hidden sm:block">
                    <span
                      className={`text-[11px] font-semibold block leading-tight ${
                        isCurrent ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {idx === 0
                        ? 'Boas-Vindas'
                        : idx === 1
                        ? 'Conta Visa'
                        : idx === 2
                        ? 'Criar Vitrine'
                        : 'Copiloto IA'}
                    </span>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded transition-all ${
                      idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-7 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* Main Title & Subtitle Card */}
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-indigo-400 shadow-inner shrink-0 mt-0.5">
              {currentStep.icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {currentStep.title}
              </h3>
              <p className="text-xs font-medium text-indigo-300">
                {currentStep.subtitle}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Key Step-by-Step Instructions */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Passos Práticos Recomendados:
            </span>
            <div className="space-y-2 text-xs">
              {currentStep.keyInstructions.map((instruction, i) => (
                <div key={i} className="flex items-start gap-2.5 text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    ✓
                  </div>
                  <span className="leading-relaxed">{instruction}</span>
                </div>
              ))}
            </div>

            {currentStep.highlightText && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-amber-300">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Onde encontrar: <strong>{currentStep.highlightText}</strong></span>
              </div>
            )}
          </div>

          {/* Direct Interactive Action Button */}
          {currentStep.actionLabel && currentStep.onAction && (
            <div className="p-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Quer experimentar agora mesmo?</span>
                <span className="text-[11px] text-slate-400">
                  Você pode abrir este recurso diretamente e voltar ao tour quando quiser.
                </span>
              </div>

              <button
                type="button"
                onClick={currentStep.onAction}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer active:scale-95 shrink-0"
              >
                {currentStep.actionIcon}
                <span>{currentStep.actionLabel}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStepIndex === 0}
            onClick={handlePrev}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              currentStepIndex === 0
                ? 'text-slate-600 cursor-not-allowed opacity-50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Passo {currentStepIndex + 1} de {steps.length}
            </span>

            {currentStepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer active:scale-95"
              >
                <span>Próximo Passo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Concluir Tour & Começar!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
