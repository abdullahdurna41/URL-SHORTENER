require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'BASE_URL'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Eksik environment degiskenleri: ${missing.join(', ')}. .env.example dosyasini .env olarak kopyaladin mi?`
  );
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  baseUrl: process.env.BASE_URL.replace(/\/$/, ''),
  isTest: process.env.NODE_ENV === 'test',
};
