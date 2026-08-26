/**
 * Camada única de cálculo solar. Nenhum componente visual deve duplicar fórmulas.
 */
import type { AssumptionsConfig } from '@/lib/proposal-config';

export interface SizingInput {
  numModulos: number;
  potenciaModuloW: number;
}

/** Potência instalada (kWp) = módulos × Wp ÷ 1000. */
export function potenciaInstalada({ numModulos, potenciaModuloW }: SizingInput): number {
  return +((numModulos * potenciaModuloW) / 1000).toFixed(2);
}

/** Sugere a combinação de módulos mais próxima da potência desejada (quantidade par). */
export function sugerirModulos(potenciaDesejadaKwp: number, potenciaModuloW: number): SizingInput {
  if (potenciaDesejadaKwp <= 0 || potenciaModuloW <= 0) {
    return { numModulos: 0, potenciaModuloW };
  }
  const bruto = Math.round((potenciaDesejadaKwp * 1000) / potenciaModuloW);
  const par = bruto % 2 === 0 ? bruto : bruto + 1;
  return { numModulos: Math.max(2, par), potenciaModuloW };
}

/** Geração mensal estimada em kWh. */
export function geracaoMensal(kwp: number, a: AssumptionsConfig): number {
  const bruto = kwp * a.produtividadeKwhKwpMes;
  const comSeguranca = bruto * (1 - a.margemSegurancaPct / 100);
  return Math.round(comSeguranca);
}

export function geracaoAnual(kwp: number, a: AssumptionsConfig): number {
  return geracaoMensal(kwp, a) * 12;
}

/** Área estimada necessária em m². */
export function areaEstimada(numModulos: number, a: AssumptionsConfig): number {
  return Math.round(numModulos * a.areaPorModuloM2);
}

/** Economia mensal bruta (R$). */
export function economiaMensal(geracaoKwhMes: number, a: AssumptionsConfig): number {
  const compensavel = geracaoKwhMes * (a.consumoSimultaneoPct / 100);
  return Math.max(0, Math.round(compensavel * a.tarifaKwh - a.custoDisponibilidadeMensal));
}

export function economiaAnual(geracaoKwhMes: number, a: AssumptionsConfig): number {
  return economiaMensal(geracaoKwhMes, a) * 12 - a.custoManutencaoAnual;
}

/** Payback simples estimado, em anos com uma casa decimal. */
export function paybackSimples(valorFinal: number, economiaAno: number): number {
  if (economiaAno <= 0) return 0;
  return +(valorFinal / economiaAno).toFixed(1);
}

/** Percentual estimado de compensação do consumo. */
export function percentualCompensacao(geracaoKwhMes: number, consumoKwhMes: number): number {
  if (consumoKwhMes <= 0) return 0;
  return Math.min(999, Math.round((geracaoKwhMes / consumoKwhMes) * 100));
}

/** Redução estimada de CO₂ (kg/ano). */
export function reducaoCo2Anual(geracaoKwhAno: number, a: AssumptionsConfig): number {
  return Math.round(geracaoKwhAno * a.fatorCo2KgPorKwh);
}

/** Equivalência em árvores plantadas (referência: 22 kg CO₂/ano por árvore). */
export function arvoresEquivalentes(co2KgAno: number): number {
  return Math.round(co2KgAno / 22);
}

export interface ProjecaoItem {
  ano: number;
  label: string;
  geracaoKwh: number;
  economiaAnual: number;
  acumulado: number;
  investimento: number;
}

/** Projeção com reajuste tarifário e degradação anual do sistema. */
export function projecao(
  geracaoKwhMes: number,
  valorFinal: number,
  a: AssumptionsConfig,
): ProjecaoItem[] {
  const itens: ProjecaoItem[] = [];
  let acumulado = 0;
  for (let ano = 1; ano <= a.horizonteAnos; ano++) {
    const degradacao = Math.pow(1 - a.degradacaoAnualPct / 100, ano - 1);
    const tarifa = a.tarifaKwh * Math.pow(1 + a.reajusteTarifarioPct / 100, ano - 1);
    const geracaoAno = geracaoKwhMes * 12 * degradacao;
    const economia = Math.round(
      geracaoAno * (a.consumoSimultaneoPct / 100) * tarifa - a.custoManutencaoAnual,
    );
    acumulado += economia;
    itens.push({
      ano,
      label: `${ano}º`,
      geracaoKwh: Math.round(geracaoAno),
      economiaAnual: economia,
      acumulado,
      investimento: valorFinal,
    });
  }
  return itens;
}

export function economiaTotalHorizonte(
  geracaoKwhMes: number,
  valorFinal: number,
  a: AssumptionsConfig,
): number {
  const p = projecao(geracaoKwhMes, valorFinal, a);
  return p.length ? p[p.length - 1].acumulado : 0;
}

export interface ParcelaCalculada {
  descricao: string;
  percentual: number;
  valor: number;
  vencimento?: string;
  observacao?: string;
}

export interface ParcelasValidacao {
  ok: boolean;
  somaPercentual: number;
  somaValor: number;
  alertas: string[];
}

/** Valida se as parcelas fecham exatamente 100% / valor final. */
export function validarParcelas(parcelas: ParcelaCalculada[], valorFinal: number): ParcelasValidacao {
  const somaPercentual = +parcelas.reduce((s, p) => s + (p.percentual || 0), 0).toFixed(2);
  const somaValor = +parcelas.reduce((s, p) => s + (p.valor || 0), 0).toFixed(2);
  const alertas: string[] = [];
  if (parcelas.length === 0) alertas.push('Nenhuma parcela informada.');
  if (parcelas.some(p => !p.descricao?.trim())) alertas.push('Há parcela sem descrição.');
  if (parcelas.length && Math.abs(somaPercentual - 100) > 0.01)
    alertas.push(`A soma dos percentuais é ${somaPercentual}% (deveria ser 100%).`);
  if (parcelas.length && Math.abs(somaValor - valorFinal) > 1)
    alertas.push('A soma dos valores não corresponde ao valor final da proposta.');
  return { ok: alertas.length === 0, somaPercentual, somaValor, alertas };
}
