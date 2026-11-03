import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '55414' || url.pathname !== '/newsfoundry') {
  throw new Error('Expected the dedicated local NewsFoundry database on 127.0.0.1:55414.');
}
const databaseDir = path.join(root, '.local-postgres');
const postgres = new EmbeddedPostgres({
  databaseDir, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
  port: 55414, persistent: true, authMethod: 'scram-sha-256',
  initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'],
});
if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await postgres.initialise();
await postgres.start();
// The package includes pg; resolve it through its public dependency tree.
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const pgPath = require.resolve('pg', { paths: [path.dirname(require.resolve('embedded-postgres'))] });
const { Client } = require(pgPath);
const adminURL = new URL(process.env.DATABASE_URL);
adminURL.pathname = '/postgres';
const client = new Client({ connectionString: adminURL.href });
await client.connect();
try {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', ['newsfoundry']);
  if (!result.rowCount) await client.query("CREATE DATABASE newsfoundry ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0");
} finally { await client.end(); }
console.log('NewsFoundry PostgreSQL ready on 127.0.0.1:55414; data is preserved.');
setInterval(() => {}, 60_000);
