#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const directoryArgument = process.argv.find((argument) => argument.startsWith('--directory='));
const relativeDirectory = directoryArgument
  ? directoryArgument.slice('--directory='.length)
  : 'k8s';
const k8sDirectory = path.resolve(root, relativeDirectory);
if (!k8sDirectory.startsWith(`${root}${path.sep}`)) {
  throw new Error('Manifest directory must be inside the repository.');
}
const renderedMode = process.argv.includes('--rendered');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const sourceFiles = fs.readdirSync(k8sDirectory)
  .filter((file) => file.endsWith('.yaml'))
  .map((file) => path.relative(root, path.join(k8sDirectory, file)));
const source = sourceFiles.map((file) => read(file)).join('\n');

if (/image:\s*\S+:latest(?:\s|$)/m.test(source)) {
  fail('Kubernetes manifests must not use mutable :latest image tags.');
}
if (/cors-allow-origin:\s*["']?\*["']?/i.test(source)) {
  fail('Wildcard ingress CORS is forbidden; use the API CORS allowlist.');
}
const deploymentCount = (source.match(/^kind:\s*Deployment\s*$/gm) || []).length;
const nonRootCount = (source.match(/^\s+runAsNonRoot:\s*true\s*$/gm) || []).length;
const noEscalationCount = (
  source.match(/^\s+allowPrivilegeEscalation:\s*false\s*$/gm) || []
).length;
if (nonRootCount < deploymentCount) {
  fail('Every deployment must define a non-root pod security policy.');
}
if (noEscalationCount < deploymentCount) {
  fail('Every deployment must disable container privilege escalation.');
}
if (!source.includes('kind: HorizontalPodAutoscaler')) {
  fail('HorizontalPodAutoscaler resources are required.');
}
if (!source.includes('kind: SecretProviderClass')) {
  fail('The deployment must source secrets from the external secret provider.');
}

let rendered = '';
try {
  rendered = execFileSync('kubectl', ['kustomize', k8sDirectory], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  fail(`kubectl could not render ${relativeDirectory}/: ${error.stderr?.trim() || error.message}`);
}

if (renderedMode && rendered) {
  const forbiddenPlaceholders = [
    'replace-with',
    'example.com',
    'sha-replaced-by-release-pipeline',
    '00000000-0000-0000-0000-000000000000',
  ];
  for (const placeholder of forbiddenPlaceholders) {
    if (rendered.includes(placeholder)) {
      fail(`Rendered release still contains placeholder: ${placeholder}`);
    }
  }
}

if (failures.length) {
  console.error('Release configuration validation failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(
  renderedMode
    ? 'Rendered release configuration is deployable.'
    : 'Release configuration structure is valid; environment placeholders remain intentionally required.'
);
