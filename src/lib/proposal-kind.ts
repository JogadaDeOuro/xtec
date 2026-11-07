import type { ProposalRecord } from '@/lib/proposals';

export type ProposalKindIcon = 'sun' | 'wrench' | 'package';

export interface ProposalKind {
  /** Curto o bastante para caber ao lado do nome. */
  label: string;
  /** Explicação completa, exibida no tooltip. */
  title: string;
  /** Classes de cor do badge (tokens do tema, sem hex fixo). */
  className: string;
  icon: ProposalKindIcon;
}

type KindInput = Pick<
  ProposalRecord,
  'tipo' | 'finalidade' | 'manutencaoRegime' | 'manutencaoVisitasAno'
>;

/**
 * Identifica a finalidade comercial da proposta: usina de consumo, usina de
 * investimento, manutenção pontual/anual ou orçamento de produtos e serviços.
 */
export function proposalKind(p: KindInput): ProposalKind {
  if (p.tipo === 'manutencao') {
    return p.manutencaoRegime === 'recorrente'
      ? {
          label: 'Manutenção Anual',
          title: `Plano anual · ${p.manutencaoVisitasAno} visita${p.manutencaoVisitasAno === 1 ? '' : 's'} por ano`,
          className: 'bg-success text-success-foreground',
          icon: 'wrench',
        }
      : {
          label: 'Manutenção Pontual',
          title: 'Serviço único',
          className: 'bg-info text-info-foreground',
          icon: 'wrench',
        };
  }

  if (p.tipo === 'personalizado') {
    return {
      label: 'Produtos e Serviços',
      title: 'Orçamento personalizado de produtos e serviços',
      className: 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/30',
      icon: 'package',
    };
  }

  return p.finalidade === 'investimento'
    ? {
        label: 'Usina de Investimento',
        title: 'Geração para renda e retorno do investimento',
        className: 'bg-warning text-warning-foreground',
        icon: 'sun',
      }
    : {
        label: 'Usina de Consumo',
        title: 'Geração para reduzir a conta de energia',
        className: 'bg-primary text-primary-foreground',
        icon: 'sun',
      };
}
