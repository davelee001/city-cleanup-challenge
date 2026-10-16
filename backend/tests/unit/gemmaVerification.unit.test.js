const sharp = require('sharp');
jest.mock('../../src/services/gemmaTransport', () => ({ fetch: (...args) => global.fetch(...args) }));
const { analyzeCleanup, validateAssessment } = require('../../src/services/gemmaVerification');
const { qualityFlags } = require('../../src/services/gemmaPolicy');
const { verifyEvidencePair } = require('../../src/services/evidenceVerification');
const sample = require('../fixtures/gemma-cleanup.sample.json');

describe('Gemma smart verification', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let image;
  const respond = (content = sample, provider = 'ollama') => {
    const payload = JSON.stringify(provider === 'ollama'
      ? { message: { content: JSON.stringify(content) } }
      : { choices: [{ message: { content: JSON.stringify(content) } }] });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, body: [Buffer.from(payload)] });
  };
  beforeAll(async () => {
    image = await sharp({ create: { width: 720, height: 540, channels: 3, background: '#779988' } })
      .withMetadata({ exif: { IFD0: { Software: 'private-camera-metadata' } } }).jpeg().toBuffer();
  });
  beforeEach(() => {
    process.env.GEMMA_VERIFICATION_ENABLED = 'true';
    process.env.GEMMA_PROVIDER = 'ollama';
    process.env.GEMMA_ENDPOINT = 'http://127.0.0.1:11434/api/chat';
    respond();
  });
  afterEach(() => { process.env = { ...originalEnv }; global.fetch = originalFetch; });
  const run = () => analyzeCleanup({ beforeBuffer: image, afterBuffer: image });

  it('does no network or image work when disabled', async () => {
    delete process.env.GEMMA_VERIFICATION_ENABLED;
    expect(await analyzeCleanup({})).toMatchObject({ status: 'disabled' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('sends ordered images without metadata and validates findings', async () => {
    expect(await run()).toMatchObject({ status: 'completed', findings: { needsHumanReview: true } });
    const [url, request] = global.fetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(request.body);
    expect(body.model).toBe('gemma3:4b');
    expect(body.messages[0].images).toHaveLength(2);
    const metadata = await sharp(Buffer.from(body.messages[0].images[0], 'base64')).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(request.redirect).toBe('error');
    expect(body.options.num_predict).toBe(384);
    expect(body.options.num_ctx).toBe(2048);
    expect(body.options.repeat_penalty).toBe(1.1);
    expect(body.messages[0].content).not.toContain('"properties"');
  });
  it('supports compatible hosted chat completions with server-only credentials', async () => {
    process.env.GEMMA_PROVIDER = 'openai';
    process.env.GEMMA_ENDPOINT = 'https://inference.example/v1/chat/completions';
    process.env.GEMMA_API_KEY = 'test-secret';
    respond(sample, 'openai');
    const result = await run();
    expect(result.status).toBe('completed');
    const request = global.fetch.mock.calls[0][1];
    expect(request.headers.Authorization).toBe('Bearer test-secret');
    expect(JSON.parse(request.body).messages[0].content).toHaveLength(3);
    expect(JSON.stringify(result)).not.toContain('test-secret');
  });
  it('reads fragmented Ollama NDJSON and emits progress without exposing unvalidated text', async () => {
    const content = JSON.stringify(sample);
    const wire = Buffer.from(JSON.stringify({ message: { content: content.slice(0, 31) } }) + '\n'
      + JSON.stringify({ done: true, message: { content: content.slice(31) }, eval_count: 42 }) + '\n');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, body: [wire.subarray(0, 19), wire.subarray(19, 90), wire.subarray(90)] });
    const onProgress = jest.fn();
    const result = await analyzeCleanup({ beforeBuffer: image, afterBuffer: image, signal: new AbortController().signal, onProgress });
    expect(result.status).toBe('completed');
    expect(result.timings.generatedTokens).toBe(42);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).stream).toBe(true);
    expect(onProgress.mock.calls.some(([event]) => event.type === 'generation')).toBe(true);
    expect(JSON.stringify(onProgress.mock.calls)).not.toContain(sample.assessment);
  });
  it('rejects a truncated model stream instead of presenting partial findings', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, body: [Buffer.from(JSON.stringify({ message: { content: '{' } }) + '\n')] });
    const result = await analyzeCleanup({ beforeBuffer: image, afterBuffer: image, signal: new AbortController().signal });
    expect(result.status).toBe('unavailable');
    expect(result.findings).toBeUndefined();
  });
  it('does not contact the model for a cancelled foreground request', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await analyzeCleanup({ beforeBuffer: image, afterBuffer: image, signal: controller.signal });
    expect(result).toMatchObject({ status: 'unavailable', reason: 'cancelled', needsHumanReview: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it.each([
    { ...sample, wasteCategories: ['radioactive'] },
    { ...sample, estimatedWeight: 20 },
    { ...sample, limitations: [] },
    { ...sample, needsHumanReview: 'false' },
    { ...sample, assessment: 'x'.repeat(1201) },
    { ...sample, recommendations: [''] },
  ])('rejects malformed or unsupported output', (value) => {
    expect(() => validateAssessment(value)).toThrow();
  });
  it('never lets a model waive human review', () => {
    expect(validateAssessment({ ...sample, needsHumanReview: false }).needsHumanReview).toBe(true);
  });
  it('rejects repeated and near-repeated findings', () => {
    for (const entries of [
      ['Use gloves.', 'Use gloves.'],
      ['The same tree remains visible in both images.', 'The same tree remains visible in both images!'],
      ['Litter is visible beside the path.', 'Litter is visible beside the path today.'],
    ]) {
      const value = { ...sample, visualDifferences: entries };
      expect(qualityFlags(value)).toContain('repeated_findings');
      expect(() => validateAssessment(value)).toThrow();
    }
  });
  it('flags obvious contradictions and unsupported numeric claims', () => {
    expect(qualityFlags({ ...sample, cleanupEvidence: 'visible_improvement', sameScene: 'unlikely' })).toContain('contradictory_findings');
    expect(() => validateAssessment({ ...sample, cleanupEvidence: 'visible_improvement', assessment: 'No visible improvement can be seen.' })).toThrow();
    expect(() => validateAssessment({ ...sample, assessment: 'Removed 12 kg of waste.' })).toThrow();
  });
  it('requires uncertainty for illustrations and evidence for organic waste', () => {
    expect(qualityFlags({ ...sample, cleanupEvidence: 'visible_improvement' })).toContain('illustrative_evidence_requires_uncertainty');
    expect(qualityFlags({ ...sample, wasteCategories: ['organic'], assessment: 'Grass and trees beside a path.' })).toContain('unsupported_organic_category');
    expect(qualityFlags({ ...sample, wasteCategories: ['organic'], assessment: 'Discarded food waste is visible beside the path.' })).not.toContain('unsupported_organic_category');
  });
  it('rejects repeated sentences and placeholder findings within a single entry', () => {
    expect(() => validateAssessment({ ...sample, visualDifferences: ['Less litter visible. Less litter visible.'] })).toThrow();
    expect(() => validateAssessment({ ...sample, visualDifferences: ['sameScene=likely'] })).toThrow();
    expect(() => validateAssessment({ ...sample, assessment: 'Short cautious summary' })).toThrow();
  });
  it('routes quality failures and token-limit output to review', async () => {
    respond({ ...sample, cleanupEvidence: 'visible_improvement', sameScene: 'unlikely' });
    expect(await run()).toMatchObject({ status: 'unavailable', reason: 'quality_check_failed', qualityFlags: expect.arrayContaining(['contradictory_findings']) });
    global.fetch.mockResolvedValue({ ok: true, body: [Buffer.from(JSON.stringify({ done_reason: 'length', message: { content: JSON.stringify(sample) } }))] });
    expect(await run()).toMatchObject({ status: 'unavailable', reason: 'validation_failed' });
  });
  it.each(['GEMMA_MAX_OUTPUT_TOKENS', 'GEMMA_IMAGE_MAX_SIZE', 'GEMMA_NUM_THREADS', 'GEMMA_CONTEXT_LENGTH'])('rejects unsafe %s configuration', async (name) => {
    process.env[name] = '-1';
    expect(await run()).toMatchObject({ status: 'unavailable', reason: 'configuration_failed' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('fails safely on invalid JSON, provider errors and oversized responses', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: [Buffer.from('not json')] })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, body: [Buffer.alloc(65537)] });
    for (let i = 0; i < 3; i += 1) expect(await run()).toMatchObject({ status: 'unavailable', needsHumanReview: true });
  });
  it('aborts timed out requests and preserves manual review', async () => {
    process.env.GEMMA_TIMEOUT_MS = '100';
    global.fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    expect(await run()).toMatchObject({ status: 'unavailable' });
  });
  it('rejects insecure remote configuration without a network call', async () => {
    process.env.GEMMA_ENDPOINT = 'http://remote.example/api/chat';
    expect(await run()).toMatchObject({ status: 'unavailable' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('rejects deadlines above the bounded CPU inference maximum', async () => {
    process.env.GEMMA_TIMEOUT_MS = '600001';
    expect(await run()).toMatchObject({ status: 'unavailable' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('adds uncertainty to existing signals without overriding duplicate rejection', async () => {
    respond({ ...sample, sameScene: 'uncertain', cleanupEvidence: 'uncertain' });
    const result = await verifyEvidencePair({ beforeBuffer: image, afterBuffer: image });
    expect(result.reviewReasons).toContain('gemma_uncertain');
    const duplicate = await verifyEvidencePair({ beforeBuffer: image, afterBuffer: image, exactDuplicate: true });
    expect(duplicate.overallRisk).toBe('high');
    expect(duplicate.reviewReasons).toContain('exact_duplicate');
    expect(duplicate.smartVerification.status).toBe('skipped');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
