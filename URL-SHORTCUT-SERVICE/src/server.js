/**
 * Uygulamanin giris noktasi. Tek isi: app'i dinlemeye almak.
 */
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./db/pool');

const server = app.listen(env.port, () => {
  console.log(`URL kisaltici calisiyor: http://localhost:${env.port}`);
});

// Ctrl+C veya docker stop: acik baglantilari duzgunce kapat
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n${signal} alindi, kapaniyor...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}
