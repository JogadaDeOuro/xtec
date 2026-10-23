import { describe, expect, it } from 'vitest';
import { EMPTY_QUOTE, normalizeQuote, quoteItemTotal, quoteNumber, quoteTotals, validateQuote } from './custom-quote';

describe('Orçamento personalizado', () => {
  it('calcula quantidade em metros multiplicada pelo valor unitário', () => {
    expect(quoteItemTotal({ id: 'fio', descricao: 'Passagem de cabeamento', categoria: 'servico', unidade: 'm', quantidade: 250, valorUnitario: 232 })).toBe(58000);
  });
  it('aceita litros e quantidades fracionadas com centavos', () => {
    expect(quoteItemTotal({ id: 'litros', descricao: 'Produto', categoria: 'produto', unidade: 'L', quantidade: 2.5, valorUnitario: 10.25 })).toBe(25.63);
    expect(quoteNumber('2,5')).toBe(2.5);
    expect(quoteNumber('1.234,56')).toBe(1234.56);
  });
  it('soma entrega e mão de obra opcionais sem multiplicá-las por item', () => {
    const q = { ...EMPTY_QUOTE, itens: [{ id: 'quadro', descricao: 'Quadro', categoria: 'produto' as const, unidade: 'un', quantidade: 2, valorUnitario: 100 }], entrega: 30, maoDeObra: 50 };
    expect(quoteTotals(q)).toEqual({ subtotal: 200, total: 280 });
    expect(quoteTotals({ ...q, entrega: 0, maoDeObra: 0 }).total).toBe(200);
  });
  it('mantém itens, unidades, detalhes e custos após serialização', () => {
    const q = { ...EMPTY_QUOTE, titulo: 'Quadro de distribuição', detalhes: 'ART e normas ABNT', entrega: 20, maoDeObra: 80, itens: [{ id: '1', descricao: 'Cabo', categoria: 'produto' as const, unidade: 'm', quantidade: 250, valorUnitario: 2 }] };
    expect(normalizeQuote(JSON.parse(JSON.stringify(q)))).toEqual(q);
  });
  it('não permite orçamento sem itens ou com quantidade zero', () => {
    expect(validateQuote({ ...EMPTY_QUOTE, titulo: 'Serviço' })).not.toBeNull();
    expect(validateQuote({ ...EMPTY_QUOTE, titulo: 'Serviço', itens: [{ id: '1', descricao: 'Cabo', categoria: 'produto', unidade: 'm', quantidade: 0, valorUnitario: 2 }] })).not.toBeNull();
  });
});