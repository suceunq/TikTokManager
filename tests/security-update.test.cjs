const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  isAllowedExternalWindow,
  isTrustedRendererUrl,
} = require('../dist-electron/electron/security.js');
const {
  cleanRecoveryPlan,
  prepareRecoveryPlan,
  sha512Base64,
  verifySha512,
} = require('../dist-electron/electron/update-recovery.js');

test('la fenêtre externe accepte uniquement la composition Gmail attendue', () => {
  assert.equal(isAllowedExternalWindow('https://mail.google.com/mail/?view=cm&fs=1&to=test'), true);
  assert.equal(isAllowedExternalWindow('https://mail.google.com.evil.example/mail/?view=cm&fs=1'), false);
  assert.equal(isAllowedExternalWindow('https://mail.google.com/mail/?view=cm'), false);
  assert.equal(isAllowedExternalWindow('javascript:alert(1)'), false);
});

test('les IPC acceptent uniquement le renderer local principal', () => {
  assert.equal(isTrustedRendererUrl('http://localhost:5173/#/', false, 'C:\\app'), true);
  assert.equal(isTrustedRendererUrl('http://127.0.0.1:5173/', false, 'C:\\app'), false);
  const appPath = path.join('C:\\', 'Program Files', 'TikTok Manager', 'resources', 'app.asar');
  const indexUrl = `file:///${path.join(appPath, 'dist', 'index.html').replaceAll('\\', '/')}`;
  assert.equal(isTrustedRendererUrl(indexUrl, true, appPath), true);
  assert.equal(isTrustedRendererUrl('https://example.com/index.html', true, appPath), false);
});

test('le contrôle SHA-512 détecte toute altération du paquet', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tiktok-update-hash-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'update.exe');
  await fs.writeFile(file, 'contenu authentique');
  const expected = crypto.createHash('sha512').update('contenu authentique').digest('base64');
  assert.equal(await sha512Base64(file), expected);
  await verifySha512(file, expected);
  await fs.writeFile(file, 'contenu altéré');
  await assert.rejects(verifySha512(file, expected), /SHA-512 mismatch/);
});

test('la préparation du rollback copie l’installation hors de son dossier', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tiktok-update-recovery-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const installDir = path.join(root, 'installed');
  const recoveryRoot = path.join(root, 'recovery');
  const executablePath = path.join(installDir, 'TikTok Manager.exe');
  const guard = path.join(root, 'guard.ps1');
  await fs.mkdir(installDir);
  await fs.writeFile(executablePath, 'ancienne version');
  await fs.writeFile(guard, 'exit 0');

  const plan = await prepareRecoveryPlan({
    installDir,
    executablePath,
    recoveryRoot,
    guardScriptSource: guard,
    logPath: path.join(root, 'updater.log'),
    targetVersion: '1.4.0',
  });
  assert.equal(await fs.readFile(path.join(plan.backupDir, 'TikTok Manager.exe'), 'utf8'), 'ancienne version');
  assert.equal(path.dirname(plan.backupDir), recoveryRoot);
  await cleanRecoveryPlan(plan);
  await assert.rejects(fs.stat(plan.backupDir), { code: 'ENOENT' });
});
