import { mapCondicaoFromLabel } from '@/lib/payment-options';
import type { ProposalRecord } from '@/lib/proposals';
import type { EquipmentItem } from '@/lib/proposal-settings';
import type { ProposalDocData } from '@/components/proposal/ProposalDocument';

/** Economia/ganho acumulado em 20 anos com reajuste tarifário de 5% a.a. */
export function economiaTotal20(economiaAnual: number): number {
  let acc = 0;
  for (let ano = 1; ano <= 20; ano++) acc += economiaAnual * Math.pow(1.05, ano - 1);
  return Math.round(acc);
}

/**
 * Monta os dados do documento a partir do registro oficial da proposta.
 * Fonte única de verdade — usada pelo preview, pela rota de impressão e pelo PDF.
 */
export function buildProposalDocData(
  p: ProposalRecord,
  equipamentos: EquipmentItem[] = [],
): ProposalDocData {
  return {
    numero: p.numero,
    data: new Date(),
    consultor: p.consultor ?? '',
    clientName: p.clientName,
    systemType: p.systemType,
    numModulos: p.numModulos,
    potenciaModuloW: p.potenciaModuloW ?? 650,
    potenciaKwp: p.potenciaKwp,
    producaoMensal: p.producaoEstimada,
    consumoMedio: p.consumoMedio ?? 0,
    valorBruto: p.valorSistema + p.desconto,
    valorFinal: p.valorSistema,
    desconto: p.desconto,
    tarifaKwh: p.tarifaKwh,
    economiaMensal: p.economiaMensal,
    economiaAnual: p.economiaAnual,
    paybackAnos: p.paybackAnos,
    economiaTotal: economiaTotal20(p.economiaAnual),
    finalidade: p.finalidade,
    desagioPct: p.desagioPct,
    equipamentos,
    payment: {
      condicao: mapCondicaoFromLabel(p.condicaoPagamento),
      alternativas: p.condicoesAlternativas ?? [],
      entradaValor: 0,
      numParcelas: 0,
      valorParcela: 0,
      saldoAposEntrada: 0,
      etapasPersonalizadas: [],
      garantiaEstendida: p.garantiaEstendida,
      garantiaValor: p.garantiaEstendidaValor,
    },
  };
}
