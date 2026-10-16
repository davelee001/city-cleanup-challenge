const fs = require('fs');
const path = require('path');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

const EVIDENCE_ROOT = path.resolve(
  process.env.EVIDENCE_STORAGE_PATH || path.join(__dirname, '../../data/evidence'),
);
const useCloudStorage = process.env.USE_CLOUD_STORAGE === 'true';
const bucket = process.env.AWS_S3_BUCKET;
const keyPrefix = String(process.env.EVIDENCE_S3_PREFIX || 'evidence').replace(/^\/+|\/+$/g, '');

let s3;
if (useCloudStorage) {
  const options = { region: process.env.AWS_REGION };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    options.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }
  s3 = new S3Client(options);
} else {
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
}

function s3Location(key) {
  return `s3://${bucket}/${key}`;
}

function parseS3Location(storagePath) {
  const match = String(storagePath).match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error('Invalid S3 evidence storage path');
  }
  return { bucketName: match[1], key: match[2] };
}

function resolveLocalPath(storagePath) {
  const absolutePath = path.resolve(storagePath);
  if (
    absolutePath !== EVIDENCE_ROOT
    && !absolutePath.startsWith(`${EVIDENCE_ROOT}${path.sep}`)
  ) {
    throw new Error('Evidence path is outside the configured storage root');
  }
  return absolutePath;
}

async function put({ submissionId, filename, buffer, mimeType }) {
  if (!useCloudStorage) {
    const submissionDirectory = path.join(EVIDENCE_ROOT, String(submissionId));
    fs.mkdirSync(submissionDirectory, { recursive: true });
    const storagePath = path.join(submissionDirectory, filename);
    fs.writeFileSync(storagePath, buffer, { flag: 'wx' });
    return storagePath;
  }

  const key = `${keyPrefix}/${submissionId}/${filename}`;
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ServerSideEncryption: process.env.AWS_S3_KMS_KEY_ID ? 'aws:kms' : 'AES256',
    ...(process.env.AWS_S3_KMS_KEY_ID
      ? { SSEKMSKeyId: process.env.AWS_S3_KMS_KEY_ID }
      : {}),
  }));
  return s3Location(key);
}

async function remove(storagePath) {
  if (!String(storagePath).startsWith('s3://')) {
    const absolutePath = resolveLocalPath(storagePath);
    try {
      fs.unlinkSync(absolutePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return;
  }

  const location = parseS3Location(storagePath);
  await s3.send(new DeleteObjectCommand({
    Bucket: location.bucketName,
    Key: location.key,
  }));
}

async function send(storagePath, response) {
  if (!String(storagePath).startsWith('s3://')) {
    const absolutePath = resolveLocalPath(storagePath);
    if (!fs.existsSync(absolutePath)) {
      return false;
    }
    // The configured private evidence root may itself have a hidden ancestor.
    // Root containment and owner/admin authorization are enforced before this call.
    response.sendFile(absolutePath, { dotfiles: 'allow' });
    return true;
  }

  const location = parseS3Location(storagePath);
  try {
    const object = await s3.send(new GetObjectCommand({
      Bucket: location.bucketName,
      Key: location.key,
    }));
    object.Body.pipe(response);
    return true;
  } catch (error) {
    if (['NoSuchKey', 'NotFound'].includes(error.name)) {
      return false;
    }
    throw error;
  }
}

async function read(storagePath) {
  const maximum = 10 * 1024 * 1024;
  if (!String(storagePath).startsWith('s3://')) {
    const localPath = resolveLocalPath(storagePath);
    if ((await fs.promises.stat(localPath)).size > maximum) throw new Error('Evidence too large');
    const buffer = await fs.promises.readFile(localPath);
    if (buffer.length > maximum) throw new Error('Evidence too large');
    return buffer;
  }
  const location = parseS3Location(storagePath);
  const object = await s3.send(new GetObjectCommand({ Bucket: location.bucketName, Key: location.key }));
  const chunks = [];
  let bytes = 0;
  try {
    for await (const chunk of object.Body) {
      bytes += chunk.length;
      if (bytes > maximum) throw new Error('Evidence too large');
      chunks.push(Buffer.from(chunk));
    }
  } catch (error) {
    object.Body.destroy?.();
    throw error;
  }
  return Buffer.concat(chunks);
}

module.exports = {
  EVIDENCE_ROOT,
  put,
  remove,
  send,
  read,
  useCloudStorage,
};
