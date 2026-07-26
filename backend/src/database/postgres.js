const { Pool } = require('pg');
const { runMigrations } = require('./migrations');

const camelCaseAliases = {
  userid: 'userId',
  createdat: 'createdAt',
  targetwaste: 'targetWaste',
  estimatedduration: 'estimatedDuration',
  createdby: 'createdBy',
  updatedat: 'updatedAt',
  ipaddress: 'ipAddress',
  useragent: 'userAgent',
  sessionid: 'sessionId',
  eventid: 'eventId',
  checkintime: 'checkinTime',
  wastecollected: 'wasteCollected',
  wastetype: 'wasteType',
  beforephotopath: 'beforePhotoPath',
  afterphotopath: 'afterPhotoPath',
  fromstatus: 'fromStatus',
  tostatus: 'toStatus',
};

function normalizeRow(row) {
  if (!row) {
    return row;
  }

  return Object.entries(camelCaseAliases).reduce((normalized, [databaseName, appName]) => {
    if (
      Object.prototype.hasOwnProperty.call(normalized, databaseName)
      && !Object.prototype.hasOwnProperty.call(normalized, appName)
    ) {
      normalized[appName] = normalized[databaseName];
    }
    return normalized;
  }, { ...row });
}

function translatePlaceholders(sql) {
  let parameterNumber = 0;
  let inSingleQuote = false;

  return sql.replace(/'|(\?)/g, (match, placeholder) => {
    if (match === "'") {
      inSingleQuote = !inSingleQuote;
      return match;
    }
    if (!placeholder || inSingleQuote) {
      return match;
    }
    parameterNumber += 1;
    return `$${parameterNumber}`;
  });
}

function translateSql(inputSql) {
  let sql = String(inputSql).trim();

  if (/^BEGIN\s+IMMEDIATE$/i.test(sql)) {
    return 'BEGIN';
  }

  const ignoresConflicts = /^INSERT\s+OR\s+IGNORE\s+INTO/i.test(sql);
  if (ignoresConflicts) {
    sql = sql.replace(/^INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
    if (!/\bON\s+CONFLICT\b/i.test(sql)) {
      sql = `${sql.replace(/;\s*$/, '')} ON CONFLICT DO NOTHING`;
    }
  }

  const replacesCleanupProgress = /^INSERT\s+OR\s+REPLACE\s+INTO\s+cleanup_progress/i.test(sql);
  if (replacesCleanupProgress) {
    sql = sql.replace(
      /^INSERT\s+OR\s+REPLACE\s+INTO\s+cleanup_progress/i,
      'INSERT INTO cleanup_progress',
    );
    const columnsMatch = sql.match(/cleanup_progress\s*\(([^)]+)\)/i);
    if (columnsMatch && !/\bON\s+CONFLICT\b/i.test(sql)) {
      const columns = columnsMatch[1].split(',').map((column) => column.trim());
      const updates = columns
        .filter((column) => !['eventid', 'username'].includes(column.toLowerCase()))
        .map((column) => `${column} = EXCLUDED.${column}`)
        .join(', ');
      sql = `${sql.replace(/;\s*$/, '')} ON CONFLICT (eventid, username) DO UPDATE SET ${updates}`;
    }
  }

  sql = sql
    .replace(/datetime\('now',\s*'-7 days'\)/gi, "(CURRENT_TIMESTAMP - INTERVAL '7 days')")
    .replace(/datetime\('now',\s*'-30 days'\)/gi, "(CURRENT_TIMESTAMP - INTERVAL '30 days')")
    .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');

  return translatePlaceholders(sql);
}

function normalizeArguments(params, callback) {
  if (typeof params === 'function') {
    return { params: [], callback: params };
  }
  return {
    params: Array.isArray(params) ? params.map((value) => (value === undefined ? null : value)) : [],
    callback,
  };
}

function addReturningId(sql) {
  if (!/^\s*INSERT\b/i.test(sql) || /\bRETURNING\b/i.test(sql)) {
    return sql;
  }
  return `${sql.replace(/;\s*$/, '')} RETURNING id`;
}

function createAdapter(queryable, pool) {
  const adapter = {
    client: 'postgres',

    run(sql, params, callback) {
      const args = normalizeArguments(params, callback);
      const translatedSql = addReturningId(translateSql(sql));

      queryable
        .query(translatedSql, args.params)
        .then((result) => {
          const context = {
            lastID: result.rows[0]?.id ?? null,
            changes: result.rowCount,
          };
          if (args.callback) {
            args.callback.call(context, null);
          }
        })
        .catch((error) => {
          if (args.callback) {
            args.callback.call({}, error);
            return;
          }
          process.nextTick(() => {
            throw error;
          });
        });

      return adapter;
    },

    get(sql, params, callback) {
      const args = normalizeArguments(params, callback);
      queryable
        .query(translateSql(sql), args.params)
        .then((result) => args.callback?.(null, normalizeRow(result.rows[0])))
        .catch((error) => args.callback?.(error));
      return adapter;
    },

    all(sql, params, callback) {
      const args = normalizeArguments(params, callback);
      queryable
        .query(translateSql(sql), args.params)
        .then((result) => args.callback?.(null, result.rows.map(normalizeRow)))
        .catch((error) => args.callback?.(error));
      return adapter;
    },

    exec(sql, callback) {
      queryable
        .query(translateSql(sql))
        .then(() => callback?.(null))
        .catch((error) => callback?.(error));
      return adapter;
    },

    serialize(callback) {
      callback();
      return adapter;
    },

    async transaction(work) {
      if (!pool) {
        throw new Error('Nested database transactions are not supported.');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(createAdapter(client, null));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    close(callback) {
      if (!pool) {
        callback?.(new Error('Cannot close a transaction-scoped database connection.'));
        return;
      }
      pool.end().then(() => callback?.(null)).catch((error) => callback?.(error));
    },
  };

  return adapter;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required when DATABASE_CLIENT=postgres.');
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: Number.parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  idleTimeoutMillis: Number.parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: Number.parseInt(process.env.DATABASE_CONNECT_TIMEOUT_MS || '10000', 10),
  allowExitOnIdle: process.env.NODE_ENV === 'test',
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined,
});

const db = createAdapter(pool, pool);
db.pool = pool;
db.ready = runMigrations(pool);

module.exports = db;
