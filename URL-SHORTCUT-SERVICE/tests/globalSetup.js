/**
 * Tum test kosusundan once BIR KEZ calisir (jest globalSetup).
 * Test veritabani yoksa olusturur ve migration'lari uygular -
 * boylece `npm test` ek bir hazirlik adimi gerektirmez.
 */
const { execFileSync } = require('child_process');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();
const { testDbUrl, adminDbUrl } = require('./testDbUrl');

module.exports = async function globalSetup() {
  const baseUrl = process.env.DATABASE_URL;
  const testUrl = testDbUrl(baseUrl);
  const dbName = new URL(testUrl).pathname.replace(/^\//, '');

  const admin = new Client({ connectionString: adminDbUrl(baseUrl) });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rowCount === 0) {
    // Tanimlayici parametre olarak gecirilemez; dbName kod icinde uretildigi
    // ve kullanici girdisi olmadigi icin guvenli.
    await admin.query(`CREATE DATABASE ${dbName}`);
  }
  await admin.end();

  execFileSync('node', [path.join(__dirname, '..', 'scripts', 'migrate.js')], {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'ignore',
  });
};
