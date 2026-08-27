import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { formatCurrency, formatNumber, type SystemType } from '@/lib/mock-data';
import {
  interpolate, type ProposalDocConfig, type SectionConfig, type TemplateVariables,
} from '@/lib/proposal-config';
import type { EquipmentItem } from '@/lib/proposal-settings';
import {
  areaEstimada, arvoresEquivalentes, percentualCompensacao, projecao, reducaoCo2Anual,
} from '@/lib/solar-calc';
import { buildDocumentCss } from './document-styles';
import {
  EXTENDED_WARRANTY_DESCRIPTION, EXTENDED_WARRANTY_YEARS, getMilestones,
  getCondicaoLabel, mapCondicaoFromLabel, parseAlt, altRows, type PaymentRow,
} from '@/lib/payment-options';
import {
  projecaoGanhos, roiTotal, rentabilidadeAnual, valorCheioMensal, type Finalidade,
} from '@/lib/investment';

export interface ProposalPaymentInfo {
  condicao: string;
  entradaValor: number;
  numParcelas: number;
  valorParcela: number;
  saldoAposEntrada: number;
  etapasPersonalizadas: { descricao: string; valor: number }[];
  /** rótulos de condições alternativas oferecidas ao cliente (ele escolhe uma) */
  alternativas?: string[];
  garantiaEstendida?: boolean;
  garantiaValor?: number;
}

export interface ProposalDocData {
  numero: string;
  data: Date;
  consultor: string;
  clientName: string;
  clientCity?: string;
  clientState?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientDocument?: string;
  concessionaria?: string;
  systemType: SystemType;
  numModulos: number;
  potenciaModuloW: number;
  potenciaKwp: number;
  producaoMensal: number;
  consumoMedio: number;
  valorBruto: number;
  valorFinal: number;
  desconto: number;
  tarifaKwh: number;
  economiaMensal: number;
  economiaAnual: number;
  paybackAnos: number;
  economiaTotal: number;
  payment: ProposalPaymentInfo;
  equipamentos?: EquipmentItem[];
  /** consumo (padrão) ou usina de investimento */
  finalidade?: Finalidade;
  /** deságio aplicado na venda da energia (usina de investimento) */
  desagioPct?: number;
}

const dateBR = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

function paybackLabel(anos: number) {
  if (!anos || anos <= 0) return '—';
  const y = Math.floor(anos);
  const m = Math.round((anos - y) * 12);
  if (y === 0) return `${m} meses`;
  return m > 0 ? `${y} ano${y > 1 ? 's' : ''} e ${m} meses` : `${y} ano${y > 1 ? 's' : ''}`;
}

export function buildVariables(c: ProposalDocConfig, d: ProposalDocData): TemplateVariables {
  return {
    cliente_nome: d.clientName,
    cliente_cidade: d.clientCity ?? '',
    cliente_estado: d.clientState ?? '',
    potencia_kwp: `${d.potenciaKwp.toFixed(2)} kWp`,
    geracao_mensal: `${formatNumber(d.producaoMensal)} kWh`,
    geracao_anual: `${formatNumber(d.producaoMensal * 12)} kWh`,
    valor_final: formatCurrency(d.valorFinal),
    economia_mensal: formatCurrency(d.economiaMensal),
    payback: paybackLabel(d.paybackAnos),
    data_proposta: dateBR(d.data),
    validade: String(c.assumptions.validadeDias),
    consultor_nome: d.consultor,
    numero_proposta: d.numero,
    empresa_nome: c.company.nomeFantasia || c.company.razaoSocial,
  };
}

interface DocBlock { id: string; node: ReactNode; newPage?: boolean }
export interface DocLayoutInfo { totalPages: number; overflow: string[] }

export function ProposalDocument({
  config, data, onLayout,
}: { config: ProposalDocConfig; data: ProposalDocData; onLayout?: (info: DocLayoutInfo) => void }) {
  const vars = useMemo(() => buildVariables(config, data), [config, data]);
  const enabled = config.sections.filter(s => s.enabled);
  const cover = enabled.find(s => s.key === 'capa');

  const t = (text: string) => interpolate(text, vars);
  const co2 = reducaoCo2Anual(data.producaoMensal * 12, config.assumptions);
  const proj = projecao(data.producaoMensal, data.valorFinal, config.assumptions);
  const valorGarantia = data.payment.garantiaValor || 0;
  const isInv = data.finalidade === 'investimento';
  const desagio = data.desagioPct ?? 0;
  const ganhoMensal = data.economiaMensal;
  const ganhoAnual = data.economiaAnual;
  const ganhos = projecaoGanhos(ganhoAnual, data.valorFinal, config.assumptions.horizonteAnos);
  const ganhoAcumulado = ganhos.length ? ganhos[ganhos.length - 1].acumulado : 0;
  const roi = roiTotal(ganhoAcumulado, data.valorFinal);
  const rentab = rentabilidadeAnual(ganhoAnual, data.valorFinal);
  const lblGanhoMes = isInv ? 'Ganho mensal' : 'Economia mensal';
  const lblGanhoAno = isInv ? 'Receita anual estimada' : 'Economia anual estimada';

  const Footer = ({ page }: { page: number }) => {
    const f = config.footer;
    const company = config.company;
    if (config.branding.estiloRodape === 'oculto') return null;
    return (
      <div className={`pdoc-footer ${config.branding.estiloRodape}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
          {f.mostrarLogo && config.branding.logoReduzido && (
            <img src={config.branding.logoReduzido} alt="" />
          )}
          <span>
            {f.mostrarRazaoSocial && (company.razaoSocial || company.nomeFantasia)}
            {f.mostrarCnpj && company.cnpj ? ` • CNPJ ${company.cnpj}` : ''}
          </span>
        </div>
        <div style={{ textAlign: 'center' }}>
          {f.mostrarContato && [company.telefone || company.whatsapp, company.email, company.site]
            .filter(Boolean).join(' • ')}
          {f.mostrarInstagram && company.instagram ? ` • ${company.instagram}` : ''}
          {f.texto ? ` • ${t(f.texto)}` : ''}
        </div>
        <div style={{ whiteSpace: 'nowrap' }}>
          {f.mostrarNumeroProposta && data.numero ? `${data.numero} ` : ''}
          {f.mostrarPaginacao && `${page}/${totalPages}`}
        </div>
      </div>
    );
  };

  const Header = () => {
    if (config.branding.estiloCabecalho === 'oculto') return null;
    const logo = config.branding.estiloCabecalho === 'faixa'
      ? (config.branding.logoEscuro || config.branding.logoPrincipal)
      : (config.branding.logoPrincipal || config.branding.logoClaro);
    return (
      <div className={`pdoc-header ${config.branding.estiloCabecalho}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
          {logo && <img src={logo} alt={config.company.nomeFantasia} />}
          <div className="ttl">{config.cover.titulo}</div>
        </div>
        <div className="meta">
          {data.numero && <div>{data.numero}</div>}
          <div>{dateBR(data.data)}</div>
        </div>
      </div>
    );
  };

  const renderPaymentRows = (condicaoOverride?: string) => {
    const p = { ...data.payment, condicao: condicaoOverride ?? data.payment.condicao };
    const rows: { label: string; value: string; strong?: boolean }[] = [];
    if (p.condicao === 'avista') {
      rows.push({ label: 'À vista antecipado', value: formatCurrency(data.valorFinal), strong: true });
    } else {
      const milestones = getMilestones(p.condicao);
      if (milestones) {
        milestones.forEach(({ label, pct }) =>
          rows.push({ label: `${label} (${pct}%)`, value: formatCurrency((data.valorFinal * pct) / 100) }));
      } else if (p.condicao === 'parcelado') {
        rows.push({ label: 'Sem entrada · 100% parcelado', value: formatCurrency(data.valorFinal) });
        rows.push({ label: `${p.numParcelas}x de (sem juros)`, value: formatCurrency(p.valorParcela), strong: true });
      } else if (p.condicao === 'entrada-saldo') {
        rows.push({ label: 'Entrada', value: formatCurrency(p.entradaValor) });
        rows.push({ label: 'Saldo na entrega', value: formatCurrency(p.saldoAposEntrada) });
      } else if (p.condicao === 'entrada-parcelas') {
        rows.push({ label: 'Entrada', value: formatCurrency(p.entradaValor) });
        rows.push({ label: `${p.numParcelas}x de`, value: formatCurrency(p.valorParcela), strong: true });
      } else if (p.condicao === 'personalizada') {
        p.etapasPersonalizadas.filter(e => e.descricao)
          .forEach(e => rows.push({ label: e.descricao, value: formatCurrency(e.valor) }));
      }
    }
    if (!rows.length) return null;
    return (
      <div className="pdoc-invest pdoc-keep">
        {rows.map((r, i) => (
          <div key={i} className="row" style={r.strong ? { fontWeight: 700 } : undefined}>
            <span>{r.label}</span><span>{r.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const eq = data.equipamentos ?? [];
  const modulos = eq.filter(e => e.category === 'modulo');
  const inversores = eq.filter(e => e.category === 'inversor' || e.category === 'microinversor');

  /* blocos reutilizáveis da seção de economia/ganhos (permitem divisão da tabela em páginas) */
  const economiaCards = (
    <div className="pdoc-grid g3">
      <div className="pdoc-card"><div className="k">Tarifa base</div><div className="v">{formatCurrency(data.tarifaKwh)}/kWh</div></div>
      <div className="pdoc-card"><div className="k">Reajuste considerado</div><div className="v">{config.assumptions.reajusteTarifarioPct}% a.a.</div></div>
      <div className="pdoc-card"><div className="k">{isInv ? 'Ganhos' : 'Economia'} em {config.assumptions.horizonteAnos} anos</div><div className="v">{formatCurrency(isInv ? ganhoAcumulado : data.economiaTotal)}</div></div>
    </div>
  );
  const economiaTable = (rows: typeof ganhos) => (
    <table className="pdoc-table" style={{ marginTop: '4mm' }}>
      <thead><tr><th>Ano</th><th className="num">Ganho no ano</th><th className="num">Acumulado</th><th className="num">ROI</th></tr></thead>
      <tbody>
        {rows.map(g => (
          <tr key={g.ano}>
            <td>{g.ano}º</td>
            <td className="num">{formatCurrency(g.receita)}</td>
            <td className="num">{formatCurrency(g.acumulado)}</td>
            <td className="num">{g.roiPct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const economiaNota = (
    <p className="muted" style={{ marginTop: '3mm' }}>
      Valores estimados, não garantidos. Premissas: produtividade de {config.assumptions.produtividadeKwhKwpMes} kWh/kWp·mês,
      degradação de {config.assumptions.degradacaoAnualPct}% ao ano e horizonte de {config.assumptions.horizonteAnos} anos.
    </p>
  );


  const renderSection = (s: SectionConfig) => {
    const body = (() => {
      switch (s.key) {
        case 'apresentacao':
          return (<>
            <p>{t(config.texts.apresentacao)}</p>
            {config.texts.diferenciais && (
              <ul className="pdoc-list">
                {t(config.texts.diferenciais).split(';').map(x => x.trim()).filter(Boolean)
                  .map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            )}
          </>);
        case 'dados_cliente':
          return (
            <div className="pdoc-grid g2">
              <div className="pdoc-card"><div className="k">Cliente</div><div className="v">{data.clientName || '—'}</div></div>
              <div className="pdoc-card"><div className="k">Local do projeto</div><div className="v">
                {[data.clientCity, data.clientState].filter(Boolean).join(' / ') || '—'}</div></div>
              {data.clientDocument && <div className="pdoc-card"><div className="k">Documento</div><div className="v">{data.clientDocument}</div></div>}
              {data.clientPhone && <div className="pdoc-card"><div className="k">Contato</div><div className="v">{data.clientPhone}</div></div>}
              {data.clientEmail && <div className="pdoc-card"><div className="k">E-mail</div><div className="v" style={{ fontSize: '10pt' }}>{data.clientEmail}</div></div>}
              {data.concessionaria && <div className="pdoc-card"><div className="k">Concessionária</div><div className="v">{data.concessionaria}</div></div>}
            </div>
          );
        case 'resumo_executivo':
          return (
            <div className="pdoc-grid g3">
              <div className="pdoc-card hi"><div className="k">Potência instalada</div><div className="v">{data.potenciaKwp.toFixed(2)} kWp</div></div>
              <div className="pdoc-card"><div className="k">Geração média</div><div className="v">{formatNumber(data.producaoMensal)} kWh/mês</div></div>
              <div className="pdoc-card"><div className="k">Investimento</div><div className="v">{formatCurrency(data.valorFinal)}</div></div>
              <div className="pdoc-card"><div className="k">{lblGanhoMes}</div><div className="v">{formatCurrency(ganhoMensal)}</div></div>
              <div className="pdoc-card"><div className="k">Payback estimado</div><div className="v">{paybackLabel(data.paybackAnos)}</div></div>
              <div className="pdoc-card"><div className="k">Modalidade</div><div className="v">{isInv ? 'USINA DE INVESTIMENTO' : data.systemType.toUpperCase()}</div></div>
            </div>
          );
        case 'consumo_atual':
          return (
            <div className="pdoc-grid g3">
              <div className="pdoc-card"><div className="k">Consumo médio</div><div className="v">{formatNumber(data.consumoMedio)} kWh/mês</div></div>
              <div className="pdoc-card"><div className="k">Tarifa considerada</div><div className="v">{formatCurrency(data.tarifaKwh)}/kWh</div></div>
              {isInv
                ? <div className="pdoc-card"><div className="k">Deságio na venda</div><div className="v">{desagio}%</div></div>
                : <div className="pdoc-card"><div className="k">Compensação estimada</div><div className="v">{percentualCompensacao(data.producaoMensal, data.consumoMedio)}%</div></div>}
            </div>
          );
        case 'dimensionamento':
          return (<>
            <div className="pdoc-grid g4">
              <div className="pdoc-card"><div className="k">Módulos</div><div className="v">{data.numModulos} un.</div></div>
              <div className="pdoc-card"><div className="k">Potência unitária</div><div className="v">{data.potenciaModuloW} Wp</div></div>
              <div className="pdoc-card"><div className="k">Potência instalada</div><div className="v">{data.potenciaKwp.toFixed(2)} kWp</div></div>
              <div className="pdoc-card"><div className="k">Área estimada</div><div className="v">{areaEstimada(data.numModulos, config.assumptions)} m²</div></div>
            </div>
            <p className="muted" style={{ marginTop: '3mm' }}>
              Potência instalada = {data.numModulos} módulos × {data.potenciaModuloW} Wp ÷ 1.000 = {data.potenciaKwp.toFixed(2)} kWp.
            </p>
          </>);
        case 'geracao':
          return (
            <div className="pdoc-grid g3">
              <div className="pdoc-card"><div className="k">Geração mensal</div><div className="v">{formatNumber(data.producaoMensal)} kWh</div></div>
              <div className="pdoc-card"><div className="k">Geração anual</div><div className="v">{formatNumber(data.producaoMensal * 12)} kWh</div></div>
              <div className="pdoc-card"><div className="k">Produtividade</div><div className="v">{config.assumptions.produtividadeKwhKwpMes} kWh/kWp·mês</div></div>
            </div>
          );
        case 'equipamentos':
          return eq.length ? (
            <table className="pdoc-table">
              <thead><tr>
                <th>Item</th><th>Fabricante / Modelo</th><th className="num">Potência</th><th className="num">Qtd.</th>
              </tr></thead>
              <tbody>
                {eq.map(item => (
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td>{[item.manufacturer, item.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="num">{item.potenciaW ? `${item.potenciaW} W` : '—'}</td>
                    <td className="num">{item.category === 'modulo' ? data.numModulos : 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="pdoc-table">
              <thead><tr><th>Item</th><th>Descrição</th><th className="num">Qtd.</th></tr></thead>
              <tbody>
                <tr><td>Módulos fotovoltaicos</td><td>{modulos[0] ? `${modulos[0].manufacturer} ${modulos[0].model}` : `${data.potenciaModuloW} Wp`}</td><td className="num">{data.numModulos}</td></tr>
                <tr><td>Inversor</td><td>{inversores[0] ? `${inversores[0].manufacturer} ${inversores[0].model}` : 'Compatível com a potência do sistema, com monitoramento'}</td><td className="num">1</td></tr>
                <tr><td>Estrutura de fixação</td><td>Alumínio anodizado e parafusos inox</td><td className="num">1 kit</td></tr>
                <tr><td>Cabeamento e conectores</td><td>Cabo solar, conectores MC4 e eletrodutos</td><td className="num">1 kit</td></tr>
                <tr><td>Proteções CC / CA</td><td>String box, DPS e disjuntores dimensionados</td><td className="num">1 kit</td></tr>
                <tr><td>Monitoramento</td><td>Acompanhamento remoto da geração</td><td className="num">1</td></tr>
              </tbody>
            </table>
          );
        case 'escopo_incluso':
          return (
            <ul className="pdoc-list">
              {t(config.texts.escopoPadrao).split(';').map(x => x.trim()).filter(Boolean)
                .map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          );
        case 'nao_inclusos':
          return (
            <ul className="pdoc-list dot">
              {t(config.texts.naoInclusos).split(';').map(x => x.trim()).filter(Boolean)
                .map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          );
        case 'retorno':
          return (<>
            <div className="pdoc-invest">
              <div className="row"><span>Valor do sistema</span><span>{formatCurrency(data.valorBruto)}</span></div>
              {data.desconto > 0 && (
                <div className="row desc"><span>Desconto</span><span>-{formatCurrency(data.valorBruto - data.valorFinal)}</span></div>
              )}
              {data.payment.garantiaEstendida && valorGarantia > 0 && (
                <div className="row"><span>Garantia estendida ({EXTENDED_WARRANTY_YEARS} anos)</span><span>{formatCurrency(valorGarantia)}</span></div>
              )}
              {isInv && (
                <div className="row"><span>Energia vendida com deságio de {desagio}%</span><span>{formatCurrency(valorCheioMensal(data.producaoMensal, data.tarifaKwh))}/mês na tarifa cheia</span></div>
              )}
              <div className="row total">
                <span>{lblGanhoAno}</span>
                <span>{formatCurrency(ganhoAnual)}</span>
              </div>
            </div>
            <div className="pdoc-grid g2" style={{ marginTop: '4mm' }}>
              <div className="pdoc-card hi"><div className="k">{lblGanhoMes}</div><div className="v">{formatCurrency(ganhoMensal)}</div></div>
              <div className="pdoc-card hi"><div className="k">Payback simples</div><div className="v">{paybackLabel(data.paybackAnos)}</div></div>
              {isInv && <div className="pdoc-card hi"><div className="k">Rentabilidade</div><div className="v">{rentab}% a.a.</div></div>}
              {isInv && <div className="pdoc-card hi"><div className="k">ROI em {config.assumptions.horizonteAnos} anos</div><div className="v">{roi}%</div></div>}
            </div>


          </>);
        case 'economia':
          return (<>
            {economiaCards}
            {isInv && economiaTable(ganhos)}
            {economiaNota}
          </>);
        case 'projecao':
          return (<>
            <div className="pdoc-bars">
              {(isInv
                ? ganhos.map(g => ({ ano: g.ano, acumulado: g.acumulado }))
                : proj).filter((_, i) => i % Math.max(1, Math.round(proj.length / 12)) === 0).map(p => {
                const serie = isInv ? ganhos : proj;
                const max = serie[serie.length - 1]?.acumulado || 1;
                return <div key={p.ano} className="bar" style={{ height: `${Math.max(4, (p.acumulado / max) * 100)}%` }}><span>{p.ano}º</span></div>;
              })}
            </div>
            <p className="muted" style={{ marginTop: '7mm' }}>{isInv ? 'Ganhos acumulados' : 'Economia acumulada'} estimados ao longo de {config.assumptions.horizonteAnos} anos.</p>
          </>);
        case 'impacto_ambiental':
          return (
            <div className="pdoc-grid g2">
              <div className="pdoc-card"><div className="k">CO₂ evitado por ano</div><div className="v">{formatNumber(co2)} kg</div></div>
              <div className="pdoc-card"><div className="k">Equivalente a</div><div className="v">{formatNumber(arvoresEquivalentes(co2))} árvores/ano</div></div>
            </div>
          );
        case 'pagamento':
          return (<>
            {(() => {
              const alts = (data.payment.alternativas ?? []).filter(Boolean).map(parseAlt).filter(a => a.value);
              if (!alts.length) return renderPaymentRows();
              const opcoes: { cond: string; rows?: PaymentRow[] }[] = [
                { cond: data.payment.condicao },
                ...alts.filter(a => a.value !== data.payment.condicao)
                  .map(a => ({ cond: a.value, rows: altRows(a, data.valorFinal) })),
              ];
              return (
                <div className="pdoc-options">
                  {opcoes.map((op, i) => (
                    <div key={op.cond + i} className="pdoc-option pdoc-keep">
                      {i > 0 && <div className="ou">ou</div>}
                      <div className="opt-title">Opção {i + 1} — {getCondicaoLabel(op.cond)}</div>
                      {op.rows
                        ? (
                          <div className="pdoc-invest pdoc-keep">
                            {op.rows.map((r, ri) => (
                              <div key={ri} className="row" style={r.strong ? { fontWeight: 700 } : undefined}>
                                <span>{r.label}</span><span>{formatCurrency(r.value)}</span>
                              </div>
                            ))}
                          </div>
                        )
                        : renderPaymentRows(op.cond)}
                    </div>
                  ))}
                  <p className="muted" style={{ marginTop: '2.5mm' }}>
                    O cliente poderá escolher uma das opções acima no momento do aceite da proposta.
                  </p>
                </div>
              );
            })()}
            {data.payment.garantiaEstendida && (
              <p className="muted" style={{ marginTop: '3mm' }}>
                Garantia estendida contratada por {EXTENDED_WARRANTY_YEARS} anos: {formatCurrency(valorGarantia)} — {EXTENDED_WARRANTY_DESCRIPTION}
              </p>
            )}
          </>);
        case 'galeria': {
          const itens = (config.gallery?.itens ?? []).filter(i => i.url);
          if (!itens.length) return null;
          const cols = config.gallery?.colunas === 2 ? 2 : 3;
          return (<>
            {config.gallery?.descricao && <p className="muted">{t(config.gallery.descricao)}</p>}
            <div className={`pdoc-gallery c${cols}`}>
              {itens.map(item => (
                <figure key={item.id} className="pdoc-gitem">
                  <div className="ph"><img src={item.url} alt={item.titulo || 'Projeto entregue'} /></div>
                  {config.gallery?.mostrarTitulos !== false && (item.titulo || item.descricao) && (
                    <figcaption>
                      {item.titulo && <span className="t">{item.titulo}</span>}
                      {item.descricao && <span className="d">{item.descricao}</span>}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </>);
        }
        case 'cronograma':
          return (
            <table className="pdoc-table">
              <thead><tr><th>Etapa</th><th>Prazo estimado</th></tr></thead>
              <tbody>
                <tr><td>Assinatura e projeto elétrico</td><td>até 5 dias úteis</td></tr>
                <tr><td>Solicitação de acesso à concessionária</td><td>até 10 dias úteis</td></tr>
                <tr><td>Entrega dos equipamentos</td><td>10 a 20 dias úteis</td></tr>
                <tr><td>Instalação e comissionamento</td><td>2 a 5 dias úteis</td></tr>
                <tr><td>Vistoria e troca do medidor</td><td>conforme concessionária</td></tr>
              </tbody>
            </table>
          );
        case 'garantias': {
          const linhas: string[] = [];
          modulos.forEach(m => linhas.push(
            `${m.manufacturer} ${m.model}: ${m.warrantyDefectYears} anos contra defeitos e ${m.warrantyPerformanceYears} anos de performance`));
          inversores.forEach(m => linhas.push(
            `${m.manufacturer} ${m.model}: ${m.warrantyDefectYears} anos de garantia do fabricante`));
          if (!linhas.length) linhas.push('Garantias conforme certificados dos fabricantes dos equipamentos instalados');
          linhas.push('Instalação: 1 ano de garantia de serviço (disjuntores, segurança elétrica e limpeza)');
          if (data.payment.garantiaEstendida)
            linhas.push(`Garantia estendida contratada: +${EXTENDED_WARRANTY_YEARS} anos de cobertura e manutenções preventivas`);
          return (<>
            <p>{t(config.texts.garantias)}</p>
            <ul className="pdoc-list">{linhas.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </>);
        }
        case 'manutencao':
          return <p>{t(config.texts.manutencao)}</p>;
        case 'observacoes':
          return (<>
            <p>{t(config.texts.observacoes)}</p>
            {config.texts.exclusoes && <p className="muted">{t(config.texts.exclusoes)}</p>}
            {config.texts.responsabilidades && <p className="muted">{t(config.texts.responsabilidades)}</p>}
          </>);
        case 'validade':
          return <p>{t(config.texts.validade)}</p>;
        case 'aceite':
          return <p>{t(config.texts.aceite)}</p>;
        case 'assinaturas':
          return (
            <div className="pdoc-signatures">
              <div className="line">{data.clientName || 'Cliente'}</div>
              <div className="line">{config.company.responsavel || config.company.razaoSocial}</div>
            </div>
          );
        default:
          return s.content ? <p style={{ whiteSpace: 'pre-wrap' }}>{t(s.content)}</p> : null;
      }
    })();

    if (!body) return null;
    return wrapSection(s, body);
  };

  /* ---------- composição determinística de páginas ---------- */
  const blocks: DocBlock[] = [];
  for (const s of enabled) {
    if (s.key === 'capa') continue;
    const before = blocks.length;
    if (s.key === 'economia' && isInv && ganhos.length > 8) {
      const size = 10;
      blocks.push({ id: `${s.id}-cards`, node: wrapSection(s, economiaCards) });
      for (let i = 0; i < ganhos.length; i += size) {
        blocks.push({
          id: `${s.id}-t${i}`,
          node: wrapSection(s, economiaTable(ganhos.slice(i, i + size)),
            i === 0 ? `${s.title} — projeção ano a ano` : `${s.title} — projeção (continuação)`),
        });
      }
      blocks.push({ id: `${s.id}-nota`, node: wrapSection(s, economiaNota, null) });
    } else {
      const node = renderSection(s);
      if (node) blocks.push({ id: s.id, node });
    }
    if (s.newPage && blocks.length > before) blocks[before].newPage = true;
  }

  const measureRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef('');
  const [layout, setLayout] = useState<{ pages: number[][]; over: number[] }>({ pages: [], over: [] });

  useLayoutEffect(() => {
    const host = measureRef.current;
    if (!host) return;
    const probe = host.querySelector<HTMLElement>('.mm-probe');
    const mm = probe ? probe.getBoundingClientRect().height / 100 : 96 / 25.4;
    if (!mm) return;
    const headerEl = host.querySelector<HTMLElement>('.pdoc-header');
    const headerH = headerEl ? headerEl.getBoundingClientRect().height + 6 * mm : 0;
    const margem = config.branding.margemMm;
    const rodapeMm = config.branding.estiloRodape === 'oculto' ? 0 : config.footer.alturaMm;
    const avail = (297 - margem * 2 - rodapeMm - 2) * mm - headerH;
    const els = Array.from(host.querySelectorAll<HTMLElement>(':scope > .pdoc-mblock'));
    const hs = els.map(e => e.getBoundingClientRect().height);
    if (hs.length !== blocks.length || avail <= 0) return;

    const pages: number[][] = [];
    let cur: number[] = [];
    let used = 0;
    hs.forEach((h, i) => {
      if (cur.length && (blocks[i].newPage || used + h > avail)) { pages.push(cur); cur = []; used = 0; }
      cur.push(i);
      used += h;
    });
    if (cur.length) pages.push(cur);
    const over = hs.map((h, i) => (h > avail ? i : -1)).filter(i => i >= 0);

    const key = JSON.stringify({ pages, over });
    if (key !== lastRef.current) { lastRef.current = key; setLayout({ pages, over }); }
  });

  const pages = layout.pages;
  const totalPages = pages.length + (cover ? 1 : 0);
  const overflowIds = layout.over.map(i => blocks[i]?.id).filter(Boolean) as string[];

  useEffect(() => {
    onLayout?.({ totalPages, overflow: overflowIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, overflowIds.join('|')]);

  const cv = config.cover;
  const coverImg = cv.imagemFundo || config.branding.imagemCapa;


  return (
    <div className="pdoc">
      <style dangerouslySetInnerHTML={{ __html: buildDocumentCss(config) }} />

      {cover && (
        <div className="pdoc-page cover">
          <div className="pdoc-cover">
            {coverImg && <div className="bg" style={{ backgroundImage: `url(${coverImg})` }} />}
            {cv.mascara && <div className="mask" style={{ opacity: cv.mascaraIntensidade }} />}
            {cv.mostrarLogo && (config.branding.logoEscuro || config.branding.logoPrincipal) && (
              <div className="topbar" style={cv.alinhamento === 'centro' ? { textAlign: 'center' } : undefined}>
                <img className="logo" src={config.branding.logoEscuro || config.branding.logoPrincipal} alt="" />
              </div>
            )}
            <div className={`inner ${cv.alinhamento}`}>
              <h1>{cv.titulo}</h1>
              {cv.subtitulo && <div className="sub">{cv.subtitulo}</div>}
              {cv.mostrarCliente && data.clientName && (
                <div className="cliente">Preparado para<strong>{data.clientName}</strong></div>
              )}
              {cv.mostrarLocal && (data.clientCity || data.clientState) && (
                <div className="sub">{[data.clientCity, data.clientState].filter(Boolean).join(' / ')}</div>
              )}
            </div>
            <div className="facts">
              {cv.mostrarPotencia && (
                <div className="fact"><div className="k">Potência</div><div className="v">{data.potenciaKwp.toFixed(2)} kWp</div></div>
              )}
              {cv.mostrarGeracao && (
                <div className="fact"><div className="k">Geração média</div><div className="v">{formatNumber(data.producaoMensal)} kWh/mês</div></div>
              )}
              <div className="fact">
                {cv.mostrarNumero && data.numero && <div className="k">{data.numero}</div>}
                {cv.mostrarData && <div className="v" style={{ fontSize: '11pt' }}>{dateBR(data.data)}</div>}
                {cv.mostrarConsultor && data.consultor && <div className="k">Consultor: {data.consultor}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {pages.map((page, idx) => (
        <div className="pdoc-page" key={idx}>
          <Header />
          {page.sections.map(renderSection)}
          <Footer page={idx + (cover ? 2 : 1)} />
        </div>
      ))}
    </div>
  );
}
