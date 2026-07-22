/**
 * Entegrasyon testi: supertest ile gercek HTTP + gercek test DB.
 * Kabul kriterlerinin cogu buradan gecer.
 */
const request = require('supertest');
const app = require('../../src/app');

/** Kayit olur ve token doner. */
async function createUser(email = 'ali@test.com', password = 'parola1234') {
  const res = await request(app).post('/auth/register').send({ email, password });
  return res.body.token;
}

async function createLink(token, body = { originalUrl: 'https://example.com/uzun-adres' }) {
  const res = await request(app).post('/links').set('Authorization', `Bearer ${token}`).send(body);
  return res.body;
}

describe('kimlik dogrulama', () => {
  test('kayit 201 ve token doner', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'ali@test.com', password: 'parola1234' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('gecersiz e-posta 400 doner', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'eposta-degil', password: 'parola1234' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('giris yapip token alinabilir', async () => {
    await createUser();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ali@test.com', password: 'parola1234' });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });
});

describe('korumali uc noktalar', () => {
  test.each([
    ['post', '/links'],
    ['get', '/links'],
    ['get', '/links/1/stats'],
    ['delete', '/links/1'],
  ])('token olmadan %s %s -> 401', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  test('bozuk token 401 doner', async () => {
    const res = await request(app).get('/links').set('Authorization', 'Bearer bozuk.token.burada');
    expect(res.status).toBe(401);
  });
});

describe('link olusturma', () => {
  test('201 ve kisa kod doner', async () => {
    const token = await createUser();
    const res = await request(app)
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/uzun-adres' });

    expect(res.status).toBe(201);
    expect(res.body.shortCode).toEqual(expect.any(String));
    expect(res.body.shortUrl).toContain(res.body.shortCode);
  });

  test.each([
    ['not-a-url', 'duz metin'],
    ['javascript:alert(1)', 'javascript semasi - XSS vektoru'],
    ['data:text/html,<script>alert(1)</script>', 'data semasi'],
    ['ftp://example.com', 'desteklenmeyen protokol'],
  ])('gecersiz URL reddedilir: %s (%s)', async (originalUrl) => {
    const token = await createUser();
    const res = await request(app)
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl });

    expect(res.status).toBe(400);
  });

  test('ozel alias kullanilabilir, ikinci kez alinamaz', async () => {
    const token = await createUser();

    const first = await request(app)
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://github.com', customAlias: 'benim-linkim' });
    expect(first.status).toBe(201);
    expect(first.body.shortCode).toBe('benim-linkim');

    const second = await request(app)
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://gitlab.com', customAlias: 'benim-linkim' });
    expect(second.status).toBe(409);
  });

  test('rezerve alias reddedilir', async () => {
    const token = await createUser();
    const res = await request(app)
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com', customAlias: 'links' });

    expect(res.status).toBe(400);
  });
});

describe('yonlendirme', () => {
  test('302 ve dogru Location dondurur', async () => {
    const token = await createUser();
    const link = await createLink(token);

    const res = await request(app).get(`/${link.shortCode}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com/uzun-adres');
  });

  test('olmayan kod 404 doner', async () => {
    const res = await request(app).get('/YOKBOYLE');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('301 DEGIL 302 doner (301 tarayicida cache lenir, tiklama sayilamaz)', async () => {
    const token = await createUser();
    const link = await createLink(token);

    const res = await request(app).get(`/${link.shortCode}`);
    expect(res.status).not.toBe(301);
  });
});

describe('istatistik', () => {
  test('tiklama sayisi dogru artar', async () => {
    const token = await createUser();
    const link = await createLink(token);

    for (let i = 0; i < 3; i++) {
      await request(app).get(`/${link.shortCode}`);
    }

    // Tiklama kaydi yonlendirmeyi bekletmiyor (fire-and-forget),
    // yazma islemi tamamlansin diye kisa bir bekleme gerekli.
    await new Promise((resolve) => setTimeout(resolve, 200));

    const res = await request(app)
      .get(`/links/${link.id}/stats`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalClicks).toBe(3);
  });

  test('son 7 gun bos gunler dahil 7 kayit dondurur', async () => {
    const token = await createUser();
    const link = await createLink(token);

    const res = await request(app)
      .get(`/links/${link.id}/stats`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.last7Days).toHaveLength(7);
    expect(res.body.last7Days.every((d) => typeof d.count === 'number')).toBe(true);
  });
});

describe('sahiplik izolasyonu', () => {
  test('baska kullanicinin linki listelenemez, goruntulenemez, silinemez', async () => {
    const aliToken = await createUser('ali@test.com');
    const veliToken = await createUser('veli@test.com');
    const aliLink = await createLink(aliToken);

    const list = await request(app).get('/links').set('Authorization', `Bearer ${veliToken}`);
    expect(list.body.links).toHaveLength(0);

    const stats = await request(app)
      .get(`/links/${aliLink.id}/stats`)
      .set('Authorization', `Bearer ${veliToken}`);
    expect(stats.status).toBe(404); // 403 degil - id varliginin sizmamasi icin

    const del = await request(app)
      .delete(`/links/${aliLink.id}`)
      .set('Authorization', `Bearer ${veliToken}`);
    expect(del.status).toBe(404);

    // Silme gercekten engellendi mi - Ali'nin linki duruyor olmali
    const aliList = await request(app).get('/links').set('Authorization', `Bearer ${aliToken}`);
    expect(aliList.body.links).toHaveLength(1);
  });
});

describe('silme', () => {
  test('sahibi silebilir, sonrasinda yonlendirme calismaz', async () => {
    const token = await createUser();
    const link = await createLink(token);

    const del = await request(app)
      .delete(`/links/${link.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const redirect = await request(app).get(`/${link.shortCode}`);
    expect(redirect.status).toBe(404);
  });
});

describe('son kullanma tarihi', () => {
  test('gecmis tarih ile olusturulamaz', async () => {
    const token = await createUser();
    const res = await request(app)
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com', expiresAt: '2020-01-01T00:00:00Z' });

    expect(res.status).toBe(400);
  });

  test('suresi dolmus link 410 doner', async () => {
    const { pool } = require('../../src/db/pool');
    const token = await createUser();
    const link = await createLink(token);

    await pool.query("UPDATE links SET expires_at = NOW() - INTERVAL '1 day' WHERE id = $1", [
      link.id,
    ]);

    const res = await request(app).get(`/${link.shortCode}`);
    expect(res.status).toBe(410);
  });
});

describe('hata formati', () => {
  test('bozuk id 400 doner (500 degil)', async () => {
    const token = await createUser();
    const res = await request(app)
      .get('/links/abc/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  test('bozuk JSON govdesi 400 doner', async () => {
    const token = await createUser();
    const res = await request(app)
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{bozuk');

    expect(res.status).toBe(400);
  });

  test('tum hatalar { error: string } formatinda', async () => {
    const res = await request(app).get('/YOKBOYLE');
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(typeof res.body.error).toBe('string');
  });
});
