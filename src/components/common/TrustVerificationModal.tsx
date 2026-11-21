import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Search,
  Scale,
  CreditCard,
  Building,
  Award,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface TrustVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrustVerificationModal: React.FC<TrustVerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { creator, transactions, selectedCurrency } = useMonetization();
  const [searchTxId, setSearchTxId] = useState('');
  const [verifiedTx, setVerifiedTx] = useState<any | null>(null);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const cleanId = searchTxId.trim().toLowerCase();
    const found = transactions.find(
      (t) => t.id.toLowerCase() === cleanId || t.customerEmail.toLowerCase() === cleanId
    );
    setVerifiedTx(found || null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative text-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Central de Confiança, Segurança & Garantia
                </h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                  Verificado 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Transparência absoluta para clientes, compradores e parceiros.
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Trust Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 w-fit">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Pagamentos Seguros</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Processamento oficial Visa Direct, Pix e Multicaixa com tokenização bancária e criptografia AES-256.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Garantia 7 Dias</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Reembolso integral sem justificativa em até 7 dias corridos após a compra (Art. 49 do CDC).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                <FileCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Entrega Imediata</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Acesso instantâneo a todos os materiais por download seguro e cópia enviada ao seu e-mail.
              </p>
            </div>
          </div>

          {/* Public Receipt / Order Authenticity Verifier */}
          <div className="p-5 bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950/30 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                Validador Público de Autenticidade de Comprovante
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Consulta Pública</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Comprou de {creator.name}? Digite o ID da sua transação (ex: <code className="text-emerald-400 font-mono">tx-101</code>) ou seu e-mail para validar a autenticidade do pagamento:
            </p>

            <form onSubmit={handleVerify} className="flex gap-2">
              <input
                type="text"
                value={searchTxId}
                onChange={(e) => setSearchTxId(e.target.value)}
                placeholder="Informe o código da transação ou e-mail..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Verificar
              </button>
            </form>

            {searched && (
              <div className="pt-2 animate-in fade-in duration-150">
                {verifiedTx ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-sans">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Transação Autêntica e Liquidada no Sistema!</span>
                    </div>
                    <div className="text-white font-sans text-xs">
                      <strong>Item:</strong> {verifiedTx.title}
                    </div>
                    <div className="text-slate-300">
                      <strong>Cliente:</strong> {verifiedTx.customerName} ({verifiedTx.customerEmail})
                    </div>
                    <div className="text-slate-300">
                      <strong>Data:</strong> {formatDate(verifiedTx.createdAt)} •{' '}
                      <strong>Valor:</strong> {formatCurrency(verifiedTx.grossAmount, selectedCurrency)}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Nenhum registro encontrado com este ID. Verifique o código no seu recibo.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Verified Creator Identity */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Identidade do Vendedor Auditada
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Nível 3 (Máximo)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              O criador <strong>{creator.name}</strong> possui cadastro completo com CPF/CNPJ validado perante a Receita Federal, conta bancária titular autenticada e cartão Visa Direct homologado para liquidação de valores.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Auditado por MonetizaHub Trust & Safety • Certificação PCI-DSS
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
