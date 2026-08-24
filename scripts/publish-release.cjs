const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = 'zrJiY&gA3x4bsgBh';
const OWNER = 'suceunq';
const REPO = 'TikTokManager';
const VERSION = '1.5.0';
const INSTALLER_PATH = 'E:/developpement/tiktok-manager/release/TikTokManager-Setup.exe';

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getReleases() {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${OWNER}/${REPO}/releases`,
    method: 'GET',
    headers: {
      'User-Agent': 'TikTokManager-Build',
      'Accept': 'application/vnd.github.v3+json',
    }
  };
  const result = await makeRequest(options);
  return JSON.parse(result.body);
}

async function main() {
  console.log('Checking existing releases...');
  const releases = await getReleases();
  console.log('Found', releases.length, 'releases');
  
  const existing = releases.find(r => r.tag_name === `v${VERSION}`);
  if (existing) {
    console.log('Release v' + VERSION + ' already exists:', existing.html_url);
  } else {
    console.log('Release v' + VERSION + ' does not exist yet');
  }
}

main().catch(console.error);
