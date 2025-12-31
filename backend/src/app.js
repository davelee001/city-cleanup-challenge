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
<<<<<<< HEAD
    res.sendFile('health.html', { root: 'public' });
  });

  app.get('/api/health-data', (req, res) => {
=======
>>>>>>> e4dcf7d0725a7d10a4bdf2d352ace95286380ef5
    res.json({ status: 'ok', service: 'city-cleanup-backend' });
  });

  // Example API route
  app.get('/api/info', (req, res) => {
    res.json({ name: 'City Cleanup Backend', version: '1.0.0' });
  });

  return app;
}

module.exports = { createApp };
