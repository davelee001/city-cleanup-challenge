#!/usr/bin/env node

const target = process.env.LOAD_URL;
const durationSeconds = Number(process.env.LOAD_DURATION_SECONDS || 30);
const concurrency = Number(process.env.LOAD_CONCURRENCY || 10);
const timeoutMs = Number(process.env.LOAD_REQUEST_TIMEOUT_MS || 5_000);
const maxErrorRate = Number(process.env.LOAD_MAX_ERROR_RATE || 0.01);
const maxP95Ms = Number(process.env.LOAD_MAX_P95_MS || 750);

if (!target) {
  console.error('LOAD_URL is required (use a read-only health or readiness endpoint).');
  process.exit(2);
}
if (
  !Number.isFinite(durationSeconds) || durationSeconds < 1 || durationSeconds > 600
  || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 200
) {
  console.error('Use 1-600 seconds and 1-200 concurrent workers.');
  process.exit(2);
}
if (new URL(target).search || !/\/(health|ready)\/?$/.test(new URL(target).pathname)) {
  console.error('LOAD_URL must be a query-free /health or /ready endpoint.');
  process.exit(2);
}

const stopAt = Date.now() + (durationSeconds * 1000);
const latencies = [];
let failures = 0;

async function worker() {
  while (Date.now() < stopAt) {
    const startedAt = performance.now();
    try {
      const response = await fetch(target, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'error',
      });
      await response.arrayBuffer();
      if (!response.ok) failures += 1;
    } catch {
      failures += 1;
    } finally {
      latencies.push(performance.now() - startedAt);
    }
  }
}

async function main() {
  await Promise.all(Array.from({ length: concurrency }, worker));
  latencies.sort((a, b) => a - b);
  const requests = latencies.length;
  const percentile = (value) => latencies[Math.min(
    requests - 1,
    Math.ceil((value / 100) * requests) - 1
  )] || 0;
  const errorRate = requests ? failures / requests : 1;
  const result = {
    target,
    durationSeconds,
    concurrency,
    requests,
    failures,
    errorRate: Number(errorRate.toFixed(4)),
    requestsPerSecond: Number((requests / durationSeconds).toFixed(2)),
    latencyMs: {
      p50: Number(percentile(50).toFixed(2)),
      p95: Number(percentile(95).toFixed(2)),
      p99: Number(percentile(99).toFixed(2)),
    },
    thresholds: { maxErrorRate, maxP95Ms },
  };
  console.log(JSON.stringify(result, null, 2));
  if (errorRate > maxErrorRate || result.latencyMs.p95 > maxP95Ms) process.exit(1);
}

main().catch((error) => {
  console.error(`Load test failed: ${error.message}`);
  process.exit(1);
});
