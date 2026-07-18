const test = require('node:test');
const assert = require('node:assert/strict');
const { isOfficialPayPalUrl } = require('../dist-electron/shared/donation.js');
const { DEFAULT_DONATION_URL } = require('../dist-electron/shared/app-config.js');

test('accepte uniquement les liens HTTPS officiels PayPal', () => {
  assert.equal(isOfficialPayPalUrl('https://www.paypal.com/donate/?hosted_button_id=ABC'), true);
  assert.equal(isOfficialPayPalUrl('https://paypal.me/example'), true);
  assert.equal(isOfficialPayPalUrl('http://paypal.me/example'), false);
  assert.equal(isOfficialPayPalUrl('https://paypal.com.example.org/donate'), false);
  assert.equal(isOfficialPayPalUrl('not-a-url'), false);
});
test('le lien par défaut cible le compte marchand en euros', () => {
  assert.equal(isOfficialPayPalUrl(DEFAULT_DONATION_URL), true);
  const url = new URL(DEFAULT_DONATION_URL);
  assert.equal(url.pathname, '/cgi-bin/webscr');
  assert.equal(url.searchParams.get('cmd'), '_donations');
  assert.equal(url.searchParams.get('business'), 'X6TNHGN5K7QA');
  assert.equal(url.searchParams.get('currency_code'), 'EUR');
});
