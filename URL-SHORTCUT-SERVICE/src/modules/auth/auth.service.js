/**
 * Is kurallari. HTTP'yi BILMEZ (req/res almaz) - bu yuzden birim testi kolay.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const usersQueries = require('../../db/queries/users.queries');

const SALT_ROUNDS = 10;
const PG_UNIQUE_VIOLATION = '23505';

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

async function registerUser({ email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  try {
    user = await usersQueries.createUser(email, passwordHash);
  } catch (err) {
    // Once "bu e-posta var mi" diye SELECT atip sonra INSERT etmiyoruz -
    // iki istek ayni anda gelirse ikisi de bos gorur. UNIQUE constraint'in
    // firlattigi hatayi yakalamak tek dogru yol.
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw ApiError.conflict('Bu e-posta adresi zaten kayitli');
    }
    throw err;
  }

  return { user, token: signToken(user) };
}

async function loginUser({ email, password }) {
  const user = await usersQueries.findUserByEmail(email);

  // Kullanici yoksa da parola yanlissa da AYNI mesaj - aksi halde hangi
  // e-postalarin kayitli oldugu tek tek ogrenilebilir (user enumeration).
  const invalid = () => ApiError.unauthorized('Gecersiz e-posta veya parola');

  if (!user) {
    // Kullanici yokken hash karsilastirmasi atlanirsa yanit belirgin sekilde
    // daha hizli doner ve bu fark uzerinden e-posta varligi anlasilir.
    // Sahte bir hash ile karsilastirarak sureyi esitliyoruz.
    await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw invalid();
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) throw invalid();

  return {
    user: { id: user.id, email: user.email },
    token: signToken({ id: user.id, email: user.email }),
  };
}

module.exports = { registerUser, loginUser, signToken };
