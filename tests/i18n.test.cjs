const test = require('node:test');
const assert = require('node:assert/strict');
const { catalogs, resolveLocale, translate, SUPPORTED_LOCALES } = require('../dist-electron/shared/i18n.js');

test('tous les catalogues contiennent toutes les traductions', () => {
  const expected = Object.keys(catalogs.fr).sort();
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(Object.keys(catalogs[locale]).sort(), expected, `catalogue incomplet: ${locale}`);
    for (const key of expected) {
      assert.ok(catalogs[locale][key].trim(), `${locale}.${key} est vide`);
      assert.notEqual(catalogs[locale][key], key, `${locale}.${key} n'est pas traduit`);
    }
  }
});

test('la langue système est normalisée avec un repli anglais', () => {
  assert.equal(resolveLocale('system', 'fr-FR'), 'fr');
  assert.equal(resolveLocale('system', 'de-DE'), 'de');
  assert.equal(resolveLocale('system', 'nl-NL'), 'en');
  assert.equal(resolveLocale('it', 'fr-FR'), 'it');
});

test('les variables sont interpolées', () => {
  assert.equal(translate('en', 'accounts.count', { count: 3 }), '3 publication(s)');
  assert.equal(translate('es', 'notification.dueBody', { title: 'Demo' }), '«Demo» está programada ahora.');
});
