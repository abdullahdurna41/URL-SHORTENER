/**
 * HTTP katmani: req'ten veriyi al, servisi cagir, status kodu + JSON dondur.
 * Is kurali YAZILMAZ, SQL YAZILMAZ.
 */
const authService = require('./auth.service');

async function register(req, res) {
  const { user, token } = await authService.registerUser(req.body);
  res.status(201).json({
    user: { id: user.id, email: user.email, createdAt: user.created_at },
    token,
  });
}

async function login(req, res) {
  const { user, token } = await authService.loginUser(req.body);
  res.status(200).json({ user, token });
}

module.exports = { register, login };
