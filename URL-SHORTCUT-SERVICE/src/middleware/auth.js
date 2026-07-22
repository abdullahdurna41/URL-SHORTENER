/**
 * Authorization: Bearer <token> basligini dogrular, req.user = { id, email } set eder.
 *
 * Basarisiz her durumda (baslik yok / format bozuk / imza gecersiz / suresi dolmus)
 * ayni 401 doner - hangi sebep oldugunu detaylandirmak saldirgana bilgi verir.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function authenticate(req, res, next) {
  const header = req.get('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Token gerekli'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(ApiError.unauthorized('Gecersiz veya suresi dolmus token'));
  }
}

module.exports = authenticate;
