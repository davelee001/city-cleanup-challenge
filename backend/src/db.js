const databaseClient = String(process.env.DATABASE_CLIENT || 'sqlite').toLowerCase();

if (databaseClient === 'postgres') {
  module.exports = require('./database/postgres');
} else if (databaseClient === 'sqlite') {
  module.exports = require('./database/sqlite');
} else {
  throw new Error('DATABASE_CLIENT must be sqlite or postgres');
}
