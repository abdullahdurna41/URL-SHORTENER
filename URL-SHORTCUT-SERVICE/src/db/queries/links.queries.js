/**
 * links tablosuna dair TUM SQL burada.
 *
 * Sahiplik kurali: kullaniciya ait tekil kayit sorgularinda ayri bir
 * "once bul sonra kontrol et" adimi yapma - user_id'yi dogrudan WHERE'e koy.
 * Bos donerse cagiran 404 dondurur (403 degil - baskasinin linkinin
 * varligini sizdirmaz).
 */
const { query } = require('../pool');

const LINK_FIELDS = 'id, user_id, short_code, original_url, expires_at, created_at';

/**
 * short_code UNIQUE oldugu icin cakismada Postgres 23505 firlatir.
 * Yeniden deneme mantigi links.service.js'te.
 */
async function createLink({ userId, shortCode, originalUrl, expiresAt = null }) {
  const result = await query(
    `INSERT INTO links (user_id, short_code, original_url, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING ${LINK_FIELDS}`,
    [userId, shortCode, originalUrl, expiresAt]
  );
  return result.rows[0];
}

/** Kullanicinin kendi linkleri, en yeniden eskiye. */
async function findLinksByUserId(userId) {
  const result = await query(
    `SELECT ${LINK_FIELDS}
     FROM links
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/** Redirect icin - auth yok, sahiplik filtresi yok. */
async function findLinkByShortCode(shortCode) {
  const result = await query(
    `SELECT ${LINK_FIELDS} FROM links WHERE short_code = $1`,
    [shortCode]
  );
  return result.rows[0] ?? null;
}

/** Stats ve QR icin - sahiplik WHERE'e gomulu. */
async function findLinkByIdForUser(id, userId) {
  const result = await query(
    `SELECT ${LINK_FIELDS} FROM links WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Sahiplik kontrolu ve silme tek adimda.
 * null donerse: link yok VEYA baskasina ait - cagiran ikisini de 404 sayar.
 */
async function deleteLinkForUser(id, userId) {
  const result = await query(
    'DELETE FROM links WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.rows[0] ?? null;
}

module.exports = {
  createLink,
  findLinksByUserId,
  findLinkByShortCode,
  findLinkByIdForUser,
  deleteLinkForUser,
};
