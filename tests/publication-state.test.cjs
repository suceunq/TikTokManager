const test = require('node:test');
const assert = require('node:assert/strict');
const { resetForReschedule } = require('../dist-electron/electron/publication-state.js');

function publication() {
  return {
    scheduledAt: '2026-07-16T10:00:00.000Z',
    statut: 'publie',
    publishedAt: '2026-07-16T10:01:00.000Z',
    preReminderSentAt: '2026-07-16T09:45:00.000Z',
  };
}

test('replanifier remet le statut et les rappels à zéro', () => {
  const value = publication();
  resetForReschedule(value, '2026-07-17T10:00:00.000Z');
  assert.equal(value.statut, 'planifie');
  assert.equal(value.publishedAt, null);
  assert.equal(value.preReminderSentAt, null);
});

test('modifier sans changer la date conserve le statut', () => {
  const value = publication();
  resetForReschedule(value, value.scheduledAt);
  assert.equal(value.statut, 'publie');
  assert.notEqual(value.publishedAt, null);
});
