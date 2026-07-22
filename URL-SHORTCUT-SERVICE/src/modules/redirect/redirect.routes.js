/**
 * GET /:kod  (auth yok)
 *
 * app.js'te EN SON mount edilir - catch-all oldugu icin daha once
 * mount edilirse /links, /auth gibi route'lari yutar.
 */
const express = require('express');
const controller = require('./redirect.controller');

const router = express.Router();

router.get('/:kod', controller.redirect);

module.exports = router;
