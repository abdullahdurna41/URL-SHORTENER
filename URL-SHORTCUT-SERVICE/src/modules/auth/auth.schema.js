/**
 * zod semalari - girdi dogrulama.
 */
const { z } = require('zod');

const registerSchema = z.object({
  email: z
    .string({ required_error: 'e-posta zorunlu' })
    .trim()
    .toLowerCase()
    .email('gecerli bir e-posta adresi girin'),
  password: z
    .string({ required_error: 'parola zorunlu' })
    .min(8, 'en az 8 karakter olmali')
    .max(72, 'en fazla 72 karakter olabilir'), // bcrypt 72 byte'tan sonrasini yok sayar
});

const loginSchema = z.object({
  email: z.string({ required_error: 'e-posta zorunlu' }).trim().toLowerCase(),
  password: z.string({ required_error: 'parola zorunlu' }).min(1, 'parola bos olamaz'),
});

module.exports = { registerSchema, loginSchema };
