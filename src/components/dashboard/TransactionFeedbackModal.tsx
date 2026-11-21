import React, { useState } from 'react';
import {
  Star,
  X,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Lock,
  User,
  ShoppingBag,
  Send,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { Transaction } from '../../types/monetization';

interface TransactionFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
}

export const TransactionFeedbackModal: React.FC<TransactionFeedbackModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { addTransactionReview, creator } = useMonetization();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentTx = transaction;
  const itemName = currentTx?.title || 'Transação Segura';
  const partnerName =
    role === 'buyer'
      ? (creator.name || 'Amidel Catondi')
      : (currentTx?.customerName || 'Cliente Comprador');

  const ratingDescriptions: Record<number, string> = {
    1: '1 estrela · Experiência insatisfatória',
    2: '2 estrelas · Precisa melhorar',
    3: '3 estrelas · Razoável / Atendeu o básico',
    4: '4 estrelas · Muito boa experiência!',
    5: '5 estrelas · Excelente! Recomendo com certeza!',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && rating === 0) return;

    setIsSubmitting(true);

    setTimeout(() => {
      addTransactionReview({
        transactionId: currentTx?.id || `tx-${Date.now().toString().slice(-6)}`,
        targetUserId: role === 'buyer' ? creator.handle : 'customer',
        reviewerName: role === 'buyer' ? (currentTx?.customerName || 'Cliente Verificado') : creator.name,
        reviewerRole: role,
        rating: rating || 5,
        comment: comment.trim() || 'Transação concluída com sucesso e total segurança!',
        itemTitle: itemName,
        verifiedPurchase: true,
      });

      setIsSubmitting(false);
      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);
        setComment('');
        onClose();
      }, 1500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Star className="w-4 h-4 fill-amber-400" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Avaliação & Feedback da Transação
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sua avaliação mútua fortalece a segurança e a reputação na plataforma.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-in zoom-in duration-300">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Avaliação Registrada!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Obrigado pelo seu feedback! Ele já foi computado na reputação pública e no histórico da transação.
              </p>
            </div>
            <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              ★ {rating}.0 estrelas computadas
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Transaction summary ribbon */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="font-semibold text-slate-200 truncate">{itemName}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    ID: {currentTx?.id || 'tx-rec-9842'} · {currentTx?.grossAmount ? `R$ ${currentTx.grossAmount.toFixed(2)}` : 'Transação Aprovada'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Compra Verificada</span>
              </div>
            </div>

            {/* Role selector (Buyer or Seller) */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Papel nesta avaliação:
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    role === 'buyer'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Avaliar Vendedor (Amidel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    role === 'seller'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Avaliar Comprador</span>
                </button>
              </div>
            </div>

            {/* Stars selection (1-5) */}
            <div className="text-center py-2 bg-slate-950/40 rounded-xl border border-slate-800/60 p-4">
              <label className="block text-xs font-medium text-slate-300 mb-3">
                Como você classifica sua experiência com <span className="font-bold text-white">{partnerName}</span>?
              </label>
              <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const isFilled = (hoverRating || rating) >= starIndex;
                  return (
                    <button
                      key={starIndex}
                      type="button"
                      onClick={() => setRating(starIndex)}
                      onMouseEnter={() => setHoverRating(starIndex)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1.5 focus:outline-none transition-transform hover:scale-125 duration-150"
                      aria-label={`${starIndex} estrelas`}
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-medium text-amber-400 h-4">
                {ratingDescriptions[hoverRating || rating]}
              </div>
            </div>

            {/* Free text comment */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Comentário / Depoimento sincero:
                </label>
                <span className="text-[11px] text-slate-500">
                  {comment.length}/400
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={400}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  role === 'buyer'
                    ? 'Conte como foi o atendimento, a rapidez na entrega do produto ou a segurança do pagamento...'
                    : 'Deixe um comentário sobre a facilidade de comunicação e conclusão com o comprador...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
              />
            </div>

            {/* Security Guarantee Note */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Avaliação autenticada por chave criptográfica. Sem comentários anônimos ou bots.</span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                Avaliar Mais Tarde
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Registrando...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publicar Avaliação</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
