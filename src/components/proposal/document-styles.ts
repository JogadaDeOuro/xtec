import type { ProposalDocConfig } from '@/lib/proposal-config';

/**
 * CSS único usado tanto na pré-visualização quanto na janela de impressão,
 * garantindo que o preview seja fiel ao PDF.
 */
export function buildDocumentCss(c: ProposalDocConfig): string {
  const b = c.branding;
  const clampScale = (v: number | undefined) => Math.min(4, Math.max(0.3, Number(v) || 1));
  const escCabecalho = clampScale(b.escalaLogoCabecalho);
  const escRodape = clampScale(b.escalaLogoRodape);
  const escCapa = clampScale(b.escalaLogoCapa);
  const shadow = b.intensidadeSombra <= 0
    ? 'none'
    : `0 ${2 * b.intensidadeSombra}px ${8 * b.intensidadeSombra}px rgba(16,40,24,${0.05 * b.intensidadeSombra})`;
  const headerBg = b.usarDegrade
    ? `linear-gradient(135deg, ${b.corSecundaria} 0%, ${b.corPrimaria} 100%)`
    : b.corPrimaria;


  return `
  .pdoc { --primaria:${b.corPrimaria}; --secundaria:${b.corSecundaria}; --destaque:${b.corDestaque};
    --texto:${b.corTexto}; --fundo:${b.corFundo}; --card:${b.corCard}; --linha:${b.corLinha};
    --raio:${b.raioCards}px; --sombra:${shadow}; --margem:${b.margemMm}mm; --rodape:${c.footer.alturaMm}mm;
    font-family:${b.fonteTextos}; color:var(--texto); font-size:11.5pt; line-height:1.55;
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .pdoc *, .pdoc *::before, .pdoc *::after { box-sizing:border-box; }
  .pdoc h1,.pdoc h2,.pdoc h3 { font-family:${b.fonteTitulos}; margin:0; }
  .pdoc-page { width:210mm; min-height:297mm; background:var(--fundo); position:relative;
    padding:var(--margem); padding-bottom:calc(var(--rodape) + 8mm); margin:0 auto 10mm;
    box-shadow:0 4px 24px rgba(0,0,0,.12); overflow:hidden; break-after:page; page-break-after:always; }
  .pdoc-page:last-child { break-after:auto; page-break-after:auto; margin-bottom:0; }
  .pdoc-page.cover { padding:0; }

  /* cabeçalho */
  .pdoc-header { display:flex; align-items:center; justify-content:space-between; gap:12px;
    margin:-2mm 0 6mm; padding-bottom:3mm; border-bottom:2px solid var(--linha); }
  .pdoc-header.faixa { background:${headerBg}; color:#fff; margin:calc(var(--margem)*-1) calc(var(--margem)*-1) 6mm;
    padding:6mm var(--margem); border-bottom:none; }
  .pdoc-header.oculto { display:none; }
  .pdoc-header .ttl { font-size:10pt; letter-spacing:.14em; text-transform:uppercase; font-weight:700; }
  .pdoc-header .meta { font-size:8.5pt; opacity:.85; text-align:right; }
  .pdoc-header img { max-height:12mm; max-width:44mm; object-fit:contain; }

  /* rodapé */
  .pdoc-footer { position:absolute; left:0; right:0; bottom:0; height:var(--rodape);
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    padding:0 var(--margem); font-size:7.8pt; color:${c.footer.corTexto};
    background:${c.footer.corFundo}; border-top:1px solid var(--linha); }
  .pdoc-footer.linha { background:transparent; }
  .pdoc-footer.oculto { display:none; }
  .pdoc-footer img { max-height:7mm; max-width:26mm; object-fit:contain; }

  /* capa */
  .pdoc-cover { position:relative; width:100%; min-height:297mm; display:flex; flex-direction:column;
    justify-content:space-between; color:#fff; background:${headerBg}; }
  .pdoc-cover .bg { position:absolute; inset:0; background-size:cover; background-position:center; }
  .pdoc-cover .mask { position:absolute; inset:0;
    background:linear-gradient(160deg, rgba(0,0,0,.15), ${b.corPrimaria}); }
  .pdoc-cover .topbar { position:relative; padding:16mm var(--margem) 0; }
  .pdoc-cover .inner { position:relative; margin-top:auto; padding:0 var(--margem) 12mm; display:flex; flex-direction:column; gap:5mm; }
  .pdoc-cover .inner.centro { align-items:center; text-align:center; }
  .pdoc-cover img.logo { max-height:20mm; max-width:70mm; object-fit:contain; }
  .pdoc-cover h1 { font-size:32pt; line-height:1.06; font-weight:800; letter-spacing:-.5px; max-width:150mm; }
  .pdoc-cover .sub { font-size:12pt; opacity:.9; max-width:140mm; }
  .pdoc-cover .cliente { margin-top:6mm; font-size:9pt; letter-spacing:.18em; text-transform:uppercase; opacity:.8; }
  .pdoc-cover .cliente strong { display:block; font-size:19pt; letter-spacing:normal; text-transform:none; opacity:1; margin-top:2mm; }
  .pdoc-cover .facts { position:relative; display:grid; grid-template-columns:repeat(3,1fr); gap:0;
    border-top:1px solid rgba(255,255,255,.28); }
  .pdoc-cover .fact { padding:7mm var(--margem); border-right:1px solid rgba(255,255,255,.18); }
  .pdoc-cover .fact:last-child { border-right:none; }
  .pdoc-cover .fact .k { font-size:8pt; text-transform:uppercase; letter-spacing:.14em; opacity:.75; }
  .pdoc-cover .fact .v { font-size:15pt; font-weight:700; margin-top:1.5mm; }

  /* seções */
  .pdoc-section { margin-bottom:7mm; break-inside:avoid; page-break-inside:avoid; }
  .pdoc-section.break { break-before:page; page-break-before:always; }
  .pdoc-section.cols2 .body { column-count:2; column-gap:8mm; }
  .pdoc-section.colorido { background:var(--card); border-radius:var(--raio); padding:5mm; }
  .pdoc-title { display:flex; align-items:center; gap:6px; font-size:12.5pt; font-weight:800;
    color:var(--primaria); text-transform:${b.estiloTitulos === 'uppercase' ? 'uppercase' : b.estiloTitulos === 'capitalize' ? 'capitalize' : 'none'};
    letter-spacing:.04em; margin-bottom:3.5mm; break-after:avoid; page-break-after:avoid; }
  .pdoc-title::before { content:''; width:5px; height:15px; border-radius:3px; background:var(--destaque); display:inline-block; }
  .pdoc p { margin:0 0 2.5mm; }
  .pdoc .muted { color:#6b7a6e; font-size:9pt; }

  /* grids e cards */
  .pdoc-grid { display:grid; gap:3.5mm; }
  .pdoc-grid.g2 { grid-template-columns:repeat(2,1fr); }
  .pdoc-grid.g3 { grid-template-columns:repeat(3,1fr); }
  .pdoc-grid.g4 { grid-template-columns:repeat(4,1fr); }
  .pdoc-card { background:var(--card); border:1px solid var(--linha); border-radius:var(--raio);
    padding:3.5mm 4mm; box-shadow:var(--sombra); break-inside:avoid; page-break-inside:avoid; }
  .pdoc-card .k { font-size:8pt; color:#6b7a6e; text-transform:uppercase; letter-spacing:.08em; }
  .pdoc-card .v { font-size:13pt; font-weight:700; margin-top:1mm; }
  .pdoc-card.hi { background:${headerBg}; color:#fff; border-color:transparent; }
  .pdoc-card.hi .k { color:rgba(255,255,255,.78); }

  /* tabelas */
  .pdoc-table { width:100%; border-collapse:collapse; font-size:9.5pt; break-inside:avoid; page-break-inside:avoid; }
  .pdoc-table th { background:var(--card); color:var(--primaria); text-align:left; font-size:8.5pt;
    text-transform:uppercase; letter-spacing:.07em; padding:2.6mm 3mm; border-bottom:1px solid var(--linha); }
  .pdoc-table td { padding:2.4mm 3mm; border-bottom:1px solid var(--linha); vertical-align:top; }
  .pdoc-table tr { break-inside:avoid; page-break-inside:avoid; }
  .pdoc-table td.num, .pdoc-table th.num { text-align:right; white-space:nowrap; }

  /* listas */
  .pdoc-list { list-style:none; padding:0; margin:0; }
  .pdoc-list li { position:relative; padding-left:6mm; margin-bottom:1.6mm; font-size:10pt; break-inside:avoid; }
  .pdoc-list li::before { content:'✓'; position:absolute; left:0; color:var(--secundaria); font-weight:800; }
  .pdoc-list.dot li::before { content:'•'; }

  /* investimento */
  .pdoc-invest { border:1px solid var(--linha); border-radius:var(--raio); overflow:hidden; break-inside:avoid; }
  .pdoc-invest .row { display:flex; justify-content:space-between; padding:2.6mm 4mm; font-size:10.5pt;
    border-bottom:1px solid var(--linha); }
  .pdoc-invest .row.total { background:${headerBg}; color:#fff; font-size:14pt; font-weight:800; border-bottom:none; }
  .pdoc-invest .row.desc { color:var(--secundaria); }

  /* barra de projeção */
  .pdoc-bars { display:flex; align-items:flex-end; gap:2mm; height:34mm; break-inside:avoid; }
  .pdoc-bars .bar { flex:1; background:${headerBg}; border-radius:3px 3px 0 0; position:relative; }
  .pdoc-bars .bar span { position:absolute; bottom:-5mm; left:0; right:0; text-align:center; font-size:6.5pt; color:#6b7a6e; }

  .pdoc-keep { break-inside:avoid; page-break-inside:avoid; }
  .pdoc-signatures { display:grid; grid-template-columns:1fr 1fr; gap:14mm; margin-top:14mm; }
  .pdoc-signatures .line { border-top:1px solid var(--texto); padding-top:2mm; font-size:9pt; text-align:center; }

  @media print {
    .pdoc-page { box-shadow:none; margin:0; width:auto; min-height:auto; }
    .no-print { display:none !important; }
  }
  `;
}

export const PRINT_PAGE_RULE = `@page { size: A4; margin: 0; }
  html, body { margin:0; padding:0; background:#fff; }`;
