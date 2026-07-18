const test = require('node:test');
const assert = require('node:assert/strict');
const { isOfficialPayPalUrl } = require('../dist-electron/shared/donation.js');
const {
  BROKEN_DONATION_URL_V131,
  DEFAULT_DONATION_URL,
  migrateDonationUrl,
} = require('../dist-electron/shared/app-config.js');

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

test('remplace uniquement le lien PayPal cassé de la version 1.3.1', () => {
  assert.equal(migrateDonationUrl(undefined), DEFAULT_DONATION_URL);
  assert.equal(migrateDonationUrl(BROKEN_DONATION_URL_V131), DEFAULT_DONATION_URL);
  assert.equal(migrateDonationUrl(''), '');
  assert.equal(migrateDonationUrl('https://paypal.me/example'), 'https://paypal.me/example');
});
