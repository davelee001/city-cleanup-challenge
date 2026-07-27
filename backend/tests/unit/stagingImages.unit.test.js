const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readImage } = require('../../../scripts/lib/staging-images');

describe('staging image fixture validation', () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'city-cleanup-images-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('recognizes a JPEG fixture by extension and signature', () => {
    const filePath = path.join(directory, 'before.jpg');
    fs.writeFileSync(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xdb]));

    expect(readImage(filePath)).toMatchObject({
      type: 'image/jpeg',
      extension: 'jpg',
    });
  });

  it('rejects content that does not match its extension', () => {
    const filePath = path.join(directory, 'fake.png');
    fs.writeFileSync(filePath, Buffer.from('not an image'));

    expect(() => readImage(filePath)).toThrow('Unsupported or invalid staging image');
  });

  it('checks the secondary WebP signature', () => {
    const filePath = path.join(directory, 'fake.webp');
    fs.writeFileSync(filePath, Buffer.from('RIFF0000NOPE'));

    expect(() => readImage(filePath)).toThrow('Invalid WebP staging image');
  });
});
