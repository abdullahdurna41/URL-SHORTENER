/**
 * Basit migration runner (ORM yok, raw SQL).
 *
 * migrations/*.sql dosyalarini isim sirasina gore calistirir ve
 * calistirilanlari schema_migrations tablosuna yazar - yani tekrar tekrar
 * calistirmak guvenli.
 *
 * Kullanim: npm run migrate
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db/pool');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`- ${file} (zaten uygulanmis, atlaniyor)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      // Her migration tek transaction: yarim uygulanmis sema olmaz
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`+ ${file} uygulandi`);
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`${file} basarisiz: ${err.message}`);
    } finally {
      client.release();
    }
  }

  console.log(count === 0 ? 'Sema guncel.' : `${count} migration uygulandi.`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err.message);
    await pool.end();
    process.exit(1);
  });
