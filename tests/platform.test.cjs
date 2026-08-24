const test = require('node:test');
const assert = require('node:assert/strict');
const { applyAccountMigration, allowedContentTypes, isContentTypeAllowed, isPlateforme } = require('../dist-electron/shared/compte.js');

test('les comptes créés avant YouTube deviennent des comptes TikTok', () => {
  const legacy = {
    id: 'c1', nom: 'Principal', pseudoTiktok: '@bob', couleur: '#FE2C55',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const migrated = applyAccountMigration(legacy);
  assert.equal(migrated.plateforme, 'tiktok');
  assert.equal(migrated.chaineYoutube, '');
  assert.equal(migrated.pseudoTiktok, '@bob');
  assert.equal(migrated.nom, 'Principal');
});

test('les comptes déjà migrés conservent leur plateforme', () => {
  const youtube = {
    id: 'c2', nom: 'Chaîne', plateforme: 'youtube', chaineYoutube: '@machaine',
    couleur: '#FF0000', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const migrated = applyAccountMigration(youtube);
  assert.equal(migrated.plateforme, 'youtube');
  assert.equal(migrated.chaineYoutube, '@machaine');
});

test('isPlateforme rejette les valeurs inconnues', () => {
  assert.equal(isPlateforme('tiktok'), true);
  assert.equal(isPlateforme('youtube'), true);
  assert.equal(isPlateforme('instagram'), false);
  assert.equal(isPlateforme(undefined), false);
});

test('les types de contenu autorisés dépendent de la plateforme', () => {
  assert.deepEqual(allowedContentTypes('tiktok'), ['video', 'photo', 'story']);
  assert.deepEqual(allowedContentTypes('youtube'), ['short', 'video']);
});

test('la compatibilité type/plateforme est validée', () => {
  assert.equal(isContentTypeAllowed('story', 'tiktok'), true);
  assert.equal(isContentTypeAllowed('video', 'tiktok'), true);
  assert.equal(isContentTypeAllowed('photo', 'tiktok'), true);
  assert.equal(isContentTypeAllowed('short', 'tiktok'), false);
  assert.equal(isContentTypeAllowed('photo', 'youtube'), false);
  assert.equal(isContentTypeAllowed('short', 'youtube'), true);
  assert.equal(isContentTypeAllowed('video', 'youtube'), true);
  assert.equal(isContentTypeAllowed('story', 'youtube'), false);
});
