export interface QuoteItem {
  id: string;
  descricao: string;
  categoria: 'produto' | 'servico';
  unidade: string;
  quantidade: number;
  valorUnitario: number;
}

export interface CustomQuote {
  titulo: string;
  detalhes: string;
  itens: QuoteItem[];
  entrega: number;
  maoDeObra: number;
  prazo: string;
  garantia: string;
  observacoes: string;
}

export const QUOTE_UNITS = ['un', 'm', 'm²', 'm³', 'L', 'kg', 'g', 'h', 'dia', 'serviço', 'kit', 'caixa', 'pacote'];
export const EMPTY_QUOTE: CustomQuote = {
  titulo: '', detalhes: '', itens: [], entrega: 0, maoDeObra: 0, prazo: '', garantia: '', observacoes: '',
};
export const quoteNumber = (raw: string) => {
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const quoteItemTotal = (item: QuoteItem) => money(item.quantidade * item.valorUnitario);
export function quoteTotals(quote: CustomQuote) {
  const subtotal = money(quote.itens.reduce((sum, item) => sum + quoteItemTotal(item), 0));
  return { subtotal, total: money(subtotal + quote.entrega + quote.maoDeObra) };
}
export function normalizeQuote(raw: unknown): CustomQuote {
  const q = (raw && typeof raw === 'object' ? raw : {}) as Partial<CustomQuote>;
  const text = (v: unknown) => typeof v === 'string' ? v : '';
  return {
    titulo: text(q.titulo), detalhes: text(q.detalhes), prazo: text(q.prazo),
    garantia: text(q.garantia), observacoes: text(q.observacoes),
    entrega: quoteNumber(String(q.entrega ?? 0)), maoDeObra: quoteNumber(String(q.maoDeObra ?? 0)),
    itens: Array.isArray(q.itens) ? q.itens.filter(i => i && typeof i === 'object').map((i, index) => ({
      id: text(i.id) || `item-${index}`, descricao: text(i.descricao),
      categoria: i.categoria === 'servico' ? 'servico' : 'produto', unidade: text(i.unidade) || 'un',
      quantidade: quoteNumber(String(i.quantidade ?? 0)), valorUnitario: quoteNumber(String(i.valorUnitario ?? 0)),
    })) : [],
  };
}
export function validateQuote(q: CustomQuote): string | null {
  if (!q.titulo.trim()) return 'Informe o título do orçamento.';
  if (!q.itens.length) return 'Adicione pelo menos um produto ou serviço.';
  if (q.itens.some(i => !i.descricao.trim() || !i.unidade.trim() || i.quantidade <= 0)) return 'Preencha descrição, unidade e quantidade de todos os itens.';
  if (quoteTotals(q).total <= 0) return 'Informe o valor do orçamento.';
  return null;
}