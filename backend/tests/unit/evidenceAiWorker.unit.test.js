const sqlite3 = require('sqlite3');
jest.mock('../../src/services/gemmaVerification', () => ({ analyzeCleanup: jest.fn(), VERSION: 'test' }));
jest.mock('../../src/services/evidenceStorage', () => ({ read: jest.fn() }));
const { analyzeCleanup } = require('../../src/services/gemmaVerification');
const storage = require('../../src/services/evidenceStorage');
const { createEvidenceAiWorker } = require('../../src/services/evidenceAiWorker');
const sample = require('../fixtures/gemma-cleanup.sample.json');

describe('durable private evidence AI worker', () => {
  let db;
  let worker;
  const execute = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, (error) => error ? reject(error) : resolve()));
  const readRow = () => new Promise((resolve, reject) => db.get('SELECT * FROM cleanup_submissions WHERE id=1', (error, row) => error ? reject(error) : resolve(row)));
  const previousFlag = process.env.GEMMA_VERIFICATION_ENABLED;
  beforeEach(async () => {
    process.env.GEMMA_VERIFICATION_ENABLED = 'true';
    db = new sqlite3.Database(':memory:');
    await execute('CREATE TABLE cleanup_submissions (id INTEGER PRIMARY KEY, verification_summary TEXT, status TEXT, risk_level TEXT)');
    await execute('CREATE TABLE cleanup_evidence_files (submission_id INTEGER, kind TEXT, storage_path TEXT)');
    await execute('INSERT INTO cleanup_submissions VALUES (1, ?, ?, ?)', [JSON.stringify({ overallRisk: 'high', reviewReasons: ['perceptual_duplicate_match'], smartVerification: { status: 'pending' } }), 'manual_review', 'high']);
    await execute("INSERT INTO cleanup_evidence_files VALUES (1,'before','private-before'),(1,'after','private-after')");
    analyzeCleanup.mockReset().mockResolvedValue({ status: 'completed', findings: sample });
    storage.read.mockReset().mockResolvedValue(Buffer.from('private evidence'));
    worker = createEvidenceAiWorker(db);
  });
  afterEach(async () => {
    worker.stop();
    await new Promise((resolve) => db.close(resolve));
    if (previousFlag === undefined) delete process.env.GEMMA_VERIFICATION_ENABLED; else process.env.GEMMA_VERIFICATION_ENABLED = previousFlag;
  });
  it('recovers persisted pending work, coalesces kicks and never lowers heuristic risk', async () => {
    await Promise.all([worker.kick(), worker.kick()]);
    const row = await readRow();
    expect(JSON.parse(row.verification_summary).smartVerification.status).toBe('completed');
    expect(row.risk_level).toBe('high');
    expect(row.status).toBe('manual_review');
    expect(storage.read).toHaveBeenCalledWith('private-before');
    expect(analyzeCleanup).toHaveBeenCalledTimes(1);
    await worker.kick();
    expect(analyzeCleanup).toHaveBeenCalledTimes(1);
  });
  it('retains original risk and decisions when a reviewer has already approved', async () => {
    await execute("UPDATE cleanup_submissions SET status='approved'");
    analyzeCleanup.mockResolvedValue({ status: 'unavailable', reason: 'timeout' });
    await worker.kick();
    const row = await readRow();
    expect(row.status).toBe('approved');
    expect(row.risk_level).toBe('high');
    expect(JSON.parse(row.verification_summary).reviewReasons).toEqual(['perceptual_duplicate_match']);
  });
  it('preserves private evidence for manual review on storage failure', async () => {
    storage.read.mockRejectedValue(new Error('sensitive path not exposed'));
    await worker.kick();
    const row = await readRow();
    const summary = JSON.parse(row.verification_summary);
    expect(summary.smartVerification.reason).toBe('evidence_read_failed');
    expect(row.status).toBe('manual_review');
    expect(analyzeCleanup).not.toHaveBeenCalled();
    expect(row.verification_summary).not.toContain('sensitive');
  });
  it('keeps pending work for a later restart while disabled', async () => {
    process.env.GEMMA_VERIFICATION_ENABLED = 'false';
    await worker.kick();
    expect(JSON.parse((await readRow()).verification_summary).smartVerification.status).toBe('pending');
    expect(storage.read).not.toHaveBeenCalled();
  });
});
