const express = require('express');
const router = express.Router();

/**
 *
 */
router.get('/', function (req, res, next) {
    res.send("Serlo Content Crawler");
});

module.exports = router;
