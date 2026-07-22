/**
 * clicks tablosuna dair TUM SQL burada.
 * Toplam tiklama sayisi burada COUNT ile hesaplanir - links tablosunda
 * denormalize sayac TUTULMAZ (tek dogruluk kaynagi).
 *
 * NOT: COUNT(*) Postgres'te bigint doner ve pg surucusu onu STRING olarak
 * verir ("5"). ::int cast'i olmadan JS tarafinda "5" + 1 = "51" olur.
 */
const { query } = require('../pool');

async function recordClick({ linkId, referrer = null, userAgent = null }) {
  await query(
    `INSERT INTO clicks (link_id, referrer, user_agent) VALUES ($1, $2, $3)`,
    [linkId, referrer, userAgent]
  );
}

async function countClicksByLinkId(linkId) {
  const result = await query(
    'SELECT COUNT(*)::int AS total FROM clicks WHERE link_id = $1',
    [linkId]
  );
  return result.rows[0].total;
}

/**
 * Son 7 gunun gunluk dagilimi.
 *
 * generate_series ile once takvim uretilip LEFT JOIN yapiliyor; boylece
 * hic tiklanma olmayan gunler de 0 olarak doner. Duz bir GROUP BY kullansaydik
 * o gunler sonuctan tamamen dusecekti ve grafik yanlis cizilecekti.
 */
async function dailyClicksLast7Days(linkId) {
  const result = await query(
    `SELECT
       to_char(d.day, 'YYYY-MM-DD')        AS date,
       COUNT(c.id)::int                    AS count
     FROM generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          ) AS d(day)
     LEFT JOIN clicks c
       ON c.link_id = $1
      AND c.clicked_at >= d.day
      AND c.clicked_at <  d.day + INTERVAL '1 day'
     GROUP BY d.day
     ORDER BY d.day`,
    [linkId]
  );
  return result.rows;
}

/** Bonus kirilim: en cok gelen referrer'lar. */
async function topReferrers(linkId, limit = 5) {
  const result = await query(
    `SELECT COALESCE(NULLIF(referrer, ''), 'dogrudan') AS referrer,
            COUNT(*)::int AS count
     FROM clicks
     WHERE link_id = $1
     GROUP BY 1
     ORDER BY count DESC
     LIMIT $2`,
    [linkId, limit]
  );
  return result.rows;
}

module.exports = {
  recordClick,
  countClicksByLinkId,
  dailyClicksLast7Days,
  topReferrers,
};
