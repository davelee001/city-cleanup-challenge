const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use(morgan('tiny'));

  app.use(express.static('public'));

  app.get('/health', (req, res) => {
    res.sendFile('health.html', { root: 'public' });
  });

  app.get('/api/health-data', (req, res) => {
    res.json({ status: 'ok', service: 'city-cleanup-backend' });
  });

  // Example API route
  app.get('/api/info', (req, res) => {
    res.json({ name: 'City Cleanup Backend', version: '1.0.0' });
  });

  return app;
}

module.exports = { createApp };
