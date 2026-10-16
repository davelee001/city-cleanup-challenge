const path = require('path');
const fs = require('fs');
const storage = require('../../src/services/evidenceStorage');
const express = require('express');
const request = require('supertest');

describe('private evidence reads for background verification', () => {
  it('reads privately stored evidence without creating public URLs', async () => {
    const buffer = Buffer.from('private sample bytes');
    const location = await storage.put({ submissionId: 'worker-read-test', filename: 'sample.bin', buffer, mimeType: 'application/octet-stream' });
    try { expect(await storage.read(location)).toEqual(buffer); }
    finally { await storage.remove(location); }
  });
  it('rejects paths outside the configured evidence directory', async () => {
    await expect(storage.read(path.resolve(storage.EVIDENCE_ROOT, '..', 'outside.jpg'))).rejects.toThrow('outside');
  });
  it('refuses oversized files before loading them into memory', async () => {
    const stat = jest.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 11 * 1024 * 1024 });
    try { await expect(storage.read(path.join(storage.EVIDENCE_ROOT, 'oversized.jpg'))).rejects.toThrow('too large'); }
    finally { stat.mockRestore(); }
  });
  it('delivers evidence inside a hidden storage directory after root validation', async () => {
    const location = await storage.put({ submissionId: '.private-worker-test', filename: 'sample.bin', buffer: Buffer.from('sample'), mimeType: 'application/octet-stream' });
    const app = express();
    app.get('/test', async (req, res) => { res.type('application/octet-stream'); await storage.send(location, res); });
    try { const response = await request(app).get('/test'); expect(response.statusCode).toBe(200); expect(response.body.toString()).toBe('sample'); }
    finally { await storage.remove(location); }
  });
});
