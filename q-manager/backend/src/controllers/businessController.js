const businessService = require('../services/businessService');
const queueService = require('../services/queueService');
const { v4: uuidv4 } = require('uuid');

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
      `SELECT b.id, b.name, b.type,
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
    const { customerName, phoneNumber, serviceId } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'serviceId is required' });
    const { v4: uuidv4 } = require('uuid');
    const token = uuidv4();
    const ticket = await queueService.joinQueue(serviceId, token, phoneNumber, customerName);
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
    const { name, type } = req.body;
    const business = await businessService.updateBusiness(req.user.id, name, type);
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
    const { customerName, phoneNumber, serviceId } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'serviceId is required' });
    const token = uuidv4();
    const ticket = await queueService.joinQueue(serviceId, token, phoneNumber, customerName);
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
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
};
