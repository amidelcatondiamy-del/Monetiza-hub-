import React, { useMemo, useState } from 'react';
import {
  Plus,
  ShoppingBag,
  Edit2,
  Trash2,
  Star,
  Check,
  Copy,
  X,
  TicketPercent,
  Calendar,
  Search,
  Pause,
  Play,
  Wand2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { formatBRL, formatNumber } from '../../utils/formatters';
import { DigitalProduct, DiscountCoupon, ProductType } from '../../types/monetization';
import { ModalityFeeTooltip } from '../common/FeeTooltip';

interface ProductsManagerProps {
  onTestProductCheckout: (product: DigitalProduct) => void;
}

type SubTab = 'products' | 'coupons';
type CouponFilter = 'all' | 'active' | 'paused' | 'expired_or_exhausted';

const getDefaultExpiryDate = (daysAhead = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isCouponExpired = (expiresAt: string) => {
  if (!expiresAt) return false;
  const ts = expiresAt.includes('T')
    ? new Date(expiresAt).getTime()
    : new Date(`${expiresAt}T23:59:59`).getTime();
  return ts < Date.now();
};

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return '—';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const ProductsManager: React.FC<ProductsManagerProps> = ({ onTestProductCheckout }) => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    coupons,
    addCoupon,
    updateCoupon,
    toggleCouponActive,
    deleteCoupon,
  } = useMonetization();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('products');

  // Product Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('97.00');
  const [originalPrice, setOriginalPrice] = useState('197.00');
  const [type, setType] = useState<ProductType>('ebook');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80');
  const [contentUrl, setContentUrl] = useState('https://monetizahub.download/arquivo.pdf');
  const [contentSample, setContentSample] = useState('Acesso imediato após a confirmação do pagamento.');
  const [tags, setTags] = useState('Infoproduto, Monetização');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Coupon State & Modal
  const [couponSearch, setCouponSearch] = useState('');
  const [couponFilter, setCouponFilter] = useState<CouponFilter>('all');
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);
  const [pendingDeleteCode, setPendingDeleteCode] = useState<string | null>(null);

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCouponCode, setEditingCouponCode] = useState<string | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('20');
  const [couponExpiresAt, setCouponExpiresAt] = useState(() => getDefaultExpiryDate(30));
  const [couponMaxUses, setCouponMaxUses] = useState('100');
  const [couponProductId, setCouponProductId] = useState<string>('all');
  const [couponActive, setCouponActive] = useState(true);
  const [couponFormError, setCouponFormError] = useState<string | null>(null);

  // Product handlers
  const handleOpenNew = () => {
    setEditingProductId(null);
    setTitle('');
    setDescription('');
    setPrice('97.00');
    setOriginalPrice('197.00');
    setType('ebook');
    setCoverImage('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80');
    setContentUrl('https://monetizahub.download/arquivo.pdf');
    setContentSample('');
    setTags('Infoproduto, Monetização');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: DigitalProduct) => {
    setEditingProductId(p.id);
    setTitle(p.title);
    setDescription(p.description);
    setPrice(p.price.toString());
    setOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setType(p.type);
    setCoverImage(p.coverImage);
    setContentUrl(p.contentUrl || '');
    setContentSample(p.contentSample || '');
    setTags(p.tags.join(', '));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (editingProductId) {
      updateProduct(editingProductId, {
        title,
        description,
        price: parseFloat(price) || 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        type,
        coverImage,
        contentUrl,
        contentSample,
        tags: tagList,
      });
    } else {
      addProduct({
        title,
        description,
        price: parseFloat(price) || 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        type,
        coverImage,
        contentUrl,
        contentSample,
        tags: tagList,
        isPublished: true,
        featured: false,
      });
    }

    setIsModalOpen(false);
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}?checkout=${id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Coupon handlers
  const handleOpenNewCoupon = () => {
    setEditingCouponCode(null);
    setCouponCodeInput('');
    setCouponDiscount('20');
    setCouponExpiresAt(getDefaultExpiryDate(30));
    setCouponMaxUses('100');
    setCouponProductId('all');
    setCouponActive(true);
    setCouponFormError(null);
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (coupon: DiscountCoupon) => {
    setEditingCouponCode(coupon.code);
    setCouponCodeInput(coupon.code);
    setCouponDiscount(String(coupon.discountPercentage));
    setCouponExpiresAt(coupon.expiresAt.split('T')[0]);
    setCouponMaxUses(String(coupon.maxUses));
    setCouponProductId(coupon.productId || 'all');
    setCouponActive(coupon.active);
    setCouponFormError(null);
    setIsCouponModalOpen(true);
  };

  const handleGenerateCouponCode = () => {
    const prefixes = ['PROMO', 'VIP', 'OFERTA', 'CREATOR', 'EXCLUSIVO', 'BONUS'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const pct = Math.max(5, Math.min(90, parseInt(couponDiscount, 10) || 20));
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    setCouponCodeInput(`${prefix}${pct}-${suffix}`);
    setCouponFormError(null);
  };

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormError(null);

    const sanitizedCode = couponCodeInput
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');

    if (sanitizedCode.length < 3) {
      setCouponFormError('O código promocional deve ter pelo menos 3 caracteres alfanuméricos.');
      return;
    }

    const discountVal = Number(couponDiscount);
    if (Number.isNaN(discountVal) || discountVal < 1 || discountVal > 90) {
      setCouponFormError('O percentual de desconto deve estar entre 1% e 90%.');
      return;
    }

    const maxUsesVal = parseInt(couponMaxUses, 10);
    if (Number.isNaN(maxUsesVal) || maxUsesVal < 1) {
      setCouponFormError('O limite máximo de usos deve ser de pelo menos 1.');
      return;
    }

    if (!couponExpiresAt) {
      setCouponFormError('Selecione uma data de expiração válida.');
      return;
    }

    const duplicate = coupons.find(
      (c) =>
        c.code.toUpperCase() === sanitizedCode &&
        (!editingCouponCode || c.code.toUpperCase() !== editingCouponCode.toUpperCase())
    );
    if (duplicate) {
      setCouponFormError(`Já existe um cupom com o código "${sanitizedCode}".`);
      return;
    }

    const targetProductId = couponProductId === 'all' ? undefined : couponProductId;

    if (editingCouponCode) {
      updateCoupon(editingCouponCode, {
        code: sanitizedCode,
        discountPercentage: discountVal,
        expiresAt: couponExpiresAt,
        maxUses: maxUsesVal,
        productId: targetProductId,
        active: couponActive,
      });
    } else {
      addCoupon({
        code: sanitizedCode,
        discountPercentage: discountVal,
        maxUses: maxUsesVal,
        usedCount: 0,
        expiresAt: couponExpiresAt,
        active: couponActive,
        productId: targetProductId,
        createdAt: new Date().toISOString(),
      });
    }

    setIsCouponModalOpen(false);
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponCode(code);
    setTimeout(() => setCopiedCouponCode(null), 1800);
  };

  const getCouponStatus = (c: DiscountCoupon): 'active' | 'paused' | 'expired' | 'exhausted' => {
    if (isCouponExpired(c.expiresAt)) return 'expired';
    if (c.usedCount >= c.maxUses) return 'exhausted';
    if (!c.active) return 'paused';
    return 'active';
  };

  const couponMetrics = useMemo(() => {
    let activeCount = 0;
    let totalRedemptions = 0;
    let maxActiveDiscount = 0;
    let expiredOrExhaustedCount = 0;

    coupons.forEach((c) => {
      totalRedemptions += c.usedCount;
      const status = getCouponStatus(c);
      if (status === 'active') {
        activeCount += 1;
        if (c.discountPercentage > maxActiveDiscount) {
          maxActiveDiscount = c.discountPercentage;
        }
      } else if (status === 'expired' || status === 'exhausted') {
        expiredOrExhaustedCount += 1;
      }
    });

    return {
      activeCount,
      totalRedemptions,
      maxActiveDiscount,
      expiredOrExhaustedCount,
    };
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const query = couponSearch.trim().toUpperCase();
    return coupons.filter((c) => {
      const status = getCouponStatus(c);
      if (couponFilter === 'active' && status !== 'active') return false;
      if (couponFilter === 'paused' && status !== 'paused') return false;
      if (
        couponFilter === 'expired_or_exhausted' &&
        status !== 'expired' &&
        status !== 'exhausted'
      ) {
        return false;
      }

      if (!query) return true;
      const linkedProduct = c.productId
        ? products.find((p) => p.id === c.productId)?.title || ''
        : 'TODOS OS PRODUTOS';
      return (
        c.code.toUpperCase().includes(query) ||
        linkedProduct.toUpperCase().includes(query)
      );
    });
  }, [coupons, couponFilter, couponSearch, products]);

  const previewProduct = useMemo(() => {
    if (couponProductId !== 'all') {
      return products.find((p) => p.id === couponProductId) || null;
    }
    return products[0] || null;
  }, [couponProductId, products]);

  const previewDiscountVal = Math.max(0, Math.min(90, Number(couponDiscount) || 0));
  const previewDiscountedPrice = previewProduct
    ? Math.max(1, Number((previewProduct.price * (1 - previewDiscountVal / 100)).toFixed(2)))
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner + Sub-Tabs */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Produtos Digitais & Infoprodutos
              </h2>
              <ModalityFeeTooltip
                modality="product_sale"
                triggerLabel="Taxas por venda"
                tone="emerald"
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeSubTab === 'products'
                ? 'Gerencie seus e-books, cursos, templates e mentorias com links diretos de checkout.'
                : 'Crie códigos promocionais com percentual de desconto, limite de resgates e data de expiração.'}
            </p>
          </div>

          {activeSubTab === 'products' ? (
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto Digital</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewCoupon}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cupom</span>
            </button>
          )}
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('products')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'products'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Produtos</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-[10px] font-mono tabular-nums text-slate-300">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('coupons')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'coupons'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <TicketPercent className="w-3.5 h-3.5" />
            <span>Cupons de Desconto</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-[10px] font-mono tabular-nums text-slate-300">
              {coupons.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCTS GRID */}
      {activeSubTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => {
            const totalRevenue = product.price * product.salesCount;

            return (
              <div
                key={product.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition group"
              >
                <div>
                  {/* Image & Type */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                    <img
                      src={product.coverImage}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-200 border border-slate-700/60 uppercase">
                      {product.type}
                    </div>
                    <div className="absolute bottom-3 right-3 bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-black text-white font-mono">
                      {formatBRL(product.price)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Metrics bar */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono">
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 font-sans">Vendas</div>
                        <div className="text-xs font-bold text-white tabular-nums">{product.salesCount}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 font-sans flex items-center justify-center gap-1">
                          <span>Receita</span>
                          <ModalityFeeTooltip
                            modality="product_sale"
                            sampleAmountBRL={product.price}
                            iconOnly
                          />
                        </div>
                        <div className="text-xs font-bold text-emerald-400 tabular-nums">
                          {formatBRL(totalRevenue)}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 font-sans">Avaliação</div>
                        <div className="text-xs font-bold text-amber-300 flex items-center justify-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-300" />
                          {product.rating}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopyLink(product.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer whitespace-nowrap shrink-0"
                    title="Copiar link de checkout direto"
                  >
                    {copiedLink === product.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onTestProductCheckout(product)}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/10 px-2.5 py-1 rounded-lg transition cursor-pointer border border-emerald-500/30 whitespace-nowrap shrink-0"
                    >
                      <span>Testar Compra</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Editar produto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: DISCOUNT COUPONS MANAGER */}
      {activeSubTab === 'coupons' && (
        <div className="space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-medium text-slate-400">Cupons Ativos</div>
              <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
                {couponMetrics.activeCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Disponíveis para checkout
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-medium text-slate-400">Total de Resgates</div>
              <div className="text-xl font-bold text-white font-mono tabular-nums mt-1">
                {formatNumber(couponMetrics.totalRedemptions)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Aplicações confirmadas
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-medium text-slate-400">Maior Desconto Ativo</div>
              <div className="text-xl font-bold text-amber-300 font-mono tabular-nums mt-1">
                {couponMetrics.maxActiveDiscount > 0 ? `${couponMetrics.maxActiveDiscount}%` : '—'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Teto promocional vigente
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-medium text-slate-400">Expirados / Esgotados</div>
              <div className="text-xl font-bold text-slate-300 font-mono tabular-nums mt-1">
                {couponMetrics.expiredOrExhaustedCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Fora de validade ou limite
              </div>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                placeholder="Buscar por código ou produto vinculado..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'active', label: 'Ativos' },
                  { id: 'paused', label: 'Pausados' },
                  { id: 'expired_or_exhausted', label: 'Expirados / Esgotados' },
                ] as const
              ).map((filterItem) => (
                <button
                  key={filterItem.id}
                  type="button"
                  onClick={() => setCouponFilter(filterItem.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    couponFilter === filterItem.id
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {filterItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Coupons List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {filteredCoupons.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <TicketPercent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nenhum cupom encontrado</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {coupons.length === 0
                      ? 'Crie seu primeiro código promocional para impulsionar a conversão dos seus produtos digitais.'
                      : 'Ajuste os filtros de busca ou crie um novo cupom de desconto.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewCoupon}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Novo Cupom</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Produto Aplicável</th>
                      <th className="py-3 px-4">Desconto</th>
                      <th className="py-3 px-4">Usos</th>
                      <th className="py-3 px-4">Expiração</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {filteredCoupons.map((coupon) => {
                      const status = getCouponStatus(coupon);
                      const linkedProduct =
                        coupon.productId && coupon.productId !== 'all'
                          ? products.find((p) => p.id === coupon.productId)
                          : undefined;
                      const usagePct = Math.min(
                        100,
                        Math.round((coupon.usedCount / Math.max(1, coupon.maxUses)) * 100)
                      );
                      const testTargetProduct = linkedProduct || products[0];

                      return (
                        <tr
                          key={coupon.code}
                          className="hover:bg-slate-950/50 transition"
                        >
                          {/* Code */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-lg tracking-wide">
                                {coupon.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCoupon(coupon.code)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                title="Copiar código do cupom"
                              >
                                {copiedCouponCode === coupon.code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Scope */}
                          <td className="py-3.5 px-4">
                            {linkedProduct ? (
                              <div>
                                <div className="text-slate-200 font-medium line-clamp-1 max-w-[200px]">
                                  {linkedProduct.title}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                  De {formatBRL(linkedProduct.price)} por{' '}
                                  <span className="text-emerald-400 font-semibold">
                                    {formatBRL(
                                      Math.max(
                                        1,
                                        Number(
                                          (
                                            linkedProduct.price *
                                            (1 - coupon.discountPercentage / 100)
                                          ).toFixed(2)
                                        )
                                      )
                                    )}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300">Todos os produtos</span>
                            )}
                          </td>

                          {/* Discount */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold tabular-nums">
                              -{coupon.discountPercentage}%
                            </span>
                          </td>

                          {/* Usage */}
                          <td className="py-3.5 px-4 min-w-[130px]">
                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1">
                              <span className="text-white font-semibold">{coupon.usedCount}</span>
                              <span className="text-slate-500">/ {coupon.maxUses}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePct >= 100
                                    ? 'bg-rose-500'
                                    : usagePct >= 75
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                          </td>

                          {/* Expiration */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-mono tabular-nums text-slate-300">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{formatDateBR(coupon.expiresAt)}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {status === 'active' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                                Ativo
                              </span>
                            )}
                            {status === 'paused' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                                Pausado
                              </span>
                            )}
                            {status === 'expired' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold">
                                Expirado
                              </span>
                            )}
                            {status === 'exhausted' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold">
                                Esgotado
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {testTargetProduct && status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => onTestProductCheckout(testTargetProduct)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 transition cursor-pointer whitespace-nowrap shrink-0"
                                  title="Abrir checkout para testar este cupom"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Testar</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => toggleCouponActive(coupon.code)}
                                disabled={status === 'expired' || status === 'exhausted'}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  status === 'expired' || status === 'exhausted'
                                    ? 'text-slate-600 cursor-not-allowed'
                                    : coupon.active
                                    ? 'text-amber-400 hover:bg-slate-800'
                                    : 'text-emerald-400 hover:bg-slate-800'
                                }`}
                                title={coupon.active ? 'Pausar cupom' : 'Reativar cupom'}
                              >
                                {coupon.active ? (
                                  <Pause className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditCoupon(coupon)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                title="Editar cupom"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {pendingDeleteCode === coupon.code ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteCoupon(coupon.code);
                                      setPendingDeleteCode(null);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteCode(null)}
                                    className="px-1.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] hover:text-white transition cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteCode(coupon.code)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                                  title="Excluir cupom"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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

      {/* Create / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl relative text-slate-200">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingProductId ? 'Editar Produto Digital' : 'Criar Novo Produto Digital'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título do Produto
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Manual de Criação de Conteúdo Lucrativo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço De / Riscado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="197.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Formato / Tipo
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ProductType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ebook">E-book (PDF)</option>
                    <option value="course">Curso em Vídeo</option>
                    <option value="template">Template / Planilha</option>
                    <option value="mentorship">Mentoria 1 a 1</option>
                    <option value="software">Software / App</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição Comercial
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique os principais benefícios e o que está incluído..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL da Imagem de Capa
                </label>
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Link de Entrega / Download
                  </label>
                  <input
                    type="url"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="https://link-do-arquivo.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                >
                  {editingProductId ? 'Salvar Produto' : 'Publicar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-slate-200">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TicketPercent className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {editingCouponCode ? `Editar Cupom ${editingCouponCode}` : 'Criar Novo Cupom de Desconto'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCouponSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {couponFormError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{couponFormError}</span>
                </div>
              )}

              {/* Promotional Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código Promocional
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={couponCodeInput}
                    onChange={(e) =>
                      setCouponCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                    }
                    placeholder="Ex: LANCAMENTO25"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase tracking-wider focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCouponCode}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gerar Código</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Use letras maiúsculas, números, hífen (-) ou sublinhado (_).
                </p>
              </div>

              {/* Discount % & Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Percentual de Desconto (%)
                  </label>
                  <div className="flex items-center gap-1">
                    {[10, 20, 30, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCouponDiscount(String(preset))}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition cursor-pointer ${
                          Number(couponDiscount) === preset
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={90}
                  required
                  value={couponDiscount}
                  onChange={(e) => setCouponDiscount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Expiration & Max Uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data de Expiração
                  </label>
                  <input
                    type="date"
                    required
                    value={couponExpiresAt}
                    onChange={(e) => setCouponExpiresAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Limite Máximo de Usos
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    required
                    value={couponMaxUses}
                    onChange={(e) => setCouponMaxUses(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Product Scope */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Aplicar a Produto
                </label>
                <select
                  value={couponProductId}
                  onChange={(e) => setCouponProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Todos os Produtos Digitais</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.title} ({formatBRL(prod.price)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Price & Fee Preview */}
              {previewProduct && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Simulação em{' '}
                      <strong className="text-slate-200">{previewProduct.title}</strong>
                    </span>
                    <ModalityFeeTooltip
                      modality="product_sale"
                      sampleAmountBRL={previewDiscountedPrice}
                      triggerLabel="Taxas sobre valor final"
                      tone="emerald"
                    />
                  </div>
                  <div className="flex items-baseline justify-between font-mono tabular-nums">
                    <span className="text-xs text-slate-500 line-through">
                      {formatBRL(previewProduct.price)}
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      {formatBRL(previewDiscountedPrice)} ({previewDiscountVal}% OFF)
                    </span>
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-white">Cupom ativo no checkout</div>
                  <div className="text-[11px] text-slate-400">
                    Clientes poderão aplicar este código imediatamente após salvar.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={couponActive}
                  onChange={(e) => setCouponActive(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </label>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                >
                  {editingCouponCode ? 'Salvar Alterações' : 'Criar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

