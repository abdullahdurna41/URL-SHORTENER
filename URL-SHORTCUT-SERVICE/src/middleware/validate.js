/**
 * zod sema fabrikasi: validate(schema) -> middleware
 *
 * Sema gecerse req.body parse edilmis (temizlenmis, tipleri donusturulmus)
 * haliyle degistirilir - controller ham girdiyi hic gormez.
 * Gecmezse ilk hatanin mesajiyla 400 doner.
 */
const ApiError = require('../utils/ApiError');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const first = result.error.issues[0];
      const field = first.path.join('.');
      return next(ApiError.badRequest(field ? `${field}: ${first.message}` : first.message));
    }

    req.body = result.data;
    next();
  };
}

/**
 * URL parametrelerindeki :id'nin pozitif tamsayi oldugunu dogrular.
 * Bu olmadan /links/abc/stats sorguya "abc" gonderir ve Postgres
 * 22P02 (invalid_text_representation) ile 500 firlatir - 400 olmali.
 */
function validateIdParam(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return next(ApiError.badRequest('id pozitif bir tamsayi olmali'));
  }
  req.params.id = id;
  next();
}

module.exports = { validate, validateIdParam };
