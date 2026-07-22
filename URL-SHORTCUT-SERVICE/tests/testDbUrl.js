/**
 * Test veritabani adresini uretir: <db> -> <db>_test
 *
 * Testler ASLA gelistirme veritabaninda calismamali - her testten once
 * TRUNCATE atiliyor, yanlis veritabanina baglanirsa tum verini siler.
 */
function testDbUrl(baseUrl) {
  const url = new URL(baseUrl);
  const dbName = url.pathname.replace(/^\//, '');
  url.pathname = `/${dbName}_test`;
  return url.toString();
}

/** Ayni sunucudaki yonetim veritabani - CREATE DATABASE icin gerekli. */
function adminDbUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

module.exports = { testDbUrl, adminDbUrl };
