const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

router.post('/api/queues/:serviceId/join', queueController.join);
router.get('/api/entries/:token', queueController.getStatus);

module.exports = router;
