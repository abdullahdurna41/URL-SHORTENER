/**
 * Birim test: auth servisi. Query katmani mock'lanir - DB gerektirmez.
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../../src/db/queries/users.queries');
const usersQueries = require('../../src/db/queries/users.queries');
const authService = require('../../src/modules/auth/auth.service');
const env = require('../../src/config/env');

beforeEach(() => jest.resetAllMocks());

describe('registerUser', () => {
  test('parolayi duz metin saklamaz, bcrypt hash uretir', async () => {
    usersQueries.createUser.mockImplementation(async (email) => ({
      id: 1,
      email,
      created_at: new Date(),
    }));

    await authService.registerUser({ email: 'a@b.com', password: 'parola1234' });

    const [, passwordHash] = usersQueries.createUser.mock.calls[0];
    expect(passwordHash).not.toBe('parola1234');
    expect(passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt formati
    await expect(bcrypt.compare('parola1234', passwordHash)).resolves.toBe(true);
  });

  test('ayni parola iki kez farkli hash uretir (salt calisiyor)', async () => {
    usersQueries.createUser.mockResolvedValue({ id: 1, email: 'a@b.com', created_at: new Date() });

    await authService.registerUser({ email: 'a@b.com', password: 'parola1234' });
    await authService.registerUser({ email: 'c@d.com', password: 'parola1234' });

    const [, hash1] = usersQueries.createUser.mock.calls[0];
    const [, hash2] = usersQueries.createUser.mock.calls[1];
    expect(hash1).not.toBe(hash2);
  });

  test('kayitli e-posta 409 dondurur', async () => {
    // Postgres unique_violation
    usersQueries.createUser.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));

    await expect(
      authService.registerUser({ email: 'a@b.com', password: 'parola1234' })
    ).rejects.toMatchObject({ status: 409 });
  });

  test('beklenmeyen DB hatasi oldugu gibi yukari cikar (500 olmali, 409 degil)', async () => {
    usersQueries.createUser.mockRejectedValue(Object.assign(new Error('baglanti koptu'), { code: '08006' }));

    await expect(
      authService.registerUser({ email: 'a@b.com', password: 'parola1234' })
    ).rejects.toThrow('baglanti koptu');
  });
});

describe('loginUser', () => {
  async function mockExistingUser(password) {
    usersQueries.findUserByEmail.mockResolvedValue({
      id: 7,
      email: 'a@b.com',
      password_hash: await bcrypt.hash(password, 10),
    });
  }

  test('dogru bilgilerle dogrulanabilir JWT doner', async () => {
    await mockExistingUser('parola1234');

    const { token } = await authService.loginUser({ email: 'a@b.com', password: 'parola1234' });
    const payload = jwt.verify(token, env.jwtSecret);

    expect(payload.sub).toBe(7);
    expect(payload.email).toBe('a@b.com');
  });

  test('yanlis parola 401 dondurur', async () => {
    await mockExistingUser('parola1234');

    await expect(
      authService.loginUser({ email: 'a@b.com', password: 'yanlisparola' })
    ).rejects.toMatchObject({ status: 401 });
  });

  test('olmayan kullanici ile yanlis parola AYNI mesaji dondurur', async () => {
    // Farkli mesaj donerse hangi e-postalarin kayitli oldugu tespit edilebilir
    await mockExistingUser('parola1234');
    const wrongPassword = await authService
      .loginUser({ email: 'a@b.com', password: 'yanlis' })
      .catch((e) => e);

    usersQueries.findUserByEmail.mockResolvedValue(null);
    const noUser = await authService
      .loginUser({ email: 'yok@b.com', password: 'parola1234' })
      .catch((e) => e);

    expect(noUser.message).toBe(wrongPassword.message);
    expect(noUser.status).toBe(wrongPassword.status);
  });

  test('donen token ve kullanici nesnesinde parola hash bulunmaz', async () => {
    await mockExistingUser('parola1234');

    const { token, user } = await authService.loginUser({
      email: 'a@b.com',
      password: 'parola1234',
    });

    expect(JSON.stringify(jwt.decode(token))).not.toMatch(/\$2[aby]\$/);
    expect(user).not.toHaveProperty('password_hash');
  });
});
