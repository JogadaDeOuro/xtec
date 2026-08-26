import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PROPOSAL_CONFIG, mergeConfig, type ProposalDocConfig } from '@/lib/proposal-config';

const db = supabase as unknown as {
  from: (t: string) => any;
  storage: typeof supabase.storage;
};

export interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  config: ProposalDocConfig;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface EquipmentItem {
  id: string;
  category: string;
  manufacturer: string;
  model: string;
  potenciaW: number;
  description: string;
  imageUrl: string | null;
  datasheetUrl: string | null;
  warrantyDefectYears: number;
  warrantyPerformanceYears: number;
  efficiency: number;
  notes: string;
  active: boolean;
}

/* ---------- Configuração global ---------- */

export async function fetchProposalSettings(): Promise<ProposalDocConfig> {
  const { data, error } = await db.from('proposal_settings').select('config').eq('scope', 'default').maybeSingle();
  if (error) throw error;
  return mergeConfig(data?.config);
}

export async function saveProposalSettings(config: ProposalDocConfig): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { data: existing } = await db
    .from('proposal_settings').select('id').eq('scope', 'default').maybeSingle();
  if (existing?.id) {
    const { error } = await db.from('proposal_settings')
      .update({ config, updated_by: userData.user?.id ?? null }).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await db.from('proposal_settings')
      .insert({ scope: 'default', config, updated_by: userData.user?.id ?? null });
    if (error) throw error;
  }
}

/* ---------- Modelos ---------- */

function rowToTemplate(r: any): ProposalTemplate {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    config: mergeConfig(r.config),
    isDefault: !!r.is_default,
    isActive: !!r.is_active,
    createdAt: r.created_at,
  };
}

export async function fetchTemplates(): Promise<ProposalTemplate[]> {
  const { data, error } = await db.from('proposal_templates').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map(rowToTemplate);
}

export async function createTemplate(
  name: string, config: ProposalDocConfig, description = '',
): Promise<ProposalTemplate> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await db.from('proposal_templates')
    .insert({ name, description, config, created_by: userData.user?.id ?? null })
    .select('*').single();
  if (error) throw error;
  return rowToTemplate(data);
}

export async function updateTemplate(id: string, patch: Partial<{
  name: string; description: string; config: ProposalDocConfig; is_active: boolean;
}>): Promise<void> {
  const { error } = await db.from('proposal_templates').update(patch).eq('id', id);
  if (error) throw error;
}

export async function setDefaultTemplate(id: string): Promise<void> {
  await db.from('proposal_templates').update({ is_default: false }).neq('id', id);
  const { error } = await db.from('proposal_templates').update({ is_default: true }).eq('id', id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await db.from('proposal_templates').delete().eq('id', id);
  if (error) throw error;
}

/** Cria os modelos iniciais se ainda não existirem. */
export async function seedDefaultTemplates(base: ProposalDocConfig): Promise<ProposalTemplate[]> {
  const existing = await fetchTemplates();
  if (existing.length) return existing;
  const presets: { name: string; description: string; config: ProposalDocConfig }[] = [
    {
      name: 'INFORSOL Clássico',
      description: 'Documento completo, equilibrado entre técnico e comercial.',
      config: base,
    },
    {
      name: 'INFORSOL Executivo',
      description: 'Versão enxuta: capa, resumo, investimento e garantias.',
      config: {
        ...base,
        sections: base.sections.map(s => ({
          ...s,
          enabled: ['capa', 'apresentacao', 'resumo_executivo', 'dimensionamento', 'retorno', 'pagamento', 'garantias', 'validade'].includes(s.key),
        })),
      },
    },
    {
      name: 'INFORSOL Técnico',
      description: 'Ênfase em dimensionamento, equipamentos, geração e escopo.',
      config: {
        ...base,
        sections: base.sections.map(s => ({
          ...s,
          enabled: !['aceite', 'assinaturas'].includes(s.key),
        })),
      },
    },
    {
      name: 'Personalizado',
      description: 'Ponto de partida livre para novos modelos.',
      config: base,
    },
  ];
  const created: ProposalTemplate[] = [];
  for (const p of presets) {
    try { created.push(await createTemplate(p.name, p.config, p.description)); } catch { /* sem permissão */ }
  }
  if (created[0]) { try { await setDefaultTemplate(created[0].id); } catch { /* noop */ } }
  return created;
}

/* ---------- Equipamentos ---------- */

function rowToEquipment(r: any): EquipmentItem {
  return {
    id: r.id,
    category: r.category,
    manufacturer: r.manufacturer ?? '',
    model: r.model ?? '',
    potenciaW: Number(r.potencia_w ?? 0),
    description: r.description ?? '',
    imageUrl: r.image_url,
    datasheetUrl: r.datasheet_url,
    warrantyDefectYears: Number(r.warranty_defect_years ?? 0),
    warrantyPerformanceYears: Number(r.warranty_performance_years ?? 0),
    efficiency: Number(r.efficiency ?? 0),
    notes: r.notes ?? '',
    active: !!r.active,
  };
}

export async function fetchEquipment(): Promise<EquipmentItem[]> {
  const { data, error } = await db.from('equipment_catalog').select('*').order('category');
  if (error) throw error;
  return (data ?? []).map(rowToEquipment);
}

export async function saveEquipment(item: Partial<EquipmentItem> & { id?: string }): Promise<void> {
  const row = {
    category: item.category ?? 'modulo',
    manufacturer: item.manufacturer ?? '',
    model: item.model ?? '',
    potencia_w: item.potenciaW ?? 0,
    description: item.description ?? '',
    image_url: item.imageUrl ?? null,
    datasheet_url: item.datasheetUrl ?? null,
    warranty_defect_years: item.warrantyDefectYears ?? 0,
    warranty_performance_years: item.warrantyPerformanceYears ?? 0,
    efficiency: item.efficiency ?? 0,
    notes: item.notes ?? '',
    active: item.active ?? true,
  };
  const { error } = item.id
    ? await db.from('equipment_catalog').update(row).eq('id', item.id)
    : await db.from('equipment_catalog').insert(row);
  if (error) throw error;
}

export async function deleteEquipment(id: string): Promise<void> {
  const { error } = await db.from('equipment_catalog').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Upload de imagens (bucket privado + URL assinada longa) ---------- */

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Formatos que os navegadores renderizam nativamente e podem ser enviados sem conversão. */
const NATIVE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
const NATIVE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'jfif', 'webp', 'gif', 'svg', 'avif'];

/** Converte formatos menos comuns (heic, bmp, tiff, ico...) em PNG usando o próprio navegador. */
async function normalizeImage(file: File): Promise<{ blob: Blob; ext: string; contentType: string }> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  if (NATIVE_IMAGE_TYPES.includes(type) || NATIVE_EXTENSIONS.includes(ext)) {
    return { blob: file, ext: ext || 'png', contentType: type || `image/${ext === 'jpg' ? 'jpeg' : ext}` };
  }

  // tenta decodificar com o navegador e reexportar como PNG
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('convert');
    return { blob, ext: 'png', contentType: 'image/png' };
  } catch {
    throw new Error('unsupported_image');
  }
}

export async function uploadBrandingFile(file: File, prefix = 'branding'): Promise<string> {
  const { blob, ext, contentType } = await normalizeImage(file);
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('branding')
    .upload(path, blob, { upsert: true, contentType, cacheControl: '3600' });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from('branding').createSignedUrl(path, TEN_YEARS);
  if (signErr) throw signErr;
  return data.signedUrl;
}


export { DEFAULT_PROPOSAL_CONFIG };
