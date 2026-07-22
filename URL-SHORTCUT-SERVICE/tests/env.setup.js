/**
 * Her test dosyasindan ONCE calisir (jest setupFiles).
 * DATABASE_URL'i test veritabanina cevirir - src/config/env.js require
 * edilmeden once yapilmali, yoksa gelistirme DB'sine baglanir.
 */
require('dotenv').config();
const { testDbUrl } = require('./testDbUrl');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDbUrl(process.env.DATABASE_URL);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
