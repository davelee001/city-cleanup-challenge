#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function read(relativePath) {
  const filePath = path.join(dist, relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`Missing web artifact: ${relativePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

const index = read('index.html');
const manifest = JSON.parse(read('manifest.json'));
const serviceWorker = read('service-worker.js');

if (!index.includes('rel="manifest" href="/manifest.json"')) {
  throw new Error('The web page does not link its application manifest.');
}
if (!index.includes('name="theme-color" content="#07182D"')) {
  throw new Error('The web page does not declare the release theme color.');
}
if (
  manifest.display !== 'standalone'
  || manifest.start_url !== '/'
  || manifest.scope !== '/'
  || !Array.isArray(manifest.icons)
  || manifest.icons.length === 0
) {
  throw new Error('The application manifest is incomplete.');
}
for (const icon of manifest.icons) {
  const iconPath = String(icon.src || '').replace(/^\//, '');
  if (!iconPath || !fs.existsSync(path.join(dist, iconPath))) {
    throw new Error(`Manifest icon is missing: ${icon.src}`);
  }
}
if (
  !serviceWorker.includes("requestUrl.pathname.startsWith('/api/')")
  || serviceWorker.includes('/api/sync')
) {
  throw new Error('The service worker must bypass API requests and avoid fake sync endpoints.');
}

console.log('PWA manifest, install metadata, icon, and offline shell are valid.');
