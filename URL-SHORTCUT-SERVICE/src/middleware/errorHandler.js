/**
 * Uygulamadaki TEK hata cikis noktasi. app.js'te en son mount edilir.
 * Express 5 async handler hatalarini otomatik buraya yollar.
 *
 * Cikti formati brifte istendigi gibi her zaman: { "error": "..." }
 */
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars -- 4 parametre Express'e "bu error handler" der
function errorHandler(err, req, res, next) {
  // Gecersiz JSON govdesi: express.json() SyntaxError firlatir -> 500 degil 400
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Gecersiz JSON govdesi' });
  }

  if (err.isOperational) {
    return res.status(err.status).json({ error: err.message });
  }

  // Beklenmeyen hata: sunucuya logla, istemciye AYRINTI SIZDIRMA.
  // Stack trace veya DB hata mesaji istemciye giderse sema bilgisi disari cikar.
  if (!env.isTest) {
    console.error('Beklenmeyen hata:', err);
  }
  res.status(500).json({ error: 'Sunucu hatasi' });
}

/** Hicbir route eslesmezse - errorHandler'dan hemen once mount edilir. */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Kaynak bulunamadi' });
}

module.exports = { errorHandler, notFoundHandler };
