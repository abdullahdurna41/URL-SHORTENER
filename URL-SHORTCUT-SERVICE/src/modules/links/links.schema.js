/**
 * zod semalari.
 */
const { z } = require('zod');
const { isValidCustomAlias } = require('../../utils/shortCode');

/**
 * GUVENLIK: "gecerli URL mi" kontrolu tek basina YETMEZ.
 * z.string().url() `javascript:alert(1)` ve `data:text/html,...` gibi
 * semalari da gecerli sayar. Bunlar kisaltilip yonlendirmede kullanilirsa
 * XSS vektoru olur - protokolu acikca http/https ile siniriyoruz.
 */
const httpUrl = z
  .string({ required_error: 'originalUrl zorunlu' })
  .trim()
  .max(2048, 'URL cok uzun')
  .refine((value) => {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return false;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  }, 'gecerli bir http veya https adresi olmali');

const createLinkSchema = z.object({
  originalUrl: httpUrl,
  customAlias: z
    .string()
    .trim()
    .refine(
      isValidCustomAlias,
      '3-16 karakter, sadece harf/rakam/-/_ olabilir ve rezerve bir kelime olamaz'
    )
    .optional(),
  expiresAt: z
    .string()
    .datetime({ message: 'ISO 8601 formatinda olmali (or. 2026-01-01T00:00:00Z)' })
    .refine((value) => new Date(value) > new Date(), 'gelecekte bir tarih olmali')
    .optional(),
});

module.exports = { createLinkSchema };
