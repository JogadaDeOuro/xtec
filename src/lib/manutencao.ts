/**
 * Propostas de MANUTENÇÃO de usinas solares.
 * Preço cobrado por módulo (placa); o valor por m² é informativo.
 */

export const AREA_POR_MODULO_M2 = 3.1;

export interface ManutencaoItem {
  key: string;
  label: string;
  descricao: string;
}

/** Serviços que podem ser marcados como inclusos na proposta. */
export const MANUTENCAO_ITENS: ManutencaoItem[] = [
  {
    key: 'rocagem',
    label: 'Roçagem e limpeza do terreno',
    descricao:
      'Corte de vegetação sob e ao redor das mesas, removendo sombreamento parcial e risco de incêndio na área da usina.',
  },
  {
    key: 'limpeza_modulos',
    label: 'Limpeza dos módulos',
    descricao:
      'Lavagem dos módulos com água e shampoo neutro especializado para energia solar, sem abrasivos, preservando o vidro e o revestimento antirreflexo.',
  },
  {
    key: 'aterramento',
    label: 'Conferência de aterramento',
    descricao:
      'Verificação da malha de aterramento, continuidade, conexões e medição de resistência, garantindo proteção contra surtos e segurança elétrica.',
  },
  {
    key: 'estrutura',
    label: 'Conferência de estrutura',
    descricao:
      'Inspeção de perfis, grampos, parafusos e fixações, com reaperto conforme torque recomendado e verificação de corrosão.',
  },
  {
    key: 'conexoes',
    label: 'Inspeção elétrica e conexões',
    descricao:
      'Checagem de string box, disjuntores, DPS, conectores MC4 e cabeamento, identificando pontos de aquecimento ou mau contato.',
  },
  {
    key: 'inversor',
    label: 'Conferência do inversor e monitoramento',
    descricao:
      'Leitura de alarmes, limpeza de ventilação, conferência de parâmetros e validação da comunicação do sistema de monitoramento.',
  },
  {
    key: 'termografia',
    label: 'Inspeção termográfica',
    descricao:
      'Varredura térmica dos módulos e quadros elétricos para localizar hot spots, células danificadas e conexões com aquecimento.',
  },
  {
    key: 'relatorio',
    label: 'Relatório técnico fotográfico',
    descricao:
      'Relatório com registros fotográficos antes e depois, medições realizadas e recomendações técnicas para o próximo ciclo.',
  },
];

export const itemByKey = (key: string) => MANUTENCAO_ITENS.find(i => i.key === key);

/** Dados de mercado usados na página de recomendações da proposta. */
export const PERDAS_POR_NEGLIGENCIA: { titulo: string; texto: string }[] = [
  {
    titulo: 'Sujeira acumulada: 5% a 25% de perda',
    texto:
      'Estudos de desempenho de usinas fotovoltaicas apontam perdas de 5% a 25% de geração por acúmulo de poeira, fuligem e dejetos de aves. Em regiões de terra exposta e alta poeira, a queda pode ultrapassar 30% entre limpezas.',
  },
  {
    titulo: 'Sombreamento por vegetação: até 30%',
    texto:
      'A vegetação alta sombreia fileiras inteiras. Como os módulos operam em série, o sombreamento parcial de poucas placas derruba a produção de toda a string.',
  },
  {
    titulo: 'Falhas não detectadas: meses de geração perdida',
    texto:
      'Sem monitoramento e inspeção periódica, uma string desligada ou um inversor em alarme podem passar meses sem ser percebidos, gerando prejuízo silencioso e acumulado.',
  },
  {
    titulo: 'Riscos elétricos e perda de garantia',
    texto:
      'Conexões frouxas, aterramento deficiente e corrosão de estrutura provocam aquecimento, incêndio e danos permanentes. A maioria dos fabricantes exige comprovação de manutenção periódica para honrar a garantia.',
  },
];

export const RECOMENDACAO_PERIODICIDADE =
  'Recomenda-se manutenção preventiva a cada 6 meses em usinas de solo e a cada 12 meses em telhados de baixa sujidade, ' +
  'com limpeza adicional sempre que a geração cair mais de 10% em relação à média histórica do período.';

export interface ManutencaoCalcInput {
  numModulos: number;
  areaM2: number;
  /** preço praticado por metro quadrado da usina */
  valorPorM2: number;
  /** valor final exato definido pelo vendedor (sobrepõe o cálculo) */
  valorFinalManual?: number | null;
}

export interface ManutencaoCalcResult {
  valorCalculado: number;
  valorFinal: number;
  valorPorM2: number;
}

export function calcManutencao(i: ManutencaoCalcInput): ManutencaoCalcResult {
  const area = Math.max(0, i.areaM2 || 0);
  const valorCalculado = Math.round(area * (i.valorPorM2 || 0));
  const valorFinal =
    i.valorFinalManual != null && i.valorFinalManual > 0
      ? Math.round(i.valorFinalManual)
      : valorCalculado;
  return {
    valorCalculado,
    valorFinal,
    valorPorM2: area > 0 ? +(valorFinal / area).toFixed(2) : 0,
  };
}

export const areaSugerida = (numModulos: number) =>
  Math.round(Math.max(0, numModulos || 0) * AREA_POR_MODULO_M2);
