const CUSTOMER_APP_ORIGIN = 'https://solarflow.inforsol.group';

export function customerUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${CUSTOMER_APP_ORIGIN}${normalizedPath}`;
}