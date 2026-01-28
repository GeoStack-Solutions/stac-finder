const express = require('express');
const router = express.Router();
const { getOpenAPI } = require('../controllers/openapi');

router.get('/', getOpenAPI);

module.exports = router;
