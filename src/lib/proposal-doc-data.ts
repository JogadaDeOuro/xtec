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
  const cfg = p.pagamentoConfig ?? {};
  const condicao = cfg.condicao || mapCondicaoFromLabel(p.condicaoPagamento);
  const entradaValor = cfg.entradaValor ?? 0;
  const numParcelas = cfg.numParcelas ?? 0;
  const saldoAposEntrada = Math.max(0, p.valorSistema - entradaValor);
  const valorParcela = numParcelas > 0
    ? (condicao === 'parcelado' ? p.valorSistema : saldoAposEntrada) / numParcelas
    : 0;
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
    tipo: p.tipo,
    manutencao: p.tipo === 'manutencao' ? {
      areaM2: p.areaM2,
      valorPorModulo: p.valorPorModulo,
      valorPorM2: p.areaM2 > 0 ? +(p.valorSistema / p.areaM2).toFixed(2) : 0,
      itens: p.manutencaoItens ?? [],
    } : undefined,
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
