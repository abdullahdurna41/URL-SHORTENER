/**
 * Express uygulamasi: middleware zinciri + route mount.
 * Burada app.listen YOK - o server.js'te. Boylece testler app'i
 * port acmadan import edebilir (supertest).
 */
const path = require('path');
const express = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const linkRoutes = require('./modules/links/links.routes');
const redirectRoutes = require('./modules/redirect/redirect.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Rate limit'in gercek istemci IP'sini gorebilmesi icin (reverse proxy arkasinda)
app.set('trust proxy', 1);

app.use(express.json({ limit: '10kb' }));

// Arayuz. Redirect'ten ONCE gelmeli, yoksa "/" ve "/app.js" istekleri
// kisa kod sanilip 404 doner. Gercek bir dosya eslesmezse istek
// asagidaki route'lara devam eder.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/links', linkRoutes);

// DIKKAT: redirect "/:kod" catch-all. Yukaridaki route'lardan SONRA
// mount edilmeli, aksi halde /auth ve /links isteklerini yutar.
app.use('/', redirectRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
