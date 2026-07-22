/**
 * Kisa kod uretimi.
 *
 * Cakisma garantisi nanoid'den DEGIL, veritabanindaki UNIQUE constraint'ten gelir.
 * "Once SELECT ile var mi bak, sonra INSERT et" YAPMA - iki istek ayni anda
 * gelirse ikisi de "bos" gorup ayni kodu yazmaya calisir (race condition).
 * Dogru desen links.service.js'te: INSERT dene, 23505 alirsan yeni kod uret.
 */
const { customAlphabet } = require('nanoid');

// 0/O ve 1/I/l karisikligini onlemek icin bu karakterler alfabeden cikarildi.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const DEFAULT_LENGTH = 7;

const nanoid = customAlphabet(ALPHABET, DEFAULT_LENGTH);

// Ozel alias'in cakisabilecegi sistem yollari.
// Bunlar serbest birakilirsa kullanici /links alias'i alip route'u golgeleyebilir.
const RESERVED_ALIASES = new Set(['auth', 'links', 'api', 'health', 'admin', 'static']);

/**
 * @param {number} [length] - varsayilan 7 karakter (~57^7 kombinasyon)
 * @returns {string}
 */
function generateShortCode(length = DEFAULT_LENGTH) {
  if (length === DEFAULT_LENGTH) return nanoid();
  return customAlphabet(ALPHABET, length)();
}

/**
 * Kullanicinin belirledigi alias gecerli mi?
 * Sadece format kontrolu yapar - musaitlik kontrolu veritabaninin isi.
 */
function isValidCustomAlias(alias) {
  if (typeof alias !== 'string') return false;
  if (alias.length < 3 || alias.length > 16) return false;
  if (!/^[a-zA-Z0-9_-]+$/.test(alias)) return false;
  if (RESERVED_ALIASES.has(alias.toLowerCase())) return false;
  return true;
}

module.exports = {
  generateShortCode,
  isValidCustomAlias,
  ALPHABET,
  RESERVED_ALIASES,
};
