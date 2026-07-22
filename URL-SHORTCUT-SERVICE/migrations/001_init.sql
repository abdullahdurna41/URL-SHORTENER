-- Temel sema: users, links, clicks

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS links (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    short_code   VARCHAR(16) UNIQUE NOT NULL,  -- cakisma garantisi burada
    original_url TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kullanicinin kendi linklerini listelemesi bu indeksi kullanir
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);

CREATE TABLE IF NOT EXISTS clicks (
    id         SERIAL PRIMARY KEY,
    link_id    INTEGER     NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    referrer   TEXT,
    user_agent TEXT
);

-- Istatistik sorgulari (toplam sayi + son 7 gun) bu indeksi kullanir
CREATE INDEX IF NOT EXISTS idx_clicks_link_id_clicked_at ON clicks(link_id, clicked_at);
