const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.EVIDENCE_STORAGE_PATH = path.join(
  os.tmpdir(),
  'city-cleanup-challenge-tests',
  String(process.pid)
);
process.env.METRICS_ENABLED = 'true';
