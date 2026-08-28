import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PROPOSAL_CONFIG, mergeConfig, type ProposalDocConfig } from '@/lib/proposal-config';
import { PROPOSAL_THEMES } from '@/lib/proposal-themes';

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

/** Cria (ou completa) os modelos padrão, um para cada tema visual. */
export async function seedDefaultTemplates(base: ProposalDocConfig): Promise<ProposalTemplate[]> {
  const existing = await fetchTemplates();
  const byName = new Map(existing.map(t => [t.name, t]));
  const created: ProposalTemplate[] = [...existing];
  for (const theme of PROPOSAL_THEMES) {
    if (byName.has(theme.name)) continue;
    try {
      created.push(await createTemplate(theme.name, theme.apply(base), theme.description));
    } catch { /* sem permissão */ }
  }
  if (!existing.length && created[0]) { try { await setDefaultTemplate(created[0].id); } catch { /* noop */ } }
  return created;
}

/** Recria/atualiza os modelos padrão a partir da configuração atual, mantendo os personalizados. */
export async function refreshDefaultTemplates(base: ProposalDocConfig): Promise<ProposalTemplate[]> {
  const existing = await fetchTemplates();
  const byName = new Map(existing.map(t => [t.name, t]));
  for (const theme of PROPOSAL_THEMES) {
    const config = theme.apply(base);
    const found = byName.get(theme.name);
    try {
      if (found) await updateTemplate(found.id, { config, description: theme.description });
      else await createTemplate(theme.name, config, theme.description);
    } catch { /* sem permissão */ }
  }
  return fetchTemplates();
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

/** Converte formatos menos comuns (heic, bmp, tiff, ico...) em PNG/JPEG usando o próprio navegador. */
async function normalizeImage(file: File): Promise<{ blob: Blob; ext: string; contentType: string }> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  // HEIC/HEIF: nenhum navegador decodifica nativamente — converte via heic2any
  if (['heic', 'heif'].includes(ext) || type.includes('heic') || type.includes('heif')) {
    const { default: heic2any } = await import('heic2any');
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    const blob = Array.isArray(out) ? out[0] : out;
    return { blob: blob as Blob, ext: 'jpg', contentType: 'image/jpeg' };
  }

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

/** Perfis de otimização: fotos da galeria/capa podem ser bem menores que o original da câmera. */
export type ImageKind = 'foto' | 'logo';
const PROFILE: Record<ImageKind, { maxSize: number; quality: number }> = {
  foto: { maxSize: 1600, quality: 0.78 },
  logo: { maxSize: 900, quality: 0.92 },
};

/** Reduz resolução e recomprime a imagem no navegador antes de enviar ao storage. */
async function optimizeImage(
  input: { blob: Blob; ext: string; contentType: string },
  kind: ImageKind,
): Promise<{ blob: Blob; ext: string; contentType: string }> {
  const { maxSize, quality } = PROFILE[kind];
  // vetor e animação não são recomprimidos
  if (input.contentType === 'image/svg+xml' || input.contentType === 'image/gif') return input;
  try {
    const bitmap = await createImageBitmap(input.blob);
    const larger = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxSize / larger);
    // já é pequena e leve: mantém o original
    if (scale === 1 && input.blob.size < 300_000) { bitmap.close?.(); return input; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    // logos podem ter transparência → webp; fotos → jpeg (menor e universal)
    const type = kind === 'logo' ? 'image/webp' : 'image/jpeg';
    const out = await new Promise<Blob | null>(res => canvas.toBlob(res, type, quality));
    if (!out || out.size >= input.blob.size) return input;
    return { blob: out, ext: type === 'image/webp' ? 'webp' : 'jpg', contentType: type };
  } catch {
    return input;
  }
}

export async function uploadBrandingFile(file: File, prefix = 'branding', kind: ImageKind = 'foto'): Promise<string> {
  const normalized = await normalizeImage(file);
  const { blob, ext, contentType } = await optimizeImage(normalized, kind);
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('branding')
    .upload(path, blob, { upsert: true, contentType, cacheControl: '3600' });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from('branding').createSignedUrl(path, TEN_YEARS);
  if (signErr) throw signErr;
  return data.signedUrl;
}

/** Baixa uma imagem já hospedada, recomprime e reenvia. Devolve a nova URL e os tamanhos. */
export async function optimizeExistingImage(
  url: string,
  kind: ImageKind = 'foto',
): Promise<{ url: string; before: number; after: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('download');
  const original = await res.blob();
  const contentType = original.type || 'image/jpeg';
  const ext = contentType.split('/')[1] || 'jpg';
  const optimized = await optimizeImage({ blob: original, ext, contentType }, kind);
  if (optimized.blob === original) return { url, before: original.size, after: original.size };
  const path = `branding/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${optimized.ext}`;
  const { error } = await supabase.storage
    .from('branding')
    .upload(path, optimized.blob, { upsert: true, contentType: optimized.contentType, cacheControl: '3600' });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from('branding').createSignedUrl(path, TEN_YEARS);
  if (signErr) throw signErr;
  return { url: data.signedUrl, before: original.size, after: optimized.blob.size };
}



export { DEFAULT_PROPOSAL_CONFIG };
