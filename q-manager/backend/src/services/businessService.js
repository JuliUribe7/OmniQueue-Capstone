const { query } = require('../db');

async function createBusiness(userId, name, type) {
  const res = await query(
    `INSERT INTO "Business" ("userId", "name", "type")
     VALUES ($1, $2, $3) RETURNING *`,
    [userId, name, type],
  );
  return res.rows[0];
}

async function getBusinessByUser(userId) {
  const res = await query(
    'SELECT * FROM "Business" WHERE "userId" = $1',
    [userId],
  );
  return res.rows[0] || null;
}

async function getBusinessById(businessId) {
  const res = await query(
    'SELECT * FROM "Business" WHERE "id" = $1',
    [businessId],
  );
  return res.rows[0] || null;
}

async function updateBusiness(userId, name, type, notificationChannel) {
  const res = await query(
    `UPDATE "Business"
     SET "name" = COALESCE($1, "name"),
         "type" = COALESCE($2, "type"),
         "notificationChannel" = COALESCE($3, "notificationChannel"),
         "updatedAt" = NOW()
     WHERE "userId" = $4 RETURNING *`,
    [name || null, type || null, notificationChannel || null, userId],
  );
  return res.rows[0] || null;
}

async function getServices(businessId) {
  const res = await query(
    'SELECT * FROM "Service" WHERE "businessId" = $1 ORDER BY "createdAt" ASC',
    [businessId],
  );
  return res.rows;
}

async function getServiceById(serviceId) {
  const res = await query(
    'SELECT * FROM "Service" WHERE "id" = $1',
    [serviceId],
  );
  return res.rows[0] || null;
}

async function addService(businessId, name, avgTime) {
  const res = await query(
    `INSERT INTO "Service" ("businessId", "name", "avgTime")
     VALUES ($1, $2, $3) RETURNING *`,
    [businessId, name, avgTime || 15],
  );
  return res.rows[0];
}

async function updateService(serviceId, businessId, name, avgTime) {
  const res = await query(
    `UPDATE "Service" SET "name" = $1, "avgTime" = $2, "updatedAt" = NOW()
     WHERE "id" = $3 AND "businessId" = $4 RETURNING *`,
    [name, avgTime, serviceId, businessId],
  );
  return res.rows[0] || null;
}

async function deleteService(serviceId, businessId) {
  const res = await query(
    'DELETE FROM "Service" WHERE "id" = $1 AND "businessId" = $2 RETURNING *',
    [serviceId, businessId],
  );
  return res.rows[0] || null;
}

async function getQueueForBusiness(businessId) {
  const res = await query(
    `SELECT t.*, s."name" as "serviceName", s."avgTime"
     FROM "Ticket" t
     JOIN "Service" s ON t."serviceId" = s."id"
     WHERE s."businessId" = $1
     ORDER BY t."position" ASC`,
    [businessId],
  );
  return res.rows;
}

async function getStaff(businessId) {
  const res = await query(
    'SELECT * FROM "Staff" WHERE "businessId" = $1 ORDER BY "createdAt" ASC',
    [businessId],
  );
  return res.rows;
}

async function addStaff(businessId, name, role, phone, photoUrl) {
  const res = await query(
    `INSERT INTO "Staff" ("businessId", "name", "role", "phone", "photoUrl")
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [businessId, name, role || 'Staff', phone || null, photoUrl || null],
  );
  return res.rows[0];
}

async function deleteStaff(staffId, businessId) {
  const res = await query(
    'DELETE FROM "Staff" WHERE "id" = $1 AND "businessId" = $2 RETURNING *',
    [staffId, businessId],
  );
  return res.rows[0] || null;
}

async function createAppointment(businessId, serviceId, staffId, customerName, phoneNumber, date, time, customerEmail) {
  const res = await query(
    `INSERT INTO "Appointment" ("businessId", "serviceId", "staffId", "customerName", "phoneNumber", "customerEmail", "date", "time")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [businessId, serviceId || null, staffId || null, customerName, phoneNumber, customerEmail || null, date, time],
  );
  return res.rows[0];
}

async function getPublicAppointments(businessId, date) {
  const res = await query(
    'SELECT "time", "date" FROM "Appointment" WHERE "businessId" = $1 AND "date" = $2',
    [businessId, date],
  );
  return res.rows;
}

async function getAllAppointments(businessId) {
  const res = await query(
    `SELECT a.*, s."name" as "serviceName", st."name" as "staffName"
     FROM "Appointment" a
     LEFT JOIN "Service" s ON a."serviceId" = s."id"
     LEFT JOIN "Staff" st ON a."staffId" = st."id"
     WHERE a."businessId" = $1
     ORDER BY a."date" ASC, a."time" ASC`,
    [businessId],
  );
  return res.rows;
}

async function getSubscription(businessId) {
  const res = await query(
    'SELECT "plan" FROM "Business" WHERE "id" = $1',
    [businessId],
  );
  return res.rows[0] || null;
}

async function updateSubscription(businessId, plan) {
  const res = await query(
    `UPDATE "Business" SET "plan" = $1, "updatedAt" = NOW() WHERE "id" = $2 RETURNING *`,
    [plan, businessId],
  );
  return res.rows[0] || null;
}

async function getAllBusinessesWithQueues() {
  const res = await query(
    `SELECT b.id, b.name, b.type,
            json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name, 'avgTime', s."avgTime")) as services,
            json_agg(DISTINCT jsonb_build_object(
              'id', t.id, 'position', t.position, 'status', t.status,
              'customerName', t."customerName", 'phoneNumber', t."phoneNumber",
              'serviceId', t."serviceId", 'createdAt', t."createdAt"
            )) FILTER (WHERE t.id IS NOT NULL) as tickets
     FROM "Business" b
     LEFT JOIN "Service" s ON s."businessId" = b.id
     LEFT JOIN "Ticket" t ON t."serviceId" = s.id
     GROUP BY b.id
     ORDER BY b."createdAt" ASC`,
  );
  return res.rows;
}

module.exports = {
  createBusiness,
  getBusinessByUser,
  getBusinessById,
  updateBusiness,
  getServices,
  getServiceById,
  addService,
  updateService,
  deleteService,
  getQueueForBusiness,
  getStaff,
  addStaff,
  deleteStaff,
  createAppointment,
  getPublicAppointments,
  getAllAppointments,
  getSubscription,
  updateSubscription,
  getAllBusinessesWithQueues,
};
