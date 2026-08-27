import { supabase } from '@/integrations/supabase/client';
import type { Proposal, ProposalStatus, SystemType } from '@/lib/mock-data';
import type { Finalidade } from '@/lib/investment';

export interface ProposalRow {
  id: string;
  numero: string | null;
  public_token: string;
  user_id: string | null;
  client_id: string | null;
  client_name: string;
  system_type: string;
  potencia_kwp: number;
  valor_sistema: number;
  producao_estimada: number;
  economia_mensal: number;
  economia_anual: number;
  payback_anos: number;
  status: string;
  condicao_pagamento: string | null;
  condicoes_alternativas: string[] | null;
  desconto: number;
  margem: number;
  comissao: number;
  consumo_medio: number;
  garantia_estendida: boolean;
  garantia_estendida_valor: number;
  tarifa_kwh: number;
  num_modulos: number;
  potencia_modulo_w: number;
  finalidade: string | null;
  desagio_pct: number | null;
  consultor: string | null;
  versao: number;
  template_id: string | null;
  doc_config: Record<string, unknown> | null;
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalRecord extends Proposal {
  condicoesAlternativas: string[];
  numero: string;
  publicToken: string;
  consumoMedio: number;
  garantiaEstendida: boolean;
  garantiaEstendidaValor: number;
  tarifaKwh: number;
  numModulos: number;
  potenciaModuloW: number;
  finalidade: Finalidade;
  desagioPct: number;
  consultor: string;
  versao: number;
  templateId: string | null;
  docConfig: Record<string, unknown> | null;
}

export function rowToProposal(row: ProposalRow): ProposalRecord {
  return {
    id: row.id,
    numero: row.numero || `P-${row.id.slice(0, 6).toUpperCase()}`,
    publicToken: row.public_token,
    clientId: row.client_id || '',
    clientName: row.client_name,
    systemType: row.system_type as SystemType,
    potenciaKwp: Number(row.potencia_kwp),
    valorSistema: Number(row.valor_sistema),
    producaoEstimada: Number(row.producao_estimada),
    economiaMensal: Number(row.economia_mensal),
    economiaAnual: Number(row.economia_anual),
    paybackAnos: Number(row.payback_anos),
    status: row.status as ProposalStatus,
    condicaoPagamento: row.condicao_pagamento || '',
    condicoesAlternativas: row.condicoes_alternativas ?? [],
    desconto: Number(row.desconto),
    margem: Number(row.margem),
    comissao: Number(row.comissao),
    consumoMedio: Number(row.consumo_medio),
    garantiaEstendida: row.garantia_estendida,
    garantiaEstendidaValor: Number(row.garantia_estendida_valor),
    tarifaKwh: row.tarifa_kwh != null ? Number(row.tarifa_kwh) : 0.85,
    numModulos: Number(row.num_modulos ?? 0),
    potenciaModuloW: Number(row.potencia_modulo_w ?? 700),
    finalidade: (row.finalidade === 'investimento' ? 'investimento' : 'consumo') as Finalidade,
    desagioPct: Number(row.desagio_pct ?? 0),
    consultor: row.consultor ?? '',
    versao: Number(row.versao ?? 1),
    templateId: row.template_id ?? null,
    docConfig: (row.doc_config as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at.slice(0, 10),
    viewedAt: row.viewed_at ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
  };
}

export async function fetchProposals(): Promise<ProposalRecord[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProposalRow[]).map(rowToProposal);
}

export async function fetchPublicProposal(token: string): Promise<ProposalRecord | null> {
  const { data, error } = await (supabase as any).rpc('get_public_proposal', { _token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? rowToProposal(row as ProposalRow) : null;
}

export async function fetchProposal(id: string): Promise<ProposalRecord | null> {
  const { data, error } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToProposal(data as unknown as ProposalRow) : null;
}

export interface ProposalInput {
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
  condicoesAlternativas?: string[];
  desconto: number;
  consumoMedio?: number;
  garantiaEstendida?: boolean;
  garantiaEstendidaValor?: number;
  tarifaKwh?: number;
  numModulos?: number;
  potenciaModuloW?: number;
  finalidade?: Finalidade;
  desagioPct?: number;
  consultor?: string;
  templateId?: string | null;
  docConfig?: Record<string, unknown> | null;
}

function toRow(input: ProposalInput) {
  return {
    client_id: input.clientId || null,
    client_name: input.clientName,
    system_type: input.systemType,
    potencia_kwp: input.potenciaKwp,
    valor_sistema: input.valorSistema,
    producao_estimada: input.producaoEstimada,
    economia_mensal: input.economiaMensal,
    economia_anual: input.economiaAnual,
    payback_anos: input.paybackAnos,
    status: input.status,
    condicao_pagamento: input.condicaoPagamento,
    condicoes_alternativas: input.condicoesAlternativas ?? [],
    desconto: input.desconto,
    consumo_medio: input.consumoMedio ?? 0,
    garantia_estendida: input.garantiaEstendida ?? false,
    garantia_estendida_valor: input.garantiaEstendidaValor ?? 0,
    tarifa_kwh: input.tarifaKwh ?? 0.85,
    num_modulos: input.numModulos ?? 0,
    potencia_modulo_w: input.potenciaModuloW ?? 700,
    finalidade: input.finalidade ?? 'consumo',
    desagio_pct: input.desagioPct ?? 0,
    consultor: input.consultor ?? null,
    template_id: input.templateId ?? null,
    doc_config: (input.docConfig ?? null) as never,
  };
}

async function nextNumero(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true });
  return `PROP-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

export async function createProposal(input: ProposalInput): Promise<ProposalRecord> {
  const { data: userData } = await supabase.auth.getUser();
  const numero = await nextNumero();
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      ...toRow(input),
      numero,
      user_id: userData.user?.id ?? null,
      accepted_at: input.status === 'aceita' ? new Date().toISOString() : null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToProposal(data as unknown as ProposalRow);
}

export async function updateProposal(id: string, input: ProposalInput): Promise<ProposalRecord> {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      ...toRow(input),
      accepted_at: input.status === 'aceita' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToProposal(data as unknown as ProposalRow);
}

export async function updateProposalStatus(id: string, status: ProposalStatus) {
  const { error } = await supabase
    .from('proposals')
    .update({
      status,
      accepted_at: status === 'aceita' ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProposal(id: string) {
  const { error } = await supabase.from('proposals').delete().eq('id', id);
  if (error) throw error;
}
