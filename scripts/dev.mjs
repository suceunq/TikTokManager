import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: isWin, ...opts });
  return child;
}

function waitForPort(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const req = http.get({ host: 'localhost', port, timeout: 1000 }, () => {
        req.destroy();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`Timeout waiting for port ${port}`));
        else setTimeout(tryConnect, 300);
      });
    };
    tryConnect();
  });
}

function waitForFile(filePath, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (fs.existsSync(filePath)) resolve();
      else if (Date.now() - start > timeoutMs) reject(new Error(`Timeout waiting for ${filePath}`));
      else setTimeout(check, 300);
    };
    check();
  });
}

const children = [];
function killAll() {
  for (const c of children) {
    try { c.kill(); } catch {}
  }
}
process.on('SIGINT', () => { killAll(); process.exit(0); });
process.on('exit', killAll);

async function main() {
  console.log('[dev] Démarrage du serveur Vite...');
  const vite = run(npmCmd, ['exec', '--', 'vite']);
  children.push(vite);

  console.log('[dev] Compilation du process main (tsc --watch)...');
  const tscElectron = run(npmCmd, ['exec', '--', 'tsc', '-p', 'tsconfig.electron.json', '-w', '--preserveWatchOutput']);
  children.push(tscElectron);

  await waitForPort(5173);
  console.log('[dev] Vite prêt sur http://localhost:5173');

  await waitForFile('dist-electron/electron/main.js');
  console.log('[dev] Process main compilé, lancement d\'Electron...');

  const electronBin = isWin ? 'node_modules\\.bin\\electron.cmd' : 'node_modules/.bin/electron';
  const electron = run(electronBin, ['.'], { env: { ...process.env, NODE_ENV: 'development' } });
  children.push(electron);

  electron.on('exit', () => {
    killAll();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  killAll();
  process.exit(1);
});
