const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

router.post('/api/queues/:serviceId/join', queueController.join);
router.get('/api/entries/:token', queueController.getStatus);
router.get('/api/queue/:serviceId', queueController.getQueue);
router.put('/api/tickets/:ticketId/done', queueController.markDone);
router.delete('/api/tickets/:ticketId', queueController.removeTicket);

module.exports = router;
