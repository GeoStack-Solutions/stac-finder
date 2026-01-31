const express = require('express');
const router = express.Router();
const { getSortables } = require('../controllers/sortables');

router.get('/', getSortables);

module.exports = router;