import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  DollarSign,
  Receipt,
  Tag,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { ExpenseCategory } from '../../types/monetization';
import { formatCurrency } from '../../utils/formatters';

interface FinancialExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FinancialExpensesModal: React.FC<FinancialExpensesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    expenses,
    addExpense,
    deleteExpense,
    totalGatewayFees,
    totalMarketingExpenses,
    totalOperationalExpenses,
    realNetProfit,
    totalGrossRevenue,
    selectedCurrency,
  } = useMonetization();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('marketing');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'one_time'>('monthly');
  const [notes, setNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | ExpenseCategory>('all');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    addExpense({
      title: title.trim(),
      category,
      amount: parsedAmount,
      period,
      date: new Date().toISOString().slice(0, 10),
      notes: notes.trim() || undefined,
    });

    setTitle('');
    setAmount('');
    setNotes('');
  };

  const filteredExpenses = expenses.filter((e) => {
    if (filterCategory === 'all') return true;
    return e.category === filterCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Controle de Custos & Despesas Operacionais
              </h2>
              <p className="text-xs text-slate-400">
                Cadastre custos de tráfego, parcerias e ferramentas para cálculo automático da Receita Líquida Real
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

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <div className="text-slate-400">Receita Bruta Total</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {formatCurrency(totalGrossRevenue, selectedCurrency)}
              </div>
            </div>
            <div>
              <div className="text-rose-400">Taxas Gateway (Automáticas)</div>
              <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
                -{formatCurrency(totalGatewayFees, selectedCurrency)}
              </div>
            </div>
            <div>
              <div className="text-amber-400">Custos de Marketing</div>
              <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                -{formatCurrency(totalMarketingExpenses, selectedCurrency)}
              </div>
            </div>
            <div>
              <div className="text-emerald-400 font-bold">Lucro Líquido Real</div>
              <div className="text-sm font-extrabold text-emerald-300 font-mono mt-0.5">
                {formatCurrency(realNetProfit, selectedCurrency)}
              </div>
            </div>
          </div>

          {/* Form to Add New Expense */}
          <form onSubmit={handleSubmit} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Adicionar Nova Despesa ou Custo</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Descrição do Custo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Anúncios no Instagram, Notion, Hospedagem"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="marketing">Marketing & Tráfego</option>
                  <option value="operational">Despesa Operacional</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Valor ({selectedCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="period"
                    checked={period === 'monthly'}
                    onChange={() => setPeriod('monthly')}
                    className="accent-emerald-500"
                  />
                  <span>Recorrente Mensal</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="period"
                    checked={period === 'one_time'}
                    onChange={() => setPeriod('one_time')}
                    className="accent-emerald-500"
                  />
                  <span>Gasto Avulso</span>
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar Despesa</span>
              </button>
            </div>
          </form>

          {/* List of Registered Expenses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300">
                Despesas Cadastradas ({filteredExpenses.length})
              </h4>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['all', 'marketing', 'operational'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      filterCategory === cat
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat === 'all' && 'Todas'}
                    {cat === 'marketing' && 'Marketing'}
                    {cat === 'operational' && 'Operacional'}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-900/50 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{exp.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          exp.category === 'marketing'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        }`}
                      >
                        {exp.category === 'marketing' ? 'Marketing' : 'Operacional'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {exp.period === 'monthly' ? '• Mensal' : '• Avulso'}
                      </span>
                    </div>
                    {exp.notes && (
                      <p className="text-[11px] text-slate-400">{exp.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-rose-400">
                      -{formatCurrency(exp.amount, selectedCurrency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteExpense(exp.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                      title="Excluir despesa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>* As alterações recalculam a Receita Líquida Real imediatamente.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
