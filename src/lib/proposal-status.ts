export function acceptanceDateForEdit(status: string, existingDate?: string, now = new Date().toISOString()): string | null {
  return existingDate ?? (status === 'aceita' ? now : null);
}