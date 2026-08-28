import type { ProposalDocConfig } from '@/lib/proposal-config';
import { buildDocumentCss, PRINT_PAGE_RULE } from '@/components/proposal/document-styles';
import { supabase } from '@/integrations/supabase/client';
import { PDF_TEMPLATE_VERSION, pdfGeneratorTag, type PdfEngine } from '@/lib/pdf-version';

const A4_W_PX = 794;  // 210mm @ 96dpi
const A4_H_PX = 1123; // 297mm @ 96dpi

export type PdfProgress =
  | 'preparando' | 'carregando-imagens' | 'gerando' | 'finalizando' | 'pronto' | 'erro';

export interface PdfResult {
  blob: Blob;
  engine: PdfEngine;
  fileName: string;
}

/**
 * Safari/WebKit (iPhone, iPad, PWA e WebViews iOS) rasteriza canvas de forma
 * inconsistente. Nesses ambientes o pipeline local é proibido.
 */
export function isAppleWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  const safariDesktop = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  return iOS || safariDesktop;
}

/** Uma única Promise ativa por proposta — impede geração duplicada. */
const inFlight = new Map<string, Promise<PdfResult>>();

/** Baixa (ou compartilha) um Blob de PDF sem revogar a URL antes da hora. */
export function deliverPdf(blob: Blob, fileName: string) {
  const name = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // o Safari precisa da URL viva enquanto abre o visualizador nativo
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * MOTOR OFICIAL: Chromium server-side.
 * O cliente envia apenas o id da proposta; o servidor carrega os dados oficiais,
 * abre a rota interna de impressão e devolve application/pdf.
 */
export async function generateProposalPdfServerSide(
  proposalId: string,
  fileName: string,
  onProgress?: (s: PdfProgress) => void,
): Promise<PdfResult> {
  const existing = inFlight.get(proposalId);
  if (existing) return existing;

  const task = (async (): Promise<PdfResult> => {
    onProgress?.('preparando');
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) throw new Error('Sessão expirada — entre novamente para gerar o PDF.');

    onProgress?.('gerando');
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-proposal-pdf`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        proposalId,
        origin: window.location.origin,
        templateVersion: PDF_TEMPLATE_VERSION,
      }),
    });

    if (!res.ok) {
      let msg = `Falha na geração do PDF (${res.status})`;
      try { msg = (await res.json())?.error ?? msg; } catch { /* noop */ }
      throw new Error(msg);
    }

    onProgress?.('finalizando');
    const raw = await res.blob();
    const blob = raw.type === 'application/pdf' ? raw : new Blob([raw], { type: 'application/pdf' });
    onProgress?.('pronto');
    return { blob, engine: 'server-chromium', fileName };
  })().finally(() => { inFlight.delete(proposalId); });

  inFlight.set(proposalId, task);
  return task;
}

/** Aguarda fontes e imagens (decodificadas de fato) antes de rasterizar. */
async function waitForAssets(root: HTMLElement) {
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* noop */ }
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(imgs.map(async img => {
    if (!img.complete) {
      await new Promise<void>(resolve => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
        setTimeout(resolve, 8000);
      });
    }
    try { await img.decode(); } catch { /* recurso opcional */ }
    if (!img.naturalWidth || !img.naturalHeight) {
      console.warn('[pdf] imagem não carregada:', img.currentSrc || img.src);
    }
  }));
}

/**
 * FALLBACK LOCAL (apenas Chromium/Firefox — nunca Safari/iOS).
 * Mantido enquanto o motor server-side não estiver validado em produção.
 */
export async function downloadProposalPdf(
  source: HTMLElement,
  config: ProposalDocConfig,
  fileName: string,
): Promise<PdfResult> {
  if (isAppleWebKit()) {
    throw new Error('Geração local desativada no Safari/iOS — use o motor server-side.');
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_W_PX}px;background:#fff;z-index:-1;`;
  const style = document.createElement('style');
  style.textContent = `${PRINT_PAGE_RULE}${buildDocumentCss(config)}
    .pdf-export { zoom:1 !important; transform:none !important; }
    .pdf-export .pdoc-measure { display:none !important; }
    .pdf-export .pdoc-page { box-shadow:none !important; margin:0 !important;
      width:${A4_W_PX}px !important; height:${A4_H_PX}px !important;
      min-height:${A4_H_PX}px !important; max-height:${A4_H_PX}px !important;
      overflow:hidden !important; }`;

  host.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'pdoc pdf-export';
  wrapper.style.width = `${A4_W_PX}px`;
  // clona o DOM real preservando estilos computados de cada nó
  Array.from(source.childNodes).forEach(n => wrapper.appendChild(n.cloneNode(true)));
  wrapper.querySelectorAll('.pdoc-measure').forEach(n => n.remove());
  host.appendChild(wrapper);
  document.body.appendChild(host);

  try {
    await waitForAssets(wrapper);
    const pages = Array.from(wrapper.querySelectorAll<HTMLElement>('.pdoc-page'));
    const targets = pages.length ? pages : [wrapper];

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    pdf.setProperties({ title: fileName, creator: pdfGeneratorTag('local-html2canvas') });

    for (let i = 0; i < targets.length; i++) {
      const canvas = await html2canvas(targets[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: A4_W_PX,
        windowHeight: A4_H_PX,
        width: A4_W_PX,
        height: A4_H_PX,
        scrollX: 0,
        scrollY: 0,
      });
      const img = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const name = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    return { blob: pdf.output('blob'), engine: 'local-html2canvas', fileName: name };
  } finally {
    host.remove();
  }
}
