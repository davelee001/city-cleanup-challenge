const sharp = require('sharp');
const exifr = require('exifr');

const VERIFICATION_VERSION = 'phase4-v1';
function configuredNumber(name, fallback, minimum, maximum) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

const PERCEPTUAL_DISTANCE_THRESHOLD = configuredNumber(
  'EVIDENCE_PERCEPTUAL_DISTANCE_THRESHOLD',
  8,
  0,
  64
);
const SCENE_HIGH_RISK_BELOW = configuredNumber(
  'EVIDENCE_SCENE_HIGH_RISK_BELOW',
  0.3,
  0,
  1
);
const SCENE_MEDIUM_RISK_BELOW = Math.max(
  SCENE_HIGH_RISK_BELOW,
  configuredNumber('EVIDENCE_SCENE_MEDIUM_RISK_BELOW', 0.48, 0, 1)
);
const SYNTHETIC_HIGH_RISK_AT = configuredNumber(
  'EVIDENCE_SYNTHETIC_HIGH_RISK_AT',
  0.6,
  0,
  1
);
const SYNTHETIC_MEDIUM_RISK_AT = Math.min(
  SYNTHETIC_HIGH_RISK_AT,
  configuredNumber('EVIDENCE_SYNTHETIC_MEDIUM_RISK_AT', 0.25, 0, 1)
);
const GENERATOR_SOFTWARE_PATTERN = (
  /midjourney|stable diffusion|dall[ -]?e|comfyui|automatic1111|generative fill|firefly|ai image generator/i
);

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function bufferToDifferenceHash(buffer) {
  let bits = '';
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const left = buffer[(row * 9) + column];
      const right = buffer[(row * 9) + column + 1];
      bits += left > right ? '1' : '0';
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

function hammingDistance(leftHash, rightHash) {
  if (!leftHash || !rightHash || leftHash.length !== rightHash.length) return 64;
  let value = BigInt(`0x${leftHash}`) ^ BigInt(`0x${rightHash}`);
  let distance = 0;
  while (value) {
    distance += Number(value & 1n);
    value >>= 1n;
  }
  return distance;
}

async function readCaptureMetadata(buffer) {
  try {
    const parsed = await exifr.parse(buffer, [
      'Make',
      'Model',
      'Software',
      'DateTimeOriginal',
      'CreateDate',
      'GPSLatitude',
      'GPSLongitude',
    ]);
    if (!parsed) return {};
    return {
      make: parsed.Make || null,
      model: parsed.Model || null,
      software: parsed.Software || null,
      capturedAt: parsed.DateTimeOriginal || parsed.CreateDate || null,
      hasEmbeddedGps: Number.isFinite(parsed.latitude)
        || Number.isFinite(parsed.GPSLatitude)
        || Number.isFinite(parsed.longitude)
        || Number.isFinite(parsed.GPSLongitude),
    };
  } catch {
    return {};
  }
}

async function analyzeImage(buffer) {
  const pipeline = sharp(buffer, { failOn: 'warning' }).rotate();
  const [metadata, stats, hashPixels, colorResult, captureMetadata] = await Promise.all([
    pipeline.clone().metadata(),
    pipeline.clone().stats(),
    pipeline.clone().resize(9, 8, { fit: 'fill' }).grayscale().raw().toBuffer(),
    pipeline.clone().resize(16, 16, { fit: 'fill' }).removeAlpha().raw()
      .toBuffer({ resolveWithObject: true }),
    readCaptureMetadata(buffer),
  ]);

  const colorTotals = [0, 0, 0];
  const channels = colorResult.info.channels;
  const pixelCount = colorResult.info.width * colorResult.info.height;
  for (let index = 0; index < colorResult.data.length; index += channels) {
    colorTotals[0] += colorResult.data[index] || 0;
    colorTotals[1] += colorResult.data[index + 1] || colorResult.data[index] || 0;
    colorTotals[2] += colorResult.data[index + 2] || colorResult.data[index] || 0;
  }

  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const qualitySignals = [];
  if (width < 640 || height < 480) qualitySignals.push('low_resolution');
  if (stats.entropy < 2) qualitySignals.push('very_low_visual_entropy');
  if (stats.sharpness < 1) qualitySignals.push('low_sharpness');

  const integritySignals = [];
  let syntheticRiskScore = 0;
  if (captureMetadata.software && GENERATOR_SOFTWARE_PATTERN.test(captureMetadata.software)) {
    integritySignals.push('generator_software_metadata');
    syntheticRiskScore += 0.75;
  }
  if (!captureMetadata.make && !captureMetadata.model) {
    integritySignals.push('camera_metadata_absent');
    syntheticRiskScore += 0.1;
  }
  if (stats.entropy < 2) {
    integritySignals.push('very_low_visual_entropy');
    syntheticRiskScore += 0.15;
  }
  if (width < 320 || height < 240) {
    integritySignals.push('very_low_resolution');
    syntheticRiskScore += 0.1;
  }

  return {
    perceptualHash: bufferToDifferenceHash(hashPixels),
    width,
    height,
    format: metadata.format,
    entropy: round(stats.entropy),
    sharpness: round(stats.sharpness),
    averageColor: colorTotals.map((total) => round(total / pixelCount, 1)),
    captureMetadata,
    qualitySignals,
    syntheticRisk: {
      score: round(Math.min(syntheticRiskScore, 1)),
      level: syntheticRiskScore >= SYNTHETIC_HIGH_RISK_AT
        ? 'high'
        : syntheticRiskScore >= SYNTHETIC_MEDIUM_RISK_AT ? 'medium' : 'low',
      signals: integritySignals,
      disclaimer: 'Heuristic risk signals are not proof that an image is AI-generated.',
    },
  };
}

function compareScene(before, after) {
  const hashDistance = hammingDistance(before.perceptualHash, after.perceptualHash);
  const hashSimilarity = 1 - (hashDistance / 64);
  const colorDistance = Math.sqrt(
    before.averageColor.reduce((sum, value, index) => (
      sum + ((value - after.averageColor[index]) ** 2)
    ), 0)
  ) / Math.sqrt(3 * (255 ** 2));
  const colorSimilarity = Math.max(0, 1 - colorDistance);
  const score = round((hashSimilarity * 0.7) + (colorSimilarity * 0.3));
  const riskLevel = score < SCENE_HIGH_RISK_BELOW
    ? 'high'
    : score < SCENE_MEDIUM_RISK_BELOW ? 'medium' : 'low';
  return {
    score,
    riskLevel,
    perceptualDistance: hashDistance,
    colorDifference: round(colorDistance),
    signals: riskLevel === 'low' ? [] : ['before_after_scene_difference'],
    disclaimer: 'Scene consistency is a review aid and does not determine authenticity.',
  };
}

function findNearestPerceptualMatch(analyses, priorFingerprints) {
  let nearest = null;
  for (const analysis of analyses) {
    for (const candidate of priorFingerprints) {
      if (!candidate.perceptual_hash) continue;
      const distance = hammingDistance(analysis.perceptualHash, candidate.perceptual_hash);
      if (!nearest || distance < nearest.distance) {
        nearest = {
          matched: distance <= PERCEPTUAL_DISTANCE_THRESHOLD,
          distance,
          threshold: PERCEPTUAL_DISTANCE_THRESHOLD,
          submissionId: candidate.submission_id,
          existingKind: candidate.kind,
        };
      }
    }
  }
  return nearest || {
    matched: false,
    distance: null,
    threshold: PERCEPTUAL_DISTANCE_THRESHOLD,
    submissionId: null,
    existingKind: null,
  };
}

async function verifyEvidencePair({
  beforeBuffer,
  afterBuffer,
  priorFingerprints = [],
  exactDuplicate = false,
  exactDuplicateSubmissionId = null,
}) {
  const [before, after] = await Promise.all([
    analyzeImage(beforeBuffer),
    analyzeImage(afterBuffer),
  ]);
  const perceptualDuplicate = findNearestPerceptualMatch(
    [before, after],
    priorFingerprints
  );
  const sceneConsistency = compareScene(before, after);
  const syntheticImageRisk = {
    level: before.syntheticRisk.level === 'high' || after.syntheticRisk.level === 'high'
      ? 'high'
      : before.syntheticRisk.level === 'medium' || after.syntheticRisk.level === 'medium'
        ? 'medium'
        : 'low',
    score: Math.max(before.syntheticRisk.score, after.syntheticRisk.score),
    before: before.syntheticRisk,
    after: after.syntheticRisk,
    disclaimer: 'Synthetic-image risk is heuristic and always requires human interpretation.',
  };

  let overallRisk = 'low';
  const reviewReasons = [];
  if (exactDuplicate) {
    overallRisk = 'high';
    reviewReasons.push('exact_duplicate');
  }
  if (perceptualDuplicate.matched) {
    overallRisk = overallRisk === 'high' ? 'high' : 'medium';
    reviewReasons.push('perceptual_duplicate_match');
  }
  if (sceneConsistency.riskLevel === 'high') {
    overallRisk = 'high';
    reviewReasons.push('scene_consistency_risk');
  } else if (sceneConsistency.riskLevel === 'medium' && overallRisk === 'low') {
    overallRisk = 'medium';
    reviewReasons.push('scene_consistency_review');
  }
  if (syntheticImageRisk.level === 'high') {
    overallRisk = 'high';
    reviewReasons.push('synthetic_image_risk');
  } else if (syntheticImageRisk.level === 'medium' && overallRisk === 'low') {
    overallRisk = 'medium';
    reviewReasons.push('image_integrity_review');
  }
  if (before.qualitySignals.length || after.qualitySignals.length) {
    if (overallRisk === 'low') overallRisk = 'medium';
    reviewReasons.push('image_quality_review');
  }

  return {
    version: VERIFICATION_VERSION,
    thresholds: {
      perceptualDistance: PERCEPTUAL_DISTANCE_THRESHOLD,
      sceneHighRiskBelow: SCENE_HIGH_RISK_BELOW,
      sceneMediumRiskBelow: SCENE_MEDIUM_RISK_BELOW,
      syntheticHighRiskAt: SYNTHETIC_HIGH_RISK_AT,
      syntheticMediumRiskAt: SYNTHETIC_MEDIUM_RISK_AT,
    },
    overallRisk,
    reviewReasons: [...new Set(reviewReasons)],
    exactDuplicate: {
      matched: exactDuplicate,
      submissionId: exactDuplicateSubmissionId,
    },
    perceptualDuplicate,
    sceneConsistency,
    syntheticImageRisk,
    images: {
      before: {
        perceptualHash: before.perceptualHash,
        width: before.width,
        height: before.height,
        format: before.format,
        entropy: before.entropy,
        sharpness: before.sharpness,
        averageColor: before.averageColor,
        captureMetadata: before.captureMetadata,
        qualitySignals: before.qualitySignals,
      },
      after: {
        perceptualHash: after.perceptualHash,
        width: after.width,
        height: after.height,
        format: after.format,
        entropy: after.entropy,
        sharpness: after.sharpness,
        averageColor: after.averageColor,
        captureMetadata: after.captureMetadata,
        qualitySignals: after.qualitySignals,
      },
    },
  };
}

module.exports = {
  VERIFICATION_VERSION,
  PERCEPTUAL_DISTANCE_THRESHOLD,
  analyzeImage,
  hammingDistance,
  verifyEvidencePair,
};
