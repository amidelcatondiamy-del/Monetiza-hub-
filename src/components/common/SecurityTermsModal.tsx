import React from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  FileText,
  AlertTriangle,
  Scale,
  CheckCircle2,
  CreditCard,
  Building,
} from 'lucide-react';

interface SecurityTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityTermsModal: React.FC<SecurityTermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative text-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Termos de Responsabilidade, Segurança & Compliance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Diretrizes de segurança financeira, proteção de dados e integridade de repasses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto text-xs leading-relaxed text-slate-300">
          {/* Section 1: Repasses e Cartão Visa */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <h3>1. Segurança dos Repasses e Cartão Visa (Visa Direct)</h3>
            </div>
            <p>
              Todos os repasses e créditos automáticos efetuados para contas e cartões Visa utilizam a infraestrutura <strong>Visa Direct</strong> com criptografia de ponta a ponta e certificação <strong>PCI-DSS Nível 1</strong>. Os dados sensíveis dos cartões passam por tokenização de nível bancário e nunca são armazenados em texto plano.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Transações auditadas em tempo real com proteção antifraude ativa 24/7.</span>
            </div>
          </div>

          {/* Section 2: Responsabilidade do Criador de Conteúdo */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Scale className="w-4 h-4 text-emerald-400" />
              <h3>2. Responsabilidade do Criador de Conteúdo</h3>
            </div>
            <p>
              O criador e titular da conta declara e garante que:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>
                É o legítimo proprietário ou possui licença expressa de todos os infoprodutos, e-books, áudios e vídeos comercializados através do MonetizaHub.
              </li>
              <li>
                É responsável pela entrega efetiva do material prometido nos prazos estipulados e pelo cumprimento dos benefícios dos Clubes de Assinatura.
              </li>
              <li>
                Assume a responsabilidade fiscal perante a legislação brasileira vigente (declaração de rendimentos, emissão de notas fiscais de serviços/produtos digitais).
              </li>
              <li>
                É estritamente vedada a venda de conteúdos ilegais, difamatórios, piratas ou que infrinjam direitos autorais de terceiros.
              </li>
            </ul>
          </div>

          {/* Section 3: Garantia e Direito de Arrependimento */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3>3. Direito de Arrependimento (CDC Art. 49) e Estornos</h3>
            </div>
            <p>
              Em conformidade com o <strong>Art. 49 do Código de Defesa do Consumidor</strong>, os compradores têm direito a solicitar o reembolso integral de produtos digitais no prazo de 7 (sete) dias corridos a contar da data da compra. Em caso de estorno aprovado, o valor é estornado ao método de pagamento original e deduzido do saldo do criador.
            </p>
          </div>

          {/* Section 4: Proteção de Dados (LGPD) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-indigo-400" />
              <h3>4. Privacidade e Proteção de Dados (LGPD - Lei 13.709/18)</h3>
            </div>
            <p>
              Os dados dos compradores (nome, e-mail e identificadores) são processados exclusivamente para a entrega dos produtos adquiridos e emissão dos recibos fiscais. É expressamente proibida a comercialização, compartilhamento não autorizado ou cessão de dados cadastrais a terceiros.
            </p>
          </div>

          {/* Section 5: Retenção de Segurança e Prevenção à Lavagem de Dinheiro */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Building className="w-4 h-4 text-purple-400" />
              <h3>5. Compliance Financeiro e Prevenção a Fraudes (PLD-FT)</h3>
            </div>
            <p>
              Para assegurar a liquidez das operações, vendas em cartão de crédito podem reter uma margem de garantia técnica de até 30% nas primeiras 24 horas para proteção contra chargebacks. Saques atípicos poderão ser submetidos a verificação de titularidade do CPF e do cartão Visa de destino.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Atualizado em conformidade com o Banco Central e regulamentos Visa.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer"
          >
            Entendido & Aceitar Termos
          </button>
        </div>
      </div>
    </div>
  );
};
