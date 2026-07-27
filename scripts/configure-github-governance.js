#!/usr/bin/env node

const API_VERSION = '2026-03-10';
const APPLY_CONFIRMATION = 'APPLY_CITY_CLEANUP_GITHUB_GOVERNANCE';
const repository = process.env.GITHUB_REPOSITORY || 'davelee001/city-cleanup-challenge';
const [owner, repo] = repository.split('/');
const token = process.env.GITHUB_ADMIN_TOKEN;
const apply = process.argv.includes('--apply');

if (!owner || !repo || !token) {
  console.error('GITHUB_REPOSITORY and GITHUB_ADMIN_TOKEN are required.');
  process.exit(2);
}
if (apply && process.env.GITHUB_GOVERNANCE_CONFIRM !== APPLY_CONFIRMATION) {
  console.error(`Set GITHUB_GOVERNANCE_CONFIRM=${APPLY_CONFIRMATION} before --apply.`);
  process.exit(2);
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': API_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body?.message}`);
  }
  return body;
}

const environmentVariableNames = [
  'PUBLIC_APP_URL',
  'PUBLIC_API_URL',
  'PUBLIC_APP_HOST',
  'PUBLIC_API_HOST',
  'TLS_CONTACT_EMAIL',
  'AZURE_WORKLOAD_IDENTITY_CLIENT_ID',
  'AZURE_KEY_VAULT_NAME',
  'AZURE_TENANT_ID',
  'EVIDENCE_S3_BUCKET',
  'AWS_REGION',
];

function environmentValues(prefix) {
  const values = Object.fromEntries(environmentVariableNames.map((name) => {
    const value = process.env[`${prefix}_${name}`];
    if (!value) throw new Error(`${prefix}_${name} is required.`);
    return [name, value];
  }));
  for (const name of ['PUBLIC_APP_URL', 'PUBLIC_API_URL']) {
    const url = new URL(values[name]);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`${prefix}_${name} must be an HTTPS origin without a path.`);
    }
  }
  if (new URL(values.PUBLIC_APP_URL).hostname !== values.PUBLIC_APP_HOST) {
    throw new Error(`${prefix}_PUBLIC_APP_URL must match ${prefix}_PUBLIC_APP_HOST.`);
  }
  if (new URL(values.PUBLIC_API_URL).hostname !== values.PUBLIC_API_HOST) {
    throw new Error(`${prefix}_PUBLIC_API_URL must match ${prefix}_PUBLIC_API_HOST.`);
  }
  if (values.PUBLIC_APP_HOST === values.PUBLIC_API_HOST) {
    throw new Error(`${prefix} app and API hosts must be different.`);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.TLS_CONTACT_EMAIL)) {
    throw new Error(`${prefix}_TLS_CONTACT_EMAIL must be a valid email address.`);
  }
  for (const name of ['AZURE_WORKLOAD_IDENTITY_CLIENT_ID', 'AZURE_TENANT_ID']) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(values[name])) {
      throw new Error(`${prefix}_${name} must be a valid UUID.`);
    }
  }
  if (!/^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$/.test(values.AZURE_KEY_VAULT_NAME)) {
    throw new Error(`${prefix}_AZURE_KEY_VAULT_NAME must be valid.`);
  }
  if (
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(values.EVIDENCE_S3_BUCKET)
    || values.EVIDENCE_S3_BUCKET.includes('..')
  ) {
    throw new Error(`${prefix}_EVIDENCE_S3_BUCKET must be valid.`);
  }
  if (!/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(values.AWS_REGION)) {
    throw new Error(`${prefix}_AWS_REGION must be valid.`);
  }
  return values;
}

async function upsertEnvironmentVariables(environmentName, values) {
  const existing = await github(
    `/repos/${owner}/${repo}/environments/${environmentName}/variables?per_page=100`,
  );
  const names = new Set((existing.variables || []).map((variable) => variable.name));
  for (const [name, value] of Object.entries(values)) {
    const path = names.has(name)
      ? `/repos/${owner}/${repo}/environments/${environmentName}/variables/${name}`
      : `/repos/${owner}/${repo}/environments/${environmentName}/variables`;
    await github(path, {
      method: names.has(name) ? 'PATCH' : 'POST',
      body: JSON.stringify(names.has(name) ? { name, value } : { name, value }),
    });
  }
}

async function main() {
  const protectionPath = `/repos/${owner}/${repo}/branches/main/protection`;
  if (!apply) {
    const [protection, staging, production] = await Promise.all([
      github(protectionPath),
      github(`/repos/${owner}/${repo}/environments/staging`),
      github(`/repos/${owner}/${repo}/environments/production`),
    ]);
    console.log(JSON.stringify({
      mode: 'check',
      branchProtection: {
        requiredChecks: protection.required_status_checks?.contexts || [],
        approvingReviews:
          protection.required_pull_request_reviews?.required_approving_review_count || 0,
        codeOwnerReviews:
          protection.required_pull_request_reviews?.require_code_owner_reviews || false,
        enforceAdmins: protection.enforce_admins?.enabled || false,
      },
      environments: {
        staging: staging.protection_rules,
        production: production.protection_rules,
      },
    }, null, 2));
    return;
  }

  const reviewerLogin = process.env.GITHUB_PRODUCTION_REVIEWER;
  if (!reviewerLogin || reviewerLogin.toLowerCase() === owner.toLowerCase()) {
    throw new Error('GITHUB_PRODUCTION_REVIEWER must be a different trusted collaborator.');
  }
  const reviewer = await github(`/users/${encodeURIComponent(reviewerLogin)}`);

  await github(protectionPath, {
    method: 'PUT',
    body: JSON.stringify({
      required_status_checks: {
        strict: true,
        contexts: [
          'Tests, coverage, lint, and builds',
          'PostgreSQL migration and API suite',
        ],
      },
      enforce_admins: true,
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: true,
        required_approving_review_count: 1,
        require_last_push_approval: true,
      },
      restrictions: null,
      required_linear_history: true,
      allow_force_pushes: false,
      allow_deletions: false,
      block_creations: false,
      required_conversation_resolution: true,
      lock_branch: false,
      allow_fork_syncing: true,
    }),
  });

  await github(`/repos/${owner}/${repo}/environments/staging`, {
    method: 'PUT',
    body: JSON.stringify({
      wait_timer: 0,
      prevent_self_review: false,
      reviewers: [],
      deployment_branch_policy: {
        protected_branches: true,
        custom_branch_policies: false,
      },
    }),
  });
  await github(`/repos/${owner}/${repo}/environments/production`, {
    method: 'PUT',
    body: JSON.stringify({
      wait_timer: 0,
      prevent_self_review: true,
      reviewers: [{ type: 'User', id: reviewer.id }],
      deployment_branch_policy: {
        protected_branches: true,
        custom_branch_policies: false,
      },
    }),
  });

  await upsertEnvironmentVariables('staging', environmentValues('STAGING'));
  await upsertEnvironmentVariables('production', environmentValues('PRODUCTION'));
  console.log('GitHub branch protection, deployment approvals, and environment values applied.');
}

main().catch((error) => {
  console.error(`GitHub governance failed: ${error.message}`);
  process.exit(1);
});
