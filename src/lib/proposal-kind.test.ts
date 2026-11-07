import { expect, it } from 'vitest';
import { proposalKind } from './proposal-kind';

const base = {
  finalidade: 'consumo',
  manutencaoRegime: 'pontual',
  manutencaoVisitasAno: 1,
} as const;

it('marks an investment plant proposal as Usina de Investimento', () => {
  const kind = proposalKind({ ...base, tipo: 'usina', finalidade: 'investimento' });
  expect(kind.label).toBe('Usina de Investimento');
  expect(kind.className).toBe('bg-warning text-warning-foreground');
  expect(kind.icon).toBe('sun');
});

it('marks a self-consumption plant proposal as Usina de Consumo', () => {
  expect(proposalKind({ ...base, tipo: 'usina' }).label).toBe('Usina de Consumo');
});

it('distinguishes one-off maintenance from the annual plan', () => {
  expect(proposalKind({ ...base, tipo: 'manutencao' }).label).toBe('Manutenção Pontual');
  const anual = proposalKind({
    ...base,
    tipo: 'manutencao',
    manutencaoRegime: 'recorrente',
    manutencaoVisitasAno: 4,
  });
  expect(anual.label).toBe('Manutenção Anual');
  expect(anual.title).toBe('Plano anual · 4 visitas por ano');
});

it('marks a custom quote as Produtos e Serviços', () => {
  const kind = proposalKind({ ...base, tipo: 'personalizado' });
  expect(kind.label).toBe('Produtos e Serviços');
  expect(kind.icon).toBe('package');
});
