const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const requireAuth = require('../middleware/requireAuth');

// Public routes (no auth required)
router.get('/api/admin/businesses', businessController.getAllBusinesses);
router.get('/api/businesses/:businessId/public', businessController.getPublicBusiness);
router.post('/api/businesses/:businessId/queue/join', businessController.joinQueue);
router.post('/api/businesses/:businessId/appointments', businessController.createAppointment);
router.get('/api/businesses/:businessId/appointments/public', businessController.getPublicAppointments);
router.get('/api/businesses/:businessId/staff', businessController.getPublicStaff);
router.post('/api/businesses/:businessId/funnel-event', businessController.logFunnelEvent);
router.get('/api/businesses/:businessId/hours', businessController.getPublicBusinessHours);

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

// Staff
router.get('/api/businesses/me/staff', businessController.getStaff);
router.post('/api/businesses/me/staff', businessController.addStaff);
router.put('/api/staff/:staffId', businessController.updateStaff);
router.delete('/api/staff/:staffId', businessController.deleteStaff);

// Appointments (auth)
router.get('/api/businesses/me/appointments', businessController.getMyAppointments);
router.delete('/api/appointments/:appointmentId', businessController.deleteAppointment);

// Subscription
router.get('/api/businesses/me/subscription', businessController.getSubscription);
router.put('/api/businesses/me/subscription', businessController.updateSubscription);

// Analytics
router.get('/api/businesses/me/analytics/tickets', businessController.getTicketAnalytics);

// Business hours
router.get('/api/businesses/me/hours', businessController.getBusinessHours);
router.put('/api/businesses/me/hours', businessController.updateBusinessHours);

module.exports = router;
