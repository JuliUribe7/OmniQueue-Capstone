const businessService = require('../services/businessService');
const queueService = require('../services/queueService');
const { v4: uuidv4 } = require('uuid');
const { generateICS } = require('../services/icsService');
const { sendEmail } = require('../services/resendService');
const { createFunnelEvent } = require('../services/eventService');

async function getAllBusinesses(req, res, next) {
  try {
    const businesses = await businessService.getAllBusinessesWithQueues();
    res.json({ businesses });
  } catch (err) {
    next(err);
  }
}

async function getPublicBusiness(req, res, next) {
  try {
    const { businessId } = req.params;
    const res2 = await require('../db').query(
      `SELECT b.id, b.name, b.type, b."allowStaffSelection", b."notificationChannel",
              json_agg(json_build_object('id', s.id, 'name', s.name, 'avgTime', s."avgTime")) as services
       FROM "Business" b
       LEFT JOIN "Service" s ON s."businessId" = b.id
       WHERE b.id = $1
       GROUP BY b.id`,
      [businessId],
    );
    const business = res2.rows[0];
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json({ business });
  } catch (err) {
    next(err);
  }
}

async function joinQueue(req, res, next) {
  try {
    const { businessId } = req.params;
    const { customerName, phoneNumber, customerEmail, serviceId, staffId } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'serviceId is required' });
    const { v4: uuidv4 } = require('uuid');
    const token = uuidv4();
    const business = await businessService.getBusinessById(businessId);
    const ticket = await queueService.joinQueue(serviceId, token, phoneNumber, customerName, customerEmail, business, staffId || null);
    res.status(201).json({ ticket, token });
  } catch (err) {
    next(err);
  }
}

async function createBusiness(req, res, next) {
  try {
    const { name, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Business name is required' });
    const existing = await businessService.getBusinessByUser(req.user.id);
    if (existing) return res.status(409).json({ error: 'Business already exists for this user' });
    const business = await businessService.createBusiness(req.user.id, name, type);
    res.status(201).json({ business });
  } catch (err) {
    next(err);
  }
}

async function getMyBusiness(req, res, next) {
  try {
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    res.json({ business });
  } catch (err) {
    next(err);
  }
}

async function updateMyBusiness(req, res, next) {
  try {
    const { name, type, notificationChannel, allowStaffSelection } = req.body;
    const business = await businessService.updateBusiness(req.user.id, name, type, notificationChannel, allowStaffSelection);
    if (!business) return res.status(404).json({ error: 'No business found' });
    res.json({ business });
  } catch (err) {
    next(err);
  }
}

async function getServices(req, res, next) {
  try {
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const services = await businessService.getServices(business.id);
    res.json({ services });
  } catch (err) {
    next(err);
  }
}

async function addService(req, res, next) {
  try {
    const { name, avgTime } = req.body;
    if (!name) return res.status(400).json({ error: 'Service name is required' });
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const service = await businessService.addService(business.id, name, avgTime);
    res.status(201).json({ service });
  } catch (err) {
    next(err);
  }
}

async function updateService(req, res, next) {
  try {
    const { serviceId } = req.params;
    const { name, avgTime } = req.body;
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const service = await businessService.updateService(serviceId, business.id, name, avgTime);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

async function deleteService(req, res, next) {
  try {
    const { serviceId } = req.params;
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const service = await businessService.deleteService(serviceId, business.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

async function getQueue(req, res, next) {
  try {
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const tickets = await businessService.getQueueForBusiness(business.id);
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
}

async function addWalkin(req, res, next) {
  try {
    const { customerName, phoneNumber, customerEmail, serviceId, staffId } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'serviceId is required' });
    const token = uuidv4();
    const business = await businessService.getBusinessByUser(req.user.id);
    const ticket = await queueService.joinQueue(serviceId, token, phoneNumber, customerName, customerEmail, business, staffId || null);
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

async function getStaff(req, res, next) {
  try {
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const staff = await businessService.getStaff(business.id);
    res.json({ staff });
  } catch (err) { next(err); }
}

async function getPublicStaff(req, res, next) {
  if (req.params.businessId === 'me') return next('route');
  try {
    const { businessId } = req.params;
    const staffMembers = await businessService.getStaff(businessId);
    res.json({ staff: staffMembers });
  } catch (err) { next(err); }
}

async function addStaff(req, res, next) {
  try {
    const { name, role, phone, photoUrl, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const member = await businessService.addStaff(business.id, name, role, phone, photoUrl, color);
    res.status(201).json({ staff: member });
  } catch (err) { next(err); }
}

async function updateStaff(req, res, next) {
  try {
    const { staffId } = req.params;
    const { name, role, phone, photoUrl, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const member = await businessService.updateStaff(staffId, business.id, name, role, phone, photoUrl, color);
    if (!member) return res.status(404).json({ error: 'Staff not found' });
    res.json({ staff: member });
  } catch (err) { next(err); }
}

async function deleteStaff(req, res, next) {
  try {
    const { staffId } = req.params;
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const member = await businessService.deleteStaff(staffId, business.id);
    if (!member) return res.status(404).json({ error: 'Staff not found' });
    res.json({ staff: member });
  } catch (err) { next(err); }
}

async function createAppointment(req, res, next) {
  try {
    const { businessId } = req.params;
    const { serviceId, staffId, customerName, phoneNumber, customerEmail, date, time } = req.body;
    if (!customerName || !phoneNumber || !date || !time)
      return res.status(400).json({ error: 'customerName, phoneNumber, date, and time are required' });
    const appointment = await businessService.createAppointment(businessId, serviceId, staffId, customerName, phoneNumber, date, time, customerEmail);

    // Send ICS calendar invite if customer provided email
    if (customerEmail) {
      try {
        const business = await businessService.getBusinessById(businessId);
        const service = serviceId ? await businessService.getServiceById(serviceId) : null;
        const icsContent = generateICS({
          customerName,
          businessName: business ? business.name : 'OmniQueue',
          serviceName: service ? service.name : 'Appointment',
          date,
          time,
          durationMinutes: service ? service.avgTime : 30,
        });
        await sendEmail(
          customerEmail,
          `Appointment Confirmed – ${business ? business.name : 'OmniQueue'}`,
          `<p>Hi ${customerName},</p>
           <p>Your appointment has been confirmed!</p>
           <p><strong>Date:</strong> ${date}<br>
           <strong>Time:</strong> ${time}<br>
           <strong>Service:</strong> ${service ? service.name : 'Appointment'}</p>
           <p>Open the attached file to add this to your calendar.</p>
           <p>Thanks for using OmniQueue!</p>`,
          [{ filename: 'appointment.ics', content: Buffer.from(icsContent).toString('base64') }],
        );
      } catch (emailErr) {
        console.error('Failed to send appointment email:', emailErr.message);
      }
    }

    res.status(201).json({ appointment });
  } catch (err) { next(err); }
}

async function deleteAppointment(req, res, next) {
  try {
    const { appointmentId } = req.params;
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const appointment = await businessService.deleteAppointment(appointmentId, business.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment });
  } catch (err) { next(err); }
}

async function getPublicAppointments(req, res, next) {
  try {
    const { businessId } = req.params;
    const { date, staffId } = req.query;
    if (!date) return res.status(400).json({ error: 'date query param is required' });
    const slots = await businessService.getPublicAppointments(businessId, date, staffId || null);
    res.json({ bookedSlots: slots });
  } catch (err) { next(err); }
}

async function getMyAppointments(req, res, next) {
  try {
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const appointments = await businessService.getAllAppointments(business.id);
    res.json({ appointments });
  } catch (err) { next(err); }
}

async function getSubscription(req, res, next) {
  try {
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const sub = await businessService.getSubscription(business.id);
    res.json({ plan: sub.plan });
  } catch (err) { next(err); }
}

async function updateSubscription(req, res, next) {
  try {
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ error: 'plan is required' });
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const updated = await businessService.updateSubscription(business.id, plan);
    res.json({ plan: updated.plan });
  } catch (err) { next(err); }
}

async function getBusinessHours(req, res, next) {
  try {
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const hours = await businessService.getBusinessHours(business.id);
    res.json({ hours });
  } catch (err) { next(err); }
}

async function updateBusinessHours(req, res, next) {
  try {
    const { hours } = req.body;
    if (!Array.isArray(hours)) return res.status(400).json({ error: 'hours must be an array' });
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const result = await businessService.upsertBusinessHours(business.id, hours);
    res.json({ hours: result });
  } catch (err) { next(err); }
}

async function getPublicBusinessHours(req, res, next) {
  try {
    const { businessId } = req.params;
    const hours = await businessService.getBusinessHours(businessId);
    res.json({ hours });
  } catch (err) { next(err); }
}

async function logFunnelEvent(req, res, next) {
  try {
    const { businessId } = req.params;
    const { type, metadata } = req.body;
    const allowed = ['portal_view', 'staff_selected', 'time_selected', 'confirmed'];
    if (!type || !allowed.includes(type))
      return res.status(400).json({ error: `type must be one of: ${allowed.join(', ')}` });
    const event = await createFunnelEvent(businessId, type, metadata || {});
    res.status(201).json({ event });
  } catch (err) { next(err); }
}

async function getTicketAnalytics(req, res, next) {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end query params are required' });
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    const tickets = await businessService.getTicketsByDateRange(business.id, start, end);
    res.json({ tickets });
  } catch (err) { next(err); }
}

module.exports = {
  getAllBusinesses,
  getPublicBusiness,
  joinQueue,
  createBusiness,
  getMyBusiness,
  updateMyBusiness,
  getServices,
  addService,
  updateService,
  deleteService,
  getQueue,
  addWalkin,
  getStaff,
  getPublicStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  createAppointment,
  getPublicAppointments,
  getMyAppointments,
  getSubscription,
  updateSubscription,
  getTicketAnalytics,
  logFunnelEvent,
  getBusinessHours,
  updateBusinessHours,
  getPublicBusinessHours,
  deleteAppointment,
};
