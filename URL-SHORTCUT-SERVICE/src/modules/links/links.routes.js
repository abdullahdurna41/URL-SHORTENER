/**
 * Hepsi auth gerektirir - router.use(authenticate) ile tek yerden zorunlu kilindi.
 * Boylece yeni bir route eklerken auth eklemeyi unutmak imkansiz.
 */
const express = require('express');
const authenticate = require('../../middleware/auth');
const { validate, validateIdParam } = require('../../middleware/validate');
const { apiLimiter } = require('../../middleware/rateLimit');
const { createLinkSchema } = require('./links.schema');
const controller = require('./links.controller');
const qrController = require('./qr.controller');

const router = express.Router();

router.use(authenticate);
router.use(apiLimiter);

router.post('/', validate(createLinkSchema), controller.createLink);
router.get('/', controller.listLinks);
router.get('/:id/stats', validateIdParam, controller.getStats);
router.get('/:id/qr', validateIdParam, qrController.getQrCode);
router.delete('/:id', validateIdParam, controller.deleteLink);

module.exports = router;
