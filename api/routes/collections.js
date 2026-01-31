const express = require('express');
const router = express.Router();
const { getCollections, getCollectionById } = require('../controllers/collections');
const { getQueryables } = require('../controllers/queryables');
const { getSortables } = require('../controllers/sortables');

router.get('/queryables', getQueryables);
router.get('/sortables', getSortables);

router.get('/', getCollections);

router.get('/:id', getCollectionById);

module.exports = router;
