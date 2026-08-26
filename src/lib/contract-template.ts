import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/mock-data';
import { getMilestones, mapCondicaoFromLabel, EXTENDED_WARRANTY_YEARS, EXTENDED_WARRANTY_DESCRIPTION, STANDARD_WARRANTY_DESCRIPTION } from '@/lib/payment-options';

export interface ContractTemplateContent {
  headerTitle: string;
  headerSubtitle: string;
  body: string;
  footerText: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  content: ContractTemplateContent;
  isDefault: boolean;
  isActive: boolean;
  updatedAt?: string;
}

export interface ContractVariable {
  key: string;
  label: string;
  group: 'Cliente' | 'Sistema / Proposta' | 'Financeiro' | 'Empresa' | 'Documento';
  example: string;
}

/** Todas as variáveis disponíveis para o gabarito do contrato. */
export const CONTRACT_VARIABLES: ContractVariable[] = [
  { key: 'cliente_nome', label: 'Nome / Razão social', group: 'Cliente', example: 'João da Silva' },
  { key: 'cliente_nome_completo', label: 'Nome completo', group: 'Cliente', example: 'João da Silva' },
  { key: 'cliente_documento', label: 'CPF ou CNPJ', group: 'Cliente', example: '123.456.789-00' },
  { key: 'cliente_cpf_cnpj', label: 'CPF/CNPJ (alias)', group: 'Cliente', example: '123.456.789-00' },
  { key: 'cliente_email', label: 'E-mail', group: 'Cliente', example: 'joao@email.com' },
  { key: 'cliente_telefone', label: 'Telefone / WhatsApp', group: 'Cliente', example: '(61) 9 9999-9999' },
  { key: 'cliente_endereco', label: 'Endereço', group: 'Cliente', example: 'Rua das Flores, 100' },
  { key: 'cliente_cidade', label: 'Cidade', group: 'Cliente', example: 'Brasília' },
  { key: 'cliente_estado', label: 'Estado (UF)', group: 'Cliente', example: 'DF' },
  { key: 'cliente_cidade_estado', label: 'Cidade/UF', group: 'Cliente', example: 'Brasília/DF' },

  { key: 'sistema_tipo', label: 'Tipo de sistema', group: 'Sistema / Proposta', example: 'On-Grid (Conectado à Rede)' },
  { key: 'potencia_kwp', label: 'Potência (kWp)', group: 'Sistema / Proposta', example: '10,50' },
  { key: 'numero_proposta', label: 'Nº da proposta', group: 'Sistema / Proposta', example: 'PROP-2026-0007' },
  { key: 'numero_contrato', label: 'Nº do contrato', group: 'Sistema / Proposta', example: 'CT-8F21A3' },

  { key: 'valor', label: 'Valor do contrato', group: 'Financeiro', example: 'R$ 45.000,00' },
  { key: 'condicao_pagamento', label: 'Condição de pagamento', group: 'Financeiro', example: '50% na assinatura...' },
  { key: 'parcelas_lista', label: 'Lista de etapas/parcelas', group: 'Financeiro', example: '• 50% — Assinatura: R$ 22.500,00' },
  { key: 'garantia_estendida_valor', label: 'Valor da garantia estendida', group: 'Financeiro', example: 'R$ 3.600,00' },
  { key: 'garantia_estendida_texto', label: 'Texto da garantia estendida', group: 'Financeiro', example: 'Garantia estendida contratada...' },
  { key: 'garantia_padrao_texto', label: 'Texto da garantia padrão', group: 'Financeiro', example: STANDARD_WARRANTY_DESCRIPTION },
  { key: 'valor_total_geral', label: 'Total geral (contrato + adicionais)', group: 'Financeiro', example: 'R$ 48.600,00' },

  { key: 'empresa_nome', label: 'Nome da empresa', group: 'Empresa', example: 'Inforsol Engenharia' },
  { key: 'empresa_cnpj', label: 'CNPJ da empresa', group: 'Empresa', example: '00.000.000/0001-00' },
  { key: 'empresa_endereco', label: 'Endereço da empresa', group: 'Empresa', example: 'Av. Central, 1000' },
  { key: 'empresa_cidade', label: 'Cidade da empresa', group: 'Empresa', example: 'Brasília' },
  { key: 'empresa_estado', label: 'Estado da empresa', group: 'Empresa', example: 'DF' },
  { key: 'empresa_telefone', label: 'Telefone da empresa', group: 'Empresa', example: '(61) 3333-3333' },
  { key: 'empresa_email', label: 'E-mail da empresa', group: 'Empresa', example: 'contato@inforsol.com.br' },
  { key: 'empresa_responsavel', label: 'Responsável legal', group: 'Empresa', example: 'Maria Souza' },

  { key: 'data_hoje', label: 'Data de hoje (extenso)', group: 'Documento', example: '26 de agosto de 2026' },
  { key: 'ano_atual', label: 'Ano atual', group: 'Documento', example: '2026' },
  { key: 'foro', label: 'Foro (cidade/UF da empresa)', group: 'Documento', example: 'Brasília/DF' },
];

export const DEFAULT_CONTRACT_TEMPLATE: ContractTemplateContent = {
  headerTitle: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS',
  headerSubtitle: 'Instalação de Sistema de Energia Solar Fotovoltaica',
  footerText: '%empresa_nome% — CNPJ: %empresa_cnpj%\n%empresa_telefone% — %empresa_email%\nEste documento tem validade jurídica conforme Lei nº 14.063/2020',
  body: `## CLÁUSULA 1ª — DAS PARTES
**CONTRATADA:** %empresa_nome%, inscrita no CNPJ sob nº %empresa_cnpj%, com sede em %empresa_cidade%/%empresa_estado%, doravante denominada CONTRATADA.
**CONTRATANTE:** %cliente_nome%, inscrito(a) no CPF/CNPJ sob nº %cliente_documento%, residente/sediado(a) em %cliente_endereco%, %cliente_cidade_estado%, doravante denominado(a) CONTRATANTE.

## CLÁUSULA 2ª — DO OBJETO
O presente contrato tem por objeto a instalação de um sistema de energia solar fotovoltaica do tipo **%sistema_tipo%**, com potência instalada de **%potencia_kwp% kWp**, incluindo fornecimento de materiais, mão de obra especializada, projeto técnico e homologação junto à concessionária de energia.

## CLÁUSULA 3ª — DO VALOR E FORMA DE PAGAMENTO
Valor total do contrato: **%valor%**
Condição de pagamento: **%condicao_pagamento%**
%parcelas_lista%
%garantia_estendida_texto%
O não pagamento nas datas acordadas acarretará juros de mora de 1% ao mês e multa de 2% sobre o valor em atraso.

## CLÁUSULA 4ª — DO PRAZO DE EXECUÇÃO
A CONTRATADA se compromete a executar a instalação no prazo de **30 (trinta) dias úteis** após a liberação técnica pela concessionária e recebimento da primeira parcela/pagamento integral.

## CLÁUSULA 5ª — DAS GARANTIAS
- Módulos fotovoltaicos: **25 anos** de garantia de performance linear
- Inversor: **10 anos** de garantia do fabricante
- Estrutura de fixação: **12 anos** contra corrosão
- Mão de obra e instalação: **5 anos**
- Monitoramento: **1 ano** de acompanhamento gratuito

%garantia_padrao_texto%

## CLÁUSULA 6ª — DAS OBRIGAÇÕES DA CONTRATADA
- Fornecer todos os materiais e equipamentos necessários para a instalação
- Executar a instalação com profissionais qualificados e certificados
- Elaborar e registrar o projeto técnico junto ao CREA/CAU
- Solicitar e acompanhar o processo de homologação junto à concessionária
- Fornecer manual de operação e manutenção do sistema

## CLÁUSULA 7ª — DAS OBRIGAÇÕES DO CONTRATANTE
- Efetuar os pagamentos nas datas e formas acordadas
- Disponibilizar acesso ao local de instalação
- Fornecer documentação necessária para homologação (conta de energia, documentos pessoais)
- Manter o local adequado para a instalação do sistema

## CLÁUSULA 8ª — DA RESCISÃO
O presente contrato poderá ser rescindido por qualquer das partes mediante notificação escrita com antecedência mínima de 30 (trinta) dias, ficando a parte que der causa à rescisão obrigada ao pagamento de multa rescisória de 10% sobre o valor total do contrato.

## CLÁUSULA 9ª — DO FORO
Fica eleito o foro da comarca de %foro% para dirimir quaisquer dúvidas ou litígios oriundos deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`,
};

export interface ContractVariableSource {
  clientName?: string;
  clientDocument?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  systemType?: string;
  potenciaKwp?: number;
  valor?: number;
  condicaoPagamento?: string;
  garantiaEstendida?: boolean;
  garantiaEstendidaValor?: number;
  proposalId?: string;
  proposalNumero?: string;
  contractId?: string;
  company?: Record<string, string | undefined>;
}

const systemLabel = (t?: string) =>
  t === 'off-grid' ? 'Off-Grid (Isolado)' : t === 'hibrido' ? 'Híbrido' : 'On-Grid (Conectado à Rede)';

export function buildContractVariables(src: ContractVariableSource): Record<string, string> {
  const c = src.company || {};
  const valor = Number(src.valor || 0);
  const gar = Number(src.garantiaEstendidaValor || 0);
  const milestones = getMilestones(mapCondicaoFromLabel(src.condicaoPagamento || ''));
  const parcelas = milestones
    ? milestones.map(m => `- ${m.pct}% — ${m.label}: **${formatCurrency(valor * m.pct / 100)}**`).join('\n')
    : '';
  const empresaNome = c.razaoSocial || c.nomeFantasia || 'Inforsol Engenharia';
  const cidade = c.cidade || '';
  const estado = c.estado || '';

  return {
    cliente_nome: src.clientName || '______',
    cliente_nome_completo: src.clientName || '______',
    cliente_documento: src.clientDocument || '___.___.___-__',
    cliente_cpf_cnpj: src.clientDocument || '___.___.___-__',
    cliente_email: src.clientEmail || '______',
    cliente_telefone: src.clientPhone || '______',
    cliente_endereco: src.clientAddress || '______',
    cliente_cidade: src.clientCity || '______',
    cliente_estado: src.clientState || '__',
    cliente_cidade_estado: `${src.clientCity || '______'}/${src.clientState || '__'}`,

    sistema_tipo: systemLabel(src.systemType),
    potencia_kwp: String(src.potenciaKwp ?? 0).replace('.', ','),
    numero_proposta: src.proposalNumero || (src.proposalId ? `P-${src.proposalId.slice(0, 8).toUpperCase()}` : '—'),
    numero_contrato: src.contractId ? `CT-${src.contractId.slice(0, 8).toUpperCase()}` : '—',

    valor: formatCurrency(valor),
    condicao_pagamento: src.condicaoPagamento || '—',
    parcelas_lista: parcelas,
    garantia_estendida_valor: formatCurrency(gar),
    garantia_estendida_texto: src.garantiaEstendida
      ? `**Garantia Estendida (${EXTENDED_WARRANTY_YEARS} anos adicionais):** ${EXTENDED_WARRANTY_DESCRIPTION} Contratada como serviço adicional no valor de **${formatCurrency(gar)}**, cobrado à parte do valor do contrato. Total geral: **${formatCurrency(valor + gar)}**.`
      : '',
    garantia_padrao_texto: STANDARD_WARRANTY_DESCRIPTION,
    valor_total_geral: formatCurrency(valor + gar),

    empresa_nome: empresaNome,
    empresa_cnpj: c.cnpj || '00.000.000/0001-00',
    empresa_endereco: c.endereco || '______',
    empresa_cidade: cidade || 'São Paulo',
    empresa_estado: estado || 'SP',
    empresa_telefone: c.telefone || c.whatsapp || '______',
    empresa_email: c.email || '______',
    empresa_responsavel: c.responsavel || '______',

    data_hoje: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    ano_atual: String(new Date().getFullYear()),
    foro: `${cidade || 'São Paulo'}/${estado || 'SP'}`,
  };
}

/** Troca %variavel% (e {{variavel}}) pelos dados reais. */
export function renderTemplateText(text: string, vars: Record<string, string>): string {
  return (text || '')
    .replace(/%([a-z0-9_]+)%/gi, (m, k: string) => (k.toLowerCase() in vars ? vars[k.toLowerCase()] : m))
    .replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, k: string) => (k.toLowerCase() in vars ? vars[k.toLowerCase()] : m));
}

export type ContractBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

/** Converte o corpo (## título, - item, parágrafos) em blocos renderizáveis. */
export function parseContractBody(body: string): ContractBlock[] {
  const blocks: ContractBlock[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push({ type: 'list', items: list }); list = []; } };

  for (const raw of (body || '').split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('## ')) { flush(); blocks.push({ type: 'heading', text: line.slice(3).trim() }); continue; }
    if (line.startsWith('- ') || line.startsWith('• ')) { list.push(line.slice(2).trim()); continue; }
    flush();
    blocks.push({ type: 'paragraph', text: line });
  }
  flush();
  return blocks;
}

/** Converte **negrito** em HTML seguro (escapando o restante). */
export function inlineToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function normalize(row: {
  id: string; name: string; description: string | null; content: unknown;
  is_default: boolean; is_active: boolean; updated_at?: string;
}): ContractTemplate {
  const c = (row.content || {}) as Partial<ContractTemplateContent>;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    isDefault: row.is_default,
    isActive: row.is_active,
    updatedAt: row.updated_at,
    content: {
      headerTitle: c.headerTitle ?? DEFAULT_CONTRACT_TEMPLATE.headerTitle,
      headerSubtitle: c.headerSubtitle ?? DEFAULT_CONTRACT_TEMPLATE.headerSubtitle,
      body: c.body ?? DEFAULT_CONTRACT_TEMPLATE.body,
      footerText: c.footerText ?? DEFAULT_CONTRACT_TEMPLATE.footerText,
    },
  };
}

export async function listContractTemplates(): Promise<ContractTemplate[]> {
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalize as never);
}

export async function getDefaultContractTemplate(): Promise<ContractTemplate | null> {
  const { data } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);
  if (!data || !data.length) return null;
  return normalize(data[0] as never);
}

export async function createContractTemplate(name: string, content: ContractTemplateContent, isDefault = false) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('contract_templates')
    .insert({ name, content: content as never, is_default: isDefault, created_by: user?.id ?? null })
    .select('*')
    .single();
  if (error) throw error;
  if (isDefault) await setDefaultContractTemplate(data.id);
  return normalize(data as never);
}

export async function updateContractTemplate(id: string, patch: { name?: string; description?: string; content?: ContractTemplateContent; isActive?: boolean }) {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.content !== undefined) payload.content = patch.content;
  if (patch.isActive !== undefined) payload.is_active = patch.isActive;
  const { error } = await supabase.from('contract_templates').update(payload).eq('id', id);
  if (error) throw error;
}

export async function setDefaultContractTemplate(id: string) {
  await supabase.from('contract_templates').update({ is_default: false }).neq('id', id);
  const { error } = await supabase.from('contract_templates').update({ is_default: true, is_active: true }).eq('id', id);
  if (error) throw error;
}

export async function deleteContractTemplate(id: string) {
  const { error } = await supabase.from('contract_templates').delete().eq('id', id);
  if (error) throw error;
}

/** Garante que exista pelo menos o modelo padrão. */
export async function ensureDefaultContractTemplate(): Promise<ContractTemplate[]> {
  const list = await listContractTemplates();
  if (list.length) return list;
  try {
    await createContractTemplate('Modelo padrão Inforsol', DEFAULT_CONTRACT_TEMPLATE, true);
  } catch {
    return list;
  }
  return listContractTemplates();
}
