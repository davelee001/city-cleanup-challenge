const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { requireAdmin } = require('../middleware/auth');
const {
  verifyEvidencePair,
} = require('../services/evidenceVerification');
const { ensureRewardClaim } = require('../services/rewardService');

const EVIDENCE_ROOT = path.resolve(
  process.env.EVIDENCE_STORAGE_PATH || path.join(__dirname, '../../data/evidence')
);
const ALLOWED_CATEGORIES = new Set(['plastic', 'glass', 'metal', 'paper', 'mixed']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 2, fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, callback) => {
    if (!IMAGE_TYPES[file.mimetype]) {
      return callback(new Error('Only JPEG, PNG, and WebP evidence images are allowed'));
    }
    return callback(null, true);
  },
});
const receiveEvidence = upload.fields([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 },
]);

function handleEvidenceUpload(req, res, next) {
  receiveEvidence(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid evidence upload',
      });
    }
    return next();
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateSubmission(body) {
  const wasteCategory = String(body.wasteCategory || '').trim().toLowerCase();
  const itemCount = parseNumber(body.itemCount);
  const estimatedWeight = parseNumber(body.estimatedWeight);
  const latitude = parseNumber(body.latitude);
  const longitude = parseNumber(body.longitude);
  const locationAccuracy = parseNumber(body.locationAccuracy);
  const capturedBefore = new Date(body.capturedBeforeAt);
  const capturedAfter = new Date(body.capturedAfterAt);
  const now = Date.now();

  if (!ALLOWED_CATEGORIES.has(wasteCategory)) {
    return { error: 'Waste category must be plastic, glass, metal, paper, or mixed' };
  }
  if (
    (itemCount === null || !Number.isInteger(itemCount) || itemCount < 1)
    && (estimatedWeight === null || estimatedWeight <= 0)
  ) {
    return { error: 'Provide a positive item count or estimated weight' };
  }
  if (latitude === null || latitude < -90 || latitude > 90) {
    return { error: 'Valid GPS latitude is required' };
  }
  if (longitude === null || longitude < -180 || longitude > 180) {
    return { error: 'Valid GPS longitude is required' };
  }
  if (locationAccuracy === null || locationAccuracy <= 0 || locationAccuracy > 500) {
    return { error: 'Location accuracy must be between 0 and 500 metres' };
  }
  if (
    Number.isNaN(capturedBefore.getTime())
    || Number.isNaN(capturedAfter.getTime())
    || capturedAfter < capturedBefore
    || capturedBefore.getTime() > now + 5 * 60 * 1000
    || capturedAfter.getTime() > now + 5 * 60 * 1000
  ) {
    return { error: 'Valid before and after capture timestamps are required' };
  }

  return {
    value: {
      wasteCategory,
      itemCount,
      estimatedWeight,
      latitude,
      longitude,
      locationAccuracy,
      capturedBeforeAt: capturedBefore.toISOString(),
      capturedAfterAt: capturedAfter.toISOString(),
      notes: String(body.notes || '').trim().slice(0, 1000) || null,
    },
  };
}

async function inspectImage(file) {
  const metadata = await sharp(file.buffer).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
    throw new Error('Evidence file contents are not a supported image');
  }
  return {
    hash: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    mimeType: `image/${metadata.format === 'jpeg' ? 'jpeg' : metadata.format}`,
  };
}

function serializeSubmission(row) {
  let verification = null;
  try {
    verification = row.verification_summary ? JSON.parse(row.verification_summary) : null;
  } catch {
    verification = null;
  }
  return {
    id: row.id,
    username: row.username,
    wasteCategory: row.waste_category,
    itemCount: row.item_count,
    estimatedWeight: row.estimated_weight,
    notes: row.notes,
    location: {
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.location_accuracy,
    },
    capturedBeforeAt: row.captured_before_at,
    capturedAfterAt: row.captured_after_at,
    status: row.status,
    duplicateOf: row.duplicate_of,
    verification,
    verificationVersion: row.verification_version,
    riskLevel: row.risk_level,
    rejectionReason: row.rejection_reason,
    appealReason: row.appeal_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images: {
      before: `/api/v1/evidence/submissions/${row.id}/images/before`,
      after: `/api/v1/evidence/submissions/${row.id}/images/after`,
    },
  };
}

async function getSubmission(db, id) {
  return dbGet(
    db,
    `SELECT s.*, u.username
     FROM cleanup_submissions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [id]
  );
}

function canAccessSubmission(user, submission) {
  return user.role === 'admin' || Number(user.id) === Number(submission.user_id);
}

function createEvidenceRouter(db) {
  const router = express.Router();

  router.post(
    '/submissions',
    handleEvidenceUpload,
    async (req, res) => {
      const beforeFile = req.files?.beforePhoto?.[0];
      const afterFile = req.files?.afterPhoto?.[0];
      if (!beforeFile || !afterFile) {
        return res.status(400).json({
          success: false,
          message: 'One before photo and one after photo are required',
        });
      }

      const validation = validateSubmission(req.body);
      if (validation.error) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      let beforeImage;
      let afterImage;
      try {
        [beforeImage, afterImage] = await Promise.all([
          inspectImage(beforeFile),
          inspectImage(afterFile),
        ]);
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      let existingMatch = null;
      let priorFingerprints = [];
      try {
        [existingMatch, priorFingerprints] = await Promise.all([
          dbGet(
            db,
            `SELECT submission_id, sha256
             FROM cleanup_evidence_files
             WHERE sha256 IN (?, ?)
             ORDER BY id
             LIMIT 1`,
            [beforeImage.hash, afterImage.hash]
          ),
          dbAll(
            db,
            `SELECT submission_id, kind, perceptual_hash
             FROM cleanup_evidence_files
             WHERE perceptual_hash IS NOT NULL`
          ),
        ]);
      } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to check duplicate evidence' });
      }

      const isInternalDuplicate = beforeImage.hash === afterImage.hash;
      const isDuplicate = Boolean(existingMatch || isInternalDuplicate);
      const finalStatus = isDuplicate ? 'rejected' : 'manual_review';
      const duplicateOf = existingMatch?.submission_id || null;
      const rejectionReason = isDuplicate
        ? 'This evidence exactly matches an image that was already submitted.'
        : null;
      let verification;
      try {
        verification = await verifyEvidencePair({
          beforeBuffer: beforeFile.buffer,
          afterBuffer: afterFile.buffer,
          priorFingerprints,
          exactDuplicate: isDuplicate,
          exactDuplicateSubmissionId: duplicateOf,
        });
      } catch (error) {
        console.error('Evidence verification failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Unable to analyze cleanup evidence',
        });
      }
      const verificationSummary = JSON.stringify(verification);
      const values = validation.value;
      const storedFiles = [];

      try {
        await dbRun(db, 'BEGIN IMMEDIATE');
        const created = await dbRun(
          db,
          `INSERT INTO cleanup_submissions (
             user_id, waste_category, item_count, estimated_weight, notes,
             latitude, longitude, location_accuracy, captured_before_at,
             captured_after_at, status, duplicate_of, verification_summary,
             verification_version, risk_level, rejection_reason, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            req.user.id,
            values.wasteCategory,
            values.itemCount,
            values.estimatedWeight,
            values.notes,
            values.latitude,
            values.longitude,
            values.locationAccuracy,
            values.capturedBeforeAt,
            values.capturedAfterAt,
            finalStatus,
            duplicateOf,
            verificationSummary,
            verification.version,
            verification.overallRisk,
            rejectionReason,
          ]
        );

        const submissionDir = path.join(EVIDENCE_ROOT, String(created.lastID));
        fs.mkdirSync(submissionDir, { recursive: true });
        for (const [kind, file, image] of [
          ['before', beforeFile, beforeImage],
          ['after', afterFile, afterImage],
        ]) {
          const filename = `${kind}-${crypto.randomUUID()}${IMAGE_TYPES[image.mimeType]}`;
          const storagePath = path.join(submissionDir, filename);
          fs.writeFileSync(storagePath, file.buffer, { flag: 'wx' });
          storedFiles.push(storagePath);
          await dbRun(
            db,
            `INSERT INTO cleanup_evidence_files (
               submission_id, kind, storage_path, sha256, perceptual_hash,
               image_metadata, mime_type, byte_size, original_name
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              created.lastID,
              kind,
              storagePath,
              image.hash,
              verification.images[kind].perceptualHash,
              JSON.stringify(verification.images[kind]),
              image.mimeType,
              file.size,
              path.basename(file.originalname || `${kind}.image`),
            ]
          );
        }

        await dbRun(
          db,
          `INSERT INTO submission_transitions
             (submission_id, actor_user_id, from_status, to_status, reason)
           VALUES (?, ?, 'draft', 'submitted', 'Evidence submitted by user')`,
          [created.lastID, req.user.id]
        );
        await dbRun(
          db,
          `INSERT INTO submission_transitions
             (submission_id, actor_user_id, from_status, to_status, reason)
           VALUES (?, NULL, 'submitted', 'automated_review', 'Exact duplicate check completed')`,
          [created.lastID]
        );
        await dbRun(
          db,
          `INSERT INTO submission_transitions
             (submission_id, actor_user_id, from_status, to_status, reason)
           VALUES (?, NULL, 'automated_review', ?, ?)`,
          [
            created.lastID,
            finalStatus,
            isDuplicate
              ? rejectionReason
              : `Awaiting human verification (${verification.overallRisk} risk: ${
                verification.reviewReasons.join(', ') || 'no elevated signals'
              })`,
          ]
        );
        await dbRun(db, 'COMMIT');

        const submission = await getSubmission(db, created.lastID);
        return res.status(201).json({
          success: true,
          submission: serializeSubmission(submission),
        });
      } catch (error) {
        await dbRun(db, 'ROLLBACK').catch(() => {});
        storedFiles.forEach((file) => {
          try {
            fs.unlinkSync(file);
          } catch {}
        });
        return res.status(500).json({ success: false, message: 'Unable to save cleanup evidence' });
      }
    }
  );

  router.get('/submissions', async (req, res) => {
    const params = [];
    const filters = [];
    if (req.user.role !== 'admin') {
      filters.push('s.user_id = ?');
      params.push(req.user.id);
    }
    if (req.query.status) {
      filters.push('s.status = ?');
      params.push(String(req.query.status));
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    try {
      const submissions = await dbAll(
        db,
        `SELECT s.*, u.username
         FROM cleanup_submissions s
         JOIN users u ON u.id = s.user_id
         ${where}
         ORDER BY s.created_at DESC, s.id DESC`,
        params
      );
      return res.json({
        success: true,
        submissions: submissions.map(serializeSubmission),
      });
    } catch {
      return res.status(500).json({ success: false, message: 'Unable to load submissions' });
    }
  });

  router.get('/submissions/:id', async (req, res) => {
    try {
      const submission = await getSubmission(db, req.params.id);
      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }
      if (!canAccessSubmission(req.user, submission)) {
        return res.status(403).json({ success: false, message: 'You cannot access this submission' });
      }
      const transitions = await dbAll(
        db,
        `SELECT from_status AS fromStatus, to_status AS toStatus, reason,
                created_at AS createdAt
         FROM submission_transitions
         WHERE submission_id = ?
         ORDER BY id`,
        [submission.id]
      );
      return res.json({
        success: true,
        submission: { ...serializeSubmission(submission), transitions },
      });
    } catch {
      return res.status(500).json({ success: false, message: 'Unable to load submission' });
    }
  });

  router.get('/submissions/:id/images/:kind', async (req, res) => {
    if (!['before', 'after'].includes(req.params.kind)) {
      return res.status(404).json({ success: false, message: 'Evidence image not found' });
    }
    try {
      const submission = await getSubmission(db, req.params.id);
      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }
      if (!canAccessSubmission(req.user, submission)) {
        return res.status(403).json({ success: false, message: 'You cannot access this evidence' });
      }
      const image = await dbGet(
        db,
        `SELECT storage_path, mime_type
         FROM cleanup_evidence_files
         WHERE submission_id = ? AND kind = ?`,
        [submission.id, req.params.kind]
      );
      if (!image || !fs.existsSync(image.storage_path)) {
        return res.status(404).json({ success: false, message: 'Evidence image not found' });
      }
      res.type(image.mime_type);
      res.set('Cache-Control', 'private, no-store');
      return res.sendFile(path.resolve(image.storage_path));
    } catch {
      return res.status(500).json({ success: false, message: 'Unable to load evidence image' });
    }
  });

  router.post('/submissions/:id/appeal', async (req, res) => {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10 || reason.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Appeal reason must be between 10 and 1000 characters',
      });
    }
    try {
      const submission = await getSubmission(db, req.params.id);
      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }
      if (Number(submission.user_id) !== Number(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Only the owner can appeal' });
      }
      if (submission.status !== 'rejected' || submission.appealed_at) {
        return res.status(409).json({
          success: false,
          message: 'Only a rejected submission can be appealed once',
        });
      }
      await dbRun(
        db,
        `UPDATE cleanup_submissions
         SET status = 'manual_review', appeal_reason = ?, appealed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [reason, submission.id]
      );
      await dbRun(
        db,
        `INSERT INTO submission_transitions
           (submission_id, actor_user_id, from_status, to_status, reason)
         VALUES (?, ?, 'rejected', 'appealed', ?)`,
        [submission.id, req.user.id, reason]
      );
      await dbRun(
        db,
        `INSERT INTO submission_transitions
           (submission_id, actor_user_id, from_status, to_status, reason)
         VALUES (?, NULL, 'appealed', 'manual_review', 'Appeal queued for review')`,
        [submission.id]
      );
      return res.json({
        success: true,
        submission: serializeSubmission(await getSubmission(db, submission.id)),
      });
    } catch {
      return res.status(500).json({ success: false, message: 'Unable to submit appeal' });
    }
  });

  router.patch('/submissions/:id/review', requireAdmin, async (req, res) => {
    const decision = String(req.body.decision || '').toLowerCase();
    const reason = String(req.body.reason || '').trim();
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
    }
    if (reason.length < 5 || reason.length > 1000) {
      return res.status(400).json({ success: false, message: 'Review reason is required' });
    }
    try {
      const submission = await getSubmission(db, req.params.id);
      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }
      if (Number(submission.user_id) === Number(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Reviewers cannot decide their own submissions' });
      }
      if (!['manual_review', 'automated_review'].includes(submission.status)) {
        return res.status(409).json({ success: false, message: 'Submission is not awaiting review' });
      }
      await dbRun(
        db,
        `UPDATE cleanup_submissions
         SET status = ?, rejection_reason = ?, reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [decision, decision === 'rejected' ? reason : null, req.user.id, submission.id]
      );
      await dbRun(
        db,
        `INSERT INTO submission_transitions
           (submission_id, actor_user_id, from_status, to_status, reason)
         VALUES (?, ?, ?, ?, ?)`,
        [submission.id, req.user.id, submission.status, decision, reason]
      );
      let reward = null;
      let rewardError = null;
      if (decision === 'approved') {
        try {
          reward = await ensureRewardClaim(db, submission.id);
        } catch (error) {
          rewardError = {
            code: error.code || 'REWARD_CLAIM_FAILED',
            message: error.message || 'Unable to create reward claim',
          };
        }
      }
      return res.json({
        success: true,
        submission: serializeSubmission(await getSubmission(db, submission.id)),
        reward,
        rewardError,
      });
    } catch {
      return res.status(500).json({ success: false, message: 'Unable to review submission' });
    }
  });

  return router;
}

module.exports = { createEvidenceRouter, EVIDENCE_ROOT };
