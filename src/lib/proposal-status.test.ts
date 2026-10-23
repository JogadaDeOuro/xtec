import { expect, it } from 'vitest';
import { acceptanceDateForEdit } from './proposal-status';
it('preserves the original acceptance date on edits and PDF synchronization', () => {
  expect(acceptanceDateForEdit('aceita', '2026-10-01T12:00:00Z', '2026-10-23T18:00:00Z')).toBe('2026-10-01T12:00:00Z');
});
it('ordinary draft edits do not invent an acceptance date', () => {
  expect(acceptanceDateForEdit('rascunho', undefined, '2026-10-23T18:00:00Z')).toBeNull();
});