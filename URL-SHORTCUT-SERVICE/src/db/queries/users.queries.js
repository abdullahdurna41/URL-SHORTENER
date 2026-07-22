/**
 * users tablosuna dair TUM SQL burada. Baska dosyada users SQL'i yazilmaz.
 */
const { query } = require('../pool');

/**
 * Yeni kullanici olusturur.
 * E-posta zaten kayitliysa Postgres 23505 (unique_violation) firlatir -
 * yakalamak servis katmaninin isi, burada degil.
 */
async function createUser(email, passwordHash) {
  const result = await query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, created_at`,
    [email, passwordHash]
  );
  return result.rows[0];
}

/**
 * Login icin kullanilir - password_hash'i BILEREK dondurur.
 * Bu yuzden donen nesne asla dogrudan res.json()'a verilmemeli.
 */
async function findUserByEmail(email) {
  const result = await query(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
}

module.exports = { createUser, findUserByEmail };
