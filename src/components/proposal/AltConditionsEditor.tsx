import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/mock-data';
import {
  PAYMENT_CONDITIONS, altRows, altTotal, type AltPaymentCondition,
} from '@/lib/payment-options';

interface Props {
  condicaoPrincipal: string;
  valorFinal: number;
  value: AltPaymentCondition[];
  onChange: (next: AltPaymentCondition[]) => void;
}

export function AltConditionsEditor({ condicaoPrincipal, valorFinal, value, onChange }: Props) {
  const toggle = (cond: string, checked: boolean) => {
    if (checked) onChange([...value, { value: cond, valorTotal: valorFinal, numParcelas: 12, entradaValor: 0, etapas: [] }]);
    else onChange(value.filter(a => a.value !== cond));
  };

  const patch = (cond: string, data: Partial<AltPaymentCondition>) =>
    onChange(value.map(a => (a.value === cond ? { ...a, ...data } : a)));

  return (
    <div className="rounded-lg border border-border p-3">
      <Label className="text-xs">Outras condições que o cliente pode escolher (opcional)</Label>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Marque outras condições e preencha os valores de cada uma. O cliente escolhe uma no link de aceite.
      </p>

      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {PAYMENT_CONDITIONS.filter(o => o.value !== condicaoPrincipal).map(opt => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-primary"
              checked={value.some(a => a.value === opt.value)}
              onChange={e => toggle(opt.value, e.target.checked)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      {value.length > 0 && (
        <div className="mt-3 space-y-3">
          {value.map(alt => {
            const label = PAYMENT_CONDITIONS.find(c => c.value === alt.value)?.label ?? alt.value;
            const rows = altRows(alt, valorFinal);
            const total = altTotal(alt, valorFinal);
            return (
              <div key={alt.value} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-semibold">{label}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Valor total desta opção (R$)</Label>
                    <Input
                      type="number"
                      className="mt-1 h-8"
                      value={alt.valorTotal ?? ''}
                      onChange={e => patch(alt.value, { valorTotal: +e.target.value || 0 })}
                      placeholder={String(valorFinal)}
                    />
                  </div>

                  {(alt.value === 'entrada-saldo' || alt.value === 'entrada-parcelas') && (
                    <div>
                      <Label className="text-[11px]">Entrada (R$)</Label>
                      <Input
                        type="number"
                        className="mt-1 h-8"
                        value={alt.entradaValor ?? ''}
                        onChange={e => patch(alt.value, { entradaValor: +e.target.value || 0 })}
                      />
                    </div>
                  )}

                  {(alt.value === 'parcelado' || alt.value === 'entrada-parcelas') && (
                    <div>
                      <Label className="text-[11px]">Nº de parcelas</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="mt-1 h-8"
                        value={alt.numParcelas || ''}
                        onChange={e => patch(alt.value, { numParcelas: Math.min(120, +e.target.value.replace(/\D/g, '') || 0) })}
                        placeholder="Ex: 12"
                      />
                    </div>
                  )}
                </div>

                {alt.value === 'personalizada' && (
                  <div className="space-y-2">
                    {(alt.etapas ?? []).map((et, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          className="h-8 flex-1"
                          placeholder="Descrição da etapa"
                          value={et.descricao}
                          onChange={e => patch(alt.value, {
                            etapas: (alt.etapas ?? []).map((x, ix) => ix === i ? { ...x, descricao: e.target.value } : x),
                          })}
                        />
                        <Input
                          type="number"
                          className="h-8 w-32"
                          placeholder="R$"
                          value={et.valor || ''}
                          onChange={e => patch(alt.value, {
                            etapas: (alt.etapas ?? []).map((x, ix) => ix === i ? { ...x, valor: +e.target.value || 0 } : x),
                          })}
                        />
                        <Button
                          type="button" variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => patch(alt.value, { etapas: (alt.etapas ?? []).filter((_, ix) => ix !== i) })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs"
                      onClick={() => patch(alt.value, { etapas: [...(alt.etapas ?? []), { descricao: '', valor: 0 }] })}
                    >
                      <Plus className="h-3 w-3" /> Adicionar etapa
                    </Button>
                  </div>
                )}

                {rows.length > 0 && (
                  <div className="space-y-1 border-t border-border pt-2">
                    {rows.map((r, i) => (
                      <div key={i} className={`flex justify-between text-[11px] ${r.strong ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                        <span>{r.label}</span>
                        <span>{formatCurrency(r.value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[11px] font-medium">
                      <span>Total da opção</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
