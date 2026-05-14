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

async function updateBusiness(userId, name, type, notificationChannel, allowStaffSelection) {
  const res = await query(
    `UPDATE "Business"
     SET "name" = COALESCE($1, "name"),
         "type" = COALESCE($2, "type"),
         "notificationChannel" = COALESCE($3, "notificationChannel"),
         "allowStaffSelection" = COALESCE($4, "allowStaffSelection"),
         "updatedAt" = NOW()
     WHERE "userId" = $5 RETURNING *`,
    [name || null, type || null, notificationChannel || null,
     allowStaffSelection !== undefined ? allowStaffSelection : null, userId],
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
    `SELECT t.*, s."name" as "serviceName", s."avgTime", st."name" as "staffName"
     FROM "Ticket" t
     JOIN "Service" s ON t."serviceId" = s."id"
     LEFT JOIN "Staff" st ON t."staffId" = st."id"
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

async function addStaff(businessId, name, role, phone, photoUrl, color) {
  const res = await query(
    `INSERT INTO "Staff" ("businessId", "name", "role", "phone", "photoUrl", "color")
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [businessId, name, role || 'Staff', phone || null, photoUrl || null, color || '#0a7ea4'],
  );
  return res.rows[0];
}

async function updateStaff(staffId, businessId, name, role, phone, photoUrl, color) {
  const res = await query(
    `UPDATE "Staff" SET "name" = $1, "role" = $2, "phone" = $3, "photoUrl" = $4, "color" = $5, "updatedAt" = NOW()
     WHERE "id" = $6 AND "businessId" = $7 RETURNING *`,
    [name, role || 'Staff', phone || null, photoUrl || null, color || '#0a7ea4', staffId, businessId],
  );
  return res.rows[0] || null;
}

async function getBusinessHours(businessId) {
  const res = await query(
    'SELECT * FROM "BusinessHours" WHERE "businessId" = $1 ORDER BY "dayOfWeek" ASC',
    [businessId],
  );
  return res.rows;
}

async function upsertBusinessHours(businessId, hours) {
  const results = [];
  for (const h of hours) {
    const res = await query(
      `INSERT INTO "BusinessHours" ("businessId", "dayOfWeek", "isOpen", "openTime", "closeTime")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("businessId", "dayOfWeek")
       DO UPDATE SET "isOpen" = $3, "openTime" = $4, "closeTime" = $5
       RETURNING *`,
      [businessId, h.dayOfWeek, h.isOpen ?? true, h.openTime || '09:00', h.closeTime || '17:00'],
    );
    results.push(res.rows[0]);
  }
  return results;
}

async function deleteStaff(staffId, businessId) {
  await query('UPDATE "Appointment" SET "staffId" = NULL WHERE "staffId" = $1', [staffId]);
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

async function getPublicAppointments(businessId, date, staffId) {
  let queryText = 'SELECT "time", COUNT(*) AS count FROM "Appointment" WHERE "businessId" = $1 AND "date" = $2';
  const params = [businessId, date];
  if (staffId) {
    queryText += ' AND "staffId" = $3';
    params.push(staffId);
  }
  queryText += ' GROUP BY "time"';
  const res = await query(queryText, params);
  return res.rows.map(r => ({ time: r.time, count: parseInt(r.count, 10) }));
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

async function getTicketsByDateRange(businessId, start, end) {
  const res = await query(
    `SELECT t.*, s."name" as "serviceName"
     FROM "Ticket" t
     JOIN "Service" s ON t."serviceId" = s."id"
     WHERE s."businessId" = $1
       AND t."createdAt" >= $2::date
       AND t."createdAt" < ($3::date + INTERVAL '1 day')
     ORDER BY t."createdAt" ASC`,
    [businessId, start, end],
  );
  return res.rows;
}

async function getAllBusinessesWithQueues() {
  const res = await query(
    `SELECT b.id, b.name, b.type, b.plan, b."smsSentTotal", b."emailSentTotal", b."createdAt",
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
  updateStaff,
  deleteStaff,
  createAppointment,
  getPublicAppointments,
  getAllAppointments,
  getSubscription,
  updateSubscription,
  getTicketsByDateRange,
  getAllBusinessesWithQueues,
  getBusinessHours,
  upsertBusinessHours,
};
