import type { ProposalDocConfig } from '@/lib/proposal-config';
import { buildDocumentCss, PRINT_PAGE_RULE } from '@/components/proposal/document-styles';

const A4_W_PX = 794;  // 210mm @ 96dpi
const A4_H_PX = 1123; // 297mm @ 96dpi

/** Aguarda fontes e imagens ficarem prontas para renderização determinística. */
async function waitForAssets(root: HTMLElement) {
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* noop */ }
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    img.crossOrigin = 'anonymous';
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>(resolve => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
      setTimeout(resolve, 6000);
    });
  }));
}

/**
 * Gera um arquivo PDF A4 real (não depende da impressora do navegador).
 * O documento é clonado em um container offscreen com largura fixa de A4,
 * portanto o resultado é idêntico no desktop e no celular.
 */
export async function downloadProposalPdf(
  source: HTMLElement,
  config: ProposalDocConfig,
  fileName: string,
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_W_PX}px;background:#fff;z-index:-1;`;
  const style = document.createElement('style');
  style.textContent = `${PRINT_PAGE_RULE}${buildDocumentCss(config)}
    .pdf-export .pdoc-page { box-shadow:none !important; margin:0 !important; }`;
  host.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'pdoc pdf-export';
  wrapper.style.width = `${A4_W_PX}px`;
  wrapper.innerHTML = source.innerHTML;
  host.appendChild(wrapper);
  document.body.appendChild(host);

  try {
    await waitForAssets(wrapper);
    const pages = Array.from(wrapper.querySelectorAll<HTMLElement>('.pdoc-page'));
    const targets = pages.length ? pages : [wrapper];

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

    for (let i = 0; i < targets.length; i++) {
      const canvas = await html2canvas(targets[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: A4_W_PX,
        width: A4_W_PX,
        height: Math.max(A4_H_PX, targets[i].scrollHeight),
      });
      const img = canvas.toDataURL('image/jpeg', 0.92);
      if (i > 0) pdf.addPage();
      // ajusta a altura mantendo a proporção; conteúdos maiores que A4 são reduzidos
      const ratio = canvas.height / canvas.width;
      const h = Math.min(297, 210 * ratio);
      pdf.addImage(img, 'JPEG', 0, 0, 210, h, undefined, 'FAST');
    }

    pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  } finally {
    host.remove();
  }
}
