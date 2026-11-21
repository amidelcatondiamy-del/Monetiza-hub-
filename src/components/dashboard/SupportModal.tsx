import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  MessageSquare,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  CreditCard,
  QrCode,
  FileText,
  LifeBuoy,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  Landmark,
  Server,
} from 'lucide-react';
import { AngolaPspStatus, fetchAngolaPspStatus } from '../../services/angolaPspClient';
import { PspConfigurationWizard } from './PspConfigurationWizard';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ANGOLA_PSP_PORTALS = [
  {
    id: 'appypay',
    name: 'AppyPay Angola',
    badge: 'OAuth2 + GPO',
    summary: 'Agregador angolano com API REST para cobranças Multicaixa Express (GPO) e gestão comercial.',
    steps: [
      'Solicite proposta comercial e acesso Sandbox via portal ou comercial@appy.co.ao.',
      'Envie os documentos KYC da empresa (NIF, Registo Comercial/Alvará e IBAN em AOA).',
      'Após aprovação, aceda à área de API/Aplicações para copiar Client ID, Client Secret e Merchant ID.',
    ],
    links: [
      { label: 'Portal AppyPay', url: 'https://www.appy.co.ao' },
      { label: 'E-mail Comercial', url: 'mailto:comercial@appy.co.ao' },
    ],
  },
  {
    id: 'proxypay',
    name: 'ProxyPay Angola',
    badge: 'API OPG / RPS',
    summary: 'Gateway com API OPG (pagamento por telemóvel Multicaixa Express) e RPS (referências).',
    steps: [
      'Cadastre a sua conta de comerciante em proxypay.co.ao com conta bancária comercial em AOA.',
      'Solicite a ativação do módulo OPG (Multicaixa Express) junto ao suporte e banco parceiro.',
      'No Backoffice ProxyPay em API / Chaves, obtenha o Entity/Merchant ID e a API Key.',
    ],
    links: [
      { label: 'Portal ProxyPay', url: 'https://proxypay.co.ao' },
      { label: 'Docs OPG / API', url: 'https://developer.proxypay.co.ao' },
    ],
  },
  {
    id: 'emis_gpo',
    name: 'EMIS GPO (Via Banco Comercial)',
    badge: 'Direto EMIS',
    summary: 'Adesão direta ao Gateway de Pagamentos Online (GPO) através do seu banco em Angola.',
    steps: [
      'Fale com o gestor de conta do seu banco (BAI, BFA, BIC, Atlântico, Standard Bank, BNI) e peça adesão ao GPO.',
      'Assine o contrato de apadrinhamento bancário e conclua a certificação técnica com a EMIS.',
      'Receba as credenciais do terminal virtual e aceda ao Portal do Comerciante GPO.',
    ],
    links: [
      { label: 'Portal Comerciante GPO', url: 'https://pagamentonline.emis.co.ao' },
      { label: 'Info Oficial EMIS / MCX', url: 'https://www.multicaixa.ao' },
    ],
  },
];

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'api_keys' | 'ticket' | 'status'>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [pspStatus, setPspStatus] = useState<AngolaPspStatus | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Ticket form state
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('financeiro');
  const [message, setMessage] = useState('');
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [ticketNumber, setTicketNumber] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetchAngolaPspStatus().then((status) => {
      if (status) setPspStatus(status);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Como funciona o saque para o Cartão Visa (Visa Direct)?',
      a: 'O saque para cartão Visa é realizado através da rede Visa Direct. Ao solicitar o resgate do seu saldo disponível, os fundos são creditados diretamente na fatura do cartão ou no saldo do cartão de débito Visa em minutos, sem taxa de saque.',
      category: 'saques',
    },
    {
      q: 'Quais são as taxas de processamento da plataforma?',
      a: 'As taxas são transparentes: 1,9% para transações via Pix e 4,9% + R$ 0,50 para transações com Cartão de Crédito. Não cobramos mensalidade fixa nem tarifas ocultas para saque de saldos.',
      category: 'financeiro',
    },
    {
      q: 'Qual é o prazo de liberação do saldo para saque?',
      a: 'Vendas via Pix ficam disponíveis para saque imediato em até 1 hora. Vendas via Cartão de Crédito possuem antecipação opcional ou liquidação no ciclo D+14/D+30 com retenção temporária de 30% como margem de segurança.',
      category: 'saques',
    },
    {
      q: 'Como cadastrar um novo produto digital ou e-book?',
      a: 'Acesse a aba "Produtos Digitais" no estúdio, clique em "Novo Produto", informe o título, preço promocional, descrição e o link de acesso ou download. O link de checkout é gerado na hora e pode ser compartilhado com seus seguidores.',
      category: 'produtos',
    },
    {
      q: 'Como obter as chaves API do Multicaixa Express (AppyPay, ProxyPay ou EMIS)?',
      a: 'Abra a aba "Chaves API (Angola)" neste modal ou o Assistente de Configuração PSP no Painel Financeiro. Lá estão os links diretos para solicitar credenciais comerciais (Client ID, Client Secret, API Key e Merchant ID) junto aos portais oficiais.',
      category: 'api',
    },
    {
      q: 'Como funciona a Meta de Monetização Comunitária?',
      a: 'A barra de progresso da comunidade soma todos os apoios e gorjetas Pix recebidos na sua vitrine pública. Você pode definir a recompensa (ex: uma live exclusiva ou conteúdo bônus) que será liberada para todos assim que a meta de 100% for batida.',
      category: 'metas',
    },
  ];

  const filteredFaqs = faqs.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setTicketStatus('sending');
    setTimeout(() => {
      setTicketNumber(`TKT-${Math.floor(100000 + Math.random() * 900000)}`);
      setTicketStatus('sent');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl relative text-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Central de Ajuda & Suporte 24/7
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dúvidas sobre saques Visa, repasses, taxas e suporte prioritário.
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

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'faq'
                ? 'border-cyan-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ</span>
          </button>
          <button
            onClick={() => setActiveTab('api_keys')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'api_keys'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Como Obter Chaves API</span>
          </button>
          <button
            onClick={() => setActiveTab('ticket')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'ticket'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Abrir Chamado</span>
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'status'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Status</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por saque Visa, taxas, prazos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              {/* Accordion list */}
              <div className="space-y-2">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-200 flex items-center justify-between hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-3.5 text-xs text-slate-400 border-t border-slate-800/60 pt-2.5 leading-relaxed bg-slate-950/60">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'api_keys' && (
            <div className="space-y-4">
              {/* Server Status & Wizard Shortcut */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Server
                      className={`w-3.5 h-3.5 ${
                        pspStatus?.configured ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    />
                    <span>
                      {pspStatus?.configured
                        ? `Servidor Conectado (${pspStatus.provider.toUpperCase()})`
                        : 'Como Obter Credenciais PSP Oficiais (Angola)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Siga os passos abaixo no portal do seu provedor para obter Client ID, Client Secret e Merchant ID e configurar nas variáveis do servidor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Abrir Assistente .env
                </button>
              </div>

              {/* Official Provider Cards */}
              <div className="space-y-3">
                {ANGOLA_PSP_PORTALS.map((portal) => (
                  <div
                    key={portal.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-white">{portal.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300">
                        {portal.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">{portal.summary}</p>

                    <ol className="space-y-1.5 text-[11px] text-slate-300">
                      {portal.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {portal.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target={link.url.startsWith('http') ? '_blank' : undefined}
                          rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-cyan-300 transition whitespace-nowrap shrink-0"
                        >
                          <span>{link.label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Webhook Callback URL Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/25 space-y-2">
                {(() => {
                  const origin =
                    typeof window !== 'undefined' ? window.location.origin : '';
                  const isDevHost =
                    typeof window !== 'undefined' &&
                    window.location.hostname.startsWith('ais-dev-');
                  const recommendedWebhookUrl = origin
                    ? `${
                        isDevHost
                          ? origin.replace('://ais-dev-', '://ais-pre-')
                          : origin
                      }/api/webhooks/angola-psp`
                    : '/api/webhooks/angola-psp';

                  return (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-emerald-400">
                          URL Pública de Webhook para Informar ao PSP
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(recommendedWebhookUrl);
                            setCopiedWebhook(true);
                            window.setTimeout(() => setCopiedWebhook(false), 1800);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-emerald-300 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {copiedWebhook ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedWebhook ? 'Copiado' : 'Copiar URL'}</span>
                        </button>
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 break-all">
                        {recommendedWebhookUrl}
                      </div>
                      {isDevHost && (
                        <p className="text-[10px] text-amber-300 leading-relaxed">
                          Nota: o endereço <code className="font-mono">ais-dev-...</code> é privado da pré-visualização. Após publicar/partilhar o app, os PSPs externos (AppyPay/ProxyPay/EMIS) devem enviar notificações POST para o URL público (<code className="font-mono">ais-pre-...</code> ou domínio próprio).
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'ticket' && (
            <div>
              {ticketStatus === 'sent' ? (
                <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Chamado Aberto com Sucesso!</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Protocolo: <strong className="text-emerald-400 font-mono">{ticketNumber}</strong>
                    </p>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
                      Nossa equipe financeira responde em média em menos de 15 minutos. Um e-mail de confirmação foi encaminhado.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTicketStatus('idle');
                      setSubject('');
                      setMessage('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                  >
                    Abrir Outro Chamado
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendTicket} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Departamento
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="financeiro">Financeiro / Saques Visa & Pix</option>
                        <option value="produtos">Gestão de Produtos & Paywall</option>
                        <option value="assinaturas">Clube de Assinantes VIP</option>
                        <option value="tecnico">Dúvidas Técnicas da Plataforma</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Assunto
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Dúvida sobre repasse no cartão Visa"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mensagem Detalhada
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Descreva sua solicitação com o máximo de detalhes..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ticketStatus === 'sending'}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {ticketStatus === 'sending' ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Enviando Chamado...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Mensagem ao Suporte</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Gateway Visa Direct</div>
                    <div className="text-[10px] text-slate-400">Processamento de saques e pagamentos Visa</div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>100% Operacional</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Rede Pix Banco Central</div>
                    <div className="text-[10px] text-slate-400">Liquidamento instantâneo via chave Pix</div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>100% Operacional</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Servidor de Entrega de Infoprodutos</div>
                    <div className="text-[10px] text-slate-400">Liberação de downloads e PDFs aos compradores</div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>100% Operacional</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <PspConfigurationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onStatusRefreshed={(status) => setPspStatus(status)}
      />
    </div>
  );
};
