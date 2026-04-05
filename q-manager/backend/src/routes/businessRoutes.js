const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

// Business profile
router.post('/api/businesses', businessController.createBusiness);
router.get('/api/businesses/me', businessController.getMyBusiness);
router.put('/api/businesses/me', businessController.updateMyBusiness);

// Services
router.get('/api/businesses/me/services', businessController.getServices);
router.post('/api/businesses/me/services', businessController.addService);
router.put('/api/services/:serviceId', businessController.updateService);
router.delete('/api/services/:serviceId', businessController.deleteService);

// Queue
router.get('/api/businesses/me/queue', businessController.getQueue);
router.post('/api/businesses/me/queue/walkin', businessController.addWalkin);

module.exports = router;
