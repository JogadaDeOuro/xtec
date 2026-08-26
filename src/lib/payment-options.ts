export interface PaymentMilestone {
  label: string;
  pct: number;
}

export interface PaymentConditionOption {
  value: string;
  label: string;
  shortLabel: string;
  milestones?: PaymentMilestone[];
}

export const PAYMENT_CONDITIONS: PaymentConditionOption[] = [
  { value: 'avista', label: 'À vista antecipado', shortLabel: 'À vista' },
  {
    value: '50-20-20-10',
    label: '50% / 20% / 20% / 10%',
    shortLabel: '50%/20%/20%/10%',
    milestones: [
      { label: 'Assinatura do contrato', pct: 50 },
      { label: 'Projeto aprovado pela concessionária', pct: 20 },
      { label: 'Chegada dos equipamentos', pct: 20 },
      { label: 'Entrega da obra', pct: 10 },
    ],
  },
  {
    value: '40-20-20-20',
    label: '40% / 20% / 20% / 20%',
    shortLabel: '40%/20%/20%/20%',
    milestones: [
      { label: 'Aprovação da proposta', pct: 40 },
      { label: 'Chegada do material', pct: 20 },
      { label: 'Instalação', pct: 20 },
      { label: 'Ativação do sistema', pct: 20 },
    ],
  },
  {
    value: '40-40-20',
    label: '40% + 40% + 20%',
    shortLabel: '40%+40%+20%',
    milestones: [
      { label: 'Na aprovação', pct: 40 },
      { label: 'Na instalação', pct: 40 },
      { label: 'Na ativação', pct: 20 },
    ],
  },
  { value: 'parcelado', label: 'Parcelado 100% sem entrada (sem juros)', shortLabel: 'Parcelado sem juros' },
  { value: 'entrada-saldo', label: 'Entrada + saldo na entrega', shortLabel: 'Entrada + saldo' },
  { value: 'entrada-parcelas', label: 'Entrada + parcelamento', shortLabel: 'Entrada + parcelas' },
  { value: 'personalizada', label: 'Condição personalizada', shortLabel: 'Personalizada' },
];

export const getMilestones = (value: string): PaymentMilestone[] | undefined =>
  PAYMENT_CONDITIONS.find(c => c.value === value)?.milestones;

export const getCondicaoLabel = (value: string): string =>
  PAYMENT_CONDITIONS.find(c => c.value === value)?.shortLabel ?? 'A definir';

export const mapCondicaoFromLabel = (label: string): string => {
  if (!label) return '';
  const exact = PAYMENT_CONDITIONS.find(c => c.shortLabel === label || c.label === label);
  if (exact) return exact.value;
  if (label.includes('50%')) return '50-20-20-10';
  if (label.includes('vista')) return 'avista';
  if (label.includes('40% + 40% + 20%') || label.includes('40%+40%+20%')) return '40-40-20';
  if (label.includes('40%')) return '40-20-20-20';
  if (label.toLowerCase().includes('sem juros')) return 'parcelado';
  if (label.includes('parcel')) return 'entrada-parcelas';
  if (label.includes('saldo')) return 'entrada-saldo';
  return '';
};

/** Garantia estendida: serviço adicional de 8% sobre o valor total do contrato. */
export const EXTENDED_WARRANTY_RATE = 0.08;
export const EXTENDED_WARRANTY_YEARS = 15;

export const EXTENDED_WARRANTY_DESCRIPTION =
  'Cobertura estendida por mais 15 anos: proteção de disjuntores, segurança elétrica, limpeza dos módulos, apoio ao funcionamento e manutenções preventivas.';

export const STANDARD_WARRANTY_DESCRIPTION =
  'Garantia padrão de instalação por 1 ano: proteção de disjuntores, segurança elétrica e limpeza dos módulos.';

export const calcExtendedWarranty = (valorFinal: number) =>
  Math.round(valorFinal * EXTENDED_WARRANTY_RATE);

/* ---------------------------------------------------------------------------
 * Condições alternativas (o cliente escolhe uma no link de aceite)
 * Cada alternativa é serializada como JSON dentro de proposals.condicoes_alternativas.
 * ------------------------------------------------------------------------- */

export interface AltPaymentCondition {
  value: string;
  /** valor total desta opção (ex.: desconto no à vista). Se ausente usa o valor final da proposta. */
  valorTotal?: number;
  entradaValor?: number;
  numParcelas?: number;
  etapas?: { descricao: string; valor: number }[];
}

export const serializeAlt = (a: AltPaymentCondition): string => JSON.stringify(a);

export const parseAlt = (raw: string): AltPaymentCondition => {
  if (!raw) return { value: '' };
  const s = raw.trim();
  if (s.startsWith('{')) {
    try {
      const o = JSON.parse(s) as AltPaymentCondition;
      if (o && typeof o.value === 'string') return o;
    } catch { /* fallback abaixo */ }
  }
  return { value: mapCondicaoFromLabel(s) };
};

export interface PaymentRow { label: string; value: number; strong?: boolean }

/** Linhas de pagamento de uma condição, já calculadas. */
export const buildPaymentRows = (
  cond: string,
  o: {
    valorTotal: number;
    entradaValor?: number;
    numParcelas?: number;
    etapas?: { descricao: string; valor: number }[];
  },
): PaymentRow[] => {
  const total = o.valorTotal || 0;
  const entrada = o.entradaValor || 0;
  const parcelas = o.numParcelas || 0;
  const rows: PaymentRow[] = [];

  if (cond === 'avista') {
    rows.push({ label: 'À vista antecipado', value: total, strong: true });
    return rows;
  }
  const ms = getMilestones(cond);
  if (ms) {
    ms.forEach(({ label, pct }) => rows.push({ label: `${label} (${pct}%)`, value: (total * pct) / 100 }));
    return rows;
  }
  if (cond === 'parcelado') {
    rows.push({ label: 'Sem entrada · 100% parcelado', value: total });
    if (parcelas > 0) rows.push({ label: `${parcelas}x de (sem juros)`, value: total / parcelas, strong: true });
    return rows;
  }
  if (cond === 'entrada-saldo') {
    rows.push({ label: 'Entrada', value: entrada });
    rows.push({ label: 'Saldo na entrega', value: Math.max(0, total - entrada), strong: true });
    return rows;
  }
  if (cond === 'entrada-parcelas') {
    rows.push({ label: 'Entrada', value: entrada });
    if (parcelas > 0) rows.push({ label: `${parcelas}x de`, value: Math.max(0, total - entrada) / parcelas, strong: true });
    return rows;
  }
  if (cond === 'personalizada') {
    (o.etapas ?? []).filter(e => e.descricao).forEach(e => rows.push({ label: e.descricao, value: e.valor }));
    return rows;
  }
  return rows;
};

export const altRows = (alt: AltPaymentCondition, fallbackTotal: number): PaymentRow[] =>
  buildPaymentRows(alt.value, {
    valorTotal: alt.valorTotal && alt.valorTotal > 0 ? alt.valorTotal : fallbackTotal,
    entradaValor: alt.entradaValor,
    numParcelas: alt.numParcelas,
    etapas: alt.etapas,
  });

export const altTotal = (alt: AltPaymentCondition, fallbackTotal: number): number =>
  alt.valorTotal && alt.valorTotal > 0 ? alt.valorTotal : fallbackTotal;
