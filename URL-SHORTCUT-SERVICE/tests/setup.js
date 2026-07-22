/**
 * Her test dosyasi icin test framework'u kurulduktan sonra calisir.
 * Testler arasi izolasyon: her testten once tablolar bosaltilir.
 */
const { pool } = require('../src/db/pool');

beforeEach(async () => {
  // RESTART IDENTITY: id sayaclari sifirlanir, testler sabit id bekleyebilir.
  // CASCADE: yabanci anahtar bagimliliklarina ragmen tek komutta temizler.
  await pool.query('TRUNCATE clicks, links, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  // Havuz kapatilmazsa jest "open handle" uyarisiyla asili kalir.
  await pool.end();
});
