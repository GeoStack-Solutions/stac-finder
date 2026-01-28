const express = require('express');
const router = express.Router();
const { getConformance } = require('../controllers/conformance');

router.get('/', getConformance);

module.exports = router;
