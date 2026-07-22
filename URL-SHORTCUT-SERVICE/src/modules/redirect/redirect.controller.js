/**
 * GET /:kod - herkese acik yonlendirme.
 */
const ApiError = require('../../utils/ApiError');
const linksQueries = require('../../db/queries/links.queries');
const clicksQueries = require('../../db/queries/clicks.queries');

async function redirect(req, res, next) {
  const link = await linksQueries.findLinkByShortCode(req.params.kod);

  if (!link) return next(ApiError.notFound('Bu kisa koda ait link bulunamadi'));

  if (link.expires_at && new Date(link.expires_at) <= new Date()) {
    return next(ApiError.gone('Bu linkin suresi dolmus'));
  }

  // 301 DEGIL 302: tarayici 301'i kalici olarak cache'ler ve sonraki
  // tiklamalar sunucuya hic ulasmaz - istatistik olculemez hale gelir.
  res.redirect(302, link.original_url);

  // Yanit zaten gonderildi; tiklama kaydi yonlendirmeyi bekletmiyor.
  // Kayit basarisiz olursa kullanicinin yonlendirmesi etkilenmemeli,
  // bu yuzden hata sadece loglanir.
  clicksQueries
    .recordClick({
      linkId: link.id,
      referrer: req.get('referer') ?? null,
      userAgent: req.get('user-agent') ?? null,
    })
    .catch((err) => console.error('Tiklama kaydedilemedi:', err.message));
}

module.exports = { redirect };
