// Mock data for the Inforsol system

export type ClientStatus = 'novo' | 'em_atendimento' | 'proposta_enviada' | 'negociacao' | 'fechado' | 'perdido' | 'instalacao' | 'finalizado' | 'arquivado';
export type ClientType = 'residencial' | 'comercial' | 'industrial' | 'rural';
export type SystemType = 'on-grid' | 'off-grid' | 'hibrido';
export type ProposalStatus = 'rascunho' | 'enviada' | 'visualizada' | 'aceita' | 'recusada';
export type ContractStatus = 'rascunho' | 'enviado' | 'assinado' | 'cancelado';
export type StageStatus = 'pendente' | 'em_andamento' | 'concluido' | 'atrasado';

export interface Client {
  id: string;
  name: string;
  document: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  projectLocation: string;
  concessionaria: string;
  consumoMedio: number;
  clientType: ClientType;
  status: ClientStatus;
  vendedor: string;
  origem: string;
  tags: string[];
  notes: string;
  favorite: boolean;
  createdAt: string;
}

export interface Proposal {
  id: string;
  clientId: string;
  clientName: string;
  systemType: SystemType;
  potenciaKwp: number;
  valorSistema: number;
  producaoEstimada: number;
  economiaMensal: number;
  economiaAnual: number;
  paybackAnos: number;
  status: ProposalStatus;
  condicaoPagamento: string;
  desconto: number;
  margem: number;
  comissao: number;
  createdAt: string;
  viewedAt?: string;
  acceptedAt?: string;
}

export interface ContractSignature {
  name: string;
  document: string;
  email?: string;
  signedAt: string;
  ip: string;
  location?: string;
  userAgent?: string;
  hash: string;
  signatureFont?: string;
  signerType: 'empresa' | 'cliente';
}

export interface Contract {
  id: string;
  proposalId: string;
  clientId: string;
  clientName: string;
  clientDocument?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  systemType: SystemType;
  potenciaKwp: number;
  valor: number;
  condicaoPagamento: string;
  status: ContractStatus;
  createdAt: string;
  signedAt?: string;
  signingToken?: string;
  signatures: ContractSignature[];
}

export interface ProjectStage {
  id: string;
  contractId: string;
  clientName: string;
  stages: {
    name: string;
    dataPrevista: string;
    dataReal?: string;
    responsavel: string;
    observacoes: string;
    status: StageStatus;
  }[];
}

// Dados reais vêm do banco (Lovable Cloud). Nada é persistido no navegador.
try {
  localStorage.removeItem('inforsol_proposals');
  localStorage.removeItem('inforsol_contracts');
} catch { /* ignore */ }


export const dashboardStats = {
  totalLeads: 127,
  proposalsEnviadas: 48,
  proposalsAceitas: 31,
  taxaConversao: 64.6,
  ticketMedio: 89500,
  faturamentoPrevisto: 2850000,
  faturamentoFechado: 1920000,
  contratosAndamento: 8,
  projetosPorEtapa: {
    'Proposta Aprovada': 3,
    'Contrato Assinado': 2,
    'Solicitação Técnica': 4,
    'Liberação Técnica': 2,
    'Material': 3,
    'Instalação': 5,
    'Vistoria': 2,
    'Homologação': 1,
  },
  vendasMensais: [
    { mes: 'Jan', valor: 385000, propostas: 6 },
    { mes: 'Fev', valor: 290000, propostas: 8 },
    { mes: 'Mar', valor: 520000, propostas: 12 },
    { mes: 'Abr', valor: 180000, propostas: 5 },
    { mes: 'Mai', valor: 445000, propostas: 9 },
    { mes: 'Jun', valor: 310000, propostas: 7 },
  ],
  vendedores: [
    { nome: 'Carlos Oliveira', leads: 42, propostas: 18, fechamentos: 12, faturamento: 890000 },
    { nome: 'Ana Paula', leads: 38, propostas: 15, fechamentos: 10, faturamento: 720000 },
    { nome: 'Ricardo Santos', leads: 25, propostas: 8, fechamentos: 5, faturamento: 310000 },
    { nome: 'Juliana Costa', leads: 22, propostas: 7, fechamentos: 4, faturamento: 185000 },
  ],
  funil: [
    { etapa: 'Leads', quantidade: 127 },
    { etapa: 'Em Atendimento', quantidade: 68 },
    { etapa: 'Proposta Enviada', quantidade: 48 },
    { etapa: 'Negociação', quantidade: 35 },
    { etapa: 'Fechados', quantidade: 31 },
  ],
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export const statusColors: Record<ClientStatus, string> = {
  novo: 'bg-info text-info-foreground',
  em_atendimento: 'bg-warning text-warning-foreground',
  proposta_enviada: 'bg-primary text-primary-foreground',
  negociacao: 'bg-accent text-accent-foreground',
  fechado: 'bg-success text-success-foreground',
  perdido: 'bg-destructive text-destructive-foreground',
  instalacao: 'bg-chart-2 text-primary-foreground',
  finalizado: 'bg-chart-5 text-primary-foreground',
  arquivado: 'bg-muted text-muted-foreground',
};

export const statusLabels: Record<ClientStatus, string> = {
  novo: 'Novo',
  em_atendimento: 'Em Atendimento',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
  instalacao: 'Instalação',
  finalizado: 'Finalizado',
  arquivado: 'Arquivado',
};

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  visualizada: 'Visualizada',
  aceita: 'Aceita',
  recusada: 'Recusada',
};

export const proposalStatusColors: Record<ProposalStatus, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  enviada: 'bg-info text-info-foreground',
  visualizada: 'bg-warning text-warning-foreground',
  aceita: 'bg-success text-success-foreground',
  recusada: 'bg-destructive text-destructive-foreground',
};
