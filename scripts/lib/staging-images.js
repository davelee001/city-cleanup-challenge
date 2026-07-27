const fs = require('node:fs');
const path = require('node:path');

function readImage(filePath) {
  const resolvedPath = path.resolve(filePath);
  const buffer = fs.readFileSync(resolvedPath);
  const extension = path.extname(resolvedPath).toLowerCase();
  const formats = {
    '.jpg': { type: 'image/jpeg', extension: 'jpg', signature: [0xff, 0xd8, 0xff] },
    '.jpeg': { type: 'image/jpeg', extension: 'jpg', signature: [0xff, 0xd8, 0xff] },
    '.png': { type: 'image/png', extension: 'png', signature: [0x89, 0x50, 0x4e, 0x47] },
    '.webp': { type: 'image/webp', extension: 'webp', signature: [0x52, 0x49, 0x46, 0x46] },
  };
  const format = formats[extension];
  if (!format || !format.signature.every((byte, index) => buffer[index] === byte)) {
    throw new Error(`Unsupported or invalid staging image: ${resolvedPath}`);
  }
  if (extension === '.webp' && buffer.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new Error(`Invalid WebP staging image: ${resolvedPath}`);
  }
  return { buffer, ...format };
}

function appendEvidenceImages(form, beforePath, afterPath) {
  const before = readImage(beforePath);
  const after = readImage(afterPath);
  form.append(
    'beforePhoto',
    new Blob([before.buffer], { type: before.type }),
    `before.${before.extension}`,
  );
  form.append(
    'afterPhoto',
    new Blob([after.buffer], { type: after.type }),
    `after.${after.extension}`,
  );
}

module.exports = { appendEvidenceImages, readImage };
