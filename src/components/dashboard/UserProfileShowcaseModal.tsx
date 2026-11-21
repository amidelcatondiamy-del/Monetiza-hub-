import React, { useState } from 'react';
import {
  X,
  User,
  ShoppingBag,
  Plus,
  Edit3,
  Check,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Star,
  Sparkles,
  Store,
  Phone,
  Mail,
  Instagram,
  Youtube,
  Globe,
  Camera,
  CheckCircle2,
  DollarSign,
  Tag,
  Clock,
  Layers,
  ArrowRight,
  Trophy,
  Award,
} from 'lucide-react';
import { useMonetization } from '../../context/MonetizationContext';
import { UserAccount, UserShowcaseItem } from '../../types/monetization';
import { formatCurrency } from '../../utils/formatters';

interface UserProfileShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckout?: (item: {
    type: 'product_sale';
    id: string;
    title: string;
    price: number;
    description: string;
  }) => void;
}

export const UserProfileShowcaseModal: React.FC<UserProfileShowcaseModalProps> = ({
  isOpen,
  onClose,
  onOpenCheckout,
}) => {
  const {
    currentUser,
    allUsers,
    switchUser,
    updateCurrentUserProfile,
    addShowcaseItemToUser,
    updateShowcaseItem,
    deleteShowcaseItem,
    registerNewUserAccount,
    selectedCurrency,
    badges,
    unlockedBadgesCount,
    setIsAchievementsModalOpen,
  } = useMonetization();

  // Active section inside the profile modal: 'showcase' | 'edit_profile' | 'switch_account'
  const [activeTab, setActiveTab] = useState<'showcase' | 'edit_profile' | 'switch_account'>('showcase');

  // Edit Profile Form State
  const [name, setName] = useState(currentUser.name);
  const [handle, setHandle] = useState(currentUser.handle);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [category, setCategory] = useState(currentUser.category);
  const [tagline, setTagline] = useState(currentUser.tagline || '');
  const [bio, setBio] = useState(currentUser.bio);
  const [instagram, setInstagram] = useState(currentUser.socials?.instagram || '');
  const [youtube, setYoutube] = useState(currentUser.socials?.youtube || '');
  const [website, setWebsite] = useState(currentUser.socials?.website || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [saveProfileSuccess, setSaveProfileSuccess] = useState(false);

  // Add Item to Showcase Form State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('97');
  const [itemType, setItemType] = useState<'product' | 'service' | 'consultancy' | 'mentorship'>('product');
  const [itemDelivery, setItemDelivery] = useState('Download Imediato em PDF + Planilhas');
  const [itemCoverImage, setItemCoverImage] = useState('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80');

  // New User Registration Form State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCategory, setNewUserCategory] = useState('Consultoria & Negócios');
  const [newUserBio, setNewUserBio] = useState('');

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      name,
      handle,
      email,
      phone,
      category,
      tagline,
      bio,
      avatarUrl,
      socials: {
        instagram,
        youtube,
        website,
      },
    });

    setSaveProfileSuccess(true);
    setTimeout(() => {
      setSaveProfileSuccess(false);
      setActiveTab('showcase');
    }, 1200);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !itemPrice) return;

    addShowcaseItemToUser(currentUser.id, {
      title: itemTitle.trim(),
      description: itemDescription.trim() || 'Item de alta qualidade para impulsionar seus resultados.',
      price: Math.max(1, parseFloat(itemPrice) || 50),
      type: itemType,
      coverImage: itemCoverImage,
      deliveryFormat: itemDelivery.trim() || 'Acesso digital imediato',
      isAvailable: true,
      rating: 5.0,
    });

    setIsAddItemOpen(false);
    setItemTitle('');
    setItemDescription('');
    setItemPrice('97');
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    registerNewUserAccount({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      bio: newUserBio.trim(),
      category: newUserCategory.trim(),
      role: 'creator',
    });

    setIsRegisterOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserBio('');
    setActiveTab('showcase');
  };

  const sampleCoverImages = [
    { label: 'E-book / Manual', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80' },
    { label: 'Mentoria / Reunião', url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80' },
    { label: 'Templates / Design', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80' },
    { label: 'Consultoria Estratégica', url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col relative text-slate-200">
        {/* Banner with Profile Avatar */}
        <div className="relative h-32 sm:h-44 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 shrink-0 overflow-hidden">
          {currentUser.bannerUrl && (
            <img
              src={currentUser.bannerUrl}
              alt="Banner de Capa"
              className="w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black text-slate-300 hover:text-white transition z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top user switcher ribbon */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Perfil Verificado</span>
            </span>
          </div>
        </div>

        {/* User Identity Header */}
        <div className="px-6 pt-0 pb-4 relative shrink-0 border-b border-slate-800/80 bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-4">
            <div className="flex items-end gap-4">
              <div className="relative group">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-slate-900 shadow-xl bg-slate-800"
                />
              </div>

              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {currentUser.name}
                  </h2>
                  <span className="text-xs text-indigo-400 font-mono font-bold">
                    @{currentUser.handle}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {currentUser.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xl line-clamp-1">
                  {currentUser.tagline || 'Criador oficial na plataforma MonetizaHub.'}
                </p>
              </div>
            </div>

            {/* Profile Action Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-end">
              <button
                type="button"
                onClick={() => setActiveTab('showcase')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'showcase'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Vitrine de Vendas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setName(currentUser.name);
                  setHandle(currentUser.handle);
                  setEmail(currentUser.email);
                  setPhone(currentUser.phone || '');
                  setCategory(currentUser.category);
                  setTagline(currentUser.tagline || '');
                  setBio(currentUser.bio);
                  setAvatarUrl(currentUser.avatarUrl);
                  setInstagram(currentUser.socials?.instagram || '');
                  setYoutube(currentUser.socials?.youtube || '');
                  setWebsite(currentUser.socials?.website || '');
                  setActiveTab('edit_profile');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'edit_profile'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Editar Perfil & Bio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('switch_account')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'switch_account'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Alternar Conta</span>
              </button>
            </div>
          </div>

          {/* Bio text snippet */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
            <span className="text-emerald-400 font-bold shrink-0">Bio:</span>
            <span>{currentUser.bio}</span>
          </div>

          {/* Creator Badges & Conquistas Strip */}
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-950 to-indigo-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 shrink-0 mr-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Badges do Perfil:</span>
              </span>
              {badges.filter((b) => b.unlocked).slice(0, 4).map((b) => (
                <span
                  key={b.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap bg-gradient-to-r ${b.gradient} text-white shadow-sm shrink-0`}
                  title={b.description}
                >
                  <Award className="w-3 h-3" />
                  <span>{b.title}</span>
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsAchievementsModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 transition cursor-pointer shrink-0 self-end sm:self-auto"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Ver Conquistas ({unlockedBadgesCount})</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: VITRINE DE VENDAS (SHOWCASE) */}
          {activeTab === 'showcase' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-400" />
                    <span>Vitrine de Itens & Serviços à Venda de {currentUser.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Itens digitais, mentorias e serviços cadastrados para venda com checkout instantâneo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Item / Serviço à Venda</span>
                </button>
              </div>

              {/* Showcase items list */}
              {currentUser.showcaseItems && currentUser.showcaseItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentUser.showcaseItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl transition flex flex-col justify-between group"
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={item.coverImage}
                          alt={item.title}
                          className="w-20 h-20 rounded-xl object-cover border border-slate-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {item.type === 'mentorship'
                                ? 'Mentoria 1:1'
                                : item.type === 'service'
                                ? 'Serviço'
                                : item.type === 'consultancy'
                                ? 'Consultoria'
                                : 'Infoproduto'}
                            </span>
                            <span className="text-[11px] text-amber-400 font-bold flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{item.rating || 5.0}</span>
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white mt-1 group-hover:text-emerald-400 transition truncate">
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Delivery format tag */}
                      {item.deliveryFormat && (
                        <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                          <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{item.deliveryFormat}</span>
                        </div>
                      )}

                      {/* Footer Row */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Preço de Venda</span>
                          <span className="text-base font-black text-emerald-400 font-mono">
                            {formatCurrency(item.price, selectedCurrency)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => deleteShowcaseItem(currentUser.id, item.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                            title="Excluir este item da vitrine"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenCheckout) {
                                onOpenCheckout({
                                  type: 'product_sale',
                                  id: item.id,
                                  title: item.title,
                                  price: item.price,
                                  description: item.description,
                                });
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <span>Comprar Item</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Nenhum item à venda cadastrado ainda</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Cadastre seu primeiro produto digital, consultoria, mentoria ou serviço para começar a receber pagamentos na sua vitrine.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddItemOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    + Criar Primeiro Item à Venda
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EDITAR PERFIL & BIOGRAFIA */}
          {activeTab === 'edit_profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-2xl mx-auto">
              {saveProfileSuccess && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Informações pessoais e biografia atualizadas com sucesso!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome de Usuário (@handle)
                  </label>
                  <input
                    type="text"
                    required
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail Principal
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone / WhatsApp de Contato
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+244 923 000 000 ou (11) 98888-8888"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria Profissional / Nicho
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Negócios & Tecnologia, Design, Marketing..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    URL da Foto de Perfil (Avatar)
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tagline / Frase de Impacto
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Ex: Estrategista digital e mentora de monetização online."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Biografia Pessoal & Profissional (Bio)
                  </label>
                  <span className="text-[10px] text-slate-500">{bio.length}/500</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte um pouco sobre sua trajetória, sua proposta de valor e como você ajuda seus clientes e seguidores..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Instagram (@)</label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="amidelcatondi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">YouTube</label>
                  <input
                    type="text"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="canal / user"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Website Oficial</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://meusite.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('showcase')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Dados & Biografia</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ALTERNAR ENTRE CONTAS & PERFIS (MULTI-USER) */}
          {activeTab === 'switch_account' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">Contas e Perfis Cadastrados</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Alterne entre perfis de criadores e clientes com 1 clique para testar a vitrine e biografias.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo Perfil</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {allUsers.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => switchUser(u.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{u.name}</span>
                            <span className="text-xs text-indigo-400 font-mono">@{u.handle}</span>
                            {u.id === 'usr-amidel' && (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                Criadora Oficial
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{u.email} · {u.category}</p>
                          <div className="text-[11px] text-emerald-400 mt-1">
                            Vitrine: {u.showcaseItems?.length || 0} itens à venda
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                            <span>Ativo Agora</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition"
                          >
                            Entrar neste Perfil
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal: Adicionar Item ou Serviço à Vitrine */}
        {isAddItemOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Plus className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">Adicionar Item ou Serviço à Vitrine</h3>
                    <p className="text-xs text-slate-400">Listar novo produto na vitrine de {currentUser.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Título do Item ou Serviço
                  </label>
                  <input
                    type="text"
                    required
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    placeholder="Ex: Sessão Estratégica 1:1 ou E-book Exclusivo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tipo de Oferta
                    </label>
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="product">Produto Digital / E-book</option>
                      <option value="service">Serviço Profissional</option>
                      <option value="mentorship">Mentoria Individual (1:1)</option>
                      <option value="consultancy">Consultoria Especializada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Preço de Venda (R$)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Descrição Detalhada do que o Cliente Recebe
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="Explique o que está incluído, benefícios e resultados esperados..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Formato de Entrega
                  </label>
                  <input
                    type="text"
                    required
                    value={itemDelivery}
                    onChange={(e) => setItemDelivery(e.target.value)}
                    placeholder="Ex: Download imediato em PDF ou Sessão 60min no Google Meet"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Cover selection presets */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5">
                    Escolha uma Imagem de Capa:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {sampleCoverImages.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setItemCoverImage(s.url)}
                        className={`rounded-xl overflow-hidden border p-0.5 transition cursor-pointer text-left ${
                          itemCoverImage === s.url
                            ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                            : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={s.url} alt={s.label} className="w-full h-12 object-cover rounded-lg" />
                        <span className="text-[9px] block text-center text-slate-300 mt-1 truncate px-1">
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddItemOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                  >
                    Publicar na Vitrine
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Cadastrar Novo Perfil */}
        {isRegisterOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <User className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">Cadastrar Novo Perfil</h3>
                    <p className="text-xs text-slate-400">Crie uma conta para listar itens e serviços</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNewUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Ex: Roberto Silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="roberto.silva@email.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Área de Atuação</label>
                  <input
                    type="text"
                    value={newUserCategory}
                    onChange={(e) => setNewUserCategory(e.target.value)}
                    placeholder="Ex: Consultoria, Educação, Finanças"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Biografia Inicial</label>
                  <textarea
                    rows={2}
                    value={newUserBio}
                    onChange={(e) => setNewUserBio(e.target.value)}
                    placeholder="Conte o que você oferece aos seus clientes..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                  >
                    Criar Perfil
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Perfil e vitrine sincronizados com o banco de dados do criador.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
