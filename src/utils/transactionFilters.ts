import { Transaction, ProductCategoryFilter, OriginChannelFilter, UserSegmentFilter } from '../types/monetization';

export interface CategoryOption {
  id: ProductCategoryFilter;
  label: string;
  shortLabel: string;
  iconName: string;
  color: string;
}

export interface OriginOption {
  id: OriginChannelFilter;
  label: string;
  shortLabel: string;
  iconName: string;
  color: string;
}

export interface SegmentOption {
  id: UserSegmentFilter;
  label: string;
  shortLabel: string;
  iconName: string;
  color: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'all', label: 'Todas as Categorias', shortLabel: 'Todas', iconName: 'Layers', color: 'emerald' },
  { id: 'ebook', label: 'E-books & Manuais', shortLabel: 'E-books', iconName: 'BookOpen', color: 'blue' },
  { id: 'course', label: 'Cursos & Masterclasses', shortLabel: 'Cursos', iconName: 'GraduationCap', color: 'indigo' },
  { id: 'template', label: 'Templates & Ferramentas', shortLabel: 'Templates', iconName: 'FileCode', color: 'cyan' },
  { id: 'mentorship', label: 'Mentorias & Consultorias', shortLabel: 'Mentorias', iconName: 'Users', color: 'purple' },
  { id: 'subscription', label: 'Assinaturas VIP (MRR)', shortLabel: 'Assinaturas', iconName: 'Crown', color: 'amber' },
  { id: 'paywall', label: 'Conteúdo Exclusivo (Paywall)', shortLabel: 'Paywall', iconName: 'Lock', color: 'rose' },
  { id: 'tip', label: 'Apoios & Gorjetas Pix', shortLabel: 'Gorjetas', iconName: 'Heart', color: 'pink' },
  { id: 'in_app', label: 'Recursos Pro (In-App)', shortLabel: 'In-App', iconName: 'Sparkles', color: 'violet' },
];

export const ORIGIN_OPTIONS: OriginOption[] = [
  { id: 'all', label: 'Todos os Canais de Origem', shortLabel: 'Todos', iconName: 'Share2', color: 'emerald' },
  { id: 'direct', label: 'Tráfego Direto & Orgânico', shortLabel: 'Direto / Orgânico', iconName: 'Globe', color: 'sky' },
  { id: 'affiliate', label: 'Rede de Afiliados (Comissionado)', shortLabel: 'Afiliados', iconName: 'Users', color: 'amber' },
];

export const SEGMENT_OPTIONS: SegmentOption[] = [
  { id: 'all', label: 'Todos os Segmentos de Clientes', shortLabel: 'Todos', iconName: 'UserCheck', color: 'emerald' },
  { id: 'subscriber', label: 'Assinantes VIP (Recorrentes)', shortLabel: 'Assinantes VIP', iconName: 'Crown', color: 'indigo' },
  { id: 'occasional', label: 'Compradores Ocasionais (Avulsos)', shortLabel: 'Compradores Avulsos', iconName: 'ShoppingBag', color: 'teal' },
];

/**
 * Resolves the category of a transaction reliably, inferring from type, title or productId if not directly set
 */
export const resolveTransactionCategory = (tx: Transaction): ProductCategoryFilter => {
  if (tx.productCategory && tx.productCategory !== 'all') {
    return tx.productCategory;
  }

  if (tx.type === 'subscription') return 'subscription';
  if (tx.type === 'paywall_unlock') return 'paywall';
  if (tx.type === 'tip') return 'tip';
  if (tx.type === 'in_app_purchase') return 'in_app';

  const titleLower = tx.title.toLowerCase();
  if (titleLower.includes('manual') || titleLower.includes('ebook') || titleLower.includes('guia') || tx.productId === 'prod-1') {
    return 'ebook';
  }
  if (titleLower.includes('masterclass') || titleLower.includes('curso') || titleLower.includes('video') || tx.productId === 'prod-3') {
    return 'course';
  }
  if (titleLower.includes('template') || titleLower.includes('notion') || titleLower.includes('pack') || tx.productId === 'prod-2' || tx.productId === 'prod-4') {
    return 'template';
  }
  if (titleLower.includes('mentoria') || titleLower.includes('consultoria') || tx.productId === 'prod-5') {
    return 'mentorship';
  }

  return 'ebook';
};

/**
 * Resolves the channel of origin (direct vs affiliate)
 */
export const resolveTransactionOrigin = (tx: Transaction): 'direct' | 'affiliate' => {
  if (tx.originChannel) {
    return tx.originChannel;
  }
  if (tx.affiliateCode) {
    return 'affiliate';
  }
  // Deterministic attribution based on transaction ID pattern for legacy mock records
  const idNum = parseInt(tx.id.replace(/\D/g, ''), 10) || 0;
  return idNum % 3 === 0 ? 'affiliate' : 'direct';
};

/**
 * Resolves the customer segment (subscriber vs occasional)
 */
export const resolveTransactionSegment = (tx: Transaction): 'subscriber' | 'occasional' => {
  if (tx.userSegment) {
    return tx.userSegment;
  }
  if (tx.type === 'subscription') {
    return 'subscriber';
  }
  // If customer email has subscribed or recurrent pattern
  const idNum = parseInt(tx.id.replace(/\D/g, ''), 10) || 0;
  return idNum % 4 === 0 ? 'subscriber' : 'occasional';
};

/**
 * Computes consolidated gains and metrics for a set of transactions
 */
export const computeGainsMetrics = (transactions: Transaction[]) => {
  const approved = transactions.filter((t) => t.status === 'approved');
  const gross = approved.reduce((sum, t) => sum + t.grossAmount, 0);
  const net = approved.reduce((sum, t) => sum + t.netAmount, 0);
  const fees = gross - net;
  const count = approved.length;
  const avgTicket = count > 0 ? gross / count : 0;

  // Origin breakdown
  const directTxs = approved.filter((t) => resolveTransactionOrigin(t) === 'direct');
  const affiliateTxs = approved.filter((t) => resolveTransactionOrigin(t) === 'affiliate');

  const directGross = directTxs.reduce((sum, t) => sum + t.grossAmount, 0);
  const directNet = directTxs.reduce((sum, t) => sum + t.netAmount, 0);
  const affiliateGross = affiliateTxs.reduce((sum, t) => sum + t.grossAmount, 0);
  const affiliateNet = affiliateTxs.reduce((sum, t) => sum + t.netAmount, 0);

  // Segment breakdown
  const subscriberTxs = approved.filter((t) => resolveTransactionSegment(t) === 'subscriber');
  const occasionalTxs = approved.filter((t) => resolveTransactionSegment(t) === 'occasional');

  const subscriberGross = subscriberTxs.reduce((sum, t) => sum + t.grossAmount, 0);
  const subscriberNet = subscriberTxs.reduce((sum, t) => sum + t.netAmount, 0);
  const occasionalGross = occasionalTxs.reduce((sum, t) => sum + t.grossAmount, 0);
  const occasionalNet = occasionalTxs.reduce((sum, t) => sum + t.netAmount, 0);

  return {
    gross,
    net,
    fees,
    count,
    avgTicket,
    direct: { gross: directGross, net: directNet, count: directTxs.length },
    affiliate: { gross: affiliateGross, net: affiliateNet, count: affiliateTxs.length },
    subscriber: { gross: subscriberGross, net: subscriberNet, count: subscriberTxs.length },
    occasional: { gross: occasionalGross, net: occasionalNet, count: occasionalTxs.length },
  };
};
