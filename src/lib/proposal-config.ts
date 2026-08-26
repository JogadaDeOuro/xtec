/**
 * Configuração completa do documento de proposta.
 * Tudo que é visual, textual ou institucional vive aqui — nada fixo em componentes.
 */

export type SectionKey =
  | 'capa'
  | 'apresentacao'
  | 'dados_cliente'
  | 'resumo_executivo'
  | 'consumo_atual'
  | 'dimensionamento'
  | 'equipamentos'
  | 'geracao'
  | 'economia'
  | 'retorno'
  | 'projecao'
  | 'impacto_ambiental'
  | 'escopo_incluso'
  | 'nao_inclusos'
  | 'pagamento'
  | 'cronograma'
  | 'garantias'
  | 'manutencao'
  | 'observacoes'
  | 'validade'
  | 'aceite'
  | 'assinaturas'
  | 'personalizada';

export interface SectionConfig {
  /** identificador único da instância (permite duplicar seções personalizadas) */
  id: string;
  key: SectionKey;
  title: string;
  enabled: boolean;
  /** força início em nova página A4 */
  newPage: boolean;
  background: 'branco' | 'colorido' | 'imagem';
  columns: 1 | 2;
  required: boolean;
  /** conteúdo livre usado por seções personalizadas */
  content?: string;
  imageUrl?: string;
}

export interface BrandingConfig {
  logoPrincipal: string;
  logoReduzido: string;
  logoClaro: string;
  logoEscuro: string;
  icone: string;
  imagemCapa: string;
  imagensInstitucionais: string[];
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
  corTexto: string;
  corFundo: string;
  corCard: string;
  corLinha: string;
  fonteTitulos: string;
  fonteTextos: string;
  estiloTitulos: 'normal' | 'uppercase' | 'capitalize';
  raioCards: number;
  intensidadeSombra: number;
  usarDegrade: boolean;
  margemMm: number;
  estiloCabecalho: 'faixa' | 'minimo' | 'oculto';
  estiloRodape: 'faixa' | 'linha' | 'oculto';
}

export interface CoverConfig {
  titulo: string;
  subtitulo: string;
  mostrarLogo: boolean;
  mostrarCliente: boolean;
  mostrarLocal: boolean;
  mostrarPotencia: boolean;
  mostrarGeracao: boolean;
  mostrarData: boolean;
  mostrarNumero: boolean;
  mostrarConsultor: boolean;
  imagemFundo: string;
  mascara: boolean;
  mascaraIntensidade: number;
  alinhamento: 'esquerda' | 'centro';
}

export interface CompanyConfig {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
  responsavel: string;
  registroProfissional: string;
  assinaturaUrl: string;
  qrCodeUrl: string;
}

export interface FooterConfig {
  mostrarLogo: boolean;
  mostrarRazaoSocial: boolean;
  mostrarCnpj: boolean;
  mostrarContato: boolean;
  mostrarInstagram: boolean;
  mostrarNumeroProposta: boolean;
  mostrarPaginacao: boolean;
  texto: string;
  corFundo: string;
  corTexto: string;
  alturaMm: number;
}

export interface TextsConfig {
  apresentacao: string;
  diferenciais: string;
  escopoPadrao: string;
  naoInclusos: string;
  observacoes: string;
  garantias: string;
  manutencao: string;
  validade: string;
  exclusoes: string;
  responsabilidades: string;
  aceite: string;
  rodape: string;
}

export interface AssumptionsConfig {
  produtividadeKwhKwpMes: number;
  perdasPct: number;
  tarifaKwh: number;
  reajusteTarifarioPct: number;
  degradacaoAnualPct: number;
  horizonteAnos: number;
  custoManutencaoAnual: number;
  consumoSimultaneoPct: number;
  custoDisponibilidadeMensal: number;
  margemSegurancaPct: number;
  areaPorModuloM2: number;
  fatorCo2KgPorKwh: number;
  validadeDias: number;
}

export interface ProposalDocConfig {
  branding: BrandingConfig;
  cover: CoverConfig;
  company: CompanyConfig;
  footer: FooterConfig;
  texts: TextsConfig;
  assumptions: AssumptionsConfig;
  sections: SectionConfig[];
}

export const SECTION_LABELS: Record<SectionKey, string> = {
  capa: 'Capa',
  apresentacao: 'Apresentação da empresa',
  dados_cliente: 'Dados do cliente',
  resumo_executivo: 'Resumo executivo',
  consumo_atual: 'Consumo atual',
  dimensionamento: 'Dimensionamento do sistema',
  equipamentos: 'Equipamentos',
  geracao: 'Estimativa de geração',
  economia: 'Economia estimada',
  retorno: 'Retorno do investimento',
  projecao: 'Projeção financeira',
  impacto_ambiental: 'Impacto ambiental',
  escopo_incluso: 'Escopo incluso',
  nao_inclusos: 'Serviços não inclusos',
  pagamento: 'Condições de pagamento',
  cronograma: 'Cronograma',
  garantias: 'Garantias',
  manutencao: 'Manutenção e pós-venda',
  observacoes: 'Observações técnicas',
  validade: 'Validade da proposta',
  aceite: 'Termo de aceite',
  assinaturas: 'Assinaturas',
  personalizada: 'Seção personalizada',
};

const sec = (
  key: SectionKey,
  overrides: Partial<SectionConfig> = {},
): SectionConfig => ({
  id: key,
  key,
  title: SECTION_LABELS[key],
  enabled: true,
  newPage: false,
  background: 'branco',
  columns: 1,
  required: false,
  ...overrides,
});

export const DEFAULT_SECTIONS: SectionConfig[] = [
  sec('capa', { newPage: true, required: true, background: 'imagem' }),
  sec('apresentacao', { newPage: true }),
  sec('dados_cliente'),
  sec('resumo_executivo'),
  sec('dimensionamento'),
  sec('geracao'),
  sec('equipamentos', { newPage: true }),
  sec('escopo_incluso'),
  sec('nao_inclusos', { enabled: false }),
  sec('retorno', { newPage: true, required: true }),
  sec('economia'),
  sec('pagamento', { required: true }),
  sec('projecao', { enabled: false }),
  sec('impacto_ambiental', { enabled: false }),
  sec('garantias', { newPage: true }),
  sec('manutencao'),
  sec('cronograma', { enabled: false }),
  sec('observacoes'),
  sec('validade'),
  sec('aceite', { enabled: false }),
  sec('assinaturas', { enabled: false }),
];

export const DEFAULT_PROPOSAL_CONFIG: ProposalDocConfig = {
  branding: {
    logoPrincipal: '',
    logoReduzido: '',
    logoClaro: '',
    logoEscuro: '',
    icone: '',
    imagemCapa: '',
    imagensInstitucionais: [],
    corPrimaria: '#1B5E20',
    corSecundaria: '#2D7A4F',
    corDestaque: '#A5D64C',
    corTexto: '#1A1A1A',
    corFundo: '#FFFFFF',
    corCard: '#F5FAF6',
    corLinha: '#DCEAE0',
    fonteTitulos: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    fonteTextos: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    estiloTitulos: 'uppercase',
    raioCards: 12,
    intensidadeSombra: 1,
    usarDegrade: true,
    margemMm: 14,
    estiloCabecalho: 'faixa',
    estiloRodape: 'faixa',
  },
  cover: {
    titulo: 'Proposta de Energia Solar',
    subtitulo: 'Soluções em engenharia fotovoltaica',
    mostrarLogo: true,
    mostrarCliente: true,
    mostrarLocal: true,
    mostrarPotencia: true,
    mostrarGeracao: true,
    mostrarData: true,
    mostrarNumero: true,
    mostrarConsultor: true,
    imagemFundo: '',
    mascara: true,
    mascaraIntensidade: 0.62,
    alinhamento: 'esquerda',
  },
  company: {
    razaoSocial: 'Inforsol Engenharia',
    nomeFantasia: 'INFORSOL',
    cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    whatsapp: '',
    email: '',
    site: '',
    instagram: '@inforsolengenharia',
    responsavel: '',
    registroProfissional: '',
    assinaturaUrl: '',
    qrCodeUrl: '',
  },
  footer: {
    mostrarLogo: true,
    mostrarRazaoSocial: true,
    mostrarCnpj: true,
    mostrarContato: true,
    mostrarInstagram: true,
    mostrarNumeroProposta: true,
    mostrarPaginacao: true,
    texto: '',
    corFundo: '#F5FAF6',
    corTexto: '#5A6B5E',
    alturaMm: 14,
  },
  texts: {
    apresentacao:
      'A {{empresa_nome}} é especializada em soluções de energia solar fotovoltaica, unindo engenharia, equipamentos de alta performance e acompanhamento próximo do cliente. Nossa missão é transformar o custo com energia elétrica em um investimento com retorno previsível e sustentável.',
    diferenciais:
      'Projeto elétrico próprio; equipe de instalação especializada; homologação junto à concessionária; monitoramento remoto do sistema; suporte técnico dedicado.',
    escopoPadrao:
      'Módulos fotovoltaicos; inversor(es) com monitoramento; estrutura de fixação em alumínio; cabeamento, conectores e proteções elétricas; projeto elétrico completo; instalação com equipe especializada; comissionamento e testes; solicitação de acesso e homologação junto à concessionária.',
    naoInclusos:
      'Reforço estrutural do telhado; adequação do padrão de entrada; obras civis; alvenaria; taxas de terceiros não previstas em contrato.',
    observacoes:
      'O dimensionamento considera o consumo médio informado e as condições de irradiação da região. A geração é estimada, não garantida, e pode variar conforme clima, orientação, inclinação e sombreamento. Valores sujeitos à confirmação após vistoria técnica.',
    garantias:
      'As garantias apresentadas seguem os certificados dos fabricantes dos equipamentos efetivamente selecionados, somadas à garantia de serviço de instalação prestada pela {{empresa_nome}}.',
    manutencao:
      'Limpeza dos módulos sugerida a cada 6 meses; monitoramento contínuo do sistema; conferência anual das conexões e proteções, com eventual substituição de peças desgastadas.',
    validade: 'Esta proposta é válida por {{validade}} dias a partir da data de emissão.',
    exclusoes:
      'Não estão inclusos serviços fora do escopo descrito, tributos criados após a emissão desta proposta e alterações solicitadas após a aprovação do projeto.',
    responsabilidades:
      'Cabe ao cliente disponibilizar acesso ao local, energia e condições seguras de trabalho durante a instalação.',
    aceite:
      'Declaro que li e aceito as condições técnicas, comerciais e de pagamento descritas nesta proposta.',
    rodape: 'Energia solar com engenharia de verdade.',
  },
  assumptions: {
    produtividadeKwhKwpMes: 125,
    perdasPct: 18,
    tarifaKwh: 0.85,
    reajusteTarifarioPct: 5,
    degradacaoAnualPct: 0.5,
    horizonteAnos: 20,
    custoManutencaoAnual: 0,
    consumoSimultaneoPct: 100,
    custoDisponibilidadeMensal: 0,
    margemSegurancaPct: 0,
    areaPorModuloM2: 3.1,
    fatorCo2KgPorKwh: 0.0817,
    validadeDias: 15,
  },
  sections: DEFAULT_SECTIONS,
};

/** Merge profundo e tolerante: config salva pode estar incompleta ou antiga. */
export function mergeConfig(partial?: unknown): ProposalDocConfig {
  const p = (partial ?? {}) as Partial<ProposalDocConfig>;
  const base = DEFAULT_PROPOSAL_CONFIG;
  const sections =
    Array.isArray(p.sections) && p.sections.length
      ? p.sections.map((s, i) => ({ ...sec(s.key ?? 'personalizada'), ...s, id: s.id ?? `${s.key}-${i}` }))
      : base.sections;
  return {
    branding: { ...base.branding, ...(p.branding ?? {}) },
    cover: { ...base.cover, ...(p.cover ?? {}) },
    company: { ...base.company, ...(p.company ?? {}) },
    footer: { ...base.footer, ...(p.footer ?? {}) },
    texts: { ...base.texts, ...(p.texts ?? {}) },
    assumptions: { ...base.assumptions, ...(p.assumptions ?? {}) },
    sections,
  };
}

export interface TemplateVariables {
  cliente_nome: string;
  cliente_cidade: string;
  cliente_estado: string;
  potencia_kwp: string;
  geracao_mensal: string;
  geracao_anual: string;
  valor_final: string;
  economia_mensal: string;
  payback: string;
  data_proposta: string;
  validade: string;
  consultor_nome: string;
  numero_proposta: string;
  empresa_nome: string;
}

/** Substitui {{variavel}} pelos valores da proposta. */
export function interpolate(text: string, vars: Partial<TemplateVariables>): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => {
    const v = (vars as Record<string, string | undefined>)[key];
    return v ?? '';
  });
}

export const AVAILABLE_VARIABLES: (keyof TemplateVariables)[] = [
  'cliente_nome', 'cliente_cidade', 'cliente_estado', 'potencia_kwp', 'geracao_mensal',
  'geracao_anual', 'valor_final', 'economia_mensal', 'payback', 'data_proposta',
  'validade', 'consultor_nome', 'numero_proposta', 'empresa_nome',
];

export const EQUIPMENT_CATEGORIES = [
  { value: 'modulo', label: 'Módulo fotovoltaico' },
  { value: 'inversor', label: 'Inversor' },
  { value: 'microinversor', label: 'Microinversor' },
  { value: 'estrutura', label: 'Estrutura' },
  { value: 'string_box', label: 'String box' },
  { value: 'protecao_ca', label: 'Proteção CA' },
  { value: 'protecao_cc', label: 'Proteção CC' },
  { value: 'cabeamento', label: 'Cabeamento' },
  { value: 'conector', label: 'Conector' },
  { value: 'monitoramento', label: 'Monitoramento' },
  { value: 'bateria', label: 'Bateria' },
  { value: 'carregador', label: 'Carregador' },
  { value: 'outros', label: 'Outros' },
] as const;

export const FONT_OPTIONS = [
  { value: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", label: 'Segoe UI (padrão)' },
  { value: "Georgia, 'Times New Roman', serif", label: 'Georgia (serifada)' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS' },
  { value: "Verdana, Geneva, sans-serif", label: 'Verdana' },
  { value: "'Courier New', monospace", label: 'Courier New' },
];
