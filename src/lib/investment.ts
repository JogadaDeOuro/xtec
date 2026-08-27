/**
 * Usina de investimento: a energia gerada é vendida a terceiros com deságio
 * sobre a tarifa da concessionária. O que para o consumidor final seria
 * "economia", aqui vira "receita/ganho" do investidor.
 */

export type Finalidade = 'consumo' | 'investimento';

export const DESAGIO_MIN = 15;
export const DESAGIO_MAX = 35;
export const DESAGIO_PADRAO = 25;

/** Reajuste anual da tarifa considerado nas projeções. */
export const REAJUSTE_ANUAL = 0.05;

/** Receita mensal do investidor = geração × tarifa × (1 − deságio). */
export function receitaMensal(producaoKwhMes: number, tarifaKwh: number, desagioPct: number): number {
  const fator = Math.max(0, 1 - (desagioPct || 0) / 100);
  return Math.round(producaoKwhMes * tarifaKwh * fator);
}

/** Valor cheio (sem deságio) que a energia representaria na conta de luz. */
export function valorCheioMensal(producaoKwhMes: number, tarifaKwh: number): number {
  return Math.round(producaoKwhMes * tarifaKwh);
}

export interface GanhoAnual {
  ano: number;
  receita: number;
  acumulado: number;
  roiPct: number;
}

/** Projeção de ganhos anuais com reajuste tarifário. */
export function projecaoGanhos(receitaAno: number, investimento: number, anos = 20): GanhoAnual[] {
  const out: GanhoAnual[] = [];
  let acumulado = 0;
  for (let ano = 1; ano <= anos; ano++) {
    const receita = Math.round(receitaAno * Math.pow(1 + REAJUSTE_ANUAL, ano - 1));
    acumulado += receita;
    out.push({
      ano,
      receita,
      acumulado,
      roiPct: investimento > 0 ? +(((acumulado - investimento) / investimento) * 100).toFixed(1) : 0,
    });
  }
  return out;
}

/** ROI total (%) no horizonte informado. */
export function roiTotal(acumulado: number, investimento: number): number {
  if (investimento <= 0) return 0;
  return +(((acumulado - investimento) / investimento) * 100).toFixed(1);
}

/** Rentabilidade média anual (% a.a.) simples sobre o capital investido. */
export function rentabilidadeAnual(receitaAno: number, investimento: number): number {
  if (investimento <= 0) return 0;
  return +((receitaAno / investimento) * 100).toFixed(1);
}
