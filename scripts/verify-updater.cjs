// Verifie reellement le mecanisme de mise a jour GitHub (electron-updater) contre le vrai depot publie.
// A executer depuis la racine du projet :
//   ./node_modules/electron/dist/electron.exe scripts/verify-updater.cjs
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const semver = require('electron-updater/node_modules/semver');

app.whenReady().then(async () => {
  autoUpdater.autoDownload = false;
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.setFeedURL({ provider: 'github', owner: 'suceunq', repo: 'TikTokManager' });

  let echec = false;

  try {
    console.log('--- Test : version locale plus ancienne (1.0.0) -> mise a jour 1.0.1 doit etre proposee ---');
    autoUpdater.currentVersion = semver.parse('1.0.0');
    const resultat = await autoUpdater.checkForUpdates();
    const disponible = resultat && semver.gt(semver.parse(resultat.updateInfo.version), autoUpdater.currentVersion);
    if (!disponible) throw new Error('La mise a jour 1.0.1 aurait du etre detectee comme disponible');
    console.log(`OK : mise a jour ${resultat.updateInfo.version} correctement detectee comme disponible`);
  } catch (e) {
    echec = true;
    console.error('ECHEC :', e.message);
  }

  console.log(echec ? '\n=== VERIFICATION ECHOUEE ===' : '\n=== VERIFICATION REUSSIE ===');
  app.exit(echec ? 1 : 0);
});

autoUpdater.on('error', (e) => console.error('[autoUpdater error event]', e));
