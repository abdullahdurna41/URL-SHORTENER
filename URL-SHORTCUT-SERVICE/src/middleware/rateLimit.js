/**
 * Bonus: IP bazli istek siniri (express-rate-limit).
 *
 * Iki ayri limit: /auth/* brute force hedefi oldugu icin siki,
 * genel API icin gevsek. Redirect route'u limitlenmez - o normal trafik
 * ve limitlenirse servis kendi isini yapamaz hale gelir.
 */
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const jsonError = (message) => (req, res) => res.status(429).json({ error: message });

const base = {
  windowMs: 15 * 60 * 1000, // 15 dakika
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Testlerde limit devreye girerse testler birbirini bozar
  skip: () => env.isTest,
};

const authLimiter = rateLimit({
  ...base,
  limit: 10,
  handler: jsonError('Cok fazla giris denemesi. Lutfen daha sonra tekrar deneyin.'),
});

const apiLimiter = rateLimit({
  ...base,
  limit: 100,
  handler: jsonError('Cok fazla istek. Lutfen daha sonra tekrar deneyin.'),
});

module.exports = { authLimiter, apiLimiter };
