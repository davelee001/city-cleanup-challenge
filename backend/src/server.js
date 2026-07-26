require('dotenv').config();
const { createApp } = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const app = createApp();
let server;
let shuttingDown = false;

async function startServer() {
  try {
    await db.ready;
    server = app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    db.close(() => {});
    process.exit(1);
  }
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; closing HTTP and database connections`);

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  const closeDatabase = () => {
    db.close((error) => {
      clearTimeout(forceExit);
      if (error) {
        console.error('Database shutdown failed:', error);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  if (server) server.close(closeDatabase);
  else closeDatabase();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
