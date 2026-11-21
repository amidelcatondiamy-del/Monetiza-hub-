import React, { useState } from 'react';
import {
  Share2,
  Users,
  Plus,
  Percent,
  Check,
  Copy,
  DollarSign,
  TrendingUp,
  X,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL, formatNumber } from '../../utils/formatters';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

export const AffiliatesManager: React.FC = () => {
  const { affiliates, addAffiliate } = useMonetization();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [commissionRate, setCommissionRate] = useState('30');

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const totalCommissionsPaid = affiliates.reduce((sum, a) => sum + a.totalEarned, 0);
  const totalAffiliateSales = affiliates.reduce((sum, a) => sum + a.salesCount, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addAffiliate({
      name,
      email,
      code: code.toUpperCase().trim(),
      commissionRate: parseFloat(commissionRate) || 30,
      status: 'active',
    });
    setName('');
    setEmail('');
    setCode('');
    setIsModalOpen(false);
  };

  const handleCopyLink = (affCode: string) => {
    const link = `${window.location.origin}?ref=${affCode}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(affCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Programa de Afiliados & Parcerias
            </h2>
            <span className="text-xs bg-teal-500/10 text-teal-400 font-semibold px-2 py-0.5 rounded-md border border-teal-500/20">
              Escala de Vendas
            </span>
            <ModalityFeeTooltip
              modality="affiliate"
              triggerLabel="Taxas & Split"
              tone="emerald"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Permita que parceiros e alunos vendam seus produtos em troca de comissões automáticas.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Parceiro</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 font-mono">
          <div className="text-[10px] text-slate-400 uppercase font-sans">Afiliados Ativos</div>
          <div className="text-xl font-bold text-white mt-1">{affiliates.length} parceiros</div>
        </div>
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 font-mono">
          <div className="text-[10px] text-slate-400 uppercase font-sans">Vendas Geradas</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{totalAffiliateSales} vendas</div>
        </div>
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 font-mono">
          <div className="text-[10px] text-slate-400 uppercase font-sans">Comissões Pagas</div>
          <div className="text-xl font-bold text-white mt-1">{formatBRL(totalCommissionsPaid)}</div>
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Parceiro & Contato</th>
                <th className="px-6 py-3.5">Cupom / Tag</th>
                <th className="px-6 py-3.5">
                  <span className="inline-flex items-center gap-1">
                    <span>Comissão (%)</span>
                    <ModalityFeeTooltip modality="affiliate" iconOnly tone="emerald" />
                  </span>
                </th>
                <th className="px-6 py-3.5">Cliques</th>
                <th className="px-6 py-3.5">Vendas</th>
                <th className="px-6 py-3.5 text-right">Total Ganho</th>
                <th className="px-6 py-3.5 text-right">Link do Afiliado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {affiliates.map((aff) => (
                <tr key={aff.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-sans">
                    <div className="font-semibold text-white">{aff.name}</div>
                    <div className="text-[11px] text-slate-400">{aff.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-800 text-teal-400 font-bold px-2 py-0.5 rounded text-xs border border-slate-700">
                      {aff.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{aff.commissionRate}%</td>
                  <td className="px-6 py-4 text-slate-300">{formatNumber(aff.clicks)}</td>
                  <td className="px-6 py-4 text-emerald-400 font-bold">{aff.salesCount}</td>
                  <td className="px-6 py-4 text-right text-white font-bold">
                    {formatBRL(aff.totalEarned)}
                  </td>
                  <td className="px-6 py-4 text-right font-sans">
                    <button
                      onClick={() => handleCopyLink(aff.code)}
                      className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer text-xs"
                    >
                      {copiedCode === aff.code ? 'Copiado!' : 'Copiar Link'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Cadastrar Novo Afiliado</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome do Parceiro</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Código / Tag</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="EX: LUCAS30"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="80"
                    required
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl"
                >
                  Criar Afiliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
