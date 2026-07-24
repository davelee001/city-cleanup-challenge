# Phase 4 - Advanced Evidence Verification

Phase 4 adds explainable verification signals to the private evidence pipeline.
It improves duplicate discovery and reviewer context without treating a
heuristic score as proof or allowing untested automatic approvals.

## Verification Version

Every new analysis stores the version `phase4-v1`, the thresholds used, an
overall risk level, review reasons, and per-image metadata. Versioning ensures a
future threshold or algorithm change does not silently reinterpret an old
decision.

## Perceptual Duplicate Matching

Each image receives a 64-bit difference hash (dHash) after normalized grayscale
resizing. The system compares new before/after images with prior evidence using
Hamming distance.

- SHA-256 exact matches remain automatic rejection signals.
- A perceptual distance at or below the configured threshold is a manual-review
  signal.
- Perceptual matches are not automatically rejected because visually similar
  public locations and common waste scenes can be legitimate.

The default Hamming-distance threshold is `8`. It must be calibrated with pilot
evidence before production.

## Scene Consistency

The before/after comparison combines normalized dHash similarity and average
color similarity. It reports a score, a risk level, and the underlying
distances. This signal helps identify clearly unrelated scenes, but expected
cleanup changes can also lower similarity.

## Image Quality and Integrity Signals

The engine records:

- Dimensions and format.
- Entropy and sharpness.
- Average color signature.
- Selected capture metadata, including camera make/model, software, capture
  timestamp, and whether embedded GPS exists.
- Low-resolution, very-low-entropy, and low-sharpness warnings.

Synthetic-image risk is deliberately conservative. Explicit generator-software
metadata is a strong signal; missing camera metadata and unusual image
statistics are weak signals. Every API response and reviewer panel states that
these heuristics are not proof an image is AI-generated.

## Configurable Thresholds

```env
EVIDENCE_PERCEPTUAL_DISTANCE_THRESHOLD=8
EVIDENCE_SCENE_HIGH_RISK_BELOW=0.30
EVIDENCE_SCENE_MEDIUM_RISK_BELOW=0.48
EVIDENCE_SYNTHETIC_HIGH_RISK_AT=0.60
EVIDENCE_SYNTHETIC_MEDIUM_RISK_AT=0.25
```

The exact values are initial engineering defaults, not validated production
policy. Threshold changes require version updates and a measured pilot dataset.

## Decision Policy

- Exact SHA-256 duplicate: automatically rejected and appealable once.
- Perceptual match or elevated risk: sent to manual review.
- No elevated signal: still sent to manual review during the pilot.
- Automatic approval: disabled.
- Reviewer self-approval: prohibited.

## Tests

Automated coverage verifies:

- Fingerprint stability after resize and JPEG recompression.
- Hamming-distance perceptual matching against previous evidence.
- Explicit generator-software metadata risk.
- Explainable scene, quality, and synthetic-risk output.
- Existing authentication, privacy, exact duplicate, appeal, and reviewer
  permissions.

## Remaining Before Production

- Pilot calibration using representative legitimate, duplicate, manipulated,
  and synthetic cleanup evidence.
- More crop/rotation-resistant fingerprints or local-feature matching.
- A separately evaluated image-forensics model or service.
- Device and submission-velocity risk signals.
- Independent fairness, false-positive, and geographic performance review.
- Reviewer tooling for side-by-side duplicate candidates.
- Monitoring for model or threshold drift.

Phase 4 itself does not initiate CELO payments. Phase 5 now consumes approved
submission IDs through an idempotent Celo Sepolia reward path.
