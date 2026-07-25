const sharp = require('sharp');
const {
  PERCEPTUAL_DISTANCE_THRESHOLD,
  analyzeImage,
  hammingDistance,
  verifyEvidencePair,
} = require('../../src/services/evidenceVerification');

async function createStreetScene(format = 'png') {
  const svg = Buffer.from(`
    <svg width="720" height="540" xmlns="http://www.w3.org/2000/svg">
      <rect width="720" height="540" fill="#8eb7d1"/>
      <rect y="310" width="720" height="230" fill="#63737a"/>
      <rect x="70" y="180" width="230" height="170" fill="#d7c5a3"/>
      <polygon points="45,180 185,75 325,180" fill="#7c3f45"/>
      <circle cx="575" cy="115" r="55" fill="#f2d269"/>
      <rect x="425" y="360" width="38" height="95" rx="8" fill="#2e7d68"/>
      <rect x="490" y="380" width="34" height="80" rx="8" fill="#376fad"/>
      <path d="M0 440 L720 390" stroke="#e8edf0" stroke-width="14"/>
    </svg>
  `);
  const pipeline = sharp({
    create: { width: 720, height: 540, channels: 3, background: '#ffffff' },
  }).composite([{ input: svg }]);
  return format === 'jpeg'
    ? pipeline.jpeg({ quality: 72 }).toBuffer()
    : pipeline.png().toBuffer();
}

describe('Phase 4 evidence verification', () => {
  it('keeps perceptual fingerprints stable across resize and recompression', async () => {
    const original = await createStreetScene('png');
    const derivative = await sharp(original)
      .resize(900, 675)
      .jpeg({ quality: 68 })
      .toBuffer();
    const [originalAnalysis, derivativeAnalysis] = await Promise.all([
      analyzeImage(original),
      analyzeImage(derivative),
    ]);

    expect(
      hammingDistance(originalAnalysis.perceptualHash, derivativeAnalysis.perceptualHash)
    ).toBeLessThanOrEqual(PERCEPTUAL_DISTANCE_THRESHOLD);

    const verification = await verifyEvidencePair({
      beforeBuffer: derivative,
      afterBuffer: await createStreetScene('jpeg'),
      priorFingerprints: [{
        submission_id: 42,
        kind: 'before',
        perceptual_hash: originalAnalysis.perceptualHash,
      }],
    });
    expect(verification.perceptualDuplicate.matched).toBe(true);
    expect(verification.perceptualDuplicate.submissionId).toBe(42);
    expect(verification.reviewReasons).toContain('perceptual_duplicate_match');
  });

  it('returns explainable scene, quality, and synthetic-image risk details', async () => {
    const scene = await createStreetScene('jpeg');
    const generatedMetadataImage = await sharp(scene)
      .withMetadata({ exif: { IFD0: { Software: 'Stable Diffusion WebUI' } } })
      .jpeg()
      .toBuffer();

    const verification = await verifyEvidencePair({
      beforeBuffer: scene,
      afterBuffer: generatedMetadataImage,
    });

    expect(verification.version).toBe('phase9-v2');
    expect(verification.sceneConsistency.score).toBeGreaterThanOrEqual(0);
    expect(verification.sceneConsistency.score).toBeLessThanOrEqual(1);
    expect(verification.syntheticImageRisk.level).toBe('high');
    expect(
      verification.syntheticImageRisk.after.signals
    ).toContain('generator_software_metadata');
    expect(verification.syntheticImageRisk.disclaimer).toMatch(/heuristic/i);
  });
});
