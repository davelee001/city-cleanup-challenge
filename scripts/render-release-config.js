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
