import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicProposal } from '@/lib/proposals';
import { fetchEquipment, fetchProposalSettings, type EquipmentItem } from '@/lib/proposal-settings';
import { DEFAULT_PROPOSAL_CONFIG, mergeConfig, type ProposalDocConfig } from '@/lib/proposal-config';
import { ProposalDocument, type ProposalDocData } from '@/components/proposal/ProposalDocument';
import { PRINT_PAGE_RULE } from '@/components/proposal/document-styles';
import { buildProposalDocData } from '@/lib/proposal-doc-data';
import { PDF_TEMPLATE_VERSION } from '@/lib/pdf-version';

declare global {
  interface Window {
    __PROPOSAL_PDF_READY__?: boolean;
    __PROPOSAL_PDF_ERROR__?: string;
    __PROPOSAL_PDF_META__?: Record<string, unknown>;
  }
}

/** Aguarda todas as imagens realmente decodificadas (não apenas "complete"). */
async function waitImages(root: HTMLElement): Promise<string[]> {
  const failures: string[] = [];
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(imgs.map(async img => {
    try {
      if (!img.complete) {
        await new Promise<void>((resolve, reject) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => reject(new Error('load')), { once: true });
        });
      }
      await img.decode().catch(() => undefined);
      if (!img.naturalWidth || !img.naturalHeight) throw new Error('empty');
    } catch {
      failures.push(img.currentSrc || img.src || '(sem src)');
    }
  }));
  // imagens de fundo em CSS inline (capa/galeria)
  const urls = new Set<string>();
  root.querySelectorAll<HTMLElement>('*').forEach(el => {
    const bg = getComputedStyle(el).backgroundImage;
    const m = bg && bg.match(/url\(["']?(https?:[^"')]+)["']?\)/);
    if (m) urls.add(m[1]);
  });
  await Promise.all(Array.from(urls).map(url => new Promise<void>(resolve => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve();
    im.onerror = () => { failures.push(url); resolve(); };
    im.src = url;
  })));
  return failures;
}

/**
 * Rota interna de impressão: renderiza SOMENTE o documento aprovado,
 * sem menus, botões ou modal. O Chromium server-side aguarda
 * window.__PROPOSAL_PDF_READY__ antes de gerar o PDF.
 */
export default function PropostaPrint() {
  const { token } = useParams<{ token: string }>();
  const ref = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<ProposalDocConfig | null>(null);
  const [data, setData] = useState<ProposalDocData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = token ? await fetchPublicProposal(token) : null;
        if (!p) throw new Error('Proposta não encontrada');
        let equipamentos: EquipmentItem[] = [];
        try { equipamentos = (await fetchEquipment()).filter(e => e.active); } catch { equipamentos = []; }
        const cfg = p.docConfig
          ? mergeConfig(p.docConfig as unknown as ProposalDocConfig)
          : await fetchProposalSettings().catch(() => DEFAULT_PROPOSAL_CONFIG);
        if (!active) return;
        setConfig(cfg);
        setData(buildProposalDocData(p, equipamentos));
        window.__PROPOSAL_PDF_META__ = {
          numero: p.numero, versao: p.versao, template: PDF_TEMPLATE_VERSION,
        };
      } catch (e) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : 'Falha ao carregar a proposta';
        setError(msg);
        window.__PROPOSAL_PDF_ERROR__ = msg;
      }
    })();
    return () => { active = false; };
  }, [token]);

  // sinal de pronto: dados renderizados + fontes + imagens decodificadas
  useEffect(() => {
    if (!data || !config) return;
    let active = true;
    const id = window.setTimeout(async () => {
      try { await document.fonts?.ready; } catch { /* noop */ }
      const failures = ref.current ? await waitImages(ref.current) : [];
      if (!active) return;
      if (failures.length) {
        window.__PROPOSAL_PDF_META__ = { ...window.__PROPOSAL_PDF_META__, imagensComFalha: failures };
      }
      // duplo rAF garante que o motor de paginação já aplicou o layout final
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.__PROPOSAL_PDF_READY__ = true;
      }));
    }, 350);
    return () => { active = false; window.clearTimeout(id); };
  }, [data, config]);

  if (error) {
    return <div style={{ padding: 24, fontFamily: 'sans-serif' }} data-pdf-error>{error}</div>;
  }
  if (!data || !config) return <div style={{ padding: 24 }} />;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${PRINT_PAGE_RULE}
        body { background:#fff !important; }
        .pdoc-page { box-shadow:none !important; margin:0 !important; }` }} />
      <div ref={ref}>
        <ProposalDocument config={config} data={data} />
      </div>
    </>
  );
}
