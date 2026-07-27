#!/usr/bin/env node

const confirmation = 'RUN_ONE_CELO_SEPOLIA_PILOT_PAYMENT';
const apiUrl = process.env.CITY_CLEANUP_API_URL;
const adminToken = process.env.CITY_CLEANUP_ADMIN_TOKEN;
const submissionId = process.env.CELO_PILOT_SUBMISSION_ID;
const pollIntervalMs = Number(process.env.CELO_PILOT_POLL_INTERVAL_MS || 15_000);
const timeoutMs = Number(process.env.CELO_PILOT_TIMEOUT_MS || 10 * 60_000);

if (process.env.CELO_PILOT_CONFIRM !== confirmation) {
  console.error(`Set CELO_PILOT_CONFIRM=${confirmation}.`);
  process.exit(2);
}
if (!apiUrl || !adminToken || !/^\d+$/.test(String(submissionId || ''))) {
  throw new Error(
    'CITY_CLEANUP_API_URL, CITY_CLEANUP_ADMIN_TOKEN, and CELO_PILOT_SUBMISSION_ID are required.',
  );
}
const target = new URL(apiUrl);
if (target.protocol !== 'https:') throw new Error('CITY_CLEANUP_API_URL must use HTTPS.');
if (
  !target.hostname.toLowerCase().includes('staging')
  && process.env.ALLOW_NON_STAGING_CELO_PILOT !== 'true'
) {
  throw new Error('The controlled pilot is restricted to a staging hostname.');
}
if (
  !Number.isFinite(pollIntervalMs) || pollIntervalMs < 5_000 || pollIntervalMs > 60_000
  || !Number.isFinite(timeoutMs) || timeoutMs < 60_000 || timeoutMs > 30 * 60_000
) {
  throw new Error('Use a 5-60 second poll interval and a 1-30 minute timeout.');
}

async function request(path, options = {}) {
  const response = await fetch(new URL(path, apiUrl), {
    ...options,
    headers: {
      Authorization: `Bearer ${adminToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body.message}`);
  }
  return body;
}

function setPause(paused, reason) {
  return request('/api/v1/rewards/admin/controls', {
    method: 'PUT',
    body: JSON.stringify({ paused, reason }),
  });
}

async function main() {
  const initial = await request('/api/v1/rewards/admin/summary');
  if (!initial.summary.controls.paused) {
    throw new Error('Application rewards must be paused before starting the pilot.');
  }
  const preflight = await request('/api/v1/rewards/admin/preflight', { method: 'POST' });
  if (!preflight.preflight.ready) {
    throw new Error('Celo preflight is not ready.');
  }

  const claim = await request(`/api/v1/rewards/submissions/${submissionId}/claim`, {
    method: 'POST',
  });
  let resumed = false;
  let payment;
  try {
    await setPause(false, 'One-claim controlled Celo Sepolia pilot');
    resumed = true;
    const paid = await request(`/api/v1/rewards/submissions/${submissionId}/pay`, {
      method: 'POST',
    });
    payment = paid.payment;
  } finally {
    if (resumed) {
      await setPause(true, 'Controlled Celo Sepolia pilot payment broadcast complete');
    }
  }

  const deadline = Date.now() + timeoutMs;
  while (payment.status === 'broadcast' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const reconciled = await request(
      `/api/v1/rewards/admin/payments/${payment.id}/reconcile`,
      { method: 'POST' },
    );
    payment = reconciled.payment;
  }
  if (payment.status !== 'confirmed') {
    throw new Error(`Pilot payment ended in ${payment.status}; keep rewards paused.`);
  }

  const duplicateRetry = await request(`/api/v1/rewards/submissions/${submissionId}/pay`, {
    method: 'POST',
  });
  if (!duplicateRetry.idempotent || duplicateRetry.payment.transactionHash !== payment.transactionHash) {
    throw new Error('Duplicate retry did not return the original confirmed payment.');
  }
  const final = await request('/api/v1/rewards/admin/summary');
  if (!final.summary.controls.paused) throw new Error('Rewards were not paused after the pilot.');

  console.log(JSON.stringify({
    status: 'passed',
    submissionId: Number(submissionId),
    claimId: claim.payment.claimId,
    paymentId: payment.id,
    transactionHash: payment.transactionHash,
    blockNumber: payment.blockNumber,
    duplicateRetryPrevented: true,
    rewardsPaused: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Controlled Celo pilot failed: ${error.message}`);
  process.exit(1);
});
