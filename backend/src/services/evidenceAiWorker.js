const storage = require('./evidenceStorage');
const { analyzeCleanup, VERSION } = require('./gemmaVerification');
const { applySmartVerification } = require('./evidenceVerification');

const all = (db, sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
const get = (db, sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
const run = (db, sql, params) => new Promise((resolve, reject) => db.run(sql, params, function complete(error) {
  if (error) reject(error); else resolve(this.changes);
}));

// The pending JSON is a durable outbox. One active inference per API process.
// Restarted processes discover pending records again; images stay in private storage.
function createEvidenceAiWorker(db) {
  let running;
  let timer;
  let stopped = false;

  async function persist(id, analysis) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const row = await get(db, 'SELECT verification_summary, status, risk_level FROM cleanup_submissions WHERE id = ?', [id]);
      if (!row) return;
      const previous = JSON.parse(row.verification_summary);
      if (previous.smartVerification?.status !== 'pending') return;
      const summary = row.status === 'manual_review' ? applySmartVerification(previous, analysis)
        : { ...previous, smartVerification: analysis };
      const changed = await run(db, `UPDATE cleanup_submissions
        SET verification_summary = ?, risk_level = ?
        WHERE id = ? AND verification_summary = ? AND status = ?`,
      [JSON.stringify(summary), row.status === 'manual_review' ? summary.overallRisk : row.risk_level,
        id, row.verification_summary, row.status]);
      if (changed) return;
    }
  }

  async function processPending() {
    await db.ready;
    if (stopped || process.env.GEMMA_VERIFICATION_ENABLED !== 'true') return;
    const pending = await all(db, `SELECT id, verification_summary FROM cleanup_submissions
      WHERE verification_summary LIKE ? ORDER BY id LIMIT 20`, ['%"status":"pending"%']);
    for (const row of pending) {
      if (stopped || process.env.GEMMA_VERIFICATION_ENABLED !== 'true') return;
      if (JSON.parse(row.verification_summary).smartVerification?.status !== 'pending') continue;
      let analysis;
      try {
        const files = await all(db, 'SELECT kind, storage_path FROM cleanup_evidence_files WHERE submission_id = ?', [row.id]);
        const before = files.find((file) => file.kind === 'before');
        const after = files.find((file) => file.kind === 'after');
        if (!before || !after) throw new Error('Missing private evidence');
        const [beforeBuffer, afterBuffer] = await Promise.all([storage.read(before.storage_path), storage.read(after.storage_path)]);
        analysis = await analyzeCleanup({ beforeBuffer, afterBuffer });
      } catch {
        analysis = { status: 'unavailable', version: VERSION, reason: 'evidence_read_failed', needsHumanReview: true };
      }
      await persist(row.id, analysis);
    }
  }

  // Foreground route owns the lifetime; this does not start the polling worker.
  async function analyzeSubmission(id, options = {}) {
    let analysis;
    try {
      const files = await all(db, 'SELECT kind, storage_path FROM cleanup_evidence_files WHERE submission_id = ?', [id]);
      const before = files.find((file) => file.kind === 'before');
      const after = files.find((file) => file.kind === 'after');
      if (!before || !after) throw new Error('Missing private evidence');
      const [beforeBuffer, afterBuffer] = await Promise.all([storage.read(before.storage_path), storage.read(after.storage_path)]);
      analysis = await analyzeCleanup({ beforeBuffer, afterBuffer, ...options });
    } catch {
      analysis = { status: 'unavailable', version: VERSION, reason: 'evidence_read_failed', needsHumanReview: true };
    }
    await persist(id, analysis);
    return analysis;
  }

  function kick() {
    if (stopped) return Promise.resolve();
    if (!running) running = processPending().catch(() => {
      // Leave the durable pending record for restart/poll recovery. No images or errors logged.
      console.error('Background evidence analysis could not be persisted; pending work retained.');
    }).finally(() => { running = null; });
    return running;
  }
  function start() {
    if (timer) return;
    stopped = false;
    timer = setInterval(kick, 5000);
    timer.unref();
    kick();
  }
  function stop() { stopped = true; clearInterval(timer); timer = null; }
  return { kick, start, stop, analyzeSubmission };
}

module.exports = { createEvidenceAiWorker };
