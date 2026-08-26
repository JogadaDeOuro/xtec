import { supabase } from '@/integrations/supabase/client';
import type { Proposal, ProposalStatus, SystemType } from '@/lib/mock-data';

export interface ProposalRow {
  id: string;
  numero: string | null;
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
  desconto: number;
  margem: number;
  comissao: number;
  consumo_medio: number;
  garantia_estendida: boolean;
  garantia_estendida_valor: number;
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalRecord extends Proposal {
  numero: string;
  consumoMedio: number;
  garantiaEstendida: boolean;
  garantiaEstendidaValor: number;
}

export function rowToProposal(row: ProposalRow): ProposalRecord {
  return {
    id: row.id,
    numero: row.numero || `P-${row.id.slice(0, 6).toUpperCase()}`,
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
    desconto: Number(row.desconto),
    margem: Number(row.margem),
    comissao: Number(row.comissao),
    consumoMedio: Number(row.consumo_medio),
    garantiaEstendida: row.garantia_estendida,
    garantiaEstendidaValor: Number(row.garantia_estendida_valor),
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
  desconto: number;
  consumoMedio?: number;
  garantiaEstendida?: boolean;
  garantiaEstendidaValor?: number;
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
    desconto: input.desconto,
    consumo_medio: input.consumoMedio ?? 0,
    garantia_estendida: input.garantiaEstendida ?? false,
    garantia_estendida_valor: input.garantiaEstendidaValor ?? 0,
  };
}

export async function createProposal(input: ProposalInput): Promise<ProposalRecord> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      ...toRow(input),
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
