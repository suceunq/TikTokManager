/**
 * Default values used for new or migrated profiles. Users can override the donation URL at
 * runtime from Settings; their choice is stored in data.json and does not require a rebuild.
 */
export const DEFAULT_DONATION_URL =
  'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=X6TNHGN5K7QA&item_name=Soutenir%20le%20developpement%20de%20TikTok%20Manager&currency_code=EUR';

/**
 * v1.3.1 incorrectly used PayPal's hosted-button endpoint with a merchant ID. Keep the exact
 * value here so existing profiles can be repaired without touching user-defined links.
 */
export const BROKEN_DONATION_URL_V131 =
  'https://www.paypal.com/donate/?business=X6TNHGN5K7QA&no_recurring=0&item_name=Soutenir%20le%20developpement%20de%20TikTok%20Manager&currency_code=EUR';

export function migrateDonationUrl(value: unknown): string {
  if (value === undefined || value === BROKEN_DONATION_URL_V131) {
    return DEFAULT_DONATION_URL;
  }
  return typeof value === 'string' ? value : DEFAULT_DONATION_URL;
}
