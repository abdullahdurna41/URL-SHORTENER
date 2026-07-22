const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({ connectionString: env.databaseUrl });

pool.on('error', (err) => {
  console.error('Beklenmeyen veritabani hatasi:', err);
});

/**
 * Tum sorgular bu helper uzerinden gecer.
 * Parametreleri her zaman $1, $2 seklinde ver - string birlestirme YAPMA (SQL injection).
 */
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
