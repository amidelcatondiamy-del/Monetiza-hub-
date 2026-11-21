import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Plus,
  BookOpen,
  Heart,
  Eye,
  X,
  CreditCard,
  FileText,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL, formatDate } from '../../utils/formatters';
import { GatedPost } from '../../types/monetization';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

interface PaywallManagerProps {
  onTestUnlockCheckout: (post: GatedPost) => void;
}

export const PaywallManager: React.FC<PaywallManagerProps> = ({ onTestUnlockCheckout }) => {
  const { posts, addGatedPost, likePost, tiers } = useMonetization();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [unlockPrice, setUnlockPrice] = useState('29.00');
  const [requiredTier, setRequiredTier] = useState<string>('vip');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80');

  const [readingPost, setReadingPost] = useState<GatedPost | null>(null);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    addGatedPost({
      title,
      excerpt,
      fullContent,
      unlockPrice: parseFloat(unlockPrice) || 0,
      requiredTier,
      coverImage,
    });
    setTitle('');
    setExcerpt('');
    setFullContent('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Paywall & Conteúdo Restrito
            </h2>
            <span className="text-xs bg-rose-500/10 text-rose-400 font-semibold px-2 py-0.5 rounded-md border border-rose-500/20">
              Microtransações
            </span>
            <ModalityFeeTooltip
              modality="paywall_unlock"
              triggerLabel="Taxas de desbloqueio"
              tone="rose"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monetize artigos, relatórios e áudios com desbloqueio avulso ou livre para membros VIP.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Artigo Restrito</span>
        </button>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition"
          >
            <div>
              <div className="relative h-44 w-full bg-slate-950">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-400 flex items-center gap-1 border border-rose-500/30">
                  <Lock className="w-3 h-3" />
                  <span>CONTEÚDO FECHADO</span>
                </div>
                <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-black text-white font-mono border border-slate-700">
                  Desbloqueio: {formatBRL(post.unlockPrice)}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">{formatDate(post.publishedAt)}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-semibold">
                      {post.requiredTier === 'free'
                        ? 'Aberto'
                        : tiers.find((t) => t.id === post.requiredTier)?.name || 'Incluso no Clube VIP'}
                    </span>
                    <ModalityFeeTooltip
                      modality="paywall_unlock"
                      sampleAmountBRL={post.unlockPrice}
                      iconOnly
                      tone="rose"
                    />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {post.reads}
                </span>
                <button
                  onClick={() => likePost(post.id)}
                  className="flex items-center gap-1 hover:text-rose-400 transition cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5" />
                  {post.likes}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReadingPost(post)}
                  className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  Ver Texto
                </button>
                <button
                  onClick={() => onTestUnlockCheckout(post)}
                  className="flex items-center gap-1 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl shadow transition cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Testar Desbloqueio</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View Reading Modal */}
      {readingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-rose-400">Conteúdo do Paywall</span>
              <button
                onClick={() => setReadingPost(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-lg font-bold text-white">{readingPost.title}</h2>
            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 font-sans">
              {readingPost.fullContent}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Novo Post no Paywall</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Título do Artigo</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Preço de Desbloqueio Avulso (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unlockPrice}
                    onChange={(e) => setUnlockPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nível de Assinatura que Libera</label>
                  <select
                    value={requiredTier}
                    onChange={(e) => setRequiredTier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="vip">Todos os Assinantes VIP</option>
                    {tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        Apenas {tier.name} ou superior
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Trecho Aberto (Teaser Público)</label>
                <textarea
                  rows={2}
                  required
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Conteúdo Exclusivo (Completo)</label>
                <textarea
                  rows={5}
                  required
                  value={fullContent}
                  onChange={(e) => setFullContent(e.target.value)}
                  placeholder="Escreva aqui o artigo, links secretos, instruções..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
                >
                  Publicar Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
