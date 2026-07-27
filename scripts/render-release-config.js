#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const values = {
  DEPLOY_NAMESPACE: process.env.DEPLOY_NAMESPACE,
  PUBLIC_APP_HOST: process.env.PUBLIC_APP_HOST,
  PUBLIC_API_HOST: process.env.PUBLIC_API_HOST,
  TLS_CONTACT_EMAIL: process.env.TLS_CONTACT_EMAIL,
  AZURE_WORKLOAD_IDENTITY_CLIENT_ID: process.env.AZURE_WORKLOAD_IDENTITY_CLIENT_ID,
  AZURE_KEY_VAULT_NAME: process.env.AZURE_KEY_VAULT_NAME,
  AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
  EVIDENCE_S3_BUCKET: process.env.EVIDENCE_S3_BUCKET,
  AWS_REGION: process.env.AWS_REGION,
  BACKEND_RELEASE_IMAGE: process.env.BACKEND_RELEASE_IMAGE,
  FRONTEND_RELEASE_IMAGE: process.env.FRONTEND_RELEASE_IMAGE,
  SENTRY_RELEASE: process.env.SENTRY_RELEASE,
};

const missing = Object.entries(values)
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missing.length) {
  console.error(`Missing release configuration: ${missing.join(', ')}`);
  process.exit(2);
}

for (const hostName of ['PUBLIC_APP_HOST', 'PUBLIC_API_HOST']) {
  if (!/^(?=.{1,253}$)(?!-)[a-z0-9.-]+(?<!-)$/.test(values[hostName])) {
    throw new Error(`${hostName} must be a hostname without a scheme or path.`);
  }
}
if (values.PUBLIC_APP_HOST === values.PUBLIC_API_HOST) {
  throw new Error('PUBLIC_APP_HOST and PUBLIC_API_HOST must be different hostnames.');
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.TLS_CONTACT_EMAIL)) {
  throw new Error('TLS_CONTACT_EMAIL must be a valid email address.');
}
for (const name of ['AZURE_WORKLOAD_IDENTITY_CLIENT_ID', 'AZURE_TENANT_ID']) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(values[name])) {
    throw new Error(`${name} must be a valid UUID.`);
  }
}
if (!/^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$/.test(values.AZURE_KEY_VAULT_NAME)) {
  throw new Error('AZURE_KEY_VAULT_NAME must be a valid Key Vault name.');
}
if (
  !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(values.EVIDENCE_S3_BUCKET)
  || values.EVIDENCE_S3_BUCKET.includes('..')
) {
  throw new Error('EVIDENCE_S3_BUCKET must be a valid S3 bucket name.');
}
if (!/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(values.AWS_REGION)) {
  throw new Error('AWS_REGION must be a valid AWS region identifier.');
}
for (const name of ['BACKEND_RELEASE_IMAGE', 'FRONTEND_RELEASE_IMAGE']) {
  if (!/:sha-[0-9a-f]{40}$/i.test(values[name]) || /\s/.test(values[name])) {
    throw new Error(`${name} must use an immutable sha-<40-hex-commit> tag.`);
  }
}
if (!/^[0-9a-f]{40}$/i.test(values.SENTRY_RELEASE)) {
  throw new Error('SENTRY_RELEASE must be a 40-character Git commit SHA.');
}
if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(values.DEPLOY_NAMESPACE)) {
  throw new Error('DEPLOY_NAMESPACE must be a valid lowercase Kubernetes namespace.');
}

const replacements = new Map([
  ['namespace: city-cleanup', `namespace: ${values.DEPLOY_NAMESPACE}`],
  ['name: city-cleanup\n', `name: ${values.DEPLOY_NAMESPACE}\n`],
  ['admin@city-cleanup.example.com', values.TLS_CONTACT_EMAIL],
  ['api.city-cleanup.example.com', values.PUBLIC_API_HOST],
  ['city-cleanup.example.com', values.PUBLIC_APP_HOST],
  ['replace-with-managed-identity-client-id', values.AZURE_WORKLOAD_IDENTITY_CLIENT_ID],
  ['replace-with-key-vault-name', values.AZURE_KEY_VAULT_NAME],
  ['replace-with-azure-tenant-id', values.AZURE_TENANT_ID],
  ['replace-with-private-evidence-bucket', values.EVIDENCE_S3_BUCKET],
  ['replace-with-aws-region', values.AWS_REGION],
  ['replace-with-release-sha', values.SENTRY_RELEASE],
  [
    'citycleanup.azurecr.io/backend:sha-replaced-by-release-pipeline',
    values.BACKEND_RELEASE_IMAGE,
  ],
  [
    'citycleanup.azurecr.io/frontend:sha-replaced-by-release-pipeline',
    values.FRONTEND_RELEASE_IMAGE,
  ],
]);

const sourceDirectory = path.join(root, 'k8s');
const outputDirectory = path.resolve(
  root,
  process.env.RENDER_OUTPUT_DIR || 'rendered-k8s'
);
if (outputDirectory === sourceDirectory || !outputDirectory.startsWith(`${root}${path.sep}`)) {
  throw new Error('RENDER_OUTPUT_DIR must be a separate directory inside the repository.');
}
fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.cpSync(sourceDirectory, outputDirectory, { recursive: true });

for (const file of fs.readdirSync(outputDirectory).filter((name) => name.endsWith('.yaml'))) {
  const filePath = path.join(outputDirectory, file);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [placeholder, replacement] of replacements) {
    content = content.replaceAll(placeholder, replacement);
  }
  fs.writeFileSync(filePath, content);
}

console.log(
  `Rendered Kubernetes values for namespace ${values.DEPLOY_NAMESPACE} in ${outputDirectory}.`
);
