import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeDollarSign, Clock, Grip, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/mock-data';

interface MobileProposalSummaryProps {
  valorFinal: number;
  descontoValor: number;
  valorSistema: number;
  economiaMensal: number;
  paybackAnos: number;
  investimento?: boolean;
}

export function MobileProposalSummary({
  valorFinal,
  descontoValor,
  valorSistema,
  economiaMensal,
  paybackAnos,
  investimento = false,
}: MobileProposalSummaryProps) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        ref={boundsRef}
        className="pointer-events-none fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] top-16 z-40 md:hidden"
        aria-hidden="true"
      >
        <motion.div
          drag
          dragConstraints={boundsRef}
          dragElastic={0.08}
          dragMomentum={false}
          onDragStart={() => { draggedRef.current = true; }}
          onDragEnd={() => window.setTimeout(() => { draggedRef.current = false; }, 0)}
          className="pointer-events-auto absolute bottom-0 right-0 touch-none"
        >
          <Button
            type="button"
            size="icon"
            className="h-14 w-14 rounded-full border-2 border-primary-foreground/30 shadow-lg"
            aria-label="Abrir resumo da proposta"
            title="Resumo da proposta"
            onClick={() => {
              if (!draggedRef.current) setOpen(true);
            }}
          >
            <span className="relative flex h-full w-full items-center justify-center">
              <BadgeDollarSign className="h-6 w-6" />
              <Grip className="absolute -right-1 -top-1 h-3.5 w-3.5 opacity-70" />
            </span>
          </Button>
        </motion.div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[78dvh] overflow-y-auto rounded-t-xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 md:hidden"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/25" />
          <SheetHeader className="mb-5 text-left">
            <SheetTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Resumo da Proposta
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-3">
            <div className="rounded-lg border bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Valor Final</p>
              <p className="mt-1 text-2xl font-bold text-primary">{formatCurrency(valorFinal)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Valor do Sistema</p>
                <p className="mt-1 text-sm font-semibold">{formatCurrency(valorSistema)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Desconto</p>
                <p className="mt-1 text-sm font-semibold text-success">
                  {descontoValor > 0 ? `-${formatCurrency(descontoValor)}` : formatCurrency(0)}
                </p>
              </div>
              <div className="rounded-lg border bg-success/10 p-3">
                <p className="text-xs text-muted-foreground">{investimento ? 'Ganho/mês' : 'Economia/mês'}</p>
                <p className="mt-1 text-sm font-semibold">{formatCurrency(economiaMensal)}</p>
              </div>
              <div className="rounded-lg border bg-info/10 p-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Payback
                </p>
                <p className="mt-1 text-sm font-semibold">{paybackAnos > 0 ? `${paybackAnos} anos` : '—'}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}