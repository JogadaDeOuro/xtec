import {
  type ContractTemplateContent,
  parseContractBody,
  renderTemplateText,
  inlineToHtml,
} from '@/lib/contract-template';

interface Props {
  template: ContractTemplateContent;
  vars: Record<string, string>;
  logoUrl?: string;
  accent?: string;
  /** Bloco de assinaturas renderizado pelo consumidor */
  signatures?: React.ReactNode;
  cityLine?: string;
}

export function ContractDocument({ template, vars, logoUrl, accent = '#f97316', signatures, cityLine }: Props) {
  const blocks = parseContractBody(renderTemplateText(template.body, vars));
  const footerLines = renderTemplateText(template.footerText, vars).split('\n').filter(Boolean);

  return (
    <div className="text-xs leading-relaxed text-foreground">
      <div style={{ textAlign: 'center', borderBottom: `2px solid ${accent}`, paddingBottom: '16px', marginBottom: '20px' }}>
        {logoUrl && <img src={logoUrl} alt="" style={{ height: '48px', marginBottom: '8px', display: 'inline-block' }} />}
        <h1 style={{ fontSize: '18px', fontWeight: 700 }}>{renderTemplateText(template.headerTitle, vars)}</h1>
        <p style={{ fontSize: '10px', color: '#666' }}>{renderTemplateText(template.headerSubtitle, vars)}</p>
      </div>

      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return (
            <h2 key={i} style={{ fontSize: '12px', fontWeight: 700, color: accent, margin: '14px 0 4px', textTransform: 'uppercase' }}>
              {b.text}
            </h2>
          );
        }
        if (b.type === 'list') {
          return (
            <ul key={i} style={{ paddingLeft: '18px', marginBottom: '8px' }}>
              {b.items.map((it, j) => (
                <li key={j} style={{ marginBottom: '2px' }} dangerouslySetInnerHTML={{ __html: inlineToHtml(it) }} />
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ marginBottom: '6px' }} dangerouslySetInnerHTML={{ __html: inlineToHtml(b.text) }} />
        );
      })}

      {cityLine && (
        <p style={{ textAlign: 'center', margin: '20px 0 10px', fontSize: '11px' }}>{cityLine}</p>
      )}

      {signatures}

      {footerLines.length > 0 && (
        <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #ddd', paddingTop: '10px', fontSize: '9px', color: '#888' }}>
          {footerLines.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      )}
    </div>
  );
}
