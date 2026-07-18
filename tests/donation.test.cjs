const test = require('node:test');
const assert = require('node:assert/strict');
const { isOfficialPayPalUrl } = require('../dist-electron/shared/donation.js');

test('accepte uniquement les liens HTTPS officiels PayPal', () => {
  assert.equal(isOfficialPayPalUrl('https://www.paypal.com/donate/?hosted_button_id=ABC'), true);
  assert.equal(isOfficialPayPalUrl('https://paypal.me/example'), true);
  assert.equal(isOfficialPayPalUrl('http://paypal.me/example'), false);
  assert.equal(isOfficialPayPalUrl('https://paypal.com.example.org/donate'), false);
  assert.equal(isOfficialPayPalUrl('not-a-url'), false);
});
