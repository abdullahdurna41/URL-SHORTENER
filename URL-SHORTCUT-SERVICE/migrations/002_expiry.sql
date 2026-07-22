-- Bonus: linklere son kullanma tarihi
-- NULL = suresiz. Redirect sirasinda kontrol edilir, suresi gecmisse 404/410 doner.

ALTER TABLE links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
