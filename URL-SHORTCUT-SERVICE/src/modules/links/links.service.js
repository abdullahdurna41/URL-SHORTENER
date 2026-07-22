/**
 * Is kurallari. HTTP bilmez.
 */
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { generateShortCode } = require('../../utils/shortCode');
const linksQueries = require('../../db/queries/links.queries');
const clicksQueries = require('../../db/queries/clicks.queries');

const PG_UNIQUE_VIOLATION = '23505';
const MAX_CODE_ATTEMPTS = 5;

/** DB satirini API yanitina cevirir (snake_case -> camelCase + tam kisa link). */
function toResponse(link) {
  return {
    id: link.id,
    shortCode: link.short_code,
    shortUrl: `${env.baseUrl}/${link.short_code}`,
    originalUrl: link.original_url,
    expiresAt: link.expires_at,
    createdAt: link.created_at,
  };
}

async function createLink({ userId, originalUrl, customAlias, expiresAt }) {
  const expires = expiresAt ? new Date(expiresAt) : null;

  // Ozel alias verilmisse tek deneme - doluysa kullaniciya soylemek gerekir,
  // sessizce baska bir kod uretmek istemedigi seyi vermek olur.
  if (customAlias) {
    try {
      const link = await linksQueries.createLink({
        userId,
        shortCode: customAlias,
        originalUrl,
        expiresAt: expires,
      });
      return toResponse(link);
    } catch (err) {
      if (err.code === PG_UNIQUE_VIOLATION) {
        throw ApiError.conflict('Bu alias zaten kullaniliyor');
      }
      throw err;
    }
  }

  // Rastgele kod: cakisirsa yenisini uret. Cakisma ihtimali ~57^7'de 1
  // oldugu icin pratikte ilk denemede geciyor; dongu yine de gerekli
  // cunku garanti veren sey UNIQUE constraint.
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const link = await linksQueries.createLink({
        userId,
        shortCode: generateShortCode(),
        originalUrl,
        expiresAt: expires,
      });
      return toResponse(link);
    } catch (err) {
      if (err.code === PG_UNIQUE_VIOLATION && attempt < MAX_CODE_ATTEMPTS) {
        continue;
      }
      if (err.code === PG_UNIQUE_VIOLATION) {
        throw ApiError.internal('Kisa kod uretilemedi, lutfen tekrar deneyin');
      }
      throw err;
    }
  }
}

async function listLinks(userId) {
  const links = await linksQueries.findLinksByUserId(userId);
  return links.map(toResponse);
}

async function getStats(linkId, userId) {
  const link = await linksQueries.findLinkByIdForUser(linkId, userId);
  // Baskasinin linki de buraya duser - 403 degil 404 donuyoruz ki
  // hangi id'lerin var oldugu disaridan taranamasin.
  if (!link) throw ApiError.notFound('Link bulunamadi');

  const [totalClicks, daily, referrers] = await Promise.all([
    clicksQueries.countClicksByLinkId(linkId),
    clicksQueries.dailyClicksLast7Days(linkId),
    clicksQueries.topReferrers(linkId),
  ]);

  return { ...toResponse(link), totalClicks, last7Days: daily, topReferrers: referrers };
}

async function deleteLink(linkId, userId) {
  const deleted = await linksQueries.deleteLinkForUser(linkId, userId);
  if (!deleted) throw ApiError.notFound('Link bulunamadi');
}

/** QR controller'i icin - sahiplik kontrollu tekil getirme. */
async function getLinkForUser(linkId, userId) {
  const link = await linksQueries.findLinkByIdForUser(linkId, userId);
  if (!link) throw ApiError.notFound('Link bulunamadi');
  return toResponse(link);
}

module.exports = { createLink, listLinks, getStats, deleteLink, getLinkForUser, toResponse };
