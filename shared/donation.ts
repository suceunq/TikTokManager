export function isOfficialPayPalUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();
    const officialDomain = hostname === 'paypal.com' || hostname.endsWith('.paypal.com') || hostname === 'paypal.me' || hostname.endsWith('.paypal.me');
    return url.protocol === 'https:' && officialDomain;
  } catch {
    return false;
  }
}
