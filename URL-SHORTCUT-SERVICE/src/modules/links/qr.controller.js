/**
 * Bonus: GET /links/:id/qr
 * Sahiplik kontrolu servis katmaninda yapilir, sonra kisa link icin QR uretilir.
 */
const QRCode = require('qrcode');
const linksService = require('./links.service');

async function getQrCode(req, res) {
  const link = await linksService.getLinkForUser(req.params.id, req.user.id);

  const buffer = await QRCode.toBuffer(link.shortUrl, {
    type: 'png',
    width: 300,
    margin: 1,
  });

  res.type('png').send(buffer);
}

module.exports = { getQrCode };
