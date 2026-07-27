#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('Run the Expo web export before preparing the web build.');
}

let html = fs.readFileSync(indexPath, 'utf8');
const headElements = [
  '<meta name="theme-color" content="#07182D" />',
  '<meta name="description" content="Submit verified cleanup evidence and track community impact." />',
  '<link rel="manifest" href="/manifest.json" />',
  '<link rel="icon" href="/icon.svg" type="image/svg+xml" />',
];

for (const element of headElements) {
  if (!html.includes(element)) {
    html = html.replace('</head>', `    ${element}\n  </head>`);
  }
}

html = html.replace(
  /<title>[^<]*<\/title>/,
  '<title>City Cleanup Challenge</title>',
);
fs.writeFileSync(indexPath, html);
console.log('Prepared installable City Cleanup web metadata.');
