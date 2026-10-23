import { quoteItemTotal, quoteMoney, quoteTotals, type CustomQuote } from '@/lib/custom-quote';
import { formatCurrency } from '@/lib/mock-data';

export function CustomQuoteSummary({ quote }: { quote: CustomQuote }) {
  const totals = quoteTotals(quote);
  return <section className="space-y-4">
    {quote.detalhes && <p className="whitespace-pre-wrap text-sm">{quote.detalhes}</p>}
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="border-b text-left text-muted-foreground"><tr><th className="p-2">Descrição</th><th className="p-2">Qtd./un.</th><th className="p-2 text-right">Unitário</th><th className="p-2 text-right">Total</th></tr></thead>
        <tbody>{quote.itens.map(i => <tr key={i.id} className="border-b"><td className="p-2 break-words">{i.descricao}</td><td className="p-2">{i.quantidade.toLocaleString('pt-BR')} {i.unidade}</td><td className="p-2 text-right">{quoteMoney(i.valorUnitario)}</td><td className="p-2 text-right">{quoteMoney(quoteItemTotal(i))}</td></tr>)}</tbody>
      </table>
    </div>
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt>Subtotal dos itens</dt><dd>{quoteMoney(totals.subtotal)}</dd></div>
      {quote.entrega > 0 && <div className="flex justify-between"><dt>Taxa de entrega</dt><dd>{formatCurrency(quote.entrega)}</dd></div>}
      {quote.maoDeObra > 0 && <div className="flex justify-between"><dt>Mão de obra adicional</dt><dd>{formatCurrency(quote.maoDeObra)}</dd></div>}
      <div className="flex justify-between border-t pt-2 font-semibold"><dt>Total do orçamento</dt><dd>{formatCurrency(totals.total)}</dd></div>
    </dl>
    {[['Prazo de entrega / execução', quote.prazo], ['Garantia', quote.garantia], ['Observações', quote.observacoes]].filter(([, v]) => v).map(([title, value]) => <div key={title}><h3 className="text-sm font-semibold">{title}</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{value}</p></div>)}
  </section>;
}