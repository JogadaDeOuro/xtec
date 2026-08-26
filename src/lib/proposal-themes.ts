import type { ProposalDocConfig, SectionConfig } from '@/lib/proposal-config';

/**
 * Temas visuais dos modelos de proposta.
 * Cada tema muda cores, tipografia, cabeçalho/rodapé, cantos, sombras,
 * margens e a forma como as seções são dispostas — mas NUNCA apaga
 * conteúdo do cliente (logos, imagens, galeria, textos, dados da empresa).
 */
export interface ProposalTheme {
  id: string;
  name: string;
  description: string;
  apply: (base: ProposalDocConfig) => ProposalDocConfig;
}

type Layout = {
  /** seções que devem começar em nova página */
  newPage?: string[];
  /** seções em duas colunas */
  cols2?: string[];
  /** seções com fundo colorido */
  colorido?: string[];
  /** todas as demais voltam ao padrão branco/1 coluna */
};

function layoutSections(sections: SectionConfig[], l: Layout): SectionConfig[] {
  return sections.map(s => ({
    ...s,
    newPage: s.key === 'capa' ? s.newPage : !!l.newPage?.includes(s.key),
    columns: (l.cols2?.includes(s.key) ? 2 : 1) as 1 | 2,
    background: s.background === 'imagem'
      ? 'imagem'
      : (l.colorido?.includes(s.key) ? 'colorido' : 'branco'),
  }));
}

/** Aplica um tema preservando todos os ativos e conteúdos já configurados. */
function make(
  base: ProposalDocConfig,
  branding: Partial<ProposalDocConfig['branding']>,
  cover: Partial<ProposalDocConfig['cover']>,
  footer: Partial<ProposalDocConfig['footer']>,
  gallery: Partial<ProposalDocConfig['gallery']>,
  layout: Layout,
): ProposalDocConfig {
  return {
    ...base,
    branding: { ...base.branding, ...branding },
    cover: { ...base.cover, ...cover },
    footer: { ...base.footer, ...footer },
    gallery: { ...base.gallery, ...gallery },
    sections: layoutSections(base.sections, layout),
  };
}

const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const GEO = "'Trebuchet MS', 'Segoe UI', sans-serif";
const MONO = "'Courier New', ui-monospace, monospace";
const NEUTRO = "'Helvetica Neue', Arial, Helvetica, sans-serif";

export const PROPOSAL_THEMES: ProposalTheme[] = [
  {
    id: 'classico',
    name: 'INFORSOL Clássico',
    description: 'Verde institucional, faixas coloridas, cards arredondados. O padrão da casa.',
    apply: base => make(base, {
      corPrimaria: '#1B5E20', corSecundaria: '#2D7A4F', corDestaque: '#A5D64C',
      corTexto: '#1A1A1A', corFundo: '#FFFFFF', corCard: '#F5FAF6', corLinha: '#DCEAE0',
      fonteTitulos: SANS, fonteTextos: SANS, estiloTitulos: 'uppercase',
      raioCards: 12, intensidadeSombra: 1, usarDegrade: true, margemMm: 14,
      estiloCabecalho: 'faixa', estiloRodape: 'faixa',
    }, { alinhamento: 'esquerda', mascara: true, mascaraIntensidade: 0.9 },
      { corFundo: '#F5FAF6', corTexto: '#4A5A4E', alturaMm: 14 },
      { colunas: 3 },
      { newPage: ['pagamento', 'garantias'], colorido: ['resumo_executivo', 'retorno'] }),
  },
  {
    id: 'editorial',
    name: 'Editorial Serifado',
    description: 'Tipografia serifada, cabeçalho mínimo, texto em duas colunas — cara de revista técnica.',
    apply: base => make(base, {
      corPrimaria: '#14332B', corSecundaria: '#3F6B57', corDestaque: '#C7A05A',
      corTexto: '#20241F', corFundo: '#FCFBF7', corCard: '#F2EFE6', corLinha: '#DED8C8',
      fonteTitulos: SERIF, fonteTextos: SERIF, estiloTitulos: 'capitalize',
      raioCards: 0, intensidadeSombra: 0, usarDegrade: false, margemMm: 20,
      estiloCabecalho: 'minimo', estiloRodape: 'linha',
    }, { alinhamento: 'esquerda', mascara: true, mascaraIntensidade: 0.75 },
      { corFundo: 'transparent', corTexto: '#5B5F57', alturaMm: 12 },
      { colunas: 2 },
      {
        newPage: ['apresentacao', 'pagamento', 'garantias'],
        cols2: ['apresentacao', 'escopo_incluso', 'nao_inclusos', 'garantias', 'manutencao', 'observacoes'],
      }),
  },
  {
    id: 'solar-bold',
    name: 'Solar Bold',
    description: 'Grafite com âmbar solar, cards bem arredondados, sombras fortes e capa centralizada.',
    apply: base => make(base, {
      corPrimaria: '#111827', corSecundaria: '#374151', corDestaque: '#F59E0B',
      corTexto: '#111827', corFundo: '#FFFFFF', corCard: '#FFF7E6', corLinha: '#F1DFBC',
      fonteTitulos: GEO, fonteTextos: SANS, estiloTitulos: 'uppercase',
      raioCards: 22, intensidadeSombra: 2, usarDegrade: true, margemMm: 12,
      estiloCabecalho: 'faixa', estiloRodape: 'faixa',
    }, { alinhamento: 'centro', mascara: true, mascaraIntensidade: 1 },
      { corFundo: '#111827', corTexto: '#F3F4F6', alturaMm: 16 },
      { colunas: 2 },
      {
        newPage: ['dimensionamento', 'pagamento', 'galeria'],
        colorido: ['resumo_executivo', 'economia', 'retorno', 'pagamento', 'garantias'],
      }),
  },
  {
    id: 'minimal',
    name: 'Minimal Mono',
    description: 'Preto e branco, sem sombras, cantos retos, muito respiro e títulos discretos.',
    apply: base => make(base, {
      corPrimaria: '#111111', corSecundaria: '#555555', corDestaque: '#111111',
      corTexto: '#171717', corFundo: '#FFFFFF', corCard: '#F4F4F4', corLinha: '#E2E2E2',
      fonteTitulos: NEUTRO, fonteTextos: NEUTRO, estiloTitulos: 'normal',
      raioCards: 0, intensidadeSombra: 0, usarDegrade: false, margemMm: 22,
      estiloCabecalho: 'minimo', estiloRodape: 'linha',
    }, { alinhamento: 'esquerda', mascara: true, mascaraIntensidade: 1 },
      { corFundo: 'transparent', corTexto: '#6B6B6B', alturaMm: 11 },
      { colunas: 3, mostrarTitulos: false },
      { newPage: ['pagamento'], cols2: ['escopo_incluso', 'nao_inclusos'] }),
  },
  {
    id: 'corporativo',
    name: 'Corporativo Azul',
    description: 'Azul-marinho sóbrio, blocos compactos, cabeçalho e rodapé em faixa — perfil B2B.',
    apply: base => make(base, {
      corPrimaria: '#0B3A6B', corSecundaria: '#1565C0', corDestaque: '#00A3E0',
      corTexto: '#1C2430', corFundo: '#FFFFFF', corCard: '#EEF4FB', corLinha: '#D3E1F0',
      fonteTitulos: "Tahoma, Verdana, 'Segoe UI', sans-serif", fonteTextos: "Verdana, Tahoma, sans-serif",
      estiloTitulos: 'uppercase', raioCards: 6, intensidadeSombra: 0.5, usarDegrade: true, margemMm: 15,
      estiloCabecalho: 'faixa', estiloRodape: 'faixa',
    }, { alinhamento: 'esquerda', mascara: true, mascaraIntensidade: 0.95 },
      { corFundo: '#0B3A6B', corTexto: '#E8F1FA', alturaMm: 13 },
      { colunas: 3 },
      {
        newPage: ['dados_cliente', 'pagamento', 'garantias'],
        colorido: ['dados_cliente', 'dimensionamento', 'retorno'],
        cols2: ['garantias', 'observacoes'],
      }),
  },
  {
    id: 'tropical',
    name: 'Tropical Verde-Água',
    description: 'Turquesa e lima, capa centralizada, cards muito arredondados e galeria em 2 colunas.',
    apply: base => make(base, {
      corPrimaria: '#0F766E', corSecundaria: '#14B8A6', corDestaque: '#BEF264',
      corTexto: '#12302C', corFundo: '#F7FFFD', corCard: '#E6FAF6', corLinha: '#C7EDE6',
      fonteTitulos: GEO, fonteTextos: GEO, estiloTitulos: 'capitalize',
      raioCards: 26, intensidadeSombra: 1.4, usarDegrade: true, margemMm: 16,
      estiloCabecalho: 'faixa', estiloRodape: 'linha',
    }, { alinhamento: 'centro', mascara: true, mascaraIntensidade: 0.8 },
      { corFundo: 'transparent', corTexto: '#3B5C56', alturaMm: 14 },
      { colunas: 2 },
      {
        newPage: ['galeria', 'pagamento'],
        colorido: ['apresentacao', 'economia', 'retorno', 'galeria', 'garantias'],
      }),
  },
  {
    id: 'tecnico',
    name: 'Técnico Blueprint',
    description: 'Estilo ficha de engenharia: monoespaçado nos títulos, grade fina e fundo levemente cinza.',
    apply: base => make(base, {
      corPrimaria: '#1F3A5F', corSecundaria: '#4A6FA5', corDestaque: '#E85D04',
      corTexto: '#22262B', corFundo: '#FBFBFC', corCard: '#EFF2F5', corLinha: '#CBD3DC',
      fonteTitulos: MONO, fonteTextos: NEUTRO, estiloTitulos: 'uppercase',
      raioCards: 3, intensidadeSombra: 0, usarDegrade: false, margemMm: 13,
      estiloCabecalho: 'minimo', estiloRodape: 'faixa',
    }, { alinhamento: 'esquerda', mascara: true, mascaraIntensidade: 1 },
      { corFundo: '#1F3A5F', corTexto: '#DCE6F2', alturaMm: 12 },
      { colunas: 3, mostrarTitulos: true },
      {
        newPage: ['dimensionamento', 'equipamentos', 'pagamento'],
        colorido: ['consumo_atual', 'dimensionamento', 'geracao', 'projecao'],
        cols2: ['escopo_incluso', 'nao_inclusos', 'garantias', 'manutencao'],
      }),
  },
];

export function getTheme(id: string): ProposalTheme | undefined {
  return PROPOSAL_THEMES.find(t => t.id === id);
}
