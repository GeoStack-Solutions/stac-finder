const express = require('express');
const router = express.Router();
const { getLandingPage } = require('../controllers/landingPage');

router.get('/', getLandingPage);

module.exports = router;
