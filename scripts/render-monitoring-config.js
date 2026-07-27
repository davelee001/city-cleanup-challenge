#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(
  root,
  'monitoring',
  'alertmanager',
  'config.template.yml',
);
const outputDirectory = path.join(root, 'rendered-monitoring');

const values = {
  SMTP_SMARTHOST: process.env.ALERT_SMTP_SMARTHOST,
  SMTP_FROM: process.env.ALERT_SMTP_FROM,
  SMTP_USERNAME: process.env.ALERT_SMTP_USERNAME,
  SMTP_PASSWORD: process.env.ALERT_SMTP_PASSWORD,
  TEAM_EMAIL: process.env.ALERT_TEAM_EMAIL,
  ONCALL_EMAIL: process.env.ALERT_ONCALL_EMAIL,
  SLACK_WEBHOOK_URL: process.env.ALERT_SLACK_WEBHOOK_URL,
  SLACK_CRITICAL_CHANNEL: process.env.ALERT_SLACK_CRITICAL_CHANNEL,
  SLACK_WARNING_CHANNEL: process.env.ALERT_SLACK_WARNING_CHANNEL,
  METRICS_TOKEN: process.env.METRICS_TOKEN,
};

const missing = Object.entries(values)
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missing.length) {
  console.error(`Missing monitoring configuration: ${missing.join(', ')}`);
  process.exit(2);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.TEAM_EMAIL)) {
  throw new Error('ALERT_TEAM_EMAIL must be a valid email address.');
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.ONCALL_EMAIL)) {
  throw new Error('ALERT_ONCALL_EMAIL must be a valid email address.');
}
if (new URL(values.SLACK_WEBHOOK_URL).protocol !== 'https:') {
  throw new Error('ALERT_SLACK_WEBHOOK_URL must use HTTPS.');
}
if (values.METRICS_TOKEN.length < 32) {
  throw new Error('METRICS_TOKEN must contain at least 32 characters.');
}

let rendered = fs.readFileSync(templatePath, 'utf8');
for (const [name, value] of Object.entries(values)) {
  if (name === 'METRICS_TOKEN') continue;
  const yamlSafeValue = String(value).replaceAll("'", "''");
  rendered = rendered.replaceAll(`__${name}__`, yamlSafeValue);
}
const unresolved = rendered.match(/__[A-Z0-9_]+__/g);
if (unresolved) {
  throw new Error(`Unresolved monitoring placeholders: ${unresolved.join(', ')}`);
}

fs.mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
fs.writeFileSync(
  path.join(outputDirectory, 'alertmanager.yml'),
  rendered,
  { mode: 0o600 },
);
fs.writeFileSync(
  path.join(outputDirectory, 'metrics-token'),
  values.METRICS_TOKEN,
  { mode: 0o600 },
);
console.log(`Rendered private monitoring configuration in ${outputDirectory}.`);
