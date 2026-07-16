const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function channels(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  return new Set([...source.matchAll(/['"]([a-z]+:[A-Za-z]+)['"]/g)].map((match) => match[1]));
}

test('le preload et le contrat partagé exposent les mêmes canaux IPC', () => {
  assert.deepEqual(channels('electron/preload.ts'), channels('shared/ipc-contract.ts'));
});
