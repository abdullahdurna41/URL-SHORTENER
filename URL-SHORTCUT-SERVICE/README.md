# URL Kısaltıcı Servisi

Backend staj projesi. Uzun URL'leri kısa kodla eşleştiren, yönlendiren ve tıklanma
istatistiği tutan REST API.

## Teknoloji Seçimleri

| Katman | Seçim | Gerekçe |
| --- | --- | --- |
| Runtime | Node.js + Express 5 | Express 5, async route handler'lardaki hataları otomatik olarak error middleware'ine yönlendiriyor; her handler'ı `try/catch` veya `asyncHandler` sarmalayıcısına almaya gerek kalmıyor. |
| Veritabanı | PostgreSQL 16 | İlişkisel model (`users → links → clicks`) doğal olarak tabloya oturuyor. `generate_series` ile boş günleri doldurmak gibi istatistik sorgularını SQL tarafında çözebiliyorum. |
| DB erişimi | `pg` + raw SQL | ORM soyutlaması yerine çalışan SQL'in görünür olmasını tercih ettim. Tüm sorgular `src/db/queries/` altında toplu. |
| Parola | `bcryptjs` (10 round) | `bcrypt` native derleme gerektiriyor ve Windows'ta sık sık build hatası veriyor. `bcryptjs` saf JS, aynı API. |
| Token | `jsonwebtoken` (HS256) | Stateless auth; sunucu tarafında oturum saklamaya gerek yok. |
| Doğrulama | `zod` | Şema tek yerde tanımlanıyor, middleware olarak yeniden kullanılabiliyor ve `req.body`'yi temizlenmiş haliyle değiştiriyor. |
| Kısa kod | `nanoid` + `UNIQUE` constraint | Çakışma garantisi veritabanından geliyor; nanoid sadece çarpışma olasılığını düşürüyor. |

## Kurulum

```bash
# 1. Bağımlılıklar
npm install

# 2. Ortam değişkenleri
cp .env.example .env
# .env içindeki JWT_SECRET'i değiştir:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Veritabanı (Docker gerekli)
docker compose up -d

# 4. Şema
npm run migrate

# 5. Çalıştır
npm run dev          # otomatik yeniden başlatmalı
# veya
npm start
```

Sunucu `http://localhost:3000` adresinde açılır. Kontrol:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Arayüz

`http://localhost:3000` adresi API'yi kullanan küçük bir web arayüzü açar:
kayıt/giriş, link oluşturma (özel kod ve son kullanma tarihi dahil), listeleme,
panoya kopyalama, istatistik (toplam + son 7 gün grafiği + kaynak dağılımı),
QR kod ve silme.

Derleme adımı yok — `public/` altında üç dosya (`index.html`, `styles.css`,
`app.js`), vanilla JavaScript, `express.static` ile servis ediliyor. API ile aynı
origin'de çalıştığı için CORS yapılandırması gerekmiyor.

Statik dosyalar `/:kod` yönlendirme route'undan **önce** mount edilir; aksi halde
`/` ve `/app.js` istekleri kısa kod sanılıp 404 dönerdi.

### Ortam Değişkenleri

| Değişken | Zorunlu | Açıklama |
| --- | --- | --- |
| `DATABASE_URL` | Evet | Postgres bağlantı adresi |
| `JWT_SECRET` | Evet | Token imzalama anahtarı |
| `BASE_URL` | Evet | Kısa linklerin başına eklenir |
| `PORT` | Hayır | Varsayılan `3000` |
| `JWT_EXPIRES_IN` | Hayır | Varsayılan `1h` |

Zorunlu bir değişken eksikse uygulama **açılışta** hata verip durur — çalışma
sırasında beklenmedik yerde patlamak yerine hemen fark edilir.

## Uç Noktalar

| Method | Endpoint | Auth | Açıklama |
| --- | --- | --- | --- |
| POST | `/auth/register` | Hayır | Kayıt, JWT döner |
| POST | `/auth/login` | Hayır | Giriş, JWT döner |
| POST | `/links` | Evet | Kısa link oluştur |
| GET | `/links` | Evet | Kendi linklerini listele |
| GET | `/links/:id/stats` | Evet | Link istatistiği |
| GET | `/links/:id/qr` | Evet | QR kod (PNG) — *bonus* |
| DELETE | `/links/:id` | Evet | Link sil |
| GET | `/:kod` | Hayır | Yönlendirme + tıklama kaydı |
| GET | `/health` | Hayır | Sağlık kontrolü |

## Örnek İstekler

### Kayıt

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ali@test.com","password":"parola1234"}'
```

```json
{
  "user": { "id": 1, "email": "ali@test.com", "createdAt": "2026-07-22T10:57:40.916Z" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Giriş

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ali@test.com","password":"parola1234"}' | jq -r .token)
```

### Link oluşturma

```bash
curl -X POST http://localhost:3000/links \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"originalUrl":"https://www.anthropic.com/news"}'
```

```json
{
  "id": 1,
  "shortCode": "zhfGzWV",
  "shortUrl": "http://localhost:3000/zhfGzWV",
  "originalUrl": "https://www.anthropic.com/news",
  "expiresAt": null,
  "createdAt": "2026-07-22T10:57:41.637Z"
}
```

Opsiyonel alanlar:

```bash
-d '{
  "originalUrl": "https://github.com",
  "customAlias": "github",
  "expiresAt": "2026-12-31T23:59:59Z"
}'
```

### Linkleri listeleme

```bash
curl http://localhost:3000/links -H "Authorization: Bearer $TOKEN"
```

### Yönlendirme

```bash
curl -i http://localhost:3000/zhfGzWV
# HTTP/1.1 302 Found
# Location: https://www.anthropic.com/news
```

### İstatistik

```bash
curl http://localhost:3000/links/1/stats -H "Authorization: Bearer $TOKEN"
```

```json
{
  "id": 1,
  "shortCode": "zhfGzWV",
  "totalClicks": 4,
  "last7Days": [
    { "date": "2026-07-16", "count": 0 },
    { "date": "2026-07-22", "count": 4 }
  ],
  "topReferrers": [
    { "referrer": "dogrudan", "count": 3 },
    { "referrer": "https://google.com", "count": 1 }
  ]
}
```

### QR kod

```bash
curl http://localhost:3000/links/1/qr -H "Authorization: Bearer $TOKEN" -o qr.png
```

### Silme

```bash
curl -X DELETE http://localhost:3000/links/1 -H "Authorization: Bearer $TOKEN" -i
# HTTP/1.1 204 No Content
```

## Hata Formatı

Tüm hatalar aynı yapıda döner:

```json
{ "error": "Gecersiz e-posta veya parola" }
```

| Kod | Ne zaman |
| --- | --- |
| 400 | Geçersiz girdi (bozuk URL, kısa parola, hatalı id, bozuk JSON) |
| 401 | Token yok, geçersiz veya süresi dolmuş |
| 404 | Kayıt yok **veya** başkasına ait |
| 409 | E-posta ya da alias zaten kullanımda |
| 410 | Linkin süresi dolmuş |
| 429 | Rate limit aşıldı |

## Proje Yapısı

```
src/
├─ app.js                 Express kurulumu, route mount sırası
├─ server.js              Giriş noktası (app.listen)
├─ config/env.js          .env okuma + eksik değişken kontrolü
├─ db/
│  ├─ pool.js             pg connection pool
│  └─ queries/            TÜM SQL burada
├─ middleware/            auth, validate, rateLimit, errorHandler
├─ modules/               auth / links / redirect
│  └─ <modül>/
│     ├─ *.routes.js      yönlendirme
│     ├─ *.controller.js  HTTP katmanı
│     ├─ *.service.js     iş kuralları (HTTP bilmez)
│     └─ *.schema.js      zod doğrulama
└─ utils/                 shortCode, ApiError
```

Akış her zaman aynı yönde: `routes → controller → service → queries`.
Service katmanı `req`/`res` almaz, bu yüzden birim testi kolaydır; controller
SQL yazmaz.

## Tasarım Kararları

**Yönlendirmede 301 değil 302.** 301 kalıcı yönlendirme olduğu için tarayıcı
sonucu cache'ler ve sonraki tıklamalar sunucuya hiç ulaşmaz — tıklama sayacı
sessizce yanlış çalışırdı.

**Tıklama kaydı yönlendirmeyi bekletmez.** Önce `res.redirect()` gönderilir,
`INSERT` sonrasında `await` edilmeden yapılır. Kayıt başarısız olursa kullanıcının
yönlendirmesi etkilenmez, hata yalnızca loglanır.

**Sahiplik kontrolü SQL'in içinde.** `WHERE id = $1 AND user_id = $2` — ayrı bir
"önce getir, sonra karşılaştır" adımı yok. Tek adım olduğu için atlanması mümkün
değil. Başkasının kaydı için 403 değil **404** dönülür; 403 dönmek o id'nin var
olduğunu doğrular ve kayıtlar dışarıdan taranabilir hale gelir.

**URL doğrulamasında protokol beyaz listesi.** "Geçerli URL mi" kontrolü tek başına
yetmez: `javascript:alert(1)` ve `data:text/html,...` de geçerli URL sayılır.
Kısaltılıp yönlendirmede kullanılırlarsa XSS vektörü olurlar, bu yüzden yalnızca
`http`/`https` kabul edilir.

**Kısa kod çakışması UNIQUE constraint ile çözülür.** "Önce `SELECT` ile bak, boşsa
`INSERT` et" yaklaşımı yarış durumuna açık — iki istek aynı anda gelirse ikisi de
boş görür. Bunun yerine `INSERT` denenir, Postgres `23505` dönerse yeni kod üretilip
tekrar denenir.

**Aynı e-posta kayıtlı mı kontrolü de aynı mantıkla** `UNIQUE` üzerinden yapılır.

**Login'de kullanıcı sızdırmama.** Kullanıcı yoksa da parola yanlışsa da aynı mesaj
döner. Ayrıca kullanıcı bulunamadığında sahte bir hash ile karşılaştırma yapılır;
aksi halde yanıt gözle görülür şekilde daha hızlı döner ve bu zaman farkından
e-postanın kayıtlı olup olmadığı anlaşılabilir.

**`COUNT(*)::int` cast'i.** Postgres `COUNT` sonucunu `bigint` döner ve `pg` sürücüsü
bunu JavaScript'e **string** olarak verir. Cast olmadan `"5" + 1 === "51"` gibi sessiz
hatalar oluşur.

**İstatistikte `generate_series`.** Düz bir `GROUP BY` yalnızca tıklanma olan günleri
döndürür; hiç tıklanma olmayan günler sonuçtan tamamen düşer ve grafik yanlış çizilir.
Önce takvim üretilip `LEFT JOIN` yapılarak boş günler `0` ile doldurulur.

## Testler

```bash
npm test
```

`urlshortener_test` veritabanı yoksa otomatik oluşturulur ve migration'lar uygulanır;
ek bir hazırlık adımı gerekmez. Her testten önce tablolar `TRUNCATE` edilir.

```
Test Suites: 3 passed, 3 total
Tests:       56 passed, 56 total
```

Kapsam:

- `tests/unit/shortCode.test.js` — kod uzunluğu, alfabe, 10.000 üretimde çakışma
  kontrolü, alias format doğrulaması
- `tests/unit/auth.service.test.js` — parolanın düz metin saklanmadığı, salt'ın
  çalıştığı, kullanıcı sızdırmama davranışı (query katmanı mock'lanır)
- `tests/integration/links.test.js` — supertest ile gerçek HTTP: auth koruması,
  yönlendirme, tıklama sayacı, sahiplik izolasyonu, hata formatı

## Bonus Özellikler

- **Rate limiting** — `/auth/*` için 15 dakikada 10 istek (brute force'a karşı),
  genel API için 100 istek. Yönlendirme kasıtlı olarak limitlenmez.
- **QR kod** — `GET /links/:id/qr` PNG döner.
- **Son kullanma tarihi** — `expiresAt` ile oluşturulan linkler süresi dolduğunda
  410 döner.
- **Özel alias** — çakışma kontrolü ve rezerve kelime listesi ile
  (`links`, `auth`, `api`… alınamaz, yoksa route'ları gölgelerdi).
- **Referrer kırılımı** — istatistikte en çok yönlendiren kaynaklar.
