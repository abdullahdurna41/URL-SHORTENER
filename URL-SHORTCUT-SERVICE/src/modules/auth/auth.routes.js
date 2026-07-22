/**
 * POST /auth/register  (auth yok)
 * POST /auth/login     (auth yok)
 */
const express = require('express');
const { validate } = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimit');
const { registerSchema, loginSchema } = require('./auth.schema');
const controller = require('./auth.controller');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);

module.exports = router;
