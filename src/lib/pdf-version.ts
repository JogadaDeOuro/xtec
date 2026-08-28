/**
 * Identificação técnica do gerador de PDF.
 * Aparece nos metadados do PDF, nos logs e no relatório interno de diagnóstico,
 * permitindo saber se o arquivo veio do preview ou da versão publicada,
 * e se foi produzido pelo motor server-side ou pelo fallback local.
 */
export const PDF_TEMPLATE_VERSION = '2026.08.1';
export const PDF_ENGINE_VERSION = 'server-chromium/1 + local-html2canvas/1.4.1';

export type PdfEngine = 'server-chromium' | 'local-html2canvas';

/** preview do Lovable, domínio publicado ou desenvolvimento local */
export function pdfEnvironment(): string {
  if (typeof window === 'undefined') return 'ssr';
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'local';
  if (h.startsWith('id-preview--')) return 'preview';
  return 'published';
}

export function pdfBuildId(): string {
  return `${PDF_TEMPLATE_VERSION}/${pdfEnvironment()}`;
}

export function pdfGeneratorTag(engine: PdfEngine): string {
  return `Inforsol PDF ${PDF_TEMPLATE_VERSION} · engine=${engine} · env=${pdfEnvironment()}`;
}
